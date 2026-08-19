const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    invoiceNo: {
      type: String,
    },
    billingCycle: {
      type: String,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet", "cash"],
      required: true,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "pending",
    },
    invoiceUrl: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
