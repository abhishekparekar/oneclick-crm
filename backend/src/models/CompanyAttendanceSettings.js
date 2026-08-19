const mongoose = require("mongoose");

const companyAttendanceSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    officeName: {
      type: String,
      trim: true,
      default: "Main Office",
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    allowedRadiusMeters: {
      type: Number,
      default: 100,
    },
    attendanceMode: {
      type: String,
      enum: ["office_only", "remote_allowed", "hybrid"],
      default: "office_only",
    },
    requireGps: {
      type: Boolean,
      default: true,
    },
    requireSelfie: {
      type: Boolean,
      default: false,
    },
    allowAdminBypassGeoFencing: {
      type: Boolean,
      default: true,
    },
    allowManagerAttendanceApproval: {
      type: Boolean,
      default: true,
    },
    allowManagerManualAttendance: {
      type: Boolean,
      default: false,
    },

    // Module Toggles & Rules
    enableAttendanceModule: {
      type: Boolean,
      default: true,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
    },
    autoHalfDayOnLate: {
      type: Boolean,
      default: true,
    },
    earlyLeaveGracePeriodMinutes: {
      type: Number,
      default: 10,
    },
    autoHalfDayOnEarlyLeave: {
      type: Boolean,
      default: true,
    },

    allowManagerNestedTeamAccess: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const CompanyAttendanceSettings = mongoose.model(
  "CompanyAttendanceSettings",
  companyAttendanceSettingsSchema
);

module.exports = CompanyAttendanceSettings;
