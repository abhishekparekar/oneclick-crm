const SalaryStructure = require("../models/SalaryStructure");
const Employee = require("../models/Employee");
const { getManagerTeamEmployeeIds, resolveManagerEmployee } = require("./managerController");

const createSalaryStructure = async (req, res, next) => {
  try {
    const {
      employeeId,
      monthlyCTC,
      basicSalary,
      hra,
      conveyanceAllowance,
      medicalAllowance,
      specialAllowance,
      otherAllowance,
      overtimeHourlyRate,
      pf,
      esi,
      professionalTax,
      tds,
      otherDeductions,
      effectiveFrom,
    } = req.body;

    const emp = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
    if (!emp) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const grossSalary = (basicSalary || 0) + (hra || 0) + (conveyanceAllowance || 0) +
      (medicalAllowance || 0) + (specialAllowance || 0) + (otherAllowance || 0);

    const updatePayload = {
      companyId: req.companyId,
      employeeId,
      monthlyCTC: monthlyCTC || grossSalary,
      basicSalary: basicSalary || 0,
      hra: hra || 0,
      conveyanceAllowance: conveyanceAllowance || 0,
      medicalAllowance: medicalAllowance || 0,
      specialAllowance: specialAllowance || 0,
      otherAllowance: otherAllowance || 0,
      overtimeHourlyRate: Math.max(0, Number(overtimeHourlyRate) || 0),
      grossSalary,
      pf: pf || 0,
      esi: esi || 0,
      professionalTax: professionalTax || 0,
      tds: tds || 0,
      otherDeductions: otherDeductions || 0,
      effectiveFrom: effectiveFrom || new Date(),
      status: "active",
      createdBy: req.user._id,
    };

    // Use upsert: update the active structure if one exists, otherwise create it.
    // This avoids duplicate key errors from both the new partial index and any legacy indexes.
    const ss = await SalaryStructure.findOneAndUpdate(
      { employeeId, companyId: req.companyId, status: "active" },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: ss, message: "Salary structure saved successfully" });
  } catch (err) {
    next(err);
  }
};

const getSalaryStructureByEmployee = async (req, res, next) => {
  try {
    if (req.user.role === "Manager") {
      const managerEmp = await resolveManagerEmployee(req);
      const allowedIds = managerEmp ? await getManagerTeamEmployeeIds(managerEmp, req.companyId) : [];
      if (!allowedIds.map(id => id.toString()).includes(req.params.employeeId.toString())) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const ss = await SalaryStructure.findOne({
      employeeId: req.params.employeeId,
      companyId: req.companyId,
      status: "active"
    });
    
    // If no explicit SalaryStructure model exists, try to fallback to old `salaryDetails`
    if (!ss) {
      const emp = await Employee.findOne({ _id: req.params.employeeId, companyId: req.companyId });
      if (emp && emp.salaryDetails && (emp.salaryDetails.basic || emp.salaryDetails.basicSalary || emp.salaryDetails.ctc || emp.salaryDetails.grossSalary)) {
        const sd = emp.salaryDetails;
        const basicSalary = Number(sd.basic) > 0 ? Number(sd.basic) : (Number(sd.basicSalary) > 0 ? Math.round(Number(sd.basicSalary) / 12) : 0);
        const hra = Number(sd.hra) || 0;
        const conveyanceAllowance = Number(sd.conveyance || sd.conveyanceAllowance) || 0;
        const medicalAllowance = Number(sd.medicalAllowance) || 0;
        const specialAllowance = Number(sd.specialAllowance) || 0;
        const otherAllowance = Number(sd.otherAllowance) || 0;
        const grossSalary = Number(sd.grossSalary) > 0 ? Number(sd.grossSalary) : (basicSalary + hra + conveyanceAllowance + medicalAllowance + specialAllowance + otherAllowance);
        const monthlyCTC = Number(sd.monthlyCtc) > 0 ? Number(sd.monthlyCtc) : (Number(sd.ctc) > 0 ? Math.round(Number(sd.ctc) / 12) : grossSalary);
        const pf = Number(sd.pfEmployee !== undefined ? sd.pfEmployee : sd.pf) || 0;
        const esi = Number(sd.esiEmployee !== undefined ? sd.esiEmployee : sd.esi) || 0;
        const professionalTax = Number(sd.professionalTax) || 0;
        const tds = Number(sd.tds) || 0;
        const totalDeductions = Number(sd.totalDeductions) || (pf + esi + professionalTax + tds);
        const netSalary = Number(sd.netSalary) || Math.max(0, grossSalary - totalDeductions);
        const overtimeHourlyRate = Number(sd.overtimeHourlyRate || sd.overtimeRate) || 0;

        return res.json({
          success: true,
          data: {
            monthlyCTC,
            basicSalary,
            hra,
            conveyanceAllowance,
            medicalAllowance,
            specialAllowance,
            otherAllowance,
            overtimeHourlyRate,
            grossSalary,
            pf,
            esi,
            professionalTax,
            tds,
            totalDeductions,
            netSalary,
            isLegacy: true,
          }
        });
      }
    }
    
    res.json({ success: true, data: ss });
  } catch (err) {
    next(err);
  }
};

const updateSalaryStructure = async (req, res, next) => {
  // Essentially the same as create, but we can treat it as a new version
  createSalaryStructure(req, res, next);
};

const getSalaryStructureHistory = async (req, res, next) => {
  try {
    const history = await SalaryStructure.find({
      employeeId: req.params.employeeId,
      companyId: req.companyId,
    }).sort({ effectiveFrom: -1, createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

const getMySalaryStructure = async (req, res, next) => {
  try {
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const emp = await Employee.findOne({ userId: req.user._id, companyId: req.companyId });
      if (emp) employeeId = emp._id;
    }
    if (!employeeId) {
      return res.json({ success: true, data: null });
    }

    const ss = await SalaryStructure.findOne({
      employeeId,
      companyId: req.companyId,
      status: "active",
    });

    if (!ss) {
      const emp = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
      if (emp && emp.salaryDetails && (emp.salaryDetails.basic || emp.salaryDetails.basicSalary || emp.salaryDetails.ctc || emp.salaryDetails.grossSalary)) {
        const sd = emp.salaryDetails;
        const basicSalary = Number(sd.basic) > 0 ? Number(sd.basic) : (Number(sd.basicSalary) > 0 ? Math.round(Number(sd.basicSalary) / 12) : 0);
        const hra = Number(sd.hra) || 0;
        const conveyanceAllowance = Number(sd.conveyance || sd.conveyanceAllowance) || 0;
        const medicalAllowance = Number(sd.medicalAllowance) || 0;
        const specialAllowance = Number(sd.specialAllowance) || 0;
        const otherAllowance = Number(sd.otherAllowance) || 0;
        const grossSalary = Number(sd.grossSalary) > 0 ? Number(sd.grossSalary) : (basicSalary + hra + conveyanceAllowance + medicalAllowance + specialAllowance + otherAllowance);
        const monthlyCTC = Number(sd.monthlyCtc) > 0 ? Number(sd.monthlyCtc) : (Number(sd.ctc) > 0 ? Math.round(Number(sd.ctc) / 12) : grossSalary);
        const pf = Number(sd.pfEmployee !== undefined ? sd.pfEmployee : sd.pf) || 0;
        const esi = Number(sd.esiEmployee !== undefined ? sd.esiEmployee : sd.esi) || 0;
        const professionalTax = Number(sd.professionalTax) || 0;
        const tds = Number(sd.tds) || 0;
        const totalDeductions = Number(sd.totalDeductions) || (pf + esi + professionalTax + tds);
        const netSalary = Number(sd.netSalary) || Math.max(0, grossSalary - totalDeductions);

        return res.json({
          success: true,
          data: {
            monthlyCTC,
            basicSalary,
            hra,
            conveyanceAllowance,
            medicalAllowance,
            specialAllowance,
            otherAllowance,
            grossSalary,
            pf,
            esi,
            professionalTax,
            tds,
            totalDeductions,
            netSalary,
            isLegacy: true,
          },
        });
      }
    }

    res.json({ success: true, data: ss });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSalaryStructure,
  getSalaryStructureByEmployee,
  getMySalaryStructure,
  updateSalaryStructure,
  getSalaryStructureHistory,
};
