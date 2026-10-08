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
  FolderKanban, Check, Filter, Building2, Eye, Paperclip, Repeat,
  SlidersHorizontal
} from "lucide-react";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";

const formatDateDDMMYYYY = (val) => {
  if (!val) return "—";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const [y, m, d] = val.trim().split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getTaskFormattedDueDate = (t) => {
  if (t.isTemplate) {
    const raw = t.finishDate || t.endDate;
    const until = raw ? `Until ${formatDateDDMMYYYY(raw)}` : "Ongoing";
    return { text: t.repeatType ? `${t.repeatType.toUpperCase()} • ${until}` : until, isOverdue: false };
  }
  const raw = t.endDateTime || t.endDate || t.dueDate || t.finishDate || t.startDate;
  if (!raw) return { text: "No Due Date", isOverdue: false };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { text: "No Due Date", isOverdue: false };
  const formatted = formatDateDDMMYYYY(d);
  const isOverdue = !["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes((t.status || "").toLowerCase()) && Date.now() >= d.getTime();
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

const StatusBadge = ({ status, isTemplate, isActive = true }) => {
  if (isTemplate) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${
        isActive
          ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-violet-500" : "bg-slate-400"}`} />
        {isActive ? "Active (Routine)" : "Stopped"}
      </span>
    );
  }
  const s = (status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status?.replace(/_/g, " ")}
    </span>
  );
};

const CARD_THEMES = {
  blue: {
    baseClass: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40 text-blue-950 dark:text-blue-200",
    activeClass: "bg-blue-100/90 dark:bg-blue-900/40 border-blue-500 dark:border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30 shadow-xs",
    topBar: "bg-blue-500",
    labelText: "text-blue-700 dark:text-blue-300 font-extrabold",
    valueText: "text-blue-600 dark:text-blue-400",
    activeBadge: "bg-blue-600 text-white",
  },
  sky: {
    baseClass: "bg-sky-50/60 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/40 text-sky-950 dark:text-sky-200",
    activeClass: "bg-sky-100/90 dark:bg-sky-900/40 border-sky-500 dark:border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30 shadow-xs",
    topBar: "bg-sky-500",
    labelText: "text-sky-700 dark:text-sky-300 font-extrabold",
    valueText: "text-sky-600 dark:text-sky-400",
    activeBadge: "bg-sky-600 text-white",
  },
  amber: {
    baseClass: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-200",
    activeClass: "bg-amber-100/90 dark:bg-amber-900/40 border-amber-500 dark:border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30 shadow-xs",
    topBar: "bg-amber-500",
    labelText: "text-amber-800 dark:text-amber-300 font-extrabold",
    valueText: "text-amber-600 dark:text-amber-400",
    activeBadge: "bg-amber-600 text-white",
  },
  emerald: {
    baseClass: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200",
    activeClass: "bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs",
    topBar: "bg-emerald-500",
    labelText: "text-emerald-800 dark:text-emerald-300 font-extrabold",
    valueText: "text-emerald-600 dark:text-emerald-400",
    activeBadge: "bg-emerald-600 text-white",
  },
  rose: {
    baseClass: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 text-rose-950 dark:text-rose-200",
    activeClass: "bg-rose-100/90 dark:bg-rose-900/40 border-rose-500 dark:border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30 shadow-xs",
    topBar: "bg-rose-500",
    labelText: "text-rose-800 dark:text-rose-300 font-extrabold",
    valueText: "text-rose-600 dark:text-rose-400",
    activeBadge: "bg-rose-600 text-white",
  },
  purple: {
    baseClass: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-900/40 text-purple-950 dark:text-purple-200",
    activeClass: "bg-purple-100/90 dark:bg-purple-900/40 border-purple-500 dark:border-purple-500 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/30 shadow-xs",
    topBar: "bg-purple-500",
    labelText: "text-purple-800 dark:text-purple-300 font-extrabold",
    valueText: "text-purple-600 dark:text-purple-400",
    activeBadge: "bg-purple-600 text-white",
  },
};

const KPICard = ({ label, value, theme = "blue", onClick, isActive = false }) => {
  const cfg = CARD_THEMES[theme] || CARD_THEMES.blue;
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 select-none p-2.5 sm:p-3 flex flex-col justify-between min-h-[76px] ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      } ${
        isActive ? cfg.activeClass : cfg.baseClass
      }`}
    >
      {/* Top Accent Strip with theme color */}
      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />

      {/* Header Row: Label & Active Badge */}
      <div className="flex items-center justify-between gap-1 mb-1 pt-0.5">
        <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider truncate font-extrabold ${cfg.labelText}`}>
          {label}
        </span>
        {isActive && (
          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.activeBadge} shadow-2xs`}>
            Active
          </span>
        )}
      </div>

      {/* Value Row: Bold Colored Count */}
      <div>
        <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${cfg.valueText}`}>
          {value}
        </h3>
      </div>
    </div>
  );
};

export default function ManagerMyTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Today");
  const navigate = useNavigate();

  // Helper: local YYYY-MM-DD string (avoids UTC timezone offset bugs)
  const toLocalDateStr = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("openCreate") === "true") {
      setIsCreateOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    if (searchParams.get("create") || searchParams.get("openCreate")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  };

  // Initialize with today's date range to match default "Today" tab
  const todayStr = toLocalDateStr(new Date());
  const [filters, setFilters] = useState({
    departmentId: "",
    priority: "",
    deadlineFilter: "",
    startDate: todayStr,
    endDate: todayStr,
    overdue: false,
    status: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [tempTab, setTempTab] = useState(activeTab);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const handleOpenFilters = () => {
    setTempFilters(filters);
    setTempTab(activeTab);
    setShowFiltersDropdown(prev => !prev);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setActiveTab(tempTab);
    setShowFiltersDropdown(false);
  };

  const handleClearFilters = () => {
    const cleared = {
      departmentId: "",
      priority: "",
      deadlineFilter: "",
      startDate: "",
      endDate: "",
      overdue: false,
      status: "",
    };
    setFilters(cleared);
    setTempFilters(cleared);
    setStatusFilter("");
    setActiveTab("All Time");
    setTempTab("All Time");
    setShowFiltersDropdown(false);
  };

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
    queryFn: async () => {
      const [regRes, tplRes] = await Promise.all([
        getManagerMyTasksApi({ limit: 1000 }).catch(() => ({ data: { data: [] } })),
        getManagerMyTasksApi({ isTemplate: true, limit: 1000 }).catch(() => ({ data: { data: [] } }))
      ]);
      const reg = regRes.data?.data || regRes.data?.tasks || [];
      const tpls = (tplRes.data?.data || tplRes.data?.tasks || []).map((t) => ({
        ...t,
        isTemplate: true,
        repeatEnabled: true,
        status: t.status || (t.isActive ? "active" : "stopped"),
      }));
      return { data: [...reg, ...tpls] };
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const _raw = tasksRes?.tasks || tasksRes?.data || [];
  const allTasks = Array.isArray(_raw) ? _raw : [];

  const isTaskInDateRange = (task, startStr, endStr) => {
    if (!startStr || !endStr) return true;
    // Parse as LOCAL midnight (avoid UTC timezone offset shifting the date)
    const [sy, sm, sd] = startStr.split("-").map(Number);
    const [ey, em, ed] = endStr.split("-").map(Number);
    const startD = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endD = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const checkBetween = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d >= startD && d <= endD;
    };
    // Match if ANY relevant date field falls in the range
    return (
      checkBetween(task.startDate || task.startDateTime) ||
      checkBetween(task.dueDate || task.endDate || task.endDateTime) ||
      checkBetween(task.nextFollowUpDate)
    );
  };

  const getDates = (tabName) => {
    const now = new Date();
    let start = "", end = "";
    if (tabName === "Today") {
      start = end = toLocalDateStr(now);
    } else if (tabName === "Yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      start = end = toLocalDateStr(y);
    } else if (tabName === "This Week") {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      start = toLocalDateStr(s);
      end = toLocalDateStr(e);
    } else if (tabName === "Last Month") {
      start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (tabName === "This Month") {
      start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      end = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (tabName === "Next Month") {
      start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      end = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 2, 0));
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
    if (activeTab === "Recurring") {
      if (!task.isTemplate && !task.isRecurring && !task.isGeneratedFromTemplate && !task.parentTemplateId) return false;
    } else {
      if (task.isTemplate) return false;
      if (activeTab === "Re Open" && !["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes((task.status || "").toLowerCase())) return false;
    }

    if (activeTab !== "Recurring" && !isTaskInDateRange(task, filters.startDate, filters.endDate)) return false;

    if (filters.departmentId) {
      const dId = task.departmentId?._id || task.departmentId || task.department?._id || task.department;
      const dName = task.departmentId?.name || task.department?.name || task.departmentName || getTaskDeptName(task);
      const selectedDept = departments.find(d => String(d._id) === String(filters.departmentId));
      const matchId = String(dId) === String(filters.departmentId);
      const matchName = Boolean(selectedDept?.name && dName && selectedDept.name.trim().toLowerCase() === dName.trim().toLowerCase());
      if (!matchId && !matchName) return false;
    }

    if (filters.priority) {
      if ((task.priority || "medium").toLowerCase() !== filters.priority.toLowerCase()) return false;
    }

    if (filters.deadlineFilter) {
      // Collect ALL relevant dates: start, followup, end
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

      const candidateDates = [
        task.startDateTime, task.startDate,
        task.nextFollowUpDate, task.followUpDate,
        task.endDateTime, task.endDate, task.dueDate,
      ].filter(Boolean).map(v => new Date(v));

      const anyInRange = (start, end) => candidateDates.some(d => d >= start && d <= end);

      if (filters.deadlineFilter === "today") {
        if (!anyInRange(startOfToday, endOfToday)) return false;
      } else if (filters.deadlineFilter === "tomorrow") {
        if (!anyInRange(startOfTomorrow, endOfTomorrow)) return false;
      } else if (filters.deadlineFilter === "overdue") {
        const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes((task.status || "").toLowerCase());
        const raw = task.dueDate || task.endDateTime || task.endDate;
        const d = raw ? new Date(raw) : null;
        if (isDone || !d || d >= now) return false;
      }
    }

    if (filters.overdue) {
      const st = (task.status || "").toLowerCase();
      const done = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(st);
      const due = task.dueDate || task.endDateTime ? new Date(task.dueDate || task.endDateTime) : null;
      if (done || !due || due >= new Date()) return false;
    }

    return true;
  }), [allTasks, activeTab, filters]);

  const activeStatus = statusFilter || filters.status || "";
  const filteredTasks = useMemo(() => tabFilteredTasks.filter(task => {
    if (activeStatus) {
      const s = (task.status || "pending").toLowerCase();
      // "overdue" pill: match tasks that are past due and not completed
      if (activeStatus === "overdue") {
        const done = ["complete", "completed", "done", "late_complete", "re_late_complete", "re_complete", "cancelled"].includes(s);
        const due = task.dueDate || task.endDateTime || task.endDate;
        const isOverdue = !done && due && new Date(due) < new Date();
        if (!isOverdue) return false;
      } else if (activeStatus === "re_open" || activeStatus === "re_pending,re_in_process,re_complete,re_late_complete") {
        if (!["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(s)) return false;
      } else {
        if (s !== activeStatus.toLowerCase()) return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      const title = (task.title || "").toLowerCase();
      const id = (task.taskId || "").toLowerCase();
      const dept = (getTaskDeptName(task) || "").toLowerCase();
      if (!title.includes(q) && !id.includes(q) && !dept.includes(q)) return false;
    }
    return true;
  }), [tabFilteredTasks, activeStatus, search]);

  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      in_process: 0,
      re_pending: 0,
      re_in_process: 0,
      complete: 0,
      re_complete: 0,
      late_complete: 0,
      re_late_complete: 0,
      overdue: 0,
      cancelled: 0,
    };
    const now = new Date();
    tabFilteredTasks.forEach(t => {
      const s = (t.status || "pending").toLowerCase();
      // Count as overdue if not completed and past due date
      const done = ["complete", "completed", "done", "late_complete", "re_late_complete", "re_complete", "cancelled"].includes(s);
      const due = t.dueDate || t.endDateTime || t.endDate;
      if (!done && due && new Date(due) < now) {
        counts.overdue = (counts.overdue || 0) + 1;
      } else {
        counts[s] = (counts[s] || 0) + 1;
      }
    });
    return counts;
  }, [tabFilteredTasks]);

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
  const recurringTasksList = useMemo(() => {
    return allTasks.filter(t => {
      if (!t.isTemplate && !t.isRecurring && !t.isGeneratedFromTemplate && !t.parentTemplateId) return false;
      if (filters.departmentId) {
        const dId = (t.departmentId?._id || t.departmentId || t.department?._id || t.department || "").toString();
        const dName = t.departmentId?.name || t.department?.name || t.departmentName || getTaskDeptName(t);
        const selectedDept = taskDepts.find(d => String(d._id) === String(filters.departmentId));
        const matchId = dId === String(filters.departmentId);
        const matchName = Boolean(selectedDept?.name && dName && selectedDept.name.trim().toLowerCase() === dName.trim().toLowerCase());
        if (!matchId && !matchName) return false;
      }
      return true;
    });
  }, [allTasks, filters.departmentId, taskDepts]);
  const recurringCount = recurringTasksList.length;

  const dateCategories = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month", "Next Month", "Re Open", "Recurring"];
  const categoryCounts = dateCategories.map(cat => {
    let count = 0;
    if (cat === "All Time") {
      count = allTasks.length;
    } else if (cat === "Re Open") {
      count = allTasks.filter(t => ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes((t.status || "").toLowerCase())).length;
    } else if (cat === "Recurring") {
      count = allTasks.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    } else {
      const { start, end } = getDates(cat);
      count = allTasks.filter(t => isTaskInDateRange(t, start, end)).length;
    }
    return { name: cat, count };
  });

  const activeCustomFiltersCount = useMemo(() => {
    const hasTimeframe = activeTab && activeTab !== "All Time" ? 1 : 0;
    return [
      filters.departmentId,
      filters.priority,
      filters.deadlineFilter,
      filters.startDate,
      filters.endDate,
      filters.overdue,
      statusFilter || filters.status,
      hasTimeframe
    ].filter(Boolean).length;
  }, [filters, statusFilter, activeTab]);

  const exportToCSV = () => {
    if (!filteredTasks.length) return alert("No tasks to export!");
    const headers = ["Task ID", "Title", "Status", "Priority", "Deadline"];
    const rows = filteredTasks.map(t => [
      t.taskId || "—",
      t.title || "",
      t.status || "Pending",
      t.priority || "Medium",
      t.dueDate ? formatDateDDMMYYYY(t.dueDate) : ""
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
    ...m,
    _id: m._id,
    name: m.fullName || `${m.firstName || ""} ${m.lastName || ""}`.trim(),
    firstName: m.firstName || m.name,
    lastName: m.lastName || "",
    departmentId: m.departmentId?._id || m.departmentId,
  }));

  const managerProfile = dashRes?.manager || dashRes?.data?.manager || {};
  const allowedDepts = useMemo(() => [
    managerProfile.departmentId,
    ...(managerProfile.departmentIds || []),
    ...(managerProfile.accessibleDepartments || []),
  ].filter(Boolean), [managerProfile.departmentId, managerProfile.departmentIds, managerProfile.accessibleDepartments]);

  const departments = useMemo(() => {
    const map = new Map();
    // 1. Process manager's departments
    allowedDepts.forEach(d => {
      if (!d) return;
      const id = typeof d === "object" ? String(d._id || d.id || "") : String(d);
      const name = (typeof d === "object" && d.name ? d.name : "").trim();
      const displayName = name || "Manager Department";
      const normKey = displayName.toLowerCase();
      if (!map.has(normKey)) {
        map.set(normKey, { _id: id || normKey, name: displayName });
      }
    });

    // 2. Also incorporate any departments from allTasks if not yet present
    allTasks.forEach(t => {
      const d = t.departmentId || t.department;
      let id = "";
      let name = "";
      if (d && typeof d === "object") {
        id = String(d._id || d.id || "");
        name = (d.name || "").trim();
      } else if (typeof d === "string") {
        name = d.trim();
      }
      if (!name && t.departmentName) {
        name = t.departmentName.trim();
      }
      if (name) {
        const normKey = name.toLowerCase();
        if (!map.has(normKey)) {
          map.set(normKey, { _id: id || normKey, name });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allowedDepts, allTasks]);

  const kanbanColumns = [
    { key: "pending", title: "Pending", dot: "bg-blue-500", filterFn: t => ["pending", "re_pending"].includes((t.status || "").toLowerCase()) },
    { key: "in_process", title: "In Process", dot: "bg-amber-500", filterFn: t => ["in_process", "re_in_process", "in progress"].includes((t.status || "").toLowerCase()) },
    { key: "completed", title: "Completed", dot: "bg-emerald-500", filterFn: t => ["complete", "completed", "done", "re_complete"].includes((t.status || "").toLowerCase()) },
    { key: "overdue", title: "Overdue", dot: "bg-rose-500", filterFn: t => !["complete", "completed", "done"].includes((t.status || "").toLowerCase()) && (t.dueDate || t.endDateTime) && new Date(t.dueDate || t.endDateTime) < new Date() },
  ];

  return (
    <div className="space-y-2.5 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckSquare size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                My Tasks
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Track personal tasks, deadlines, and progress
              </p>
            </div>
          </div>

          {/* Right: Unified Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Search Box - Compact & Aligned */}
            <div className="relative w-44 sm:w-48 lg:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search my tasks..."
                className="w-full pl-8 pr-7 h-8 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View Switcher - Icon Only */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 h-8 gap-0.5">
              <button
                onClick={() => setViewMode("cards")}
                title="Grid Cards View"
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban Board View"
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Kanban size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Table List View"
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <List size={14} />
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center w-8 h-8 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Export tasks to CSV"
            >
              <Download size={13} className="text-slate-500 dark:text-slate-400" />
            </button>

            {/* Filters Toggle Button */}
            <button
              onClick={handleOpenFilters}
              className={`flex items-center gap-1.5 px-3 h-8 border rounded-lg text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer ${
                showFiltersDropdown || activeCustomFiltersCount > 0
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title="Filter Tasks"
            >
              <SlidersHorizontal size={12} className={showFiltersDropdown || activeCustomFiltersCount > 0 ? "text-white" : "text-blue-600 dark:text-blue-400"} />
              <span>{showFiltersDropdown ? "Hide Filters" : "Filters"}</span>
              {activeCustomFiltersCount > 0 && (
                <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] rounded-full font-black ml-0.5 ${
                  showFiltersDropdown || activeCustomFiltersCount > 0 ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                }`}>
                  {activeCustomFiltersCount}
                </span>
              )}
              <ChevronDown size={11} className={`transition-transform duration-200 ${showFiltersDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Refresh Data */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Refresh Tasks"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin text-blue-600" : "text-slate-500 dark:text-slate-400"} />
            </button>

            {/* Primary Action Button (+ Add Task) */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={13} strokeWidth={3} />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── COMPACT INLINE FILTER PANEL ─────────────────────────────────────── */}
      {showFiltersDropdown && (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-visible">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-600/10 flex items-center justify-center">
                <SlidersHorizontal size={11} className="text-blue-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Filters &amp; Search</span>
              {activeCustomFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-full">{activeCustomFiltersCount} active</span>
              )}
            </div>
            <button
              onClick={() => setShowFiltersDropdown(false)}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <X size={10} /> Hide Filters
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Row 1: Dropdowns ─ Department | Task Status | Priority | Deadline | Timeframe */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
              {/* Department */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  tempFilters.departmentId ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}>
                  <Building2 size={11} className={tempFilters.departmentId ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Department</span>
                  {tempFilters.departmentId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${
                      tempFilters.departmentId
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                    }`}
                    value={filters.departmentId || tempFilters.departmentId || ""}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      const updated = { ...filters, departmentId: newDeptId };
                      setFilters(updated);
                      setTempFilters(updated);
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Task Status */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  (statusFilter || filters.status || tempFilters.status) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}>
                  <Clock size={11} className={(statusFilter || filters.status || tempFilters.status) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Task Status</span>
                  {(statusFilter || filters.status || tempFilters.status) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${
                      (statusFilter || filters.status || tempFilters.status)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                    }`}
                    value={statusFilter || filters.status || tempFilters.status || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setStatusFilter(val);
                      setFilters(prev => ({ ...prev, status: val }));
                      setTempFilters(prev => ({ ...prev, status: val }));
                    }}
                  >
                    <option value="">All Statuses ({totalCount})</option>
                    <option value="pending">Pending ({statusCounts.pending || 0})</option>
                    <option value="in_process">In Process ({statusCounts.in_process || 0})</option>
                    <option value="re_pending">Re-Pending ({statusCounts.re_pending || 0})</option>
                    <option value="re_in_process">Re-In Process ({statusCounts.re_in_process || 0})</option>
                    <option value="complete">Completed ({statusCounts.complete || 0})</option>
                    <option value="re_complete">Re-Completed ({statusCounts.re_complete || 0})</option>
                    <option value="late_complete">Late Completed ({statusCounts.late_complete || 0})</option>
                    <option value="re_late_complete">Re-Late Completed ({statusCounts.re_late_complete || 0})</option>
                    <option value="overdue">🚨 Overdue ({statusCounts.overdue || 0})</option>
                    <option value="cancelled">Cancelled ({statusCounts.cancelled || 0})</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  (filters.priority || tempFilters.priority) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}>
                  <AlertTriangle size={11} className={(filters.priority || tempFilters.priority) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Priority</span>
                  {(filters.priority || tempFilters.priority) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${
                      (filters.priority || tempFilters.priority)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                    }`}
                    value={filters.priority || tempFilters.priority || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setFilters(prev => ({ ...prev, priority: val }));
                      setTempFilters(prev => ({ ...prev, priority: val }));
                    }}
                  >
                    <option value="">All Priority</option>
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  (filters.deadlineFilter || tempFilters.deadlineFilter) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}>
                  <CalendarClock size={11} className={(filters.deadlineFilter || tempFilters.deadlineFilter) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Deadline</span>
                  {(filters.deadlineFilter || tempFilters.deadlineFilter) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${
                      (filters.deadlineFilter || tempFilters.deadlineFilter)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                    }`}
                    value={filters.deadlineFilter || tempFilters.deadlineFilter || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setFilters(prev => ({ ...prev, deadlineFilter: val }));
                      setTempFilters(prev => ({ ...prev, deadlineFilter: val }));
                    }}
                  >
                    <option value="">All Deadlines</option>
                    <option value="today">📅 Due Today</option>
                    <option value="tomorrow">⏳ Due Tomorrow</option>
                    <option value="overdue">🚨 Overdue</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Timeframe */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  (activeTab && activeTab !== "All Time") ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                }`}>
                  <Calendar size={11} className={(activeTab && activeTab !== "All Time") ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Timeframe</span>
                  {(activeTab && activeTab !== "All Time") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${
                      (activeTab && activeTab !== "All Time")
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                    }`}
                    value={activeTab || tempTab || "All Time"}
                    onChange={e => {
                      const selectedTab = e.target.value;
                      setActiveTab(selectedTab);
                      setTempTab(selectedTab);
                      if (selectedTab === "Recurring") {
                        const updated = { startDate: "", endDate: "" };
                        setStatusFilter("");
                        setFilters(prev => ({ ...prev, ...updated }));
                        setTempFilters(prev => ({ ...prev, ...updated }));
                      } else if (selectedTab === "Re Open") {
                        const updated = { startDate: "", endDate: "" };
                        setStatusFilter("re_open");
                        setFilters(prev => ({ ...prev, ...updated }));
                        setTempFilters(prev => ({ ...prev, ...updated }));
                      } else if (selectedTab !== "Custom") {
                        const { start, end } = getDates(selectedTab);
                        setFilters(prev => ({ ...prev, startDate: start || "", endDate: end || "" }));
                        setTempFilters(prev => ({ ...prev, startDate: start || "", endDate: end || "" }));
                      }
                    }}
                  >
                    {categoryCounts.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} {cat.count > 0 ? `(${cat.count})` : ""}
                      </option>
                    ))}
                    <option value="Custom">Custom Date Range</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Date Range & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="flex-1">
                  <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    (filters.startDate || filters.endDate || tempFilters.startDate || tempFilters.endDate) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                    <CalendarClock size={11} className={(filters.startDate || filters.endDate || tempFilters.startDate || tempFilters.endDate) ? "text-blue-600" : "text-slate-400"} />
                    <span>Custom Date Range</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      className={`flex-1 text-xs h-8 px-2.5 outline-none rounded-lg cursor-pointer transition-all ${
                        (filters.startDate || tempFilters.startDate)
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                          : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium"
                      }`}
                      value={filters.startDate || tempFilters.startDate || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setActiveTab("Custom");
                        setTempTab("Custom");
                        setFilters(prev => ({ ...prev, startDate: val }));
                        setTempFilters(prev => ({ ...prev, startDate: val }));
                      }}
                    />
                    <span className="text-slate-400 text-xs font-bold shrink-0">→</span>
                    <input
                      type="date"
                      className={`flex-1 text-xs h-8 px-2.5 outline-none rounded-lg cursor-pointer transition-all ${
                        (filters.endDate || tempFilters.endDate)
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                          : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium"
                      }`}
                      value={filters.endDate || tempFilters.endDate || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setActiveTab("Custom");
                        setTempTab("Custom");
                        setFilters(prev => ({ ...prev, endDate: val }));
                        setTempFilters(prev => ({ ...prev, endDate: val }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end">
                <button
                  onClick={handleClearFilters}
                  className="px-3 h-8 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 h-8 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal size={11} /> <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. MICRO-KPI CARDS (7 Cards: Total, Pending, In Process, Completed, Overdue, Re-Open, Recurring) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        <KPICard
          label="Total Tasks"
          value={totalCount}
          theme="blue"
          onClick={() => {
            setStatusFilter("");
            setFilters(prev => ({ ...prev, status: "" }));
            setTempFilters(prev => ({ ...prev, status: "" }));
            if (activeTab === "Recurring") {
              setActiveTab("All Time");
              setTempTab("All Time");
            }
          }}
          isActive={!statusFilter && !filters.status && activeTab !== "Recurring"}
        />
        <KPICard
          label="Pending"
          value={pendingCount}
          theme="sky"
          onClick={() => {
            const next = (statusFilter === "pending" || filters.status === "pending") ? "" : "pending";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "pending" || filters.status === "pending"}
        />
        <KPICard
          label="In Process"
          value={inProgressCount}
          theme="amber"
          onClick={() => {
            const next = (statusFilter === "in_process" || filters.status === "in_process") ? "" : "in_process";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "in_process" || filters.status === "in_process"}
        />
        <KPICard
          label="Completed"
          value={completedCount}
          theme="emerald"
          onClick={() => {
            const next = (statusFilter === "complete" || filters.status === "complete") ? "" : "complete";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "complete" || filters.status === "complete"}
        />
        <KPICard
          label="Overdue"
          value={overdueCount}
          theme="rose"
          onClick={() => {
            const next = (statusFilter === "overdue" || filters.status === "overdue") ? "" : "overdue";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "overdue" || filters.status === "overdue"}
        />
        <KPICard
          label="Reopen Tasks"
          value={reopenCount}
          theme="purple"
          onClick={() => {
            const isCur = statusFilter === "re_open" || filters.status === "re_pending,re_in_process,re_complete,re_late_complete";
            const nextSt = isCur ? "" : "re_open";
            const nextFilterSt = isCur ? "" : "re_pending,re_in_process,re_complete,re_late_complete";
            setStatusFilter(nextSt);
            setFilters(prev => ({ ...prev, status: nextFilterSt }));
            setTempFilters(prev => ({ ...prev, status: nextFilterSt }));
          }}
          isActive={statusFilter === "re_open" || filters.status === "re_pending,re_in_process,re_complete,re_late_complete"}
        />
        <KPICard
          label="Recurring Tasks"
          value={recurringCount}
          Icon={Repeat}
          theme="violet"
          onClick={() => {
            if (activeTab === "Recurring") {
              setActiveTab("All Time");
              setTempTab("All Time");
              setFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
            } else {
              setActiveTab("Recurring");
              setTempTab("Recurring");
              setStatusFilter("");
              setFilters(prev => ({ ...prev, status: "", startDate: "", endDate: "" }));
            }
          }}
          isActive={activeTab === "Recurring"}
        />
      </div>

      {/* ── Quick Filter Tabs Bar ── */}
      <div className="bg-white dark:bg-[#111C24] p-1.5 sm:px-3 sm:py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
          {[
            { id: "Today", label: "Today", count: categoryCounts.find(c => c.name === "Today")?.count || 0 },
            { id: "This Week", label: "This Week", count: categoryCounts.find(c => c.name === "This Week")?.count || 0 },
            { id: "This Month", label: "This Month", count: categoryCounts.find(c => c.name === "This Month")?.count || 0 },
            { id: "All Time", label: "All Tasks", count: allTasks.filter(t => !t.isTemplate).length },
            { id: "Recurring", label: "Recurring Tasks", count: recurringCount, icon: Repeat, isSpecial: true },
          ].map(tab => {
            const isTabActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "Recurring") {
                    setActiveTab("Recurring");
                    setTempTab("Recurring");
                    setStatusFilter("");
                    setFilters(prev => ({ ...prev, status: "", startDate: "", endDate: "" }));
                  } else {
                    handleTabChange(tab.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? tab.isSpecial
                      ? "bg-violet-600 text-white shadow-xs ring-2 ring-violet-500/30"
                      : "bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30"
                    : tab.isSpecial
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {TabIcon && <TabIcon size={12} className={isTabActive ? "text-white" : "text-violet-600 dark:text-violet-400"} />}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                  isTabActive ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>


      {/* ── Active Filters Bar ────────────────────────────────────────── */}
      {activeCustomFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 py-1.5 px-3 rounded-xl text-xs shadow-2xs">
          <span className="font-extrabold text-blue-950 dark:text-blue-200 text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Filter size={11} className="text-blue-600 dark:text-blue-400" /> Active Filters:
          </span>

          {activeTab && activeTab !== "All Time" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              Timeframe: {activeTab}
              <button onClick={() => { setActiveTab("All Time"); setTempTab("All Time"); setFilters(prev => ({ ...prev, startDate: "", endDate: "" })); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {(statusFilter || filters.status) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Status: {(statusFilter || filters.status).replace(/_/g, " ")}
              <button onClick={() => { setStatusFilter(""); setFilters(prev => ({ ...prev, status: "" })); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.departmentId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              Dept: {departments.find(d => String(d._id) === String(filters.departmentId))?.name || "Selected"}
              <button onClick={() => setFilters(prev => ({ ...prev, departmentId: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.priority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Priority: {filters.priority}
              <button onClick={() => setFilters(prev => ({ ...prev, priority: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.deadlineFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Deadline: {filters.deadlineFilter.replace(/_/g, " ")}
              <button onClick={() => setFilters(prev => ({ ...prev, deadlineFilter: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.startDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              From: {formatDateDDMMYYYY(filters.startDate)}
              <button onClick={() => { setFilters(prev => ({ ...prev, startDate: "" })); setActiveTab("All Time"); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.endDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              To: {formatDateDDMMYYYY(filters.endDate)}
              <button onClick={() => { setFilters(prev => ({ ...prev, endDate: "" })); setActiveTab("All Time"); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          <button
            onClick={handleClearFilters}
            className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline ml-auto cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── 4. VIEW RENDERERS ──────────────────────────────────────────────── */}
      <div className="min-h-[380px]">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-blue-500/25 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading your tasks...</p>
              <p className="text-xs text-slate-400">Please wait while we fetch your assigned tasks and deliverables</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-14 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CheckSquare size={28} className="mx-auto mb-2 opacity-40 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">No Tasks Found</h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">No tasks match your active filters.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs cursor-pointer shadow-2xs transition-colors"
            >
              Add Task
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
                      className="p-2.5 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-mono font-bold text-blue-600 dark:text-blue-400">{t.taskId || "TSK"}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{t.title}</h4>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                        <span className="font-mono">{t.dueDate ? formatDateDDMMYYYY(t.dueDate) : "No Due Date"}</span>
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
                      className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Task ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md text-[11px]">
                          {t.taskId || "TSK"}
                        </span>
                      </td>

                      {/* Title & Scope */}
                      <td className="px-4 py-3 max-w-sm">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            {checklistTotal > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare size={10} className="text-blue-600" />
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
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 font-bold text-[9.5px]">
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
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            Follow-up: {formatDateDDMMYYYY(t.nextFollowUpDate)}, {new Date(t.nextFollowUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={t.status} isTemplate={t.isTemplate} isActive={t.isActive} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/tasks/${t._id}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
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
            const rawDue = t.endDateTime || t.endDate || t.dueDate;
            const deadline = rawDue ? new Date(rawDue) : null;
            const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(status);
            const isOverdue = !t.isTemplate && deadline && !isNaN(deadline.getTime()) && !isDone && Date.now() >= deadline.getTime();

            return (
              <div
                key={t._id}
                onClick={() => navigate(`/manager/tasks/${t._id}`)}
                className="group relative bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: statusCfg.hex }} />
                <div className="pl-1">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {t.taskId || "TSK"}
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>

                  <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {t.title}
                  </h3>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10.5px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <CalendarClock size={11} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                      <span className={`font-mono ${isOverdue ? "text-rose-600 font-bold" : ""}`}>
                        {t.isTemplate ? (t.repeatType ? t.repeatType.toUpperCase() : "Recurring") : (deadline ? formatDateDDMMYYYY(deadline) : "No Date")}
                      </span>
                    </div>

                    <StatusBadge status={t.status} isTemplate={t.isTemplate} isActive={t.isActive} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Legacy Task Create Modal */}
      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        departments={departments}
        employees={employees}
      />
    </div>
  );
}
