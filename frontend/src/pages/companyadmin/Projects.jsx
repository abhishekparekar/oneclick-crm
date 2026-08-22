import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectsApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  getEmployeesApi,
  getTasksApi,
  updateTaskStatusApi,
  getProjectChangeRequestsApi,
  updateProjectChangeRequestStatusApi,
  addProjectNoticeApi,
} from "../../api/companyAdminApi";
import {
  Folder,
  Trash2,
  ChevronRight,
  Clock,
  Search,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  Briefcase,
  AlertCircle,
  X,
  CheckCircle,
  CheckCircle2,
  Download,
  Eye,
  Sliders,
  Plus,
  PlusCircle,
  ArrowLeft,
  Send,
  MessageSquare,
  Milestone,
  Users,
  User,
  CheckSquare,
  Bell,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  SlidersHorizontal,
  CalendarClock,
  RefreshCw,
  Tag,
  Calendar as CalendarIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

// ── Helpers & Configs ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  planning: { label: "Planning", hex: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/60", dot: "bg-indigo-500" },
  active: { label: "Active", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  working: { label: "In Progress", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  review: { label: "Review", hex: "#0891b2", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/60", dot: "bg-cyan-500" },
  deployment: { label: "Deployment", hex: "#8b5cf6", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800/60", dot: "bg-purple-500" },
  completed: { label: "Completed", hex: "#059669", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  "on-hold": { label: "On Hold", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
};

const STATUS_COLORS = {
  planning: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
  active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  working: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  review: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
  deployment: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60",
  completed: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
};

const PRIORITY_CONFIG = {
  high: { label: "High", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800/60" },
  medium: { label: "Medium", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800/60" },
  low: { label: "Low", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800/60" },
};

const PRIORITY_COLORS = {
  low: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  medium: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  high: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.planning;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status}
    </span>
  );
};

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

const formatDate = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const toDateStr = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const AVATAR_BG = [
  "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
  "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
  "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

// ── Top KPI Stat Card (Matching Dashboard / TaskBoard Header Cards) ──────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, extraClass = "" }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className={`bg-white dark:bg-[#111C24] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-4 sm:py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group ${extraClass}`}>
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 sm:mb-1.5">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10.5px]">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9.5px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 sm:h-10 w-12 sm:w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-pr-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-pr-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Projects = () => {
  const queryClient = useQueryClient();

  // ── States ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("list"); // "grid" | "list" | "timeline"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [viewingProject, setViewingProject] = useState(null); // Full Screen details mode
  const [activeTab, setActiveTab] = useState("overview"); // Tab for project details workspace

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Forms
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "planning",
    priority: "medium",
    projectManager: "",
    members: [],
    startDate: "",
    endDate: "",
    estimatedWorkingDays: 0,
    clientName: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Workspace actions states
  const [noticeText, setNoticeText] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", date: "" });
  const [submittingWorkspaceAction, setSubmittingWorkspaceAction] = useState(false);

  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── API Queries ────────────────────────────────────────────────────────────
  // 1. Projects List
  const { data: projectsRes, isLoading: isProjectsLoading, refetch: refetchProjects, isFetching } = useQuery({
    queryKey: ["companyProjects"],
    queryFn: getProjectsApi,
  });

  // 2. Employees (for dropdown multi-selects)
  const { data: employeesRes } = useQuery({
    queryKey: ["employeesListSelect"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  const projects = useMemo(() => {
    return projectsRes?.data?.projects || projectsRes?.data || [];
  }, [projectsRes]);

  const employees = useMemo(() => {
    return employeesRes?.data?.employees || employeesRes?.data || [];
  }, [employeesRes]);

  // Query tasks for active workspace details screen
  const { data: tasksRes, refetch: refetchWorkspaceTasks } = useQuery({
    queryKey: ["workspaceTasks", viewingProject?._id],
    queryFn: () => getTasksApi({ projectId: viewingProject?._id }),
    enabled: !!viewingProject?._id,
  });

  const workspaceTasks = useMemo(() => {
    return tasksRes?.data?.tasks || tasksRes?.data || [];
  }, [tasksRes]);

  // Query change requests for active workspace details screen
  const { data: changeReqsRes, refetch: refetchChangeReqs } = useQuery({
    queryKey: ["workspaceChangeRequests", viewingProject?._id],
    queryFn: () => getProjectChangeRequestsApi(viewingProject?._id),
    enabled: !!viewingProject?._id,
  });

  const changeRequests = useMemo(() => {
    if (!changeReqsRes?.data) return [];
    if (Array.isArray(changeReqsRes.data)) return changeReqsRes.data;
    if (Array.isArray(changeReqsRes.data.requests)) return changeReqsRes.data.requests;
    return [];
  }, [changeReqsRes]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyProjects"]);
      triggerToast("Project created successfully");
      setIsCreateModalOpen(false);
      setProjectForm({
        name: "",
        description: "",
        status: "planning",
        priority: "medium",
        projectManager: "",
        members: [],
        startDate: "",
        endDate: "",
        estimatedWorkingDays: 0,
        clientName: "",
      });
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to create project", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyProjects"]);
      triggerToast("Project deleted successfully");
      setSelectedProjectId(null);
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to delete project", "error"),
  });

  // Task Status Update Mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTaskStatusApi(id, status),
    onSuccess: () => {
      refetchWorkspaceTasks();
      triggerToast("Task status updated");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to update task status", "error"),
  });

  // Change Request Status update Mutation
  const updateChangeRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateProjectChangeRequestStatusApi(id, status),
    onSuccess: () => {
      refetchChangeReqs();
      triggerToast("Change request status updated");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to update status", "error"),
  });

  // ── Filters & Search ───────────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const code = (p.description || "").toLowerCase(); // using description as search keyword helper
      const client = (p.clientName || "").toLowerCase();
      const searchStr = search.toLowerCase();
      const matchSearch = name.includes(searchStr) || code.includes(searchStr) || client.includes(searchStr);

      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchPriority = !priorityFilter || p.priority === priorityFilter;
      const matchManager = !managerFilter || p.projectManager === managerFilter || p.projectManager?._id === managerFilter;

      let matchDate = true;
      if (dateRangeFilter) {
        matchDate = new Date(p.endDate) <= new Date(dateRangeFilter);
      }

      return matchSearch && matchStatus && matchPriority && matchManager && matchDate;
    });
  }, [projects, search, statusFilter, priorityFilter, managerFilter, dateRangeFilter]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const getProjectProgress = (projectId, status) => {
    if (status === "completed" || status === "complete") return 100;
    const projTasks = workspaceTasks.filter(t => (t.projectId?._id || t.projectId) === projectId);
    if (projTasks.length === 0) return 0; // 0% if no tasks
    const completedTasks = projTasks.filter(t => t.status === "completed" || t.status === "complete").length;
    return Math.round((completedTasks / projTasks.length) * 100);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active" || p.status === "working").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const onHold = projects.filter((p) => p.status === "on-hold" || p.status === "planning").length;

    // Overdue projects
    const today = new Date();
    const overdue = projects.filter((p) => {
      if (p.status === "completed" || !p.endDate) return false;
      return new Date(p.endDate) < today;
    }).length;

    // Real average progress
    const progressSum = projects.reduce((sum, p) => sum + getProjectProgress(p._id, p.status), 0);
    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

    return { total, active, completed, onHold, overdue, avgProgress };
  }, [projects, workspaceTasks]);

  // Handle Form Submission
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    createMutation.mutate(projectForm, {
      onSettled: () => setSubmitting(false),
    });
  };

  // Add Notice inside details workspace
  const handleAddNotice = async (e) => {
    e.preventDefault();
    if (!noticeText.trim()) return;
    setSubmittingWorkspaceAction(true);
    try {
      const res = await addProjectNoticeApi(viewingProject._id, { message: noticeText });
      if (res.data?.success) {
        setViewingProject(res.data.project);
        setNoticeText("");
        triggerToast("Project notice posted successfully");
        queryClient.invalidateQueries(["companyProjects"]);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to post notice", "error");
    } finally {
      setSubmittingWorkspaceAction(false);
    }
  };

  // Add Milestone inside details workspace
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.date) return;
    setSubmittingWorkspaceAction(true);
    try {
      const updatedMilestones = [...(viewingProject.milestones || []), { ...newMilestone, status: "pending" }];
      // Log custom activity entry
      const updatedActivity = [
        ...(viewingProject.activityLog || []),
        { action: `Added milestone: "${newMilestone.title}"`, performedBy: "Company Admin" }
      ];

      const res = await updateProjectApi(viewingProject._id, {
        milestones: updatedMilestones,
        activityLog: updatedActivity
      });
      if (res.data?.success) {
        setViewingProject(res.data.project);
        setNewMilestone({ title: "", date: "" });
        triggerToast("Milestone created successfully");
        queryClient.invalidateQueries(["companyProjects"]);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to create milestone", "error");
    } finally {
      setSubmittingWorkspaceAction(false);
    }
  };

  // Toggle Milestone Status inside details workspace
  const handleToggleMilestone = async (mId, currentStatus) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    setSubmittingWorkspaceAction(true);
    try {
      const updatedMilestones = viewingProject.milestones.map((m) => {
        if (m._id === mId) return { ...m, status: nextStatus };
        return m;
      });
      const selectedM = viewingProject.milestones.find(m => m._id === mId);
      // Log activity
      const updatedActivity = [
        ...(viewingProject.activityLog || []),
        { action: `Marked milestone "${selectedM.title}" as ${nextStatus.toUpperCase()}`, performedBy: "Company Admin" }
      ];

      const res = await updateProjectApi(viewingProject._id, {
        milestones: updatedMilestones,
        activityLog: updatedActivity
      });
      if (res.data?.success) {
        setViewingProject(res.data.project);
        triggerToast("Milestone status updated");
        queryClient.invalidateQueries(["companyProjects"]);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to update milestone", "error");
    } finally {
      setSubmittingWorkspaceAction(false);
    }
  };

  // Delete Milestone inside details workspace
  const handleDeleteMilestone = async (mId) => {
    if (!window.confirm("Remove this milestone?")) return;
    setSubmittingWorkspaceAction(true);
    try {
      const updatedMilestones = viewingProject.milestones.filter((m) => m._id !== mId);
      const res = await updateProjectApi(viewingProject._id, { milestones: updatedMilestones });
      if (res.data?.success) {
        setViewingProject(res.data.project);
        triggerToast("Milestone removed successfully");
        queryClient.invalidateQueries(["companyProjects"]);
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to delete milestone", "error");
    } finally {
      setSubmittingWorkspaceAction(false);
    }
  };

  // Resolve manager and member info
  const resolveEmpName = (empId) => {
    if (!empId) return "—";
    if (typeof empId === "object") {
      if (empId.firstName || empId.lastName) {
        return `${empId.firstName || ""} ${empId.lastName || ""}`.trim();
      }
    }
    const emp = employees.find((e) => e._id === empId || e._id === empId?._id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "—";
  };

  // Export report CSV
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      triggerToast("No data to export", "error");
      return;
    }
    const headers = ["Project Name", "Client", "Status", "Priority", "Project Manager", "Start Date", "Due Date", "Milestones Count"];
    const csvRows = filteredProjects.map((p) => {
      const managerName = resolveEmpName(p.projectManager);
      return [
        p.name || "—",
        p.clientName || "—",
        p.status || "—",
        p.priority || "—",
        managerName,
        toDateStr(p.startDate) || "—",
        toDateStr(p.endDate) || "—",
        p.milestones?.length || 0,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...csvRows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Export completed successfully");
  };

  const activeFiltersCount = [statusFilter, priorityFilter, managerFilter, dateRangeFilter].filter(Boolean).length;

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">

      {/* ── Toast Feedback Notification ────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border text-base transition-all duration-300 transform translate-y-0 ${toast.type === "error"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
          <AlertCircle size={18} className="mr-2 flex-shrink-0" />
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ── MODE 1: PRIMARY PROJECTS LISTING DASHBOARD ────────────────────────── */}
      {!viewingProject && (
        <div className="space-y-4">
          {/* ── Page Header & Fixed Height Action Toolbar (Matching TaskBoard) ── */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                Project Management
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Track project status, deadlines, team assignments, and project deliverables
              </p>
            </div>

            {/* ── Action Toolbar ── */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              {/* Search Box */}
              <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-9 pr-8 py-1.5 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all w-full sm:w-52 shadow-2xs"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Grouped View Switcher & Action Container */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs h-9 overflow-x-auto hide-scrollbar max-w-full">
                {/* View Switcher Pills */}
                <div className="flex items-center bg-white dark:bg-[#111C24] p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-2xs gap-0.5 h-7">
                  <button
                    onClick={() => setViewMode("grid")}
                    title="Grid Cards View"
                    className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <LayoutGrid size={13} /> <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    title="Table List View"
                    className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <ListIcon size={13} /> <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    onClick={() => setViewMode("timeline")}
                    title="Timeline View"
                    className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "timeline"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Calendar size={13} /> <span className="hidden sm:inline">Timeline</span>
                  </button>
                </div>

                {/* Export CSV Button */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 px-2.5 h-7 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                  title="Export projects to CSV"
                >
                  <Download size={13} className="text-slate-400" /> <span className="hidden xs:inline">Export</span>
                </button>

                {/* Advanced Filters Trigger */}
                <div className="relative z-20 shrink-0">
                  <button
                    onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                    className={`flex items-center gap-1 px-2.5 h-7 border rounded-lg text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer ${
                      showFiltersDropdown || activeFiltersCount > 0
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40"
                        : "bg-white dark:bg-[#111C24] border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <SlidersHorizontal size={13} className="text-amber-600 dark:text-amber-400" />
                    <span className="hidden xs:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="flex items-center justify-center min-w-[15px] h-[15px] px-1 bg-slate-900 text-white dark:bg-amber-600 dark:text-white text-[9px] rounded-full font-black ml-0.5">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Filters Dropdown Card */}
                  {showFiltersDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 z-30 space-y-4 shadow-2xl rounded-2xl animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">Advanced Filters</span>
                        <button onClick={() => setShowFiltersDropdown(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14}/></button>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium py-2 px-3 outline-none rounded-xl"
                        >
                          <option value="">All Statuses</option>
                          <option value="planning">Planning</option>
                          <option value="active">Active</option>
                          <option value="working">In Progress</option>
                          <option value="review">Review</option>
                          <option value="deployment">Deployment</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium py-2 px-3 outline-none rounded-xl"
                        >
                          <option value="">All Priorities</option>
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Manager</label>
                        <select
                          value={managerFilter}
                          onChange={(e) => setManagerFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-medium py-2 px-3 outline-none rounded-xl"
                        >
                          <option value="">All Managers</option>
                          {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.firstName} {emp.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Date Before</label>
                        <input
                          type="date"
                          value={dateRangeFilter}
                          onChange={(e) => setDateRangeFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs py-2 px-2 outline-none rounded-xl"
                        />
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                        <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setManagerFilter(""); setDateRangeFilter(""); setShowFiltersDropdown(false); }} className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl transition-colors cursor-pointer">Clear</button>
                        <button onClick={() => setShowFiltersDropdown(false)} className="flex-1 text-xs font-extrabold text-white bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 shadow-xs px-3 py-2 rounded-xl transition-colors cursor-pointer">Apply</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Data */}
                <button onClick={() => refetchProjects()} disabled={isFetching} className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer" title="Refresh Projects">
                  <RefreshCw size={13} className={isFetching ? "animate-spin" : ""}/>
                </button>

                {/* Primary Action Button (+ Create Project) */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 h-7 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus size={14} strokeWidth={3} /> Create Project
                </button>
              </div>
            </div>
          </div>

          {/* ── Top 5 KPI Summary Stat Cards (Exact Matching TaskBoard / Dashboard) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 pt-1">
            <KPICard label="Total Projects" value={stats.total} trend="14.2%" isUp period="last month" strokeColor="#EAB308" Icon={Folder} iconBg="bg-amber-500/10" iconColor="#D97706"/>
            <KPICard label="Active Work" value={stats.active} trend="8.1%" isUp period="last month" strokeColor="#06B6D4" Icon={Clock} iconBg="bg-cyan-500/10" iconColor="#0891B2"/>
            <KPICard label="Completed" value={stats.completed} trend="19.4%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669"/>
            <KPICard label="On Hold" value={stats.onHold} trend="2.5%" isUp={false} period="last month" strokeColor="#8B5CF6" Icon={Sparkles} iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
            <KPICard label="Overdue" value={stats.overdue} trend="4.2%" isUp={false} period="yesterday" strokeColor="#F43F5E" Icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="#E11D48" extraClass="col-span-2 sm:col-span-1"/>
          </div>

          {/* ── Filter Tab Bar (Matching TaskBoard) ── */}
          <div className="bg-white dark:bg-[#111C24] px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 min-h-[44px]">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {[
                { id: "", label: "All Projects", count: projects.length },
                { id: "active", label: "Active", count: projects.filter(p => p.status === "active").length },
                { id: "working", label: "In Progress", count: projects.filter(p => p.status === "working").length },
                { id: "review", label: "Review", count: projects.filter(p => p.status === "review").length },
                { id: "planning", label: "Planning", count: projects.filter(p => p.status === "planning").length },
                { id: "completed", label: "Completed", count: projects.filter(p => p.status === "completed").length },
                { id: "on-hold", label: "On Hold", count: projects.filter(p => p.status === "on-hold").length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    statusFilter === tab.id
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                      : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Main Content Area ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left/Main Column */}
            <div className={`${selectedProject ? "lg:col-span-2" : "lg:col-span-3"} transition-all duration-300 space-y-4`}>
              
              {isProjectsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <Folder size={24} className="animate-spin text-amber-500" />
                  <p className="text-sm font-medium">Loading projects list...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <Briefcase size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <div>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">No projects match criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try altering the search filters or create a new project</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ViewMode: GRID */}
                  {viewMode === "grid" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredProjects.map((p) => {
                        const managerName = resolveEmpName(p.projectManager);
                        const progress = getProjectProgress(p._id, p.status);
                        const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.planning;
                        const isOverdue = p.status !== "completed" && p.endDate && new Date(p.endDate) < new Date();

                        return (
                          <div
                            key={p._id}
                            onClick={() => setSelectedProjectId(p._id)}
                            className={`group relative flex flex-col bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden p-4 isolate ${
                              selectedProjectId === p._id ? "ring-2 ring-amber-500 border-amber-500" : ""
                            }`}
                          >
                            <div 
                              className="absolute top-0 left-0 bottom-0 w-[3.5px] group-hover:w-[4.5px] transition-all duration-300 z-20"
                              style={{ backgroundColor: statusCfg.hex }}
                            />

                            <div className="flex items-center justify-between mb-2 z-10 relative">
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={p.status} />
                              </div>
                              <div className="flex-shrink-0">
                                <PriorityBadge priority={p.priority} />
                              </div>
                            </div>

                            <h3 className="font-extrabold text-[14px] text-slate-900 dark:text-white leading-snug mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 pr-1 z-10 relative">
                              {p.name}
                            </h3>

                            {p.clientName && (
                              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2 z-10 relative">
                                Client: {p.clientName}
                              </p>
                            )}

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3 z-10 relative">
                              {p.description || "No description provided."}
                            </p>

                            {/* Progress bar */}
                            <div className="mb-3 z-10 relative">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

                            {/* Footer row */}
                            <div className="mt-auto flex items-end justify-between z-10 relative pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                                <CalendarClock size={11} strokeWidth={2.2} />
                                <span>Due {formatDate(p.endDate)}</span>
                                {isOverdue && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 ml-1">Overdue</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {p.projectManager && (
                                  <div
                                    title={`PM: ${managerName}`}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs ring-2 ring-white dark:ring-[#111C24] ${avatarClass(managerName)}`}
                                  >
                                    {managerName.charAt(0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ViewMode: LIST */}
                  {viewMode === "list" && (
                    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                      {/* Card Header matching TaskBoard */}
                      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder size={14} className="text-amber-500" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            PROJECTS PIPELINE LOG
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
                          {filteredProjects.length} projects
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/60 dark:bg-[#0D1321] text-[10px] sm:text-[10.5px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-200/80 dark:border-slate-800">
                              <th className="px-4 py-3">PROJECT</th>
                              <th className="px-4 py-3">CLIENT</th>
                              <th className="px-4 py-3">MANAGER</th>
                              <th className="px-4 py-3">TIMELINE</th>
                              <th className="px-4 py-3 text-center">PRIORITY</th>
                              <th className="px-4 py-3">STATUS</th>
                              <th className="px-4 py-3 text-center">MILESTONES</th>
                              <th className="px-4 py-3 text-center">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                            {filteredProjects.map((p) => {
                              const managerName = resolveEmpName(p.projectManager);
                              const compM = p.milestones?.filter(m => m.status === "completed").length || 0;
                              return (
                                <tr
                                  key={p._id}
                                  onClick={() => setSelectedProjectId(p._id)}
                                  className={`hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.04] transition-colors cursor-pointer group ${
                                    selectedProjectId === p._id ? "bg-amber-500/[0.06]" : ""
                                  }`}
                                >
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <Folder size={14} className="text-amber-500 flex-shrink-0" />
                                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {p.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-medium">
                                    {p.clientName || "—"}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-2">
                                      {p.projectManager && (
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] font-black shadow-xs ${avatarClass(managerName)}`}>
                                          {managerName.charAt(0)}
                                        </div>
                                      )}
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">{managerName}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                                    {formatDate(p.startDate)} &rarr; {formatDate(p.endDate)}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <PriorityBadge priority={p.priority} />
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <StatusBadge status={p.status} />
                                  </td>
                                  <td className="px-4 py-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                                    <span className="text-amber-600 dark:text-amber-400">{compM}</span> / {p.milestones?.length || 0}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingProject(p);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <Eye size={12} /> View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ViewMode: TIMELINE */}
                  {viewMode === "timeline" && (
                    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarClock size={14} className="text-amber-500" /> Project Deadlines Roadmap
                      </span>
                      <div className="space-y-3.5 border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1.5 ml-3">
                        {filteredProjects.map((p) => {
                          const startStr = formatDate(p.startDate);
                          const endStr = formatDate(p.endDate);
                          const percent = p.status === "completed" ? 100 : (p.status === "review" ? 85 : (p.status === "active" ? 50 : 20));

                          return (
                            <div key={p._id} className="relative group/timeline cursor-pointer" onClick={() => setSelectedProjectId(p._id)}>
                              <span className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#111C24] transition-colors ${
                                p.status === "completed" ? "bg-emerald-500" : (p.status === "active" ? "bg-cyan-500" : "bg-amber-500")
                              }`} />

                              <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 rounded-xl p-3.5 hover:shadow-md transition-all space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover/timeline:text-amber-600 transition-colors text-sm">{p.name}</h4>
                                    <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Client: {p.clientName || "—"}</p>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200/80 dark:border-slate-700 shadow-2xs">{startStr} to {endStr}</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-500">{percent}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Right Column: Selected Details Panel */}
            {selectedProject && (
              <div className="lg:col-span-1 animate-slideLeft">
                <div className="bg-white dark:bg-[#111C24] rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative flex flex-col h-full max-h-[85vh]">

                  {/* Top Accent Header */}
                  <div className="bg-slate-900 dark:bg-[#0B101B] p-5 pb-6 relative overflow-hidden border-b border-slate-800 text-white">
                    <button
                      onClick={() => setSelectedProjectId(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
                    >
                      <X size={16} />
                    </button>

                    <div className="relative z-10">
                      <h3 className="text-[10.5px] font-black uppercase tracking-widest text-amber-400 mb-3">Project Overview</h3>

                      {(() => {
                        const progress = getProjectProgress(selectedProject._id, selectedProject.status);
                        return (
                          <div>
                            <h4 className="font-black text-white text-lg leading-tight mb-2 truncate pr-4">{selectedProject.name}</h4>
                            <div className="flex items-center gap-2 mb-3">
                              <StatusBadge status={selectedProject.status} />
                              <PriorityBadge priority={selectedProject.priority} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10.5px] font-bold text-slate-300">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-white dark:bg-[#111C24] text-xs">

                    {/* Team & Targets */}
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
                        <Users size={12} className="mr-1.5 text-amber-500" /> Team & Targets
                      </span>

                      <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 space-y-1 font-medium">
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <span className="text-slate-500 flex items-center"><User size={13} className="mr-1.5 text-slate-400" /> Manager</span>
                          <span className="text-slate-900 dark:text-white font-bold">{resolveEmpName(selectedProject.projectManager)}</span>
                        </div>

                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <span className="text-slate-500 flex items-center"><Users size={13} className="mr-1.5 text-slate-400" /> Team Size</span>
                          <span className="text-slate-900 dark:text-white font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">{selectedProject.members?.length || 0} Members</span>
                        </div>

                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <span className="text-slate-500 flex items-center"><CheckSquare size={13} className="mr-1.5 text-slate-400" /> Milestones</span>
                          <span className="text-slate-900 dark:text-white font-bold">
                            <span className="text-emerald-600">{selectedProject.milestones?.filter(m => m.status === "completed").length || 0}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            {selectedProject.milestones?.length || 0}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <span className="text-slate-500 flex items-center"><CalendarIcon size={13} className="mr-1.5 text-slate-400" /> Timeline</span>
                          <span className="text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                            {formatDate(selectedProject.startDate)} - {formatDate(selectedProject.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="p-5 bg-ca-surface border-t border-ca-border space-y-2.5">
                    <button
                      onClick={() => {
                        setViewingProject(selectedProject);
                        setActiveTab("overview");
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-theme-1 to-theme-2 hover:from-theme-2 hover:to-theme-3 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-md shadow-theme-1/20 flex items-center justify-center cursor-pointer hover:-translate-y-0.5"
                    >
                      <ArrowUpRight size={16} className="mr-2" /> Open Workspace
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this project?")) {
                          deleteMutation.mutate(selectedProject._id);
                        }
                      }}
                      className="w-full py-2.5 text-center text-[12px] uppercase tracking-widest font-extrabold text-red-500/70 hover:text-ca-primary hover:bg-ca-primary-light rounded-xl transition-colors cursor-pointer"
                    >
                      Delete Project
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── MODE 2: ACTIVE PROJECT DETAILS WORKSPACE SCREEN (8 SECTIONS) ────────── */}
      {viewingProject && (
        <div className="space-y-3 animate-fadeIn">

          {/* Header Workspace details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center space-x-3.5">
              <button
                onClick={() => { setViewingProject(null); setSelectedProjectId(null); }}
                className="p-2 border border-ca-border hover:border-slate-300 text-ca-text-secondary hover:text-ca-text rounded-xl bg-ca-surface shadow-sm transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center space-x-2 text-sm font-semibold text-ca-text-secondary uppercase tracking-wider mb-1">
                  <span>Projects</span>
                  <ChevronRight size={12} />
                  <span className="text-ca-text-secondary">{viewingProject.name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-extrabold text-ca-text leading-tight">{viewingProject.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold border capitalize ${STATUS_COLORS[viewingProject.status] || STATUS_COLORS.planning}`}>
                    {viewingProject.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold border capitalize ${PRIORITY_COLORS[viewingProject.priority] || PRIORITY_COLORS.medium}`}>
                    {viewingProject.priority}
                  </span>
                </div>
                {viewingProject.clientName && (
                  <p className="text-sm font-bold text-ca-text-secondary mt-1 uppercase tracking-wider">Client: {viewingProject.clientName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-wider block">Due Timeline</span>
                <span className="text-sm font-extrabold text-ca-text-secondary">{formatDate(viewingProject.startDate)} to {formatDate(viewingProject.endDate)}</span>
              </div>

              <button
                onClick={() => { setViewingProject(null); setSelectedProjectId(null); }}
                className="px-3 py-1.5 border border-ca-border text-ca-text-secondary rounded-lg text-[11px] font-bold hover:bg-ca-hover cursor-pointer shadow-sm bg-ca-surface"
              >
                Exit Workspace
              </button>
            </div>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex overflow-x-auto bg-white/60 backdrop-blur-lg border border-white/80 p-2 rounded-2xl shadow-sm text-sm font-bold text-ca-text-secondary flex-shrink-0 gap-1">
            {[
              { id: "overview", label: "Overview & Notices" },
              { id: "analytics", label: "Progress Analytics" },
              { id: "timeline", label: "Milestones Timeline" },
              { id: "kanban", label: "Kanban Task Board" },
              { id: "workloads", label: "Team Workload" },
              { id: "requests", label: "Change Requests" },
              { id: "activity", label: "Activity Logs" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4.5 py-2.5 rounded-xl transition-all flex-shrink-0 cursor-pointer ${activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "hover:text-ca-text hover:bg-ca-hover"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[350px]">

            {/* Section 1 & 7: Overview & Notices */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold">
                {/* Overview Info */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-ca-text border-b border-slate-50 pb-2">Project Brief</h3>
                  <p className="text-ca-text-secondary font-medium leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-ca-border">
                    {viewingProject.description || "No project description logged."}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/30 border border-ca-border p-3.5 rounded-xl">
                      <span className="text-ca-text-secondary block font-bold text-[12px] uppercase">Project Manager</span>
                      <span className="font-extrabold text-ca-text text-base mt-1 block">{resolveEmpName(viewingProject.projectManager)}</span>
                    </div>
                    <div className="bg-slate-50/30 border border-ca-border p-3.5 rounded-xl">
                      <span className="text-ca-text-secondary block font-bold text-[12px] uppercase">Estimated Working Days</span>
                      <span className="font-extrabold text-ca-text text-base mt-1 block">{viewingProject.estimatedWorkingDays || 0} Days</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-ca-text-secondary block font-bold text-[12px] uppercase">Project Team Members ({viewingProject.members?.length || 0})</span>
                    <div className="flex flex-wrap gap-2.5 pt-1.5">
                      {viewingProject.members?.map((m) => {
                        const name = resolveEmpName(m);
                        return (
                          <div
                            key={m._id || m}
                            className="flex items-center px-3 py-1.5 bg-ca-bg border border-ca-border rounded-xl space-x-1.5"
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${avatarClass(name)}`}>
                              {name.charAt(0)}
                            </span>
                            <span className="text-ca-text-secondary font-bold">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Notices Bulletin */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-ca-text border-b border-slate-50 pb-2">Notices Bulletin</h3>

                  <form onSubmit={handleAddNotice} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Post a brief notification or bulletin update to the team..."
                      value={noticeText}
                      onChange={(e) => setNoticeText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-ca-border rounded-xl text-sm bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40 text-ca-text-secondary"
                    />
                    <button
                      type="submit"
                      disabled={submittingWorkspaceAction || !noticeText.trim()}
                      className="px-3.5 bg-primary text-white rounded-xl hover:bg-primary/95 transition-all text-sm font-bold flex items-center cursor-pointer disabled:opacity-60"
                    >
                      <Send size={12} className="mr-1.5" /> Post Notice
                    </button>
                  </form>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {(viewingProject.notices || []).length === 0 ? (
                      <div className="text-center py-10 text-ca-text-secondary italic">No bulletin announcements posted.</div>
                    ) : (
                      [...(viewingProject.notices || [])].reverse().map((notice, idx) => (
                        <div key={idx} className="border border-ca-border rounded-xl p-3.5 bg-slate-50/50 flex space-x-3 items-start">
                          <MessageSquare size={16} className="text-ca-text-secondary mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="text-ca-text-secondary leading-relaxed font-semibold italic">"{notice.message}"</p>
                            <span className="text-[11px] text-ca-text-secondary font-black block">— Posted by {notice.senderName} on {formatDate(notice.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Progress Analytics */}
            {activeTab === "analytics" && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {/* Chart A: Task Status Distribution */}
                  <div className="border border-ca-border rounded-xl p-4 space-y-4">
                    <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px] block">Task Status Distribution</span>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "To Do", count: workspaceTasks.filter(t => t.status === "todo").length || 4 },
                          { name: "In Progress", count: workspaceTasks.filter(t => t.status === "working").length || 3 },
                          { name: "In Review", count: workspaceTasks.filter(t => t.status === "review").length || 1 },
                          { name: "Completed", count: workspaceTasks.filter(t => t.status === "done").length || 6 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                          <YAxis tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            {["#B2CAC3", "#558D7C", "#10B981", "#047857"].map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart B: Project Task Priorities */}
                  <div className="border border-ca-border rounded-xl p-4 space-y-4">
                    <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px] block">Priority Load Breakdown</span>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "Low", count: workspaceTasks.filter(t => t.priority === "low").length || 2 },
                          { name: "Medium", count: workspaceTasks.filter(t => t.priority === "medium").length || 8 },
                          { name: "High", count: workspaceTasks.filter(t => t.priority === "high").length || 3 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                          <YAxis tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            {["#B2CAC3", "#10B981", "#047857"].map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Section 3 & 7: Milestones & Workflow Timeline */}
            {activeTab === "timeline" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-semibold">

                {/* Left Columns 2: Interactive Milestone CRUD */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-base font-bold text-ca-text border-b border-slate-50 pb-2 flex items-center">
                    <Milestone size={16} className="text-primary mr-1.5" /> Project Milestones Target
                  </h3>

                  <form onSubmit={handleAddMilestone} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Milestone target e.g. Design Approved..."
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      className="px-3 py-2 border border-ca-border rounded-xl text-sm bg-ca-surface text-ca-text-secondary sm:col-span-2"
                    />
                    <input
                      type="date"
                      required
                      value={newMilestone.date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                      className="px-3 py-2 border border-ca-border rounded-xl text-sm bg-ca-surface text-ca-text-secondary cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={submittingWorkspaceAction}
                      className="w-full py-2 bg-primary text-white rounded-xl hover:bg-primary/95 transition-all text-sm font-bold sm:col-span-3 cursor-pointer"
                    >
                      Add Project Milestone
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 pt-2">
                    {(viewingProject.milestones || []).length === 0 ? (
                      <div className="text-center py-10 text-ca-text-secondary italic">No milestones configured.</div>
                    ) : (
                      (viewingProject.milestones || []).map((m) => (
                        <div
                          key={m._id}
                          className="border border-ca-border rounded-xl p-3 bg-slate-50/50 flex justify-between items-center text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={m.status === "completed"}
                              onChange={() => handleToggleMilestone(m._id, m.status)}
                              className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className={`font-bold text-ca-text ${m.status === "completed" ? "line-through text-ca-text-secondary" : ""}`}>{m.title}</p>
                              <p className="text-[12px] text-ca-text-secondary font-bold uppercase mt-0.5">Target: {formatDate(m.date)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMilestone(m._id)}
                            className="p-1 hover:bg-white rounded border border-transparent hover:border-red-100 text-ca-primary"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column 1: Vertical Timeline visual representation */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-ca-text border-b border-slate-50 pb-2">Milestones Timeline Roadmap</h3>

                  <div className="relative pl-5 border-l border-ca-border space-y-5 text-sm">
                    {(viewingProject.milestones || []).length === 0 ? (
                      <p className="text-ca-text-secondary italic text-[13px] font-bold">Timeline is empty.</p>
                    ) : (
                      [...(viewingProject.milestones || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).map((m) => (
                        <div key={m._id} className="relative">
                          <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full ring-4 ${m.status === "completed" ? "bg-theme-3 ring-theme-3-light" : "bg-slate-300 ring-slate-50"
                            }`} />
                          <div>
                            <p className={`font-bold text-ca-text ${m.status === "completed" ? "line-through text-ca-text-secondary" : ""}`}>{m.title}</p>
                            <p className="text-[11px] text-ca-text-secondary font-semibold mt-0.5">{formatDate(m.date)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Section 4: Kanban Task Board */}
            {activeTab === "kanban" && (
              <div className="space-y-4 text-sm font-semibold">
                <div className="flex justify-between items-center pb-2">
                  <div>
                    <h3 className="text-base font-bold text-ca-text">Workspace Task Board</h3>
                    <p className="text-sm text-ca-text-secondary mt-0.5">Click actions to advance task phases</p>
                  </div>
                  <span className="text-[12px] bg-ca-bg text-ca-text-secondary font-bold px-2 py-0.5 rounded">Real-time status synced</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.keys(kanbanColumns).map((colKey) => {
                    const col = kanbanColumns[colKey];
                    const colTasks = workspaceTasks.filter((t) => {
                      const status = t.status ? t.status.toLowerCase() : "todo";
                      if (colKey === "todo") return status === "todo";
                      if (colKey === "working") return status === "working" || status === "in-progress" || status === "in_progress";
                      if (colKey === "review") return status === "review" || status === "in-review" || status === "in_review";
                      if (colKey === "done") return status === "done" || status === "completed";
                      return false;
                    });

                    return (
                      <div key={colKey} className={`border rounded-2xl p-4 bg-slate-50/20 flex flex-col space-y-3 min-h-[300px]`}>
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <span className={`font-extrabold text-base ${col.text}`}>{col.title}</span>
                          <span className="bg-ca-bg text-ca-text-secondary px-2 py-0.5 rounded font-black text-[12px]">{colTasks.length}</span>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto max-h-[320px] pr-1">
                          {colTasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-300 font-bold text-[12px] italic border-2 border-dashed border-slate-50 rounded-xl">No tasks here</div>
                          ) : (
                            colTasks.map((t) => (
                              <div
                                key={t._id}
                                className="bg-ca-surface border border-ca-border hover:border-primary/25 rounded-xl p-3.5 shadow-sm space-y-2.5 transition-all group/task"
                              >
                                <h4 className="font-extrabold text-ca-text leading-snug text-sm group-hover/task:text-primary transition-colors">{t.title}</h4>
                                {t.description && <p className="text-[13px] text-ca-text-secondary line-clamp-2 leading-relaxed">{t.description}</p>}

                                <div className="flex justify-between items-center text-[11px] font-bold text-ca-text-secondary">
                                  <span>Due {formatDate(t.dueDate)}</span>
                                  <span className={`px-1.5 py-0.5 rounded capitalize ${t.priority === "high" ? "bg-ca-primary-light text-red-700" : (t.priority === "medium" ? "bg-ca-primary-light text-amber-700" : "bg-ca-bg text-ca-text-secondary")
                                    }`}>
                                    {t.priority}
                                  </span>
                                </div>

                                {/* Flow status buttons */}
                                <div className="flex justify-end gap-1.5 border-t border-slate-50 pt-2 text-[11px]">
                                  {colKey !== "todo" && (
                                    <button
                                      onClick={() => updateTaskStatusMutation.mutate({ id: t._id, status: colKey === "working" ? "todo" : (colKey === "review" ? "working" : "review") })}
                                      className="px-2 py-0.5 bg-ca-bg hover:bg-ca-hover text-ca-text-secondary rounded border border-ca-border cursor-pointer"
                                    >
                                      ← Back
                                    </button>
                                  )}
                                  {colKey !== "done" && (
                                    <button
                                      onClick={() => updateTaskStatusMutation.mutate({ id: t._id, status: colKey === "todo" ? "working" : (colKey === "working" ? "review" : "done") })}
                                      className="px-2 py-0.5 bg-primary text-white rounded hover:bg-primary/95 cursor-pointer"
                                    >
                                      Advance →
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 5: Team Workload */}
            {activeTab === "workloads" && (
              <div className="space-y-4 text-sm font-semibold">
                <div className="border-b border-slate-50 pb-2">
                  <h3 className="text-base font-bold text-ca-text">Team Workloads allocation</h3>
                  <p className="text-sm text-ca-text-secondary mt-0.5">Task density index across assigned employees</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {viewingProject.members?.map((m) => {
                    const name = resolveEmpName(m);
                    const totalT = workspaceTasks.filter(t => t.assignees?.some(a => a._id === m || a._id === m?._id)).length || 0;
                    const pendingT = workspaceTasks.filter(t => t.status !== "done" && t.assignees?.some(a => a._id === m || a._id === m?._id)).length || 0;
                    // workload index (estimated)
                    const workloadIndex = Math.min(100, totalT * 20);

                    return (
                      <div
                        key={m._id || m}
                        className="border border-ca-border rounded-2xl p-4 bg-slate-50/20 flex flex-col justify-between min-h-[120px]"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 border border-white shadow-sm ${avatarClass(name)}`}>
                            {name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-ca-text leading-tight text-sm">{name}</h4>
                            <p className="text-[12px] text-ca-text-secondary font-semibold mt-0.5">Team Member</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[12px] font-bold text-ca-text-secondary">
                            <span>Allocation Index</span>
                            <span className={workloadIndex > 80 ? "text-ca-primary" : "text-ca-text-secondary"}>{workloadIndex}% ({pendingT} pending tasks)</span>
                          </div>
                          <div className="w-full bg-ca-bg h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${workloadIndex > 80 ? "bg-ca-primary" : (workloadIndex > 50 ? "bg-ca-primary" : "bg-primary")
                              }`} style={{ width: `${workloadIndex}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 6: Client Change Requests */}
            {activeTab === "requests" && (
              <div className="space-y-4 text-sm font-semibold">
                <div className="border-b border-slate-50 pb-2">
                  <h3 className="text-base font-bold text-ca-text">Client Project Change Requests</h3>
                  <p className="text-sm text-ca-text-secondary mt-0.5">Approve, reject, or mark status of requested modifications</p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-ca-border">
                  {changeRequests.length === 0 ? (
                    <div className="text-center py-20 text-ca-text-secondary font-bold italic">No client change requests recorded for this project.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-ca-bg border-b border-ca-border text-ca-text-secondary font-bold text-sm uppercase tracking-wider">
                          <th className="px-4 py-3">Title / Description</th>
                          <th className="px-4 py-3">Requested By</th>
                          <th className="px-4 py-3 text-center">Priority</th>
                          <th className="px-4 py-3 text-center">Impact</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {changeRequests.map((req) => (
                          <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-ca-text">{req.title}</p>
                              <p className="text-sm text-ca-text-secondary font-medium mt-0.5">{req.description}</p>
                            </td>
                            <td className="px-4 py-3 text-ca-text-secondary font-semibold">{req.requestedBy}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-bold border capitalize ${PRIORITY_COLORS[req.priority] || PRIORITY_COLORS.medium}`}>
                                {req.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-bold border capitalize ${PRIORITY_COLORS[req.impactLevel] || PRIORITY_COLORS.medium}`}>
                                {req.impactLevel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-bold border capitalize ${req.status === "approved" ? "bg-theme-3-light text-theme-2 border-theme-3-light" : (req.status === "rejected" ? "bg-ca-primary-light text-red-700 border-ca-border" : "bg-ca-primary-light text-amber-700 border-amber-200")
                                }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {req.status === "pending" ? (
                                <div className="flex justify-center items-center space-x-1.5 text-[12px]">
                                  <button
                                    onClick={() => updateChangeRequestStatusMutation.mutate({ id: req._id, status: "approved" })}
                                    className="px-2 py-1 bg-theme-3 text-white rounded hover:bg-theme-4 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => updateChangeRequestStatusMutation.mutate({ id: req._id, status: "rejected" })}
                                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[12px] text-ca-text-secondary font-bold uppercase">{req.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Section 8: Activity Timeline */}
            {activeTab === "activity" && (
              <div className="space-y-4 text-sm font-semibold">
                <div className="border-b border-slate-50 pb-2">
                  <h3 className="text-base font-bold text-ca-text">Project Activity logs</h3>
                  <p className="text-sm text-ca-text-secondary mt-0.5">Chronological audit list of project operations</p>
                </div>

                <div className="relative pl-5 border-l border-ca-border space-y-4 text-sm max-h-[350px] overflow-y-auto pr-1">
                  {(viewingProject.activityLog || []).length === 0 ? (
                    <div className="text-center py-10 text-ca-text-secondary italic">No activity logs recorded.</div>
                  ) : (
                    [...(viewingProject.activityLog || [])].reverse().map((act) => (
                      <div key={act._id} className="relative">
                        <span className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                        <div>
                          <p className="text-ca-text font-bold leading-tight">{act.action}</p>
                          <span className="text-[11px] text-ca-text-secondary font-semibold block mt-0.5">By {act.performedBy} on {formatDate(act.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── CREATE PROJECT DRAWER VIEW ─────────────────────────────────────────── */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-ca-surface dark:bg-theme-2 rounded-l-3xl shadow-2xl w-full max-w-xl h-full flex flex-col overflow-hidden relative border-l border-ca-border dark:border-theme-3/50">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-ca-border dark:border-theme-3/50 bg-primary/30 dark:bg-primary/20 z-10 relative">
              <h2 className="text-2xl font-black text-ca-text  flex items-center tracking-tight">
                <Folder className="mr-3 text-primary" size={24} /> Initiate New Project
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-ca-text-secondary hover:text-ca-text dark:hover:text-white hover:bg-ca-hover dark:hover:bg-theme-3 rounded-xl transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 relative z-0">
              <form onSubmit={handleCreateSubmit} className="flex flex-col min-h-full">

                {/* Section 1: General Details */}
                <div className="p-5 border-b border-ca-border dark:border-theme-3/50 bg-slate-50/40 dark:bg-theme-3/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Project Title *</label>
                      <input
                        type="text" required placeholder="e.g. Website Redesign..."
                        value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Client Name</label>
                      <input
                        type="text" placeholder="e.g. Acme Corp..."
                        value={projectForm.clientName} onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                        className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Project Manager</label>
                      <select
                        value={projectForm.projectManager} onChange={(e) => setProjectForm({ ...projectForm, projectManager: e.target.value })}
                        className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-sm"
                      >
                        <option value="">Select Manager...</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Description</label>
                      <textarea
                        rows="2" placeholder="Outline the project scope..."
                        value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-medium text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Timeline & Parameters */}
                <div className="p-5 bg-slate-50/50 dark:bg-theme-2/50 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-ca-text dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center">
                    <CalendarIcon className="mr-2 text-theme-4" size={16} /> Timeline & Parameters
                  </h3>

                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Project Status</label>
                        <select
                          value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                          className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-sm"
                        >
                          <option value="planning">Planning</option>
                          <option value="active">Active</option>
                          <option value="working">In Progress</option>
                          <option value="review">Review</option>
                          <option value="deployment">Deployment</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Project Priority</label>
                        <select
                          value={projectForm.priority} onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-sm"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Start Date</label>
                        <input
                          type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">End Date</label>
                        <input
                          type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400">Working Days</label>
                        <input
                          type="number" value={projectForm.estimatedWorkingDays} onChange={(e) => setProjectForm({ ...projectForm, estimatedWorkingDays: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-2 border border-ca-border dark:border-theme-3 rounded-lg text-base font-semibold text-ca-text-secondary dark:text-slate-200 bg-ca-surface dark:bg-theme-1 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col mt-1">
                      <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary dark:text-slate-400 flex justify-between items-center">
                        <span>Select Project Team Members</span>
                        <span className="bg-primary/30 dark:bg-primary text-primary  px-2 py-0.5 rounded-full">{projectForm.members.length} Selected</span>
                      </label>
                      <div className="border border-ca-border dark:border-theme-3 rounded-lg p-2 bg-ca-surface dark:bg-theme-1 flex-1 overflow-y-auto space-y-1 shadow-inner custom-scrollbar min-h-[120px]">
                        {employees.map((emp) => {
                          const isChecked = projectForm.members.includes(emp._id);
                          return (
                            <label key={emp._id} className={`flex items-center space-x-3 text-base font-semibold text-ca-text-secondary dark:text-slate-200 cursor-pointer hover:bg-ca-hover dark:hover:bg-theme-2 p-1.5 rounded-md transition-colors ${isChecked ? 'bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30' : 'border border-transparent'}`}>
                              <input
                                type="checkbox" checked={isChecked}
                                onChange={() => {
                                  const updated = isChecked
                                    ? projectForm.members.filter(id => id !== emp._id)
                                    : [...projectForm.members, emp._id];
                                  setProjectForm({ ...projectForm, members: updated });
                                }}
                                className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-ca-bg dark:bg-theme-3 flex items-center justify-center text-[11px] text-ca-text-secondary dark:text-slate-400 font-bold border border-ca-border dark:border-theme-4">
                                  {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                </div>
                                <span>{emp.firstName} {emp.lastName} <span className="text-ca-text-secondary dark:text-slate-500 text-[12px] font-medium ml-1">({emp.employeeCode})</span></span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-ca-border dark:border-theme-3/50 bg-ca-bg dark:bg-theme-2/50 flex justify-end gap-3 mt-auto sticky bottom-0 z-10">
                  <button
                    type="button" onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border-2 border-ca-border dark:border-theme-3 hover:border-slate-300 dark:hover:border-theme-4 text-ca-text-secondary dark:text-slate-300 rounded-lg text-base font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={submitting}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-base font-bold transition-all shadow-md cursor-pointer flex items-center justify-center min-w-[140px]"
                  >
                    {submitting ? "Initiating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Projects;
