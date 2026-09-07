const mongoose = require("mongoose");

const trackingAllowanceSchema = new mongoose.Schema(
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
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    distanceKm: {
      type: Number,
      default: 0,
    },
    ratePerKm: {
      type: Number,
      default: 4,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    vehicleType: {
      type: String,
      enum: ["two_wheeler", "four_wheeler", "other"],
      default: "two_wheeler",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

trackingAllowanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });

const TrackingAllowance = mongoose.model("TrackingAllowance", trackingAllowanceSchema);

module.exports = TrackingAllowance;
