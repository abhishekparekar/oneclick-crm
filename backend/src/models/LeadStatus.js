const mongoose = require("mongoose");

const leadStatusSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#EAB308",
    },
    displayOrder: {
      type: Number,
      default: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound unique index to guarantee no duplicate status names within the same company
leadStatusSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("LeadStatus", leadStatusSchema);
