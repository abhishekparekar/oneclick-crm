import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getManagerMyTasksApi, getManagerTeamApi, getManagerDashboardApi } from "../../api/managerApi";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  Search, Plus, Filter, CheckCircle, Clock, AlertCircle,
  ChevronRight, X, Download, Tag, User, Users, RefreshCw,
  CalendarClock, Repeat, LayoutGrid, List, ChevronDown, Kanban,
  ArrowUp, ArrowDown, CheckSquare, Sparkles, AlertTriangle, Layers
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pending", hex: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-500" },
  in_process: { label: "In Process", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  re_pending: { label: "Re-Pending", hex: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/60", dot: "bg-indigo-500" },
  re_in_process: { label: "Re-In Process", hex: "#0891b2", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/60", dot: "bg-cyan-500" },
  complete: { label: "Completed", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  re_complete: { label: "Re-Completed", hex: "#059669", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-500" },
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

const AVATAR_COLORS = [
  "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
  "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
  "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900",
];

const MiniAvatar = ({ name, idx = 0, size = "w-6 h-6", textSize = "text-[10px]" }) => (
  <div className={`${size} rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-xs`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${cfg.text} ${cfg.bg} border ${cfg.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const s = (status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status?.replace(/_/g, " ")}
    </span>
  );
};

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-m-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-m-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onClick, activeTab }) => {
  const status = (task.status || "pending").toLowerCase();
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const assignedNames = (task.assignees || task.assignedTo || []).filter(a => a && (a.firstName || a.name || a.fullName));
  const deadline = task.dueDate || task.endDateTime ? new Date(task.dueDate || task.endDateTime) : null;
  const isOverdue = deadline && !["complete", "completed", "done", "late_complete", "cancelled"].includes(status) && deadline < new Date();

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden p-4 min-h-[135px] isolate"
    >
      <div className="absolute top-0 left-0 bottom-0 w-[3px] group-hover:w-[4px] transition-all duration-300 z-20" style={{ backgroundColor: statusCfg.hex }} />
      <div className="flex items-center justify-between mb-2 z-10 relative">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
            {task.taskId || "TASK"}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="flex-shrink-0">
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <h3 className="font-extrabold text-[14px] text-slate-900 dark:text-white leading-snug mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 pr-1 z-10 relative">
        {task.title}
      </h3>
      <div className="mt-auto flex items-end justify-between z-10 relative pt-1">
        <div className="flex flex-col gap-1">
          {deadline && (
            <div className={`flex items-center gap-1 text-[10.5px] font-bold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
              <CalendarClock size={12} strokeWidth={2.2} />
              {deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {isOverdue && <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">Overdue</span>}
            </div>
          )}
          {task.departmentId?.name && (
            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 w-max">
              <Tag size={9} strokeWidth={2.5} /> {task.departmentId.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignedNames.length > 0 ? (
            <div className="flex -space-x-1.5">
              {assignedNames.slice(0, 3).map((a, i) => (
                <MiniAvatar key={a._id || i} name={a.firstName || a.name || a.fullName} idx={i} size="w-6 h-6 ring-2 ring-white dark:ring-[#111C24]" textSize="text-[10px]" />
              ))}
              {assignedNames.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[9px] font-black ring-2 ring-white dark:ring-[#111C24] shadow-xs">
                  +{assignedNames.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-[#111C24] flex items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
              <User size={11} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManagerMyTasks = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All Time");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const navigate = useNavigate();

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
    queryFn: () => getManagerMyTasksApi({ limit: 100 }).then((r) => r.data),
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
    } else if (tabName === "Next Month") {
      start = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
      end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
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

  const statusCounts = useMemo(() => {
    const counts = {};
    tabFilteredTasks.forEach(t => {
      const s = (t.status || "pending").toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [tabFilteredTasks]);

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

  const dateCategories = ["Today", "Yesterday", "This Week", "Last Month", "This Month", "Next Month", "All Time"];
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

  const STATUS_CHIPS = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, ...cfg, count: statusCounts[key] || 0
  }));

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
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            My Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Manage your personal task log and deadlines
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all w-48 shadow-2xs"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs gap-0.5">
            <button onClick={() => setViewMode("cards")} title="Grid View" className={`p-1.5 rounded-lg transition-colors ${viewMode === "cards" ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode("kanban")} title="Kanban View" className={`p-1.5 rounded-lg transition-colors ${viewMode === "kanban" ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
              <Kanban size={13} />
            </button>
            <button onClick={() => setViewMode("list")} title="Table View" className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
              <List size={13} />
            </button>
          </div>

          <button onClick={exportToCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs">
            <Download size={13} className="text-slate-400" /> Export CSV
          </button>

          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition-all">
            <Plus size={14} strokeWidth={2.5} /> New Task
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Total Tasks"     value={totalCount}     trend="12.0%" isUp period="last month" strokeColor="#EAB308" Icon={CheckSquare} iconBg="bg-amber-500/10"  iconColor="#D97706"/>
        <KPICard label="Pending Tasks"   value={pendingCount}   trend="5.2%"  isUp period="last month" strokeColor="#06B6D4" Icon={Clock}        iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="In Progress"     value={inProgressCount} trend="10.1%" isUp period="last month" strokeColor="#8B5CF6" Icon={Sparkles}     iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
        <KPICard label="Completed"       value={completedCount} trend="18.5%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle}  iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Overdue Tasks"   value={overdueCount}   trend="3.0%"  isUp={false} period="yesterday" strokeColor="#F43F5E" Icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="#E11D48"/>
      </div>

      {/* Date Tabs */}
      <div className="flex items-center overflow-x-auto py-1 px-0.5 gap-1.5 hide-scrollbar w-full">
        {categoryCounts.map((cat, idx) => {
          const isActive = activeTab === cat.name;
          return (
            <button key={idx} onClick={() => handleTabChange(cat.name)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 ${isActive ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs" : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <span>{cat.name}</span>
              <span className={`px-1.5 py-[1px] rounded-md text-[10px] font-black ${isActive ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Bar */}
      {STATUS_CHIPS.length > 0 && (
        <div className="w-full z-20 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#111C24] shadow-2xs border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 transition-all duration-300 group"
            >
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest">Filter Status:</span>
              <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-slate-100 ml-0.5">
                {statusFilter ? STATUS_CHIPS.find(c => c.key === statusFilter.toLowerCase())?.label : `All Tasks (${tabFilteredTasks.length})`}
              </span>
              <ChevronDown size={15} className={`text-slate-400 group-hover:text-amber-500 transition-transform duration-300 ml-1 ${statusDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {statusFilter && (
              <button onClick={() => setStatusFilter("")} className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                <X size={12} /> Reset Status Filter
              </button>
            )}
          </div>

          {statusDropdownOpen && (
            <div className="w-full bg-white dark:bg-[#111C24] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2.5 transition-all duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 w-full">
                <button
                  onClick={() => { setStatusFilter(""); setStatusDropdownOpen(false); }}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-150 border ${!statusFilter ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-2xs font-extrabold" : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-amber-500 font-bold"}`}
                >
                  <span className="text-[11.5px] truncate">All Tasks</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ml-1 ${!statusFilter ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/60"}`}>
                    {tabFilteredTasks.length}
                  </span>
                </button>
                {STATUS_CHIPS.slice(0, 5).map(chip => {
                  const isSelected = statusFilter.toLowerCase() === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => { setStatusFilter(prev => prev === chip.key ? "" : chip.key); setStatusDropdownOpen(false); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-150 border ${isSelected ? `${chip.bg} ${chip.text} border-current shadow-2xs font-extrabold ring-1 ring-current` : `${chip.bg} ${chip.text} ${chip.border} hover:shadow-2xs font-bold opacity-90 hover:opacity-100`}`}
                    >
                      <span className="text-[11.5px] truncate">{chip.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ml-1 ${isSelected ? "bg-black/10 dark:bg-white/20 text-current" : "bg-white/80 dark:bg-black/40 text-current border border-current/20"}`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
            <CheckCircle size={26} strokeWidth={2} />
          </div>
          <p className="text-slate-900 dark:text-white font-extrabold text-base">No tasks found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Try adjusting your filters or date range</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task._id} task={task} activeTab={activeTab} onClick={() => navigate(`/manager/tasks/${task._id}`)} />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map(col => {
            const colTasks = filteredTasks.filter(col.filterFn);
            return (
              <div key={col.key} className="flex flex-col bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 min-h-[450px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] hide-scrollbar pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] font-medium text-slate-400">
                      No {col.title.toLowerCase()} tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard key={task._id} task={task} activeTab={activeTab} onClick={() => navigate(`/manager/tasks/${task._id}`)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase flex items-center gap-2">
              <Layers size={14} className="text-amber-500" /> Tasks Pipeline Log
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {filteredTasks.length} tasks
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Task Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTasks.map((task) => {
                  const status = (task.status || "pending").toLowerCase();
                  return (
                    <tr key={task._id} onClick={() => navigate(`/manager/tasks/${task._id}`)} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{task.taskId || "—"}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-[13px]">{task.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        departments={departments}
        employees={employees}
      />
    </div>
  );
};

export default ManagerMyTasks;
