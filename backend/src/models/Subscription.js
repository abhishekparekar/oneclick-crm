const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    trialEndsAt: {
      type: Date,
    },
    amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "active",
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
