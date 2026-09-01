const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");
const {
    canListEmployees,
    canViewEmployeeDetail,
    canMutateEmployees,
    canAccessMyEmployee,
} = require("../middleware/employeeAccessMiddleware");
const {
    getActiveSubscription,
    getDashboardStats,
    getDashboardAttendanceDetails,
    getProfile,
    updateProfile,
    createDepartment,
    getDepartments,
    updateDepartment,
    deleteDepartment,
    createDesignation,
    getDesignations,
    updateDesignation,
    deleteDesignation,
    createBranch,
    getBranches,
    updateBranch,
    deleteBranch,
    getCompanyDashboard,
    getCompanySettings,
    updateCompanySettings,
    getCompanyAnnouncements,
    createCompanyAnnouncement,
    deleteAnnouncement,
    getCompanyAuditLogs,
    getCompanyLeaves,
    createLeaveAdmin,
    approveLeave,
    rejectLeave,
    getLeaveBalance,
    updateLeaveBalance,
    getLeaveSettings,
    updateLeaveSettings,
    createHoliday,
    getHolidays,
    updateHoliday,
    deleteHoliday,
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    createTask,
    getTaskById,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addTaskComment,
    uploadTaskAttachmentAdmin,
    addProjectNotice,
    getSalaryStructure,
    createOrUpdateSalaryStructure,
    generatePayroll,
    getCompanyPayroll,
    getEmployeePayroll,
    markPayrollPaid,
    getPayslip,
    getReportsDashboardSummary,
    getReportsAttendanceSummary,
    getReportsLeaveSummary,
    getReportsPayrollSummary,
    getReportsTaskSummary,
    getReportsEmployeeSummary,
} = require("../controllers/companyController");
const { getTasks, uploadMediaFile } = require("../controllers/taskController");
const {
    getMyEmployee,
    getEmployees,
    getEmployeeById,
    getModuleUsage,
    createEmployee,
    updateEmployee,
    patchEmployeeStatus,
    resetEmployeePassword,
    deleteEmployee,
} = require("../controllers/employeeController");
const {
    getTaskStatuses,
    getActiveTaskStatuses,
    createTaskStatus,
    updateTaskStatus: updateTaskStatusAdmin,
    reorderTaskStatuses,
    deleteTaskStatus,
} = require("../controllers/companyTaskStatusController");
const {
    departmentRules,
    designationRules,
    branchRules,
    profileRules,
} = require("../validators/companyValidators");
const {
    employeeCreateRules,
    employeeUpdateRules,
    employeeStatusRules,
} = require("../validators/employeeValidators");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);

router.get(
    "/subscription/active",
    requireCompany,
    getActiveSubscription
);

router.get(
    "/module-usage",
    requireCompany,
    getModuleUsage
);

// Employees: CompanyAdmin, HR, Manager (list/view); Employee (own only); mutations: Admin/HR only
router.get(
    "/employees/me",
    requireCompany,
    canAccessMyEmployee,
    getMyEmployee
);

router.get("/employees", requireCompany, canListEmployees, getEmployees);

router.get(
    "/employees/:id",
    requireCompany,
    canViewEmployeeDetail,
    getEmployeeById
);

router.post(
    "/employees",
    requireCompany,
    canMutateEmployees,
    employeeCreateRules,
    createEmployee
);

router.put(
    "/employees/:id",
    requireCompany,
    canMutateEmployees,
    employeeUpdateRules,
    updateEmployee
);

router.post(
    "/employees/:id/documents/upload",
    requireCompany,
    canMutateEmployees,
    upload.single("file"),
    require("../controllers/companyController").uploadEmployeeDocumentAdmin
);

router.patch(
    "/employees/:id/status",
    requireCompany,
    canMutateEmployees,
    employeeStatusRules,
    patchEmployeeStatus
);

router.patch(
    "/employees/:id/reset-password",
    requireCompany,
    canMutateEmployees,
    resetEmployeePassword
);

router.delete(
    "/employees/:id",
    requireCompany,
    canMutateEmployees,
    deleteEmployee
);

const adminOnly = [requireCompany, authorize("CompanyAdmin")];
const adminHr = [requireCompany, authorize("CompanyAdmin", "HR")];
const adminHrManager = [requireCompany, authorize("CompanyAdmin", "HR", "Manager")];
const readOrgStructure = [
    requireCompany,
    authorize("CompanyAdmin", "HR", "Manager", "Employee"),
];
const anyRole = [
    requireCompany,
    authorize("CompanyAdmin", "HR", "Manager", "Employee"),
];

// Reference data: managers can read (e.g. employee filters)
router.get("/departments", ...readOrgStructure, getDepartments);
router.get("/designations", ...readOrgStructure, getDesignations);
router.get("/branches", ...readOrgStructure, getBranches);

router.get("/dashboard/stats", ...adminHr, getDashboardStats);
router.get("/dashboard/attendance-details", ...adminHr, getDashboardAttendanceDetails);

router.get("/profile", ...adminHr, getProfile);
router.put("/profile", ...adminHr, profileRules, updateProfile);

router.post("/departments", ...adminHr, departmentRules, createDepartment);
router
    .route("/departments/:id")
    .put(...adminHr, departmentRules, updateDepartment)
    .delete(...adminHr, deleteDepartment);

router.post("/designations", ...adminHr, designationRules, createDesignation);
router
    .route("/designations/:id")
    .put(...adminHr, designationRules, updateDesignation)
    .delete(...adminHr, deleteDesignation);

router.post("/branches", ...adminHr, branchRules, createBranch);
router
    .route("/branches/:id")
    .put(...adminHr, branchRules, updateBranch)
    .delete(...adminHr, deleteBranch);

// ==========================================
// NEW COMPANY ADMIN MODULE ROUTES
// ==========================================

// Dashboard
router.get("/dashboard", ...adminHr, getCompanyDashboard);

// Settings
router.get("/settings", ...anyRole, getCompanySettings);
router.put("/settings", ...adminOnly, updateCompanySettings);
router.get("/leave-settings", ...anyRole, getLeaveSettings);
router.put("/leave-settings", ...adminOnly, updateLeaveSettings);

const { getPayrollSettings, updatePayrollSettings } = require("../controllers/payrollSettingsController");
router.get("/payroll-settings", ...adminHr, getPayrollSettings);
router.put("/payroll-settings", ...adminHr, updatePayrollSettings);

// Announcements
router.get("/announcements", ...anyRole, getCompanyAnnouncements);
router.post("/announcements", ...adminHrManager, createCompanyAnnouncement);
router.delete("/announcements/:id", ...adminHrManager, deleteAnnouncement);

// Audit Logs
router.get("/audit-logs", ...adminOnly, getCompanyAuditLogs);

// Leaves
router.get("/leaves", ...adminHr, getCompanyLeaves);
router.post("/leaves", ...adminHr, createLeaveAdmin);
router.patch("/leaves/:id/approve", ...adminHr, approveLeave);
router.patch("/leaves/:id/reject", ...adminHr, rejectLeave);
router.get("/leaves/balance", ...adminHrManager, getLeaveBalance);
router.put("/leaves/balance/:employeeId", ...adminHrManager, updateLeaveBalance);

// Holidays
router.get("/holidays", ...anyRole, getHolidays);
router.post("/holidays", ...adminHrManager, createHoliday);
router.put("/holidays/:id", ...adminHrManager, updateHoliday);
router.delete("/holidays/:id", ...adminHrManager, deleteHoliday);

// Projects
router.get("/projects", ...anyRole, getProjects);
router.post("/projects", ...adminHr, createProject);
router.get("/projects/:id", ...anyRole, getProjectById);
router.post("/projects/:id/notices", ...anyRole, addProjectNotice);
router.put("/projects/:id", ...adminHr, updateProject);
router.delete("/projects/:id", ...adminHr, deleteProject);

// Tasks
router.post("/tasks/upload-media", ...anyRole, upload.single("file"), uploadMediaFile);
router.get("/tasks", ...anyRole, getTasks);
router.post("/tasks", ...adminHr, createTask);
router.get("/tasks/:id", ...anyRole, getTaskById);
router.put("/tasks/:id", ...adminHr, updateTask);
router.patch("/tasks/:id/status", ...anyRole, updateTaskStatus);
router.post("/tasks/:id/comments", ...anyRole, addTaskComment);
router.post("/tasks/:id/attachments", ...anyRole, upload.single("file"), uploadTaskAttachmentAdmin);
router.delete("/tasks/:id", ...adminHr, deleteTask);
router.patch("/tasks/templates/:id/toggle-active", ...adminHr, require("../controllers/companyController").toggleTaskTemplateStatus);

// Task Statuses (Dynamic)
router.get("/task-statuses", ...adminHr, getTaskStatuses);
router.post("/task-statuses", ...adminHr, createTaskStatus);
router.patch("/task-statuses/reorder", ...adminHr, reorderTaskStatuses);
router.put("/task-statuses/:id", ...adminHr, updateTaskStatusAdmin);
router.delete("/task-statuses/:id", ...adminHr, deleteTaskStatus);

// Active statuses for UI dropdowns
router.get("/tasks/statuses/active", ...anyRole, getActiveTaskStatuses);

// Payroll & Salary Structure
router.get("/payroll/salary-structure/:employeeId", ...adminHr, getSalaryStructure);
router.post("/payroll/salary-structure/:employeeId", ...adminHr, createOrUpdateSalaryStructure);
router.post("/payroll/generate", ...adminHr, generatePayroll);
router.get("/payroll/company", ...adminHr, getCompanyPayroll);
router.get("/payroll/employee/:employeeId", ...anyRole, getEmployeePayroll);
router.patch("/payroll/:id/pay", ...adminHr, markPayrollPaid);
router.get("/payroll/payslip/:id", ...anyRole, getPayslip);

const {
    getTaskDetailedAnalytics,
    getEmployeeDetailedAnalytics,
    getLeaveDetailedAnalytics,
} = require("../controllers/reportController");

// Reports
router.get("/reports/dashboard", ...adminHr, getReportsDashboardSummary);
router.get("/reports/attendance", ...adminHr, getReportsAttendanceSummary);
router.get("/reports/leaves", ...adminHr, getReportsLeaveSummary);
router.get("/reports/payroll", ...adminHr, getReportsPayrollSummary);
router.get("/reports/tasks", ...adminHr, getReportsTaskSummary);
router.get("/reports/employees", ...adminHr, getReportsEmployeeSummary);

// ── NEW: Detailed Analytics Endpoints under /company/reports/ (Unaltered Existing Routes) ──
router.get("/reports/tasks-detailed", ...adminHr, getTaskDetailedAnalytics);
router.get("/reports/employees-detailed", ...adminHr, getEmployeeDetailedAnalytics);
router.get("/reports/leaves-detailed", ...adminHr, getLeaveDetailedAnalytics);

// ── NEW: Business Intelligence & Enterprise Analytics Suite Endpoints ──
const biController = require("../controllers/biReportingController");
router.get("/reports/bi/executive", ...adminHrManager, biController.getExecutiveReport);
router.get("/reports/bi/workforce", ...adminHrManager, biController.getWorkforceReport);
router.get("/reports/bi/attendance", ...adminHrManager, biController.getAttendanceReport);
router.get("/reports/bi/leaves", ...adminHrManager, biController.getLeaveReport);
router.get("/reports/bi/tasks", ...adminHrManager, biController.getTaskReport);
router.get("/reports/bi/payroll", ...anyRole, biController.getPayrollReport);
router.get("/reports/bi/performance", ...adminHrManager, biController.getPerformanceReport);
router.get("/reports/bi/audit", ...adminOnly, biController.getAuditReport);
router.get("/reports/bi/employee-drilldown/:id", ...adminHrManager, biController.getEmployeeDrillDown);
router.get("/reports/bi/department-drilldown/:id", ...adminHrManager, biController.getDepartmentDrillDown);

// ==========================================
// COMPANY ADMIN ATTENDANCE OVERIDES
// ==========================================
const {
    companyAttendance,
    employeeAttendance,
    manualUpdateAttendance,
    deleteAttendance,
    getRegularizationRequests,
    approveRegularization,
    rejectRegularization,
    getSettings,
    updateSettings,
} = require("../controllers/attendanceController");

router.get("/attendance", ...adminHr, companyAttendance);
router.get("/attendance/:employeeId/monthly", ...adminHr, employeeAttendance);
router.patch("/attendance/:id/manual-update", ...adminHr, manualUpdateAttendance);
router.post("/attendance/manual-update", ...adminHr, manualUpdateAttendance);
router.delete("/attendance/:id", ...adminHr, deleteAttendance);
router.get("/attendance/regularization", ...adminHr, getRegularizationRequests);
router.patch("/attendance/regularization/:id/approve", ...adminHr, approveRegularization);
router.patch("/attendance/regularization/:id/reject", ...adminHr, rejectRegularization);

// Attendance Settings
router.get("/attendance-settings", ...adminHr, getSettings);
router.put("/attendance-settings", ...adminHr, updateSettings);

// Subscription Requests (Company Admin to Super Admin)
const {
  getAvailablePlans,
  createCompanySubscriptionRequest,
  getCompanySubscriptionRequests,
} = require("../controllers/subscriptionRequestController");

router.get("/available-plans", ...adminOnly, getAvailablePlans);
router.post("/subscription-requests", ...adminOnly, createCompanySubscriptionRequest);
router.get("/subscription-requests", ...adminOnly, getCompanySubscriptionRequests);

module.exports = router;
