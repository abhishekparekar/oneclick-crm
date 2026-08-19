const express = require("express");
const {
  createNotification,
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  saveDeviceToken,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/permissionHelper");
const { createNotificationRules } = require("../validators/notificationValidators");

const router = express.Router();

router.use(protect);
router.post("/register-device", saveDeviceToken);
router.post(
  "/",
  requireRole("SuperAdmin", "CompanyAdmin", "HR"),
  createNotificationRules,
  createNotification
);
router.get("/my", getMyNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllRead);
router.delete("/:id", deleteNotification);

module.exports = router;
