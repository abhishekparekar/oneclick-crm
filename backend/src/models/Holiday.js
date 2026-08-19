const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
    },
    type: { type: String, enum: ['public', 'optional', 'company'], default: 'public' },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Unique holiday name per company per date
holidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

const Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = Holiday;
