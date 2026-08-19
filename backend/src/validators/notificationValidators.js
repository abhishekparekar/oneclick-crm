const { body } = require("express-validator");

const createNotificationRules = [
  body("title").trim().notEmpty().withMessage("Notification title is required"),
  body("body").trim().notEmpty().withMessage("Notification body is required"),
  body("type")
    .optional()
    .isIn(["attendance", "leave", "payroll", "task", "project", "system"])
    .withMessage("Invalid notification type"),
  body("userId").notEmpty().isMongoId().withMessage("Valid userId is required"),
  body("companyId").optional().isMongoId().withMessage("Valid companyId is required"),
];

module.exports = { createNotificationRules };
