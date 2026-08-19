const express = require("express");
const authRoutes = require("./authRoutes");
const superAdminRoutes = require("./superAdminRoutes");
const companyRoutes = require("./companyRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const notificationRoutes = require("./notificationRoutes");
const reportRoutes = require("./reportRoutes");
const hrRoutes = require("./hrRoutes");
const userRoutes = require("./userRoutes");
const employeeRoutes = require("./employeeRoutes");
const managerRoutes = require("./managerRoutes");
const payrollRoutes = require("./payrollRoutes");
const taskRoutes = require("./taskRoutes");
const leadRoutes = require("./leadRoutes");
const internalRequestRoutes = require("./internalRequestRoutes");
const salaryAdvanceRoutes = require("./salaryAdvanceRoutes");

const { protect } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/subscriptionMiddleware");

const router = express.Router();
router.get("/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const User = require("../models/User");
    const userCount = await User.countDocuments();
    res.json({
      status: "ok",
      message: "Nextact API is running",
      database: {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        userCount: userCount
      }
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Health check database query failed",
      error: err.message
    });
  }
});

router.use("/auth", authRoutes);
router.use("/superadmin", protect, superAdminRoutes);

// Protected & Subscription-aware routes
router.use("/company", protect, checkSubscription, companyRoutes);
router.use("/attendance", protect, checkSubscription, attendanceRoutes);
router.use("/notifications", protect, checkSubscription, notificationRoutes);
router.use("/reports", protect, checkSubscription, reportRoutes);
router.use("/hr", protect, checkSubscription, hrRoutes);
router.use("/users", protect, checkSubscription, userRoutes);
router.use("/employee", protect, checkSubscription, employeeRoutes);
router.use("/manager", protect, checkSubscription, managerRoutes);
router.use("/payroll", protect, checkSubscription, payrollRoutes);
router.use("/salary-advances", protect, checkSubscription, salaryAdvanceRoutes);
router.use("/tasks", protect, checkSubscription, taskRoutes);
router.use("/internal-requests", protect, checkSubscription, internalRequestRoutes);
router.use("/company-requests", protect, checkSubscription, internalRequestRoutes);
router.use("/leads-engine", leadRoutes);
router.use("/leads", leadRoutes);
router.use("/statuses", leadRoutes);

module.exports = router;
