const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      default: "Nextact",
    },
    supportEmail: {
      type: String,
      default: "support@icodedhrms.com",
    },
    supportPhone: {
      type: String,
      default: "+91 9876543210",
    },
    defaultCurrency: {
      type: String,
      default: "INR",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);

module.exports = SystemSetting;
