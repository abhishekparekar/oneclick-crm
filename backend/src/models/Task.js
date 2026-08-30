const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    taskId: {
      type: String, // format: T-00001
      required: false, // only assigned when task becomes live
      index: true,
    },
    taskSequenceNumber: {
      type: Number,
      required: false, // matches the numeric part of taskId
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskTemplate",
      default: null,
      index: true,
    },
    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskTemplate",
      default: null,
      index: true,
    },
    generatedDate: {
      type: Date,
      default: null,
    },
    isGeneratedFromTemplate: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    }],
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ["self", "employee", "multiple_employees", "department", "company_wide", "multiple", "company", "both"],
      default: "multiple",
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
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
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true, // for overdue cron
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "in_process",
        "overdue",
        "complete",
        "late_complete",
        "re_open",
        "re_pending",
        "re_in_process",
        "re_complete",
        "re_late_complete",
        "cancelled"
      ],
      default: "pending",
      index: true,
    },
    timerActive: {
      type: Boolean,
      default: false,
    },
    isReopened: {
      type: Boolean,
      default: false,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },
    shiftReason: {
      type: String,
      trim: true,
      default: "",
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    liveAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lateCompletedAt: {
      type: Date,
      default: null,
    },
    delayedDuration: {
      days: { type: Number, default: 0 },
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 },
    },
    reminderStage: {
      type: Number,
      default: 0, // 0: None, 1: 2-Hour Pre-Due Alert, 2: 30-Min Urgent Alert, 3: Overdue Alert
    },
    lastReminderSentAt: {
      type: Date,
      default: null,
    },
    attachments: [{
      fileUrl: { type: String, required: true },
      fileName: { type: String, default: "Attachment" },
      fileType: { type: String, default: "" },
      uploadedAt: { type: Date, default: Date.now },
    }],
    checklist: [{
      title: { type: String, required: true },
      isCompleted: { type: Boolean, default: false }
    }],
    comments: [{
      comment: { type: String },
      senderName: { type: String },
      senderRole: { type: String },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      attachments: [{
        fileUrl: { type: String },
        fileName: { type: String, default: "Attachment" },
        fileType: { type: String, default: "" }
      }],
      createdAt: { type: Date, default: Date.now }
    }],
    finalRemarks: {
      type: String,
      default: "",
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    reopenCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictPopulate: false,
  }
);

// Virtual for assignees (aliases assignedTo for front-end compatibility)
taskSchema.virtual("assignees").get(function () {
  return this.assignedTo;
});
taskSchema.virtual("assignees").set(function (val) {
  this.assignedTo = val;
});

// Pre-save to auto-set isLive if taskId exists
taskSchema.pre("save", function () {
  if (this.taskId && !this.isLive) {
    this.isLive = true;
    this.liveAt = new Date();
  }
});

taskSchema.index({ companyId: 1, status: 1 });
taskSchema.index({ companyId: 1, assignedTo: 1 });
taskSchema.index({ companyId: 1, isLive: 1, createdAt: -1 });
taskSchema.index({ companyId: 1, isLive: 1, startDateTime: -1 });
taskSchema.index({ companyId: 1, departmentId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
