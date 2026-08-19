const express = require("express");
const router = express.Router();
const { protect: auth } = require("../middleware/authMiddleware");
const { requireCompany } = require("../middleware/companyMiddleware");
const {
  getCompanySalaryAdvances,
  createSalaryAdvance,
  recordDirectRepayment,
  updateSalaryAdvance,
  deleteSalaryAdvance,
  getEmployeeSalaryAdvances,
} = require("../controllers/salaryAdvanceController");

const requireAdminOrHR = (req, res, next) => {
  if (req.user.role === "CompanyAdmin" || req.user.role === "HR" || req.user.role === "Manager") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Requires CompanyAdmin, HR, or Manager role." });
};

// ── Company / Admin / HR / Manager Endpoints ─────────────────────────────────
router.get("/company", auth, requireCompany, requireAdminOrHR, getCompanySalaryAdvances);
router.post("/company", auth, requireCompany, requireAdminOrHR, createSalaryAdvance);
router.patch("/company/:id/repay", auth, requireCompany, requireAdminOrHR, recordDirectRepayment);
router.put("/company/:id", auth, requireCompany, requireAdminOrHR, updateSalaryAdvance);
router.delete("/company/:id", auth, requireCompany, requireAdminOrHR, deleteSalaryAdvance);

// ── Employee Portal Endpoints ────────────────────────────────────────────────
router.get("/my", auth, requireCompany, getEmployeeSalaryAdvances);
router.get("/employee/:employeeId", auth, requireCompany, getEmployeeSalaryAdvances);

module.exports = router;
