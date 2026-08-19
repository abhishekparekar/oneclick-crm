const { body } = require("express-validator");

const createCompanyRules = [
  body("companyName").trim().notEmpty().withMessage("Company name is required"),
  body("ownerName").trim().notEmpty().withMessage("Owner name is required"),
  body("email").isEmail().withMessage("Valid company email is required"),
  body("phone").optional().trim(),
  body("address").optional().trim(),
  body("industryType").optional().trim(),
  body("planName").optional().trim(),
  body("employeeLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Employee limit must be a positive number"),
  body("adminName").optional().trim(),
  body("adminEmail").optional().isEmail().withMessage("Valid admin email is required"),
  body("adminPhone").optional().trim(),
];

const updateCompanyRules = [
  body("companyName").optional().trim().notEmpty().withMessage("Company name cannot be empty"),
  body("ownerName").optional().trim().notEmpty().withMessage("Owner name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("phone").optional().trim(),
  body("address").optional().trim(),
  body("industryType").optional().trim(),
  body("planName").optional().trim(),
  body("employeeLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Employee limit must be a positive number"),
];

const departmentRules = [
  body("name").trim().notEmpty().withMessage("Department name is required"),
  body("description").optional().trim(),
  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status"),
];

const designationRules = [
  body("departmentId").notEmpty().withMessage("Department is required"),
  body("name").trim().notEmpty().withMessage("Designation name is required"),
  body("description").optional().trim(),
  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status"),
];

const branchRules = [
  body("branchName").optional().trim(),
  body("name").optional().trim(),
  body().custom((value, { req }) => {
    const bName = req.body.branchName || req.body.name;
    if (!bName || !bName.trim()) {
      throw new Error("Branch name is required");
    }
    return true;
  }),
  body("address").optional().trim(),
  body("city").optional().trim(),
  body("location").optional().trim(),
  body("state").optional().trim(),
  body("pincode").optional().trim(),
  body("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status"),
];

const profileRules = [
  body("companyName").optional().trim().notEmpty().withMessage("Company name cannot be empty"),
  body("ownerName").optional().trim().notEmpty().withMessage("Owner name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("phone").optional().trim(),
  body("address").optional().trim(),
  body("industryType").optional().trim(),
];

module.exports = {
  createCompanyRules,
  updateCompanyRules,
  departmentRules,
  designationRules,
  branchRules,
  profileRules,
};
