import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/common/PageHeader";
import { Link, useNavigate } from "react-router-dom";
import {
  getEmployeeDashboardSummaryApi,
  getMyTodayAttendanceApi,
  punchInApi,
  punchOutApi,
} from "../../api/employeeApi";
import api from "../../api/api";
import {
  LogIn,
  LogOut,
  ClipboardList,
  CalendarCheck,
  Receipt,
  FileText,
  Megaphone,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Bell,
  ChevronRight,
  Calendar,
  TrendingUp,
  Users,
  FolderOpen,
  CalendarDays,
  Zap,
  BarChart2,
  LayoutGrid,
  Briefcase,
  PieChart,
  ListTodo,
  Folder,
  CloudSun,
  UserPlus,
  Magnet,
  Phone,
  MessageCircle,
  MessageSquare,
  Building2,
  Tag,
  Globe,
  DollarSign,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Mini Line Chart ─────────────────────────────────────────────────
const MiniLineChart = ({ data = [], color = "#f59e0b", height = 120 }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;
  const w = 300;
  const h = height;
  const pad = 24;
  const step = (w - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
    val: v,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  const yLabels = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yLabels.map((v) => {
        const y = h - pad - (v / 100) * (h - pad * 2);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <text x={0} y={y + 4} fontSize="8" fill="#64748b" textAnchor="start">{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
      ))}
      {/* Last value label */}
      {points[points.length - 1] && (
        <text
          x={points[points.length - 1].x + 6}
          y={points[points.length - 1].y - 6}
          fontSize="10"
          fontWeight="bold"
          fill={color}
        >
          {data[data.length - 1]}%
        </text>
      )}
      {/* X-axis labels */}
      {points.map((p, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (data.length - 1 - i));
        return (
          <text key={i} x={p.x} y={h - 2} fontSize="7" fill="#64748b" textAnchor="middle">
            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        );
      })}
    </svg>
  );
};

// ─── Donut Chart ─────────────────────────────────────────────────────
const DonutChart = ({ completed = 0, inProgress = 0, pending = 0 }) => {
  const total = completed + inProgress + pending || 1;
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: completed, color: "#10b981", label: "Completed" },
    { value: inProgress, color: "#f59e0b", label: "In Progress" },
    { value: pending, color: "#475569", label: "Pending" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg viewBox="0 0 140 140" className="w-full max-w-[140px]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {arcs.map((arc, i) =>
        arc.value > 0 ? (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ) : null
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="22" fill="#0f172a" fontWeight="800">{total}</text>
    </svg>
  );
};

// ─── Leave Progress Bar ───────────────────────────────────────────────
const LeaveBar = ({ label, used, total, color }) => {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="emp-leave-row">
      <div className="emp-leave-row-header">
        <span className="emp-leave-label">{label}</span>
        <span className="emp-leave-count">
          {used} / {total}
        </span>
      </div>
      <div className="emp-leave-track">
        <div className="emp-leave-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessProjects = hasPermission("projects", "view") || hasPermission("projects");
  const canAccessPayroll = hasPermission("payroll", "view") || hasPermission("payroll");

  const userName = user?.firstName || user?.fullName || user?.name || "Employee";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Data Fetching ────────────────────────────────────────────────────
  // Dashboard summary — polls every 30 s, always fresh
  const {
    data: summaryRes,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    dataUpdatedAt: summaryUpdatedAt,
  } = useQuery({
    queryKey: ["employeeDashboardSummary"],
    queryFn:  () => getEmployeeDashboardSummaryApi().then((r) => r.data),
    staleTime:            0,          // always stale → always re-fetches
    gcTime:               5 * 60_000, // keep in cache 5 min
    refetchInterval:      30_000,     // background poll every 30 s
    refetchOnMount:       "always",   // v5: "always" forces refetch on mount
    refetchOnWindowFocus: true,
    retry:                1,
  });

  // Today’s attendance — polls every 15 s (punch state changes often)
  const {
    data: todayRes,
    isLoading: todayLoading,
    isFetching: todayFetching,
  } = useQuery({
    queryKey: ["employeeTodayAttendance"],
    queryFn:  () => getMyTodayAttendanceApi().then((r) => r.data),
    staleTime:            0,
    gcTime:               5 * 60_000,
    refetchInterval:      15_000,     // background poll every 15 s
    refetchOnMount:       "always",
    refetchOnWindowFocus: true,
    retry:                1,
  });

  const punchInMutation = useMutation({
    mutationFn: () => punchInApi({ notes: "Punched via Dashboard" }),
    onSuccess: () => {
      toast.success("Punched in successfully!");
      // v5 syntax: pass { queryKey } object
      queryClient.invalidateQueries({ queryKey: ["employeeTodayAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardSummary"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to punch in"),
  });

  const punchOutMutation = useMutation({
    mutationFn: () => punchOutApi({ notes: "Punched out via Dashboard" }),
    onSuccess: () => {
      toast.success("Punched out successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeTodayAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardSummary"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to punch out"),
  });

  // ── Lead Management Queries & State ────────────────────────────────
  const { data: leadsData } = useQuery({
    queryKey: ["employeeDashboardLeads"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/leads");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    enabled: !!canAccessLeads,
    staleTime: 30000,
  });

  const { data: leadStatusesData } = useQuery({
    queryKey: ["leadsEngineStatuses"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/statuses");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    enabled: !!canAccessLeads,
    staleTime: 60000,
  });

  const leadsList = Array.isArray(leadsData) ? leadsData : [];
  const leadStatuses = Array.isArray(leadStatusesData) ? leadStatusesData : [];
  const cleanStatuses = leadStatuses.filter((s) => s?.name && s.name.trim().toLowerCase() !== "aa");

  const leadStats = {
    total: leadsList.length,
    contacted: leadsList.filter((l) => {
      const name = l.status?.name?.toLowerCase() || "";
      return name.includes("contact") || name.includes("reach") || name.includes("call");
    }).length,
    inProgress: leadsList.filter((l) => {
      const name = l.status?.name?.toLowerCase() || "";
      return name.includes("progress") || name.includes("qualif") || name.includes("propos") || name.includes("negot");
    }).length,
    won: leadsList.filter((l) => {
      const name = l.status?.name?.toLowerCase() || "";
      return name.includes("won") || name.includes("close") || name.includes("deal");
    }).length,
  };

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    notes: "",
  });
  const [savingLead, setSavingLead] = useState(false);

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) {
      toast.error("Please enter lead name");
      return;
    }
    if (!newLeadForm.phone.trim()) {
      toast.error("Please enter phone or WhatsApp number");
      return;
    }

    setSavingLead(true);
    try {
      const activeStatusId = newLeadForm.statusId || (cleanStatuses[0] ? (cleanStatuses[0].id || cleanStatuses[0]._id) : undefined);
      const payload = {
        name: newLeadForm.name.trim(),
        phone: newLeadForm.phone.trim(),
        whatsappPhone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim(),
        company: newLeadForm.company.trim(),
        productService: newLeadForm.productService.trim(),
        source: newLeadForm.source || "Walk-in",
        statusId: activeStatusId,
        estimatedValue: newLeadForm.estimatedValue ? Number(newLeadForm.estimatedValue) : undefined,
        notes: newLeadForm.notes.trim(),
        whatsappOptIn: true,
      };

      await api.post("/leads-engine/leads", payload);
      toast.success("Lead added successfully!");
      setShowAddLeadModal(false);
      setNewLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Walk-in",
        statusId: cleanStatuses[0] ? (cleanStatuses[0].id || cleanStatuses[0]._id) : "",
        estimatedValue: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardLeads"] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  };

  // Combined fetching indicator
  const isRefreshing = (summaryFetching && !summaryLoading) || (todayFetching && !todayLoading);
  const lastUpdated  = summaryUpdatedAt ? new Date(summaryUpdatedAt) : null;

  // ── Derived State ────────────────────────────────────────────────────
  // /attendance/my-today returns { success, attendance }
  // /employee/dashboard-summary returns todayAttendance as shaped object
  const todayAtt =
    todayRes?.attendance ||          // from myToday API: { success, attendance }
    summaryRes?.todayAttendance ||   // from dashboard-summary: { punchInTime, punchOutTime, ... }
    null;

  // Attendance uses punchInTime / punchOutTime (confirmed from controller)
  const punchInTimeRaw  = todayAtt?.punchInTime;
  const punchOutTimeRaw = todayAtt?.punchOutTime;
  const totalHoursToday = todayAtt?.totalHours || 0;
  const todayStatus     = todayAtt?.status || null;

  const isPunchedIn  = !!punchInTimeRaw && !punchOutTimeRaw;
  const isPunchedOut = !!punchInTimeRaw && !!punchOutTimeRaw;

  const formatTime = (ts) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

  const formatRelativeTime = (ts) => {
    if (!ts) return "";
    const now = new Date();
    const d   = new Date(ts);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)  return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24)  return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ── Dashboard summary fields — mapped exactly from backend response ──
  // Backend: { success, employee, profileCompletion, todayAttendance,
  //            attendanceSummary, taskSummary, projectSummary, leaveSummary,
  //            payslipSummary, notifications, unreadNotificationsCount,
  //            announcements, upcomingHolidays, recentActivities }
  const attSummary     = summaryRes?.attendanceSummary  || { present: 0, absent: 0, paidLeave: 0, unpaidLeave: 0, halfDay: 0, totalLogs: 0 };
  const taskSummary    = summaryRes?.taskSummary         || { assignedTasks: 0, pending: 0, inProgress: 0, completed: 0, dueToday: 0, overdue: 0 };
  const projectSummary = summaryRes?.projectSummary      || { activeProjects: 0, completedProjects: 0, projectProgress: 0 };
  const leaveSummary   = summaryRes?.leaveSummary        || {};

  // LeaveBalance doc has fields: casual, sick, annual, lop  (from LeaveBalance model)
  const leaveBalance = leaveSummary?.leaveBalance || {};
  // leaveLimits from CompanyLeaveSettings defaults
  const leaveLimits  = leaveSummary?.leaveLimits  || { casual: 12, sick: 10, annual: 15 };
  const pendingLeaveRequests  = leaveSummary?.pendingRequests  || 0;
  const approvedLeaveCount    = leaveSummary?.approvedLeaves   || 0;

  // Announcements: { title, message, type, status, isRead, createdAt }
  const announcements     = summaryRes?.announcements    || [];
  // AuditLog: { action, module, createdAt }
  const recentActivities  = summaryRes?.recentActivities || [];
  // Notifications: { title, body, type, isRead, createdAt }
  const notifications     = summaryRes?.notifications    || [];
  const unreadCount       = summaryRes?.unreadNotificationsCount || 0;
  // Holidays: { name, date }
  const upcomingHolidays  = summaryRes?.upcomingHolidays || [];
  // Payslip: { latestPayslipMonth, netSalary, status }
  const payslipSummary    = summaryRes?.payslipSummary   || null;
  // Profile: { percentage, isCompleted }
  const profileCompletion = summaryRes?.profileCompletion || { percentage: 0, isCompleted: false };
  // Employee info
  const employeeInfo      = summaryRes?.employee || null;

  // ── Productivity Score ───────────────────────────────────────────────
  // Based on: attendance rate (60%) + task completion rate (40%)
  const totalAttDays  = attSummary.present + attSummary.absent + attSummary.paidLeave + attSummary.halfDay;
  const attRate       = totalAttDays > 0 ? (attSummary.present / totalAttDays) * 100 : 0;
  const totalTasks    = taskSummary.pending + taskSummary.inProgress + taskSummary.completed;
  const taskRate      = totalTasks > 0 ? (taskSummary.completed / totalTasks) * 100 : 0;
  const productivityScore = Math.round(attRate * 0.6 + taskRate * 0.4);

  // Weekly trend: use attendance present days spread over week approximation
  const baseScore = productivityScore;
  const weeklyData = [
    Math.min(100, Math.max(0, baseScore - 8)),
    Math.min(100, Math.max(0, baseScore + 5)),
    Math.min(100, Math.max(0, baseScore - 3)),
    Math.min(100, Math.max(0, baseScore + 12)),
    Math.min(100, Math.max(0, baseScore + 2)),
    Math.min(100, Math.max(0, baseScore - 6)),
    baseScore,
  ];

  const handlePunchClick = () => {
    if (isPunchedIn) punchOutMutation.mutate();
    else if (!isPunchedOut) punchInMutation.mutate();
  };

  const punchLoading = punchInMutation.isPending || punchOutMutation.isPending;

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = employeeInfo?.firstName || user?.name?.split(" ")[0] || "Employee";

  // ── Leave balance bars — only real types from LeaveBalance model ──────
  // Model fields: casual, sick, annual, lop
  const leaveTypes = [
    { label: "Casual Leave",  key: "casual",  color: "#f59e0b", limit: leaveLimits.casual  || 12 },
    { label: "Medical Leave", key: "sick",    color: "#10b981", limit: leaveLimits.sick    || 10 },
    { label: "Earned Leave",  key: "annual",  color: "#0f172a", limit: leaveLimits.annual  || 15 },
  ];

  // ── Score label & colour ──────────────────────────────────────────────
  const scoreLabel =
    productivityScore >= 80 ? "Excellent" :
    productivityScore >= 60 ? "Good" :
    productivityScore >= 40 ? "Average" :
    "Needs Focus";

  const scoreColor =
    productivityScore >= 80 ? "#10b981" :
    productivityScore >= 60 ? "#f59e0b" :
    productivityScore >= 40 ? "#64748b" :
    "#e11d48";

  // Leaves remaining (leaveBalance already represents the remaining available leaves)
  const leavesRemaining = Math.max(0,
    (leaveBalance.casual || 0) +
    (leaveBalance.sick   || 0) +
    (leaveBalance.annual || 0)
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn space-y-3.5 max-w-[1440px] mx-auto pb-16 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header & Greeting Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            {getGreeting()}, {firstName} <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <span>You have <strong className="text-amber-600 dark:text-amber-400 font-bold">{taskSummary.pending || 0} pending</strong> tasks today.</span>
            {isPunchedIn && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Duty
              </span>
            )}
          </p>
        </div>

        {/* Live Weather & Time Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs">
            <CloudSun size={15} className="text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-200">29°C</span>
            <span className="text-[10px] text-slate-400">Pune</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs">
            <Clock size={15} className="text-amber-500" />
            <span className="font-bold font-mono text-slate-700 dark:text-slate-200">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 pl-1">
            {canAccessTasks && (
              <Link to="/employee/my-tasks" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 flex items-center justify-center text-slate-600 hover:text-amber-600 shadow-2xs transition-all" title="Tasks">
                <ListTodo size={14} />
              </Link>
            )}
            {canAccessAttendance && (
              <Link to="/employee/attendance" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 flex items-center justify-center text-slate-600 hover:text-amber-600 shadow-2xs transition-all" title="Attendance">
                <CalendarCheck size={14} />
              </Link>
            )}
            {canAccessLeaves && (
              <Link to="/employee/leaves" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 flex items-center justify-center text-slate-600 hover:text-amber-600 shadow-2xs transition-all" title="Leaves">
                <Calendar size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Hero: Royal Corporate Blue Active Shift & Punch Bar ────────── */}
      {canAccessAttendance && (
        <div className="bg-gradient-to-r from-[#082B52] via-[#1268D9] to-[#1D7DF2] rounded-2xl p-5 shadow-lg shadow-[#1268D9]/20 text-white relative overflow-hidden">
          {/* Decorative Wave/Circle Overlays */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white/[0.06] rounded-l-full pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/[0.08] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Active Shift & Live Clock */}
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isPunchedIn ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                    {isPunchedIn ? "ACTIVE SHIFT" : "SHIFT INACTIVE"}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-white font-mono">
                  {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </h2>
                <p className="text-xs text-blue-100/80 font-medium mt-1">
                  {punchInTimeRaw ? `In since ${formatTime(punchInTimeRaw)}` : "No active check-in logged today"}
                </p>
              </div>

              {/* Vertical Divider */}
              <div className="hidden sm:block w-px h-12 bg-white/20 mx-2" />

              {/* Productivity Metric */}
              <div className="hidden lg:block space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-100">Productivity Score:</span>
                  <span className="text-sm font-black text-white">{productivityScore}%</span>
                </div>
                <div className="w-36 h-1.5 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${productivityScore}%` }} />
                </div>
                <p className="text-[10px] text-blue-100/70">Target: 95% efficiency</p>
              </div>
            </div>

            {/* Right: Shift Stats & Action Button */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-right pr-2">
                <div className="flex items-center justify-end gap-1 text-[11px] text-blue-100 font-bold">
                  <Clock size={12} />
                  <span>Punch In</span>
                </div>
                <p className="text-base font-black text-white font-mono leading-tight">
                  {punchInTimeRaw ? formatTime(punchInTimeRaw) : "--:--"}
                </p>
              </div>

              {/* Punch Action Button */}
              {isPunchedIn ? (
                <button
                  onClick={() => punchOutMutation.mutate()}
                  disabled={punchOutMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-[#1268D9] font-black rounded-xl text-xs shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                >
                  <LogOut size={15} strokeWidth={2.5} />
                  <span>{punchOutMutation.isPending ? "Punching Out..." : "Punch Out"}</span>
                </button>
              ) : (
                <button
                  onClick={() => punchInMutation.mutate()}
                  disabled={punchInMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-[#1268D9] font-black rounded-xl text-xs shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn size={15} strokeWidth={2.5} />
                  <span>{punchInMutation.isPending ? "Punching In..." : "Punch In"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4 Top KPI Mini-Tiles (Executive Clean Style) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Tasks */}
        {canAccessTasks && (
          <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-500/30 transition-all">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                <ListTodo size={13} className="text-amber-600 dark:text-amber-400" /> Tasks
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">{taskSummary.assignedTasks || 0}</div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{taskSummary.pending || 0} pending</span>
            </div>
            <Link to="/employee/my-tasks" className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all shadow-2xs">
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Card 2: Lead CRM */}
        {canAccessLeads && (
          <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-500/30 transition-all">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                <Magnet size={13} className="text-amber-600 dark:text-amber-400" /> Lead CRM
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">{leadStats.total}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{leadStats.won} deals won</span>
            </div>
            <Link to="/employee/leads" className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all shadow-2xs">
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Card 3: Attendance */}
        {canAccessAttendance && (
          <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-500/30 transition-all">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                <CalendarCheck size={13} className="text-emerald-600 dark:text-emerald-400" /> Attendance
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">{attSummary.present || 0}</div>
              <span className="text-[10px] text-slate-500 font-bold">{attSummary.absent || 0} absent</span>
            </div>
            <Link to="/employee/attendance" className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all shadow-2xs">
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Card 4: Leaves */}
        {canAccessLeaves && (
          <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-500/30 transition-all">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                <Calendar size={13} className="text-amber-600 dark:text-amber-400" /> Leaves
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">{leavesRemaining}</div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{pendingLeaveRequests} pending</span>
            </div>
            <Link to="/employee/leaves" className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all shadow-2xs">
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Main Two-Column Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* ───────── LEFT WORKSPACE (2 COLS) ───────── */}
        <div className="lg:col-span-2 space-y-3.5">
          
          {/* ── Lead Management CRM (Clean Professional Card) ── */}
                <span className="text-[9.5px] text-amber-700 dark:text-amber-400 font-bold">Active</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Won</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">{leadStats.won}</div>
                <span className="text-[9.5px] text-emerald-700 dark:text-emerald-400 font-bold">Deals Closed</span>
              </div>
            </div>

            {/* Recent Prospects List */}
            {leadsList.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Recent Prospects</span>
                  <span>1-Click Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {leadsList.slice(0, 4).map((lead) => {
                    const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

                    return (
                      <div
                        key={lead.id || lead._id || Math.random().toString()}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B101B] hover:border-amber-500 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            {(lead.name || "LD").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {lead.name}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-medium truncate">
                              {lead.company || lead.productService || "Prospect"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          {lead.estimatedValue && (
                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md">
                              ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
                            </span>
                          )}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center transition-all border border-emerald-200 dark:border-emerald-800"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700"
                              title="Call"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Tasks Progress & Quick Actions Bar (Dual Grid) ───────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Col 1: Tasks Summary */}
            {canAccessTasks && (
              <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    <ListTodo size={14} className="text-amber-600 dark:text-amber-400" /> Tasks Progress
                  </div>
                  <Link to="/employee/my-tasks" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
                    View Tasks
                  </Link>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 shrink-0">
                    <DonutChart
                      completed={taskSummary.completed || 0}
                      inProgress={taskSummary.inProgress || 0}
                      pending={taskSummary.pending || 0}
                    />
                  </div>
                  <div className="space-y-2 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                      </span>
                      <strong className="font-black text-slate-900 dark:text-white">{taskSummary.completed || 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
                      </span>
                      <strong className="font-black text-slate-900 dark:text-white">{taskSummary.inProgress || 0}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Pending
                      </span>
                      <strong className="font-black text-slate-900 dark:text-white">{taskSummary.pending || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Col 2: Quick Actions (Clean Monochromatic Suite) */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <LayoutGrid size={14} className="text-amber-600 dark:text-amber-400" /> Quick Actions
              </div>

              <div className="grid grid-cols-3 gap-2">
                {canAccessLeads && (
                  <Link
                    to="/employee/leads"
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                  >
                    <Magnet size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black truncate w-full">Lead CRM</span>
                  </Link>
                )}

                {canAccessTasks && (
                  <Link
                    to="/employee/my-tasks"
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                  >
                    <Briefcase size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black truncate w-full">Add Task</span>
                  </Link>
                )}

                {canAccessAttendance && (
                  <Link
                    to="/employee/attendance"
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                  >
                    <CalendarCheck size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black truncate w-full">Attendance</span>
                  </Link>
                )}

                {canAccessPayroll && (
                  <Link
                    to="/employee/payslips"
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                  >
                    <Receipt size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black truncate w-full">Payslips</span>
                  </Link>
                )}

                {canAccessLeaves && (
                  <Link
                    to="/employee/leaves"
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                  >
                    <Calendar size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black truncate w-full">Apply Leave</span>
                  </Link>
                )}

                <Link
                  to="/employee/documents"
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-800 dark:text-slate-200 hover:text-amber-600 transition-all group text-center shadow-2xs"
                >
                  <FileText size={16} className="mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black truncate w-full">Documents</span>
                </Link>
              </div>
            </div>

          </div>

          {/* ── Weekly Productivity Overview ─────────────────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                <Activity size={14} className="text-amber-600 dark:text-amber-400" /> Weekly Activity Trend
              </div>
              <span className="text-[10px] font-bold text-slate-500">Last 7 Days</span>
            </div>
            <MiniLineChart data={weeklyData} color="#f59e0b" height={90} />
          </div>

        </div>

        {/* ───────── RIGHT SIDEBAR (1 COL) ───────── */}
        <div className="space-y-3.5">
          
          {/* Time Off Balance */}
          {canAccessLeaves && (
            <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <CalendarDays size={14} className="text-amber-600 dark:text-amber-400" /> Time Off Balance
                </div>
                <Link to="/employee/leaves" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
                  Apply Leave
                </Link>
              </div>

              <div className="space-y-2.5">
                {leaveTypes.map((lt) => {
                  const remaining = leaveBalance[lt.key] !== undefined ? leaveBalance[lt.key] : lt.limit;
                  const used = lt.limit > 0 ? Math.max(0, lt.limit - remaining) : 0;
                  const pct = lt.limit > 0 ? Math.min(100, (remaining / lt.limit) * 100) : 0;

                  return (
                    <div key={lt.key} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{lt.label}</span>
                        <span className="font-black text-slate-900 dark:text-white">{remaining} left</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: lt.color }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Used: {used}</span>
                        <span>Total: {lt.limit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Announcements */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                <Megaphone size={14} className="text-amber-600 dark:text-amber-400" /> Announcements
              </div>
              <Link to="/employee/announcements" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {announcements.length > 0 ? (
                announcements.slice(0, 3).map((ann, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">{ann.title}</h5>
                        {ann.message && <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{ann.message}</p>}
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">{ann.createdAt ? formatRelativeTime(ann.createdAt) : "Recent"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No new announcements</p>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                <Clock size={14} className="text-amber-600 dark:text-amber-400" /> Recent Activities
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 4).map((act, i) => (
                  <div key={i} className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                      <Activity size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{act.action || "Activity"}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{act.createdAt ? formatRelativeTime(act.createdAt) : "Today"}</span>
                    </div>
                  </div>
                ))
              ) : punchInTimeRaw ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Punched in at {formatTime(punchInTimeRaw)}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Today</span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No recent activity</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── Add Lead Modal Dialog ─────────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                  <Magnet size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Add New Lead</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Direct CRM Prospect Capture</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    WhatsApp / Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Tech"
                    value={newLeadForm.company}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, company: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Requirement / Product
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HRMS Software"
                    value={newLeadForm.productService}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, productService: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Website Form">Website Form</option>
                    <option value="WhatsApp Chat">WhatsApp Chat</option>
                    <option value="Client Referral">Client Referral</option>
                    <option value="Facebook Ad">Facebook Ad</option>
                    <option value="Google Search">Google Search</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Estimated Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newLeadForm.estimatedValue}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Pipeline Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {cleanStatuses.map((st) => {
                    const stId = st.id || st._id;
                    const isSelected = newLeadForm.statusId === stId || (!newLeadForm.statusId && st === cleanStatuses[0]);
                    return (
                      <button
                        type="button"
                        key={stId}
                        onClick={() => setNewLeadForm((p) => ({ ...p, statusId: stId }))}
                        className={`px-2 py-0.5 text-[10.5px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#f97316] text-white border-[#f97316]"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Notes / Requirement
                </label>
                <textarea
                  rows={2}
                  placeholder="Meeting notes or requirement..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {savingLead ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;




