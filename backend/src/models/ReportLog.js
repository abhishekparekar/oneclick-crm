const mongoose = require("mongoose");

const reportLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    reportType: {
      type: String,
      required: [true, "Report type is required"],
      trim: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ReportLog = mongoose.model("ReportLog", reportLogSchema);

module.exports = ReportLog;
