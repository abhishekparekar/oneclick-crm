const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");
const {
  checkInRules,
  checkOutRules,
  regularizationRules,
} = require("../validators/attendanceValidators");
const {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  myToday,
  myDate,
  myMonthly,
  regularizationRequest,
  validateLocation,
  companyAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

router.use(protect);
router.use(requireCompany);

// Punch in and punch out (Employee, Manager, HR can clock in)
router.post("/punch-in", checkInRules, checkIn);
router.post("/punch-out", checkOutRules, checkOut);

// Breaks: Lunch break, Tea break
router.post("/break/start", startBreak);
router.post("/break/end", endBreak);

// Geo location validation
router.post("/validate-location", validateLocation);

// Get company-wide attendance for HR, Managers, and Admins
router.get("/company", authorize("CompanyAdmin", "HR", "Manager"), companyAttendance);

// My status & logs
router.get("/my-today", myToday);
router.get("/my-date/:date", myDate);
router.get("/my-monthly", myMonthly);

// Regularization Requests
router.post("/regularization", regularizationRules, regularizationRequest);

module.exports = router;
