const mongoose = require("mongoose");

const internalRequestResponseSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      default: "Employee",
    },
    senderAvatar: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "" },
      },
    ],
    isResolution: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const internalRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    requestCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Request title is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Data Request",
        "Document Submission",
        "General Query",
        "IT Support",
        "HR Assistance",
        "Feedback & Survey",
        "Approval Request",
        "Accounts & Finance",
        "Other",
      ],
      default: "General Query",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, default: "document" },
        size: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requesterRole: {
      type: String,
      default: "Employee",
    },
    targetType: {
      type: String,
      enum: ["ALL_EMPLOYEES", "DEPARTMENT", "SPECIFIC_EMPLOYEES"],
      default: "ALL_EMPLOYEES",
    },
    targetDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    targetDepartmentName: {
      type: String,
      default: "",
    },
    targetEmployeeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    responses: [internalRequestResponseSchema],
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

internalRequestSchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("InternalRequest", internalRequestSchema);
