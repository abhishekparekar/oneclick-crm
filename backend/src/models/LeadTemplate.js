const mongoose = require("mongoose");

const leadTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    metaTemplateId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["MARKETING", "UTILITY", "AUTHENTICATION"],
      default: "MARKETING",
    },
    language: {
      type: String,
      default: "en",
    },
    status: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED", "PAUSED"],
      default: "APPROVED",
    },
    headerType: {
      type: String,
      default: "TEXT",
    },
    bodyText: {
      type: String,
      required: true,
    },
    footerText: {
      type: String,
      default: "",
    },
    variablesJson: {
      type: mongoose.Schema.Types.Mixed,
      default: () => [],
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model("LeadTemplate", leadTemplateSchema);
