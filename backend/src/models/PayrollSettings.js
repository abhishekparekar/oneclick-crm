const mongoose = require("mongoose");

const payrollSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
      unique: true,
    },

    // ==========================================
    // SALARY CALCULATION MODE
    // ==========================================

    // Integration & Overtime
    isSalaryLinkedWithAttendance: {
      type: Boolean,
      default: true,
    },
    overtimeCalculationEnabled: {
      type: Boolean,
      default: false,
    },

    salaryCalculationMode: {
      type: String,
      enum: ["calendar_days", "working_days", "manual"],
      default: "working_days",
    },

    // ==========================================
    // ADMIN PAYABLE MONTH DAYS OVERRIDE
    // Formula: Monthly Salary / payableMonthDays × Employee Payable Days
    // If 0 → auto-calculate from workingDays + weeklyOff (if paid) + holidays (if paid)
    // ==========================================
    payableMonthDays: {
      type: Number,
      default: 0, // 0 = auto-calculate
      min: 0,
      max: 31,
    },

    // ==========================================
    // WEEKLY OFF CONFIGURATION
    // Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Default: [0] = Sunday only (6-day work week)
    // Common: [0, 6] = Sunday + Saturday (5-day work week)
    // ==========================================
    weeklyOffDays: {
      type: [Number],
      default: [0], // Sunday
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: "weeklyOffDays must be 0-6",
      },
    },
    includeWeeklyOffAsPaid: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // HOLIDAY RULES
    // ==========================================
    includeHolidayAsPaid: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // ATTENDANCE HOUR THRESHOLDS
    // Used to auto-classify punch records when explicit status isn't set
    // ==========================================
    fullDayMinHours: {
      type: Number,
      default: 8,
      min: 1,
      max: 24,
    },
    halfDayMinHours: {
      type: Number,
      default: 4,
      min: 0.5,
      max: 12,
    },

    // ==========================================
    // PAYROLL CYCLE
    // ==========================================
    payrollCycleStartDay: {
      type: Number,
      default: 1,
    },
    payrollCycleEndDay: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // DEDUCTION RULES
    // ==========================================
    halfDayDeductionMode: {
      type: String,
      enum: ["half_day_lop"],
      default: "half_day_lop",
    },
    pfEnabled: {
      type: Boolean,
      default: true,
    },
    esiEnabled: {
      type: Boolean,
      default: true,
    },
    professionalTaxEnabled: {
      type: Boolean,
      default: true,
    },
    tdsEnabled: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // DISPLAY
    // ==========================================
    defaultCurrency: {
      type: String,
      default: "INR",
    },
    payslipPrefix: {
      type: String,
      default: "PAY",
    },
  },
  {
    timestamps: true,
  }
);

const PayrollSettings = mongoose.model("PayrollSettings", payrollSettingsSchema);
module.exports = PayrollSettings;
