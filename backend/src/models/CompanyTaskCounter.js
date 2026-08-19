const mongoose = require("mongoose");

const companyTaskCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    currentSequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const CompanyTaskCounter = mongoose.model("CompanyTaskCounter", companyTaskCounterSchema);
module.exports = CompanyTaskCounter;
