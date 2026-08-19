const SalaryStructure = require("../models/SalaryStructure");
const Employee = require("../models/Employee");

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
    const ss = await SalaryStructure.findOne({
      employeeId: req.params.employeeId,
      companyId: req.companyId,
      status: "active"
    });
    
    // If no explicit SalaryStructure model exists, try to fallback to old `salaryDetails`
    if (!ss) {
      const emp = await Employee.findOne({ _id: req.params.employeeId, companyId: req.companyId });
      if (emp && emp.salaryDetails && emp.salaryDetails.basic) {
         return res.json({
           success: true,
           data: {
             monthlyCTC: emp.salaryDetails.ctc || 0,
             basicSalary: emp.salaryDetails.basic || 0,
             hra: emp.salaryDetails.hra || 0,
             allowances: emp.salaryDetails.allowances || 0,
             deductions: emp.salaryDetails.deductions || 0,
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

module.exports = {
  createSalaryStructure,
  getSalaryStructureByEmployee,
  updateSalaryStructure,
  getSalaryStructureHistory,
};
