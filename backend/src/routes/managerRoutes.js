const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getManagerDashboardSummary,
  getManagerTeam,
  getTeamMemberById,
  getTeamOrg,
  getAttendancePermissions,
  getTeamAttendance,
  getTeamMemberMonthlyAttendance,
  getRegularizationRequests,
  approveRegularization,
  rejectRegularization,
  manualUpdateTeamAttendance,
  getLeavePermissions,
  getTeamLeaves,
  getTeamLeaveById,
  approveTeamLeave,
  rejectTeamLeave,
  getTeamTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addTaskComment,
  updateTaskChecklist,
  startTaskTimer,
  stopTaskTimer,
  addManualTaskTime,
  getManagerProjects,
  createManagerProject,
  getManagerProjectById,
  updateManagerProject,
  deleteManagerProject,
  getProjectTasks,
  getManagerProjectActivity,
  startWork,
  stopWork,
  addManualWork,
  getMyTimesheet,
  getTeamTimesheet,
  approveTimesheet,
  getTeamAttendanceReport,
  getTeamTasksReport,
  getTeamLeavesReport,
  getTaskPermissions,
  getMyTasks,
  getReportsSummary,
  getTeamWorkReport,
  getManagerAnnouncements,
  markAnnouncementRead,
  getProjectChangeRequests,
  updateProjectChangeRequestStatus,
  toggleTaskTemplateStatus
} = require("../controllers/managerController");

// All manager routes require: valid JWT + companyId in JWT + Manager/CompanyAdmin/HR role
const managerGuard = [protect, requireCompany, authorize("Manager", "CompanyAdmin", "HR")];

// ── Dashboard ──────────────────────────────────────────────
router.get("/dashboard-summary", ...managerGuard, getManagerDashboardSummary);

// ── Team ──────────────────────────────────────────────────
router.get("/team", ...managerGuard, getManagerTeam);
router.get("/team-org", ...managerGuard, getTeamOrg);
router.get("/team/:employeeId", ...managerGuard, getTeamMemberById);

// ── Attendance ─────────────────────────────────────────────
router.get("/attendance-permissions", ...managerGuard, getAttendancePermissions);
router.get("/team-attendance", ...managerGuard, getTeamAttendance);
router.get(
  "/team-attendance/:employeeId/monthly",
  ...managerGuard,
  getTeamMemberMonthlyAttendance
);
router.patch("/team-attendance/:id/manual-update", ...managerGuard, manualUpdateTeamAttendance);

// ── Regularization ─────────────────────────────────────────
router.get("/regularization", ...managerGuard, getRegularizationRequests);
router.patch("/regularization/:id/approve", ...managerGuard, approveRegularization);
router.patch("/regularization/:id/reject", ...managerGuard, rejectRegularization);

// ── Leaves ─────────────────────────────────────────────────
router.get("/leave-permissions", ...managerGuard, getLeavePermissions);
router.get("/team-leaves", ...managerGuard, getTeamLeaves);
router.get("/team-leaves/:id", ...managerGuard, getTeamLeaveById);
router.patch("/team-leaves/:id/approve", ...managerGuard, approveTeamLeave);
router.patch("/team-leaves/:id/reject", ...managerGuard, rejectTeamLeave);

// ── Tasks ──────────────────────────────────────────────────
router.get("/task-permissions", ...managerGuard, getTaskPermissions);
router.get("/tasks/my", ...managerGuard, getMyTasks);
router.get("/tasks/team", ...managerGuard, getTeamTasks);
router.post("/tasks", ...managerGuard, createTask);
router.get("/tasks/:id", ...managerGuard, getTaskById);
router.put("/tasks/:id", ...managerGuard, updateTask);
router.delete("/tasks/:id", ...managerGuard, deleteTask);
router.patch("/tasks/:id/status", ...managerGuard, updateTaskStatus);
router.post("/tasks/:id/comments", ...managerGuard, addTaskComment);
router.post("/tasks/:id/checklist", ...managerGuard, updateTaskChecklist);
router.post("/tasks/:id/time/start", ...managerGuard, startTaskTimer);
router.post("/tasks/:id/time/stop", ...managerGuard, stopTaskTimer);
router.post("/tasks/:id/time/manual", ...managerGuard, addManualTaskTime);
router.patch("/tasks/templates/:id/toggle-active", ...managerGuard, toggleTaskTemplateStatus);

// ── Projects ───────────────────────────────────────────────
router.get("/projects", ...managerGuard, getManagerProjects);
router.post("/projects", ...managerGuard, createManagerProject);
router.get("/projects/:id", ...managerGuard, getManagerProjectById);
router.put("/projects/:id", ...managerGuard, updateManagerProject);
router.delete("/projects/:id", ...managerGuard, deleteManagerProject);
router.get("/projects/:id/tasks", ...managerGuard, getProjectTasks);
router.get("/projects/:id/activity", ...managerGuard, getManagerProjectActivity);
router.get("/projects/:projectId/change-requests", ...managerGuard, getProjectChangeRequests);
router.patch("/change-requests/:id/status", ...managerGuard, updateProjectChangeRequestStatus);

// ── Work Tracking / Timesheet ──────────────────────────────
router.post("/work/start", ...managerGuard, startWork);
router.post("/work/stop", ...managerGuard, stopWork);
router.post("/work/manual", ...managerGuard, addManualWork);
router.get("/timesheet/my", ...managerGuard, getMyTimesheet);
router.get("/timesheet/team", ...managerGuard, getTeamTimesheet);
router.patch("/timesheet/:id/approve", ...managerGuard, approveTimesheet);

// ── Reports ────────────────────────────────────────────────
router.get("/reports/summary", ...managerGuard, getReportsSummary);
router.get("/reports/team-attendance", ...managerGuard, getTeamAttendanceReport);
router.get("/reports/team-tasks", ...managerGuard, getTeamTasksReport);
router.get("/reports/team-leaves", ...managerGuard, getTeamLeavesReport);
router.get("/reports/team-work", ...managerGuard, getTeamWorkReport);

// ── Announcements ──────────────────────────────────────────
router.get("/announcements", ...managerGuard, getManagerAnnouncements);
router.patch("/announcements/:id/read", ...managerGuard, markAnnouncementRead);

module.exports = router;
