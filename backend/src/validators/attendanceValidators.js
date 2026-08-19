const { body } = require("express-validator");

const locationRules = (prefix) => [
  body(`${prefix}.latitude`).optional().isFloat(),
  body(`${prefix}.longitude`).optional().isFloat(),
  body(`${prefix}.address`).optional().trim(),
];

const checkInRules = [
  ...locationRules("punchInLocation"),
  ...locationRules("checkInLocation") // compatibility
];

const checkOutRules = [
  ...locationRules("punchOutLocation"),
  ...locationRules("checkOutLocation") // compatibility
];

const regularizationRules = [
  body("reason").trim().notEmpty().withMessage("Regularization reason is required"),
];

module.exports = {
  checkInRules,
  checkOutRules,
  regularizationRules,
};
