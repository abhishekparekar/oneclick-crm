const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["planning", "active", "working", "review", "deployment", "completed"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    estimatedWorkingDays: {
      type: Number,
      default: 0
    },
    clientName: {
      type: String,
      trim: true,
      default: ""
    },
    actualWorkingDays: {
      type: Number,
      default: 0
    },
    milestones: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
        status: { type: String, enum: ["pending", "completed"], default: "pending" }
      }
    ],
    notices: [
      {
        message: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        senderName: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    attachments: [
      {
        fileName: { type: String, default: "Attachment" },
        fileUrl: { type: String, default: "" },
        fileType: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    activityLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ companyId: 1, status: 1 });

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
