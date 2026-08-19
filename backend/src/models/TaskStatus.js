const mongoose = require("mongoose");

const taskStatusSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    statusKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#1e293b",
    },
    backgroundColor: {
      type: String,
      default: "#f1f5f9",
    },
    icon: {
      type: String,
      default: "ellipse-outline",
    },
    type: {
      type: String,
      enum: ["system", "workflow"],
      default: "workflow",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    isDeletable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure statusKey is unique per company
taskStatusSchema.index({ companyId: 1, statusKey: 1 }, { unique: true });

const TaskStatus = mongoose.model("TaskStatus", taskStatusSchema);

module.exports = TaskStatus;
