import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getBIExecutiveReportApi,
  getBIWorkforceReportApi,
  getBIAttendanceReportApi,
  getBILeaveReportApi,
  getBITaskReportApi,
  getBIPayrollReportApi,
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
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart2, Users, CalendarCheck, CalendarOff, DollarSign,
  TrendingUp, TrendingDown, CheckSquare, Download, FileText,
  RefreshCw, Building2, Award, ChevronRight, AlertCircle,
  Clock, Target, Sparkles, Filter, CheckCircle2, ShieldCheck,
  Search, ArrowUp, ArrowDown, Activity, Layers, Printer, Briefcase,
  Sliders, X, User, ArrowUpRight, AlertTriangle, ShieldAlert,
  Calendar, Check, Eye
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
const fmtCurrency = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

const fmtNumber = (v) => new Intl.NumberFormat("en-IN").format(v || 0);
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// ── Custom Tooltip for Recharts ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xl text-xs font-sans">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-[11px] font-semibold" style={{ color: p.color || THEME.amber }}>
          <span>{p.name}:</span>
          <span className="font-mono font-bold">
            {typeof p.value === "number" && p.value > 10000 ? fmtCurrency(p.value) : fmtNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Executive KPI Card with Previous Period Delta ────────────────────────────
const KPICard = ({ label, metric, sub, icon: Icon, color = THEME.amber, isCurrency = false, isPercentage = false }) => {
  const current = metric?.current ?? metric ?? 0;
  const previous = metric?.previous;
  const pctChange = metric?.percentageChange ?? 0;
  const isUp = metric?.isUp ?? true;

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <div className="flex items-baseline gap-2 my-0.5">
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none truncate font-mono">
            {isCurrency ? fmtCurrency(current) : isPercentage ? `${current}%` : fmtNumber(current)}
          </span>
          {previous !== undefined && (
            <span className={`text-[9.5px] font-extrabold flex items-center gap-0.5 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {isUp ? <ArrowUp size={9} strokeWidth={2.5} /> : <ArrowDown size={9} strokeWidth={2.5} />}
              {pctChange}%
            </span>
          )}
        </div>
        <p className="text-[10px] font-medium text-slate-400 truncate">
          {sub ? sub : previous !== undefined ? `vs prev: ${isCurrency ? fmtCurrency(previous) : isPercentage ? `${previous}%` : previous}` : "Period Summary"}
        </p>
      </div>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon size={15} strokeWidth={2.5} />
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
const EmptyState = ({ message = "No reporting data available for the selected period." }) => (
  <div className="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
    <BarChart2 size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
    <p className="text-xs font-bold">{message}</p>
    <p className="text-[10px] mt-0.5 text-slate-400">Try adjusting your filters or date range.</p>
  </div>
);

// ── MAIN BUSINESS INTELLIGENCE & REPORTING SUITE ──────────────────────────────
export default function Reports() {
  const queryClient = useQueryClient();
  const printRef = useRef(null);

  // Filter States
  const [activeTab, setActiveTab] = useState("executive");
  const [dateRange, setDateRange] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [searchTableQuery, setSearchTableQuery] = useState("");

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

  // Master Queries
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const departments = deptRes?.data?.departments || deptRes?.data || [];

  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: getBranchesApi });
  const branches = branchRes?.data?.branches || branchRes?.data || [];

  const { data: empRes } = useQuery({ queryKey: ["employeesList"], queryFn: () => getEmployeesApi({ limit: 1000 }) });
  const employees = empRes?.data?.employees || [];

  // Tab Reports Queries
  const { data: execRes, isLoading: execLoading, refetch: refetchExec } = useQuery({
    queryKey: ["biExecutive", queryParams],
    queryFn: () => getBIExecutiveReportApi(queryParams).then(r => r.data?.data),
  });

  const { data: workRes, isLoading: workLoading } = useQuery({
    queryKey: ["biWorkforce", queryParams],
    queryFn: () => getBIWorkforceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "workforce",
  });

  const { data: attRes, isLoading: attLoading } = useQuery({
    queryKey: ["biAttendance", queryParams],
    queryFn: () => getBIAttendanceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "attendance",
  });

  const { data: leaveRes, isLoading: leaveLoading } = useQuery({
    queryKey: ["biLeaves", queryParams],
    queryFn: () => getBILeaveReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "leaves",
  });

  const { data: taskRes, isLoading: taskLoading } = useQuery({
    queryKey: ["biTasks", queryParams],
    queryFn: () => getBITaskReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "tasks",
  });

  const { data: payRes, isLoading: payLoading } = useQuery({
    queryKey: ["biPayroll", queryParams],
    queryFn: () => getBIPayrollReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "payroll",
  });

  const { data: perfRes, isLoading: perfLoading } = useQuery({
    queryKey: ["biPerformance", queryParams],
    queryFn: () => getBIPerformanceReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "performance",
  });

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ["biAudit", queryParams],
    queryFn: () => getBIAuditReportApi(queryParams).then(r => r.data?.data),
    enabled: activeTab === "audit",
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

  // CSV Export Engine
  const handleExportCSV = () => {
    let rows = [];
    let filename = `hrms_bi_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === "executive" && execRes) {
      rows.push(["Department", "Headcount", "Active", "Tasks Assigned", "Tasks Completed", "Completion Rate %"]);
      (execRes.departmentAnalytics || []).forEach(d => {
        rows.push([`"${d.name}"`, d.headcount, d.activeHeadcount, d.tasksAssigned, d.tasksCompleted, `${d.completionRate}%`]);
      });
    } else if (activeTab === "workforce" && workRes) {
      rows.push(["Name", "Code", "Email", "Department", "Designation", "Branch", "Status", "Joining Date"]);
      (workRes.employeesList || []).forEach(e => {
        rows.push([`"${e.name}"`, e.code, e.email, `"${e.department}"`, `"${e.designation}"`, `"${e.branch}"`, e.status, fmtDate(e.joiningDate)]);
      });
    } else if (activeTab === "attendance" && attRes) {
      rows.push(["Employee Name", "Date", "Punch In", "Punch Out", "Total Hours", "Status"]);
      (attRes.records || []).forEach(a => {
        rows.push([`"${a.employeeName}"`, a.date, fmtDateTime(a.punchIn), fmtDateTime(a.punchOut), a.totalHours || 0, a.status]);
      });
    } else if (activeTab === "leaves" && leaveRes) {
      rows.push(["Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason"]);
      (leaveRes.records || []).forEach(l => {
        rows.push([`"${l.employeeName}"`, l.leaveType, fmtDate(l.startDate), fmtDate(l.endDate), l.days, l.status, `"${l.reason || ""}"`]);
      });
    } else if (activeTab === "tasks" && taskRes) {
      rows.push(["Task Title", "Assignee", "Priority", "Department", "Due Date", "Status"]);
      (taskRes.records || []).forEach(t => {
        rows.push([`"${t.title}"`, `"${t.assigneeName}"`, t.priority, `"${t.department}"`, fmtDate(t.dueDate), t.status]);
      });
    } else if (activeTab === "payroll" && payRes) {
      rows.push(["Employee Name", "Month", "Year", "Basic Salary", "Net Salary", "Status"]);
      (payRes.records || []).forEach(p => {
        rows.push([`"${p.employeeName}"`, p.month, p.year, p.basicSalary, p.netSalary, p.status]);
      });
    } else if (activeTab === "performance" && perfRes) {
      rows.push(["Name", "Code", "Department", "Role", "Score %", "Tier", "Tasks Completed", "Attendance %"]);
      (perfRes.rankings || []).forEach(r => {
        rows.push([`"${r.name}"`, r.code, `"${r.department}"`, `"${r.role}"`, `${r.score}%`, r.tier, `${r.tasksCompleted}/${r.tasksTotal}`, `${r.attendanceRate}%`]);
      });
    } else if (activeTab === "audit" && auditRes) {
      rows.push(["Date & Time", "Performed By", "Role", "Module", "Action", "IP Address"]);
      (auditRes.records || []).forEach(a => {
        rows.push([fmtDateTime(a.createdAt), `"${a.performedByName}"`, a.role, a.module, a.action, a.ipAddress]);
      });
    }

    if (rows.length === 0) {
      toast.error("No data available to export in this tab.");
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}`);
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
    queryClient.invalidateQueries({ queryKey: ["biPayroll"] });
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
                Business Intelligence & Analytics
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Enterprise workforce performance, operational intelligence & audit analytics
              </p>
            </div>
          </div>

          {/* Top Global Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date</option>
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

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
              title="Export active report as CSV"
            >
              <Download size={13} strokeWidth={2.5} />
              <span>Export</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Print view"
            >
              <Printer size={13} />
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh queries"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 8 Core Report Tabs Strip ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-1.5 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-[760px]">
          {[
            { id: "executive", label: "Executive BI", icon: Sparkles },
            { id: "workforce", label: "Workforce", icon: Users },
            { id: "attendance", label: "Attendance", icon: CalendarCheck },
            { id: "leaves", label: "Leaves", icon: CalendarOff },
            { id: "tasks", label: "Tasks & Ops", icon: CheckSquare },
            { id: "payroll", label: "Payroll", icon: DollarSign },
            { id: "performance", label: "Performance", icon: Award },
            { id: "audit", label: "Audit Ledger", icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  isActive
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
              {/* 8 Executive KPI Cards with Delta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Employees" metric={execRes.kpis?.totalEmployees} icon={Users} color={THEME.blue} />
                <KPICard label="Active Workforce" metric={execRes.kpis?.activeEmployees} icon={Users} color={THEME.emerald} />
                <KPICard label="Attendance Rate" metric={execRes.kpis?.attendanceRate} icon={CalendarCheck} color={THEME.cyan} isPercentage />
                <KPICard label="Present Marks" metric={execRes.kpis?.presentCount} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Late Arrivals" metric={execRes.kpis?.lateCount} icon={Clock} color={THEME.amber} />
                <KPICard label="Leave Requests" metric={execRes.kpis?.leaveRequests} icon={CalendarOff} color={THEME.purple} />
                <KPICard label="Task Completion" metric={execRes.kpis?.taskCompletionRate} icon={CheckSquare} color={THEME.emerald} isPercentage />
                <KPICard label="Payroll Cost" metric={execRes.kpis?.payrollCost} icon={DollarSign} color={THEME.rose} isCurrency />
              </div>

              {/* Department Performance Bar & Workforce Share */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                <div className="lg:col-span-7">
                  <ChartCard title="Department Operations & Completion" subtitle="Live task volume and delivery rate by team">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={execRes.departmentAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                          data={execRes.departmentAnalytics}
                          dataKey="headcount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {(execRes.departmentAnalytics || []).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
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
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Top Performing Team Members</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Click member for Analytics Drill Down</span>
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
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. WORKFORCE REPORT TAB                                               */}
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

              {/* Department Breakdown Table */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department Analytics Matrix</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Click any department to open Department Drill-Down</span>
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
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. ATTENDANCE REPORT TAB                                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-3 animate-fadeIn">
          {attLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Attendance Analytics...</div>
          ) : attRes ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Attendance Rate" metric={attRes.kpis?.attendanceRate} icon={CalendarCheck} color={THEME.emerald} isPercentage />
                <KPICard label="Present Marks" metric={attRes.kpis?.present} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="Late Arrivals" metric={attRes.kpis?.late} icon={Clock} color={THEME.amber} isUp={false} />
                <KPICard label="Absences" metric={attRes.kpis?.absent} icon={CalendarOff} color={THEME.rose} isUp={false} />
              </div>

              {/* Attendance Anomalies */}
              {(attRes.anomalies || []).length > 0 && (
                <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <h3 className="text-xs font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider">Attendance Anomalies & Repeated Lates</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {attRes.anomalies.map((ano, idx) => (
                      <div
                        key={idx}
                        onClick={() => setDrillEmployeeId(ano.employeeId)}
                        className="bg-white dark:bg-[#111C24] p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/30 flex items-center justify-between cursor-pointer hover:border-rose-500 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white">{ano.name}</p>
                          <p className="text-[10px] text-slate-400">{ano.type}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-500/10 text-rose-600">
                          {ano.occurrences}x ({ano.severity})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance Records Table */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Attendance Audit Logs</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Showing latest verified records</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Staff Member</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Punch In</th>
                        <th className="px-4 py-2">Punch Out</th>
                        <th className="px-4 py-2 text-center">Total Hours</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(attRes.records || []).map((a) => (
                        <tr
                          key={a._id}
                          onClick={() => a.employeeId && setDrillEmployeeId(a.employeeId)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{a.employeeName}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{a.date}</td>
                          <td className="px-4 py-2 font-mono text-[11px]">{fmtDateTime(a.punchIn)}</td>
                          <td className="px-4 py-2 font-mono text-[11px]">{fmtDateTime(a.punchOut)}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{a.totalHours ? `${a.totalHours}h` : "—"}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              a.status === "present"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : a.status === "late"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                            }`}>
                              {a.status}
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

              {/* Leave Records */}
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
                        <th className="px-4 py-2">Leave Type</th>
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2 text-center">Days</th>
                        <th className="px-4 py-2">Reason</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(leaveRes.records || []).map((l) => (
                        <tr
                          key={l._id}
                          onClick={() => l.employeeId && setDrillEmployeeId(l.employeeId)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{l.employeeName}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold capitalize">{l.leaveType}</td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{l.days}</td>
                          <td className="px-4 py-2 text-slate-400 truncate max-w-xs">{l.reason || "Personal"}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              l.status === "approved"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Tasks" metric={taskRes.kpis?.totalTasks} icon={CheckSquare} color={THEME.amber} />
                <KPICard label="Completed" metric={taskRes.kpis?.completed} icon={CheckCircle2} color={THEME.emerald} />
                <KPICard label="In Progress" metric={taskRes.kpis?.inProgress} icon={Clock} color={THEME.blue} />
                <KPICard label="Overdue" metric={taskRes.kpis?.overdue} icon={AlertCircle} color={THEME.rose} isUp={false} />
              </div>

              {/* Tasks List */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Operational Tasks Ledger</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{taskRes.records?.length || 0} tasks</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Task Title</th>
                        <th className="px-4 py-2">Assignee</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Priority</th>
                        <th className="px-4 py-2">Due Date</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(taskRes.records || []).map((t) => (
                        <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white truncate max-w-xs">{t.title}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{t.assigneeName}</td>
                          <td className="px-4 py-2 text-slate-500">{t.department}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-0.2 rounded text-[9.5px] font-extrabold uppercase ${
                              t.priority === "urgent" || t.priority === "high" ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}>
                              {t.priority || "normal"}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDate(t.dueDate)}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              t.status === "completed" || t.status === "done"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
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
            </>
          ) : <EmptyState />}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 6. PAYROLL REPORT TAB (Protected)                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "payroll" && (
        <div className="space-y-3 animate-fadeIn">
          {payLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Payroll Analytics...</div>
          ) : payRes ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Gross Payroll" metric={payRes.kpis?.grossPayroll} icon={DollarSign} color={THEME.purple} isCurrency />
                <KPICard label="Net Disbursed" metric={payRes.kpis?.disbursedPaid} icon={CheckCircle2} color={THEME.emerald} isCurrency />
                <KPICard label="Pending Dues" metric={payRes.kpis?.pendingDue} icon={Clock} color={THEME.amber} isCurrency />
                <KPICard label="Deductions" metric={payRes.kpis?.totalDeductions} icon={TrendingDown} color={THEME.rose} isCurrency />
              </div>

              {/* Payroll Register Table */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Payroll Disbursal Register</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{payRes.records?.length || 0} pay slips</span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Staff Member</th>
                        <th className="px-4 py-2">Month & Year</th>
                        <th className="px-4 py-2 text-right">Basic Salary</th>
                        <th className="px-4 py-2 text-right">Net Payable</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(payRes.records || []).map((p) => (
                        <tr
                          key={p._id}
                          onClick={() => p.employeeId && setDrillEmployeeId(p.employeeId)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white">{p.employeeName}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.month} {p.year}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500">{fmtCurrency(p.basicSalary)}</td>
                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{fmtCurrency(p.netSalary)}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              p.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            }`}>
                              {p.status || "Paid"}
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
      {/* 7. PERFORMANCE SCORING TAB (Configurable Weights)                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "performance" && (
        <div className="space-y-3 animate-fadeIn">
          {perfLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Performance Matrix...</div>
          ) : perfRes ? (
            <>
              {/* Header Action Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Dynamic Performance Weights</h3>
                  <p className="text-[10px] text-slate-400">Task Completion ({weights.taskCompletion}%), Attendance ({weights.attendance}%), Productivity ({weights.productivity}%), Punctuality ({weights.punctuality}%), Leave ({weights.leaveDiscipline}%)</p>
                </div>
                <button
                  onClick={() => setShowWeightsModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Sliders size={12} />
                  <span>Configure Weights</span>
                </button>
              </div>

              {/* Performance Rankings Table */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Staff Performance Rankings</h3>
                  <span className="text-[10px] text-slate-400 font-bold">Click member for Analytics Drill Down</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-2">Rank</th>
                        <th className="px-4 py-2">Staff Member</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2 text-center">Tasks Closed</th>
                        <th className="px-4 py-2 text-center">Attendance</th>
                        <th className="px-4 py-2 text-center">Score</th>
                        <th className="px-4 py-2 text-center">Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {(perfRes.rankings || []).map((r, idx) => (
                        <tr
                          key={r._id}
                          onClick={() => setDrillEmployeeId(r._id)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer group"
                        >
                          <td className="px-4 py-2 font-mono font-black text-amber-600 dark:text-amber-400">#{idx + 1}</td>
                          <td className="px-4 py-2 font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                            {r.name}
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">{r.code} · {r.role}</span>
                          </td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.department}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{r.tasksCompleted} / {r.tasksTotal}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold text-cyan-600">{r.attendanceRate}%</td>
                          <td className="px-4 py-2 text-center font-mono font-black text-amber-600">{r.score}%</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              r.tier === "Excellent"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : r.tier === "Good"
                                ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20"
                                : r.tier === "Average"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                            }`}>
                              {r.tier}
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
      {/* 8. AUDIT LEDGER TAB                                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-3 animate-fadeIn">
          {auditLoading ? (
            <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading Audit Ledger...</div>
          ) : auditRes ? (
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Immutable Security Audit Ledger</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{auditRes.totalLogs || 0} events logged</span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Timestamp</th>
                      <th className="px-4 py-2">Performed By</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Module</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2 font-mono">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {(auditRes.records || []).map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{fmtDateTime(a.createdAt)}</td>
                        <td className="px-4 py-2 font-bold text-slate-900 dark:text-white">{a.performedByName}</td>
                        <td className="px-4 py-2 text-slate-500">{a.role}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-2 py-0.2 rounded text-[9.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {a.module}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold text-amber-600 dark:text-amber-400">{a.action}</td>
                        <td className="px-4 py-2 font-mono text-[10.5px] text-slate-400">{a.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <EmptyState />}
        </div>
      )}

      {/* ── EMPLOYEE DRILL DOWN MODAL ─────────────────────────────────────── */}
      {drillEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <User size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Employee Analytics Drill Down</h3>
                  <p className="text-[10px] text-slate-400">Complete performance & operational records</p>
                </div>
              </div>
              <button onClick={() => setDrillEmployeeId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {drillEmpLoading ? (
                <div className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={20} />Loading details...</div>
              ) : drillEmpRes ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-700/80">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{drillEmpRes.employee?.fullName}</h4>
                      <p className="text-xs text-slate-400 font-medium">{drillEmpRes.employee?.employeeCode} · {drillEmpRes.employee?.designationId?.name || "Staff"}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {drillEmpRes.employee?.departmentId?.name || "General"}
                    </span>
                  </div>

                  {/* Task Records */}
                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-500 mb-1.5">Assigned Tasks ({drillEmpRes.tasks?.length || 0})</h5>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {(drillEmpRes.tasks || []).map(t => (
                        <div key={t._id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900/60 text-xs">
                          <span className="font-bold truncate max-w-xs">{t.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : <p className="text-center py-6 text-xs text-slate-400">Employee details not found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── DEPARTMENT DRILL DOWN MODAL ───────────────────────────────────── */}
      {drillDepartmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
                  <Building2 size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Department Analytics Drill Down</h3>
                  <p className="text-[10px] text-slate-400">Department metrics & staff breakdown</p>
                </div>
              </div>
              <button onClick={() => setDrillDepartmentId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {drillDeptLoading ? (
                <div className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={20} />Loading details...</div>
              ) : drillDeptRes ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Headcount</p>
                      <p className="text-base font-black font-mono mt-0.5">{drillDeptRes.employeeCount}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Total Tasks</p>
                      <p className="text-base font-black font-mono mt-0.5">{drillDeptRes.tasksCount}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Completed</p>
                      <p className="text-base font-black font-mono text-emerald-600 mt-0.5">{drillDeptRes.completedTasks}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-black uppercase text-slate-500 mb-1.5">Department Employees ({drillDeptRes.employees?.length || 0})</h5>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {(drillDeptRes.employees || []).map(e => (
                        <div key={e._id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900/60 text-xs">
                          <span className="font-bold">{e.fullName || `${e.firstName || ""} ${e.lastName || ""}`}</span>
                          <span className="text-[10px] text-slate-400">{e.employeeCode} · {e.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : <p className="text-center py-6 text-xs text-slate-400">Department details not found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURE WEIGHTS MODAL ───────────────────────────────────────── */}
      {showWeightsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-amber-500" />
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Configure Performance Weights</h3>
              </div>
              <button onClick={() => setShowWeightsModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {[
                { key: "taskCompletion", label: "Task Completion Rate Weight (%)" },
                { key: "productivity", label: "Productivity Output Weight (%)" },
                { key: "attendance", label: "Attendance Compliance Weight (%)" },
                { key: "punctuality", label: "Punctuality & On-Time Arrival (%)" },
                { key: "leaveDiscipline", label: "Leave & Absence Discipline (%)" },
              ].map(w => (
                <div key={w.key} className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{w.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[w.key]}
                    onChange={(e) => setWeights(prev => ({ ...prev, [w.key]: Number(e.target.value) }))}
                    className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold text-right"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500">
                  Total: <span className={Object.values(weights).reduce((a,b)=>a+b,0) === 100 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                    {Object.values(weights).reduce((a,b)=>a+b,0)}%
                  </span> (Must equal 100%)
                </span>
                <button
                  onClick={() => {
                    if (Object.values(weights).reduce((a,b)=>a+b,0) !== 100) {
                      toast.error("Total weights must equal 100%");
                      return;
                    }
                    setShowWeightsModal(false);
                    queryClient.invalidateQueries({ queryKey: ["biPerformance"] });
                    toast.success("Performance formula weights updated");
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs"
                >
                  Apply Formula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
