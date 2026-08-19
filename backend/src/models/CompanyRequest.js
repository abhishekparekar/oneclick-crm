const mongoose = require("mongoose");

const companyRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      unique: true,
      required: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: [true, "Owner email is required"],
      lowercase: true,
      trim: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
    },
    industryType: {
      type: String,
      trim: true,
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    requestedPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    message: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["website", "manual", "referral", "sales"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "demo_scheduled", "approved", "rejected", "converted"],
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Sales rep / SuperAdmin
    },
    demoDate: {
      type: Date,
    },
    notes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rejectionReason: {
      type: String,
      trim: true,
    },
    convertedCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
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

const CompanyRequest = mongoose.model("CompanyRequest", companyRequestSchema);

module.exports = CompanyRequest;
