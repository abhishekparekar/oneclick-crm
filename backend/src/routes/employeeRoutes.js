const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");
const {
  getEmployeeDashboard,
  getEmployeeDashboardSummary
} = require("../controllers/employeeDashboardController");
const {
  getAssignedTasks,
  getTaskDetails,
  updateOwnTaskStatus,
  addTaskComment,
  updateTaskChecklist,
  startTaskTimer,
  stopTaskTimer,
  createTask,
  uploadTaskAttachment,
  deleteTaskAttachment
} = require("../controllers/employeeTaskController");
const {
  createManualTimesheet,
  getDailyTimesheet,
  getWeeklyTimesheet
} = require("../controllers/employeeTimesheetController");
const {
  getEmployeeProjects,
  getEmployeeProjectDetails,
  getEmployeeProjectTasks,
  getEmployeeProjectActivity
} = require("../controllers/employeeProjectController");
const {
  applyLeave,
  getMyLeaves,
  getLeaveDetails,
  cancelLeave,
  getLeaveBalance,
  getCompanyHolidays
} = require("../controllers/employeeLeaveController");
const {
  getPayslips,
  getPayslipDetails,
  downloadPayslip
} = require("../controllers/employeePayslipController");
const {
  getEmployeeAnnouncements,
  markAnnouncementRead
} = require("../controllers/employeeAnnouncementController");
const {
  getMyProfile,
  getMyProfileForEdit,
  saveProfileDraft,
  completeProfile,
  updateProfile,
  changePassword,
  uploadDocument
} = require("../controllers/employeeProfileController");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect);
router.use(requireCompany);

// Dashboard APIs
router.get("/dashboard", getEmployeeDashboard);
router.get("/dashboard-summary", getEmployeeDashboardSummary);

// Tasks APIs
router.get("/tasks", getAssignedTasks);
router.post("/tasks", createTask);
router.get("/tasks/:id", getTaskDetails);
router.patch("/tasks/:id/status", updateOwnTaskStatus);
router.post("/tasks/:id/comments", addTaskComment);
router.post("/tasks/:id/checklist", updateTaskChecklist);
router.post("/tasks/:id/attachments", upload.single("file"), uploadTaskAttachment);
router.delete("/tasks/:id/attachments/:attachmentId", deleteTaskAttachment);

// Tasks Stopwatch Timer APIs
router.post("/tasks/:id/time/start", startTaskTimer);
router.post("/tasks/:id/time/stop", stopTaskTimer);

// Timesheet APIs
router.post("/timesheet/manual", createManualTimesheet);
router.get("/timesheet/daily", getDailyTimesheet);
router.get("/timesheet/weekly", getWeeklyTimesheet);

// Projects APIs
router.get("/projects", getEmployeeProjects);
router.get("/projects/:id", getEmployeeProjectDetails);
router.get("/projects/:id/tasks", getEmployeeProjectTasks);
router.get("/projects/:id/activity", getEmployeeProjectActivity);

// Leaves APIs
router.post("/leaves/apply", applyLeave);
router.get("/leaves/my", getMyLeaves);
router.get("/leaves/balance", getLeaveBalance);
router.get("/leaves/:id", getLeaveDetails);
router.delete("/leaves/:id/cancel", cancelLeave);
router.get("/holidays", getCompanyHolidays);

// Payslip APIs
router.get("/payslips", getPayslips);
router.get("/payslips/:id", getPayslipDetails);
router.get("/payslips/:id/download", downloadPayslip);

// Announcements APIs
router.get("/announcements", getEmployeeAnnouncements);
router.patch("/announcements/:id/read", markAnnouncementRead);

// Profile & Documents APIs
router.get("/my-profile", getMyProfile);
router.get("/my-profile/edit", getMyProfileForEdit);
router.put("/profile-draft", saveProfileDraft);
router.put("/complete-profile", completeProfile);
router.put("/update-profile", updateProfile);
router.put("/change-password", changePassword);
router.post("/documents/upload", upload.single("file"), uploadDocument);

module.exports = router;
