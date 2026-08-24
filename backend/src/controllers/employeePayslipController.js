const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");

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

    if (month) filter.month = month;
    if (year) filter.year = Number(year);

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

    // Set mock PDF headers and return placeholder message
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payslip_${payslip.month}_${payslip.year}.pdf`
    );

    // Return simple placeholder text representing a PDF structure
    res.send(`%PDF-1.4
%Oneclick PAYSLIP GENERATOR
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
72 712 Td
(Oneclick Payslip Summary - Month: ${payslip.month} Year: ${payslip.year}) Tj
(Basic: ${payslip.basicSalary} | Net NetSalary: ${payslip.netSalary} | Status: ${payslip.status}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00005 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
370
%%EOF`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayslips,
  getPayslipDetails,
  downloadPayslip,
};
