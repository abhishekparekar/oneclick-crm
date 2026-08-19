const express = require("express");
const {
  registerSuperAdmin,
  login,
  getMe,
  changePassword,
  logoutCheck,
  registerCompany,
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
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.get("/logout-check", protect, logoutCheck);

module.exports = router;
