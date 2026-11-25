const mongoose = require("mongoose");

const leadSourceSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Compound unique index to guarantee no duplicate source names within the same company
leadSourceSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("LeadSource", leadSourceSchema);
