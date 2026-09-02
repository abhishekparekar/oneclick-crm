const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  syncBatchLocations,
  getLiveEmployeeLocations,
  getEmployeeLocationTrail,
} = require("../controllers/locationTrackingController");

// All routes require authentication
router.use(protect);

// Employee GPS batch sync endpoint
router.post("/sync", syncBatchLocations);

// Admin & Manager endpoints
router.get("/live", getLiveEmployeeLocations);
router.get("/trail/:employeeId", getEmployeeLocationTrail);

module.exports = router;
