const mongoose = require("mongoose");

const companyLeaveSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    allowManagerLeaveApproval: {
      type: Boolean,
      default: true,
    },
    allowPaidLeaveOverflowAsLWP: {
      type: Boolean,
      default: true,
    },
    defaultCasualLeaves: {
      type: Number,
      default: 0,
    },
    defaultSickLeaves: {
      type: Number,
      default: 0,
    },
    defaultAnnualLeaves: {
      type: Number,
      default: 0,
    },
    defaultUnpaidLeaves: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const CompanyLeaveSettings = mongoose.model(
  "CompanyLeaveSettings",
  companyLeaveSettingsSchema
);

module.exports = CompanyLeaveSettings;
