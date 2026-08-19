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
    casual: {
      type: Number,
      default: 12,
    },
    sick: {
      type: Number,
      default: 10,
    },
    annual: {
      type: Number,
      default: 15,
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
  if (!settings) {
    settings = await CompanyLeaveSettings.create({ companyId });
  }

  return this.create({
    employeeId,
    companyId,
    casual: settings.defaultCasualLeaves,
    sick: settings.defaultSickLeaves,
    annual: settings.defaultAnnualLeaves,
    lop: settings.defaultUnpaidLeaves,
  });
};

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

module.exports = LeaveBalance;
