const mongoose = require("mongoose");

const companyTaskSettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    allowManagerCreateTask: {
      type: Boolean,
      default: true,
    },
    allowManagerEditTeamTask: {
      type: Boolean,
      default: true,
    },
    allowManagerDeleteOwnTask: {
      type: Boolean,
      default: false,
    },
    allowManagerCreateProject: {
      type: Boolean,
      default: false,
    },
    allowManagerEditProject: {
      type: Boolean,
      default: false,
    },
    allowManagerCreateProjectTask: {
      type: Boolean,
      default: true,
    },
    allowManagerApproveTimesheet: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CompanyTaskSettings = mongoose.model(
  "CompanyTaskSettings",
  companyTaskSettingsSchema
);

module.exports = CompanyTaskSettings;
