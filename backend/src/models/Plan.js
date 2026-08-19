const mongoose = require("mongoose");

const MODULES = [
  "attendance",
  "leave",
  "payroll",
  "tasks",
  "projects",
  "recruitment",
  "performance",
  "reports",
  "whatsapp",
  "mobileApp",
  "webAdmin"
];

const planSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    planCode: {
      type: String,
      required: [true, "Plan code is required"],
      unique: true,
      trim: true,
    },
    priceMonthly: {
      type: Number,
      required: [true, "Monthly price is required"],
    },
    priceYearly: {
      type: Number,
      required: [true, "Yearly price is required"],
    },
    employeeLimit: {
      type: Number,
      required: [true, "Employee limit is required"],
    },
    storageLimit: {
      type: Number,
      default: 5,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    modules: {
      type: [String],
      enum: MODULES,
      default: ["attendance", "leave", "reports"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
