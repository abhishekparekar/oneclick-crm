const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
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
    employeeSnapshot: {
      employeeCode: String,
      employeeName: String,
      department: String,
      designation: String,
      branch: String,
      joiningDate: Date,
    },
    month: {
      type: String, // e.g., "1" for Jan, "2" for Feb OR "January", "February"
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    payrollPeriod: {
      fromDate: Date,
      toDate: Date,
    },
    attendanceSummary: {
      totalCalendarDays: { type: Number, default: 0 },
      workingDays: { type: Number, default: 0 },
      weeklyOffDays: { type: Number, default: 0 },
      holidayDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      paidLeaveDays: { type: Number, default: 0 },
      unpaidLeaveDays: { type: Number, default: 0 },
      lateDays: { type: Number, default: 0 },
      payableDays: { type: Number, default: 0 },
      lossOfPayDays: { type: Number, default: 0 },
    },
    earnings: {
      basicSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      conveyanceAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      otherAllowance: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      advanceDeduction: { type: Number, default: 0 },
      advanceRecoveryDetails: [
        {
          advanceId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryAdvance" },
          amount: Number,
          repaymentType: String,
        },
      ],
      otherDeductions: { type: Number, default: 0 },
      lopDeduction: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    grossSalary: {
      type: Number,
      required: true,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      default: 0,
    },
    amountInWords: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "generated", "paid", "cancelled"],
      default: "generated",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentDate: Date,
    paymentMode: String,
    transactionId: String,
    payslipNumber: String,
    payslipUrl: String,
    sentToEmployee: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

// Ensure only one payroll generated per employee per month per year
payrollSchema.index({ companyId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

payrollSchema.index({ companyId: 1, month: 1, year: 1, status: 1 });

const Payroll = mongoose.model("Payroll", payrollSchema);
module.exports = Payroll;
