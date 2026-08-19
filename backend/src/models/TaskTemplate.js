const mongoose = require("mongoose");

const taskTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    taskId: {
      type: String, // format: TASK-00001
      required: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignmentType: {
      type: String,
      enum: ["self", "employee", "multiple_employees", "department", "company_wide", "multiple", "company", "both"],
      default: "employee",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    }],
    title: {
      type: String,
      required: [true, "Template title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    repeatEnabled: {
      type: Boolean,
      default: false,
    },
    repeatType: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    weeklyDays: {
      type: [String],
      default: [], // e.g. ["Monday", "Tuesday"]
    },
    monthlyDates: {
      type: [Number],
      default: [], // e.g. [1, 15] for 1st and 15th
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null, // Initial expected end date (if applicable for base calculation)
    },
    deadlineTime: {
      type: String, // e.g. "18:00" - time of day tasks are due
      default: "18:00",
    },
    finishDate: {
      type: Date,
      default: null, // The absolute final date this recurring template stops generating
    },
    attachments: [{
      fileUrl: { type: String, required: true },
      fileName: { type: String, required: true },
      fileType: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],
    checklist: [{
      title: { type: String, required: true },
      isCompleted: { type: Boolean, default: false }
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    comments: [{
      comment: { type: String },
      senderName: { type: String },
      senderRole: { type: String },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      attachments: [{
        fileUrl: { type: String },
        fileName: { type: String },
        fileType: { type: String }
      }],
      createdAt: { type: Date, default: Date.now }
    }],
    status: {
      type: String,
      default: "pending",
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    lastGeneratedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const TaskTemplate = mongoose.model("TaskTemplate", taskTemplateSchema);
module.exports = TaskTemplate;
