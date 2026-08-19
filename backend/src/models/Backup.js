const mongoose = require("mongoose");

const backupSchema = new mongoose.Schema(
  {
    backupDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["inProgress", "completed", "failed"],
      default: "inProgress",
    },
    backupSize: {
      type: Number,
    },
    filePath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Backup = mongoose.model("Backup", backupSchema);

module.exports = Backup;
