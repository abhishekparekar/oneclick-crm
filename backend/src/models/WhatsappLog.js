const mongoose = require("mongoose");

const whatsappLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      default: "NOTIFICATION",
      index: true,
    },
    templateUsed: {
      type: String,
      default: "TEXT_MESSAGE",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["SENT", "FAILED", "DELIVERED", "READ", "PENDING", "VERIFIED", "CONNECTION_TEST"],
      default: "SENT",
      index: true,
    },
    provider: {
      type: String,
      default: "OFFICIAL_META",
    },
    wamid: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorCategory: {
      type: String,
      default: null,
    },
    resolutionHint: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
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

module.exports = mongoose.model("WhatsappLog", whatsappLogSchema);
