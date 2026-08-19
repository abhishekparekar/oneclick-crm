const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    device: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

module.exports = LoginHistory;
