const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");

// Import Controllers
const { getHRDashboard } = require("../controllers/hrController");
const {
  getEmployees,
  getEmployeeById,
  getModuleUsage,
  createEmployee,
  updateEmployee,
  patchEmployeeStatus,
} = require("../controllers/employeeController");
const {
  companyAttendance,
  employeeAttendance,
  approveRegularization,
  rejectRegularization,
  manualUpdateAttendance,
  deleteAttendance,
  getRegularizationRequests,
} = require("../controllers/attendanceController");
const {
  getCompanyLeaves,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  updateLeaveBalance,
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  generatePayroll,
  getCompanyPayroll,
  getPayslip,
  markPayrollPaid,
  getSalaryStructure,
  createOrUpdateSalaryStructure,
  createCompanyAnnouncement,
  getCompanyAnnouncements,
  getCompanyAuditLogs,
  getReportsAttendanceSummary,
  getReportsLeaveSummary,
  getReportsPayrollSummary,
  getReportsEmployeeSummary,
} = require("../controllers/companyController");

// Import Validators
const {
  employeeCreateRules,
  employeeUpdateRules,
  employeeStatusRules,
} = require("../validators/employeeValidators");

const router = express.Router();

// Apply auth middlewares
router.use(protect);
router.use(requireCompany);
router.use(authorize("HR", "CompanyAdmin")); // HR-level (or CompanyAdmin fallback)

// Dashboard
router.get("/dashboard", getHRDashboard);

// Employees
router.get("/module-usage", getModuleUsage);
router.post("/employees/basic-create", employeeCreateRules, createEmployee);
router.get("/employees", getEmployees);
router.get("/employees/:id", getEmployeeById);
router.put("/employees/:id", employeeUpdateRules, updateEmployee);
router.patch("/employees/:id/status", employeeStatusRules, patchEmployeeStatus);

// Attendance
router.get("/attendance", companyAttendance);
router.get("/attendance/:employeeId/monthly", employeeAttendance);
router.patch("/attendance/:id/manual-update", manualUpdateAttendance);
router.post("/attendance/manual-update", manualUpdateAttendance);
router.delete("/attendance/:id", deleteAttendance);
router.get("/attendance/regularization", getRegularizationRequests);
router.patch("/attendance/regularization/:id/approve", approveRegularization);
router.patch("/attendance/regularization/:id/reject", rejectRegularization);

// Leaves
router.get("/leaves", getCompanyLeaves);
router.patch("/leaves/:id/approve", approveLeave);
router.patch("/leaves/:id/reject", rejectLeave);
router.get("/leaves/balance", getLeaveBalance);
router.put("/leaves/balance/:employeeId", updateLeaveBalance);

// Holidays
router.post("/holidays", createHoliday);
router.get("/holidays", getHolidays);
router.put("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

// Payroll
router.post("/payroll/generate", generatePayroll);
router.get("/payroll", getCompanyPayroll);
router.get("/payroll/:id", getPayslip);
router.patch("/payroll/:id/mark-paid", markPayrollPaid);

// Salary
router.post("/salary-structure", (req, res, next) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ success: false, message: "employeeId is required in request body" });
  }
  req.params.employeeId = employeeId;
  createOrUpdateSalaryStructure(req, res, next);
});
router.get("/salary-structure/:employeeId", getSalaryStructure);
router.put("/salary-structure/:employeeId", createOrUpdateSalaryStructure);

// Reports
router.get("/reports/attendance-summary", getReportsAttendanceSummary);
router.get("/reports/leave-summary", getReportsLeaveSummary);
router.get("/reports/payroll-summary", getReportsPayrollSummary);
router.get("/reports/employee-summary", getReportsEmployeeSummary);

// Announcements
router.post("/announcements", createCompanyAnnouncement);
router.get("/announcements", getCompanyAnnouncements);

// Audit Logs
router.get("/audit-logs", getCompanyAuditLogs);

module.exports = router;
