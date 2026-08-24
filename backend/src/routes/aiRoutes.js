const express = require("express");
const router = express.Router();
const {
  getDashboardSummary,
  getLeadAnalysis,
  getTaskAnalysis,
  getProjectAnalysis,
  getEmployeePerformance,
  askBusiness,
  getCEOReport,
  getWeeklyReport,
  approveAction,
  getHistory,
  // Phase 2
  getProblemDetection,
  getDepartmentAnalysis,
  getTrainingNeeds,
  getImprovementPlan,
  // Phase 3 & 4
  executeAction,
  getLeadScoring,
  getBusinessForecasting,
  getTrainingEffectiveness,
} = require("../controllers/aiController");

/**
 * AI Routes — All protected by parent middleware (protect + checkSubscription)
 * Base: /api/ai
 */

// Dashboard & Reports (Phase 1)
router.get("/dashboard-summary", getDashboardSummary);
router.get("/ceo-report", getCEOReport);
router.get("/weekly-report", getWeeklyReport);

// Analysis Endpoints (Phase 1)
router.get("/lead-analysis", getLeadAnalysis);
router.get("/task-analysis", getTaskAnalysis);
router.get("/project-analysis", getProjectAnalysis);
router.get("/employee-performance", getEmployeePerformance);

// Phase 2: Deep Analysis & Recommendations
router.get("/problem-detection", getProblemDetection);
router.get("/department-analysis", getDepartmentAnalysis);
router.get("/training-needs", getTrainingNeeds);
router.get("/improvement-plan", getImprovementPlan);

// Phase 3: Action Execution Engine
router.post("/execute-action", executeAction);
router.post("/approve-action", approveAction);

// Phase 4: Advanced Predictive AI & Continuous Improvement
router.get("/lead-scoring", getLeadScoring);
router.get("/business-forecasting", getBusinessForecasting);
router.get("/training-effectiveness", getTrainingEffectiveness);

// Interactive AI
router.post("/ask-business", askBusiness);

// History
router.get("/history", getHistory);

module.exports = router;
