import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import {
  BrainCircuit,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Users,
  GraduationCap,
  Target,
  MessageSquare,
  Zap,
  ChevronRight,
  Send,
  ShieldAlert,
  BarChart3,
  Briefcase,
  Compass,
  Check,
  X,
  Flame,
  Activity,
  CalendarCheck,
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
  Percent,
  FolderKanban,
  ListTodo,
} from "lucide-react";

// ─────────────────────────────────────────────────
// API Helper
// ─────────────────────────────────────────────────
const aiApi = {
  get: async (endpoint, params = {}) => {
    try {
      const res = await api.get(`/ai/${endpoint}`, { params });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Request failed";
      throw new Error(msg);
    }
  },
  post: async (endpoint, body = {}) => {
    try {
      const res = await api.post(`/ai/${endpoint}`, body);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Request failed";
      throw new Error(msg);
    }
  },
};

// ─────────────────────────────────────────────────
// UI Sub-components (One Click Design System)
// ─────────────────────────────────────────────────

const RiskBadge = ({ level = "Medium" }) => {
  const styles = {
    High: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50",
    Critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60 font-bold",
    Medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[level] || styles.Medium
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {level}
    </span>
  );
};

const HealthGauge = ({ score = 0, label = "Business Health Score", confidence = "High" }) => {
  const getColor = (s) => {
    if (s >= 75) return { stroke: "#10B981", text: "text-emerald-600 dark:text-emerald-400" };
    if (s >= 50) return { stroke: "#F59E0B", text: "text-amber-600 dark:text-amber-400" };
    if (s >= 25) return { stroke: "#F97316", text: "text-orange-600 dark:text-orange-400" };
    return { stroke: "#EF4444", text: "text-rose-600 dark:text-rose-400" };
  };

  const theme = getColor(score);
  const angle = (Math.max(0, Math.min(100, score)) / 100) * 180;
  const radius = 64;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (angle / 180) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 160 90" className="w-full h-full">
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="#E2E8F0"
            className="dark:stroke-slate-800"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke={theme.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className={`text-3xl font-extrabold tracking-tight ${theme.text}`}>
            {score}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">/ 100</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 text-center">{label}</p>
      <span className="text-[11px] text-slate-400 mt-0.5">{confidence} Confidence</span>
    </div>
  );
};

const LoadingState = ({ message = "AI is analyzing CRM data and generating intelligence..." }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="relative mb-4">
      <div className="w-14 h-14 rounded-2xl bg-[#1268D9]/10 dark:bg-[#1268D9]/20 border border-[#1268D9]/30 flex items-center justify-center animate-pulse">
        <BrainCircuit className="w-7 h-7 text-[#1268D9] animate-spin" style={{ animationDuration: "3s" }} />
      </div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0D1B2E] animate-ping" />
    </div>
    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Generating AI Insights</h4>
    <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-md">{message}</p>
  </div>
);

const ActionCard = ({ action, index, onExecute, onApprove }) => {
  const [status, setStatus] = useState(action.approvalStatus || "pending");
  const [executing, setExecuting] = useState(false);
  const [executedMsg, setExecutedMsg] = useState("");

  const handleAction = async (s) => {
    setStatus(s);
    onApprove && onApprove(index, s);
    if (s === "approved" && onExecute) {
      setExecuting(true);
      try {
        const res = await onExecute({
          actionType: action.actionType || "create_task",
          title: action.action,
          description: action.expectedOutcome || "AI Recommended Action",
          priority: action.priority || "medium",
        });
        setExecutedMsg(res.actionResult || "Action executed in CRM!");
      } catch (e) {
        console.warn("Execution error:", e.message);
      } finally {
        setExecuting(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/90 dark:border-[#1C3554] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#1268D9]/40 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#1268D9]/10 text-[#1268D9] dark:bg-[#1268D9]/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{action.action}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-400 capitalize">{action.owner || "Management"}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-[11px] font-medium text-[#1268D9]">{action.deadline || "Action required"}</span>
            {executedMsg && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ {executedMsg}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
        {status === "pending" ? (
          <>
            <button
              onClick={() => handleAction("approved")}
              disabled={executing}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {executing ? "Executing..." : "Approve & Execute"}
            </button>
            <button
              onClick={() => handleAction("rejected")}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        ) : (
          <span
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold border ${
              status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40"
            }`}
          >
            {status === "approved" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {status === "approved" ? "Executed in CRM" : "Rejected"}
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 1: Business Overview
// ─────────────────────────────────────────────────
const DashboardTab = ({ data, loading, onExecuteAction }) => {
  if (loading) return <LoadingState message="Analyzing company data and aggregating executive summary..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const raw = data.data?.analysisData || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 flex flex-col items-center justify-center shadow-xs">
          <HealthGauge
            score={result.businessHealthScore || 0}
            confidence={result.confidenceLevel || "High"}
          />
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-[#1268D9] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Executive Summary
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">{result.dataPeriod || "Last 30 Days"}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
              {result.summary || "No analysis available yet. Generate analysis to view insights."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-[#1C3554]/60">
            <div className="bg-slate-50 dark:bg-[#061225] p-3 rounded-xl">
              <p className="text-xl font-extrabold text-[#1268D9]">{raw.leadData?.totalLeads || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Total Leads</p>
            </div>
            <div className="bg-slate-50 dark:bg-[#061225] p-3 rounded-xl">
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {raw.leadData?.conversionRate || 0}%
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Lead Conversion</p>
            </div>
            <div className="bg-slate-50 dark:bg-[#061225] p-3 rounded-xl">
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {raw.leadData?.overdueFollowUpCount || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Overdue Follow-ups</p>
            </div>
            <div className="bg-slate-50 dark:bg-[#061225] p-3 rounded-xl">
              <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                {raw.taskData?.statusCounts?.overdue || 0}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Overdue Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Findings */}
      {result.keyFindings?.length > 0 && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#1268D9]" /> Key Operational Findings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.keyFindings.map((f, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-[#061225] border border-slate-200/60 dark:border-[#1C3554]/50 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="w-5 h-5 rounded-md bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ChevronRight className="w-3 h-3" />
                </div>
                <span className="leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations & Next Best Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {result.recommendations?.length > 0 && (
          <div className="lg:col-span-6 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> AI Strategic Recommendations
            </h3>
            <ul className="space-y-2.5">
              {result.recommendations.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-3 rounded-xl"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.nextBestActions?.length > 0 && (
          <div className="lg:col-span-6 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Next Best Actions (One-Click CRM Automation)
            </h3>
            <div className="space-y-2.5">
              {result.nextBestActions.map((a, i) => (
                <ActionCard key={i} action={a} index={i} onExecute={onExecuteAction} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 2: Problems & Root Cause Analysis
// ─────────────────────────────────────────────────
const ProblemDetectionTab = ({ data, loading, onExecuteAction, onApproveAction }) => {
  if (loading) return <LoadingState message="Performing deep root-cause diagnostic across lead, task, project and team modules..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const problems = result.problems || [];
  const actions = result.prioritizedActions || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Root Cause Diagnostics & Risk Analysis
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            {result.problemSummary || "Deep AI analysis of CRM operational bottlenecks and root cause classification."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-[#061225] border border-slate-200/80 dark:border-[#1C3554] px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Risk Score</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{result.businessRiskScore || 0}/100</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#061225] border border-slate-200/80 dark:border-[#1C3554] px-4 py-2 rounded-xl text-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Problems Detected</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{result.totalProblemsDetected || problems.length}</p>
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Immediate Corrective Actions (One-Click CRM Automation)
          </h3>
          <div className="space-y-2.5">
            {actions.map((act, i) => (
              <ActionCard key={i} action={act} index={i} onExecute={onExecuteAction} onApprove={onApproveAction} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {problems.map((prob, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-3.5 shadow-xs hover:border-[#1268D9]/40 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#1268D9] bg-[#1268D9]/10 px-2 py-0.5 rounded mr-1.5">
                  {prob.id || `P00${i + 1}`}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">{prob.category}</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{prob.problem}</h4>
              </div>
              <RiskBadge level={prob.riskLevel || "Medium"} />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{prob.description}</p>

            <div className="bg-slate-50 dark:bg-[#061225] rounded-xl p-3.5 space-y-2 text-xs border border-slate-200/60 dark:border-[#1C3554]/50">
              <div className="flex items-start gap-2">
                <span className="text-amber-700 dark:text-amber-400 font-semibold min-w-[85px]">Root Cause:</span>
                <span className="text-slate-700 dark:text-slate-200">
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1">
                    {prob.rootCauseLabel || "Cause"}
                  </span>
                  {prob.rootCauseExplanation}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-rose-700 dark:text-rose-400 font-semibold min-w-[85px]">Impact:</span>
                <span className="text-slate-600 dark:text-slate-300">{prob.businessImpact}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold min-w-[85px]">Fix Plan:</span>
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">{prob.recommendation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 3: Lead Intelligence & Predictive Scoring
// ─────────────────────────────────────────────────
const LeadIntelligenceTab = ({ data, loading, onExecuteAction }) => {
  if (loading) return <LoadingState message="Predictive AI is calculating lead intent, win probabilities, and buying signals..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const leads = result.scoredLeads || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-[#1268D9]">{result.pipelineQualityScore || 75}/100</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pipeline Quality Score</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
            <Flame className="w-5 h-5 text-rose-500" /> {result.hotLeadsCount || leads.filter(l => l.category === "Hot").length}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Hot Leads (Urgent)</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {result.warmLeadsCount || leads.filter(l => l.category === "Warm").length}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Warm Leads (Nurture)</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{result.revenueAtRisk || "₹0"}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Revenue At Risk</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-rose-500" /> Prioritized Lead Scoring & Win Probabilities
        </h3>

        {leads.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No active leads currently in evaluation queue.</p>
        ) : (
          <div className="space-y-3">
            {leads.map((ld, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-[#061225] border border-slate-200/60 dark:border-[#1C3554]/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ld.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ld.category === "Hot" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400" :
                      ld.category === "Warm" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400" :
                      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {ld.category} • Score {ld.score}/100
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {ld.winProbability}% Win Probability
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Touchpoint: <strong className="text-slate-700 dark:text-slate-300">{ld.recommendedNextTouchpoint}</strong></span>
                    <span>•</span>
                    <span>Assigned: {ld.assignedTo}</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onExecuteAction({
                      actionType: "schedule_followup",
                      title: `Follow up with ${ld.name}`,
                      description: ld.recommendedNextTouchpoint,
                      targetLeadId: ld.leadId,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1268D9] text-white rounded-lg hover:bg-[#082B52] transition-colors cursor-pointer self-end md:self-center flex-shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" /> Schedule Follow-up
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 4: Task Velocity & Overdue Diagnostics
// ─────────────────────────────────────────────────
const TaskIntelligenceTab = ({ data, loading, onExecuteAction }) => {
  if (loading) return <LoadingState message="Analyzing task completion velocity, overdue rates, and departmental bottlenecks..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const raw = data.data?.analysisData || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-[#1268D9]">{raw.totalTasks || 0}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total Live Tasks</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{raw.completionRate || 0}%</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Completion Rate</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{raw.overdueRate || 0}%</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Overdue Rate</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{raw.statusCounts?.pending || 0}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pending Tasks</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ListTodo className="w-4 h-4 text-[#1268D9]" /> Task Execution Summary & Bottleneck Solutions
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed mb-4">{result.summary || "Task performance baseline tracking active."}</p>

        {result.recommendations?.length > 0 && (
          <div className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-[#061225] p-3 rounded-xl border border-slate-200/60 dark:border-[#1C3554]/50">
                <span className="text-[#1268D9] font-bold">✓</span>
                <span className="text-slate-700 dark:text-slate-300">{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 5: Project Milestones & Delivery Health
// ─────────────────────────────────────────────────
const ProjectIntelligenceTab = ({ data, loading, onExecuteAction }) => {
  if (loading) return <LoadingState message="Analyzing company projects, delivery milestones, and client commitments..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const raw = data.data?.analysisData || {};
  const summaries = raw.projectSummaries || [];
  const alerts = result.criticalDeliveryAlerts || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-[#1268D9]">{result.deliveryHealthScore || 85}/100</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Delivery Health Score</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{raw.totalProjects || 0}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total Projects</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{raw.activeProjectsCount || 0}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active In-Progress</p>
        </div>
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{raw.overdueCount || 0}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Overdue / At Risk</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Critical Project Delivery Alerts
          </h3>
          <div className="space-y-2.5">
            {alerts.map((al, i) => (
              <div key={i} className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white font-bold">{al.projectName}</strong>
                  <span className="text-[10px] font-bold text-rose-600">{al.severity} Severity</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{al.issue}</p>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium"><strong>Recommended:</strong> {al.correctiveAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects List with Task Completion & Health */}
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <FolderKanban className="w-4 h-4 text-[#1268D9]" /> Project Milestone & Delivery Velocity Matrix
        </h3>

        {summaries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No project records found in database.</p>
        ) : (
          <div className="space-y-3">
            {summaries.map((p, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-[#061225] border border-slate-200/60 dark:border-[#1C3554]/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#1268D9]/10 text-[#1268D9] border border-[#1268D9]/30">
                      {p.status}
                    </span>
                    {p.isOverdue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                        Delayed
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Manager: <strong className="text-slate-700 dark:text-slate-300">{p.projectManager}</strong></span>
                    <span>•</span>
                    <span>Client: {p.clientName}</span>
                    <span>•</span>
                    <span>Tasks: {p.completedTasks}/{p.totalTasks} ({p.taskCompletionRate})</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onExecuteAction({
                      actionType: "create_task",
                      title: `Review milestone for project: ${p.name}`,
                      description: `Accelerate delivery and clear overdue tasks for ${p.name}`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1268D9] text-white rounded-lg hover:bg-[#082B52] transition-colors cursor-pointer self-end md:self-center flex-shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" /> Accelerate Delivery
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 6: AI Business Forecasting
// ─────────────────────────────────────────────────
const BusinessForecastingTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="AI predictive models are simulating sales trajectories and bottleneck horizons..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const sales = result.salesForecast || {};
  const pipeline = result.pipelineForecast || {};
  const velocity = result.operationalVelocity || {};
  const risks = result.projectedRisks || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 flex items-center justify-between shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1268D9]" /> 30 to 60-Day Business Forecasting Simulation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Horizon: {result.forecastHorizon || "Next 30-60 Days"} • Outlook: <strong className="text-[#1268D9]">{result.overallOutlook || "Stable"}</strong></p>
        </div>
        <span className="text-xs bg-[#1268D9]/10 text-[#1268D9] px-3 py-1 rounded-full font-bold border border-[#1268D9]/30">
          {result.confidenceLevel || "Medium"} Confidence
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Forecast */}
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-3 shadow-xs">
          <p className="text-xs font-bold text-[#1268D9] uppercase tracking-wider">💰 Revenue & Deals Forecast</p>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{sales.revenueRange || "₹50,000 - ₹1,50,000"}</p>
            <p className="text-xs text-slate-400 mt-0.5">Expected: {sales.expectedDeals || 0} Deals ({sales.minDeals || 0} min - {sales.maxDeals || 0} max)</p>
          </div>
          <div className="text-[11px] bg-slate-50 dark:bg-[#061225] p-2.5 rounded-lg border border-slate-200/60 dark:border-[#1C3554]/50">
            <span>Projected Conversion: <strong className="text-emerald-600 dark:text-emerald-400">{sales.projectedConversionRate || "0%"}</strong></span>
          </div>
        </div>

        {/* Pipeline Inflow Forecast */}
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-3 shadow-xs">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">🎯 Lead Pipeline Inflow</p>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{pipeline.expectedNewLeads || 0} Leads</p>
            <p className="text-xs text-slate-400 mt-0.5">Health: {pipeline.leadFlowHealth || "Stable"}</p>
          </div>
          <div className="text-[11px] bg-slate-50 dark:bg-[#061225] p-2.5 rounded-lg border border-slate-200/60 dark:border-[#1C3554]/50">
            <span>Top Growth Channel: <strong className="text-[#1268D9]">{pipeline.topGrowthChannel || "Referrals"}</strong></span>
          </div>
        </div>

        {/* Team Productivity Forecast */}
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-3 shadow-xs">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">⚡ Operational Velocity</p>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{velocity.projectedTaskCompletionRate || "85%"}</p>
            <p className="text-xs text-slate-400 mt-0.5">Trend: {velocity.productivityTrend || "Stable"}</p>
          </div>
          <div className="text-[11px] bg-slate-50 dark:bg-[#061225] p-2.5 rounded-lg border border-slate-200/60 dark:border-[#1C3554]/50">
            <span>Department: {velocity.departmentOutlook || "Execution on track"}</span>
          </div>
        </div>
      </div>

      {/* Projected Risks */}
      {risks.length > 0 && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Projected Business Risks & Prevention Levers
          </h3>
          <div className="space-y-2.5">
            {risks.map((r, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#061225] p-3.5 rounded-xl text-xs space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white">{r.risk}</strong>
                  <span className="text-[10px] text-rose-600 font-bold">{r.probability} Probability • {r.impact} Impact</span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-300"><strong>Prevention Strategy:</strong> {r.preventionStrategy}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 7: Continuous Improvement Loop
// ─────────────────────────────────────────────────
const TrainingEffectivenessTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="Measuring Continuous Improvement Loop (Manage → Measure → Analyze → Train → Grow)..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const loop = result.continuousImprovementLoop || {};
  const metrics = result.trainingUpliftMetrics || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1C3554]/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1268D9]" /> Continuous Improvement Loop
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage → Measure → Analyze → Identify Gaps → Train → Improve → Grow</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-full font-bold">
            Uplift: {result.improvementDelta || "+8.5%"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-[#061225] p-4 rounded-xl space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">1. काय सुधारले? (What improved?)</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{loop.whatImproved}</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#061225] p-4 rounded-xl space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
            <p className="text-xs font-bold text-[#1268D9]">2. का सुधारले? (Why did it improve?)</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{loop.whyImproved}</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#061225] p-4 rounded-xl space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">3. पुढील सुधारणा कुठे आवश्यक आहे? (Where needed?)</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{loop.whereImprovementNeeded}</p>
          </div>
          <div className="bg-slate-50 dark:bg-[#061225] p-4 rounded-xl space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400">4. पुढील महिन्यासाठी Action काय आहे? (Action plan)</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{loop.nextActions}</p>
          </div>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-[#1268D9]" /> Pre vs Post Training Skill Uplift
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.map((m, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#061225] p-3.5 rounded-xl text-xs space-y-1 border border-slate-200/60 dark:border-[#1C3554]/50">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 dark:text-white">{m.department}</strong>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{m.uplift}</span>
                </div>
                <p className="text-slate-500">{m.skillArea}</p>
                <p className="text-[11px] text-slate-400">Score: {m.preScore} → {m.postScore}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 8: Department Analysis
// ─────────────────────────────────────────────────
const DepartmentTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="Aggregating department productivity and cross-team dynamics..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const departments = result.departments || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-[#1268D9] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Building2 className="w-4 h-4" /> Department Performance Landscape
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">{result.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dept.name}</h4>
                <p className="text-[11px] text-slate-400">{dept.employeeCount || 0} Team Members</p>
              </div>
              <p className="text-base font-extrabold text-[#1268D9]">{dept.performanceScore || 0}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 9: Training Needs (TNA)
// ─────────────────────────────────────────────────
const TrainingNeedsTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="Generating Training Need Analysis (TNA) and skill matrices..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const profiles = result.employeeTrainingProfiles || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-[#1268D9]" /> Individual Training Profiles & Skill Diagnostics
        </h3>
        <div className="space-y-3">
          {profiles.map((emp, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-[#061225] border border-slate-200/60 dark:border-[#1C3554]/50 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{emp.name}</h4>
                  <p className="text-[11px] text-slate-400">{emp.designation} • {emp.department}</p>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Score: {emp.trainingPriorityScore}/100</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300"><strong>Root Cause:</strong> {emp.rootCause}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 10: 30-Day Growth Plan
// ─────────────────────────────────────────────────
const ImprovementPlanTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="Generating 30-day growth plan, milestone tracking, and quick wins..." />;
  if (!data) return null;

  const result = data.data?.result || {};
  const focusAreas = result.focusAreas || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          🚀 30-Day Growth & Performance Execution Roadmap
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">{result.planSummary}</p>
      </div>

      <div className="space-y-4">
        {focusAreas.map((fa, i) => (
          <div key={i} className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 space-y-2 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{fa.area}</h4>
            <p className="text-xs text-slate-400">Target: {fa.targetState}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 11: CEO Daily Briefing
// ─────────────────────────────────────────────────
const CEOReportTab = ({ data, loading }) => {
  if (loading) return <LoadingState message="Compiling executive briefing for the leadership team..." />;
  if (!data) return null;

  const result = data.data?.result || {};

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 flex items-center justify-between shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#1268D9]" /> CEO Executive Briefing
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{result.date || "Today"}</p>
        </div>
        <p className="text-2xl font-extrabold text-[#1268D9]">{result.businessHealthScore || 0}</p>
      </div>
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{result.executiveSummary}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// TAB 12: Ask AI
// ─────────────────────────────────────────────────
const AskBusinessTab = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const suggested = [
    "Why are my sales low?",
    "Which projects are delayed?",
    "Which employees need training?",
    "What are top priority leads?",
    "Which department has highest bottlenecks?",
    "What should the team focus on this week?",
  ];

  const handleAsk = async (q = question) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.post("ask-business", { question: q.trim() });
      setResult(data.data?.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold text-[#1268D9] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" /> Ask Your Business AI
        </h3>
        <div className="flex gap-2.5">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask anything about leads, tasks, projects, bottlenecks, or employees..."
            className="flex-1 bg-slate-50 dark:bg-[#061225] border border-slate-200 dark:border-[#1C3554] rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1268D9]"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="px-4 py-2.5 bg-[#1268D9] hover:bg-[#082B52] disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggested.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-[#1268D9]/10 text-slate-600 hover:text-[#1268D9] dark:bg-[#061225] dark:text-slate-300 dark:hover:bg-[#1268D9]/20 rounded-lg transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState message="AI is querying your CRM data to generate an informed answer..." />}

      {result && !loading && (
        <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="bg-[#1268D9]/5 dark:bg-[#1268D9]/10 border border-[#1268D9]/20 rounded-xl p-4">
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{result.answer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────
// MAIN COMPONENT: AI Business Intelligence & Action Engine (All 4 Phases)
// ─────────────────────────────────────────────────
export default function AIDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState({});
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const tabs = [
    { id: "dashboard", label: "Overview", Icon: Activity },
    { id: "problems", label: "Problems & Root Cause", Icon: ShieldAlert },
    { id: "leads", label: "Lead Intelligence", Icon: Flame },
    { id: "tasks", label: "Task Velocity", Icon: ListTodo },
    { id: "projects", label: "Project Delivery", Icon: FolderKanban },
    { id: "forecasting", label: "Business Forecasting", Icon: TrendingUp },
    { id: "effectiveness", label: "Continuous Improvement Loop", Icon: ShieldCheck },
    { id: "departments", label: "Department Analysis", Icon: Building2 },
    { id: "training", label: "Training Needs (TNA)", Icon: GraduationCap },
    { id: "growth_plan", label: "30-Day Growth Plan", Icon: Target },
    { id: "ceo", label: "CEO Report", Icon: Briefcase },
    { id: "ask", label: "Ask AI", Icon: MessageSquare },
  ];

  const fetchTab = async (tab, force = false) => {
    if (loading[tab]) return;
    if (data[tab] && !force) return;

    setLoading((p) => ({ ...p, [tab]: true }));
    setErrors((p) => ({ ...p, [tab]: null }));

    try {
      let result;
      const params = force ? { refresh: "true" } : {};

      switch (tab) {
        case "dashboard":
          result = await aiApi.get("dashboard-summary", params);
          break;
        case "problems":
          result = await aiApi.get("problem-detection", params);
          break;
        case "leads":
          result = await aiApi.get("lead-scoring", params);
          break;
        case "tasks":
          result = await aiApi.get("task-analysis", params);
          break;
        case "projects":
          result = await aiApi.get("project-analysis", params);
          break;
        case "forecasting":
          result = await aiApi.get("business-forecasting", params);
          break;
        case "effectiveness":
          result = await aiApi.get("training-effectiveness", params);
          break;
        case "departments":
          result = await aiApi.get("department-analysis", params);
          break;
        case "training":
          result = await aiApi.get("training-needs", params);
          break;
        case "growth_plan":
          result = await aiApi.get("improvement-plan", params);
          break;
        case "ceo":
          result = await aiApi.get("ceo-report", params);
          break;
        default:
          return;
      }

      setData((p) => ({ ...p, [tab]: result }));
    } catch (err) {
      setErrors((p) => ({ ...p, [tab]: err.message }));
    } finally {
      setLoading((p) => ({ ...p, [tab]: false }));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== "ask") fetchTab(tab);
  };

  const handleExecuteAction = async (actionData) => {
    return await aiApi.post("execute-action", actionData);
  };

  const handleApproveAction = async (index, actionStatus) => {
    try {
      await aiApi.post("approve-action", {
        actionId: `act_${Date.now()}_${index}`,
        actionStatus,
      });
    } catch (e) {
      console.warn("Action approved locally:", e.message);
    }
  };

  useEffect(() => {
    fetchTab("dashboard");
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner matching One Click Theme */}
      <div className="bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#1268D9]/10 text-[#1268D9] dark:bg-[#1268D9]/20 flex items-center justify-center flex-shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                AI Business Intelligence & Autonomous Action Engine
              </h1>
              <span className="text-[10px] font-bold bg-[#1268D9]/10 text-[#1268D9] dark:bg-[#1268D9]/20 px-2 py-0.5 rounded-full border border-[#1268D9]/30">
                PHASES 1, 2, 3 & 4 ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              One Click AI Growth CRM • Leads • Tasks • Projects Delivery • Predictive Forecasting • Action Automation
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchTab(activeTab, true)}
          disabled={loading[activeTab]}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#1268D9] hover:bg-[#082B52] text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading[activeTab] ? "animate-spin" : ""}`} />
          Refresh Analysis
        </button>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-[#1C3554] pb-0">
        <div className="flex gap-1.5 overflow-x-auto oc-scroll no-scrollbar pb-2">
          {tabs.map((t) => {
            const Icon = t.Icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-[#1268D9] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0D1B2E]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {loading[t.id] && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {errors[activeTab] && activeTab !== "ask" && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">{errors[activeTab]}</p>
          </div>
          <button
            onClick={() => fetchTab(activeTab, true)}
            className="text-xs px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab Views */}
      {activeTab === "dashboard" && (
        <DashboardTab data={data.dashboard} loading={loading.dashboard} onExecuteAction={handleExecuteAction} />
      )}
      {activeTab === "problems" && (
        <ProblemDetectionTab
          data={data.problems}
          loading={loading.problems}
          onExecuteAction={handleExecuteAction}
          onApproveAction={handleApproveAction}
        />
      )}
      {activeTab === "leads" && (
        <LeadIntelligenceTab
          data={data.leads}
          loading={loading.leads}
          onExecuteAction={handleExecuteAction}
        />
      )}
      {activeTab === "tasks" && (
        <TaskIntelligenceTab
          data={data.tasks}
          loading={loading.tasks}
          onExecuteAction={handleExecuteAction}
        />
      )}
      {activeTab === "projects" && (
        <ProjectIntelligenceTab
          data={data.projects}
          loading={loading.projects}
          onExecuteAction={handleExecuteAction}
        />
      )}
      {activeTab === "forecasting" && (
        <BusinessForecastingTab
          data={data.forecasting}
          loading={loading.forecasting}
        />
      )}
      {activeTab === "effectiveness" && (
        <TrainingEffectivenessTab
          data={data.effectiveness}
          loading={loading.effectiveness}
        />
      )}
      {activeTab === "departments" && (
        <DepartmentTab data={data.departments} loading={loading.departments} />
      )}
      {activeTab === "training" && (
        <TrainingNeedsTab data={data.training} loading={loading.training} />
      )}
      {activeTab === "growth_plan" && (
        <ImprovementPlanTab data={data.growth_plan} loading={loading.growth_plan} />
      )}
      {activeTab === "ceo" && (
        <CEOReportTab data={data.ceo} loading={loading.ceo} />
      )}
      {activeTab === "ask" && <AskBusinessTab />}
    </div>
  );
}
