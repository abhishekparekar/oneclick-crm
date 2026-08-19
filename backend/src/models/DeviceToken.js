const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    fcmToken: {
      type: String,
      required: true,
      unique: true,
    },
    deviceId: {
      type: String,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

module.exports = DeviceToken;
