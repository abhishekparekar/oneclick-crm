const express = require("express");
const router = express.Router();
const { protect: auth } = require("../middleware/authMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");

const { getPayrollSettings, updatePayrollSettings } = require("../controllers/payrollSettingsController");

const {
  createSalaryStructure,
  getSalaryStructureByEmployee,
  updateSalaryStructure,
  getSalaryStructureHistory,
} = require("../controllers/salaryStructureController");

const {
  previewPayroll,
  generatePayroll,
  recalculatePayroll,
  getCompanyPayrolls,
  getEmployeePayrolls,
  getAttendanceSummary,
  getPayslipDetails,
  getPayslipPreview,
  downloadPayslipPDF,
  markPayrollPaid,
  sendPayslip,
  bulkSendPayslips,
} = require("../controllers/payrollController");

const requireAdminOrHR = (req, res, next) => {
  if (req.user.role === "CompanyAdmin" || req.user.role === "HR") return next();
  return res.status(403).json({ success: false, message: "Access denied. Requires CompanyAdmin or HR role." });
};

// ─────────────────────────────────────────────
// PAYROLL SETTINGS
// ─────────────────────────────────────────────
router.get("/company/settings", auth, requireCompany, requireAdminOrHR, getPayrollSettings);
router.put("/company/settings", auth, requireCompany, requireAdminOrHR, updatePayrollSettings);

// ─────────────────────────────────────────────
// SALARY STRUCTURE
// ─────────────────────────────────────────────
router.post("/company/salary-structures", auth, requireCompany, requireAdminOrHR, createSalaryStructure);
router.get("/company/salary-structures/:employeeId", auth, requireCompany, requireAdminOrHR, getSalaryStructureByEmployee);
router.put("/company/salary-structures/:employeeId", auth, requireCompany, requireAdminOrHR, updateSalaryStructure);
router.get("/company/salary-structures/history/:employeeId", auth, requireCompany, requireAdminOrHR, getSalaryStructureHistory);

// ─────────────────────────────────────────────
// ATTENDANCE SUMMARY (Admin/HR bulk view)
// ─────────────────────────────────────────────
router.get("/company/attendance-summary", auth, requireCompany, requireAdminOrHR, getAttendanceSummary);

// ─────────────────────────────────────────────
// PAYROLL OPERATIONS
// ─────────────────────────────────────────────
router.post("/company/preview", auth, requireCompany, requireAdminOrHR, previewPayroll);
router.post("/company/generate", auth, requireCompany, requireAdminOrHR, generatePayroll);
router.get("/company", auth, requireCompany, requireAdminOrHR, getCompanyPayrolls);
router.patch("/:id/mark-paid", auth, requireCompany, requireAdminOrHR, markPayrollPaid);
router.post("/:id/send", auth, requireCompany, requireAdminOrHR, sendPayslip);
router.post("/company/bulk-send", auth, requireCompany, requireAdminOrHR, bulkSendPayslips);
router.post("/:id/recalculate", auth, requireCompany, requireAdminOrHR, recalculatePayroll);

// ─────────────────────────────────────────────
// PAYSLIP ACCESS (Employee, Admin, HR)
// ─────────────────────────────────────────────
router.get("/my-payslips", auth, requireCompany, getEmployeePayrolls);
router.get("/employee/:employeeId", auth, requireCompany, requireAdminOrHR, getEmployeePayrolls);
router.get("/:id/payslip-preview", auth, requireCompany, getPayslipPreview);
router.get("/:id/payslip-pdf", auth, requireCompany, downloadPayslipPDF);
router.get("/:id", auth, requireCompany, getPayslipDetails);

module.exports = router;
