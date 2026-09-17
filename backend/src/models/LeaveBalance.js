const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
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
      unique: true,
    },
    monthlyLeaves: {
      type: Number,
      default: 0,
    },
    monthlyCasual: {
      type: Number,
      default: 0,
    },
    monthlySick: {
      type: Number,
      default: 0,
    },
    monthlyAnnual: {
      type: Number,
      default: 0,
    },
    paidLeaves: {
      type: Number,
      default: 0,
    },
    unpaidLeaves: {
      type: Number,
      default: 0,
    },
    casual: {
      type: Number,
      default: 0,
    },
    sick: {
      type: Number,
      default: 0,
    },
    annual: {
      type: Number,
      default: 0,
    },
    lop: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.statics.createWithDefaults = async function (employeeId, companyId) {
  const CompanyLeaveSettings = require("./CompanyLeaveSettings");
  let settings = await CompanyLeaveSettings.findOne({ companyId });

  return this.create({
    employeeId,
    companyId,
    monthlyLeaves: 0,
    monthlyCasual: 0,
    monthlySick: 0,
    monthlyAnnual: 0,
    paidLeaves: 0,
    casual: settings?.defaultCasualLeaves ?? 0,
    sick: settings?.defaultSickLeaves ?? 0,
    annual: settings?.defaultAnnualLeaves ?? 0,
    lop: settings?.defaultUnpaidLeaves ?? 0,
  });
};

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

module.exports = LeaveBalance;
