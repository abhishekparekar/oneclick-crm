const mongoose = require("mongoose");

const taskActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "created",
        "generated",
        "in_process",
        "completed",
        "overdue",
        "late_completed",
        "reopened",
        "re_in_process",
        "re_complete",
        "re_late_complete",
        "shifted",
        "cancelled",
        "comment_added",
        "daily_report",
        "edited",
        "follow_up"
      ],
      required: true,
    },
    shiftedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    shiftedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
    attachments: [{
      fileUrl: { type: String, required: true },
      fileName: { type: String, required: true },
      fileType: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can be User or Employee depending on who performed it
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const TaskActivity = mongoose.model("TaskActivity", taskActivitySchema);
module.exports = TaskActivity;
