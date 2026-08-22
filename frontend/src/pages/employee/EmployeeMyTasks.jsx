import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyTasksApi, updateTaskStatusApi, submitTaskProgressApi } from "../../api/employeeApi";
import { getDepartmentsApi, getEmployeesApi, createTaskApi } from "../../api/companyAdminApi";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";
import {
  CheckSquare, Clock, AlertTriangle, CheckCircle2, Filter, Search,
  Send, MessageSquare, List, LayoutGrid, Plus, Calendar as CalendarIcon,
  Eye, X, ShieldCheck, User, Sparkles, FileText, ArrowRight, Paperclip,
  ChevronDown, ChevronUp, Download, Play, Building2, Repeat, Layers
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const formatCardTaskId = (t) => {
  if (!t) return "T-01";
  if (t.taskId && String(t.taskId).startsWith("T-")) return t.taskId;
  if (t.taskSequenceNumber) return `T-${t.taskSequenceNumber}`;
  const idStr = String(t._id || t.id || "").trim();
  if (idStr.length >= 4) return `T-${idStr.slice(-2).toUpperCase()}`;
  return `T-01`;
};

const getCardDueDate = (t) => {
  const d = t.dueDate || t.endDate || t.endDateTime || t.finishDate || t.startDate;
  if (!d) return "No Due Date";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getPriorityShortLabel = (p) => {
  const norm = (p || "medium").toLowerCase();
  if (norm === "high") return "H";
  if (norm === "urgent") return "U";
  if (norm === "low") return "L";
  return "M";
};

const getTaskAccentColors = (t) => {
  const status = (t.status || "pending").toLowerCase();
  const priority = (t.priority || "medium").toLowerCase();

  let borderAccent = "border-l-blue-500";
  let statusStyle = "bg-blue-100/90 text-blue-800 border-blue-200";
  let statusLabel = status.replace(/_/g, " ").toUpperCase();

  switch (status) {
    case "complete":
    case "completed":
    case "done":
      borderAccent = "border-l-emerald-500";
      statusStyle = "bg-emerald-100/90 text-emerald-800 border-emerald-200";
      statusLabel = "COMPLETED";
      break;
    case "re_complete":
    case "re_completed":
      borderAccent = "border-l-teal-500";
      statusStyle = "bg-teal-100/90 text-teal-800 border-teal-200";
      statusLabel = "RE-COMPLETED";
      break;
    case "late_complete":
    case "late_completed":
      borderAccent = "border-l-amber-500";
      statusStyle = "bg-amber-100/90 text-amber-800 border-amber-200";
      statusLabel = "LATE COMPLETE";
      break;
    case "re_late_complete":
      borderAccent = "border-l-teal-600";
      statusStyle = "bg-teal-100/90 text-teal-900 border-teal-300";
      statusLabel = "RE-LATE COMPLETE";
      break;
    case "in_process":
    case "in_progress":
    case "working":
      borderAccent = "border-l-amber-500";
      statusStyle = "bg-blue-100/90 text-blue-800 border-blue-200";
      statusLabel = "IN PROCESS";
      break;
    case "re_pending":
      borderAccent = "border-l-indigo-500";
      statusStyle = "bg-indigo-100/90 text-indigo-800 border-indigo-200";
      statusLabel = "RE-PENDING";
      break;
    case "re_in_process":
      borderAccent = "border-l-cyan-500";
      statusStyle = "bg-cyan-100/90 text-cyan-800 border-cyan-200";
      statusLabel = "RE-IN PROCESS";
      break;
    case "overdue":
      borderAccent = "border-l-rose-500";
      statusStyle = "bg-rose-100/90 text-rose-800 border-rose-200";
      statusLabel = "OVERDUE";
      break;
    default:
      borderAccent = priority === "high" || priority === "urgent" ? "border-l-rose-500" : "border-l-blue-500";
      statusStyle = "bg-blue-100/90 text-blue-800 border-blue-200";
      statusLabel = "PENDING";
      break;
  }

  const priorityStyle =
    priority === "high" || priority === "urgent"
      ? "bg-rose-100/90 text-rose-800 border-rose-300/60"
      : priority === "low"
        ? "bg-emerald-100/90 text-emerald-800 border-emerald-300/60"
        : "bg-amber-100/90 text-amber-800 border-amber-300/60";

  return { borderAccent, statusStyle, statusLabel, priorityStyle };
};

const getCardDeptName = (t) => {
  if (!t) return "";
  if (typeof t.departmentId === "object" && t.departmentId?.name) return t.departmentId.name;
  if (typeof t.departmentId === "object" && t.departmentId?.departmentName) return t.departmentId.departmentName;
  if (typeof t.department === "object" && t.department?.name) return t.department.name;
  if (typeof t.department === "string" && t.department.trim() && !t.department.match(/^[0-9a-fA-F]{24}$/)) return t.department;
  if (typeof t.departmentName === "string" && t.departmentName.trim()) return t.departmentName;
  return "";
};

const isTaskAssignedToUser = (t, user) => {
  if (!t || !user) return true;
  const userId = String(user._id || user.id || "").toLowerCase();
  const empId = user.employeeId ? String(user.employeeId._id || user.employeeId).toLowerCase() : "";
  const email = (user.email || "").toLowerCase();

  const assigned = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
  const isAssigned = assigned.some(a => {
    if (!a) return false;
    if (typeof a === "object") {
      const aId = String(a._id || a.id || "").toLowerCase();
      const aEmail = (a.email || "").toLowerCase();
      return (aId && (aId === userId || aId === empId)) || (email && aEmail && aEmail === email);
    }
    const aIdStr = String(a).toLowerCase();
    return aIdStr === userId || aIdStr === empId;
  });

  const createdBy = t.createdBy ? String(typeof t.createdBy === "object" ? (t.createdBy._id || t.createdBy.id) : t.createdBy).toLowerCase() : "";
  const assignedBy = t.assignedBy ? String(typeof t.assignedBy === "object" ? (t.assignedBy._id || t.assignedBy.id) : t.assignedBy).toLowerCase() : "";
  const isSelfCreated = (createdBy && (createdBy === userId || (empId && createdBy === empId))) ||
    (assignedBy && (assignedBy === userId || (empId && assignedBy === empId)));

  return isAssigned || isSelfCreated;
};

export default function EmployeeMyTasks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const canCreate = ["CompanyAdmin", "SuperAdmin", "Manager"].includes(authUser?.role);

  const [dateTab, setDateTab] = useState("All Time");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [filters, setFilters] = useState({ departmentId: "", startDate: "", endDate: "", status: "", overdue: false });
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Date Formatting & Range Helpers
  const formatDate = (d) =>
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  const getDates = (tabName) => {
    const now = new Date();
    let start = "", end = "";
    if (tabName === "Today") { start = end = formatDate(now); }
    else if (tabName === "Yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); start = end = formatDate(y); }
    else if (tabName === "This Week") {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay());
      const e = new Date(now); e.setDate(s.getDate() + 6);
      start = formatDate(s); end = formatDate(e);
    } else if (tabName === "Last Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (tabName === "This Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (tabName === "Next Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth() + 2, 0));
    }
    return { start, end };
  };

  const isTaskInDateRange = (task, startStr, endStr) => {
    if (!startStr || !endStr) return true;

    const startD = new Date(`${startStr}T00:00:00`);
    const endD = new Date(`${endStr}T23:59:59.999`);

    const checkBetween = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= startD && d <= endD;
    };

    return checkBetween(task.startDateTime || task.startDate) ||
      checkBetween(task.nextFollowUpDate) ||
      checkBetween(task.endDateTime || task.endDate || task.dueDate);
  };

  const handleTabChange = (tabName) => {
    setDateTab(tabName);
    const { start, end } = getDates(tabName);
    const statusF = tabName === "Re Open" ? "re_pending,re_in_process,re_complete,re_late_complete" : "";
    setFilters(prev => ({ ...prev, startDate: start, endDate: end, status: statusF }));
    if (tabName !== "Re Open") setStatusFilter("all");
  };

  // Modals state
  const [searchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [selectedTaskForReport, setSelectedTaskForReport] = useState(null);

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("openCreate") === "true") {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  // Form state for report & update
  const [reportStatus, setReportStatus] = useState("in_progress");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportAttachedFile, setReportAttachedFile] = useState(null);

  // Fetch Departments & Employees for Create Task Modal
  const { data: deptRes } = useQuery({
    queryKey: ["employeeTasksDeptList"],
    queryFn: async () => {
      try {
        const res = await getDepartmentsApi();
        return res.data?.departments || res.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: empRes } = useQuery({
    queryKey: ["employeeTasksEmpList"],
    queryFn: async () => {
      try {
        const res = await getEmployeesApi({ limit: 1000 });
        return res.data?.employees || res.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!authUser,
    staleTime: 5 * 60 * 1000,
  });

  const departments = Array.isArray(deptRes) ? deptRes : (deptRes?.departments || []);
  const employees = Array.isArray(empRes) ? empRes : (empRes?.employees || []);

  // Fetch Tasks
  const { data: tasksRes, isLoading } = useQuery({
    queryKey: ["employeeMyTasksPage", authUser?._id, authUser?.employeeId],
    queryFn: async () => {
      const res = await getMyTasksApi().catch(() => ({ data: {} }));
      const list = res.data?.tasks || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      return list.filter(t => t.status !== "cancelled" && t.status !== "canceled" && isTaskAssignedToUser(t, authUser));
    }
  });

  const tasks = tasksRes || [];

  const filteredEmployeeDepartments = useMemo(() => {
    if (!departments || departments.length === 0) return [];

    const empDeptSet = new Set();
    const pushDept = (val) => {
      if (!val) return;
      if (Array.isArray(val)) { val.forEach(pushDept); return; }
      if (typeof val === "object") {
        if (val._id) empDeptSet.add(val._id.toString());
        if (val.name) empDeptSet.add(val.name.trim().toLowerCase());
      } else if (typeof val === "string") {
        empDeptSet.add(val.trim().toLowerCase());
      }
    };

    pushDept(authUser?.departmentId);
    pushDept(authUser?.departmentIds);
    pushDept(authUser?.accessibleDepartments);
    pushDept(authUser?.department);

    tasks.forEach(t => {
      if (t.departmentId) pushDept(t.departmentId);
      if (t.department) pushDept(t.department);
      if (t.departmentName) pushDept(t.departmentName);
    });

    const seen = new Set();
    const list = departments.filter(d => {
      const id = String(d._id || d.id || "").trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (empDeptSet.size === 0) return list;

    const filtered = list.filter(d => {
      const dId = String(d._id || d.id || "").trim().toLowerCase();
      const dName = String(d.name || d.departmentName || "").trim().toLowerCase();
      return empDeptSet.has(dId) || empDeptSet.has(dName);
    });

    return filtered.length > 0 ? filtered : list;
  }, [departments, authUser, tasks]);

  // Date categories count for pill tabs
  const dateCategories = ["Today", "Yesterday", "This Week", "Last Month", "This Month", "Next Month", "All Time", "Re Open", "Recurring"];
  const categoryCounts = useMemo(() => {
    return dateCategories.map(cat => {
      let count = 0;
      if (cat === "Re Open") {
        count = tasks.filter(t => !t.isRecurring && ["re_pending", "re_in_process", "re_complete", "re_late_complete", "re_open"].includes((t.status || "").toLowerCase())).length;
      } else if (cat === "Recurring") {
        count = tasks.filter(t => t.isRecurring || t.isTemplate || t.isGeneratedFromTemplate || t.parentTemplateId).length;
      } else {
        const { start, end } = getDates(cat);
        count = tasks.filter(t => !t.isTemplate && isTaskInDateRange(t, start, end)).length;
      }
      return { name: cat, count };
    });
  }, [tasks]);

  // Base tasks filtered by date range (before status/search/dropdown filters)
  const baseTabTasks = useMemo(() => {
    return tasks.filter(task => {
      if (dateTab === "Recurring") {
        if (!task.isTemplate && !task.isRecurring && !task.isGeneratedFromTemplate && !task.parentTemplateId) return false;
      } else {
        if (task.isTemplate) return false;
        if (dateTab === "Re Open" && !["re_pending", "re_in_process", "re_complete", "re_late_complete", "re_open"].includes((task.status || "").toLowerCase())) return false;
      }
      return isTaskInDateRange(task, filters.startDate, filters.endDate);
    });
  }, [tasks, dateTab, filters.startDate, filters.endDate]);

  // Helper to check if task is overdue in real-time
  const checkIsOverdue = (task) => {
    if (task.isTemplate) return false;
    const st = (task.status || "").toLowerCase();
    const done = ["complete", "completed", "done", "late_complete", "re_late_complete", "cancelled"].includes(st);
    const due = task.endDateTime || task.dueDate || task.endDate ? new Date(task.endDateTime || task.dueDate || task.endDate) : null;
    return st === "overdue" || (!done && due && due < new Date());
  };

  // Status counts map based on baseTabTasks
  const statusCounts = useMemo(() => {
    const map = {
      all: baseTabTasks.length,
      pending: 0,
      in_process: 0,
      complete: 0,
      overdue: 0,
    };

    baseTabTasks.forEach(t => {
      const s = (t.status || "pending").toLowerCase();
      if (checkIsOverdue(t) && s !== "overdue") {
        map.overdue += 1;
      }

      if (["pending", "todo", "open", "re_pending"].includes(s)) {
        map.pending += 1;
      } else if (s.includes("process") || s.includes("progress") || s === "working" || s === "re_in_process") {
        map.in_process += 1;
      } else if (["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete"].includes(s)) {
        map.complete += 1;
      } else if (s === "overdue") {
        map.overdue += 1;
      } else {
        map.pending += 1;
      }
    });

    return map;
  }, [baseTabTasks, tasks]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.departmentId) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.status) count++;
    if (filters.overdue) count++;
    return count;
  }, [filters]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return baseTabTasks.filter(t => {
      // Department Filter from dropdown
      if (filters.departmentId) {
        const tDeptId = typeof t.departmentId === "object" ? (t.departmentId._id || t.departmentId.id) : t.departmentId;
        const matchId = tDeptId && String(tDeptId) === String(filters.departmentId);
        const matchObj = typeof t.departmentId === "object" && String(t.departmentId._id) === String(filters.departmentId);
        if (!matchId && !matchObj) return false;
      }

      // Priority Filter
      if (priorityFilter !== "all" && (t.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "all") {
        const s = (t.status || "pending").toLowerCase();
        if (statusFilter === "pending" && !["pending", "todo", "open", "re_pending"].includes(s)) return false;
        if (statusFilter === "in_process" && !(s.includes("progress") || s.includes("process") || s === "working" || s === "re_in_process")) return false;
        if (statusFilter === "completed" && !["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete"].includes(s)) return false;
        if (statusFilter === "overdue" && !checkIsOverdue(t)) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (t.title || t.name || "").toLowerCase();
        const taskId = (t.taskId || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const dept = (t.departmentId?.name || t.departmentName || t.department || "").toLowerCase();
        if (!title.includes(q) && !taskId.includes(q) && !desc.includes(q) && !dept.includes(q)) return false;
      }

      return true;
    });
  }, [baseTabTasks, tasks, filters, statusFilter, priorityFilter, searchTerm]);

  // Update Status Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ taskId, status }) => {
      return await updateTaskStatusApi(taskId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["employeeMyTasksPage"]);
      queryClient.invalidateQueries(["employeeDashboardSummary"]);
    }
  });

  // Submit Progress Report & Next Follow-Up Date Mutation
  const submitReportMut = useMutation({
    mutationFn: async ({ taskId, status, nextFollowUpDate, comment }) => {
      await updateTaskStatusApi(taskId, { status, nextFollowUpDate }).catch(() => { });
      return await submitTaskProgressApi(taskId, { comment, nextFollowUpDate });
    },
    onSuccess: () => {
      alert("Work progress report & next follow-up date updated!");
      setSelectedTaskForReport(null);
      setReportComment("");
      queryClient.invalidateQueries(["employeeMyTasksPage"]);
      queryClient.invalidateQueries(["employeeDashboardSummary"]);
    }
  });

  const handleStartTask = (task, e) => {
    if (e) e.stopPropagation();
    updateStatusMut.mutate({ taskId: task._id, status: "in_process" });
  };

  const handleOpenReportModal = (task) => {
    setSelectedTaskForReport(task);
    setReportStatus(task.status || "in_progress");
    setNextFollowUpDate(task.nextFollowUpDate ? new Date(task.nextFollowUpDate).toISOString().split("T")[0] : "");
    setReportComment("");
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-ca-text w-full max-w-[1440px] mx-auto">

      {/* ── Page Header (Clean Admin Style) ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
          My Work Tasks &amp; Deliverables
        </h1>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 h-8 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2.5} /> Create Task
        </button>
      </div>

      {/* ── UNIFIED FILTER & SEARCH CARD CONTAINER ─────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
        
        {/* ── Row 1: Time Boundary Date Pill Tabs ───────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {categoryCounts.map(tab => {
            const active = dateTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabChange(tab.name)}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                    : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span>{tab.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Row 2: Task Status Filter Pills ───────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white pr-1 flex items-center gap-1 shrink-0">
            <Layers size={13} className="text-amber-500" /> STATUS:
          </span>
          {[
            {
              id: "all",
              label: "All Tasks",
              count: baseTabTasks.length,
              pillInactive: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-[#0B101B] dark:text-slate-200 dark:border-slate-700/80 hover:border-slate-300 shadow-2xs",
              pillActive: "bg-slate-900 text-white dark:bg-amber-600 border-slate-900 shadow-xs ring-2 ring-slate-900/30",
              badgeInactive: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
              badgeActive: "bg-white/20 text-white"
            },
            {
              id: "pending",
              label: "Pending",
              count: statusCounts.pending,
              pillInactive: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100/80 shadow-2xs",
              pillActive: "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30",
              badgeInactive: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200",
              badgeActive: "bg-white/20 text-white"
            },
            {
              id: "in_process",
              label: "In Process",
              count: statusCounts.in_process,
              pillInactive: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100/80 shadow-2xs",
              pillActive: "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30",
              badgeInactive: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200",
              badgeActive: "bg-white/20 text-white"
            },
            {
              id: "completed",
              label: "Completed",
              count: statusCounts.complete,
              pillInactive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/80 shadow-2xs",
              pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30",
              badgeInactive: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
              badgeActive: "bg-white/20 text-white"
            },
            {
              id: "overdue",
              label: "Overdue",
              count: statusCounts.overdue,
              pillInactive: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100/80 shadow-2xs",
              pillActive: "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30",
              badgeInactive: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200",
              badgeActive: "bg-white/20 text-white"
            }
          ].map(st => {
            const active = statusFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  active
                    ? st.pillActive
                    : st.pillInactive
                }`}
              >
                <span>{st.label}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                  active
                    ? st.badgeActive
                    : st.badgeInactive
                }`}>
                  {st.count || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Row 3: Search + Inline Filters + View Mode ────────────────────── */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">

          {/* Search Input */}
          <div className="relative flex-1 min-w-[160px] max-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-7 pr-7 py-1 h-7 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Department Filter — inline */}
          <select
            className="h-7 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 rounded-lg outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            value={filters.departmentId}
            onChange={e => setFilters({ ...filters, departmentId: e.target.value })}
          >
            <option value="">All Depts</option>
            {filteredEmployeeDepartments.map(d => (
              <option key={d._id} value={d._id}>{d.name || d.departmentName}</option>
            ))}
          </select>

          {/* From Date */}
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            title="From Date"
            className="h-7 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 rounded-lg outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
          />

          {/* To Date */}
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            title="To Date"
            className="h-7 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 rounded-lg outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
          />

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => setFilters({ departmentId: "", startDate: "", endDate: "", status: "", overdue: false })}
              className="h-7 px-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 dark:border-rose-800 dark:hover:bg-rose-950/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <X size={11} /> Reset
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 shadow-2xs shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "grid" ? "bg-slate-900 text-white dark:bg-amber-600 shadow-2xs" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              title="Grid View"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "list" ? "bg-slate-900 text-white dark:bg-amber-600 shadow-2xs" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
              title="List View"
            >
              <List size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Active Filters Bar ────────────────────────────────────────── */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 p-2.5 rounded-2xl text-xs shadow-2xs">
          <span className="font-extrabold text-orange-950 dark:text-orange-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={13} className="text-orange-600 dark:text-orange-400" /> Active Filters:
          </span>

          {filters.departmentId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200 font-bold text-[11px] shadow-2xs">
              Dept: {filteredEmployeeDepartments.find(d => String(d._id) === String(filters.departmentId))?.name || filteredEmployeeDepartments.find(d => String(d._id) === String(filters.departmentId))?.departmentName || "Selected"}
              <button onClick={() => setFilters(prev => ({ ...prev, departmentId: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.startDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200 font-bold text-[11px] shadow-2xs">
              From: {filters.startDate}
              <button onClick={() => setFilters(prev => ({ ...prev, startDate: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.endDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200 font-bold text-[11px] shadow-2xs">
              To: {filters.endDate}
              <button onClick={() => setFilters(prev => ({ ...prev, endDate: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          <button
            onClick={() => setFilters({ departmentId: "", startDate: "", endDate: "", status: "", overdue: false })}
            className="text-xs font-black text-rose-600 hover:text-rose-800 underline ml-auto cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── TASK CARDS GRID / LIST ───────────────────────────────────────────── */}
      {filteredTasks.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((t) => {
              const { borderAccent, statusStyle, statusLabel, priorityStyle } = getTaskAccentColors(t);
              const deptName = getCardDeptName(t);
              const priority = (t.priority || "medium").toLowerCase();

              return (
                <div
                  key={t._id}
                  onClick={() => navigate(`/employee/tasks/${t._id}`)}
                  className={`bg-white rounded-2xl border border-slate-200 border-l-3 ${borderAccent} p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-orange-500 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative group`}
                >
                  <div className="space-y-2">
                    {/* Top Header Row: Task ID, Priority, Department, Due Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-mono font-extrabold">
                          {formatCardTaskId(t)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${priorityStyle}`} title={`Priority: ${priority}`}>
                          {getPriorityShortLabel(priority)}
                        </span>
                        {deptName && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-900 border border-orange-200/80 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            {deptName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium shrink-0">
                        <CalendarIcon size={12} className="text-slate-400" />
                        <span>Due: <strong className="text-slate-700 font-semibold">{getCardDueDate(t)}</strong></span>
                      </div>
                    </div>

                    {/* Task Title */}
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {t.title || t.name}
                    </h3>

                    {/* Description */}
                    {t.description && (
                      <p className="text-[11px] text-slate-500 font-normal line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    {/* Next Follow-Up Date Pill */}
                    {t.nextFollowUpDate && (
                      <div className="py-1 px-2 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-950 dark:text-amber-200">
                        <Clock size={11} className="text-amber-600 shrink-0" />
                        <span>Next Follow-Up: <strong>{new Date(t.nextFollowUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, {new Date(t.nextFollowUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                    {/* Status Pill */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle}`}>
                      {statusLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const s = (t.status || "pending").toLowerCase();
                        const isPending = s === "pending" || s === "todo" || s === "open";

                        if (isPending) {
                          return (
                            <button
                              onClick={(e) => handleStartTask(t, e)}
                              disabled={updateStatusMut.isPending}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Start Task"
                            >
                              <Play size={11} className="fill-current" /> {updateStatusMut.isPending ? "Starting..." : "Start"}
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenReportModal(t); }}
                            className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Set Next Follow-Up Date & Daily Progress Report"
                          >
                            <Clock size={11} /> Follow-Up Date
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white dark:bg-[#111C24] border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    <th className="py-3.5 px-4 font-black">Task ID</th>
                    <th className="py-3.5 px-4 font-black">Task &amp; Scope</th>
                    <th className="py-3.5 px-4 font-black">Department</th>
                    <th className="py-3.5 px-4 font-black">Priority</th>
                    <th className="py-3.5 px-4 font-black">Timeline / Due Date</th>
                    <th className="py-3.5 px-4 font-black">Status</th>
                    <th className="py-3.5 px-4 text-right font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTasks.map(t => {
                    const { statusStyle, statusLabel, priorityStyle } = getTaskAccentColors(t);
                    const deptName = getCardDeptName(t);
                    const s = (t.status || "pending").toLowerCase();
                    const isPending = s === "pending" || s === "todo" || s === "open";
                    const checklistTotal = Array.isArray(t.checklist) ? t.checklist.length : 0;
                    const checklistDone = Array.isArray(t.checklist) ? t.checklist.filter(c => c.isCompleted).length : 0;

                    return (
                      <tr 
                        key={t._id} 
                        onClick={() => navigate(`/employee/tasks/${t._id}`)} 
                        className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.04] transition-colors cursor-pointer group"
                      >
                        {/* Task ID */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
                            {formatCardTaskId(t)}
                          </span>
                        </td>

                        {/* Title & Scope */}
                        <td className="py-3 px-4 max-w-sm">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                              {t.title || t.name}
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
                        <td className="py-3 px-4 whitespace-nowrap">
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${priorityStyle}`}>
                            {t.priority || "Medium"}
                          </span>
                        </td>

                        {/* Timeline / Due Date */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon size={12} className="text-slate-400" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {getCardDueDate(t)}
                            </span>
                          </div>
                          {t.nextFollowUpDate && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                              Follow-up: {new Date(t.nextFollowUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, {new Date(t.nextFollowUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <button
                                onClick={(e) => handleStartTask(t, e)}
                                disabled={updateStatusMut.isPending}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Start Task"
                              >
                                <Play size={11} className="fill-current" /> {updateStatusMut.isPending ? "Starting..." : "Start"}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenReportModal(t); }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Set Next Follow-Up Date & Progress Report"
                              >
                                <Clock size={11} /> Update Report
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(`/employee/tasks/${t._id}`)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={12} />
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
        )
      ) : (
        <div className="py-14 text-center bg-ca-surface rounded-2xl border border-ca-border text-ca-text-secondary text-xs italic">
          No work tasks found matching your search and filter criteria.
        </div>
      )}

      {/* ── CREATE TASK MODAL ────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <TaskCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          departments={departments}
          employees={employees}
          createTaskFn={async (payload) => {
            await createTaskApi(payload);
            queryClient.invalidateQueries(["employeeMyTasksPage"]);
            queryClient.invalidateQueries(["employeeDashboardSummary"]);
          }}
        />
      )}

      {/* ── WORK REPORT & FOLLOW-UP MODAL ────────────────────────────────────── */}
      {selectedTaskForReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-ca-surface border border-ca-border rounded-3xl max-w-xl w-full p-7 space-y-5 shadow-2xl">
            <div className="border-b border-ca-border pb-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-ca-text text-base flex items-center gap-2">
                  <Send size={18} className="text-orange-600" /> Submit Progress Update Report
                </h3>
                <p className="text-xs text-ca-text-secondary font-medium mt-1">
                  Task: <strong className="text-ca-text font-black">{selectedTaskForReport.title || selectedTaskForReport.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForReport(null)}
                className="p-1 text-ca-text-secondary hover:text-ca-text cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1.5">
                    Update Task Status
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-black focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_process">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1.5">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-black focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1.5">
                  Daily Work Comments / Progress Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Write detailed work progress, completed deliverables, or any roadblocks..."
                  className="w-full p-3.5 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-medium leading-relaxed focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Paperclip size={15} className="text-orange-600" /> Attach Document / Work File (Optional)
                </label>
                {reportAttachedFile ? (
                  <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText size={18} className="text-orange-700 shrink-0" />
                      <div className="truncate">
                        <p className="font-black text-orange-950 truncate">{reportAttachedFile.name}</p>
                        <p className="text-[10px] text-orange-700 font-mono">{(reportAttachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportAttachedFile(null)}
                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3.5 bg-ca-bg hover:bg-ca-surface rounded-xl border border-dashed border-ca-border cursor-pointer transition-colors text-ca-text-secondary hover:text-ca-text font-bold">
                    <Paperclip size={16} />
                    <span>Choose Work Document / Proof File</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReportAttachedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ca-border">
              <button
                type="button"
                onClick={() => setSelectedTaskForReport(null)}
                className="px-5 py-2.5 bg-ca-bg hover:bg-ca-surface text-ca-text border border-ca-border rounded-xl text-xs font-black cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitReportMut.isPending || !reportComment.trim()}
                onClick={() => submitReportMut.mutate({
                  taskId: selectedTaskForReport._id,
                  status: reportStatus,
                  nextFollowUpDate,
                  comment: reportComment
                })}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-2"
              >
                <Send size={15} />
                {submitReportMut.isPending ? "Submitting..." : "Submit Report & Follow-up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
