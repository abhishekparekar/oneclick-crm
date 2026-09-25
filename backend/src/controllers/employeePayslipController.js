const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const Company = require("../models/Company");
const PayrollSettings = require("../models/PayrollSettings");
const { generatePayslipHTML, generatePayslipPDF } = require("../services/pdfGeneratorService");

// Helper to resolve employee profile
const getEmployeeProfile = async (req) => {
  const userId = req.user._id;
  const companyId = req.companyId;

  let employee = null;
  if (req.user.employeeId) {
    employee = await Employee.findOne({ _id: req.user.employeeId, companyId });
  }
  if (!employee) {
    employee = await Employee.findOne({ userId, companyId });
  }
  return employee;
};

// GET /api/employee/payslips
const getPayslips = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { month, year } = req.query;
    const filter = {
      employeeId: employee._id,
      companyId: req.companyId,
    };

    if (month && month !== "all" && month !== "ALL") {
      const mNum = parseInt(month, 10);
      if (!isNaN(mNum)) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const mName = monthNames[mNum - 1];
        filter.month = {
          $in: [
            String(mNum),
            String(mNum).padStart(2, "0"),
            mName,
            mName?.toLowerCase()
          ].filter(Boolean)
        };
      } else {
        filter.month = new RegExp(`^${month}$`, "i");
      }
    }
    if (year && year !== "all" && year !== "ALL") filter.year = Number(year);

    const payslips = await Payroll.find(filter).sort({ year: -1, month: -1 }).lean();

    res.json({ success: true, count: payslips.length, payslips });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/payslips/:id
const getPayslipDetails = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const payslip = await Payroll.findOne({
      _id: req.params.id,
      employeeId: employee._id,
      companyId: req.companyId,
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: "Payslip record not found" });
    }

    res.json({ success: true, payslip });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/payslips/:id/download
const downloadPayslip = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const payslip = await Payroll.findOne({
      _id: req.params.id,
      employeeId: employee._id,
      companyId: req.companyId,
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: "Payslip record not found" });
    }

    const company = await Company.findById(req.companyId);
    const settings = await PayrollSettings.findOne({ companyId: req.companyId });
    const html = generatePayslipHTML(payslip, company, settings || {});
    const pdfBuffer = await generatePayslipPDF(html);

    const code = payslip.employeeSnapshot?.employeeCode || employee.employeeCode || "EMP";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Payslip_${code}_${payslip.month}_${payslip.year}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayslips,
  getPayslipDetails,
  downloadPayslip,
};
