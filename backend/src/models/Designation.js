const mongoose = require("mongoose");

const designationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Designation name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

designationSchema.index({ companyId: 1, departmentId: 1, name: 1 }, { unique: true });

const Designation = mongoose.model("Designation", designationSchema);

module.exports = Designation;
