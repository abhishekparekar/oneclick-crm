const express = require("express");
const {
  registerSuperAdmin,
  login,
  logout,
  getMe,
  changePassword,
  logoutCheck,
  registerCompany,
  forgotPassword,
  resetPassword,
  sendResetOtp,
  verifyResetOtp,
  resetPasswordWithOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerSuperAdminRules,
  loginRules,
  registerCompanyRules,
} = require("../validators/authValidators");

const router = express.Router();

router.post("/register-superadmin", registerSuperAdminRules, registerSuperAdmin);
router.post("/register-company", registerCompanyRules, registerCompany);
router.post("/login", loginRules, login);
router.post("/forgot-password", forgotPassword);
router.post("/send-reset-otp", sendResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password-otp", resetPasswordWithOtp);
router.post("/reset-password/:token", resetPassword);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.get("/logout-check", protect, logoutCheck);
router.post("/logout", protect, logout);

module.exports = router;
