const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
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
    whatsappPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
    },
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
      required: true,
      index: true,
    },
    source: {
      type: String,
      default: "Walk-in",
    },
    productService: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    anniversaryDate: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    whatsappOptIn: {
      type: Boolean,
      default: true,
    },
    whatsappOptInAt: {
      type: Date,
      default: Date.now,
    },
    company: {
      type: String,
      default: null,
      trim: true,
    },
    estimatedValue: {
      type: Number,
      default: null,
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
      index: true,
    },
    followUpNotified: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeadTag",
      },
    ],
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "" },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    leadNotes: [
      {
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    leadMessages: [
      {
        messageContent: { type: String, required: true },
        templateName: { type: String, default: "" },
        direction: { type: String, enum: ["INBOUND", "OUTBOUND"], default: "OUTBOUND" },
        status: { type: String, default: "SENT" },
        source: { type: String, default: "WHATSAPP" },
        errorMessage: { type: String, default: "" },
        errorCode: { type: String, default: "" },
        metaMessageId: { type: String, default: "" },
        scheduledAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    leadActivities: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        type: { type: String, default: "MESSAGE" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
