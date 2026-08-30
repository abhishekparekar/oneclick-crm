const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All task routes require authentication
router.use(protect);

router.post("/upload-media", upload.single("file"), taskController.uploadMediaFile);

// Dashboard and specialized gets
router.get("/dashboard-summary", taskController.getDashboardSummary);
router.get("/today-pending-updates", taskController.getTodayPendingUpdates);
router.get("/today-followups", taskController.getTodayFollowUps);

// CRUD
router.get("/", taskController.getTasks);
router.post("/", taskController.createTask);
router.get("/:id", taskController.getTaskDetails);
router.put("/:id", taskController.updateTask);
router.patch("/:id/status", taskController.unifiedUpdateTaskStatus);

// Workflow state changes
router.patch("/:id/in-process", taskController.inProcessTask);
router.patch("/:id/in_process", taskController.inProcessTask);
router.patch("/:id/in-progress", taskController.inProcessTask);

router.patch("/:id/complete", taskController.completeTask);
router.patch("/:id/completed", taskController.completeTask);

router.patch("/:id/late-complete", taskController.lateCompleteTask);
router.patch("/:id/late_complete", taskController.lateCompleteTask);
router.patch("/:id/late-completed", taskController.lateCompleteTask);
router.patch("/:id/late_completed", taskController.lateCompleteTask);

router.patch("/:id/reopen", taskController.reopenTask);

router.patch("/:id/re-in-process", taskController.reInProcessTask);
router.patch("/:id/re_in_process", taskController.reInProcessTask);
router.patch("/:id/re-in-progress", taskController.reInProcessTask);

router.patch("/:id/re-complete", taskController.reCompleteTask);
router.patch("/:id/re_complete", taskController.reCompleteTask);
router.patch("/:id/re-completed", taskController.reCompleteTask);
router.patch("/:id/re_completed", taskController.reCompleteTask);

router.patch("/:id/re-late-complete", taskController.reLateCompleteTask);
router.patch("/:id/re_late_complete", taskController.reLateCompleteTask);
router.patch("/:id/re-late-completed", taskController.reLateCompleteTask);
router.patch("/:id/re_late_completed", taskController.reLateCompleteTask);

router.patch("/bulk-shift", taskController.bulkShiftTasks);
router.patch("/:id/shift", taskController.shiftTask);
router.patch("/:id/cancel", taskController.cancelTask);

// Follow-up & Comments
router.post("/:id/submit-followup", taskController.submitFollowUp);
router.post("/:id/comments", taskController.addTaskComment);
router.post("/:id/attachments", upload.single("file"), taskController.uploadTaskAttachment);

// Daily report
router.post("/:id/daily-report", taskController.submitDailyReport);
router.post("/:id/checklist", taskController.toggleChecklistItem);

module.exports = router;
