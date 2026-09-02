const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: [true, "Owner email is required"],
      lowercase: true,
      trim: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Company email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    taxId: {
      type: String,
      trim: true,
      default: "",
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    industryType: {
      type: String,
      trim: true,
    },
    planName: {
      type: String,
      trim: true,
      default: "Basic",
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    employeeLimit: {
      type: Number,
      default: 50,
    },
    storageLimit: {
      type: Number,
      default: 5,
    },
    subscribedModules: {
      type: [String],
      default: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"],
    },
    moduleLimits: {
      tasks:      { type: Number, default: 0 },
      leads:      { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
      leave:      { type: Number, default: 0 },
      payroll:    { type: Number, default: 0 },
      projects:   { type: Number, default: 0 },
      reports:    { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    settings: {
      shiftStartTime: { type: String, default: "09:30" },
      shiftEndTime: { type: String, default: "18:30" },
      graceMinutes: { type: Number, default: 15 },
      lateMarkGraceMinutes: { type: Number, default: 15 },
      halfDayHours: { type: Number, default: 4 },
      fullDayHours: { type: Number, default: 8 },
      workingDays: { type: [String], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
