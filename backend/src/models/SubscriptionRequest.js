const mongoose = require("mongoose");

const subscriptionRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["upgrade_plan", "renew_plan", "increase_seats", "custom_module", "trial_extension", "other"],
      default: "upgrade_plan",
    },
    currentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    currentPlanName: {
      type: String,
    },
    requestedPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    requestedPlanName: {
      type: String,
    },
    requestedSeats: {
      type: Number,
      default: 0,
    },
    requestedModules: [
      {
        type: String,
      },
    ],
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "trial"],
      default: "yearly",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected", "provisioned"],
      default: "pending",
    },
    adminResponseNotes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to generate readable request code
subscriptionRequestSchema.pre("validate", function (next) {
  if (!this.requestCode) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.requestCode = `SUBREQ-${Date.now().toString().slice(-6)}-${randomSuffix}`;
  }
  next();
});

const SubscriptionRequest = mongoose.model("SubscriptionRequest", subscriptionRequestSchema);

module.exports = SubscriptionRequest;
