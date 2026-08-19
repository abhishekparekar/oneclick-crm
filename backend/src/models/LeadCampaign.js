const mongoose = require("mongoose");

const leadCampaignSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    templateId: {
      type: String,
      default: null,
    },
    audienceType: {
      type: String,
      enum: ["ALL", "STATUS", "DATE_RANGE"],
      default: "ALL",
    },
    audienceFilter: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    variableMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "PROCESSING", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    totalAudience: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("LeadCampaign", leadCampaignSchema);
