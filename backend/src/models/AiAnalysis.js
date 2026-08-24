const mongoose = require("mongoose");

const aiAnalysisSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "dashboard_summary",
        "lead_analysis",
        "task_analysis",
        "project_analysis",
        "employee_performance",
        "department_analysis",
        "problem_detection",
        "training_needs",
        "improvement_plan",
        "lead_scoring",
        "business_forecasting",
        "training_effectiveness",
        "action_execution",
        "ceo_report",
        "weekly_report",
        "ask_business",
      ],
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "daily",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    question: {
      // For "ask_business" type
      type: String,
      default: null,
    },
    analysisData: {
      // Raw CRM data used for analysis (aggregated, not raw DB)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
    error: { type: String, default: null },
    // Caching — avoid regenerating same analysis within TTL
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
      index: { expires: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

aiAnalysisSchema.index({ companyId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("AiAnalysis", aiAnalysisSchema);
