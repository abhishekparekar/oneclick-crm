const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    timerActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance
timesheetSchema.index({ employeeId: 1, startTime: -1 });
timesheetSchema.index({ taskId: 1, employeeId: 1 });
timesheetSchema.index({ projectId: 1, employeeId: 1 });

const Timesheet = mongoose.model("Timesheet", timesheetSchema);

module.exports = Timesheet;
