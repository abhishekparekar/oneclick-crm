const mongoose = require("mongoose");

const leadTagSchema = new mongoose.Schema(
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
      default: "#D97706",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeadTag", leadTagSchema);
