const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      default: "General",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, entityId: 1, module: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
