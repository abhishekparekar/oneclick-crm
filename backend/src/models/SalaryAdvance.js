const mongoose = require("mongoose");

const salaryAdvanceSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      default: "Personal Advance / Emergency",
    },
    disbursedDate: {
      type: Date,
      default: Date.now,
    },
    disbursedMode: {
      type: String,
      enum: ["bank_transfer", "cash", "cheque", "upi"],
      default: "bank_transfer",
    },
    // Repayment Plan
    repaymentType: {
      type: String,
      enum: ["full_next_month", "fixed_monthly_amount", "percentage_of_salary", "manual_direct"],
      default: "full_next_month",
    },
    monthlyDeductionAmount: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0, // e.g. 10 for 10%
    },
    totalRecovered: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },
    recoveryHistory: [
      {
        payrollId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payroll",
        },
        month: String,
        year: Number,
        amount: {
          type: Number,
          required: true,
        },
        deductedAt: {
          type: Date,
          default: Date.now,
        },
        recoveryType: {
          type: String,
          enum: ["payroll_deduction", "direct_cash", "direct_bank", "adjustment"],
          default: "payroll_deduction",
        },
        notes: String,
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

salaryAdvanceSchema.index({ companyId: 1, employeeId: 1, status: 1 });

const SalaryAdvance = mongoose.model("SalaryAdvance", salaryAdvanceSchema);
module.exports = SalaryAdvance;
