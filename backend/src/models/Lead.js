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
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
