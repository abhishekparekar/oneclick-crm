const { body } = require("express-validator");

const registerSuperAdminRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("phone").optional().trim(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email").trim().notEmpty().withMessage("Email or Employee ID is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const registerCompanyRules = [
  body("companyName").trim().notEmpty().withMessage("Company name is required"),
  body("ownerName").trim().notEmpty().withMessage("Owner name is required"),
  body("email").isEmail().withMessage("Valid company/owner email is required"),
  body("phone").optional().trim(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

module.exports = {
  registerSuperAdminRules,
  loginRules,
  registerCompanyRules,
};
