const mongoose = require("mongoose");

const salaryStructureSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    monthlyCTC: {
      type: Number,
      required: true,
      default: 0,
    },
    basicSalary: {
      type: Number,
      required: true,
      default: 0,
    },
    hra: {
      type: Number,
      default: 0,
    },
    conveyanceAllowance: {
      type: Number,
      default: 0,
    },
    medicalAllowance: {
      type: Number,
      default: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
    },
    otherAllowance: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number, // basic + hra + allowances
      required: true,
      default: 0,
    },
    pf: {
      type: Number,
      default: 0,
    },
    esi: {
      type: Number,
      default: 0,
    },
    professionalTax: {
      type: Number,
      default: 0,
    },
    tds: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
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

// We cannot use unique: true on employeeId because we keep inactive history.
// However, we should ensure only ONE active salary structure exists per employee
salaryStructureSchema.index(
  { employeeId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

salaryStructureSchema.index({ companyId: 1 });

const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);
module.exports = SalaryStructure;
