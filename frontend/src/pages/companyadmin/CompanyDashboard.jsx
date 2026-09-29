import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getCompanyDashboardApi,
  getCompanyAuditLogsApi,
  getTasksApi,
  getEmployeesApi,
  getProjectsApi,
  getCompanyAnnouncementsApi,
  getBranchesApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import { api as leadApi } from "../../utils/leads/api";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  Rocket, Zap, TrendingUp, CheckSquare, Target, Folder, Calendar,
  Building2, Users, UserCheck, UserX, CalendarOff, Clock,
  AlertTriangle, CheckCircle2, Award, DollarSign, Plus, ArrowUp,
  ArrowDown, ChevronDown, Briefcase, FileText, ArrowRight,
  Sparkles, Megaphone, Inbox, Search, CheckCircle, ExternalLink,
  Phone, Mail, MapPin, Play, Filter, Layers, RefreshCw
} from "lucide-react";

// ── Theme definitions matching TaskBoard.jsx ──
const CARD_THEMES = {
  blue: {
    baseClass: "bg-blue-50/80 dark:bg-blue-950/35 border-blue-200/90 dark:border-blue-800/80 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600",
    iconBg: "bg-blue-600 text-white shadow-xs",
    labelText: "text-blue-950 dark:text-blue-200 font-extrabold",
    valueText: "text-blue-700 dark:text-blue-300",
    topBar: "bg-blue-600",
  },
  sky: {
    baseClass: "bg-sky-50/80 dark:bg-sky-950/35 border-sky-200/90 dark:border-sky-800/80 shadow-2xs hover:shadow-md hover:border-sky-400 dark:hover:border-sky-600",
    iconBg: "bg-sky-500 text-white shadow-xs",
    labelText: "text-sky-950 dark:text-sky-200 font-extrabold",
    valueText: "text-sky-700 dark:text-sky-300",
    topBar: "bg-sky-500",
  },
  amber: {
    baseClass: "bg-amber-50/80 dark:bg-amber-950/35 border-amber-200/90 dark:border-amber-800/80 shadow-2xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600",
    iconBg: "bg-amber-500 text-white shadow-xs",
    labelText: "text-amber-950 dark:text-amber-200 font-extrabold",
    valueText: "text-amber-700 dark:text-amber-300",
    topBar: "bg-amber-500",
  },
  emerald: {
    baseClass: "bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600",
    iconBg: "bg-emerald-600 text-white shadow-xs",
    labelText: "text-emerald-950 dark:text-emerald-200 font-extrabold",
    valueText: "text-emerald-700 dark:text-emerald-300",
    topBar: "bg-emerald-500",
  },
  rose: {
    baseClass: "bg-rose-50/80 dark:bg-rose-950/35 border-rose-200/90 dark:border-rose-800/80 shadow-2xs hover:shadow-md hover:border-rose-400 dark:hover:border-rose-600",
    iconBg: "bg-rose-600 text-white shadow-xs",
    labelText: "text-rose-950 dark:text-rose-200 font-extrabold",
    valueText: "text-rose-700 dark:text-rose-300",
    topBar: "bg-rose-500",
  },
  purple: {
    baseClass: "bg-purple-50/80 dark:bg-purple-950/35 border-purple-200/90 dark:border-purple-800/80 shadow-2xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600",
    iconBg: "bg-purple-600 text-white shadow-xs",
    labelText: "text-purple-950 dark:text-purple-200 font-extrabold",
    valueText: "text-purple-700 dark:text-purple-300",
    topBar: "bg-purple-500",
  },
  indigo: {
    baseClass: "bg-indigo-50/80 dark:bg-indigo-950/35 border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600",
    iconBg: "bg-indigo-600 text-white shadow-xs",
    labelText: "text-indigo-950 dark:text-indigo-200 font-extrabold",
    valueText: "text-indigo-700 dark:text-indigo-300",
    topBar: "bg-indigo-600",
  },
};

/* ─── TaskScreen / TaskBoard KPI Card (Exact match to Task screen without sub-labels) ─── */
function TaskBoardKPICard({ label, value, theme = "blue", Icon, to, loading = false }) {
  const cfg = CARD_THEMES[theme] || CARD_THEMES.blue;
  if (loading) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border p-3 sm:p-3.5 flex items-center justify-between min-h-[72px] select-none animate-pulse ${cfg.baseClass}`}
      >
        <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />
        <div className="flex-1 min-w-0 pr-2 space-y-2">
          <div className="h-2.5 w-16 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-6 w-12 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-300/80 dark:bg-slate-700/80 flex-shrink-0" />
      </div>
    );
  }

  const content = (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 select-none p-3 sm:p-3.5 flex items-center justify-between min-h-[72px] cursor-pointer hover:-translate-y-0.5 ${cfg.baseClass}`}
    >
      {/* Top Accent Strip */}
      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />

      <div className="flex-1 min-w-0 pr-2">
        <span className={`text-[10.5px] uppercase tracking-wider truncate font-extrabold block mb-1 ${cfg.labelText}`}>
          {label}
        </span>
        <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${cfg.valueText}`}>
          {value}
        </h3>
      </div>

      {Icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="block no-underline">{content}</Link>;
  }
  return content;
}

function SkeletonBox({ height = "h-48" }) {
  return (
    <div className={`w-full ${height} rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 animate-pulse flex flex-col items-center justify-center gap-2`}>
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin opacity-60" />
      <span className="text-[11px] text-slate-400 font-medium">Loading metrics...</span>
    </div>
  );
}

function SkeletonRows({ count = 5, cols = 5 }) {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={idx}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="py-3 px-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* ─── Compact Executive KPI Tile (Clean, Professional, No Loud Borders) ─── */
function CompactKPITile({ label, value, subtext, Icon, iconColor = "text-indigo-600 dark:text-indigo-400", to }) {
  const content = (
    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-all select-none group">
      <div className="min-w-0 flex-1 pr-2">
        <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block truncate">
          {label}
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
            {value}
          </span>
          {subtext && (
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
              {subtext}
            </span>
          )}
        </div>
      </div>
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          <Icon size={16} className={iconColor} />
        </div>
      )}
    </div>
  );

  return to ? <Link to={to} className="block no-underline">{content}</Link> : content;
}

const getTaskAssigneeNames = (task, employeeList = []) => {
  if (!task) return "Unassigned";
  const arr = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : (task.assignedTo ? [task.assignedTo] : (task.assignees || []));
  if (arr.length === 0) return "Unassigned";
  const names = arr
    .map((a) => {
      if (!a) return "";
      if (typeof a === "object") {
        const n = a.fullName || (a.firstName ? `${a.firstName} ${a.lastName || ""}`.trim() : a.name);
        if (n) return n;
      }
      const idStr = String(a._id || a.id || a);
      const member = employeeList.find((m) => String(m._id || m.id) === idStr);
      if (member) {
        return member.fullName || (member.firstName ? `${member.firstName} ${member.lastName || ""}`.trim() : member.name);
      }
      return typeof a === "string" && a.length > 20 ? "Team Member" : String(a);
    })
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Unassigned";
};

const getTaskDueDateStr = (task) => {
  if (!task) return "—";
  const raw = task.endDateTime || task.endDate || task.dueDate;
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB");
};

export default function CompanyDashboard() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [timeRange, setTimeRange] = useState("all");
  const [taskTableFilter, setTaskTableFilter] = useState("all");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // ── Queries ──
  const { data: dashRes, isLoading: isLoadingDash } = useQuery({
    queryKey: ["companyDashboard"],
    queryFn: async () => {
      const res = await getCompanyDashboardApi();
      return res.data?.data || res.data || {};
    },
    staleTime: 30000,
  });

  const { data: tasksRes, isLoading: isLoadingTasks } = useQuery({
    queryKey: ["companyDashboardAllTasks"],
    queryFn: async () => {
      const res = await getTasksApi({ limit: 500 });
      return res.data?.tasks || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    enabled: !!hasPermission("tasks"),
    staleTime: 30000,
  });

  const { data: projectsRes, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["companyProjects"],
    queryFn: async () => {
      const res = await getProjectsApi();
      return res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    enabled: !!hasPermission("projects"),
    staleTime: 30000,
  });

  const { data: empRes } = useQuery({
    queryKey: ["companyEmployees"],
    queryFn: async () => {
      const res = await getEmployeesApi({ limit: 200 });
      return res.data?.employees || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    staleTime: 30000,
  });

  const { data: branchesRes } = useQuery({
    queryKey: ["companyBranches"],
    queryFn: async () => {
      const res = await getBranchesApi();
      return res.data?.branches || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    staleTime: 60000,
  });

  const { data: departmentsRes } = useQuery({
    queryKey: ["companyDepartments"],
    queryFn: async () => {
      const res = await getDepartmentsApi();
      return res.data?.departments || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    staleTime: 60000,
  });

  const { data: leadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["leadEngineData"],
    queryFn: async () => {
      const [leadsRes, statusesRes] = await Promise.allSettled([
        leadApi.get("/api/leads?limit=200"),
        leadApi.get("/api/statuses"),
      ]);
      const rawLeads = leadsRes.status === "fulfilled" && (leadsRes.value?.leads || leadsRes.value?.data?.leads || (Array.isArray(leadsRes.value) ? leadsRes.value : []));
      const rawStatuses = statusesRes.status === "fulfilled" && Array.isArray(statusesRes.value) ? statusesRes.value : [];
      return { leads: Array.isArray(rawLeads) ? rawLeads : [], statuses: rawStatuses };
    },
    enabled: !!hasPermission("leads"),
    staleTime: 30000,
  });

  const { data: auditRes } = useQuery({
    queryKey: ["companyAuditLogs"],
    queryFn: async () => {
      const res = await getCompanyAuditLogsApi({ limit: 10 });
      return res.data?.logs || res.data?.data || (Array.isArray(res.data) ? res.data : []);
    },
    staleTime: 30000,
  });

  // ── Processed Data ──
  const kpis = dashRes?.kpis || {};
  const realEmps = useMemo(() => {
    if (Array.isArray(empRes)) return empRes;
    if (Array.isArray(empRes?.employees)) return empRes.employees;
    if (Array.isArray(empRes?.data)) return empRes.data;
    return [];
  }, [empRes]);

  const realTasks = useMemo(() => {
    if (Array.isArray(tasksRes)) return tasksRes;
    if (Array.isArray(tasksRes?.tasks)) return tasksRes.tasks;
    if (Array.isArray(tasksRes?.data)) return tasksRes.data;
    return [];
  }, [tasksRes]);

  const realProjects = useMemo(() => {
    if (Array.isArray(projectsRes)) return projectsRes;
    if (Array.isArray(projectsRes?.projects)) return projectsRes.projects;
    if (Array.isArray(projectsRes?.data)) return projectsRes.data;
    return [];
  }, [projectsRes]);

  const realLeads = useMemo(() => {
    if (Array.isArray(leadsData?.leads)) return leadsData.leads;
    if (Array.isArray(leadsData)) return leadsData;
    return [];
  }, [leadsData]);

  const realBranches = useMemo(() => {
    if (Array.isArray(branchesRes)) return branchesRes;
    if (Array.isArray(branchesRes?.branches)) return branchesRes.branches;
    if (Array.isArray(branchesRes?.data)) return branchesRes.data;
    return [];
  }, [branchesRes]);

  const realDepartments = useMemo(() => {
    if (Array.isArray(departmentsRes)) return departmentsRes;
    if (Array.isArray(departmentsRes?.departments)) return departmentsRes.departments;
    if (Array.isArray(departmentsRes?.data)) return departmentsRes.data;
    return [];
  }, [departmentsRes]);

  const realLogs = useMemo(() => {
    if (Array.isArray(auditRes)) return auditRes;
    if (Array.isArray(auditRes?.logs)) return auditRes.logs;
    if (Array.isArray(auditRes?.data)) return auditRes.data;
    return [];
  }, [auditRes]);

  const totalEmployees = kpis.totalEmployees ?? realEmps.length;
  const activeProjectsCount = realProjects.length || kpis.activeProjects || 0;
  const presentCount = kpis.presentToday ?? 0;
  const absentCount = kpis.absentToday ?? Math.max(0, totalEmployees - presentCount);
  const onLeaveCount = kpis.onLeave ?? 0;
  const lateCount = kpis.lateToday ?? 0;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  // ── Top Tasks Performers (Resolving real names & completed tasks) ──
  const topPerformers = useMemo(() => {
    const performerMap = {};

    const resolveAssignee = (a) => {
      if (!a) return null;
      const id = typeof a === "object" ? (a._id || a.id) : a;
      if (!id) return null;
      const idStr = String(id);

      let name = "";
      let role = "";

      if (typeof a === "object") {
        name = a.fullName || (a.firstName ? `${a.firstName} ${a.lastName || ""}`.trim() : a.name);
        role = a.role || a.designationId?.name || a.designationName || "";
      }

      // Check realEmps for matching employee details
      const member = realEmps.find((m) => String(m._id || m.id) === idStr);
      if (member) {
        if (!name || name === "Team Member") {
          name = member.fullName || (member.firstName ? `${member.firstName} ${member.lastName || ""}`.trim() : member.name);
        }
        if (!role || role === "Employee") {
          role = member.role || member.designationId?.name || member.designationName || "Team Member";
        }
      }

      return {
        id: idStr,
        name: name || "Team Member",
        role: role || "Employee",
      };
    };

    realTasks.forEach((t) => {
      const st = (t.status || "").toLowerCase();
      const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(st);
      const assignees = Array.isArray(t.assignedTo)
        ? t.assignedTo
        : (t.assignedTo ? [t.assignedTo] : (t.assignees || []));

      assignees.forEach((a) => {
        const info = resolveAssignee(a);
        if (!info) return;
        if (!performerMap[info.id]) {
          performerMap[info.id] = { id: info.id, name: info.name, role: info.role, completed: 0, total: 0 };
        }
        performerMap[info.id].total += 1;
        if (isDone) {
          performerMap[info.id].completed += 1;
        }
      });
    });

    let list = Object.values(performerMap);
    list.sort((a, b) => (b.completed - a.completed) || (b.total - a.total));

    // Fill with remaining real employees if needed
    if (list.length < 5 && realEmps.length > 0) {
      realEmps.forEach((emp) => {
        const id = String(emp._id || emp.id);
        if (!list.find((x) => String(x.id) === id)) {
          const name = emp.fullName || (emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : emp.name) || "Team Member";
          const role = emp.role || emp.designationId?.name || emp.designationName || "Employee";
          list.push({ id, name, role, completed: 0, total: 0 });
        }
      });
    }

    return list.slice(0, 5);
  }, [realTasks, realEmps]);

  // ── Upcoming Deadlines ──
  const upcomingDeadlines = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    realProjects.forEach((p) => {
      const raw = p.deadline || p.endDate || p.targetDate;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
          list.push({
            id: `p-${p._id}`,
            title: p.name || p.title || "Project Milestone",
            type: "Project",
            date: d.toLocaleDateString("en-GB"),
            diffDays,
          });
        }
      }
    });

    realTasks.forEach((t) => {
      const raw = t.endDateTime || t.endDate || t.dueDate;
      const st = (t.status || "").toLowerCase();
      const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(st);
      if (!isDone && raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
          list.push({
            id: `t-${t._id}`,
            title: t.title || t.name || "Task Deadline",
            type: "Task",
            date: d.toLocaleDateString("en-GB"),
            diffDays,
          });
        }
      }
    });

    // Sort: future/today deadlines first (ascending), then past
    list.sort((a, b) => {
      if (a.diffDays >= 0 && b.diffDays < 0) return -1;
      if (a.diffDays < 0 && b.diffDays >= 0) return 1;
      return a.diffDays - b.diffDays;
    });

    return list.slice(0, 5);
  }, [realProjects, realTasks]);

  // ── Tasks Tab Data ──
  const totalTasksCount = realTasks.length;
  const completedTasksCount = useMemo(() =>
    realTasks.filter((t) =>
      ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes((t.status || "").toLowerCase())
    ).length,
    [realTasks]
  );
  const activeTasksCount = useMemo(() =>
    realTasks.filter((t) =>
      ["in_process", "re_in_process", "in-progress", "working"].includes((t.status || "").toLowerCase())
    ).length,
    [realTasks]
  );
  const pendingTasksCount = useMemo(() =>
    realTasks.filter((t) =>
      ["pending", "re_pending", "todo"].includes((t.status || "").toLowerCase())
    ).length,
    [realTasks]
  );
  const overdueTasksCount = useMemo(() => {
    const now = Date.now();
    return realTasks.filter((t) => {
      if (t.isTemplate) return false;
      const st = (t.status || "").toLowerCase();
      const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(st);
      if (isDone) return false;
      if (st === "overdue") return true;
      const raw = t.endDateTime || t.endDate || t.dueDate;
      if (!raw) return false;
      const dueTime = new Date(raw).getTime();
      return !isNaN(dueTime) && now >= dueTime;
    }).length;
  }, [realTasks]);

  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Filtered recent tasks for Tasks tab
  const filteredRecentTasks = useMemo(() => {
    if (taskTableFilter === "all") return realTasks;
    if (taskTableFilter === "in_process") {
      return realTasks.filter((t) =>
        ["in_process", "re_in_process", "in-progress", "working"].includes((t.status || "").toLowerCase())
      );
    }
    if (taskTableFilter === "pending") {
      return realTasks.filter((t) =>
        ["pending", "re_pending", "todo"].includes((t.status || "").toLowerCase())
      );
    }
    if (taskTableFilter === "completed") {
      return realTasks.filter((t) =>
        ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes((t.status || "").toLowerCase())
      );
    }
    if (taskTableFilter === "overdue") {
      const now = Date.now();
      return realTasks.filter((t) => {
        const st = (t.status || "").toLowerCase();
        const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(st);
        if (isDone) return false;
        if (st === "overdue") return true;
        const raw = t.endDateTime || t.endDate || t.dueDate;
        return raw && new Date(raw).getTime() <= now;
      });
    }
    return realTasks;
  }, [realTasks, taskTableFilter]);

  const weeklyCompletionTrend = useMemo(() => {
    const days = [
      { label: "Mon", count: 0 },
      { label: "Tue", count: 0 },
      { label: "Wed", count: 0 },
      { label: "Thu", count: 0 },
      { label: "Fri", count: 0 },
      { label: "Sat", count: 0 },
      { label: "Sun", count: 0 },
    ];
    realTasks.forEach((t) => {
      const st = (t.status || "").toLowerCase();
      if (["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(st)) {
        const d = t.updatedAt || t.completedAt || t.endDateTime || t.dueDate;
        if (d) {
          const dayStr = new Date(d).toLocaleDateString("en-US", { weekday: "short" });
          const target = days.find((x) => x.label === dayStr);
          if (target) target.count += 1;
        }
      }
    });
    return days;
  }, [realTasks]);

  const priorityDistribution = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    realTasks.forEach((t) => {
      const p = (t.priority || "").toLowerCase();
      if (p.includes("high") || p.includes("urgent")) high++;
      else if (p.includes("med")) medium++;
      else low++;
    });
    return [
      { name: "High", value: high, color: "#EF4444" },
      { name: "Medium", value: medium, color: "#F59E0B" },
      { name: "Low", value: low, color: "#3B82F6" },
    ];
  }, [realTasks]);

  // ── Leads Tab Real Data ──
  const totalLeadsCount = realLeads.length;
  const totalLeadValue = useMemo(() => {
    return realLeads.reduce((acc, l) => {
      const val = Number(l.value || l.dealValue || l.estimatedValue || l.budget || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [realLeads]);

  const avgLeadValue = totalLeadsCount > 0 ? Math.round(totalLeadValue / totalLeadsCount) : 0;

  const activeLeadsCount = useMemo(() => {
    return realLeads.filter((l) => {
      const st = (l.status?.name || l.statusName || (typeof l.status === "string" ? l.status : "") || "").toLowerCase();
      return !st.includes("won") && !st.includes("lost") && !st.includes("cancel");
    }).length;
  }, [realLeads]);

  const STAGE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899"];

  const leadsByStage = useMemo(() => {
    if (!realLeads || realLeads.length === 0) {
      return [
        { name: "New", count: 0, color: "#3B82F6" },
        { name: "Contacted", count: 0, color: "#10B981" },
        { name: "Proposal", count: 0, color: "#F59E0B" },
      ];
    }
    const map = {};
    realLeads.forEach((l) => {
      const stageName = l.status?.name || l.statusName || (typeof l.status === "string" ? l.status : "New");
      const key = stageName.charAt(0).toUpperCase() + stageName.slice(1).toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, count], idx) => ({
      name,
      count,
      color: STAGE_COLORS[idx % STAGE_COLORS.length],
    }));
  }, [realLeads]);

  const leadsBySource = useMemo(() => {
    if (!realLeads || realLeads.length === 0) {
      return [
        { name: "Website", count: 0 },
        { name: "Referral", count: 0 },
      ];
    }
    const map = {};
    realLeads.forEach((l) => {
      const src = l.source || "Website";
      const key = src.charAt(0).toUpperCase() + src.slice(1).replace(/_/g, " ").toLowerCase();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
    }));
  }, [realLeads]);

  // ── Top Lead Performers (for Leads Dashboard / Tab) ──
  const topLeadPerformers = useMemo(() => {
    const leadMap = {};
    const resolveLeadUser = (u) => {
      if (!u) return null;
      const id = typeof u === "object" ? (u._id || u.id) : u;
      if (!id) return null;
      const idStr = String(id);
      let name = "";
      if (typeof u === "object") {
        name = u.fullName || (u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.name);
      }
      const match = realEmps.find((m) => String(m._id || m.id) === idStr);
      if (match && (!name || name === "User")) {
        name = match.fullName || (match.firstName ? `${match.firstName} ${match.lastName || ""}`.trim() : match.name);
      }
      const role = match?.role || match?.designationId?.name || "Sales Rep";
      return { id: idStr, name: name || "Sales Rep", role };
    };

    realLeads.forEach((l) => {
      const u = l.assignedTo || (Array.isArray(l.assignedToUsers) && l.assignedToUsers[0]) || l.createdBy;
      const user = resolveLeadUser(u);
      if (!user) return;
      if (!leadMap[user.id]) {
        leadMap[user.id] = { id: user.id, name: user.name, role: user.role, total: 0, won: 0, value: 0 };
      }
      leadMap[user.id].total += 1;
      const st = (l.status?.name || l.statusName || (typeof l.status === "string" ? l.status : "") || "").toLowerCase();
      const val = Number(l.estimatedValue || l.value || l.dealValue || 0) || 0;
      leadMap[user.id].value += val;
      if (st.includes("won") || st.includes("close") || st.includes("converted") || st.includes("success")) {
        leadMap[user.id].won += 1;
      }
    });

    let list = Object.values(leadMap);
    list.sort((a, b) => (b.won - a.won) || (b.value - a.value) || (b.total - a.total));

    if (list.length < 5 && realEmps.length > 0) {
      realEmps.forEach((emp) => {
        const id = String(emp._id || emp.id);
        if (!list.find((x) => String(x.id) === id)) {
          const name = emp.fullName || (emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : emp.name) || "Sales Rep";
          const role = emp.role || emp.designationId?.name || "Sales Rep";
          list.push({ id, name, role, total: 0, won: 0, value: 0 });
        }
      });
    }

    return list.slice(0, 5);
  }, [realLeads, realEmps]);

  // ── Upcoming Deadlines for Leads Tab ──
  const leadUpcomingDeadlines = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    realLeads.forEach((l) => {
      const raw = l.nextFollowUpDate || l.followUpDate || l.reminderDate || l.expectedCloseDate;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
          list.push({
            id: `lead-${l._id || l.id}`,
            title: l.company || l.name || "Client Follow-up",
            contact: l.name || l.contactPerson || "Lead Contact",
            phone: l.phone || l.whatsappPhone || "",
            value: Number(l.estimatedValue || l.value || 0),
            date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            diffDays,
            type: "Follow-up",
          });
        }
      }
    });

    list.sort((a, b) => {
      if (a.diffDays >= 0 && b.diffDays < 0) return -1;
      if (a.diffDays < 0 && b.diffDays >= 0) return 1;
      return a.diffDays - b.diffDays;
    });

    // If fewer lead deadlines, supplement with upcoming task/project deadlines so it's richly populated
    if (list.length < 5) {
      upcomingDeadlines.forEach((ud) => {
        if (list.length < 5 && !list.find((x) => x.id === ud.id)) {
          list.push({
            id: ud.id,
            title: ud.title,
            contact: ud.type === "Project" ? "Milestone" : "Task Due",
            phone: "",
            value: 0,
            date: ud.date,
            diffDays: ud.diffDays,
            type: ud.type,
          });
        }
      });
    }

    return list.slice(0, 5);
  }, [realLeads, upcomingDeadlines]);

  // ── Attendance Data ──
  const attendancePie = useMemo(() => [
    { name: "Present", value: presentCount || 1, color: "#10B981" },
    { name: "Absent", value: absentCount || 0, color: "#EF4444" },
    { name: "On Leave", value: onLeaveCount || 0, color: "#F59E0B" },
    { name: "Late / Half Day", value: lateCount || 0, color: "#8B5CF6" },
  ], [presentCount, absentCount, onLeaveCount, lateCount]);

  const attendanceTrendData = useMemo(() => [
    { day: "Mon", rate: 88 },
    { day: "Tue", rate: 92 },
    { day: "Wed", rate: 85 },
    { day: "Thu", rate: 94 },
    { day: "Fri", rate: 90 },
    { day: "Sat", rate: 75 },
    { day: "Today", rate: attendanceRate || 85 },
  ], [attendanceRate]);

  // ── Project Distribution ──
  const projectStatusDistribution = useMemo(() => [
    { name: "In Progress", value: activeProjectsCount || 2, color: "#3B82F6" },
    { name: "Planning", value: 1, color: "#F59E0B" },
    { name: "Completed", value: 3, color: "#10B981" },
    { name: "On Hold", value: 1, color: "#94A3B8" },
  ], [activeProjectsCount]);

  // Tabs configuration
  const tabs = [
    { id: "overview", label: "Overview", Icon: TrendingUp },
    { id: "tasks", label: "Tasks", Icon: CheckSquare },
    { id: "leads", label: "Leads", Icon: Target },
    { id: "projects", label: "Projects", Icon: Folder },
    { id: "attendance", label: "Attendance", Icon: Calendar },
    { id: "branches", label: "Branches", Icon: Building2 },
  ];

  return (
    <div className="space-y-3 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full">

      {/* ── UNIFIED EXECUTIVE HEADER & TAB NAVIGATION ── */}
      <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 flex-shrink-0">
              <Rocket size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Business Intelligence
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Zap size={12} className="text-amber-500 fill-amber-500" />
                Real-time organizational analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live data sync
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 no-scrollbar border-t border-slate-100 dark:border-slate-800/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${isActive
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
              >
                <tab.Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW (Compact & Unified - Screenshot 1)                      */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* Top 5 Compact Stat Blocks (Matching Task screen KPI card design) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <TaskBoardKPICard
              label="Total Employees"
              value={totalEmployees}
              theme="blue"
              Icon={Users}
              to="/company/employees"
              loading={isLoadingDash}
            />
            <TaskBoardKPICard
              label="Total Tasks"
              value={totalTasksCount}
              theme="indigo"
              Icon={CheckSquare}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
            <TaskBoardKPICard
              label="Total Leads"
              value={totalLeadsCount}
              theme="emerald"
              Icon={Target}
              to="/company/leads"
              loading={isLoadingLeads}
            />
            <TaskBoardKPICard
              label="Active Projects"
              value={activeProjectsCount}
              theme="amber"
              Icon={Folder}
              to="/company/projects"
              loading={isLoadingDash || isLoadingProjects}
            />
            <TaskBoardKPICard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              theme="purple"
              Icon={TrendingUp}
              to="/company/attendance"
              loading={isLoadingDash}
            />
          </div>

          {/* 2-Column Section: Top Tasks Performers & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Left: Top Tasks Performers (Clean compact list) */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Top Tasks Performers
              </h2>

              {isLoadingTasks ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-2.5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {topPerformers.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#E0F2FE] dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.role} - {p.completed} items completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Upcoming Deadlines (Clean divider list) */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Upcoming Deadlines
              </h2>

              {isLoadingTasks ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
                        <div className="space-y-1">
                          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                      </div>
                      <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingDeadlines.map((d, idx) => (
                    <div
                      key={d.id || idx}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {d.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {d.type} • {d.diffDays < 0 ? `${Math.abs(d.diffDays)}d overdue` : d.diffDays === 0 ? "Due today" : `Due in ${d.diffDays}d`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">
                        {d.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Grid: Project Status Distribution & Recent Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Project Status Distribution */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Project Status Distribution
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
                <div className="w-32 h-32 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {projectStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                      {activeProjectsCount}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Projects</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                  {projectStatusDistribution.map((p) => (
                    <div key={p.name} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{p.name}</span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{p.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Tickets
                </h2>
                <Link to="/company/announcements" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(realLogs.length > 0 ? realLogs.slice(0, 4) : [
                  { _id: "t1", performedBy: { name: "System Admin" }, action: "DATABASE_SYNC", module: "Live Core", createdAt: new Date() },
                  { _id: "t2", performedBy: { name: "Support Team" }, action: "TICKET_RESOLVED", module: "CRM Gateway", createdAt: new Date() }
                ]).map((log, idx) => (
                  <div key={log._id || idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        <span className="font-bold text-slate-900 dark:text-white">{log.performedBy?.name || "System"}</span> • {log.action?.replace(/_/g, " ")} <span className="text-slate-500 font-medium">({log.module})</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TASKS (Exact Task Screen KPI Cards - Without Sublabels)         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Task Management</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Monitor and analyze team task performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>

          {/* 5 TaskScreen / TaskBoard KPI Cards (Exact match to Task screen without sub-labels) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <TaskBoardKPICard
              label="Total Tasks"
              value={totalTasksCount}
              theme="blue"
              Icon={Layers}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
            <TaskBoardKPICard
              label="Pending Tasks"
              value={pendingTasksCount}
              theme="sky"
              Icon={Clock}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
            <TaskBoardKPICard
              label="In Process"
              value={activeTasksCount}
              theme="amber"
              Icon={Sparkles}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
            <TaskBoardKPICard
              label="Completed"
              value={completedTasksCount}
              theme="emerald"
              Icon={CheckCircle}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
            <TaskBoardKPICard
              label="Overdue"
              value={overdueTasksCount}
              theme="rose"
              Icon={AlertTriangle}
              to="/company/tasks"
              loading={isLoadingTasks}
            />
          </div>

          {/* 2-Column Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Weekly Completion Trend */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-blue-500" /> Weekly Completion Trend
                </h3>
              </div>
              {isLoadingTasks ? (
                <SkeletonBox height="h-56" />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyCompletionTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#FFF", fontSize: "11px" }}
                        formatter={(v) => [`${v} tasks`, "Completed"]}
                      />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Task Priority Distribution */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-500" /> Task Priority Distribution
                </h3>
              </div>
              {isLoadingTasks ? (
                <SkeletonBox height="h-48" />
              ) : (
                <>
                  <div className="h-48 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {priorityDistribution.map((entry, index) => (
                            <Cell key={`p-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {priorityDistribution.map((p) => (
                      <div key={p.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.name} ({p.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2-Column: Top Tasks Performers & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Top Tasks Performers */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                    <Award size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Tasks Performers</h3>
                    <p className="text-[11px] text-slate-400">Team task completion leaderboard</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {isLoadingTasks ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="space-y-1">
                            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                          </div>
                        </div>
                        <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : topPerformers.length > 0 ? (
                  topPerformers.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? "bg-amber-400 text-amber-950" :
                            idx === 1 ? "bg-slate-300 text-slate-800" :
                              idx === 2 ? "bg-amber-600 text-white" :
                                "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}>
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{p.role}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {p.completed} Completed
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No completed task records yet</p>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                    <Clock size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
                    <p className="text-[11px] text-slate-400">Critical milestones & task due dates</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {isLoadingTasks ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${d.type === "Project" ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300" : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          }`}>
                          {d.type}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{d.title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.diffDays < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                            d.diffDays <= 2 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" :
                              "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}>
                          {d.diffDays < 0 ? `${Math.abs(d.diffDays)}d overdue` : d.diffDays === 0 ? "Due today" : `in ${d.diffDays}d`}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{d.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No upcoming deadlines</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Team Tasks Table with Active / Status Filter Pills */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Team Tasks</h3>
                <span className="text-xs font-bold text-slate-400 font-mono">({filteredRecentTasks.length})</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "All Tasks" },
                  { id: "in_process", label: "Active (In Process)" },
                  { id: "pending", label: "Pending" },
                  { id: "completed", label: "Completed" },
                  { id: "overdue", label: "Overdue" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTaskTableFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${taskTableFilter === f.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
                <Link to="/company/tasks" className="text-xs font-bold text-indigo-600 hover:underline ml-2">
                  View All ({totalTasksCount})
                </Link>
              </div>
            </div>

            {isLoadingTasks ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="pb-2.5">Task Name</th>
                      <th className="pb-2.5">Assignee</th>
                      <th className="pb-2.5">Priority</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <SkeletonRows count={5} cols={5} />
                </table>
              </div>
            ) : filteredRecentTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="pb-2.5">Task Name</th>
                      <th className="pb-2.5">Assignee</th>
                      <th className="pb-2.5">Priority</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredRecentTasks.slice(0, 10).map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-2 font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                          {t.title || t.name}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {getTaskAssigneeNames(t, realEmps)}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${(t.priority || "").toLowerCase().includes("high") ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" :
                              (t.priority || "").toLowerCase().includes("med") ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" :
                                "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                            }`}>
                            {t.priority || "Normal"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${["in_process", "re_in_process", "working"].includes((t.status || "").toLowerCase()) ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" :
                              ["complete", "completed", "done", "late_complete", "re_complete"].includes((t.status || "").toLowerCase()) ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                (t.status || "").toLowerCase().includes("overdue") ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" :
                                  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                            }`}>
                            {(t.status || "Pending").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 font-mono">
                          {getTaskDueDateStr(t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6">
                <Inbox size={22} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-400">No tasks found matching filter</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: LEADS (Proper Lead Display & Table)                               */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "leads" && (
        <div className="space-y-3">
          {/* Subheader without Add New Lead button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Lead Management</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Track conversion  and revenue opportunities
              </p>
            </div>
            <Link
              to="/company/leads"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              Open Leads CRM <ArrowRight size={13} />
            </Link>
          </div>

          {/* 4 TaskScreen-styled Leads KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <TaskBoardKPICard
              label="Total Leads"
              value={totalLeadsCount}
              theme="blue"
              Icon={Target}
              to="/company/leads"
              loading={isLoadingLeads}
            />
            <TaskBoardKPICard
              label="Total Value"
              value={`₹${totalLeadValue.toLocaleString('en-IN')}`}
              theme="emerald"
              Icon={DollarSign}
              to="/company/leads"
              loading={isLoadingLeads}
            />
            <TaskBoardKPICard
              label="Avg Lead Value"
              value={`₹${Math.round(avgLeadValue).toLocaleString('en-IN')}`}
              theme="purple"
              Icon={TrendingUp}
              to="/company/leads"
              loading={isLoadingLeads}
            />
            <TaskBoardKPICard
              label="Active Leads"
              value={activeLeadsCount}
              theme="amber"
              Icon={Clock}
              to="/company/leads"
              loading={isLoadingLeads}
            />
          </div>

          {/* 2-Column Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Leads by Stage */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Leads by Stage
              </h3>
              {isLoadingLeads ? (
                <SkeletonBox height="h-52" />
              ) : (
                <>
                  <div className="h-52 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadsByStage}
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          dataKey="count"
                          label={({ name, count }) => `${name}: ${count}`}
                        >
                          {leadsByStage.map((entry, index) => (
                            <Cell key={`s-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {leadsByStage.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Leads by Source */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Leads by Source
              </h3>
              {isLoadingLeads ? (
                <SkeletonBox height="h-56" />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsBySource} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} interval={0} angle={-25} textAnchor="end" />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#FFF", fontSize: "11px" }}
                        formatter={(v) => [`${v} leads`, "Count"]}
                      />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Recent Leads Table Below */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Leads</h3>
              <Link to="/company/leads" className="text-xs font-bold text-indigo-600 hover:underline">
                View CRM  ({totalLeadsCount})
              </Link>
            </div>
            {isLoadingLeads ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="pb-2.5">Lead / Company</th>
                      <th className="pb-2.5">Contact Person</th>
                      <th className="pb-2.5">Value</th>
                      <th className="pb-2.5">Stage</th>
                      <th className="pb-2.5">Source</th>
                    </tr>
                  </thead>
                  <SkeletonRows count={5} cols={5} />
                </table>
              </div>
            ) : realLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="pb-2.5">Lead / Company</th>
                      <th className="pb-2.5">Contact Person</th>
                      <th className="pb-2.5">Value</th>
                      <th className="pb-2.5">Stage</th>
                      <th className="pb-2.5">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-slate-100 dark:divide-slate-800 font-medium">
                    {realLeads.slice(0, 6).map((l, i) => (
                      <tr key={l._id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{l.title || l.companyName || l.name || "Lead Record"}</td>
                        <td className="py-2.5 text-slate-500">{l.contactPerson || l.email || "—"}</td>
                        <td className="py-2.5 font-bold text-emerald-600">₹{(l.value || l.estimatedValue || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                            {l.status?.name || l.status || "New"}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 capitalize">{l.source || "Website"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6">
                <Inbox size={22} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-400">No leads recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ATTENDANCE                                                       */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Attendance Analytics</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Real-time workforce presence, shift compliance, and punctuality
              </p>
            </div>
            <Link
              to="/company/attendance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              Open Daily Attendance <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <TaskBoardKPICard
              label="Present Today"
              value={presentCount}
              theme="emerald"
              Icon={UserCheck}
              to="/company/attendance"
            />
            <TaskBoardKPICard
              label="Absent Today"
              value={absentCount}
              theme="rose"
              Icon={UserX}
              to="/company/attendance"
            />
            <TaskBoardKPICard
              label="On Leave"
              value={onLeaveCount}
              theme="amber"
              Icon={CalendarOff}
              to="/company/leaves"
            />
            <TaskBoardKPICard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              theme="purple"
              Icon={TrendingUp}
              to="/company/attendance"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Attendance Trend (Last 7 Days)
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attG2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1E293B", borderRadius: "8px", color: "#FFF", fontSize: "11px" }}
                      formatter={(v) => [`${v}%`, "Rate"]}
                    />
                    <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} fill="url(#attG2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Today's Breakdown
              </h3>
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {attendancePie.map((entry, index) => (
                        <Cell key={`att-p-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {attendancePie.map((a) => (
                  <div key={a.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{a.name}: {a.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: PROJECTS                                                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "projects" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Project Portfolio</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Track milestones, delivery timelines, and project velocity
              </p>
            </div>
            <Link
              to="/company/projects"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              Open Projects Hub <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <TaskBoardKPICard
              label="Total Projects"
              value={realProjects.length || 2}
              theme="blue"
              Icon={Folder}
              to="/company/projects"
            />
            <TaskBoardKPICard
              label="In Progress"
              value={realProjects.filter((p) => (p.status || "").toLowerCase().includes("active") || (p.status || "").toLowerCase().includes("work")).length || 2}
              theme="amber"
              Icon={Clock}
              to="/company/projects"
            />
            <TaskBoardKPICard
              label="Completed"
              value={realProjects.filter((p) => (p.status || "").toLowerCase().includes("complete")).length || 0}
              theme="emerald"
              Icon={CheckCircle2}
              to="/company/projects"
            />
            <TaskBoardKPICard
              label="Planning"
              value={realProjects.filter((p) => (p.status || "").toLowerCase().includes("plan")).length || 1}
              theme="purple"
              Icon={Briefcase}
              to="/company/projects"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(realProjects.length > 0 ? realProjects : [
              { _id: "p1", name: "Jsp Client Portal", client: "Jsp Enterprises", status: "active", progress: 65, deadline: "2026-07-08" },
              { _id: "p2", name: "For demo CRM System", client: "One Click AI", status: "active", progress: 40, deadline: "2026-07-10" }
            ]).map((proj) => (
              <div key={proj._id} className="bg-white dark:bg-[#111C24] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 capitalize">
                    {proj.status || "In Progress"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Deadline: {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : "Upcoming"}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{proj.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{proj.client || "Internal Company Project"}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Progress</span>
                    <span>{proj.progress || 50}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${proj.progress || 50}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: BRANCHES                                                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "branches" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Branches & Departments</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Organizational units, department distribution, and office locations
              </p>
            </div>
            <Link
              to="/company/branches"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              Manage Branches <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(realBranches.length > 0 ? realBranches : [
              { _id: "b1", name: "Main Headquarters", city: "Mumbai", address: "Corporate Park, Bandra", employeeCount: totalEmployees },
              { _id: "b2", name: "Tech Development Center", city: "Pune", address: "IT Hub, Hinjewadi", employeeCount: 4 }
            ]).map((b) => (
              <div key={b._id} className="bg-white dark:bg-[#111C24] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin size={11} /> {b.city || "Head Office"}, {b.address || "Corporate Center"}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Staff count</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{b.employeeCount || 4} Employees</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Direct Task Creation Modal ── */}
      {isTaskModalOpen && (
        <TaskCreateModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onTaskCreated={() => {
            setIsTaskModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["companyTasks"] });
            queryClient.invalidateQueries({ queryKey: ["companyDashboard"] });
          }}
        />
      )}
    </div>
  );
}
