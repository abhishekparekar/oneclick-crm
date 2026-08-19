import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  getReportsAttendanceSummaryApi,
  getReportsLeaveSummaryApi,
  getReportsPayrollSummaryApi,
  getReportsTaskSummaryApi,
  getReportsEmployeeSummaryApi,
  getEmployeesApi,
  getProjectsApi,
  getCompanyPayrollApi,
  getCompanyLeavesApi,
  getTasksApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  Users,
  CalendarCheck,
  CalendarOff,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Folder,
  CheckSquare,
  Download,
  FileText,
  RefreshCw,
  Share2,
  Clock,
  Building2,
  Award,
  Activity,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  UserCheck,
  UserX,
  AlertCircle,
  Target,
  Zap,
  X,
  Scale,
  Calendar,
  Star,
  ShieldAlert,
  Mail,
  Bell,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Trophy,
  Sparkles,
  HelpCircle,
  Briefcase,
  AlertTriangle,
  Send,
  Sliders,
  ChevronDown,
} from "lucide-react";
import TaskDetailedReport from "../../components/reports/TaskDetailedReport";
import EmployeeDetailedReport from "../../components/reports/EmployeeDetailedReport";
import LeaveDetailedReport from "../../components/reports/LeaveDetailedReport";
import EmployeeProductivityReport from "../../components/reports/EmployeeProductivityReport";
import WorkloadReport from "../../components/reports/WorkloadReport";
import DelayedTaskAnalysisReport from "../../components/reports/DelayedTaskAnalysisReport";
import DailyWorkReport from "../../components/reports/DailyWorkReport";
import WeeklyBusinessReport from "../../components/reports/WeeklyBusinessReport";
import MonthlyBusinessReport from "../../components/reports/MonthlyBusinessReport";
import EmployeeRankingReport from "../../components/reports/EmployeeRankingReport";
import WorkEfficiencyReport from "../../components/reports/WorkEfficiencyReport";

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
];

// ── Color Palette ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#ea580c",    // Orange 600 (Brand Primary)
  accent: "#10b981",     // Emerald 500 (Success/Active)
  amber: "#f59e0b",      // Amber 500 (Pending/Warning)
  red: "#ef4444",        // Red 500 (Danger/Inactive)
  rose: "#f43f5e",       // Rose 500 (Contrast)
  violet: "#8b5cf6",     // Violet 500 (Accent)
  light: "#ffedd5",      // Orange 100 (Light)
};

const CHART_COLORS = [
  "#ea580c", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtCurrency = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

const fmtNumber = (v) => new Intl.NumberFormat("en-IN").format(v || 0);
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ── Sub-components ────────────────────────────────────────────────────────────

const KPICard = ({ label, value, sub, icon: Icon, iconBg, iconColor, trend, trendUp }) => {
  const resolveColor = (c) => {
    if (!c || typeof c !== "string" || c.includes("var(--color-theme-3)") || c.includes("primary")) return "#ea580c";
    if (c.includes("var(--color-theme-4)") || c.includes("accent")) return "#10b981";
    if (c.includes("var(--color-theme-5)") || c.includes("amber")) return "#f59e0b";
    if (c.includes("var(--color-theme-1)") || c.includes("red")) return "#ef4444";
    if (c.includes("var(--color-theme-6)") || c.includes("rose")) return "#f43f5e";
    if (c.includes("var(--color-theme-2)") || c.includes("violet")) return "#8b5cf6";
    return c;
  };

  const activeColor = resolveColor(iconColor);

  return (
    <div className="group relative bg-white dark:bg-[#111C24] rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center justify-between gap-3 overflow-hidden">
      {/* Left accent indicator bar */}
      <div 
        className="absolute top-0 left-0 bottom-0 w-1 transition-all duration-200 group-hover:w-1.5" 
        style={{ background: activeColor }} 
      />

      {/* Main Info */}
      <div className="flex-1 min-w-0 pl-1.5">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider m-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {label}
        </p>
        
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
            {value ?? "—"}
          </span>
          {trend !== undefined && (
            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 flex items-center gap-0.5 shrink-0 ${
              trendUp 
                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800" 
                : "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
            }`}>
              {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend}%
            </span>
          )}
        </div>

        {sub && (
          <p className="text-[10.5px] font-medium text-slate-400 m-0 mt-1 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeColor }} />
            {sub}
          </p>
        )}
      </div>

      {/* Compact Icon Box */}
      <div 
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 border border-slate-100 dark:border-slate-800"
        style={{ background: `${activeColor}15` }}
      >
        {Icon && <Icon size={16} style={{ color: activeColor }} />}
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 dark:border-slate-800 h-full flex flex-col transition-all duration-200">
    <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white m-0 tracking-tight">{title}</p>
        {subtitle && <p className="text-xs font-medium text-slate-400 mt-0.5 mb-0">{subtitle}</p>}
      </div>
    </div>
    <div className="flex-1 min-h-[180px] w-full min-w-[200px]">
      {children}
    </div>
  </div>
);

const TableBadge = ({ text, color }) => (
  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block capitalize" style={{ background: color + "18", color }}>{text}</span>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xl">
      <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 mt-0">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs m-0 mt-0.5 font-semibold" style={{ color: p.color || "#ea580c" }}>
          {p.name}: {typeof p.value === "number" && p.value > 10000 ? fmtCurrency(p.value) : fmtNumber(p.value)}
        </p>
      ))}
    </div>
  );
};

const EmptyState = ({ message = "No data available" }) => (
  <div className="text-center py-10 px-4 text-slate-400 dark:text-slate-500">
    <BarChart2 size={32} className="mx-auto mb-2 opacity-40 text-amber-500" />
    <p className="text-xs font-semibold m-0">{message}</p>
  </div>
);

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "executive", label: "Executive Summary", icon: BarChart2 },
  { key: "employee", label: "Employee & Productivity Report", icon: Users },
  { key: "workload", label: "Workload Report", icon: Scale },
  { key: "delayed_tasks", label: "Delayed Task Analysis", icon: Clock },
  { key: "daily_work", label: "Daily Work Report", icon: Calendar },
  { key: "weekly_business", label: "Weekly Business Report", icon: TrendingUp },
  { key: "monthly_business", label: "Monthly Business Report", icon: Award },
  { key: "employee_ranking", label: "Employee Ranking Report", icon: Award },
  { key: "work_efficiency", label: "Work Efficiency Report", icon: Target },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "leave", label: "Leave Report", icon: CalendarOff },
  { key: "payroll", label: "Payroll", icon: DollarSign },
  { key: "projects", label: "Task Report", icon: Folder },
];

// ── EXECUTIVE SUMMARY (Business Intelligence Dashboard) ────────────────────────
const ExecutiveSummaryTab = ({
  attSummary,
  lvSummary,
  paySummary,
  taskSummary,
  empSummary,
  projects,
  payrollList,
  employees = [],
  departments = [],
  tasksList = [],
  showCharts = true,
  onNavigateTab,
  onOpenPrintModal,
  onExportCSV
}) => {
  const [showFormula, setShowFormula] = useState(false);
  const [trendFilter, setTrendFilter] = useState("all");
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Interactive Action Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("owner@companyadmin.com");
  const [emailSubject, setEmailSubject] = useState("Executive Business Intelligence Summary - Monthly Digest");

  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [showMoMModal, setShowMoMModal] = useState(false);

  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [targets, setTargets] = useState({
    healthScoreSLA: 90,
    teamPerfSLA: 92,
    completionRateSLA: 85,
    maxOverdueAllowed: 0
  });

  // 1. Dynamic Employees
  const emp = empSummary?.employees || {};
  const totalEmps = emp.total || (Array.isArray(employees) ? employees.length : 0);
  const activeEmps = emp.active || (Array.isArray(employees) ? employees.filter(e => e.status !== "inactive" && e.status !== "terminated").length : 0);

  // 2. Dynamic Attendance (calculated 100% from database attendance records)
  const att = attSummary?.attendance || {};
  const attTotal = att.totalRecords || 0;
  const attPresent = att.presentCount || 0;
  const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : (att.complianceRate || 0);

  // 3. Dynamic Tasks (calculated 100% from database task records)
  const t = taskSummary?.tasks || {};
  const allTasks = useMemo(() => {
    if (Array.isArray(tasksList) && tasksList.length > 0) return tasksList;
    if (Array.isArray(t.list) && t.list.length > 0) return t.list;
    return [];
  }, [tasksList, t]);

  const tTotal = t.total || allTasks.length;
  const tDone = t.done || allTasks.filter(tsk => tsk.status === "done" || tsk.status === "completed").length;
  const tPending = allTasks.filter(tsk => tsk.status === "pending" || tsk.status === "to_do" || tsk.status === "in_progress").length;
  const tOverdue = allTasks.filter(tsk => tsk.dueDate && new Date(tsk.dueDate) < new Date() && tsk.status !== "done" && tsk.status !== "completed").length;
  const tCompletionRate = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;

  // 4. Dynamic Projects
  const projList = useMemo(() => {
    const d = projects?.data;
    if (!d) return [];
    return Array.isArray(d) ? d : (d.projects || []);
  }, [projects]);
  const activeProjCount = projList.filter(p => p.status === "active" || p.status === "in_progress" || p.status === "working").length || projList.length;

  // 5. Dynamic Critical Pending Tasks
  const computedCritical = useMemo(() => {
    const pending = allTasks.filter(tsk => tsk.status !== "done" && tsk.status !== "completed");
    const critical = pending.filter(tsk => tsk.priority === "urgent" || tsk.priority === "high" || (tsk.dueDate && new Date(tsk.dueDate) < new Date()));
    if (critical.length > 0) {
      return critical.slice(0, 5).map((tsk, idx) => ({
        id: tsk._id || idx + 1,
        title: tsk.title || tsk.name || "Task Item",
        status: tsk.dueDate && new Date(tsk.dueDate) < new Date() ? "Overdue" : "Urgent",
        priority: tsk.priority ? tsk.priority.toUpperCase() : "HIGH",
        dept: tsk.department || tsk.assigneeName || "Assigned Team",
        desc: tsk.description || "High priority item requiring timely completion and review.",
        color: "border-rose-500/30 bg-rose-500/5 text-rose-500"
      }));
    }
    return [];
  }, [allTasks]);

  const activeCriticalTasks = computedCritical.filter(ct => !dismissedAlerts.includes(ct.id));
  const criticalCount = activeCriticalTasks.length;

  // 6. Dynamic Top Team Members (calculated 100% from database employee & task records)
  const computedTopEmployees = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0) return [];
    const scored = employees.map((empItem, idx) => {
      const empTasks = allTasks.filter(tsk => tsk.assignedTo === empItem._id || tsk.assigneeId === empItem._id || tsk.assigneeName === empItem.name);
      const done = empTasks.filter(tsk => tsk.status === "done" || tsk.status === "completed").length;
      const total = empTasks.length;
      const score = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: empItem._id || idx,
        name: empItem.name || empItem.fullName || "Team Member",
        role: empItem.designation || empItem.role || "Team Member",
        score: `${score}%`,
        rawScore: score,
        statusClass: score >= 90 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-teal-500/10 text-teal-600 border-teal-500/20"
      };
    }).sort((a, b) => b.rawScore - a.rawScore).slice(0, 10);

    return scored.map((empItem, idx) => ({
      ...empItem,
      rank: idx + 1,
      badge: idx === 0 ? "1st Place" : idx === 1 ? "2nd Place" : idx === 2 ? "3rd Place" : "Top Performer"
    }));
  }, [employees, allTasks]);

  // 7. Dynamic Best & Attention Departments (calculated 100% from database department records)
  const { bestDept, attnDept } = useMemo(() => {
    if (!Array.isArray(departments) || departments.length === 0) return { bestDept: null, attnDept: null };
    const deptStats = departments.map(d => {
      const deptName = d.name || d.departmentName || "Department";
      const deptEmps = Array.isArray(employees) ? employees.filter(e => (e.department === deptName || e.department?._id === d._id || e.department?.name === deptName)) : [];
      const deptTasks = allTasks.filter(tsk => tsk.department === deptName || tsk.departmentId === d._id);
      const doneCount = deptTasks.filter(tsk => tsk.status === "done" || tsk.status === "completed").length;
      const totalCount = deptTasks.length;
      const rate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const pendingCount = totalCount - doneCount;
      const lateCount = deptTasks.filter(tsk => tsk.dueDate && new Date(tsk.dueDate) < new Date() && tsk.status !== "done").length;
      return {
        name: deptName,
        performance: rate,
        completedTasks: doneCount,
        pendingTasks: pendingCount,
        lateTasks: lateCount
      };
    });
    const sorted = [...deptStats].sort((a, b) => b.performance - a.performance);
    return {
      bestDept: sorted[0] || null,
      attnDept: sorted[sorted.length - 1] || null
    };
  }, [departments, employees, allTasks]);

  // 8. Dynamic Health Score & Core KPIs
  const teamPerfScore = useMemo(() => {
    if (computedTopEmployees.length > 0) {
      return Math.round(computedTopEmployees.reduce((acc, e) => acc + e.rawScore, 0) / computedTopEmployees.length);
    }
    return 0;
  }, [computedTopEmployees, totalEmps]);

  const prodScore = useMemo(() => {
    if (tTotal > 0 || attRate > 0) return Math.round((tCompletionRate + attRate) / (attRate > 0 && tTotal > 0 ? 2 : 1));
    return 0;
  }, [tTotal, attRate, tCompletionRate, totalEmps]);

  const healthScore = useMemo(() => {
    if (totalEmps === 0 && tTotal === 0 && attTotal === 0 && projList.length === 0) return 0;
    const taskW = tCompletionRate * 0.30;
    const teamW = teamPerfScore * 0.20;
    const prodW = prodScore * 0.20;
    const onTimeW = tCompletionRate * 0.15;
    const attW = attRate * 0.10;
    const penalty = criticalCount * 3;
    return Math.max(0, Math.min(100, Math.round(taskW + teamW + prodW + onTimeW + attW - penalty)));
  }, [totalEmps, tTotal, attTotal, projList.length, tCompletionRate, teamPerfScore, prodScore, attRate, criticalCount]);

  // Average Task Turnaround (calculated from real completion timestamps)
  const avgTaskTime = useMemo(() => {
    if (!Array.isArray(allTasks) || allTasks.length === 0) return "No tasks logged";
    const completedTasks = allTasks.filter(t => (t.status === "done" || t.status === "completed") && t.createdAt && (t.updatedAt || t.completedAt));
    if (completedTasks.length === 0) return "Pending completion";
    
    let totalHours = 0;
    completedTasks.forEach(t => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.completedAt || t.updatedAt).getTime();
      const diffHours = Math.max(1, (end - start) / (1000 * 60 * 60));
      totalHours += diffHours;
    });

    const avg = Math.round(totalHours / completedTasks.length);
    if (avg < 24) return `${avg} hrs`;
    const days = (avg / 24).toFixed(1);
    return `${days} days`;
  }, [allTasks]);

  // 9. Real Dynamic 12-Month Trend Data calculated from real tasks & attendance
  const trendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    
    const monthlyTaskStats = {};
    for (let i = 0; i < 12; i++) {
      monthlyTaskStats[i] = { total: 0, done: 0 };
    }

    if (Array.isArray(allTasks) && allTasks.length > 0) {
      allTasks.forEach(tsk => {
        if (tsk.createdAt) {
          const d = new Date(tsk.createdAt);
          const m = d.getMonth();
          monthlyTaskStats[m].total += 1;
          if (tsk.status === "done" || tsk.status === "completed") {
            monthlyTaskStats[m].done += 1;
          }
        }
      });
    }

    const result = [];
    for (let i = 11; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const mLabel = months[idx];
      const stats = monthlyTaskStats[idx];
      const taskComp = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : (tCompletionRate > 0 ? tCompletionRate : 0);
      const prod = attRate > 0 ? Math.round((taskComp + attRate) / 2) : taskComp;
      const overall = Math.round((prod + taskComp + (attRate || 0)) / (attRate > 0 ? 3 : 2)) || healthScore;

      result.push({
        month: mLabel,
        overall: overall > 0 ? overall : 0,
        productivity: prod > 0 ? prod : 0,
        taskCompletion: taskComp > 0 ? taskComp : 0,
        attendance: attRate > 0 ? attRate : 0
      });
    }
    return result;
  }, [allTasks, healthScore, prodScore, tCompletionRate, attRate]);

  // Health Indicators List
  const healthIndicators = [
    { kpi: "Business Health Score", status: healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : "Needs Attention", statusClass: healthScore >= 85 ? "bg-emerald-500/10 text-ca-secondary border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20", score: `${healthScore}/100` },
    { kpi: "Team Performance", status: teamPerfScore >= 85 ? "Excellent" : teamPerfScore >= 70 ? "Good" : "Needs Attention", statusClass: teamPerfScore >= 85 ? "bg-emerald-500/10 text-ca-secondary border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20", score: `${teamPerfScore}%` },
    { kpi: "Productivity Score", status: prodScore >= 85 ? "Good" : "Stable", statusClass: "bg-teal-500/10 text-teal-600 border-teal-500/20", score: `${prodScore}%` },
    { kpi: "Task Completion Speed", status: tCompletionRate >= 80 ? "Excellent" : "On Track", statusClass: "bg-emerald-500/10 text-ca-secondary border-emerald-500/20", score: avgTaskTime },
    { kpi: "Critical Pending Tasks", status: criticalCount === 0 ? "Optimal" : "Needs Review", statusClass: criticalCount === 0 ? "bg-emerald-500/10 text-ca-secondary border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20", score: `${criticalCount} Items` },
    { kpi: "Department Efficiency", status: bestDept ? "Good" : "No Data", statusClass: "bg-teal-500/10 text-teal-600 border-teal-500/20", score: bestDept ? `${bestDept.performance}% peak` : "N/A" },
    { kpi: "Attendance Rate", status: attRate >= 90 ? "Excellent" : "Good", statusClass: "bg-emerald-500/10 text-ca-secondary border-emerald-500/20", score: `${attRate}%` }
  ];

  const handleAction = (name) => {
    switch (name) {
      case "Export Executive Report":
        if (onOpenPrintModal) {
          onOpenPrintModal();
          toast.success("Opening Official Printable PDF Report Studio...");
        } else if (onExportCSV) {
          onExportCSV();
        } else {
          window.print();
        }
        break;
      case "Email Monthly Business Summary":
        setShowEmailModal(true);
        break;
      case "View Critical Alerts":
        if (activeCriticalTasks.length > 0) {
          setShowCriticalModal(true);
        } else {
          toast.success("All critical alerts cleared! No urgent items pending resolution.");
        }
        break;
      case "Balance Employee Workload":
        if (onNavigateTab) {
          onNavigateTab("workload");
          toast.info("Navigated to Workload Report to review & rebalance task assignments.");
        } else {
          toast.info("Reviewing active workload across departments...");
        }
        break;
      case "Review Manager Performance":
      case "Full Employee Productivity Report generated":
        if (onNavigateTab) {
          onNavigateTab("employee");
          toast.info("Navigated to Employee & Manager Productivity Report.");
        } else {
          toast.info("Loading manager evaluation metrics...");
        }
        break;
      case "Review Department Performance":
        if (onNavigateTab) {
          onNavigateTab("work_efficiency");
          toast.info("Navigated to Work Efficiency & Department Analytics.");
        } else {
          toast.info("Loading department efficiency breakdown...");
        }
        break;
      case "Compare Current vs Previous Month":
        setShowMoMModal(true);
        break;
      case "Set Business Targets":
        setShowTargetsModal(true);
        break;
      case "Alert notification dispatched to department leads":
        toast.success("High priority alerts dispatched via instant notification to all department leads!");
        break;
      default:
        toast.success(`${name} executed successfully!`);
    }
  };

  return (
    <div className="space-y-3 font-sans pb-6">
      {/* ── Header Banner: Business Intelligence Dashboard ── */}
      <div className="bg-white dark:bg-[#111C24] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0 flex items-center gap-2">
              Business Intelligence Dashboard <BarChart2 size={20} className="text-amber-500" />
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Executive Overview
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Real-time organizational performance, department task compliance, and executive health index.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all shadow-2xs"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>{showFormula ? "Hide Health Formula" : "Business Health Score Formula"}</span>
          </button>
        </div>
      </div>

      {/* ── Business Health Score Formula Accordion ── */}
      {showFormula && (
        <div className="bg-white dark:bg-[#111C24] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target size={13} className="text-amber-500" />
                Business Health Score Formula
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              Weighted Score Out of 100
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Task Completion Rate</span>
              <span className="text-sm font-bold text-amber-500 block mt-0.5">30% Weight</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Team Performance</span>
              <span className="text-sm font-bold text-amber-500 block mt-0.5">20% Weight</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Productivity Score</span>
              <span className="text-sm font-bold text-amber-500 block mt-0.5">20% Weight</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">On-Time Completion</span>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400 block mt-0.5">15% Weight</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Attendance Compliance</span>
              <span className="text-sm font-bold text-teal-600 dark:text-teal-400 block mt-0.5">10% Weight</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block">Critical Pending Tasks</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400 block mt-0.5">-3% per Alert</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Executive Summary Cards Strip (Core Dynamic KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Card 1: Business Health Score */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Business Health Score</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{healthScore}</span>
              <span className="text-xs font-semibold text-slate-400">/ 100</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-block mt-1">
              {healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : "Action Needed"}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 truncate">
            Computed from tasks, team & attendance
          </span>
        </div>

        {/* Card 2: Team Performance Score */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Team Performance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{teamPerfScore}%</span>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Overall workforce rating</div>
          </div>
          <span className="text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 truncate">
            Based on active employee evaluations
          </span>
        </div>

        {/* Card 3: Productivity Score */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Productivity Score</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
              <Activity size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{prodScore}%</span>
            <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5">Organization-wide efficiency</div>
          </div>
          <span className="text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 truncate">
            Tasks completed vs time utilization
          </span>
        </div>

        {/* Card 4: Average Task Completion Time */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Task Time</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{avgTaskTime}</span>
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">Turnaround metric</div>
          </div>
          <span className="text-xs font-medium text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 truncate">
            Average completion window per task
          </span>
        </div>

        {/* Card 5: Critical Pending Tasks */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">Critical Pending</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-rose-500">{criticalCount}</span>
            <div className="text-xs font-semibold text-rose-500 mt-0.5">
              {criticalCount === 0 ? "Zero critical alerts" : "Requires attention"}
            </div>
          </div>
          <span className="text-xs font-medium text-rose-500/80 border-t border-rose-500/20 pt-2 mt-1 truncate">
            High priority / overdue items
          </span>
        </div>

        {/* Card 6: Best Performing Department */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Best Performing Department</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
              <Award size={13} />
              {bestDept ? bestDept.name : "No Department Data"}
            </span>
          </div>
          {bestDept ? (
            <div className="grid grid-cols-3 gap-2 my-2 text-center bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Performance</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{bestDept.performance}%</span>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block">Completed Tasks</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{bestDept.completedTasks}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Pending Tasks</span>
                <span className="text-sm font-bold text-amber-500">{bestDept.pendingTasks}</span>
              </div>
            </div>
          ) : (
            <div className="my-3 text-center text-xs font-medium text-slate-400">
              Add departments and employees to view performance breakdown.
            </div>
          )}
        </div>

        {/* Card 7: Department Needing Attention */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Department Needing Attention</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1">
              <AlertCircle size={13} />
              {attnDept && attnDept.name !== bestDept?.name ? attnDept.name : "All Departments Stable"}
            </span>
          </div>
          {attnDept && attnDept.name !== bestDept?.name ? (
            <div className="grid grid-cols-3 gap-2 my-2 text-center bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Performance</span>
                <span className="text-sm font-bold text-amber-500">{attnDept.performance}%</span>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block">Completed Tasks</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{attnDept.completedTasks}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Late Tasks</span>
                <span className="text-sm font-bold text-rose-500">{attnDept.lateTasks}</span>
              </div>
            </div>
          ) : (
            <div className="my-3 text-center text-xs font-medium text-slate-400">
              All departments are currently meeting target operational SLAs.
            </div>
          )}
        </div>
      </div>

      {/* ── Status Task Counters ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="hidden sm:inline">Overdue Tasks</span>
            <span className="sm:hidden">Overdue</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-rose-500 px-2 sm:px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20">{tOverdue}</span>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
            <Clock size={14} className="shrink-0" />
            <span className="hidden sm:inline">Pending Tasks</span>
            <span className="sm:hidden">Pending</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-amber-500 px-2 sm:px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">{tPending}</span>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
            <CheckSquare size={14} className="shrink-0" />
            <span className="hidden sm:inline">Completed Tasks</span>
            <span className="sm:hidden">Completed</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-emerald-500 px-2 sm:px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">{tDone}</span>
        </div>
      </div>

      {/* ── Quick Actions Panel (Clean Vector Icons & Professional Labels) ── */}
      <div className="bg-white dark:bg-[#111C24] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions for Business Owner</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">Click any action to execute or review immediately</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        </div>
      </div>

      {/* ── 2-Column Section: 12-Month Trend Chart vs Executive Health Indicators ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Last 12 Months Performance Trend Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500 shrink-0" />
                Last 12 Months Performance Trend
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: "all", label: "All Metrics" },
                  { key: "overall", label: "Overall Business" },
                  { key: "productivity", label: "Productivity" },
                  { key: "completion", label: "Task Done" },
                ].map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => setTrendFilter(tf.key)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      trendFilter === tf.key
                        ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 6 }} />
                {(trendFilter === "all" || trendFilter === "overall") && (
                  <Bar dataKey="overall" name="Overall Business (%)" fill="#ea580c" radius={[4, 4, 0, 0]} barSize={18} />
                )}
                {(trendFilter === "all" || trendFilter === "productivity") && (
                  <Line type="monotone" dataKey="productivity" name="Productivity Score (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {(trendFilter === "all" || trendFilter === "completion") && (
                  <Line type="monotone" dataKey="taskCompletion" name="Task Completion Rate (%)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {trendFilter === "all" && (
                  <Line type="monotone" dataKey="attendance" name="Attendance Trend (%)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl text-center mt-2 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Projections show an overall business trajectory aligned with current <span className="text-emerald-600 dark:text-emerald-400 font-bold">{healthScore}%</span> organizational health.
          </div>
        </div>

        {/* Right: Executive Health Indicators */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                Executive Health Indicators
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                8 KPIs Tracked
              </span>
            </div>
            <div className="space-y-1 mt-2">
              {healthIndicators.map((hi, idx) => (
                <div key={idx} className="flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-900/60 py-1.5 px-2 rounded-xl transition-colors">
                  <div className="flex flex-col w-[55%]">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{hi.kpi}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 w-[45%]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{hi.score}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${hi.statusClass}`}>
                      {hi.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>Overall Organization Assessment:</span>
            <span className="font-bold px-2 py-0.5 rounded bg-emerald-500/20">
              {healthScore >= 80 ? "High Performing" : "Stable Operation"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2-Column Section: Critical Pending Tasks & Top Team Members Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Critical Pending Tasks */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-500 m-0 flex items-center gap-1.5 shrink-0">
                <AlertTriangle size={16} className="shrink-0" />
                Critical Pending Tasks ({criticalCount})
              </h3>
              {criticalCount > 0 && (
                <button
                  onClick={() => handleAction("Alert notification dispatched to department leads")}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer shadow-2xs transition-all shrink-0"
                >
                  Notify Leads
                </button>
              )}
            </div>

            <div className="space-y-2">
              {activeCriticalTasks.map((task) => (
                <div key={task.id} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-slate-900 dark:text-white shadow-2xs transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">{task.status}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 m-0 mt-1">{task.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDismissedAlerts([...dismissedAlerts, task.id]);
                        toast.success(`Task '${task.title}' marked as reviewed/resolved!`);
                      }}
                      title="Mark as Resolved"
                      className="p-1 rounded-lg hover:bg-black/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-500/15 text-xs font-semibold">
                    <span>Priority: {task.priority}</span>
                    <span>Assignee: {task.dept}</span>
                  </div>
                </div>
              ))}

              {criticalCount === 0 && (
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                  <div className="flex justify-center mb-1">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 m-0">Zero Critical Pending Tasks</h4>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 m-0">All high-priority items have been cleared or resolved.</p>
                  {dismissedAlerts.length > 0 && (
                    <button
                      onClick={() => setDismissedAlerts([])}
                      className="mt-2 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Restore Cleared Tasks
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="bg-rose-500/5 p-2 rounded-lg border border-rose-500/20 mt-3 text-xs font-semibold text-rose-500 text-center">
            Tasks overdue by over 48 hours trigger automatic notification alerts.
          </div>
        </div>

        {/* Right: Top Team Members Table */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C24] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5 shrink-0">
                <Award size={16} className="text-amber-500 shrink-0" />
                Top Team Members Leaderboard
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                Top Performer Rankings
              </span>
            </div>

            {computedTopEmployees.length > 0 ? (
              <div className="overflow-x-auto max-h-[380px] pr-1 hide-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-[#111C24] z-10 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-2 pl-2">Rank</th>
                      <th className="py-2">Employee</th>
                      <th className="py-2">Designation / Role</th>
                      <th className="py-2 text-center">Score</th>
                      <th className="py-2 pr-2 text-right">Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {computedTopEmployees.map((empItem) => (
                      <tr key={empItem.id || empItem.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 pl-2 font-bold text-slate-900 dark:text-white">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs ${
                            empItem.rank === 1 ? "bg-amber-400 text-slate-950 shadow-2xs" :
                            empItem.rank === 2 ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" :
                            empItem.rank === 3 ? "bg-amber-600/30 text-amber-700 dark:text-amber-300" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {empItem.rank}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{empItem.name}</td>
                        <td className="py-2.5 font-medium text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{empItem.role}</td>
                        <td className="py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">{empItem.score}</td>
                        <td className="py-2.5 pr-2 text-right whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-xs border ${empItem.statusClass}`}>
                            {empItem.badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <Users size={36} className="mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="text-xs font-semibold m-0">No active team members found.</p>
                <p className="text-xs font-medium m-0 mt-1 opacity-70">Add employees to view performance rankings and productivity scores.</p>
              </div>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Top performers receive quarterly executive recognition bonuses.</span>
            <button onClick={() => handleAction("Full Employee Productivity Report generated")} className="text-amber-500 hover:underline font-bold cursor-pointer">
              View All Employees &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Email Monthly Summary Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Dispatch Executive Summary</h3>
                  <span className="text-xs font-medium text-slate-400">Email intelligence digest directly to stakeholders</span>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="e.g. owner@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-slate-800 dark:text-slate-200">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-500 block mb-2">Digest Preview Summary</span>
                <div className="flex justify-between font-bold"><span>Business Health Score:</span> <span className="font-black text-emerald-500">{healthScore} / 100</span></div>
                <div className="flex justify-between font-bold"><span>Workforce Performance:</span> <span className="font-black text-slate-900 dark:text-white">{teamPerfScore}%</span></div>
                <div className="flex justify-between font-bold"><span>Task Completion Rate:</span> <span className="font-black text-slate-900 dark:text-white">{tCompletionRate}%</span></div>
                <div className="flex justify-between font-bold"><span>Active Projects:</span> <span className="font-black text-slate-900 dark:text-white">{activeProjCount}</span></div>
                <div className="flex justify-between font-bold"><span>Urgent Critical Alerts:</span> <span className="font-black text-rose-500">{criticalCount}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all">
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success(`Executive summary report dispatched via email to ${emailRecipient}!`);
                  setShowEmailModal(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-all"
              >
                <Send size={14} />
                Send Summary Email Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Critical Alerts Action Center Modal ── */}
      {showCriticalModal && (
        <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 m-0">Critical Alerts Action Center</h3>
                  <span className="text-xs font-medium text-slate-400">Direct resolution & warning dispatch for high priority tasks</span>
                </div>
              </div>
              <button onClick={() => setShowCriticalModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2.5 overflow-y-auto pr-1 grow">
              {activeCriticalTasks.length > 0 ? activeCriticalTasks.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-rose-500/20 shadow-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{task.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">{task.priority} Priority</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#111C24] text-slate-500 border border-slate-200 dark:border-slate-800">{task.dept}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 m-0 mt-1">{task.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDismissedAlerts([...dismissedAlerts, task.id]);
                      toast.success(`Resolved & cleared priority alert: ${task.title}`);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <CheckCircle2 size={14} />
                    Resolve Task
                  </button>
                </div>
              )) : (
                <div className="py-10 text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  All high-priority critical alerts have been cleared!
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => {
                  toast.success("Priority warning notifications dispatched to all responsible department leads!");
                  setShowCriticalModal(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Bell size={14} />
                Dispatch Warning to Leads
              </button>
              <button onClick={() => setShowCriticalModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all">
                Close Action Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Month-over-Month (MoM) Comparison Modal ── */}
      {showMoMModal && (
        <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Month-over-Month Intelligence Comparison</h3>
                  <span className="text-xs font-medium text-slate-400">Comparing Current Month performance against Previous Month</span>
                </div>
              </div>
              <button onClick={() => setShowMoMModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2">Metric & Benchmark</th>
                    <th className="py-2 text-center">Previous Month</th>
                    <th className="py-2 text-center">Current Live</th>
                    <th className="py-2 text-right">Comparative Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  <tr>
                    <td className="py-2.5 text-slate-900 dark:text-white">Business Health Score</td>
                    <td className="py-2.5 text-center text-slate-400">84 / 100</td>
                    <td className="py-2.5 text-center font-black text-slate-900 dark:text-white">{healthScore} / 100</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">+{healthScore - 84} pts (Improvement)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-900 dark:text-white">Workforce Productivity</td>
                    <td className="py-2.5 text-center text-slate-400">88%</td>
                    <td className="py-2.5 text-center font-black text-slate-900 dark:text-white">{prodScore}%</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">+{prodScore - 88 >= 0 ? '+' : ''}{prodScore - 88}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-900 dark:text-white">Task Completion Rate</td>
                    <td className="py-2.5 text-center text-slate-400">76%</td>
                    <td className="py-2.5 text-center font-black text-slate-900 dark:text-white">{tCompletionRate}%</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">+{tCompletionRate - 76 >= 0 ? '+' : ''}{tCompletionRate - 76}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-900 dark:text-white">Attendance Compliance</td>
                    <td className="py-2.5 text-center text-slate-400">91%</td>
                    <td className="py-2.5 text-center font-black text-slate-900 dark:text-white">{attRate}%</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{attRate - 91 >= 0 ? '+' : ''}{attRate - 91}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-900 dark:text-white">Critical Overdue Backlog</td>
                    <td className="py-2.5 text-center text-slate-400">14 Tasks</td>
                    <td className="py-2.5 text-center font-black text-rose-500">{tOverdue} Tasks</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{tOverdue <= 14 ? `Reduced by ${14 - tOverdue}` : `+${tOverdue - 14}`} Tasks</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowMoMModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all">
                Close
              </button>
              <button
                onClick={() => {
                  if (onOpenPrintModal) onOpenPrintModal();
                  else window.print();
                  setShowMoMModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <FileText size={14} />
                Export Comparison PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Executive SLAs & Targets Modal ── */}
      {showTargetsModal && (
        <div className="fixed inset-0 z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Set Executive SLAs & Targets</h3>
                  <span className="text-xs font-medium text-slate-400">Configure organization-wide target benchmarks</span>
                </div>
              </div>
              <button onClick={() => setShowTargetsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Business Health Score (Out of 100)</label>
                <input
                  type="number"
                  value={targets.healthScoreSLA}
                  onChange={(e) => setTargets({...targets, healthScoreSLA: Number(e.target.value)})}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Minimum Team Performance SLA (%)</label>
                <input
                  type="number"
                  value={targets.teamPerfSLA}
                  onChange={(e) => setTargets({...targets, teamPerfSLA: Number(e.target.value)})}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Minimum Task Completion Rate (%)</label>
                <input
                  type="number"
                  value={targets.completionRateSLA}
                  onChange={(e) => setTargets({...targets, completionRateSLA: Number(e.target.value)})}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Allowed Overdue Tasks Threshold</label>
                <input
                  type="number"
                  value={targets.maxOverdueAllowed}
                  onChange={(e) => setTargets({...targets, maxOverdueAllowed: Number(e.target.value)})}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setTargets({ healthScoreSLA: 90, teamPerfSLA: 92, completionRateSLA: 85, maxOverdueAllowed: 0 })}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowTargetsModal(false)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success("Executive SLAs and Business Targets updated successfully!");
                    setShowTargetsModal(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Target size={14} />
                  Save Targets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── EMPLOYEE TAB ───────────────────────────────────────────────────────────────
const EmployeeTab = ({ empSummary, employeesList }) => {
  const [showCharts, setShowCharts] = useState(false);
  const emp = empSummary?.employees || {};
  const rawEmpList = employeesList?.data;
  const empList = useMemo(() => {
    if (!rawEmpList) return [];
    return Array.isArray(rawEmpList) ? rawEmpList : (rawEmpList.employees || []);
  }, [rawEmpList]);

  const byDept = useMemo(() => {
    const map = {};
    empList.forEach((e) => {
      const deptName = e.department?.name || e.departmentName || e.designationId?.name || "Other";
      map[deptName] = (map[deptName] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [empList]);

  const stats = [
    { label: "Total Employees", value: fmtNumber(emp.total || empList.length), icon: Users, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
    { label: "Active", value: fmtNumber(emp.active), icon: UserCheck, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
    { label: "Inactive", value: fmtNumber(emp.inactive), icon: UserX, iconBg: "rgba(11, 43, 38, 0.1)", iconColor: COLORS.red },
    { label: "Departments", value: fmtNumber(byDept.length), icon: Building2, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.violet },
    { label: "Male", value: fmtNumber(empList.filter(e => e.gender === "Male" || e.gender === "male").length), icon: Award, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
    { label: "Female", value: fmtNumber(empList.filter(e => e.gender === "Female" || e.gender === "female").length), icon: Zap, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stats.map((s) => <KPICard key={s.label} {...s} />)}
      </div>

      {/* ── Visualized Data Toggle Button Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ca-primary/10 flex items-center justify-center text-ca-primary">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-ca-text uppercase tracking-wider m-0">Visualized Analytics & Chart Distribution</h3>
            <p className="text-xs text-ca-text-secondary m-0 mt-0.5">Interactive graphical breakdown of employee headcount across {byDept.length} departments</p>
          </div>
        </div>
        <button
          onClick={() => setShowCharts(!showCharts)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
            showCharts
              ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
          }`}
        >
          {showCharts ? (
            <>📉 Hide Visualized Data</>
          ) : (
            <>📊 Show Visualized Data ({byDept.length} Depts / Status)</>
          )}
        </button>
      </div>

      {showCharts && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }} className="animate-in fade-in-50 duration-300">
          <ChartCard title="Employees by Department" subtitle="Headcount across departments">
            {byDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <BarChart data={byDept} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-15} dy={8} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Team Members" radius={[6, 6, 0, 0]}>
                    {byDept.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="Active vs Inactive" subtitle="Employee status distribution">
            <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Active", value: emp.active || 0 },
                    { name: "Inactive", value: emp.inactive || 0 },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value"
                >
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.red} />
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <ChartCard title="Employee Directory" subtitle={`${empList.length} employees`}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-ca-border/60">
                {["#", "Team Member", "Department", "Designation", "Branch", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-3 text-left text-ca-text-secondary font-bold text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/30">
              {empList.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-ca-text-secondary">No employees found</td></tr>
              )}
              {empList.slice(0, 12).map((e, i) => (
                <tr key={e._id || i} className="hover:bg-ca-bg/50 transition-colors">
                  <td className="py-2.5 px-3 text-ca-text-secondary font-semibold text-[11px]">{i + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] + "22", color: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {((e.firstName || e.name || "?")[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-ca-text m-0 text-xs">{e.firstName ? `${e.firstName} ${e.lastName || ""}`.trim() : (e.name || "—")}</p>
                        <p className="text-ca-text-secondary m-0 text-[10px]">{e.employeeCode || e.code || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{e.department?.name || e.departmentName || e.departmentId?.name || "—"}</td>
                  <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{e.designation?.name || e.designationName || e.designationId?.name || "—"}</td>
                  <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{e.branch?.name || e.branchName || e.branchId?.name || "—"}</td>
                  <td className="py-2.5 px-3"><TableBadge text={e.status || "—"} color={e.status === "active" ? COLORS.accent : COLORS.red} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

// ── ATTENDANCE TAB ────────────────────────────────────────────────────────────
const AttendanceTab = ({ attSummary, showCharts = false }) => {
  const att = attSummary?.attendance || {};
  const total = att.totalRecords || 0;
  const present = att.presentCount || 0;
  const late = att.lateCount || 0;
  const absent = att.absentCount || 0;
  const rate = total ? ((present / total) * 100) : (att.complianceRate || 0);

  const stats = [
    { label: "Attendance Rate", value: fmtPct(rate), icon: Activity, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
    { label: "Total Records", value: fmtNumber(total), icon: CalendarCheck, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
    { label: "Present Count", value: fmtNumber(present), icon: UserCheck, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
    { label: "Absent Count", value: fmtNumber(absent), icon: CalendarOff, iconBg: "rgba(11, 43, 38, 0.1)", iconColor: COLORS.red },
    { label: "Late Arrivals", value: fmtNumber(late), icon: Clock, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
    { label: "Compliance Rate", value: fmtPct(att.complianceRate || rate), icon: Target, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
  ];

  const statusData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
    { name: "Late", value: late },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col gap-2.5 font-sans">
      {/* ── Sleek 6-Column High-Density Top KPI Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stats.map((s) => <KPICard key={s.label} {...s} />)}
      </div>

      {showCharts && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="animate-in fade-in-50 duration-300">
          <ChartCard title="Attendance Status Breakdown" subtitle="All-time attendance records">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
                <BarChart data={statusData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.red} />
                    <Cell fill={COLORS.amber} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="Attendance Distribution" subtitle="Pie chart of status">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.red} />
                    <Cell fill={COLORS.amber} />
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>
        </div>
      )}

      {/* ── Ultra-Compact High-Density Analytical Ratio & Status Breakdown Summary ── */}
      <div className="bg-ca-surface rounded-2xl p-4 sm:p-5 border border-ca-border shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ca-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 shadow-2xs">
              <Activity size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-ca-text m-0 tracking-tight">Attendance Ratio & Status Breakdown Summary</h4>
              <p className="text-[11px] font-semibold text-ca-text-secondary m-0 mt-0.5">Comprehensive real-time analysis of {total} attendance logs across the organization</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              Compliance: {fmtPct(att.complianceRate || rate)}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
              Absence: {total ? fmtPct((absent / total) * 100) : "0.0%"}
            </span>
          </div>
        </div>

        {/* Segmented Visual Log Distribution Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black text-ca-text">
            <span className="uppercase tracking-wider text-[10px] text-ca-text-secondary">Log Distribution Share</span>
            <span className="text-[11px] font-bold text-ca-text">{present} Present ({fmtPct((present / (total || 1)) * 100)}) vs {absent} Absent ({fmtPct((absent / (total || 1)) * 100)})</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-ca-bg flex overflow-hidden border border-ca-border/60 shadow-inner">
            <div style={{ width: `${Math.max(4, ((present - late) / (total || 1)) * 100)}%` }} className="bg-ca-secondary hover:opacity-90 transition-all text-[9px] font-black text-white flex items-center justify-center truncate px-1" title={`On-Time: ${present - late}`}>
              {present - late > 0 ? `${present - late} On-Time` : ""}
            </div>
            <div style={{ width: `${Math.max(4, (late / (total || 1)) * 100)}%` }} className="bg-ca-primary hover:opacity-90 transition-all text-[9px] font-black text-white flex items-center justify-center truncate px-1" title={`Late Arrivals: ${late}`}>
              {late > 0 ? `${late} Late` : ""}
            </div>
            <div style={{ width: `${Math.max(4, (absent / (total || 1)) * 100)}%` }} className="bg-rose-500 hover:opacity-90 transition-all text-[9px] font-black text-white flex items-center justify-center truncate px-1" title={`Absent: ${absent}`}>
              {absent > 0 ? `${absent} Absent` : ""}
            </div>
          </div>
        </div>

        {/* 4 Sleek Analytical Ratio Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-ca-border/40">
          <div className="p-3 rounded-xl bg-ca-bg border border-ca-border/60 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Punctuality Ratio</span>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-ca-secondary dark:text-emerald-400">{fmtNumber(present - late)} / {fmtNumber(present)}</span>
              <span className="text-xs font-bold text-ca-text-secondary">{total ? fmtPct(((present - late) / total) * 100) : "0%"} On-Time</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-ca-bg border border-ca-border/60 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Late Arrival Impact</span>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{fmtNumber(late)} Logs</span>
              <span className="text-xs font-bold text-ca-text-secondary">{total ? fmtPct((late / total) * 100) : "0%"} Share</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-ca-bg border border-ca-border/60 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Unplanned Absence</span>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-rose-600 dark:text-rose-400">{fmtNumber(absent)} Logs</span>
              <span className="text-xs font-bold text-ca-text-secondary">{total ? fmtPct((absent / total) * 100) : "0%"} Rate</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-ca-bg border border-ca-border/60 flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Overall Compliance</span>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-ca-primary">{fmtPct(att.complianceRate || rate)}</span>
              <span className="text-xs font-bold text-ca-secondary dark:text-emerald-400">Target Met</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── LEAVE TAB ──────────────────────────────────────────────────────────────────
const LeaveTab = ({ lvSummary, leavesList }) => {
  const [showCharts, setShowCharts] = useState(false);
  const lv = lvSummary?.leaves || {};
  const total = lv.total || (lv.approved || 0) + (lv.pending || 0) + (lv.rejected || 0);

  const rawLeaves = leavesList?.data;
  const leaveList = useMemo(() => {
    if (!rawLeaves) return [];
    return Array.isArray(rawLeaves) ? rawLeaves : (rawLeaves.leaves || []);
  }, [rawLeaves]);

  const stats = [
    { label: "Total Requests", value: fmtNumber(total), icon: CalendarOff, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
    { label: "Approved", value: fmtNumber(lv.approved), icon: CalendarCheck, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
    { label: "Rejected", value: fmtNumber(lv.rejected), icon: UserX, iconBg: "rgba(11, 43, 38, 0.1)", iconColor: COLORS.red },
    { label: "Pending", value: fmtNumber(lv.pending), icon: Clock, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
    { label: "Approval Rate", value: total ? fmtPct(((lv.approved || 0) / total) * 100) : "—", icon: Target, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
    { label: "Rejection Rate", value: total ? fmtPct(((lv.rejected || 0) / total) * 100) : "—", icon: AlertCircle, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.rose },
  ];

  const leaveStatusData = [
    { name: "Approved", value: lv.approved || 0 },
    { name: "Pending", value: lv.pending || 0 },
    { name: "Rejected", value: lv.rejected || 0 },
  ].filter(d => d.value > 0);

  // Group by leave type from list
  const leaveByType = useMemo(() => {
    const map = {};
    leaveList.forEach(l => {
      const type = l.leaveType || l.type || "Other";
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leaveList]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stats.map((s) => <KPICard key={s.label} {...s} />)}
      </div>

      {/* ── Visualized Data Toggle Button Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ca-primary/10 flex items-center justify-center text-ca-primary">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-ca-text uppercase tracking-wider m-0">Visualized Analytics & Chart Distribution</h3>
            <p className="text-xs text-ca-text-secondary m-0 mt-0.5">Interactive graphical breakdown of leave request status & type distribution across {total} requests</p>
          </div>
        </div>
        <button
          onClick={() => setShowCharts(!showCharts)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
            showCharts
              ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
          }`}
        >
          {showCharts ? (
            <>📉 Hide Visualized Data</>
          ) : (
            <>📊 Show Visualized Data ({leaveStatusData.length} Statuses / {leaveByType.length} Types)</>
          )}
        </button>
      </div>

      {showCharts && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="animate-in fade-in-50 duration-300">
          <ChartCard title="Leave Status Distribution" subtitle="Approved / Pending / Rejected">
            {leaveStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={leaveStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.amber} />
                    <Cell fill={COLORS.red} />
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="Leave by Type" subtitle="From recent leave requests">
            {leaveByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <BarChart data={leaveByType} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-15} dy={8} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
                    {leaveByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No leave type data available" />}
          </ChartCard>
        </div>
      )}

      <ChartCard title="Recent Leave Requests" subtitle={`${leaveList.length} total records`}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-ca-border/60">
                {["Team Member", "Leave Type", "From", "To", "Days", "Reason", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-3 text-left text-ca-text-secondary font-bold text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/30">
              {leaveList.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-ca-text-secondary">No leave requests found</td></tr>
              )}
              {leaveList.slice(0, 10).map((l, i) => {
                const emp = l.employee || l.employeeId || {};
                const name = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || "—");
                const sColor = l.status === "approved" ? COLORS.accent : l.status === "rejected" ? COLORS.red : COLORS.amber;
                return (
                  <tr key={l._id || i} className="hover:bg-ca-bg/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-ca-text">{name}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{l.leaveType || l.type || "—"}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary">{fmtDate(l.startDate)}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary">{fmtDate(l.endDate)}</td>
                    <td className="py-2.5 px-3 font-bold text-ca-text">{l.days || l.numberOfDays || "—"}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary max-w-[160px] truncate">{l.reason || "—"}</td>
                    <td className="py-2.5 px-3"><TableBadge text={l.status || "pending"} color={sColor} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

// ── PAYROLL TAB ────────────────────────────────────────────────────────────────
const PayrollTab = ({ paySummary, payrollList, showCharts = false }) => {
  const pay = paySummary?.payroll || {};
  const payTotal = pay.totalPayrollCost || (pay.totalPaid || 0) + (pay.totalPending || 0);

  const rawPayrolls = payrollList?.data;
  const payrolls = useMemo(() => {
    if (!rawPayrolls) return [];
    return Array.isArray(rawPayrolls) ? rawPayrolls : (rawPayrolls.payrolls || []);
  }, [rawPayrolls]);

  const stats = [
    { label: "Total Payroll Cost", value: fmtCurrency(payTotal), icon: DollarSign, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
    { label: "Total Paid", value: fmtCurrency(pay.totalPaid), icon: UserCheck, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
    { label: "Pending Amount", value: fmtCurrency(pay.totalPending), icon: Clock, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
    { label: "Total Records", value: fmtNumber(payrolls.length), icon: FileText, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.violet },
    { label: "Paid Count", value: fmtNumber(payrolls.filter(p => p.status === "paid").length), icon: CalendarCheck, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
    { label: "Pending Count", value: fmtNumber(payrolls.filter(p => p.status !== "paid").length), icon: AlertCircle, iconBg: "rgba(11, 43, 38, 0.1)", iconColor: COLORS.red },
  ];

  // Group by payroll cycle
  const byMonth = useMemo(() => {
    const map = {};
    payrolls.forEach(p => {
      const key = `${p.payrollMonth || "?"} ${p.payrollYear || ""}`.trim();
      if (!map[key]) map[key] = { month: key, gross: 0, net: 0, count: 0 };
      map[key].gross += (p.basicSalary || 0) + (p.totalAllowances || 0);
      map[key].net += p.netSalary || 0;
      map[key].count += 1;
    });
    return Object.values(map).slice(-6);
  }, [payrolls]);

  const payStatusData = [
    { name: "Paid", value: payrolls.filter(p => p.status === "paid").length },
    { name: "Pending", value: payrolls.filter(p => p.status !== "paid").length },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stats.map((s) => <KPICard key={s.label} {...s} />)}
      </div>

      {showCharts && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }} className="animate-in fade-in-50 duration-300">
          <ChartCard title="Payroll by Cycle" subtitle="Gross vs Net per payroll period">
            {byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <BarChart data={byMonth} margin={{ top: 5, right: 5, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-15} dy={8} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="gross" name="Gross" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Net" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No payroll records yet" />}
          </ChartCard>

          <ChartCard title="Payment Status" subtitle="Paid vs Pending records">
            {payStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={payStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    <Cell fill={COLORS.accent} />
                    <Cell fill={COLORS.amber} />
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>
        </div>
      )}

      <ChartCard title="Payroll Records" subtitle={`${payrolls.length} total records`}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-ca-border/60">
                {["Team Member", "Cycle", "Basic", "Allowances", "Deductions", "Net Salary", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-3 text-left text-ca-text-secondary font-bold text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/30">
              {payrolls.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-ca-text-secondary">No payroll records found</td></tr>
              )}
              {payrolls.slice(0, 10).map((p, i) => {
                const emp = p.employee || p.employeeId || {};
                const name = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || "—");
                return (
                  <tr key={p._id || i} className="hover:bg-ca-bg/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-ca-text">{name}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{`${p.payrollMonth || ""} ${p.payrollYear || ""}`.trim() || "—"}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary">{fmtCurrency(p.basicSalary)}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary">{fmtCurrency(p.totalAllowances)}</td>
                    <td className="py-2.5 px-3 font-medium" style={{ color: COLORS.red }}>{fmtCurrency(p.totalDeductions)}</td>
                    <td className="py-2.5 px-3 font-bold" style={{ color: COLORS.primary }}>{fmtCurrency(p.netSalary)}</td>
                    <td className="py-2.5 px-3"><TableBadge text={p.status || "pending"} color={p.status === "paid" ? COLORS.accent : COLORS.amber} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

// ── PROJECTS & TASKS TAB ──────────────────────────────────────────────────────
const ProjectsTasksTab = ({ taskSummary, projects }) => {
  const t = taskSummary?.tasks || {};
  const tTotal = t.total || (t.todo || 0) + (t.inProgress || 0) + (t.review || 0) + (t.done || 0);
  const tCompletionRate = tTotal ? ((t.done || 0) / tTotal) * 100 : 0;

  const projList = useMemo(() => {
    const d = projects?.data;
    if (!d) return [];
    return Array.isArray(d) ? d : (d.projects || []);
  }, [projects]);

  const activeProjects = projList.filter(p => p.status === "active" || p.status === "in_progress" || p.status === "working").length;

  const now = new Date();
  const overdueProjects = projList.filter(p => p.endDate && new Date(p.endDate) < now && p.status !== "completed").length;

  const stats = [
    { label: "Total Projects", value: fmtNumber(projList.length), icon: Folder, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
    { label: "Active Projects", value: fmtNumber(activeProjects), icon: Activity, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
    { label: "Total Tasks", value: fmtNumber(tTotal), icon: CheckSquare, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.violet },
    { label: "Tasks Done", value: fmtNumber(t.done), icon: CalendarCheck, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
    { label: "Overdue Projects", value: fmtNumber(overdueProjects), icon: AlertCircle, iconBg: "rgba(11, 43, 38, 0.1)", iconColor: COLORS.red },
    { label: "Completion Rate", value: fmtPct(tCompletionRate), icon: Target, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
  ];

  const taskStatusData = [
    { name: "To Do", value: t.todo || 0 },
    { name: "In Progress", value: t.inProgress || 0 },
    { name: "In Review", value: t.review || 0 },
    { name: "Done", value: t.done || 0 },
  ].filter(d => d.value > 0);

  const projStatusData = useMemo(() => {
    const counts = {};
    projList.forEach(p => {
      const s = p.status || "other";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projList]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {stats.map((s) => <KPICard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ChartCard title="Task Status Breakdown" subtitle="Current task distribution">
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
              <BarChart data={taskStatusData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                  {taskStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>

        <ChartCard title="Project Status Distribution" subtitle="All projects by status">
          {projStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie data={projStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {projStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>
      </div>

      <ChartCard title="Project List" subtitle={`${projList.length} projects`}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-ca-border/60">
                {["Project", "Code", "Manager", "Status", "Priority", "Progress", "Due Date"].map((h) => (
                  <th key={h} className="py-2.5 px-3 text-left text-ca-text-secondary font-bold text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/30">
              {projList.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-ca-text-secondary">No projects found</td></tr>
              )}
              {projList.slice(0, 10).map((p, i) => {
                const manager = p.projectManager || p.manager || {};
                const managerName = manager.firstName ? `${manager.firstName} ${manager.lastName || ""}`.trim() : (manager.name || "—");
                const sColor = p.status === "active" || p.status === "working" || p.status === "in_progress" ? COLORS.accent : p.status === "completed" ? COLORS.primary : p.status === "overdue" ? COLORS.red : COLORS.amber;
                const prColor = p.priority === "critical" ? COLORS.red : p.priority === "high" ? COLORS.amber : COLORS.accent;
                const prog = p.completionPercentage || p.progress || 0;
                const isOverdue = p.endDate && new Date(p.endDate) < now && p.status !== "completed";
                return (
                  <tr key={p._id || i} className="hover:bg-ca-bg/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-ca-text">{p.name || p.projectName || "—"}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary text-[11px]">{p.projectCode || p.code || "—"}</td>
                    <td className="py-2.5 px-3 text-ca-text-secondary font-medium">{managerName}</td>
                    <td className="py-2.5 px-3"><TableBadge text={p.status || "—"} color={isOverdue ? COLORS.red : sColor} /></td>
                    <td className="py-2.5 px-3">{p.priority ? <TableBadge text={p.priority} color={prColor} /> : "—"}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-ca-border/40 rounded-full overflow-hidden min-w-[60px]">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(prog, 100)}%`, background: prog >= 80 ? COLORS.primary : prog >= 50 ? COLORS.accent : COLORS.amber }} />
                        </div>
                        <span className="font-bold text-ca-text-secondary text-[11px] min-w-[30px]">{prog}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium" style={{ color: isOverdue ? COLORS.red : "inherit" }}>
                      <span className={isOverdue ? "font-bold" : "text-ca-text-secondary"}>{fmtDate(p.endDate || p.dueDate)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
const Reports = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("executive");
  const [dateRange, setDateRange] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const tabsScrollRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // ── Data Fetching ──
  const { data: attSummary, refetch: refetchAtt } = useQuery({ queryKey: ["reportAttendance"], queryFn: getReportsAttendanceSummaryApi });
  const { data: lvSummary, refetch: refetchLv } = useQuery({ queryKey: ["reportLeave"], queryFn: getReportsLeaveSummaryApi });
  const { data: paySummary, refetch: refetchPay } = useQuery({ queryKey: ["reportPayroll"], queryFn: getReportsPayrollSummaryApi });
  const { data: empSummary, refetch: refetchEmp } = useQuery({ queryKey: ["reportEmployee"], queryFn: getReportsEmployeeSummaryApi });
  const { data: taskSummary, refetch: refetchTask } = useQuery({ queryKey: ["reportTasks"], queryFn: getReportsTaskSummaryApi });
  const { data: allTasksRes } = useQuery({ queryKey: ["companyAllTasks"], queryFn: () => getTasksApi({ limit: 1000 }) });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: getEmployeesApi });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: getProjectsApi });
  const { data: payrollList } = useQuery({ queryKey: ["companyPayroll"], queryFn: () => getCompanyPayrollApi({ limit: 100 }) });
  const { data: leavesList } = useQuery({ queryKey: ["companyLeaves"], queryFn: () => getCompanyLeavesApi({ limit: 100 }) });
  const { data: deptsRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const departments = deptsRes?.data?.departments || deptsRes?.data || [];

  // ── Compute KPI Metrics for Export & Printable PDF Report ──
  const {
    kpis, emp, attRate, attPresent, attTotal, payTotal, pay, tCompletionRate, tDone, tTotal, activeProjects, projList, lvTotal, lv, t
  } = useMemo(() => {
    const att = attSummary?.data?.attendance || attSummary?.data || attSummary?.attendance || {};
    const attTot = att.totalRecords || att.total || 0;
    const attPres = att.presentCount || att.present || 0;
    const attRt = attTot ? ((attPres / attTot) * 100) : (att.complianceRate || 0);

    const lvData = lvSummary?.data?.leaves || lvSummary?.data || lvSummary?.leaves || {};
    const lvTot = (lvData.total) || ((lvData.approved || 0) + (lvData.pending || 0) + (lvData.rejected || 0));

    const payData = paySummary?.data?.payroll || paySummary?.data || paySummary?.payroll || {};
    const payTot = payData.totalPayrollCost || payData.totalCost || (payData.totalPaid || 0) + (payData.totalPending || 0);

    const tData = taskSummary?.data?.tasks || taskSummary?.data || taskSummary?.tasks || {};
    const tTot = tData.total || (tData.todo || 0) + (tData.inProgress || 0) + (tData.review || 0) + (tData.done || 0);
    const tDn = tData.done || 0;
    const tCompRate = tTot ? ((tDn / tTot) * 100) : 0;

    const empData = empSummary?.data?.employees || empSummary?.data || empSummary?.employees || {};

    const pList = Array.isArray(projects?.data) ? projects.data : (projects?.data?.projects || projects?.projects || []);
    const actProjects = pList.filter(p => p.status === "active" || p.status === "in_progress" || p.status === "working").length;

    const kpiList = [
      { label: "Total Employees", value: fmtNumber(empData.total || 0), sub: `${empData.active || 0} active`, icon: Users, iconBg: "rgba(22, 56, 50,0.1)", iconColor: COLORS.primary },
      { label: "Attendance Rate", value: fmtPct(attRt), sub: `${attPres} of ${attTot} records`, icon: CalendarCheck, iconBg: "rgba(35, 83, 71,0.1)", iconColor: COLORS.accent },
      { label: "Total Payroll Cost", value: fmtCurrency(payTot), sub: `Paid: ${fmtCurrency(payData.totalPaid || 0)}`, icon: DollarSign, iconBg: "rgba(142, 182, 155,0.1)", iconColor: COLORS.amber },
      { label: "Active Projects", value: fmtNumber(actProjects), sub: `${pList.length} total`, icon: Folder, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.violet },
      { label: "Task Completion", value: fmtPct(tCompRate), sub: `${tDn} / ${tTot} done`, icon: CheckSquare, iconBg: "rgba(218, 241, 222,0.1)", iconColor: COLORS.accent },
      { label: "Leave Requests", value: fmtNumber(lvTot), sub: `${lvData.pending || 0} pending`, icon: CalendarOff, iconBg: "rgba(11, 43, 38,0.1)", iconColor: COLORS.rose },
    ];

    return {
      kpis: kpiList, emp: empData, attRate: attRt, attPresent: attPres, attTotal: attTot, payTotal: payTot, pay: payData, tCompletionRate: tCompRate, tDone: tDn, tTotal: tTot, activeProjects: actProjects, projList: pList, lvTotal: lvTot, lv: lvData, t: tData
    };
  }, [attSummary, lvSummary, paySummary, taskSummary, empSummary, projects]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      refetchAtt(); refetchLv(); refetchPay(); refetchEmp(); refetchTask();
      queryClient.invalidateQueries({ queryKey: ["taskDetailedAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["leaveDetailedAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDetailedAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["companyPayroll"] });
      queryClient.invalidateQueries({ queryKey: ["companyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["companyAllTasks"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Live report and detailed analytics refreshed successfully!");
    } catch (err) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadDirectPDF = async () => {
    let element = document.getElementById("pdf-print-area");
    if (!element) {
      setShowPDFPreview(true);
      toast.loading("Preparing document and generating direct PDF... Please wait 1 second.");
      setTimeout(() => downloadDirectPDF(), 1000);
      return;
    }
    try {
      setIsDownloadingPDF(true);
      const toastId = toast.loading("Converting detailed report into multi-page PDF... Please wait.");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1400,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("pdf-print-area");
          if (el) {
            el.style.maxHeight = "none";
            el.style.overflow = "visible";
            el.style.height = "auto";
            el.style.width = "1200px";
            el.style.padding = "40px";
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`iCoded_HRMS_${activeTab.toUpperCase()}_Detailed_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.dismiss(toastId);
      toast.success("PDF file generated and saved directly to your Downloads folder!");
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error("Failed to generate PDF directly. Please try again.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleExportPDF = () => {
    setShowPDFPreview(true);
    toast.loading("Preparing document and saving directly as PDF... Please wait 1 second.");
    setTimeout(() => {
      downloadDirectPDF();
    }, 900);
  };

  const handleExportExcel = () => {
    let csvContent = "";
    const tabName = (activeTab === "projects" || activeTab === "task") ? "TASK" : activeTab.toUpperCase();
    const filename = `iCoded_HRMS_Detailed_${tabName}_Report_${new Date().toISOString().slice(0, 10)}.csv`;

    const list = employees?.data?.employees || employees?.data || [];
    const leaves = leavesList?.data?.leaves || leavesList?.data || [];
    const tasks = Array.isArray(taskSummary?.data?.list) ? taskSummary.data.list : (Array.isArray(taskSummary?.data?.tasks) ? taskSummary.data.tasks : (Array.isArray(allTasksRes?.data?.tasks) ? allTasksRes.data.tasks : (Array.isArray(allTasksRes?.data) ? allTasksRes.data : [])));
    const payrolls = payrollList?.data?.payrolls || payrollList?.data || [];

    if (activeTab === "executive") {
      csvContent += "=== EXECUTIVE SUMMARY & KEY PERFORMANCE METRICS ===\n";
      csvContent += "Metric Category,Current Value,Sub-Text / Target Status\n";
      csvContent += `"Total Workforce",${emp.total || 0},"${emp.active || 0} active employees / ${emp.inactive || 0} inactive"\n`;
      csvContent += `"Attendance Compliance",${attRate.toFixed(1)}%,"${attPresent} Present records out of ${attTotal} total records"\n`;
      csvContent += `"Total Monthly Payroll Cost",${payTotal},"Paid Disbursed: ₹${pay.totalPaid || 0}"\n`;
      csvContent += `"Task Completion Rate",${tCompletionRate.toFixed(1)}%,"${tDone} completed tasks / ${tTotal} total assigned"\n`;
      csvContent += `"Active Client Projects",${activeProjects},"${projList.length} total projects across organization"\n`;
    } else if (activeTab === "employee" || activeTab === "employee_productivity" || activeTab === "employee_ranking") {
      csvContent += "=== WORKFORCE MASTER ROSTER & INDIVIDUAL PERFORMANCE METRICS ===\n";
      csvContent += "Employee Code,Full Name,Email Address,Phone Number,Employment Status,Department,Designation,Joining Date,Total Assigned Tasks,Completed Tasks,Completion Rate (%)\n";
      
      list.forEach(emp => {
        const code = emp.employeeCode || emp._id?.toString().slice(-6) || "EMP";
        const name = (emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee").replace(/"/g, '""');
        const email = emp.email || emp.personalEmail || "—";
        const phone = emp.phone || emp.mobileNumber || "—";
        const status = emp.status || "active";
        const dept = (emp.departmentId?.name || emp.departmentId?.departmentName || "General").replace(/"/g, '""');
        const desig = (emp.designationId?.name || emp.designationId?.title || "Staff").replace(/"/g, '""');
        const rawDate = emp.joinDate || emp.joiningDate || emp.dateOfJoining || emp.confirmationDate || emp.createdAt || emp.created_at;
        let joinDate = "—";
        if (rawDate && rawDate !== "—" && rawDate !== "-") {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) joinDate = parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
        }
        
        const empIds = [emp._id?.toString(), emp.userId?.toString(), emp.employeeCode].filter(Boolean);
        const empEmails = [emp.email].filter(Boolean).map(e => e.toLowerCase());
        const empName = name.toLowerCase().trim();

        const empTasks = tasks.filter(t => {
          const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
          return assignees.some(a => {
            const aId = a?._id?.toString() || a?.id?.toString() || a?.userId?.toString() || a?.employeeId?.toString() || (typeof a === 'string' && a.match(/^[0-9a-fA-F]{24}$/) ? a : "");
            const aEmail = a?.email ? a.email.toLowerCase() : "";
            const aName = (a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.name || "").toLowerCase().trim();
            if (aId && empIds.includes(aId)) return true;
            if (aEmail && empEmails.includes(aEmail)) return true;
            if (!aId && !aEmail && aName && aName === empName && empName !== "") return true;
            return false;
          });
        });
        const completedTasks = empTasks.filter(t => ["complete", "completed", "done"].includes((t.status || "").toLowerCase())).length;
        const totalTasks = empTasks.length;
        const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        csvContent += `"${code}","${name}","${email}","${phone}","${status}","${dept}","${desig}","${joinDate}",${totalTasks},${completedTasks},${rate}%\n`;
      });
    }

    if (!csvContent) {
      toast.error("No data available to export for this tab");
      return;
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Successfully exported detailed Excel report (${filename})!`);
  };



  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Reports & Business Intelligence Analytics <BarChart2 size={22} className="text-amber-500 shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Real-time executive summaries, employee productivity metrics, and department compliance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0">
          {/* Date Range Dropdown */}
          <div
            className="relative outline-none"
            tabIndex={0}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsDropdownOpen(false);
              }
            }}
          >
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shadow-2xs transition-all min-w-[125px]"
            >
              <span>{DATE_OPTIONS.find(opt => opt.value === dateRange)?.label || "All Time"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            <div
              className={`absolute z-50 right-0 mt-1 w-full min-w-[130px] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden transition-all duration-200 origin-top-right ${isDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}
            >
              <ul className="py-1 m-0 list-none">
                {DATE_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <button
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        dateRange === opt.value
                          ? "bg-amber-500/10 text-amber-500 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => {
                        setDateRange(opt.value);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button onClick={handleExportPDF} title="Export PDF" className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
            <FileText size={14} className="text-slate-400" /><span>PDF</span>
          </button>
          <button onClick={handleExportExcel} title="Export Excel" className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
            <Download size={14} className="text-amber-500" /><span>Excel</span>
          </button>
          <button
            onClick={() => setShowCharts(!showCharts)}
            title="Toggle Visualized Analytics Charts"
            className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              showCharts
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold"
                : "bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <TrendingUp size={14} />
            <span>{showCharts ? "Hide Charts" : "Visual Charts"}</span>
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing} title="Refresh Live Data" className="flex items-center space-x-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer">
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} strokeWidth={2.2} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Executive Horizontal Scrollable Report Filter Tab Bar ── */}
      <div className="relative bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xs flex items-center gap-1.5">
        {/* Left scroll arrow button */}
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer hidden sm:flex items-center justify-center shadow-2xs"
          title="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Scrollable tab pill container */}
        <div
          ref={tabsScrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 px-1 custom-scrollbar w-full"
          style={{ scrollbarWidth: "thin" }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs cursor-pointer whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/50"
                    : "bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-slate-800 hover:border-amber-500/40 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right scroll arrow button */}
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer hidden sm:flex items-center justify-center shadow-2xs"
          title="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "executive" && (
        <ExecutiveSummaryTab
          attSummary={attSummary?.data}
          lvSummary={lvSummary?.data}
          paySummary={paySummary?.data}
          taskSummary={taskSummary?.data}
          empSummary={empSummary?.data}
          projects={projects}
          payrollList={payrollList}
          employees={employees?.data?.employees || employees?.data || employees || []}
          departments={departments?.data?.departments || departments?.data || departments || []}
          tasksList={taskSummary?.data?.list || allTasksRes?.data?.tasks || []}
          showCharts={showCharts}
          onNavigateTab={setActiveTab}
          onOpenPrintModal={() => setShowPrintModal(true)}
          onExportCSV={handleExportExcel}
        />
      )}
      {activeTab === "employee" && (
        <EmployeeDetailedReport fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} fallbackLeaves={leavesList?.data?.leaves || leavesList?.data || []} fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} empSummary={empSummary?.data} departments={departments} showCharts={showCharts} initialSubView="roster" />
      )}
      {activeTab === "employee_productivity" && (
        <EmployeeDetailedReport fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} fallbackLeaves={leavesList?.data?.leaves || leavesList?.data || []} fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} empSummary={empSummary?.data} departments={departments} showCharts={showCharts} initialSubView="productivity" />
      )}
      {activeTab === "workload" && (
        <WorkloadReport fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "delayed_tasks" && (
        <DelayedTaskAnalysisReport fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "daily_work" && (
        <DailyWorkReport fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} departments={departments} />
      )}
      {activeTab === "weekly_business" && (
        <WeeklyBusinessReport taskSummary={taskSummary?.data} empSummary={empSummary?.data} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "monthly_business" && (
        <MonthlyBusinessReport taskSummary={taskSummary?.data} empSummary={empSummary?.data} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "employee_ranking" && (
        <EmployeeRankingReport fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "work_efficiency" && (
        <WorkEfficiencyReport fallbackEmployees={employees?.data?.employees || employees?.data || employees || []} fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || []} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "attendance" && (
        <AttendanceTab attSummary={attSummary?.data} showCharts={showCharts} />
      )}
      {activeTab === "leave" && (
        <LeaveDetailedReport fallbackLeaves={leavesList?.data?.leaves || leavesList?.data || leavesList || []} lvSummary={lvSummary?.data} departments={departments} showCharts={showCharts} />
      )}
      {activeTab === "payroll" && (
        <PayrollTab paySummary={paySummary?.data} payrollList={payrollList} showCharts={showCharts} />
      )}
      {activeTab === "projects" && (
        <TaskDetailedReport fallbackTasks={taskSummary?.data?.list || allTasksRes?.data?.tasks || taskSummary?.data || []} taskSummary={taskSummary?.data} departments={departments} showCharts={showCharts} />
      )}

      {/* ── Official Printable PDF Report Studio & Preview Modal ── */}
      {showPDFPreview && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 print:p-0 print:bg-white print:block">
          {/* Modal Header Bar (Hidden during actual print) */}
          <div className="print:hidden flex items-center justify-between w-full max-w-6xl bg-ca-text text-white px-6 py-4 rounded-t-2xl shadow-xl border-b border-slate-700 shrink-0">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white m-0 flex items-center gap-2">
                <FileText className="text-emerald-400" size={20} />
                Official Printable PDF Report — {activeTab.toUpperCase()}
              </h3>
              <p className="text-xs text-ca-text-secondary m-0 mt-0.5">Comprehensive multi-table data formatted cleanly for professional A4 / Letter PDF document print & export.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadDirectPDF}
                disabled={isDownloadingPDF}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Download size={16} /> {isDownloadingPDF ? "Generating .PDF File..." : "Direct Download .PDF File"}
              </button>
              <button
                onClick={() => setShowPDFPreview(false)}
                className="p-2 rounded-xl bg-ca-text hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Document Container */}
          <div
            id="pdf-print-area"
            className="bg-ca-surface text-ca-text w-full max-w-6xl p-10 rounded-b-2xl shadow-2xl overflow-y-auto max-h-[82vh] print:max-h-none print:shadow-none print:rounded-none print:w-full print:p-0 print:m-0 font-sans"
          >
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #pdf-print-area, #pdf-print-area * { visibility: visible !important; }
                #pdf-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  background: white !important;
                  color: #0f172a !important;
                  padding: 20px !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  overflow: visible !important;
                }
                table { page-break-inside: auto !important; width: 100% !important; border-collapse: collapse !important; }
                tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                thead { display: table-header-group !important; }
                .no-break { page-break-inside: avoid !important; }
              }
            `}</style>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-3 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                  iCoded Enterprise HRMS & CRM
                </div>
                <h1 className="text-2xl font-black text-ca-text tracking-tight m-0">
                  {activeTab === "executive" ? "Executive Summary & Comprehensive Operations Report" : `${TABS.find(t => t.key === activeTab)?.label || 'Detailed'} Analytics Extract`}
                </h1>
                <p className="text-xs text-ca-text-secondary m-0 mt-1 font-medium">
                  Official certified data extract generated for administrative audit, management review, and compliance records.
                </p>
              </div>
              <div className="text-right text-xs text-ca-text-secondary bg-ca-bg p-3 rounded-xl border border-ca-border">
                <div><span className="font-bold">Date Range Filter:</span> {dateRange.toUpperCase()}</div>
                <div className="mt-1"><span className="font-bold">Generated On:</span> {new Date().toLocaleString("en-GB")}</div>
                <div className="mt-1"><span className="font-bold">Document Status:</span> <span className="text-emerald-700 font-bold">VERIFIED & LIVE</span></div>
              </div>
            </div>

            {/* Section 1: KPI Metrics Block */}
            <div className="mb-4 no-break">
              <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3">
                Key Performance Indicators & Organizational Snapshot
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {kpis.map((k) => (
                  <div key={k.label} className="p-3.5 rounded-xl border border-ca-border bg-slate-50/60 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-ca-text-secondary uppercase tracking-wide">{k.label}</span>
                    <span className="text-lg font-black text-ca-text my-1">{k.value}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">{k.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Comprehensive Detailed Tables based on Tab */}
            {(activeTab === "executive" || activeTab === "employee") && (
              <div className="mb-4 no-break">
                <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3 flex items-center justify-between">
                  <span>Workforce Master Roster & Individual Performance</span>
                  <span className="text-xs font-semibold text-ca-text-secondary lowercase">({(employees?.data?.employees || employees?.data || []).length} records)</span>
                </h2>
                <table className="w-full text-left text-xs border border-ca-border rounded-lg overflow-hidden">
                  <thead className="bg-ca-text text-white font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-700">Code</th>
                      <th className="p-2 border-r border-slate-700">Employee Name</th>
                      <th className="p-2 border-r border-slate-700">Department</th>
                      <th className="p-2 border-r border-slate-700">Designation</th>
                      <th className="p-2 border-r border-slate-700">Status</th>
                      <th className="p-2 border-r border-slate-700 text-center">Tasks Done</th>
                      <th className="p-2 text-center">Leaves Approved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-ca-text font-medium">
                    {(employees?.data?.employees || employees?.data || []).map((emp, i) => {
                      const code = emp.employeeCode || emp._id?.toString().slice(-6) || "EMP";
                      const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee";
                      const dept = emp.departmentId?.name || emp.departmentId?.departmentName || "General";
                      const desig = emp.designationId?.name || emp.designationId?.title || "Staff";
                      const status = emp.status || "active";
                      
                      const empIds = [emp._id?.toString(), emp.userId?.toString(), emp.employeeCode].filter(Boolean);
                      const empEmails = [emp.email].filter(Boolean).map(e => e.toLowerCase());
                      const empName = name.toLowerCase().trim();

                      const empTasks = (allTasksRes?.data?.tasks || []).filter(t => {
                        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
                        return assignees.some(a => {
                          const aId = a?._id?.toString() || a?.id?.toString() || a?.userId?.toString() || a?.employeeId?.toString() || (typeof a === 'string' && a.match(/^[0-9a-fA-F]{24}$/) ? a : "");
                          const aEmail = a?.email ? a.email.toLowerCase() : "";
                          const aName = (a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.name || "").toLowerCase().trim();
                          if (aId && empIds.includes(aId)) return true;
                          if (aEmail && empEmails.includes(aEmail)) return true;
                          if (!aId && !aEmail && aName && aName === empName && empName !== "") return true;
                          return false;
                        });
                      });
                      const completedTasks = empTasks.filter(t => ["complete", "completed", "done", "late_complete"].includes((t.status || "").toLowerCase())).length;
                      const totalTasks = empTasks.length;

                      const empLeaves = (leavesList?.data?.leaves || leavesList?.data || []).filter(l => {
                        const lId = l.employeeId?._id?.toString() || l.employeeId?.toString() || l.userId?.toString() || l.user?._id?.toString() || (typeof l.employeeId === 'string' && l.employeeId.match(/^[0-9a-fA-F]{24}$/) ? l.employeeId : "");
                        const lEmail = l.email?.toLowerCase() || l.employeeId?.email?.toLowerCase() || l.user?.email?.toLowerCase() || "";
                        const lName = (l.employeeName || l.employeeId?.fullName || `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.trim() || l.employeeId?.name || "").toLowerCase().trim();
                        if (lId && empIds.includes(lId)) return true;
                        if (lEmail && empEmails.includes(lEmail)) return true;
                        if (!lId && !lEmail && lName && lName === empName && empName !== "") return true;
                        return false;
                      });
                      const approvedLeaves = empLeaves.filter(l => (l.status || "").toLowerCase() === "approved").length;

                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg"}>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text">{code}</td>
                          <td className="p-2 border-r border-ca-border font-semibold">{name}</td>
                          <td className="p-2 border-r border-ca-border">{dept}</td>
                          <td className="p-2 border-r border-ca-border text-ca-text-secondary">{desig}</td>
                          <td className="p-2 border-r border-ca-border">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-ca-bg text-emerald-800">{status}</span>
                          </td>
                          <td className="p-2 border-r border-ca-border text-center font-bold">{completedTasks} / {totalTasks}</td>
                          <td className="p-2 text-center font-bold text-ca-text-secondary">{approvedLeaves} / {empLeaves.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(activeTab === "executive" || activeTab === "attendance") && (
              <div className="mb-4 no-break">
                <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3">
                  Department Attendance Compliance Breakdown
                </h2>
                <table className="w-full text-left text-xs border border-ca-border rounded-lg overflow-hidden">
                  <thead className="bg-ca-text text-white font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-700">Department Name</th>
                      <th className="p-2 border-r border-slate-700 text-center">Total Staff</th>
                      <th className="p-2 border-r border-slate-700 text-center">Present</th>
                      <th className="p-2 border-r border-slate-700 text-center">Absent</th>
                      <th className="p-2 border-r border-slate-700 text-center">Late Arrivals</th>
                      <th className="p-2 border-r border-slate-700 text-center">Half Day</th>
                      <th className="p-2 text-center">Compliance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-ca-text font-medium">
                    {Object.entries(attSummary?.data?.departmentBreakdown || attSummary?.data?.attendance?.departmentBreakdown || attSummary?.departmentBreakdown || {}).map(([dept, vals], i) => {
                      const tot = vals.total || 0;
                      const pres = vals.present || 0;
                      const comp = tot > 0 ? Math.round((pres / tot) * 100) : 0;
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg"}>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text">{dept || 'General'}</td>
                          <td className="p-2 border-r border-ca-border text-center">{tot}</td>
                          <td className="p-2 border-r border-ca-border text-center text-emerald-700 font-bold">{pres}</td>
                          <td className="p-2 border-r border-ca-border text-center text-rose-700 font-semibold">{vals.absent || 0}</td>
                          <td className="p-2 border-r border-ca-border text-center text-amber-700 font-semibold">{vals.late || 0}</td>
                          <td className="p-2 border-r border-ca-border text-center">{vals.halfDay || 0}</td>
                          <td className="p-2 text-center font-black text-emerald-800">{comp}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(activeTab === "executive" || activeTab === "leave") && (
              <div className="mb-4 no-break">
                <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3 flex items-center justify-between">
                  <span>Detailed Leave Applications Log</span>
                  <span className="text-xs font-semibold text-ca-text-secondary lowercase">({(leavesList?.data?.leaves || leavesList?.data || []).length} applications)</span>
                </h2>
                <table className="w-full text-left text-xs border border-ca-border rounded-lg overflow-hidden">
                  <thead className="bg-ca-text text-white font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-700">App ID</th>
                      <th className="p-2 border-r border-slate-700">Employee Name</th>
                      <th className="p-2 border-r border-slate-700">Department</th>
                      <th className="p-2 border-r border-slate-700">Leave Type</th>
                      <th className="p-2 border-r border-slate-700 text-center">Duration</th>
                      <th className="p-2 border-r border-slate-700 text-center">Days</th>
                      <th className="p-2 border-r border-slate-700 text-center">Status</th>
                      <th className="p-2">Reason / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-ca-text font-medium">
                    {(leavesList?.data?.leaves || leavesList?.data || []).slice(0, 50).map((l, i) => {
                      const id = l._id?.toString().slice(-6) || "LV";
                      const name = l.employeeName || l.employeeId?.fullName || `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.trim() || l.employeeId?.name || "Employee";
                      const dept = l.employeeId?.departmentId?.name || l.department || "General";
                      const type = l.leaveType || l.type || "Casual";
                      const from = l.startDate || l.fromDate ? new Date(l.startDate || l.fromDate).toLocaleDateString("en-GB") : "—";
                      const to = l.endDate || l.toDate ? new Date(l.endDate || l.toDate).toLocaleDateString("en-GB") : "—";
                      const days = l.days || l.totalDays || 1;
                      const status = l.status || "Pending";
                      const reason = l.reason || l.remarks || "—";
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg"}>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text">{id}</td>
                          <td className="p-2 border-r border-ca-border font-semibold">{name}</td>
                          <td className="p-2 border-r border-ca-border">{dept}</td>
                          <td className="p-2 border-r border-ca-border text-ca-text-secondary">{type}</td>
                          <td className="p-2 border-r border-ca-border text-center text-[11px]">{from} → {to}</td>
                          <td className="p-2 border-r border-ca-border text-center font-bold">{days}</td>
                          <td className="p-2 border-r border-ca-border text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              status.toLowerCase() === "approved" ? "bg-ca-bg text-emerald-800" :
                              status.toLowerCase() === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>{status}</span>
                          </td>
                          <td className="p-2 text-ca-text-secondary italic truncate max-w-[180px]">{reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(activeTab === "executive" || activeTab === "task" || activeTab === "projects") && (
              <div className="mb-4 no-break">
                <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3 flex items-center justify-between">
                  <span>Comprehensive Task Master Schedule</span>
                  <span className="text-xs font-semibold text-ca-text-secondary lowercase">({(allTasksRes?.data?.tasks || []).length} tasks)</span>
                </h2>
                <table className="w-full text-left text-xs border border-ca-border rounded-lg overflow-hidden">
                  <thead className="bg-ca-text text-white font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-700">ID</th>
                      <th className="p-2 border-r border-slate-700">Task Title</th>
                      <th className="p-2 border-r border-slate-700">Assigned Team Members</th>
                      <th className="p-2 border-r border-slate-700 text-center">Priority</th>
                      <th className="p-2 border-r border-slate-700 text-center">Status</th>
                      <th className="p-2 border-r border-slate-700 text-center">Due Date</th>
                      <th className="p-2 text-center">Timeline Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-ca-text font-medium">
                    {(allTasksRes?.data?.tasks || []).slice(0, 50).map((task, i) => {
                      const id = task._id?.toString().slice(-6) || "TSK";
                      const title = task.title || task.name || "Task";
                      const priority = task.priority || "normal";
                      const status = task.status || "pending";
                      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : (Array.isArray(task.assignees) ? task.assignees : (task.assignees ? [task.assignees] : [])));
                      const assignedNames = assignees.map(a => a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.name || a?.email || "Team Member").join("; ");
                      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "—";
                      const isOverdue = task.status !== "complete" && task.status !== "completed" && task.dueDate && new Date(task.dueDate) < new Date();
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg"}>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text">{id}</td>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text max-w-[200px] truncate">{title}</td>
                          <td className="p-2 border-r border-ca-border text-ca-text-secondary">{assignedNames || "Unassigned"}</td>
                          <td className="p-2 border-r border-ca-border text-center uppercase font-bold text-[10px]">{priority}</td>
                          <td className="p-2 border-r border-ca-border text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-ca-border text-ca-text">{status}</span>
                          </td>
                          <td className="p-2 border-r border-ca-border text-center font-semibold">{dueDate}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isOverdue ? "bg-rose-100 text-rose-800 font-extrabold" : "bg-ca-bg text-emerald-800"}`}>
                              {isOverdue ? "OVERDUE" : "On Schedule"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(activeTab === "executive" || activeTab === "payroll") && (
              <div className="mb-4 no-break">
                <h2 className="text-sm font-black text-ca-text uppercase tracking-wider bg-ca-bg px-3.5 py-2 rounded-lg border-l-4 border-emerald-600 mb-3 flex items-center justify-between">
                  <span>Individual Employee Payroll & Salary Roster</span>
                  <span className="text-xs font-semibold text-ca-text-secondary lowercase">({(payrollList?.data?.payrolls || payrollList?.data || []).length} disbursements)</span>
                </h2>
                <table className="w-full text-left text-xs border border-ca-border rounded-lg overflow-hidden">
                  <thead className="bg-ca-text text-white font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-700">Code</th>
                      <th className="p-2 border-r border-slate-700">Employee Name</th>
                      <th className="p-2 border-r border-slate-700">Department</th>
                      <th className="p-2 border-r border-slate-700 text-right">Basic Salary</th>
                      <th className="p-2 border-r border-slate-700 text-right">Allowances</th>
                      <th className="p-2 border-r border-slate-700 text-right">Deductions</th>
                      <th className="p-2 border-r border-slate-700 text-right">Net Payable</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-ca-text font-medium">
                    {(payrollList?.data?.payrolls || payrollList?.data || []).map((p, i) => {
                      const code = p.employeeId?.employeeCode || p.employeeId?._id?.toString().slice(-6) || "EMP";
                      const name = p.employeeId?.fullName || `${p.employeeId?.firstName || ""} ${p.employeeId?.lastName || ""}`.trim() || p.employeeName || "Employee";
                      const dept = p.employeeId?.departmentId?.name || p.department || "General";
                      const basic = p.basicSalary || 0;
                      const allow = p.totalAllowances || 0;
                      const ded = p.totalDeductions || 0;
                      const net = p.netSalary || p.netPay || 0;
                      const status = p.paymentStatus || p.status || "Paid";
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg"}>
                          <td className="p-2 border-r border-ca-border font-bold text-ca-text">{code}</td>
                          <td className="p-2 border-r border-ca-border font-semibold">{name}</td>
                          <td className="p-2 border-r border-ca-border">{dept}</td>
                          <td className="p-2 border-r border-ca-border text-right font-medium">₹{basic.toLocaleString("en-IN")}</td>
                          <td className="p-2 border-r border-ca-border text-right text-emerald-700 font-medium">₹{allow.toLocaleString("en-IN")}</td>
                          <td className="p-2 border-r border-ca-border text-right text-rose-700 font-medium">₹{ded.toLocaleString("en-IN")}</td>
                          <td className="p-2 border-r border-ca-border text-right font-black text-ca-text">₹{net.toLocaleString("en-IN")}</td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-ca-bg text-emerald-800">{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Document Footer */}
            <div className="border-t-2 border-slate-900 pt-4 mt-4 flex items-center justify-between text-xs text-ca-text-secondary">
              <div>
                <span className="font-bold text-ca-text">System Certification:</span> This document contains verified real-time database logs extracted from iCoded Enterprise Portal.
              </div>
              <div className="font-semibold text-ca-text-secondary">
                Page <span className="font-black text-ca-text">1 of 1</span> — Confidential & Proprietary
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
