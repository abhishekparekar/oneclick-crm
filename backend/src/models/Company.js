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
      set: (v) => (v === "" ? null : v),
      default: null,
    },
    employeeLimit: {
      type: Number,
      default: 50,
    },
    storageLimit: {
      type: Number,
      default: 5,
    },
    trialDays: {
      type: Number,
      default: 7,
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    subscribedModules: {
      type: [String],
      default: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"],
    },
    moduleLimits: {
      tasks:      { type: Number, default: 0 },
      leads:      { type: Number, default: 0 },
      map_leads:  { type: Number, default: 0 },
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletionReason: {
      type: String,
      default: "",
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    permanentDeleteAt: {
      type: Date,
      default: null,
      index: true,
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
      travelAllowanceRatePerKm: { type: Number, default: 4.0 },
      travelAllowanceTwoWheelerRate: { type: Number, default: 4.0 },
      travelAllowanceFourWheelerRate: { type: Number, default: 8.0 },
      attendanceNotifications: {
        punchIn: {
          enabled: { type: Boolean, default: false },
          notifyEmployee: { type: Boolean, default: false },
          notifyManager: { type: Boolean, default: false },
          notifyAdmin: { type: Boolean, default: false },
        },
        punchOut: {
          enabled: { type: Boolean, default: false },
          notifyEmployee: { type: Boolean, default: false },
          notifyManager: { type: Boolean, default: false },
          notifyAdmin: { type: Boolean, default: false },
        },
      },
      taskNotifications: {
        taskCreated: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskAssigned: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskStatusChanged: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskCompleted: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskLateCompleted: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskOverdue: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskComments: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
        taskFollowUp: {
          enabled: { type: Boolean, default: true },
          notifyAssignee: { type: Boolean, default: true },
          notifyManager: { type: Boolean, default: true },
          notifyAdmin: { type: Boolean, default: true },
        },
      },
      breaks: {
        lunchBreak: {
          enabled: { type: Boolean, default: true },
          durationMinutes: { type: Number, default: 45 },
          startTime: { type: String, default: "13:00" },
          endTime: { type: String, default: "14:00" },
        },
        teaBreak: {
          enabled: { type: Boolean, default: true },
          durationMinutes: { type: Number, default: 15 },
          maxPerDay: { type: Number, default: 2 },
        },
        deductFromWorkingHours: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
