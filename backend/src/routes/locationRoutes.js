const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  syncBatchLocations,
  getLiveEmployeeLocations,
  getEmployeeLocationTrail,
  getTrackingAllowanceReport,
  updateTrackingAllowanceRate,
  updateAllowanceStatus,
} = require("../controllers/locationTrackingController");

// All routes require authentication
router.use(protect);

// Employee GPS batch sync endpoint
router.post("/sync", syncBatchLocations);

// Admin & Manager endpoints
router.get("/live", getLiveEmployeeLocations);
router.get("/trail/:employeeId", getEmployeeLocationTrail);

// Tracking Allowance & Distance claims endpoints
router.get("/allowance", getTrackingAllowanceReport);
router.post("/allowance/rate", updateTrackingAllowanceRate);
router.post("/allowance/status", updateAllowanceStatus);

module.exports = router;
