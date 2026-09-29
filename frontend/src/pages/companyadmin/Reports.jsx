import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import {
  getBIExecutiveReportApi,
  getBIWorkforceReportApi,
  getBIAttendanceReportApi,
  getBILeaveReportApi,
  getBITaskReportApi,
  getBILeadReportApi,
  getBIProjectReportApi,
  getBIPerformanceReportApi,
  getBIAuditReportApi,
  getBIEmployeeDrillDownApi,
  getBIDepartmentDrillDownApi,
  getDepartmentsApi,
  getBranchesApi,
  getEmployeesApi,
} from "../../api/companyAdminApi";
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  BarChart2, Users, CalendarCheck, CalendarOff,
  TrendingUp, TrendingDown, CheckSquare, Download,
  RefreshCw, Building2, Award, ChevronRight, AlertCircle,
  Clock, Target, Sparkles, CheckCircle2, ShieldCheck,
  Search, ArrowUp, ArrowDown, Activity, Printer,
  Sliders, X, User, AlertTriangle, Check,
  PhoneCall, FolderKanban, DollarSign, Layers,
  Lock, HelpCircle, ExternalLink, RotateCcw,
  Zap, Scale, Timer, CheckCheck,
  Briefcase, ThumbsUp, ThumbsDown, Flame, UserCheck, UserX,
  Trophy
} from "lucide-react";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const THEME = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  emerald: "#10b981",
  rose: "#f43f5e",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
};

const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#f43f5e", "#ec4899", "#84cc16"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNumber = (v) => {
  if (v === null || v === undefined) return "0";
  if (typeof v === "object") {
    if (v.current !== undefined) return fmtNumber(v.current);
    if (v.value !== undefined) return fmtNumber(v.value);
    if (v.total !== undefined) return fmtNumber(v.total);
    if (v.count !== undefined) return fmtNumber(v.count);
    return "0";
  }
  if (typeof v === "string") {
    if (v.startsWith("₹") || v.includes(",") || isNaN(Number(v))) return v;
    v = Number(v);
  }
  if (isNaN(v)) return "0";
  return new Intl.NumberFormat("en-IN").format(v || 0);
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    const hours = String(dt.getHours()).padStart(2, "0");
    const mins = String(dt.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return String(d);
  }
};

// ── Custom Tooltip for Recharts ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-sans">
      <p className="font-black text-white mb-1.5 border-b border-slate-700/60 pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-[11px] font-semibold py-0.5" style={{ color: p.color || THEME.amber }}>
          <span>{p.name}:</span>
          <span className="font-mono font-bold text-white">{fmtNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Executive KPI Card with Modern Premium Aesthetics ────────────────────────
const KPICard = ({ label, metric, sub, icon: Icon, color = THEME.amber, isPercentage = false, isCurrency = false, isUp }) => {
  let current = 0;
  let previous;
  let pctChange = 0;
  let trendIsUp = isUp !== undefined ? isUp : true;

  if (metric !== null && metric !== undefined) {
    if (typeof metric === "object") {
      current = metric.current ?? metric.value ?? metric.total ?? metric.count ?? 0;
      previous = metric.previous;
      pctChange = metric.percentageChange ?? 0;
      if (metric.isUp !== undefined) trendIsUp = metric.isUp;
    } else {
      current = metric;
    }
  }
  if (typeof current === "object") current = 0;

  let displayValue;
  if (isPercentage) {
    const num = Number(current);
    displayValue = !isNaN(num) ? `${Math.round(num)}%` : `${current}`;
    if (!String(displayValue).endsWith("%")) displayValue += "%";
  } else if (isCurrency) {
    if (typeof current === "string" && current.startsWith("₹")) {
      displayValue = current;
    } else {
      displayValue = `₹${fmtNumber(current)}`;
    }
  } else {
    displayValue = fmtNumber(current);
  }

  // Only show delta badge if there is a legitimate percentage change and previous is non-zero
  const showDelta = pctChange > 0 && previous !== undefined && previous !== 0 && !isNaN(pctChange);

  return (
    <div className="group relative bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-2.5 sm:p-3 shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between gap-2.5 overflow-hidden">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate font-mono">
            {displayValue}
          </span>
          {showDelta && (
            <span className={`text-[9px] font-black flex items-center gap-0.5 px-1 py-0.5 rounded ${trendIsUp ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
              {trendIsUp ? <ArrowUp size={8} strokeWidth={3} /> : <ArrowDown size={8} strokeWidth={3} />}
              {Math.round(pctChange)}%
            </span>
          )}
        </div>
        {sub && (
          <p className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
            {sub}
          </p>
        )}
      </div>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {Icon ? <Icon size={16} strokeWidth={2.2} /> : null}
      </div>
    </div>
  );
};

// ── Chart Wrapper Card ────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, action, children }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col h-full">
    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80 gap-2">
      <div>
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="flex-1 min-h-[200px] w-full">{children}</div>
  </div>
);

// ── Empty State Component ─────────────────────────────────────────────────────
const EmptyState = ({ message = "No reporting data available for the selected period.", onReset }) => (
  <div className="text-center py-12 px-4 text-slate-400 dark:text-slate-500 bg-white dark:bg-[#111C24] rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-2">
    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
      <BarChart2 size={24} />
    </div>
    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{message}</p>
    <p className="text-xs mt-1 text-slate-400">Records may exist outside the chosen date window or department filter.</p>
    {onReset && (
      <button
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-2xs transition-colors cursor-pointer"
      >
        <RotateCcw size={13} />
        <span>View All Records (All Time)</span>
      </button>
    )}
  </div>
);

// ── MAIN BUSINESS INTELLIGENCE & REPORTING SUITE ──────────────────────────────
export default function Reports() {
  const queryClient = useQueryClient();
  const printRef = useRef(null);

  // Filter States
  const [activeTab, setActiveTab] = useState("executive");
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [searchTableQuery, setSearchTableQuery] = useState("");

  // Attendance Sub-view State (Monthly vs Daily)
  const [attSubView, setAttSubView] = useState("monthly"); // "monthly" | "daily"

  // Tasks Sub-view State
  const [taskSubView, setTaskSubView] = useState("overview"); // "overview" | "workload" | "delayed" | "trends" | "manager"

  // Leads Sub-view State
  const [leadSubView, setLeadSubView] = useState("overview"); // "overview" | "recent" | "active" | "employee" | "department"

  // Performance Sub-view State
  const [perfSubView, setPerfSubView] = useState("members"); // "members" | "departments" | "efficiency" | "rankings"

  // Drill-Down States
  const [drillEmployeeId, setDrillEmployeeId] = useState(null);
  const [drillDepartmentId, setDrillDepartmentId] = useState(null);

  // Performance Weights Configuration Modal
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weights, setWeights] = useState({
    attendance: 20,
    taskCompletion: 30,
    punctuality: 15,
    productivity: 20,
    leaveDiscipline: 15,
  });

  // Export Loading
  const [isExporting, setIsExporting] = useState(false);

  // Query Params
  const queryParams = useMemo(() => ({
    dateRange,
    startDate: dateRange === "custom" ? customStart : undefined,
    endDate: dateRange === "custom" ? customEnd : undefined,
    departmentId: selectedDept,
    branchId: selectedBranch,
    employeeId: selectedEmployee,
    weights: JSON.stringify(weights),
  }), [dateRange, customStart, customEnd, selectedDept, selectedBranch, selectedEmployee, weights]);

  const { user, hasPermission } = useAuth();

  // Role & Subscription Access Control
  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower === "superadmin";
  const isCompanyAdmin = roleLower === "companyadmin" || roleLower === "admin";
  const isHR = roleLower === "hr";
  const isManager = roleLower === "manager";

  const checkPerm = (mod) => {
    if (isSuperAdmin || isCompanyAdmin || isHR || isManager) return true;
    try {
      return typeof hasPermission === "function" ? Boolean(hasPermission(mod)) : true;
    } catch {
      return true;
    }
  };

  const canAccessLeads = checkPerm("leads");
  const canAccessProjects = checkPerm("projects");
  const canAccessTasks = checkPerm("tasks");
  const canAccessAttendance = checkPerm("attendance");
  const canAccessLeaves = checkPerm("leave");
  const canAccessWorkforce = checkPerm("teamMembers") || checkPerm("employees");
  const canAccessPerformance = checkPerm("performance");
  const canAccessAudit = isSuperAdmin || isCompanyAdmin;

  // Available Tabs list based on permissions - Clean, simple, and properly ordered
  const availableTabs = useMemo(() => {
    const list = [
      { id: "executive", label: "Overview", icon: Sparkles, accessible: true },
      { id: "tasks", label: "Task Report", icon: CheckSquare, accessible: canAccessTasks },
      { id: "leads", label: "Lead Report", icon: PhoneCall, accessible: canAccessLeads },
      { id: "projects", label: "Project Report", icon: FolderKanban, accessible: canAccessProjects },
      { id: "workforce", label: "Team Report", icon: Users, accessible: canAccessWorkforce },
      { id: "performance", label: "Performance Report", icon: Award, accessible: canAccessPerformance },
    ];
    return list.filter(t => t.accessible);
  }, [canAccessLeads, canAccessProjects, canAccessTasks, canAccessWorkforce, canAccessPerformance]);

  // Ensure active tab is within available tabs
  useEffect(() => {
    if (!availableTabs.some(t => t.id === activeTab)) {
      setActiveTab("executive");
    }
  }, [availableTabs, activeTab]);

  // Master Queries
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const departments = Array.isArray(deptRes?.data?.departments) ? deptRes.data.departments : Array.isArray(deptRes?.data) ? deptRes.data : [];

  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: getBranchesApi });
  const branches = Array.isArray(branchRes?.data?.branches) ? branchRes.data.branches : Array.isArray(branchRes?.data) ? branchRes.data : [];

  const { data: empRes } = useQuery({ queryKey: ["employeesList"], queryFn: () => getEmployeesApi({ limit: 1000 }) });
  const employees = Array.isArray(empRes?.data?.employees) ? empRes.data.employees : Array.isArray(empRes?.data) ? empRes.data : [];

  // Tab Reports Queries
  const { data: execRes, isLoading: execLoading, refetch: refetchExec } = useQuery({
    queryKey: ["biExecutive", queryParams],
    queryFn: () => getBIExecutiveReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "executive",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: leadRes, isLoading: leadLoading } = useQuery({
    queryKey: ["biLeads", queryParams],
    queryFn: () => getBILeadReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "leads" && canAccessLeads,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: projRes, isLoading: projLoading } = useQuery({
    queryKey: ["biProjects", queryParams],
    queryFn: () => getBIProjectReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "projects" && canAccessProjects,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: workRes, isLoading: workLoading } = useQuery({
    queryKey: ["biWorkforce", queryParams],
    queryFn: () => getBIWorkforceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "workforce",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: ["biAttendance", queryParams],
    queryFn: () => getBIAttendanceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "attendance",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: leaveRes, isLoading: leaveLoading } = useQuery({
    queryKey: ["biLeaves", queryParams],
    queryFn: () => getBILeaveReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "leaves",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: taskRes, isLoading: taskLoading } = useQuery({
    queryKey: ["biTasks", queryParams],
    queryFn: () => getBITaskReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "tasks",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: perfRes, isLoading: perfLoading } = useQuery({
    queryKey: ["biPerformance", queryParams],
    queryFn: () => getBIPerformanceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "performance",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ["biAudit", queryParams],
    queryFn: () => getBIAuditReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "audit",
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  // Drill-Down Queries
  const { data: drillEmpRes, isLoading: drillEmpLoading } = useQuery({
    queryKey: ["biDrillEmployee", drillEmployeeId],
    queryFn: () => getBIEmployeeDrillDownApi(drillEmployeeId).then(r => r.data?.data),
    enabled: !!drillEmployeeId,
  });

  const { data: drillDeptRes, isLoading: drillDeptLoading } = useQuery({
    queryKey: ["biDrillDept", drillDepartmentId],
    queryFn: () => getBIDepartmentDrillDownApi(drillDepartmentId).then(r => r.data?.data),
    enabled: !!drillDepartmentId,
  });

  // ── Unified Formatted Excel (.xlsx) Export Engine ───────────────────────────
  const handleExportExcel = () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      let rows = [];
      let sheetName = "Report";
      const fileDate = new Date().toISOString().slice(0, 10).split("-").reverse().join("_");
      let filename = `HRMS_${activeTab.toUpperCase()}_Report_${fileDate}.xlsx`;

      if (activeTab === "executive" && execRes) {
        sheetName = "Executive BI";
        rows.push(["EXECUTIVE BUSINESS INTELLIGENCE REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
        rows.push([]);
        rows.push(["Department", "Headcount", "Active Staff", "Tasks Assigned", "Tasks Completed", "Completion Rate %"]);
        (execRes.departmentAnalytics || []).forEach(d => {
          rows.push([d.name || "—", d.headcount || 0, d.activeHeadcount || 0, d.tasksAssigned || 0, d.tasksCompleted || 0, `${d.completionRate || 0}%`]);
        });
        rows.push([]);
        rows.push(["TOP PERFORMING EMPLOYEES"]);
        rows.push(["Rank", "Employee Name", "Employee Code", "Department", "Role", "Tasks Completed", "Completion %", "Performance Score"]);
        (execRes.topPerformers || []).forEach((p, idx) => {
          rows.push([`#${idx + 1}`, p.name, p.employeeCode, p.department, p.role, p.tasksCompleted, `${p.completionRate}%`, `${p.performanceScore}%`]);
        });
      } else if (activeTab === "workforce" && workRes) {
        sheetName = "Workforce";
        rows.push(["WORKFORCE REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`]);
        rows.push([]);
        rows.push(["Employee Name", "Employee Code", "Email", "Department", "Designation", "Branch", "Status", "Joining Date"]);
        (workRes.employeesList || []).forEach(e => {
          rows.push([e.name || "—", e.code || "—", e.email || "—", e.department || "—", e.designation || "—", e.branch || "—", e.status || "—", fmtDate(e.joiningDate)]);
        });
      } else if (activeTab === "attendance" && attRes) {
        sheetName = "Attendance";
        rows.push(["MONTHLY ATTENDANCE REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
        rows.push([]);
        rows.push([
          "Employee Name", "Employee Code", "Department", "Branch",
          "Working Days", "Present Days", "Absent Days", "Half Days",
          "Leave Days", "Weekly Off", "Holiday", "Late Days",
          "Total Hours", "Overtime Hours", "Attendance %"
        ]);
        (attRes.monthlySummary || []).forEach(a => {
          rows.push([
            a.employeeName, a.employeeCode, a.department, a.branch,
            a.totalWorkingDays, a.presentDays, a.absentDays, a.halfDays,
            a.leaveDays, a.weeklyOffDays, a.holidayDays, a.lateDays,
            a.totalWorkingHours, a.totalOvertime, `${a.attendancePercentage}%`
          ]);
        });
      } else if (activeTab === "leaves" && leaveRes) {
        sheetName = "Leaves";
        rows.push(["LEAVE REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`]);
        rows.push([]);
        rows.push(["Employee Name", "Employee Code", "Department", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"]);
        (leaveRes.records || []).forEach(l => {
          rows.push([l.employeeName, l.employeeCode, l.department, l.leaveType, fmtDate(l.startDate), fmtDate(l.endDate), l.days, l.reason || "—", l.status]);
        });
      } else if (activeTab === "tasks" && taskRes) {
        sheetName = "Tasks";
        rows.push(["TASK & OPERATIONS REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`]);
        rows.push([]);
        rows.push(["Task Title", "Assignee", "Priority", "Department", "Due Date", "Status"]);
        (taskRes.records || []).forEach(t => {
          rows.push([t.title, t.assigneeName, t.priority, t.department, fmtDate(t.dueDate), t.status]);
        });
      } else if (activeTab === "leads" && leadRes) {
        if (leadSubView === "recent") {
          sheetName = "Recent Leads";
          rows.push(["RECENT INBOUND LEADS REPORT"]);
          rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
          rows.push([`Total Recent Stream: ${(leadRes.recentLeads || []).length}`]);
          rows.push([]);
          rows.push(["Lead Name", "Company", "Phone", "Email", "Source", "Assigned To", "Department", "Value (INR)", "Status", "Inbound Date"]);
          (leadRes.recentLeads || []).forEach(l => {
            rows.push([l.name, l.company || "—", l.phone, l.email, l.source, l.assignedTo, l.department || "—", l.estimatedValue || 0, l.status, l.formattedDate]);
          });
        } else if (leadSubView === "active") {
          sheetName = "Active Leads";
          rows.push(["ACTIVE  DEALS REPORT"]);
          rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
          rows.push([`Active In-Flight Deals: ${(leadRes.activeLeads || []).length}`, `Active  Value: INR ${(leadRes.kpis?.activePipelineValue || 0).toLocaleString("en-IN")}`]);
          rows.push([]);
          rows.push(["Deal / Lead Name", "Company", "Phone", "Email", " Stage", "Assigned Owner", "Department", "Estimated Value (INR)", "Created Date"]);
          (leadRes.activeLeads || []).forEach(l => {
            rows.push([l.name, l.company || "—", l.phone, l.email, l.status, l.assignedTo, l.department || "—", l.estimatedValue || 0, l.formattedDate]);
          });
        } else if (leadSubView === "employee") {
          sheetName = "Employee Lead Performance";
          rows.push(["SALES REPRESENTATIVE & EMPLOYEE PERFORMANCE REPORT"]);
          rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
          rows.push([`Total Sales Reps: ${(leadRes.employeePerformance || []).length}`, `Overall Conversion: ${leadRes.kpis?.conversionRate || 0}%`, `Total Won Revenue: INR ${(leadRes.kpis?.wonValue || 0).toLocaleString("en-IN")}`]);
          rows.push([]);
          rows.push(["Representative Name", "Email", "Department", "Leads Assigned", "Active Deals", "Deals Won", "Deals Lost", "Won Revenue (INR)", " Value (INR)", "Conversion %", "Performance Tier"]);
          (leadRes.employeePerformance || []).forEach(e => {
            rows.push([e.name, e.email || "—", e.department, e.assigned, e.active, e.converted, e.lost, e.wonValue || 0, e.pipelineValue || 0, `${e.conversionRate}%`, e.efficiencyTier]);
          });
        } else if (leadSubView === "department") {
          sheetName = "Department Leads";
          rows.push(["DEPARTMENT-WISE LEAD CONVERSION REPORT"]);
          rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
          rows.push([]);
          rows.push(["Department Name", "Total Leads", "Active Deals", "Deals Won", "Deals Lost", "Won Revenue (INR)", " Value (INR)", "Conversion %"]);
          (leadRes.departmentLeadReport || []).forEach(d => {
            rows.push([d.department, d.totalLeads, d.activeLeads, d.wonLeads, d.lostLeads, d.wonValue || 0, d.pipelineValue || 0, `${d.conversionRate}%`]);
          });
        } else {
          sheetName = "CRM Leads Overview";
          rows.push(["CRM & LEADS BUSINESS REPORT"]);
          rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
          rows.push([`Total Leads: ${leadRes.kpis?.totalLeads || 0}`, `Converted: ${leadRes.kpis?.convertedLeads || 0}`, `Conversion Rate: ${leadRes.kpis?.conversionRate || 0}%`, `Total  Value: INR ${(leadRes.kpis?.totalPipelineValue || 0).toLocaleString("en-IN")}`]);
          rows.push([]);
          rows.push(["Lead Name", "Phone", "Email", "Status", "Source", "Estimated Value (INR)", "Assigned Agent", "Created Date"]);
          (leadRes.records || []).forEach(l => {
            rows.push([l.name, l.phone, l.email, l.status, l.source, l.estimatedValue || 0, l.assignedTo, l.formattedDate]);
          });
        }
      } else if (activeTab === "projects" && projRes) {
        sheetName = "Projects";
        rows.push(["PROJECT OPERATIONS REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`, `Period: ${dateRange}`]);
        rows.push([`Total Projects: ${projRes.kpis?.total || 0}`, `Active: ${projRes.kpis?.active || 0}`, `Completed: ${projRes.kpis?.completed || 0}`, `Delivery Rate: ${projRes.kpis?.completionRate || 0}%`]);
        rows.push([]);
        rows.push(["Project Name", "Client", "Project Manager", "Department", "Status", "Priority", "Milestones Completed", "Start Date", "Deadline"]);
        (projRes.records || []).forEach(p => {
          rows.push([p.name, p.clientName, p.projectManager, p.department, p.status, p.priority, `${p.completedMilestones}/${p.totalMilestones}`, p.formattedStart, p.formattedEnd]);
        });
      } else if (activeTab === "performance" && perfRes) {
        sheetName = "Performance";
        rows.push(["EMPLOYEE PERFORMANCE REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`]);
        rows.push([]);
        rows.push(["Employee Name", "Employee Code", "Department", "Role", "Task Completion %", "Attendance %", "Composite Score %", "Performance Tier"]);
        (perfRes.rankings || []).forEach(r => {
          rows.push([r.name, r.code, r.department, r.role, `${r.tasksCompleted}/${r.tasksTotal}`, `${r.attendanceRate}%`, `${r.score}%`, r.tier]);
        });
      } else if (activeTab === "audit" && auditRes) {
        sheetName = "Audit Ledger";
        rows.push(["SYSTEM AUDIT REPORT"]);
        rows.push([`Generated Date: ${fmtDate(new Date())}`]);
        rows.push([]);
        rows.push(["Date & Time", "Performed By", "Role", "Module", "Action", "IP Address"]);
        (auditRes.records || []).forEach(a => {
          rows.push([fmtDateTime(a.createdAt), a.performedByName, a.role, a.module, a.action, a.ipAddress || "—"]);
        });
      }

      if (rows.length === 0) {
        toast.error("No reporting data available to export in this tab.");
        setIsExporting(false);
        return;
      }

      // Generate Workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Auto Column Widths
      const colWidths = rows.reduce((acc, row) => {
        row.forEach((cell, i) => {
          const len = cell ? String(cell).length : 10;
          acc[i] = Math.max(acc[i] || 12, len + 3);
        });
        return acc;
      }, []);
      ws["!cols"] = colWidths.map(w => ({ wch: Math.min(45, w) }));

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);

      toast.success(`Exported ${filename}`);
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Failed to export Excel report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["biExecutive"] });
    queryClient.invalidateQueries({ queryKey: ["biWorkforce"] });
    queryClient.invalidateQueries({ queryKey: ["biAttendance"] });
    queryClient.invalidateQueries({ queryKey: ["biLeaves"] });
    queryClient.invalidateQueries({ queryKey: ["biTasks"] });
    queryClient.invalidateQueries({ queryKey: ["biLeads"] });
    queryClient.invalidateQueries({ queryKey: ["biProjects"] });
    queryClient.invalidateQueries({ queryKey: ["biPerformance"] });
    queryClient.invalidateQueries({ queryKey: ["biAudit"] });
    toast.success("Reports refreshed");
  };

  return (
    <div ref={printRef} className="space-y-3 pb-16 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── Page Header & Global Filters ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs print:border-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <BarChart2 size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Reports &amp; Analytics
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Performance, tasks, sales leads, projects, and team reports
              </p>
            </div>
          </div>

          {/* Top Global Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Date Range Filter Chips */}
            <div className="flex items-center bg-slate-100 dark:bg-[#0B101B] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              {[
                { id: "all", label: "All Time" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_quarter", label: "Quarter" },
                { id: "this_year", label: "This Year" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDateRange(p.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${dateRange === p.id
                    ? "bg-amber-500 text-slate-950 shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Locations</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name || b.branchName}</option>
              ))}
            </select>

            {/* Custom Date Pickers */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
                <span className="text-slate-400 text-xs">–</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            )}

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              title="Export formatted Excel file"
            >
              {isExporting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} strokeWidth={2.5} />
              )}
              <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer size={13} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Enterprise Report Tabs Strip (Access-Gated) ────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-1.5 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-[760px]">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? "bg-amber-500 text-slate-950 shadow-2xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
              >
                <Icon size={12} strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. EXECUTIVE DASHBOARD TAB                                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "executive" && (
        <div className="space-y-3 animate-fadeIn">
          {execLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Executive BI...</div>
          ) : execRes ? (
            <>
              {/* Top Headline Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <KPICard
                  label="Total Staff"
                  metric={execRes.kpis?.totalEmployees}
                  icon={Users}
                  color={THEME.emerald}
                  sub={`${execRes.kpis?.activeEmployees?.current ?? execRes.kpis?.totalEmployees?.current ?? 0} Active Members`}
                />
                <KPICard
                  label="Task Delivery Rate"
                  metric={execRes.kpis?.taskCompletionRate}
                  icon={Target}
                  color={THEME.emerald}
                  isPercentage
                  sub={`${execRes.kpis?.completedTasks?.current ?? 0} Completed Tasks`}
                />
                {canAccessLeads ? (
                  <KPICard
                    label="Lead Conversion"
                    metric={execRes.kpis?.leadConversionRate}
                    icon={PhoneCall}
                    color={THEME.blue}
                    isPercentage
                    sub={`${execRes.kpis?.totalLeads?.current ?? 0} Total Leads`}
                  />
                ) : (
                  <KPICard
                    label="Attendance Rate"
                    metric={execRes.kpis?.attendanceRate}
                    icon={CalendarCheck}
                    color={THEME.cyan}
                    isPercentage
                  />
                )}
                {canAccessProjects ? (
                  <KPICard
                    label="Active Projects"
                    metric={execRes.kpis?.activeProjects}
                    icon={FolderKanban}
                    color={THEME.purple}
                    sub={`${execRes.kpis?.totalProjects?.current ?? 0} Total Projects`}
                  />
                ) : (
                  <KPICard
                    label="Pending Tasks"
                    metric={execRes.kpis?.pendingTasks}
                    icon={Clock}
                    color={THEME.amber}
                  />
                )}
              </div>

              {/* Operational Health & Performance Summary */}
              {execRes.healthIntelligence && (
                <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Operational Health &amp; Performance
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      Live Overview
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Business Health</p>
                      <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {execRes.healthIntelligence.businessHealthScore || 0}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Team Performance</p>
                      <p className="text-base font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                        {execRes.healthIntelligence.teamPerformanceScore || 0}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Productivity Score</p>
                      <p className="text-base font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                        {execRes.healthIntelligence.productivityScore || 0}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Avg Turnaround</p>
                      <p className="text-base font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                        {execRes.healthIntelligence.avgTaskCompletionTime || "—"}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Critical Delayed</p>
                      <p className={`text-base font-black font-mono mt-0.5 ${(execRes.healthIntelligence.criticalPendingTasks || 0) > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                        {execRes.healthIntelligence.criticalPendingTasks || 0} Tasks
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Overview Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-amber-500" />
                    Task Overview
                  </h2>
                  <span className="text-[10px] text-slate-400 font-bold">{execRes.kpis?.totalTasks?.current ?? execRes.kpis?.totalTasks ?? 0} Total Tasks</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  <KPICard label="Total Tasks" metric={execRes.kpis?.totalTasks} icon={CheckSquare} color={THEME.amber} />
                  <KPICard label="Completed Tasks" metric={execRes.kpis?.completedTasks} icon={CheckCircle2} color={THEME.emerald} />
                  <KPICard label="In Progress / Pending" metric={execRes.kpis?.pendingTasks} icon={Clock} color={THEME.blue} />
                  <KPICard label="Overdue Tasks" metric={execRes.kpis?.overdueTasks} icon={AlertCircle} color={THEME.rose} isUp={false} sub="Past Deadline" />
                </div>
              </div>

              {/* Leads Overview Section */}
              {canAccessLeads && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between px-0.5">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <PhoneCall size={13} className="text-blue-500" />
                      Lead Overview
                    </h2>
                    <span className="text-[10px] text-slate-400 font-bold">{execRes.kpis?.totalLeads?.current ?? execRes.kpis?.totalLeads ?? 0} Total Leads</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    <KPICard label="Total Leads" metric={execRes.kpis?.totalLeads} icon={PhoneCall} color={THEME.blue} />
                    <KPICard label="Converted Deals" metric={execRes.kpis?.convertedLeads} icon={CheckCircle2} color={THEME.emerald} />
                    <KPICard label="Conversion Rate" metric={execRes.kpis?.leadConversionRate} icon={TrendingUp} color={THEME.emerald} isPercentage />
                    <KPICard label=" Value" metric={execRes.kpis?.pipelineValue} icon={DollarSign} color={THEME.purple} isCurrency />
                  </div>
                </div>
              )}

              {/* Projects Overview Section */}
              {canAccessProjects && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between px-0.5">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FolderKanban size={13} className="text-purple-500" />
                      Project Overview
                    </h2>
                    <span className="text-[10px] text-slate-400 font-bold">{execRes.kpis?.totalProjects?.current ?? execRes.kpis?.totalProjects ?? 0} Total Projects</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    <KPICard label="Total Projects" metric={execRes.kpis?.totalProjects} icon={FolderKanban} color={THEME.purple} />
                    <KPICard label="Active Projects" metric={execRes.kpis?.activeProjects} icon={Activity} color={THEME.cyan} />
                    <KPICard label="Completed Projects" metric={execRes.kpis?.completedProjects} icon={CheckCircle2} color={THEME.emerald} />
                    <KPICard label="Delivery Rate" metric={execRes.kpis?.projectDeliveryRate} icon={Target} color={THEME.blue} isPercentage />
                  </div>
                </div>
              )}

              {/* Department Performance Bar & Workforce Share */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                <div className="lg:col-span-7">
                  <ChartCard title="Department Operations & Completion" subtitle="Live task volume and delivery rate by team">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={execRes?.departmentAnalytics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="tasksAssigned" name="Assigned Tasks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tasksCompleted" name="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="lg:col-span-5">
                  <ChartCard title="Department Headcount Share" subtitle="Workforce distribution across business units">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={execRes?.departmentAnalytics || []}
                          dataKey="headcount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {(execRes.departmentAnalytics || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>

              {/* Top Performers Leaderboard */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-amber-500" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top Performing Employees Leaderboard</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Based on composite delivery scores</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-2">Rank</th>
                        <th className="px-4 py-2">Member</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2 text-center">Tasks Closed</th>
                        <th className="px-4 py-2 text-center">Completion %</th>
                        <th className="px-4 py-2 text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(execRes.topPerformers || []).map((emp, idx) => (
                        <tr
                          key={emp._id}
                          onClick={() => setDrillEmployeeId(emp._id)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer group"
                        >
                          <td className="px-4 py-2 font-mono font-black text-amber-600 dark:text-amber-400">#{idx + 1}</td>
                          <td className="px-4 py-2">
                            <p className="font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 transition-colors">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.employeeCode} · {emp.role}</p>
                          </td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{emp.department}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{emp.tasksCompleted} / {emp.tasksAssigned}</td>
                          <td className="px-4 py-2 text-center font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{emp.completionRate}%</td>
                          <td className="px-4 py-2 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-md font-mono font-black text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              {emp.performanceScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Executive Recent Cross-Functional Feeds */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {canAccessLeads && (execRes.recentLeads || []).length > 0 && (
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-1.5">
                        <PhoneCall size={14} className="text-blue-500" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent CRM Inquiries</h3>
                      </div>
                      <button onClick={() => setActiveTab("leads")} className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                        View All <ChevronRight size={10} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(execRes?.recentLeads || []).map(l => (
                        <div key={l._id} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{l.name}</p>
                            <p className="text-[10px] text-slate-400">{l.phone} · {l.source}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ backgroundColor: `${l.statusColor || "#f59e0b"}15`, color: l.statusColor || "#f59e0b" }}>
                              {l.status}
                            </span>
                            {l.value > 0 && <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">₹{fmtNumber(l.value)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canAccessProjects && (execRes?.recentProjects || []).length > 0 && (
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban size={14} className="text-purple-500" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Active Projects</h3>
                      </div>
                      <button onClick={() => setActiveTab("projects")} className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                        View All <ChevronRight size={10} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(execRes?.recentProjects || []).map(p => (
                        <div key={p._id} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.client} · Priority: {p.priority?.toUpperCase()}</p>
                          </div>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : <EmptyState message="No executive intelligence data found for this period." onReset={() => setDateRange("all")} />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. CRM & LEADS REPORT TAB                                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "leads" && (
        <div className="space-y-3 animate-fadeIn">
          {leadLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading CRM &amp; Lead Analytics...</div>
          ) : leadRes ? (
            <>
              {/* Lead KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Leads" metric={leadRes.kpis?.totalLeads} icon={PhoneCall} color={THEME.blue} />
                <KPICard label="Converted Won" metric={leadRes.kpis?.convertedLeads} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Active Pipeline" metric={leadRes.kpis?.pipelineLeads} icon={Clock} color={THEME.amber} />
                <KPICard label="Conversion Rate" metric={leadRes.kpis?.conversionRate} icon={TrendingUp} color={THEME.emerald} isPercentage />
                <KPICard label=" Value" metric={leadRes.kpis?.totalPipelineValue || 0} icon={DollarSign} color={THEME.purple} sub="Total Estimated Deals" isCurrency />
                <KPICard label="Won Revenue" metric={leadRes.kpis?.wonValue || 0} icon={DollarSign} color={THEME.emerald} sub="Closed Converted Deals" isCurrency />
                <KPICard label="Lost Leads" metric={leadRes.kpis?.lostLeads || 0} icon={AlertCircle} color={THEME.rose} sub="Dropped Opportunities" isUp={false} />
                <KPICard label="Avg Value/Lead" metric={leadRes.kpis?.totalLeads > 0 ? Math.round((leadRes.kpis?.totalPipelineValue || 0) / leadRes.kpis.totalLeads) : 0} icon={Target} color={THEME.cyan} sub="Deal Size Average" isCurrency />
              </div>

              {/* Leads Sub-Views Navigation Pill Strip */}
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 min-w-[620px]">
                  {[
                    { id: "overview", label: "Complete Overview", icon: Sparkles },
                    { id: "recent", label: "Recent Leads ⏱️", icon: Clock },
                    { id: "active", label: "Active Deals 🔥", icon: Flame },
                    { id: "employee", label: "Employee Performance 👤", icon: UserCheck },
                    { id: "department", label: "Department Report 🏢", icon: Building2 },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = leadSubView === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setLeadSubView(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${isSubActive
                          ? "bg-amber-500 text-slate-950 shadow-2xs font-black"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                          }`}
                      >
                        <SubIcon size={13} strokeWidth={2.2} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 font-bold px-2 whitespace-nowrap hidden sm:inline">
                  {leadSubView === "recent" && `${(leadRes.recentLeads || []).length} Inbound Records`}
                  {leadSubView === "active" && `${(leadRes.activeLeads || []).length} Active Opportunities`}
                  {leadSubView === "employee" && `${(leadRes.employeePerformance || []).length} Sales Reps`}
                  {leadSubView === "department" && `${(leadRes.departmentLeadReport || []).length} Departments`}
                  {leadSubView === "overview" && `${(leadRes.records || []).length} Total Leads`}
                </span>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 1: COMPLETE OVERVIEW                                  */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leadSubView === "overview" && (
                <div className="space-y-3.5">
                  {/* Status & Source Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                    <div className="lg:col-span-7">
                      <ChartCard title="Leads by  Stage" subtitle="Distribution of opportunities by sales status">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={leadRes?.statusBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Total Leads" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                              {(leadRes?.statusBreakdown || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>

                    <div className="lg:col-span-5">
                      <ChartCard title="Acquisition Source Share" subtitle="Inbound customer origin channels">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={leadRes?.sourceBreakdown || []}
                              dataKey="count"
                              nameKey="source"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={45}
                              paddingAngle={3}
                            >
                              {(leadRes.sourceBreakdown || []).map((_, index) => (
                                <Cell key={`cell-src-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  </div>

                  {/* Highlights Banner Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Deal Closer</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {(leadRes.employeePerformance || [])[0]?.name || "N/A"}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-extrabold mt-0.5">
                          ₹{fmtNumber((leadRes.employeePerformance || [])[0]?.wonValue || 0)} Closed Won
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Trophy size={18} />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Revenue Department</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {(leadRes.departmentLeadReport || [])[0]?.department || "N/A"}
                        </p>
                        <p className="text-[11px] text-blue-600 font-extrabold mt-0.5">
                          {(leadRes.departmentLeadReport || [])[0]?.totalLeads || 0} Total Inbound Deals
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Building2 size={18} />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">In-Flight  Value</p>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          ₹{fmtNumber(leadRes.kpis?.activePipelineValue || 0)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {leadRes.kpis?.pipelineLeads || 0} Deals in negotiation
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Flame size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Full Detailed Leads Ledger */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">All Leads Report</h3>
                        <p className="text-[10px] text-slate-400 font-medium">All customer leads and inquiries</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search lead name, phone..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Lead Name</th>
                            <th className="px-4 py-2">Contact</th>
                            <th className="px-4 py-2">Source</th>
                            <th className="px-4 py-2">Assigned To</th>
                            <th className="px-4 py-2 text-right">Value</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(leadRes.records || [])
                            .filter(l => !searchTableQuery || `${l.name} ${l.phone} ${l.email} ${l.status} ${l.source}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map(l => (
                              <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{l.name}</td>
                                <td className="px-4 py-2">
                                  <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{l.phone}</p>
                                  {l.email !== "—" && <p className="text-[10px] text-slate-400">{l.email}</p>}
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{l.source}</td>
                                <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">{l.assignedTo}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {l.estimatedValue > 0 ? `₹${fmtNumber(l.estimatedValue)}` : "—"}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ backgroundColor: `${l.statusColor}15`, color: l.statusColor }}>
                                    {l.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{l.formattedDate}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 2: RECENT LEADS STREAM ⏱️                             */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leadSubView === "recent" && (
                <div className="space-y-3.5">
                  {/* Headline Stats Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recent Stream Count</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{(leadRes.recentLeads || []).length}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Latest chronological inbound</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stream Deal Value</p>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                        ₹{fmtNumber((leadRes.recentLeads || []).reduce((s, l) => s + (l.estimatedValue || 0), 0))}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total value in stream</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active In-Flight</p>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        {(leadRes.recentLeads || []).filter(l => l.stageType === "Active").length}
                      </p>
                      <p className="text-[10px] text-amber-600 font-bold mt-0.5">Open &amp; ongoing deals</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Won Inquiries</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {(leadRes.recentLeads || []).filter(l => l.stageType === "Won").length}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Successfully closed</p>
                    </div>
                  </div>

                  {/* Recent Leads Table */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={13} className="text-amber-500" />
                          <span>Recent Inbound Leads Stream</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Real-time incoming customer inquiries sorted by arrival date</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search recent leads..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Lead &amp; Contact</th>
                            <th className="px-4 py-2">Company</th>
                            <th className="px-4 py-2">Source</th>
                            <th className="px-4 py-2">Assigned Rep</th>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-right">Deal Value</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2 text-center">Stage</th>
                            <th className="px-4 py-2">Inbound Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(leadRes.recentLeads || [])
                            .filter(l => !searchTableQuery || `${l.name} ${l.phone} ${l.email} ${l.company} ${l.assignedTo} ${l.status} ${l.source}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map((l) => (
                              <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2">
                                  <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{l.name}</p>
                                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{l.phone}</p>
                                  {l.email && l.email !== "—" && <p className="text-[10px] text-slate-400">{l.email}</p>}
                                </td>
                                <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">
                                  {l.company || "—"}
                                </td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {l.source}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">
                                  {l.assignedTo}
                                </td>
                                <td className="px-4 py-2 text-slate-500 font-medium">
                                  {l.department || "—"}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-black text-slate-900 dark:text-white">
                                  {l.estimatedValue > 0 ? `₹${fmtNumber(l.estimatedValue)}` : "—"}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span
                                    className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase"
                                    style={{ backgroundColor: `${l.statusColor}18`, color: l.statusColor }}
                                  >
                                    {l.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${l.stageType === "Won"
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : l.stageType === "Lost"
                                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                    }`}>
                                    {l.stageType}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {l.formattedDate}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 3: ACTIVE  DEALS 🔥                           */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leadSubView === "active" && (
                <div className="space-y-3.5">
                  {/* Active Deals KPI Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Deals In-Flight</p>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{(leadRes.activeLeads || []).length}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Excludes closed &amp; dropped</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active  Capital</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        ₹{fmtNumber(leadRes.kpis?.activePipelineValue || 0)}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Potential revenue</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Avg Active Deal Size</p>
                      <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                        ₹{fmtNumber((leadRes.activeLeads?.length || 0) > 0 ? Math.round((leadRes.kpis?.activePipelineValue || 0) / (leadRes.activeLeads?.length || 1)) : 0)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Average ticket size</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Sales Owners</p>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                        {new Set((leadRes.activeLeads || []).map(l => l.assignedTo).filter(n => n !== "Unassigned")).size}
                      </p>
                      <p className="text-[10px] text-purple-600 font-bold mt-0.5">Agents pursuing leads</p>
                    </div>
                  </div>

                  {/* Active Deals Table */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Flame size={13} className="text-amber-500" />
                          <span>Active  Opportunities</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Currently engaged prospects in active qualification &amp; negotiation</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search active deals..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Opportunity / Prospect</th>
                            <th className="px-4 py-2">Company</th>
                            <th className="px-4 py-2">Deal Owner</th>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-right">Potential Capital</th>
                            <th className="px-4 py-2 text-center"> Stage</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(leadRes.activeLeads || [])
                            .filter(l => !searchTableQuery || `${l.name} ${l.phone} ${l.email} ${l.company} ${l.assignedTo} ${l.status}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map((l) => (
                              <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2">
                                  <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{l.name}</p>
                                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{l.phone}</p>
                                  {l.email && l.email !== "—" && <p className="text-[10px] text-slate-400">{l.email}</p>}
                                </td>
                                <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">
                                  {l.company || "—"}
                                </td>
                                <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">
                                  {l.assignedTo}
                                </td>
                                <td className="px-4 py-2 text-slate-500 font-medium">
                                  {l.department || "—"}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                                  {l.estimatedValue > 0 ? `₹${fmtNumber(l.estimatedValue)}` : "—"}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span
                                    className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase"
                                    style={{ backgroundColor: `${l.statusColor}18`, color: l.statusColor }}
                                  >
                                    {l.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    ● In Pipeline
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {l.formattedDate}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 4: EMPLOYEE PERFORMANCE 👤                            */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leadSubView === "employee" && (
                <div className="space-y-3.5">
                  {/* Employee Sales KPIs Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Representative</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                        {(leadRes.employeePerformance || [])[0]?.name || "N/A"}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">
                        {(leadRes.employeePerformance || [])[0]?.converted || 0} Deals Converted Won
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Org Conversion Rate</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {leadRes.kpis?.conversionRate || 0}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Team average closure rate</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Won Revenue</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        ₹{fmtNumber(leadRes.kpis?.wonValue || 0)}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Realized sales income</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Sales Reps</p>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                        {(leadRes.employeePerformance || []).length}
                      </p>
                      <p className="text-[10px] text-purple-600 font-bold mt-0.5">Assigned staff members</p>
                    </div>
                  </div>

                  {/* Representative Performance Comparison Chart */}
                  {(leadRes.employeePerformance || []).length > 0 && (
                    <ChartCard title="Representative Conversion &amp;  Capital" subtitle="Won revenue vs active in-flight deal value by sales rep">
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={leadRes.employeePerformance || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => `₹${fmtNumber(v)}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="wonValue" name="Won Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pipelineValue" name="Active  (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Employee Performance Detailed Ledger */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <UserCheck size={13} className="text-emerald-500" />
                          <span>Employee Lead Performance</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Conversion rates, won leads, and performance</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search representative..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Representative</th>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-center">Assigned</th>
                            <th className="px-4 py-2 text-center">Active Deals</th>
                            <th className="px-4 py-2 text-center text-emerald-400">Won</th>
                            <th className="px-4 py-2 text-center text-rose-400">Lost</th>
                            <th className="px-4 py-2 text-right">Won Revenue</th>
                            <th className="px-4 py-2 text-right"> Value</th>
                            <th className="px-4 py-2 text-center">Conversion %</th>
                            <th className="px-4 py-2 text-center">Performance Tier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(leadRes.employeePerformance || [])
                            .filter(e => !searchTableQuery || `${e.name} ${e.email} ${e.department} ${e.efficiencyTier}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map((e) => (
                              <tr key={e.agentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2">
                                  <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{e.name}</p>
                                  {e.email && <p className="text-[10px] text-slate-400 font-mono">{e.email}</p>}
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium">
                                  {e.department}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                                  {e.assigned}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-amber-600">
                                  {e.active}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600">
                                  {e.converted}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-rose-500">
                                  {e.lost}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                  ₹{fmtNumber(e.wonValue || 0)}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                  ₹{fmtNumber(e.pipelineValue || 0)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-14 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.min(100, e.conversionRate)}%` }}
                                      />
                                    </div>
                                    <span className="font-mono font-black text-emerald-600">{e.conversionRate}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${e.efficiencyTier === "Top Closer"
                                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                    : e.efficiencyTier === "High Performer"
                                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                    }`}>
                                    {e.efficiencyTier}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SUB-VIEW 5: DEPARTMENT LEAD REPORT 🏢                          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leadSubView === "department" && (
                <div className="space-y-3.5">
                  {/* Department Leads KPIs Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Lead Departments</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        {(leadRes.departmentLeadReport || []).length}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Units receiving opportunities</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Revenue Unit</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-1 truncate">
                        {(leadRes.departmentLeadReport || [])[0]?.department || "N/A"}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">
                        ₹{fmtNumber((leadRes.departmentLeadReport || [])[0]?.wonValue || 0)} Won Deals
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total  Capital</p>
                      <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                        ₹{fmtNumber(leadRes.kpis?.totalPipelineValue || 0)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Across all units</p>
                    </div>
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Overall Org Win Rate</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {leadRes.kpis?.conversionRate || 0}%
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Aggregate performance</p>
                    </div>
                  </div>

                  {/* Department Comparison Bar Chart */}
                  {(leadRes.departmentLeadReport || []).length > 0 && (
                    <ChartCard title="Department Lead Distribution &amp; Conversions" subtitle="Total inquiries received vs successfully converted deals">
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={leadRes.departmentLeadReport || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                          <XAxis dataKey="department" tick={{ fontSize: 10, fill: "#888" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="totalLeads" name="Total Inbound Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="activeLeads" name="Active Deals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="wonLeads" name="Won Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Department Detailed Report Table */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={13} className="text-blue-500" />
                          <span>Department Lead Report</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Deals, revenue, and win rates by department</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search department..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Department Name</th>
                            <th className="px-4 py-2 text-center">Total Inbound</th>
                            <th className="px-4 py-2 text-center text-amber-400">Active Deals</th>
                            <th className="px-4 py-2 text-center text-emerald-400">Won Deals</th>
                            <th className="px-4 py-2 text-center text-rose-400">Lost Leads</th>
                            <th className="px-4 py-2 text-right">Closed Won Revenue</th>
                            <th className="px-4 py-2 text-right"> Capital</th>
                            <th className="px-4 py-2 text-center">Win Rate %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(leadRes.departmentLeadReport || [])
                            .filter(d => !searchTableQuery || `${d.department}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map((d) => (
                              <tr key={d.departmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Building2 size={13} className="text-slate-400" />
                                  <span>{d.department}</span>
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                                  {d.totalLeads}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-amber-600">
                                  {d.activeLeads}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600">
                                  {d.wonLeads}
                                </td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-rose-500">
                                  {d.lostLeads}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                  ₹{fmtNumber(d.wonValue || 0)}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                  ₹{fmtNumber(d.pipelineValue || 0)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-14 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.min(100, d.conversionRate)}%` }}
                                      />
                                    </div>
                                    <span className="font-mono font-black text-emerald-600">{d.conversionRate}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : <EmptyState message="No lead data available for the chosen date range." onReset={() => setDateRange("all")} />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. PROJECTS OPERATIONS REPORT TAB                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "projects" && (
        <div className="space-y-3 animate-fadeIn">
          {projLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Projects Analytics...</div>
          ) : projRes ? (
            <>
              {/* Project KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Projects" metric={projRes.kpis?.total} icon={FolderKanban} color={THEME.purple} />
                <KPICard label="Active / In Progress" metric={projRes.kpis?.active} icon={Activity} color={THEME.cyan} />
                <KPICard label="Completed" metric={projRes.kpis?.completed} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Delivery Rate" metric={projRes.kpis?.completionRate} icon={Target} color={THEME.emerald} isPercentage />
                <KPICard label="Planning / Review" metric={projRes.kpis?.planning} icon={Clock} color={THEME.blue} sub="Pre-execution & Review" />
                <KPICard label="Delayed / Overdue" metric={projRes.kpis?.overdue} icon={AlertCircle} color={THEME.rose} sub="Past Projected End Date" />
                <KPICard label="Total Milestones" metric={(projRes.records || []).reduce((s, p) => s + (p.totalMilestones || 0), 0)} icon={Layers} color={THEME.amber} sub="Operational Milestones" />
                <KPICard label="Milestones Closed" metric={(projRes.records || []).reduce((s, p) => s + (p.completedMilestones || 0), 0)} icon={CheckSquare} color={THEME.emerald} sub="Completed Deliverables" />
              </div>

              {/* Status & Priority Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                <div className="lg:col-span-7">
                  <ChartCard title="Projects by Delivery Status" subtitle="Active  and stage execution breakdown">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={projRes?.statusBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                        <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Projects Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="lg:col-span-5">
                  <ChartCard title="Project Priority Spread" subtitle="Urgency distribution across deliverables">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={projRes?.priorityBreakdown || []}
                          dataKey="count"
                          nameKey="priority"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {(projRes.priorityBreakdown || []).map((_, index) => (
                            <Cell key={`cell-pr-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>

              {/* Full Detailed Projects Ledger */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">All Projects Report</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Delivery schedule, managers, and milestone progress</p>
                  </div>
                  <div className="relative w-full sm:w-56">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search project name, client..."
                      value={searchTableQuery}
                      onChange={(e) => setSearchTableQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2">Project Name</th>
                        <th className="px-4 py-2">Client</th>
                        <th className="px-4 py-2">Project Manager</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2 text-center">Priority</th>
                        <th className="px-4 py-2 text-center">Milestones Progress</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(projRes.records || [])
                        .filter(p => !searchTableQuery || `${p.name} ${p.clientName} ${p.projectManager} ${p.department} ${p.status}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                        .map(p => (
                          <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{p.name}</td>
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.clientName}</td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">{p.projectManager}</td>
                            <td className="px-4 py-2 text-slate-500">{p.department}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${p.priority === "high" ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20" :
                                p.priority === "medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" :
                                  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}>
                                {p.priority}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.milestoneProgress}%` }} />
                                </div>
                                <span className="text-[10px] font-mono font-bold">{p.milestoneProgress}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" :
                                p.status === "active" || p.status === "working" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" :
                                  "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                              {p.formattedStart} → {p.formattedEnd}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <EmptyState message="No project data available for the chosen date range." onReset={() => setDateRange("all")} />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. WORKFORCE REPORT TAB                                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "workforce" && (
        <div className="space-y-3 animate-fadeIn">
          {workLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Workforce Analytics...</div>
          ) : workRes ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Headcount" metric={workRes.kpis?.totalEmployees} icon={Users} color={THEME.blue} />
                <KPICard label="Active Staff" metric={workRes.kpis?.activeEmployees} icon={Users} color={THEME.emerald} />
                <KPICard label="New Joinings" metric={workRes.kpis?.newJoinings} icon={User} color={THEME.purple} />
                <KPICard label="Attrition Rate" metric={workRes.kpis?.attritionRate} icon={TrendingDown} color={THEME.rose} isPercentage isUp={false} />
              </div>

              {/* Department Breakdown Matrix */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department Analytics Matrix</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Click any department for detailed breakdown</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2 text-center">Headcount</th>
                        <th className="px-4 py-2 text-center">Active</th>
                        <th className="px-4 py-2 text-center">New Joinings</th>
                        <th className="px-4 py-2 text-center">Resignations</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(workRes.departmentBreakdown || []).map((d) => (
                        <tr
                          key={d._id}
                          onClick={() => setDrillDepartmentId(d._id)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer group"
                        >
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400" />
                            <span>{d.name}</span>
                          </td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{d.headcount}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600">{d.active}</td>
                          <td className="px-4 py-2 text-center font-mono text-purple-600 font-bold">+{d.newJoinings}</td>
                          <td className="px-4 py-2 text-center font-mono text-rose-600 font-bold">{d.resignations}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                              <span>Drill Down</span>
                              <ChevronRight size={11} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Employee Directory Table */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Employee Directory</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{workRes.employeesList?.length || 0} active &amp; registered records</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Name &amp; Code</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Designation</th>
                        <th className="px-4 py-2">Branch</th>
                        <th className="px-4 py-2">Joining Date</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(workRes.employeesList || []).map((emp) => (
                        <tr
                          key={emp._id}
                          onClick={() => setDrillEmployeeId(emp._id)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2">
                            <p className="font-extrabold text-slate-900 dark:text-white">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.code}</p>
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">{emp.email}</td>
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{emp.department}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{emp.designation}</td>
                          <td className="px-4 py-2 text-slate-500">{emp.branch}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{fmtDate(emp.joiningDate)}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${emp.status === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                              }`}>
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. ATTENDANCE REPORT TAB (Monthly Summary + Daily Details)           */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-3 animate-fadeIn">
          {attLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Attendance Analytics...</div>
          ) : attRes ? (
            <>
              {/* KPIs Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Attendance Rate" metric={attRes.kpis?.attendanceRate} icon={CalendarCheck} color={THEME.emerald} isPercentage />
                <KPICard label="Present Days" metric={attRes.kpis?.present} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Late Arrivals" metric={attRes.kpis?.late} icon={Clock} color={THEME.amber} />
                <KPICard label="Total Overtime (Hrs)" metric={attRes.kpis?.totalOvertime} icon={TrendingUp} color={THEME.purple} />
              </div>

              {/* Sub-view switcher: Monthly Summary vs Daily Details */}
              <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAttSubView("monthly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${attSubView === "monthly"
                      ? "bg-amber-500 text-slate-950 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Monthly Employee Summary
                  </button>
                  <button
                    onClick={() => setAttSubView("daily")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${attSubView === "daily"
                      ? "bg-amber-500 text-slate-950 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                  >
                    Daily Punch Logs
                  </button>
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  {attSubView === "monthly" ? `${attRes.monthlySummary?.length || 0} Staff Summaries` : `${attRes.records?.length || 0} Punch Entries`}
                </div>
              </div>

              {/* View A: Monthly Employee Attendance Summary */}
              {attSubView === "monthly" ? (
                <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                          <th className="px-3.5 py-2">Employee</th>
                          <th className="px-2 py-2">Department</th>
                          <th className="px-2 py-2 text-center">Work Days</th>
                          <th className="px-2 py-2 text-center text-emerald-400">Present</th>
                          <th className="px-2 py-2 text-center text-rose-400">Absent</th>
                          <th className="px-2 py-2 text-center text-purple-400">Half Day</th>
                          <th className="px-2 py-2 text-center text-blue-400">Leaves</th>
                          <th className="px-2 py-2 text-center text-slate-400">Off</th>
                          <th className="px-2 py-2 text-center text-amber-400">Late</th>
                          <th className="px-2 py-2 text-center">Total Hrs</th>
                          <th className="px-2 py-2 text-center text-purple-400">Overtime</th>
                          <th className="px-2 py-2 text-center">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {(attRes.monthlySummary || []).map((m) => (
                          <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2">
                              <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{m.employeeName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{m.employeeCode}</p>
                            </td>
                            <td className="px-2 py-2 text-slate-600 dark:text-slate-300 text-[11px]">{m.department}</td>
                            <td className="px-2 py-2 text-center font-mono font-bold">{m.totalWorkingDays}</td>
                            <td className="px-2 py-2 text-center font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{m.presentDays}</td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{m.absentDays}</td>
                            <td className="px-2 py-2 text-center font-mono font-bold text-purple-600 dark:text-purple-400">{m.halfDays}</td>
                            <td className="px-2 py-2 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">{m.leaveDays}</td>
                            <td className="px-2 py-2 text-center font-mono text-slate-400">{m.weeklyOffDays}</td>
                            <td className="px-2 py-2 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">{m.lateDays}</td>
                            <td className="px-2 py-2 text-center font-mono font-bold">{m.totalWorkingHours}h</td>
                            <td className="px-2 py-2 text-center font-mono font-black text-purple-600 dark:text-purple-400">
                              {m.totalOvertime > 0 ? `+${m.totalOvertime}h` : "0h"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-mono font-black ${m.attendancePercentage >= 85
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : m.attendancePercentage >= 70
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                }`}>
                                {m.attendancePercentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* View B: Daily Punch Logs */
                <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Staff Member</th>
                          <th className="px-4 py-2">Punch In</th>
                          <th className="px-4 py-2">Punch Out</th>
                          <th className="px-4 py-2 text-center">Status</th>
                          <th className="px-4 py-2 text-center">Working Hours</th>
                          <th className="px-4 py-2 text-center">Late Time</th>
                          <th className="px-4 py-2 text-center">Overtime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {(attRes.records || []).map((a) => (
                          <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">{a.date}</td>
                            <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">
                              {a.employeeName}
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono font-normal">({a.employeeCode})</span>
                            </td>
                            <td className="px-4 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">{a.punchIn || "—"}</td>
                            <td className="px-4 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">{a.punchOut || "—"}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${a.status === "present"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : a.status === "late"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  : a.status === "half-day"
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center font-mono font-bold">{a.workingHours ? `${a.workingHours}h` : "—"}</td>
                            <td className="px-4 py-2 text-center font-mono text-amber-600 font-bold">{a.lateTime || "—"}</td>
                            <td className="px-4 py-2 text-center font-mono font-black text-purple-600 dark:text-purple-400">
                              {a.overtime > 0 ? `+${a.overtime}h` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. LEAVES REPORT TAB                                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "leaves" && (
        <div className="space-y-3 animate-fadeIn">
          {leaveLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Leaves Analytics...</div>
          ) : leaveRes ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Applications" metric={leaveRes.kpis?.totalRequests} icon={CalendarOff} color={THEME.blue} />
                <KPICard label="Approved" metric={leaveRes.kpis?.approved} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Pending Approvals" metric={leaveRes.kpis?.pending} icon={Clock} color={THEME.amber} />
                <KPICard label="Rejected" metric={leaveRes.kpis?.rejected} icon={AlertCircle} color={THEME.rose} isUp={false} />
              </div>

              {/* Department-wise Leave Consumption */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department Leave Distribution</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Total Days Taken by Team</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3">
                  {(leaveRes.departmentBreakdown || []).map((d, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">{d.department}</p>
                      <p className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">{d.days} Days</p>
                      <p className="text-[10px] text-slate-400">{d.count} requests</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Leave Records */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Leave Applications Registry</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{leaveRes.records?.length || 0} applications logged</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Staff Member</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Leave Type</th>
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2 text-center">Days</th>
                        <th className="px-4 py-2">Reason</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(leaveRes.records || []).map((l) => (
                        <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">
                            {l.employeeName}
                            <span className="text-[10px] text-slate-400 font-mono block font-normal">{l.employeeCode}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{l.department}</td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-200 font-bold capitalize">{l.leaveType}</td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{l.days}</td>
                          <td className="px-4 py-2 text-slate-400 truncate max-w-xs">{l.reason || "Personal"}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${l.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : l.status === "rejected"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              }`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 5. TASKS & OPS REPORT TAB                                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tasks" && (
        <div className="space-y-3 animate-fadeIn">
          {taskLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Task Analytics...</div>
          ) : taskRes ? (
            <>
              {/* 5 Core Task KPI Cards + Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
                <KPICard label="Total Tasks" metric={taskRes.kpis?.totalTasks} icon={CheckSquare} color={THEME.amber} />
                <KPICard label="Pending Tasks" metric={taskRes.kpis?.pending} icon={Layers} color={THEME.purple} />
                <KPICard label="In Progress" metric={taskRes.kpis?.inProgress} icon={Clock} color={THEME.blue} />
                <KPICard
                  label="Completed"
                  metric={taskRes.kpis?.completed}
                  icon={CheckCircle2}
                  color={THEME.emerald}
                  sub={`${taskRes.kpis?.completionRate || 0}% Delivery Rate`}
                />
                <KPICard
                  label="Overdue Tasks"
                  metric={taskRes.kpis?.overdue}
                  icon={AlertCircle}
                  color={THEME.rose}
                  isUp={false}
                  sub="Requires Attention"
                />
              </div>



              {/* Tasks Sub-Views Navigation Pill Strip */}
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 min-w-[620px]">
                  {[
                    { id: "overview", label: "Complete Report View", icon: CheckSquare },
                    { id: "workload", label: "Workload Balance ⚖️", icon: Scale },
                    { id: "delayed", label: "Delayed Task Analysis 🚨", icon: AlertCircle },
                    { id: "manager", label: "Manager Performance 👔", icon: Briefcase },
                    { id: "trends", label: "Completion Trends 📈", icon: TrendingUp },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = taskSubView === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setTaskSubView(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${isSubActive
                          ? "bg-amber-500 text-slate-950 shadow-2xs font-black"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                          }`}
                      >
                        <SubIcon size={13} strokeWidth={2.2} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 font-bold px-2 whitespace-nowrap hidden sm:inline">
                  {taskSubView === "workload" && `${taskRes.workloadReport?.length || 0} Team Members`}
                  {taskSubView === "delayed" && `${taskRes.delayedTasks?.length || 0} Delayed Tasks`}
                  {taskSubView === "manager" && `${taskRes.managerPerformance?.length || 0} Managers`}
                  {taskSubView === "trends" && `Fulfillment Velocity`}
                  {taskSubView === "overview" && `${taskRes.records?.length || 0} Records`}
                </span>
              </div>

              {/* SUB-VIEW 1: COMPLETE TASK REPORT (Overview, Graphs, Top Performers, Overdue, Recent, Department) */}
              {taskSubView === "overview" && (
                <div className="space-y-3.5">
                  {/* Graphs Row: Department Fulfillment + Status Donut + Priority Donut */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                    <div className="lg:col-span-6">
                      <ChartCard title="Department Task Fulfillment" subtitle="Assigned vs Completed tasks across units">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={taskRes.departmentAnalytics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" name="Total Assigned" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>

                    <div className="lg:col-span-3">
                      <ChartCard title="Status Breakdown" subtitle="Distribution by status">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Completed", value: taskRes.kpis?.completed || 0, color: THEME.emerald },
                                { name: "In Progress", value: taskRes.kpis?.inProgress || 0, color: THEME.blue },
                                { name: "Pending", value: taskRes.kpis?.pending || 0, color: THEME.purple },
                                { name: "Overdue", value: taskRes.kpis?.overdue || 0, color: THEME.rose },
                              ].filter(d => d.value > 0)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={45}
                              paddingAngle={4}
                            >
                              {[
                                { name: "Completed", value: taskRes.kpis?.completed || 0, color: THEME.emerald },
                                { name: "In Progress", value: taskRes.kpis?.inProgress || 0, color: THEME.blue },
                                { name: "Pending", value: taskRes.kpis?.pending || 0, color: THEME.purple },
                                { name: "Overdue", value: taskRes.kpis?.overdue || 0, color: THEME.rose },
                              ].filter(d => d.value > 0).map((entry, index) => (
                                <Cell key={`cell-st-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>

                    <div className="lg:col-span-3">
                      <ChartCard title="Priority Distribution" subtitle="Urgency level split">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: "High / Urgent", value: taskRes.priorityBreakdown?.high || 0, color: THEME.rose },
                                { name: "Medium", value: taskRes.priorityBreakdown?.medium || 0, color: THEME.amber },
                                { name: "Low", value: taskRes.priorityBreakdown?.low || 0, color: THEME.emerald },
                              ].filter(d => d.value > 0)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              innerRadius={45}
                              paddingAngle={4}
                            >
                              {[
                                { name: "High / Urgent", value: taskRes.priorityBreakdown?.high || 0, color: THEME.rose },
                                { name: "Medium", value: taskRes.priorityBreakdown?.medium || 0, color: THEME.amber },
                                { name: "Low", value: taskRes.priorityBreakdown?.low || 0, color: THEME.emerald },
                              ].filter(d => d.value > 0).map((entry, index) => (
                                <Cell key={`cell-tp-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  </div>

                  {/* Top Task Contributors / Performers */}
                  {(taskRes.employeeTaskPerformance || []).length > 0 && (
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                          <Trophy size={14} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top Team Task Performers</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{taskRes.employeeTaskPerformance.length} contributors evaluated</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            <tr>
                              <th className="px-4 py-2 text-center w-12">Rank</th>
                              <th className="px-4 py-2">Assignee</th>
                              <th className="px-4 py-2 text-center">Total Assigned</th>
                              <th className="px-4 py-2 text-center text-emerald-400">Completed</th>
                              <th className="px-4 py-2 text-center">Completion Rate</th>
                              <th className="px-4 py-2 text-center">Performance Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {taskRes.employeeTaskPerformance.slice(0, 6).map((e, idx) => (
                              <tr key={e.employeeId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 text-center font-mono font-black text-amber-500">#{idx + 1}</td>
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{e.name}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold">{e.total}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{e.completed}</td>
                                <td className="px-4 py-2 text-center font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{e.rate}%</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${e.rate >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" :
                                      e.rate >= 60 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" :
                                        "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                    }`}>
                                    {e.rate >= 80 ? "High Performer" : e.rate >= 60 ? "Good" : "Needs Support"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Overdue / Delayed Tasks Section */}
                  <div className="bg-white dark:bg-[#111C24] border border-rose-200/80 dark:border-rose-900/40 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-rose-500" />
                        <div>
                          <h3 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Overdue &amp; Delayed Tasks</h3>
                          <p className="text-[10px] text-slate-400 font-medium">Tasks that exceeded their scheduled deadline requiring immediate attention</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                        {(taskRes.delayedTasks || []).length} Overdue Tasks
                      </span>
                    </div>
                    {(taskRes.delayedTasks || []).length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All tasks are on track within their deadlines!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2">Task Title</th>
                              <th className="px-4 py-2">Assignee</th>
                              <th className="px-4 py-2">Department</th>
                              <th className="px-4 py-2 text-center">Priority</th>
                              <th className="px-4 py-2">Due Date</th>
                              <th className="px-4 py-2 text-center text-rose-400">Delay Time</th>
                              <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {taskRes.delayedTasks.slice(0, 10).map((t) => (
                              <tr key={t._id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{t.title}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium">{t.assigneeName}</td>
                                <td className="px-4 py-2 text-slate-500">{t.department}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDate(t.dueDate)}</td>
                                <td className="px-4 py-2 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                                  {t.delayDays ? `${t.delayDays}d overdue` : "Overdue"}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Department-Wise Task Performance Breakdown Table */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department-Wise Task Breakdown</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Task assignments and delivery rates across company departments</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">{(taskRes.departmentAnalytics || []).length} Departments</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-center">Total Assigned</th>
                            <th className="px-4 py-2 text-center text-emerald-400">Completed</th>
                            <th className="px-4 py-2 text-center text-amber-400">Pending / In-Progress</th>
                            <th className="px-4 py-2 text-center text-rose-400">Overdue</th>
                            <th className="px-4 py-2 text-center">Completion Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(taskRes.departmentAnalytics || []).map((d) => {
                            const total = d.total || d.tasksAssigned || 0;
                            const comp = d.completed || d.tasksCompleted || 0;
                            const pend = d.pending || Math.max(0, total - comp);
                            const over = d.overdue || 0;
                            const rate = total > 0 ? Math.round((comp / total) * 100) : 100;
                            return (
                              <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{d.name}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold">{total}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{comp}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{pend}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{over}</td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                        style={{ width: `${Math.min(100, rate)}%` }}
                                      />
                                    </div>
                                    <span className="font-mono font-extrabold text-[11px] text-slate-700 dark:text-slate-300">{rate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Tasks Ledger Table */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent Tasks List</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Individual task assignments, priority, and progress status</p>
                      </div>
                      <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search title, assignee..."
                          value={searchTableQuery}
                          onChange={(e) => setSearchTableQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2">Task Title</th>
                            <th className="px-4 py-2">Assignee</th>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-center">Priority</th>
                            <th className="px-4 py-2">Due Date</th>
                            <th className="px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(taskRes.records || [])
                            .filter(t => !searchTableQuery || `${t.title} ${t.assigneeName} ${t.department} ${t.priority} ${t.status}`.toLowerCase().includes(searchTableQuery.toLowerCase()))
                            .map((t) => (
                              <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{t.title}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium">{t.assigneeName}</td>
                                <td className="px-4 py-2 text-slate-500">{t.department}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.priority === "high" || t.priority === "urgent"
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                                    : t.priority === "medium"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDate(t.dueDate)}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${t.status === "completed" || t.status === "done"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                    : t.status === "in_process" || t.status === "in-progress"
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                    }`}>
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: WORKLOAD BALANCE REPORT ⚖️ */}
              {taskSubView === "workload" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <Scale size={15} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Team Workload Distribution &amp; Capacity Balance</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Real-time task volume per team member to prevent burnout and reassign queues immediately</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {taskRes.workloadReport?.length || 0} Staff Evaluated
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[520px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2.5">Team Member</th>
                            <th className="px-4 py-2.5">Department</th>
                            <th className="px-4 py-2.5 text-center text-amber-400">Pending Tasks</th>
                            <th className="px-4 py-2.5 text-center text-blue-400">In Process</th>
                            <th className="px-4 py-2.5 text-center">Active Workload</th>
                            <th className="px-4 py-2.5 text-center text-emerald-400">Resolved</th>
                            <th className="px-4 py-2.5 text-center">Capacity Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(taskRes.workloadReport || []).map((m) => {
                            const activeVal = m.totalActive ?? m.activeTotal ?? ((m.pending || 0) + (m.inProcess || 0) + (m.overdue || 0));
                            const isOverloaded = m.overloadStatus === "overloaded" || m.status?.toLowerCase() === "overloaded" || activeVal >= 6;
                            const isBalanced = m.overloadStatus === "balanced" || m.status?.toLowerCase() === "balanced" || activeVal >= 2;
                            return (
                              <tr key={m.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2.5">
                                  <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{m.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{m.employeeCode || m.code || "—"}</p>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-medium">{m.department}</td>
                                <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{m.pending ?? 0}</td>
                                <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{m.inProcess ?? 0}</td>
                                <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                                  {activeVal}
                                </td>
                                <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{m.completed ?? 0}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${isOverloaded
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                    : isBalanced
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                    }`}>
                                    {isOverloaded ? "🚨 Overloaded" : isBalanced ? "✔ Balanced" : "🟢 Available"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: DELAYED TASK ANALYSIS 🚨 */}
              {taskSubView === "delayed" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={15} className="text-rose-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Delayed &amp; Late Task Root-Cause Analysis</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Track tasks exceeding SLA deadlines with exact delay days, hours, and department attribution</p>
                      </div>
                      <span className="text-[10px] text-rose-500 font-mono font-black bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                        {taskRes.delayedTasks?.length || 0} Delayed Tasks
                      </span>
                    </div>

                    {(taskRes.delayedTasks || []).length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Delayed Tasks!</p>
                        <p className="text-xs text-slate-400">All tasks in this period were executed within designated SLAs.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[520px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2.5">Task Title</th>
                              <th className="px-4 py-2.5">Assignee</th>
                              <th className="px-4 py-2.5">Department</th>
                              <th className="px-4 py-2.5 text-center">Priority</th>
                              <th className="px-4 py-2.5">Due Date</th>
                              <th className="px-4 py-2.5 text-center text-rose-400">Delay Time</th>
                              <th className="px-4 py-2.5">Delay Reason</th>
                              <th className="px-4 py-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {taskRes.delayedTasks.map((t) => (
                              <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2.5 font-extrabold text-slate-900 dark:text-white">{t.title}</td>
                                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-semibold">{t.assigneeName}</td>
                                <td className="px-4 py-2.5 text-slate-500">{t.department}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{fmtDate(t.dueDate)}</td>
                                <td className="px-4 py-2.5 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                                  {t.delayDays > 0 ? `${t.delayDays}d ` : ""}{t.delayHours}h
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                  {t.reason || "Operational Delay"}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 4: MANAGER PERFORMANCE REPORT 👔 */}
              {taskSubView === "manager" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase size={15} className="text-blue-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Manager Task Delegation &amp; Governance Report</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Evaluation of managers on assignment volume, turnaround promptness, task reopenings, shifts, and cancellations</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {taskRes.managerPerformance?.length || 0} Managers Evaluated
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[520px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2.5">Manager</th>
                            <th className="px-4 py-2.5">Department</th>
                            <th className="px-4 py-2.5 text-center">Tasks Assigned</th>
                            <th className="px-4 py-2.5 text-center text-emerald-400">On-Time Done</th>
                            <th className="px-4 py-2.5 text-center text-emerald-400">On-Time %</th>
                            <th className="px-4 py-2.5 text-center text-purple-400">Reopened</th>
                            <th className="px-4 py-2.5 text-center text-blue-400">Shifted</th>
                            <th className="px-4 py-2.5 text-center text-rose-400">Cancelled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(taskRes.managerPerformance || []).map((m) => (
                            <tr key={m.managerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2.5">
                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{m.email}</p>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-medium">{m.department || "Management"}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">{m.tasksAssigned ?? m.tasksCreated ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-600">{m.completedOnTime ?? m.tasksCompleted ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-600">
                                {m.onTimeRate ?? m.completionRate ?? 0}%
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-purple-600">{m.reopenedTasks ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-600">{m.shiftedTasks ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-rose-600">{m.cancelledTasks ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 5: COMPLETION TRENDS 📈 */}
              {taskSubView === "trends" && (
                <div className="space-y-3">
                  <ChartCard title="Operational Fulfillment Velocity Trend" subtitle="Daily & Weekly throughput of completed, pending, and late tasks">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={taskRes.trendDaily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#888" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" name="Late" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Interval Metrics Breakdown</h3>
                      <span className="text-[10px] text-slate-400 font-bold">Chronological task throughput</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Interval</th>
                            <th className="px-4 py-2 text-center">Total Volume</th>
                            <th className="px-4 py-2 text-center text-emerald-400">Completed</th>
                            <th className="px-4 py-2 text-center text-amber-400">Pending</th>
                            <th className="px-4 py-2 text-center text-rose-400">Late</th>
                            <th className="px-4 py-2 text-center">Fulfillment %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(taskRes.trendDaily || []).map((t, idx) => {
                            const totalVol = t.total ?? ((t.completed || 0) + (t.pending || 0) + (t.late || 0));
                            const comp = t.completed ?? 0;
                            const pend = t.pending ?? 0;
                            const late = t.late ?? 0;
                            const pct = totalVol > 0 ? Math.round((comp / totalVol) * 100) : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">{t.label}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold">{totalVol}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600">{comp}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-amber-600">{pend}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-rose-600">{late}</td>
                                <td className="px-4 py-2 text-center font-mono font-black text-slate-900 dark:text-white">
                                  {pct}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : <EmptyState message="No task records found for the chosen date range." onReset={() => setDateRange("all")} />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 6. PERFORMANCE SCORECARD TAB                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "performance" && (
        <div className="space-y-3 animate-fadeIn">
          {perfLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Calculating Performance Metrics...</div>
          ) : perfRes ? (
            <>
              {/* Performance Sub-Views Navigation Pill Strip */}
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 min-w-[620px]">
                  {[
                    { id: "members", label: "Team Member Performance ⭐", icon: UserCheck },
                    { id: "departments", label: "Department Performance", icon: Building2 },
                    { id: "efficiency", label: "Work Efficiency & Productivity ⭐⭐⭐", icon: Zap },
                    { id: "rankings", label: "Top & Bottom Rankings 🏆", icon: Award },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = perfSubView === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setPerfSubView(sub.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${isSubActive
                          ? "bg-amber-500 text-slate-950 shadow-2xs font-black"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                          }`}
                      >
                        <SubIcon size={13} strokeWidth={2.2} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowWeightsModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sliders size={12} />
                  <span>Configure Weights</span>
                </button>
              </div>

              {/* SUB-VIEW 1: TEAM MEMBER PERFORMANCE REPORT ⭐ */}
              {perfSubView === "members" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award size={15} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Team Member Performance Table</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Complete breakdown: Total Assigned, Completed, Pending, Overdue, Late, On-Time, Reopened, and Score</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {perfRes.rankings?.length || 0} Team Members
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[550px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-3.5 py-2.5">Member Details</th>
                            <th className="px-2 py-2.5">Performance Badge</th>
                            <th className="px-2 py-2.5 text-center">Assigned</th>
                            <th className="px-2 py-2.5 text-center text-emerald-400">Done</th>
                            <th className="px-2 py-2.5 text-center text-amber-400">Pending</th>
                            <th className="px-2 py-2.5 text-center text-rose-400">Overdue</th>
                            <th className="px-2 py-2.5 text-center text-rose-400">Late</th>
                            <th className="px-2 py-2.5 text-center">Avg Days</th>
                            <th className="px-2 py-2.5 text-center text-emerald-400">On Time</th>
                            <th className="px-2 py-2.5 text-center text-purple-400">Reopened</th>
                            <th className="px-2 py-2.5 text-center text-slate-400">Cancelled</th>
                            <th className="px-2 py-2.5 text-center">Score (100)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(perfRes.rankings || []).map((m, idx) => (
                            <tr key={m.employeeId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-3.5 py-2.5">
                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{m.code} · {m.department}</p>
                              </td>
                              <td className="px-2 py-2.5">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold whitespace-nowrap">
                                  <span className="text-emerald-600 dark:text-emerald-400">✔ {m.completed ?? m.tasksCompleted ?? 0}</span>
                                  <span className="text-slate-300 dark:text-slate-600">|</span>
                                  <span className="text-rose-600 dark:text-rose-400">⏰ {m.lateCompleted ?? m.tasksLate ?? 0}</span>
                                  <span className="text-slate-300 dark:text-slate-600">|</span>
                                  <span className="text-amber-600 dark:text-amber-400">🔴 {m.pending ?? m.tasksPending ?? 0}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">{m.totalAssigned ?? m.tasksTotal ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-600">{m.completed ?? m.tasksCompleted ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-amber-600">{m.pending ?? m.tasksPending ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-rose-600">{m.overdue ?? m.tasksOverdue ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-rose-500">{m.lateCompleted ?? m.tasksLate ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono text-slate-500">{m.avgCompletionDays > 0 ? `${m.avgCompletionDays}d` : "—"}</td>
                              <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-600">{m.onTime ?? m.onTimeCompletion ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono text-purple-600">{m.reopened ?? m.reopenedTasks ?? 0}</td>
                              <td className="px-2 py-2.5 text-center font-mono text-slate-400">{m.cancelled ?? m.cancelledTasks ?? 0}</td>
                              <td className="px-2 py-2.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded font-mono font-black text-xs border ${(m.performanceScore || m.score) >= 80
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                  : (m.performanceScore || m.score) >= 60
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                    : (m.performanceScore || m.score) > 0
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                      : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                  }`}>
                                  {m.performanceScore || m.score || 0}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: DEPARTMENT PERFORMANCE REPORT */}
              {perfSubView === "departments" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={15} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department Performance Scorecard</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Department Wise: Total Tasks, Completed, Pending, Late, Turnaround velocity, Best &amp; Lowest Performer</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2.5">Department</th>
                            <th className="px-4 py-2.5 text-center">Total Tasks</th>
                            <th className="px-4 py-2.5 text-center text-emerald-400">Completed</th>
                            <th className="px-4 py-2.5 text-center text-amber-400">Pending</th>
                            <th className="px-4 py-2.5 text-center text-rose-400">Late</th>
                            <th className="px-4 py-2.5 text-center">Avg Completion</th>
                            <th className="px-4 py-2.5">⭐ Best Performer</th>
                            <th className="px-4 py-2.5">⚠️ Lowest Performer</th>
                            <th className="px-4 py-2.5 text-center">Department Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(perfRes.departmentScorecard || []).map((d, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2.5 font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Building2 size={13} className="text-slate-400" />
                                <span>{d.name}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">{d.totalTasks ?? d.total ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-600">{d.completed ?? d.tasksCompleted ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-600">{d.pending ?? d.tasksPending ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-rose-600">{d.late ?? d.tasksLate ?? 0}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-500">{d.avgCompletionDays > 0 ? `${d.avgCompletionDays}d` : "—"}</td>
                              <td className="px-4 py-2.5">
                                <p className="font-extrabold text-amber-600 dark:text-amber-400">
                                  {typeof d.bestPerformer === "object" ? (d.bestPerformer?.name || "—") : (d.bestPerformer || "—")}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Score: {typeof d.bestPerformer === "object" ? (d.bestPerformer?.score || 0) : 0}%
                                </p>
                              </td>
                              <td className="px-4 py-2.5">
                                <p className="font-bold text-slate-600 dark:text-slate-400">
                                  {typeof d.lowestPerformer === "object" ? (d.lowestPerformer?.name || "—") : (d.lowestPerformer || "—")}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Score: {typeof d.lowestPerformer === "object" ? (d.lowestPerformer?.score || 0) : 0}%
                                </p>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  {d.score}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: WORK EFFICIENCY & PRODUCTIVITY REPORT ⭐⭐⭐ */}
              {perfSubView === "efficiency" && (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <Zap size={15} className="text-amber-500" />
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Employee Work Efficiency &amp; Productivity Report</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Working Hours vs Completed Tasks vs Efficiency % (उदा. 8 Hours → 15 Tasks, Efficiency 95%)</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[520px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2.5">Employee</th>
                            <th className="px-4 py-2.5">Department</th>
                            <th className="px-4 py-2.5 text-center text-blue-400">Working Hours</th>
                            <th className="px-4 py-2.5 text-center text-emerald-400">Completed Tasks</th>
                            <th className="px-4 py-2.5 text-center text-amber-400">Productivity Ratio</th>
                            <th className="px-4 py-2.5 text-center">Efficiency %</th>
                            <th className="px-4 py-2.5 text-center">Performance Tier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(perfRes.rankings || []).map((m, idx) => (
                            <tr key={m.employeeId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2.5">
                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{m.code}</p>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-medium">{m.department}</td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                {m.workingHours || 0} Hours
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {m.completedTasks || m.completed || 0} Tasks
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-slate-500">
                                {m.workingHours > 0 ? ((m.completedTasks || m.completed || 0) / (m.workingHours / 8)).toFixed(1) : 0} tasks / 8h
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="inline-flex px-2.5 py-1 rounded font-mono font-black text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  {m.efficiencyRate || 90}%
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${m.tier?.includes("Tier 1") || m.tier?.includes("A")
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                  }`}>
                                  {m.tier || "Standard Tier"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 4: TOP & BOTTOM RANKINGS 🏆 */}
              {perfSubView === "rankings" && (
                <div className="space-y-3">
                  {/* Quick Highlight Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">⚡ Fastest Worker</p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{perfRes.fastestWorker || "—"}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Lowest turnaround days</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">⏰ Most Late Incidents</p>
                      <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">{perfRes.mostLate || "None"}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Attention needed</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">🏆 High Performers</p>
                      <p className="text-sm font-black text-amber-500 mt-0.5">{perfRes.topPerformers?.length || 0} Staff</p>
                      <p className="text-[9px] text-slate-400 font-medium">Score ≥ 85%</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">⚠️ At-Risk Queue</p>
                      <p className="text-sm font-black text-rose-500 mt-0.5">{perfRes.atRisk?.length || 0} Staff</p>
                      <p className="text-[9px] text-slate-400 font-medium">Score &lt; 60%</p>
                    </div>
                  </div>

                  {/* Top 10 Leaderboard */}
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-amber-500" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top 10 High Performers Leaderboard</h3>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold">Highest Composite Scores</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Rank</th>
                            <th className="px-4 py-2">Employee</th>
                            <th className="px-4 py-2">Department</th>
                            <th className="px-4 py-2 text-center">Tasks Closed</th>
                            <th className="px-4 py-2 text-center">Attendance %</th>
                            <th className="px-4 py-2 text-center">Composite Score</th>
                            <th className="px-4 py-2 text-center">Tier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {(perfRes.topTen || (perfRes.rankings || []).slice(0, 10)).map((r, idx) => (
                            <tr key={r.employeeId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2 font-mono font-black text-amber-600 dark:text-amber-400">#{idx + 1}</td>
                              <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">
                                {r.name}
                                <span className="text-[10px] text-slate-400 font-mono ml-1.5 font-normal">({r.code})</span>
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.department}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold">{r.completed ?? r.tasksCompleted} / {r.totalAssigned ?? r.tasksTotal}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600">{r.attendanceRate}%</td>
                              <td className="px-4 py-2 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  {r.performanceScore || r.score}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  {r.tier}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 7. AUDIT LEDGER REPORT TAB                                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-3 animate-fadeIn">
          {auditLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Security Audit Ledger...</div>
          ) : auditRes ? (
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">System Governance &amp; Action Trail</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{auditRes.records?.length || 0} immutable logs</span>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2">Timestamp</th>
                      <th className="px-4 py-2">Performed By</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Module</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {(auditRes.records || []).map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDateTime(a.createdAt)}</td>
                        <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{a.performedByName}</td>
                        <td className="px-4 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {a.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 capitalize">{a.module}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{a.action}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{a.ipAddress || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <EmptyState />}
        </div>
      )}

      {/* ── Drill-Down Modals ────────────────────────────────────────────── */}
      {drillEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setDrillEmployeeId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Employee Operational Drill-Down</h3>
            {drillEmpLoading ? (
              <div className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={20} />Loading details...</div>
            ) : drillEmpRes ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Employee</p>
                    <p className="text-sm font-black mt-0.5">{drillEmpRes.employee?.fullName}</p>
                    <p className="text-[10px] text-slate-400">{drillEmpRes.employee?.employeeCode}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                    <p className="text-sm font-black mt-0.5">{drillEmpRes.employee?.departmentId?.name || "General"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Attendance Rate</p>
                    <p className="text-sm font-black font-mono mt-0.5 text-emerald-600">{drillEmpRes.attendanceRate}%</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Tasks</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(drillEmpRes.tasks || []).map(t => (
                      <div key={t._id} className="flex items-center justify-between text-[11px] p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                        <span className="font-bold truncate">{t.title}</span>
                        <span className="font-mono text-slate-400 capitalize">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Weights Configuration Modal ──────────────────────────────────── */}
      {showWeightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setShowWeightsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Configure Performance Scoring Weights</h3>
            <p className="text-[11px] text-slate-400 mb-4">Total weights must sum to 100%.</p>
            <div className="space-y-3 text-xs">
              {Object.keys(weights).map(k => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={weights[k]}
                      onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowWeightsModal(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer"
              >
                Apply Weights
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
