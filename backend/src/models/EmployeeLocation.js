const mongoose = require("mongoose");

const employeeLocationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    altitude: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    batteryLevel: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast historical trail lookups & live tracking queries
employeeLocationSchema.index({ companyId: 1, employeeId: 1, timestamp: -1 });
employeeLocationSchema.index({ employeeId: 1, timestamp: -1 });

const EmployeeLocation = mongoose.model("EmployeeLocation", employeeLocationSchema);

module.exports = EmployeeLocation;
