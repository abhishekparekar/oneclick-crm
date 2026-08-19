const express = require("express");
const {
  getDashboardSummary,
  getAttendanceSummary,
  getLeaveSummary,
  getPayrollSummary,
  getTaskSummary,
  getEmployeeSummary,
  getProjectSummary,
  getPerformanceReport,
  getTaskDetailedAnalytics,
  getEmployeeDetailedAnalytics,
  getLeaveDetailedAnalytics,
} = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/permissionHelper");

const router = express.Router();

router.use(protect);
router.get("/dashboard-summary", getDashboardSummary);
router.get("/attendance-summary", getAttendanceSummary);
router.get("/employee-summary", getEmployeeSummary);
router.get(
  "/leave-summary",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getLeaveSummary
);
router.get(
  "/payroll-summary",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getPayrollSummary
);
router.get(
  "/task-summary",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getTaskSummary
);
router.get(
  "/project-summary",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getProjectSummary
);
router.get(
  "/performance-report",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager", "Employee"),
  getPerformanceReport
);

// ── NEW: Detailed Report Analytics Routes (Unchanged Existing APIs) ────────────
router.get(
  "/task-detailed",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getTaskDetailedAnalytics
);
router.get(
  "/employee-detailed",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getEmployeeDetailedAnalytics
);
router.get(
  "/leave-detailed",
  requireRole("SuperAdmin", "CompanyAdmin", "HR", "Manager"),
  getLeaveDetailedAnalytics
);

module.exports = router;
