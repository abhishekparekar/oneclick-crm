const { body } = require("express-validator");

const sanitizeGender = (val) => (typeof val === "string" ? val.toLowerCase().trim() : val);
const sanitizeWorkMode = (val) => (typeof val === "string" ? val.toLowerCase().trim() : val);
const sanitizeEmploymentType = (val) => {
  if (typeof val !== "string") return val;
  // Normalize both underscore and hyphen variants
  const s = val.toLowerCase().trim().replace(/[-_\s]/g, "");
  if (s === "fulltime") return "full-time";
  if (s === "parttime") return "part-time";
  if (s === "contract" || s === "contractual") return "contract";
  if (s === "intern" || s === "internship") return "intern";
  if (s === "freelance") return "contract";
  return val.toLowerCase().trim();
};

const employeeCreateRules = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").optional({ nullable: true, checkFalsy: true }).trim(),
  body("email").isEmail().withMessage("Valid email is required"),
  body("phone").optional({ nullable: true, checkFalsy: true }).trim(),
  body("photo").optional({ nullable: true, checkFalsy: true }).trim(),
  body("gender")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeGender)
    .isIn(["male", "female", "other", "prefer_not_say", ""])
    .withMessage("Invalid gender selected"),
  body("dateOfBirth").optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage("Invalid date of birth format"),
  body("joiningDate").optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage("Invalid joining date format"),
  body("departmentId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid department ID"),
  body("designationId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid designation ID"),
  body("branchId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid branch ID"),
  body("employmentType")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeEmploymentType)
    .isIn(["full-time", "part-time", "contract", "intern", ""])
    .withMessage("Invalid employment type (must be full-time, part-time, contract, or intern)"),
  body("workMode")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeWorkMode)
    .isIn(["office", "remote", "hybrid", ""])
    .withMessage("Invalid work mode (must be office, remote, or hybrid)"),
  body("salaryDetails").optional({ nullable: true, checkFalsy: true }),
  body("address").optional({ nullable: true, checkFalsy: true }),
  body("emergencyContact").optional({ nullable: true, checkFalsy: true }),
  body("emergencyContactName").optional({ nullable: true, checkFalsy: true }).trim(),
  body("emergencyContactPhone").optional({ nullable: true, checkFalsy: true }).trim(),
  body("loginRole")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["Employee", "Manager", "HR", "CompanyAdmin"])
    .withMessage("loginRole must be Employee, Manager, HR, or CompanyAdmin"),
  body("documents").optional({ nullable: true, checkFalsy: true }),
  body("assignedModules").optional({ nullable: true, checkFalsy: true }),
  body("accessibleDepartments").optional({ nullable: true, checkFalsy: true }),
  body("reportingManagerId").optional({ nullable: true, checkFalsy: true }),
  body("noticePeriod").optional({ nullable: true, checkFalsy: true }).trim(),
  body("maritalStatus").optional({ nullable: true, checkFalsy: true }).trim(),
  body("middleName").optional({ nullable: true, checkFalsy: true }).trim(),
  body("password").optional({ nullable: true, checkFalsy: true }).trim(),
  body("allowRemotePunch").optional({ nullable: true }).isBoolean(),
  body("confirmationDate").optional({ nullable: true, checkFalsy: true }),
  body("permanentAddress").optional({ nullable: true, checkFalsy: true }),
  body("bankDetails").optional({ nullable: true, checkFalsy: true }),
  body("aadhaarNumber").optional({ nullable: true, checkFalsy: true }).trim(),
  body("panNumber").optional({ nullable: true, checkFalsy: true }).trim(),
];

const employeeUpdateRules = [
  body("firstName").optional().trim().notEmpty().withMessage("First name cannot be empty"),
  body("lastName").optional().trim().notEmpty().withMessage("Last name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("phone").optional({ nullable: true, checkFalsy: true }).trim(),
  body("photo").optional({ nullable: true, checkFalsy: true }).trim(),
  body("gender")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeGender)
    .isIn(["male", "female", "other", "prefer_not_say", ""])
    .withMessage("Invalid gender selected"),
  body("dateOfBirth").optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage("Invalid date of birth format"),
  body("joiningDate").optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage("Invalid joining date format"),
  body("departmentId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid department ID"),
  body("designationId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid designation ID"),
  body("branchId").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid branch ID"),
  body("employmentType")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeEmploymentType)
    .isIn(["full-time", "part-time", "contract", "intern", ""])
    .withMessage("Invalid employment type"),
  body("workMode")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(sanitizeWorkMode)
    .isIn(["office", "remote", "hybrid", ""])
    .withMessage("Invalid work mode"),
  body("salaryDetails").optional({ nullable: true, checkFalsy: true }).isObject(),
  body("address").optional({ nullable: true, checkFalsy: true }).trim(),
  body("emergencyContactName").optional({ nullable: true, checkFalsy: true }).trim(),
  body("emergencyContactPhone").optional({ nullable: true, checkFalsy: true }).trim(),
  body("documents").optional({ nullable: true, checkFalsy: true }).isObject(),
];

const employeeStatusRules = [
  body("status")
    .isIn(["active", "inactive", "terminated"])
    .withMessage("Invalid status"),
];

module.exports = {
  employeeCreateRules,
  employeeUpdateRules,
  employeeStatusRules,
};
