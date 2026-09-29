import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminMyTasksApi,
  getDepartmentsApi,
  getEmployeesApi,
  updateTaskStatusApi,
  toggleTaskChecklistApi,
  createTaskApi,
} from "../../api/companyAdminApi";
import { useAuth } from "../../context/AuthContext";
import {
  Search, Plus, CheckCircle2, Clock, AlertCircle,
  ChevronRight, X, Download, Tag, User, Users, RefreshCw,
  CalendarClock, LayoutGrid, List, Kanban, ArrowUp, ArrowDown,
  CheckSquare, Sparkles, AlertTriangle, ChevronDown, Calendar,
  FolderKanban, Check, Filter, Building2, Eye, Paperclip, Repeat,
  SlidersHorizontal, CheckCheck
} from "lucide-react";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";
import TaskStatusModal from "../../components/tasks/TaskStatusModal";

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
  urgent: { label: "Urgent", bg: "bg-rose-100 dark:bg-rose-900/50", text: "text-rose-800 dark:text-rose-300", dot: "bg-rose-600", border: "border-rose-300 dark:border-rose-700" },
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
  indigo: {
    baseClass: "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200",
    activeClass: "bg-indigo-100/90 dark:bg-indigo-900/40 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-xs",
    topBar: "bg-indigo-500",
    labelText: "text-indigo-700 dark:text-indigo-300 font-extrabold",
    valueText: "text-indigo-600 dark:text-indigo-400",
    activeBadge: "bg-indigo-600 text-white",
  },
  emerald: {
    baseClass: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200",
    activeClass: "bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs",
    topBar: "bg-emerald-500",
    labelText: "text-emerald-800 dark:text-emerald-300 font-extrabold",
    valueText: "text-emerald-600 dark:text-emerald-400",
    activeBadge: "bg-emerald-600 text-white",
  },
  teal: {
    baseClass: "bg-teal-50/60 dark:bg-teal-950/20 border-teal-200/80 dark:border-teal-900/40 text-teal-950 dark:text-teal-200",
    activeClass: "bg-teal-100/90 dark:bg-teal-900/40 border-teal-500 dark:border-teal-500 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500/30 shadow-xs",
    topBar: "bg-teal-500",
    labelText: "text-teal-800 dark:text-teal-300 font-extrabold",
    valueText: "text-teal-600 dark:text-teal-400",
    activeBadge: "bg-teal-600 text-white",
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
      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />
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
      <div>
        <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${cfg.valueText}`}>
          {value}
        </h3>
      </div>
    </div>
  );
};

export default function CompanyMyTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Today");
  const [selectedTaskForStatus, setSelectedTaskForStatus] = useState(null);
  const [activeChecklistTaskId, setActiveChecklistTaskId] = useState(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

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

  // Queries
  const { data: deptsRes } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartmentsApi().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: empsRes } = useQuery({
    queryKey: ["employees", "allMembers"],
    queryFn: () => getEmployeesApi({ limit: 1000 }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasksRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["companyAdminMyTasks"],
    queryFn: () => getAdminMyTasksApi({ limit: 500 }).then(r => r.data),
    refetchInterval: 6000,
    retry: 1,
  });

  const _raw = tasksRes?.tasks || tasksRes?.data || [];
  const allTasks = Array.isArray(_raw) ? _raw : [];

  const rawDepts = deptsRes?.departments || deptsRes || [];
  const departments = useMemo(() => {
    const list = Array.isArray(rawDepts) ? rawDepts : [];
    return list.map(d => ({
      _id: d._id || d.id,
      name: d.name || d.departmentName || "Department",
    }));
  }, [rawDepts]);

  const rawEmployees = empsRes?.employees || empsRes || [];
  const employees = useMemo(() => {
    return Array.isArray(rawEmployees) ? rawEmployees : [];
  }, [rawEmployees]);

  const isTaskInDateRange = (task, startStr, endStr) => {
    if (!startStr || !endStr) return true;
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
    } else if (activeTab === "Re Open") {
      if (!["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes((task.status || "").toLowerCase())) return false;
    }

    if (!isTaskInDateRange(task, filters.startDate, filters.endDate)) return false;

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
        const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes((task.status || "").toLowerCase());
        const raw = task.dueDate || task.endDateTime || task.endDate;
        const d = raw ? new Date(raw) : null;
        if (isDone || !d || d >= now) return false;
      }
    }

    if (filters.overdue) {
      const st = (task.status || "").toLowerCase();
      const done = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(st);
      const due = task.dueDate || task.endDateTime ? new Date(task.dueDate || task.endDateTime) : null;
      if (done || !due || due >= new Date()) return false;
    }

    return true;
  }), [allTasks, activeTab, filters, departments]);

  const activeStatus = statusFilter || filters.status || "";
  const filteredTasks = useMemo(() => tabFilteredTasks.filter(task => {
    if (activeStatus) {
      const s = (task.status || "pending").toLowerCase();
      if (activeStatus === "overdue") {
        const done = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(s);
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
      const done = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(s);
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
    link.download = `admin_my_tasks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, data }) => updateTaskStatusApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["companyAdminMyTasks"]);
      queryClient.invalidateQueries(["tasks"]);
      setSelectedTaskForStatus(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to update task status");
    }
  });

  const checklistMutation = useMutation({
    mutationFn: ({ id, itemIndex, isCompleted }) => toggleTaskChecklistApi(id, { itemIndex, isCompleted }),
    onSuccess: () => {
      queryClient.invalidateQueries(["companyAdminMyTasks"]);
      queryClient.invalidateQueries(["tasks"]);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to update checklist");
    }
  });

  const kanbanColumns = [
    { key: "pending", title: "Pending", dot: "bg-blue-500", filterFn: t => ["pending", "re_pending"].includes((t.status || "").toLowerCase()) },
    { key: "in_process", title: "In Process", dot: "bg-amber-500", filterFn: t => ["in_process", "re_in_process", "in progress"].includes((t.status || "").toLowerCase()) },
    { key: "completed", title: "Completed", dot: "bg-emerald-500", filterFn: t => ["complete", "completed", "done", "re_complete"].includes((t.status || "").toLowerCase()) },
    { key: "overdue", title: "Overdue", dot: "bg-rose-500", filterFn: t => !["complete", "completed", "done"].includes((t.status || "").toLowerCase()) && (t.dueDate || t.endDateTime) && new Date(t.dueDate || t.endDateTime) < new Date() },
  ];

  return (
    <div className="space-y-2.5 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. EXECUTIVE HEADER ───────────────────────────────────────────── */}
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
                Track personal tasks, deadlines, and assigned deliverables
              </p>
            </div>
          </div>

          {/* Right: Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Search Box */}
            <div className="relative w-44 sm:w-48 lg:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search my tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <button
                onClick={() => setViewMode("list")}
                title="List View"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <List size={13} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban Board"
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Kanban size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Add Task Button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Task</span>
            </button>

            {/* Custom Filters Toggle */}
            <button
              onClick={handleOpenFilters}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                showFiltersDropdown || activeCustomFiltersCount > 0
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Filters</span>
              {activeCustomFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                  {activeCustomFiltersCount}
                </span>
              )}
            </button>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              title="Export CSV"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <Download size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. METRIC CARDS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <KPICard
          label="Total"
          value={totalCount}
          theme="blue"
          isActive={statusFilter === ""}
          onClick={() => setStatusFilter("")}
        />
        <KPICard
          label="Pending"
          value={statusCounts.pending}
          theme="sky"
          isActive={statusFilter === "pending"}
          onClick={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")}
        />
        <KPICard
          label="In Process"
          value={statusCounts.in_process}
          theme="amber"
          isActive={statusFilter === "in_process"}
          onClick={() => setStatusFilter(statusFilter === "in_process" ? "" : "in_process")}
        />
        <KPICard
          label="Re-Pending"
          value={statusCounts.re_pending}
          theme="indigo"
          isActive={statusFilter === "re_pending"}
          onClick={() => setStatusFilter(statusFilter === "re_pending" ? "" : "re_pending")}
        />
        <KPICard
          label="Completed"
          value={statusCounts.complete}
          theme="emerald"
          isActive={statusFilter === "complete"}
          onClick={() => setStatusFilter(statusFilter === "complete" ? "" : "complete")}
        />
        <KPICard
          label="Re-Complete"
          value={statusCounts.re_complete}
          theme="teal"
          isActive={statusFilter === "re_complete"}
          onClick={() => setStatusFilter(statusFilter === "re_complete" ? "" : "re_complete")}
        />
        <KPICard
          label="Late Done"
          value={statusCounts.late_complete}
          theme="purple"
          isActive={statusFilter === "late_complete"}
          onClick={() => setStatusFilter(statusFilter === "late_complete" ? "" : "late_complete")}
        />
        <KPICard
          label="Overdue"
          value={statusCounts.overdue}
          theme="rose"
          isActive={statusFilter === "overdue"}
          onClick={() => setStatusFilter(statusFilter === "overdue" ? "" : "overdue")}
        />
      </div>

      {/* ── 3. DATE RANGE TABS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-xs">
        {categoryCounts.map(cat => {
          const isSel = activeTab === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => handleTabChange(cat.name)}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSel
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] font-mono px-1 rounded-full ${
                isSel ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── CUSTOM FILTERS DRAWER ─────────────────────────────────────────── */}
      {showFiltersDropdown && (
        <div className="p-3 bg-white dark:bg-[#111C24] border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-3 shadow-xs animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Department */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 outline-none"
                value={tempFilters.departmentId}
                onChange={e => setTempFilters(prev => ({ ...prev, departmentId: e.target.value }))}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 outline-none"
                value={tempFilters.status}
                onChange={e => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="re_pending">Re-Pending</option>
                <option value="re_in_process">Re-In Process</option>
                <option value="complete">Completed</option>
                <option value="re_complete">Re-Completed</option>
                <option value="late_complete">Late Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 outline-none"
                value={tempFilters.priority}
                onChange={e => setTempFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">All Priority</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Deadline Filter
              </label>
              <select
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 outline-none"
                value={tempFilters.deadlineFilter}
                onChange={e => setTempFilters(prev => ({ ...prev, deadlineFilter: e.target.value }))}
              >
                <option value="">All Deadlines</option>
                <option value="today">Due Today</option>
                <option value="tomorrow">Due Tomorrow</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Timeframe
              </label>
              <select
                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 outline-none"
                value={tempTab}
                onChange={e => {
                  const val = e.target.value;
                  setTempTab(val);
                  if (val !== "Custom") {
                    const { start, end } = getDates(val);
                    setTempFilters(prev => ({ ...prev, startDate: start, endDate: end }));
                  }
                }}
              >
                {dateCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Date range inputs & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321]"
                value={tempFilters.startDate || ""}
                onChange={e => {
                  setTempTab("Custom");
                  setTempFilters(prev => ({ ...prev, startDate: e.target.value }));
                }}
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                className="text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D1321]"
                value={tempFilters.endDate || ""}
                onChange={e => {
                  setTempTab("Custom");
                  setTempFilters(prev => ({ ...prev, endDate: e.target.value }));
                }}
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs cursor-pointer transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. ACTIVE FILTER PILLS ────────────────────────────────────────── */}
      {activeCustomFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
          {filters.departmentId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10.5px]">
              Dept: {departments.find(d => String(d._id) === String(filters.departmentId))?.name || "Selected"}
              <button onClick={() => setFilters(prev => ({ ...prev, departmentId: "" }))} className="hover:text-rose-500 cursor-pointer">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.priority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10.5px] capitalize">
              Priority: {filters.priority}
              <button onClick={() => setFilters(prev => ({ ...prev, priority: "" }))} className="hover:text-rose-500 cursor-pointer">
                <X size={10} />
              </button>
            </span>
          )}
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10.5px] capitalize">
              Status: {statusFilter.replace(/_/g, " ")}
              <button onClick={() => setStatusFilter("")} className="hover:text-rose-500 cursor-pointer">
                <X size={10} />
              </button>
            </span>
          )}
          {activeTab && activeTab !== "All Time" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10.5px]">
              Timeframe: {activeTab}
              <button onClick={() => { setActiveTab("All Time"); setFilters(prev => ({ ...prev, startDate: "", endDate: "" })); }} className="hover:text-rose-500 cursor-pointer">
                <X size={10} />
              </button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-auto cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── 5. VIEW RENDERERS ──────────────────────────────────────────────── */}
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
            <p className="text-[10.5px] text-slate-400 mt-0.5">No personal tasks match your active filters.</p>
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
                        onClick={() => navigate(`/company/tasks/${t._id}`)}
                        className="p-2.5 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-mono font-bold text-blue-600 dark:text-blue-400">{t.taskId || "TSK"}</span>
                          <PriorityBadge priority={t.priority} />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{t.title}</h4>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                          <span className="font-mono">{t.dueDate ? formatDateDDMMYYYY(t.dueDate) : "No Due Date"}</span>
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                        onClick={() => navigate(`/company/tasks/${t._id}`)}
                        className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.04] transition-colors cursor-pointer group"
                      >
                        {/* Task ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                            {t.taskId || "T-01"}
                          </span>
                        </td>

                        {/* Title & Scope */}
                        <td className="px-4 py-3 max-w-[280px]">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {t.title}
                          </div>
                          {checklistTotal > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <CheckCheck size={11} className="text-emerald-500" />
                              <span>Checklist: {checklistDone}/{checklistTotal}</span>
                            </div>
                          )}
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {deptName || "—"}
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} />
                        </td>

                        {/* Due Date & Overdue Tag */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{deadlineInfo.text}</span>
                            {deadlineInfo.isOverdue && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskForStatus(t)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                            >
                              Update Status
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/company/tasks/${t._id}`)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE TASK MODAL ────────────────────────────────────────────── */}
      {isCreateOpen && (
        <TaskCreateModal
          isOpen={isCreateOpen}
          onClose={handleCloseCreateModal}
          departments={departments}
          employees={employees}
          createTaskFn={(data) => createTaskApi(data)}
        />
      )}

      {/* ── UPDATE STATUS MODAL ─────────────────────────────────────────── */}
      {selectedTaskForStatus && (
        <TaskStatusModal
          isOpen={Boolean(selectedTaskForStatus)}
          task={selectedTaskForStatus}
          onClose={() => setSelectedTaskForStatus(null)}
          isSubmitting={statusMutation.isPending}
          onSave={({ status, remarks, nextFollowUpDate, attachments }) => {
            statusMutation.mutate({
              id: selectedTaskForStatus._id,
              data: { status, remarks, nextFollowUpDate, attachments }
            });
          }}
        />
      )}
    </div>
  );
}
