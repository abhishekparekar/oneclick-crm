import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getManagerMyTasksApi, getManagerTeamApi, getManagerDashboardApi } from "../../api/managerApi";
import { getDepartmentsApi, getEmployeesApi } from "../../api/companyAdminApi";
import {
  Search, Plus, CheckCircle2, Clock, AlertCircle,
  ChevronRight, X, Download, Tag, User, Users, RefreshCw,
  CalendarClock, LayoutGrid, List, Kanban, ArrowUp, ArrowDown,
  CheckSquare, Sparkles, AlertTriangle, ChevronDown, Calendar,
  FolderKanban, Check, Filter, Building2, Eye, Paperclip, Repeat
} from "lucide-react";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";

const getTaskFormattedDueDate = (t) => {
  const raw = t.dueDate || t.endDate || t.endDateTime || t.finishDate || t.startDate;
  if (!raw) return { text: "No Due Date", isOverdue: false };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { text: "No Due Date", isOverdue: false };
  const formatted = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const isOverdue = !["complete", "completed", "done", "late_complete", "re_complete", "cancelled"].includes((t.status || "").toLowerCase()) && d < new Date();
  return { text: formatted, isOverdue };
};

const getTaskDeptName = (t) => {
  if (t.departmentId?.name) return t.departmentId.name;
  if (t.department?.name) return t.department.name;
  if (typeof t.department === "string") return t.department;
  if (typeof t.departmentId === "string" && t.departmentId.length < 20) return t.departmentId;
  return t.departmentName || "";
};

const STATUS_CONFIG = {
  pending: { label: "Pending", hex: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-500" },
  in_process: { label: "In Process", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  re_pending: { label: "Re-Pending", hex: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/60", dot: "bg-indigo-500" },
  re_in_process: { label: "Re-In Process", hex: "#0891b2", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/60", dot: "bg-cyan-500" },
  complete: { label: "Completed", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  re_complete: { label: "Re-Completed", hex: "#059669", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-200" },
  late_complete: { label: "Late Completed", hex: "#0d9488", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-500" },
  re_late_complete: { label: "Re-Late Completed", hex: "#0f766e", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-600" },
  overdue: { label: "Overdue", hex: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/60", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", hex: "#64748b", bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800/60" },
  medium: { label: "Medium", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800/60" },
  low: { label: "Low", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800/60" },
};

const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${cfg.text} ${cfg.bg} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const s = (status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status?.replace(/_/g, " ")}
    </span>
  );
};

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs group hover:border-amber-500/30 transition-all">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[9.5px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 font-medium truncate">vs {period}</span>
        </div>
      </div>
    </div>
  );
};

export default function ManagerMyTasks() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All Time");
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("openCreate") === "true") {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const { data: teamRes } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: dashRes } = useQuery({
    queryKey: ["managerDashboard"],
    queryFn: () => getManagerDashboardApi().then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: tasksRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerMyTasks"],
    queryFn: () => getManagerMyTasksApi({ limit: 200 }).then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const _raw = tasksRes?.tasks || tasksRes?.data || [];
  const allTasks = Array.isArray(_raw) ? _raw : [];

  const isTaskInDateRange = (task, startStr, endStr) => {
    if (!startStr || !endStr) return true;
    const startD = new Date(startStr);
    const endD = new Date(endStr);
    endD.setHours(23, 59, 59, 999);
    const checkBetween = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= startD && d <= endD;
    };
    return checkBetween(task.dueDate || task.endDateTime || task.startDate);
  };

  const getDates = (tabName) => {
    const now = new Date();
    let start = "", end = "";
    if (tabName === "Today") {
      start = end = now.toISOString().slice(0, 10);
    } else if (tabName === "Yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      start = end = y.toISOString().slice(0, 10);
    } else if (tabName === "This Week") {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      const e = new Date(now);
      e.setDate(s.getDate() + 6);
      start = s.toISOString().slice(0, 10);
      end = e.toISOString().slice(0, 10);
    } else if (tabName === "Last Month") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    } else if (tabName === "This Month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    }
    return { start, end };
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    const { start, end } = getDates(tabName);
    setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    setStatusFilter("");
  };

  const tabFilteredTasks = useMemo(() => allTasks.filter(task => {
    return isTaskInDateRange(task, filters.startDate, filters.endDate);
  }), [allTasks, filters]);

  const filteredTasks = useMemo(() => tabFilteredTasks.filter(task => {
    if (statusFilter && (task.status || "pending").toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = (task.title || "").toLowerCase();
      const id = (task.taskId || "").toLowerCase();
      if (!title.includes(q) && !id.includes(q)) return false;
    }
    return true;
  }), [tabFilteredTasks, statusFilter, search]);

  const totalCount = tabFilteredTasks.length;
  const pendingCount = tabFilteredTasks.filter(t => ["pending", "re_pending"].includes((t.status || "").toLowerCase())).length;
  const inProgressCount = tabFilteredTasks.filter(t => ["in_process", "re_in_process", "in progress"].includes((t.status || "").toLowerCase())).length;
  const completedCount = tabFilteredTasks.filter(t => ["complete", "completed", "done", "re_complete"].includes((t.status || "").toLowerCase())).length;
  const overdueCount = tabFilteredTasks.filter(t => {
    const st = (t.status || "").toLowerCase();
    const done = ["complete", "completed", "done"].includes(st);
    const due = t.dueDate || t.endDateTime ? new Date(t.dueDate || t.endDateTime) : null;
    return !done && due && due < new Date();
  }).length;

  const dateCategories = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month"];
  const categoryCounts = dateCategories.map(cat => {
    let count = 0;
    if (cat === "All Time") {
      count = allTasks.length;
    } else {
      const { start, end } = getDates(cat);
      count = allTasks.filter(t => isTaskInDateRange(t, start, end)).length;
    }
    return { name: cat, count };
  });

  const exportToCSV = () => {
    if (!filteredTasks.length) return alert("No tasks to export!");
    const headers = ["Task ID", "Title", "Status", "Priority", "Deadline"];
    const rows = filteredTasks.map(t => [
      t.taskId || "—",
      t.title || "",
      t.status || "Pending",
      t.priority || "Medium",
      t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB") : ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my_tasks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const rawMembers = teamRes?.teamMembers || teamRes?.data?.teamMembers || teamRes?.team || [];
  const employees = rawMembers.map(m => ({
    _id: m._id,
    name: m.fullName || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
    firstName: m.firstName || m.name,
    lastName: m.lastName || "",
    departmentId: m.departmentId?._id || m.departmentId,
  }));

  const managerProfile = dashRes?.manager || dashRes?.data?.manager || {};
  const allowedDepts = [
    managerProfile.departmentId,
    ...(managerProfile.departmentIds || []),
    ...(managerProfile.accessibleDepartments || []),
  ].filter(Boolean);

  const departments = allowedDepts.map(d => {
    if (typeof d === "object") return { _id: d._id, name: d.name };
    return { _id: d, name: "Manager Department" };
  });

  const kanbanColumns = [
    { key: "pending", title: "Pending", dot: "bg-blue-500", filterFn: t => ["pending", "re_pending"].includes((t.status || "").toLowerCase()) },
    { key: "in_process", title: "In Process", dot: "bg-amber-500", filterFn: t => ["in_process", "re_in_process", "in progress"].includes((t.status || "").toLowerCase()) },
    { key: "completed", title: "Completed", dot: "bg-emerald-500", filterFn: t => ["complete", "completed", "done", "re_complete"].includes((t.status || "").toLowerCase()) },
    { key: "overdue", title: "Overdue", dot: "bg-rose-500", filterFn: t => !["complete", "completed", "done"].includes((t.status || "").toLowerCase()) && (t.dueDate || t.endDateTime) && new Date(t.dueDate || t.endDateTime) < new Date() },
  ];

  return (
    <div className="space-y-3 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckSquare size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                My Assigned Tasks
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-44 sm:w-52">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search my tasks..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode("cards")}
                title="Cards View"
                className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === "cards" ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban Board"
                className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === "kanban" ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Kanban size={13} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Table View"
                className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List size={13} />
              </button>
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Download size={12} className="text-slate-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={13} strokeWidth={3} />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. MICRO-KPI CARDS (Proper Colors: Total=Teal, Pending=Blue, InProcess=Amber, Completed=Green, Overdue=Red) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <KPICard label="Total Tasks" value={totalCount} trend="16.4%" isUp period="last month" strokeColor="#0d9488" Icon={CheckSquare} iconBg="bg-teal-500/10" iconColor="#0d9488"/>
        <KPICard label="Pending" value={pendingCount} trend="7.3%" isUp period="last month" strokeColor="#2563EB" Icon={Clock} iconBg="bg-blue-500/10" iconColor="#2563EB"/>
        <KPICard label="In Process" value={inProgressCount} trend="14.2%" isUp period="last month" strokeColor="#D97706" Icon={RefreshCw} iconBg="bg-amber-500/10" iconColor="#D97706"/>
        <KPICard label="Completed" value={completedCount} trend="21.0%" isUp period="last month" strokeColor="#059669" Icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Overdue" value={overdueCount} trend="2.1%" isUp={false} period="yesterday" strokeColor="#DC2626" Icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="#DC2626"/>
      </div>

      {/* ── 3. DATE TABS & STATUS FILTER STRIP ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {categoryCounts.map((cat, idx) => {
              const isActive = activeTab === cat.name;
              return (
                <button
                  key={idx}
                  onClick={() => handleTabChange(cat.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="ml-1 opacity-80 font-mono">({cat.count})</span>
                </button>
              );
            })}
          </div>

          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-bold flex items-center gap-1 ml-auto cursor-pointer"
            >
              <X size={11} /> Reset Filter
            </button>
          )}
        </div>

        {/* Status Chips with Proper Dedicated Colors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white mr-1">Status:</span>
          
          {/* All Status Pill */}
          <button
            onClick={() => setStatusFilter("")}
            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
              statusFilter === ""
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-2xs"
                : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            }`}
          >
            All ({totalCount})
          </button>

          {/* Pending: Blue */}
          <button
            onClick={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")}
            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 hover:bg-blue-100"
            }`}
          >
            Pending ({pendingCount})
          </button>

          {/* In Process: Amber / Orange */}
          <button
            onClick={() => setStatusFilter(statusFilter === "in_process" ? "" : "in_process")}
            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
              statusFilter === "in_process"
                ? "bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-2xs"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100"
            }`}
          >
            In Process ({inProgressCount})
          </button>

          {/* Completed: Emerald / Green */}
          <button
            onClick={() => setStatusFilter(statusFilter === "complete" ? "" : "complete")}
            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
              statusFilter === "complete"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
            }`}
          >
            Completed ({completedCount})
          </button>

          {/* Overdue: Rose / Red */}
          <button
            onClick={() => setStatusFilter(statusFilter === "overdue" ? "" : "overdue")}
            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
              statusFilter === "overdue"
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100"
            }`}
          >
            Overdue ({overdueCount})
          </button>
        </div>
      </div>

      {/* ── 4. VIEW RENDERERS ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400"><RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-14 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CheckSquare size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-white">No Tasks Found</h3>
          <p className="text-[10.5px] text-slate-400 mt-0.5">No tasks match your active filters.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs cursor-pointer"
          >
            Create Task
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        /* ── KANBAN BOARD ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {kanbanColumns.map(col => {
            const colTasks = filteredTasks.filter(col.filterFn);
            return (
              <div key={col.key} className="bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{col.title}</h3>
                  </div>
                  <span className="text-[10.5px] font-bold font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-0.5">
                  {colTasks.map(t => (
                    <div
                      key={t._id}
                      onClick={() => navigate(`/manager/tasks/${t._id}`)}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-mono font-bold text-amber-600">{t.taskId || "TSK"}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{t.title}</h4>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                        <span className="font-mono">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "No Due Date"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-[#111C24] border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                <tr>
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Task & Scope</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Timeline / Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTasks.map(t => {
                  const deadlineInfo = getTaskFormattedDueDate(t);
                  const deptName = getTaskDeptName(t);
                  const checklistTotal = Array.isArray(t.checklist) ? t.checklist.length : 0;
                  const checklistDone = Array.isArray(t.checklist) ? t.checklist.filter(c => c.isCompleted).length : 0;

                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/manager/tasks/${t._id}`)}
                      className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Task ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          {t.taskId || "TSK"}
                        </span>
                      </td>

                      {/* Title & Scope */}
                      <td className="px-4 py-3 max-w-sm">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            {checklistTotal > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare size={10} className="text-amber-500" />
                                <span>{checklistDone}/{checklistTotal} steps</span>
                              </span>
                            )}
                            {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip size={10} className="text-slate-400" />
                                <span>{t.attachments.length} files</span>
                              </span>
                            )}
                            {t.repeatEnabled && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 font-bold text-[9.5px]">
                                🔁 {t.repeatType || "Routine"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deptName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10.5px]">
                            <Building2 size={11} className="text-slate-400" />
                            <span>{deptName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>

                      {/* Timeline / Due Date */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={deadlineInfo.isOverdue ? "text-rose-500" : "text-slate-400"} />
                          <span className={deadlineInfo.isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300 font-medium"}>
                            {deadlineInfo.text}
                          </span>
                        </div>
                        {t.nextFollowUpDate && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                            Follow-up: {new Date(t.nextFollowUpDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/tasks/${t._id}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredTasks.map(t => {
            const status = (t.status || "pending").toLowerCase();
            const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const deadline = t.dueDate || t.endDateTime ? new Date(t.dueDate || t.endDateTime) : null;
            const isOverdue = deadline && !["complete", "completed", "done", "late_complete", "cancelled"].includes(status) && deadline < new Date();

            return (
              <div
                key={t._id}
                onClick={() => navigate(`/manager/tasks/${t._id}`)}
                className="group relative bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: statusCfg.hex }} />
                <div className="pl-1">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {t.taskId || "TSK"}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>

                  <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {t.title}
                  </h3>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10.5px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <CalendarClock size={11} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                      <span className={`font-mono ${isOverdue ? "text-rose-600 font-bold" : ""}`}>
                        {deadline ? deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "No Date"}
                      </span>
                    </div>

                    <StatusBadge status={t.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        departments={departments}
        employees={employees}
      />
    </div>
  );
}
