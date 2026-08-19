const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
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
    },
    date: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    punchInTime: {
      type: Date,
      default: null,
    },
    punchOutTime: {
      type: Date,
      default: null,
    },
    punchInLocation: {
      type: locationSchema,
      default: () => ({}),
    },
    punchOutLocation: {
      type: locationSchema,
      default: () => ({}),
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "present",
        "half_day",
        "absent",
        "late",
        "paid_leave",
        "unpaid_leave",
        "holiday",
        "weekly_off",
      ],
      default: "absent",
    },
    source: {
      type: String,
      enum: ["punch", "manual", "system"],
      default: "punch",
    },
    isManuallyUpdated: {
      type: Boolean,
      default: false,
    },
    manualStatus: {
      type: String,
      default: null,
    },
    manualReason: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    regularizationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    regularizationReason: {
      type: String,
      trim: true,
      default: "",
    },
    regularizationLocation: {
      type: locationSchema,
      default: () => ({}),
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    distanceFromOffice: {
      type: Number,
      default: null,
    },
    locationType: {
      type: String,
      enum: ["office", "remote"],
      default: "office",
    },
    gpsValidated: {
      type: Boolean,
      default: false,
    },
    officeLocationSnapshot: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      radius: { type: Number, default: null },
    },
    punchInSelfie: {
      type: String, // base64 data URI
      default: null,
    },
    punchOutSelfie: {
      type: String, // base64 data URI
      default: null,
    },
    punchLog: [
      {
        punchInTime: { type: Date, default: null },
        punchOutTime: { type: Date, default: null },
        punchInLocation: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null },
          address: { type: String, trim: true, default: "" },
        },
        punchOutLocation: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null },
          address: { type: String, trim: true, default: "" },
        },
        punchInSelfie: { type: String, default: null },
        punchOutSelfie: { type: String, default: null },
      }
    ],
  },
  { timestamps: true }
);

attendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1, status: 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
