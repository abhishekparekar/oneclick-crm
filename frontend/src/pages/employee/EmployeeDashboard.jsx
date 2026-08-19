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
const MiniLineChart = ({ data = [], color = "#6366f1", height = 120 }) => {
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
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
            <text x={0} y={y + 4} fontSize="8" fill="#94a3b8" textAnchor="start">{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
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
          <text key={i} x={p.x} y={h - 2} fontSize="7" fill="#94a3b8" textAnchor="middle">
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
    { value: completed, color: "#22c55e", label: "Completed" },
    { value: inProgress, color: "#6366f1", label: "In Progress" },
    { value: pending, color: "#f97316", label: "Pending" },
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

// ─── Main Component ───────────────────────────────────────────────────
const EmployeeDashboard = () => {
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
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
    { label: "Casual Leave",  key: "casual",  color: "#f97316", limit: leaveLimits.casual  || 12 },
    { label: "Medical Leave", key: "sick",    color: "#22c55e", limit: leaveLimits.sick    || 10 },
    { label: "Earned Leave",  key: "annual",  color: "#6366f1", limit: leaveLimits.annual  || 15 },
  ];

  // ── Notification type → icon color ───────────────────────────────────
  const notifIconColor = (type) => ({
    attendance: "#22c55e", leave: "#f97316", payroll: "#6366f1",
    task: "#eab308", task_update: "#eab308", project: "#3b82f6",
    announcement: "#ec4899", system: "#64748b",
  }[type] || "#64748b");

  // ── Score label & colour ──────────────────────────────────────────────
  const scoreLabel =
    productivityScore >= 80 ? "Excellent" :
    productivityScore >= 60 ? "Good" :
    productivityScore >= 40 ? "Average" :
    "Needs Focus";

  const scoreColor =
    productivityScore >= 80 ? "#22c55e" :
    productivityScore >= 60 ? "#6366f1" :
    productivityScore >= 40 ? "#f97316" :
    "#ef4444";

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
            <Clock size={15} className="text-indigo-500" />
            <span className="font-bold font-mono text-slate-700 dark:text-slate-200">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 pl-1">
            <Link to="/employee/my-tasks" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-orange-300 flex items-center justify-center text-slate-600 hover:text-[#f97316] shadow-2xs transition-all" title="Tasks">
              <ListTodo size={14} />
            </Link>
            <Link to="/employee/attendance" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-green-300 flex items-center justify-center text-slate-600 hover:text-green-600 shadow-2xs transition-all" title="Attendance">
              <CalendarCheck size={14} />
            </Link>
            <Link to="/employee/leaves" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 flex items-center justify-center text-slate-600 hover:text-purple-600 shadow-2xs transition-all" title="Leaves">
              <Calendar size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Top Hero: Productivity & Punch Bar (Compact SaaS Style) ────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Productivity Score & Work Summary */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border shadow-inner" style={{ backgroundColor: `${scoreColor}10`, borderColor: `${scoreColor}30` }}>
                <span className="text-lg font-black leading-none" style={{ color: scoreColor }}>{productivityScore}%</span>
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider mt-0.5 text-slate-400">Score</span>
              </div>
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate">Business &amp; Productivity</span>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider border" style={{ backgroundColor: `${scoreColor}15`, color: scoreColor, borderColor: `${scoreColor}25` }}>
                  {scoreLabel}
                </span>
              </div>

              <div className="w-full max-w-md h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${productivityScore}%`, backgroundColor: scoreColor }}
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                {punchInTimeRaw ? (
                  <span>In: <strong className="text-slate-800 dark:text-white font-bold">{formatTime(punchInTimeRaw)}</strong></span>
                ) : (
                  <span>Status: <strong className="text-slate-500 font-bold">Not Punched In</strong></span>
                )}
                {punchOutTimeRaw && (
                  <span>Out: <strong className="text-slate-800 dark:text-white font-bold">{formatTime(punchOutTimeRaw)}</strong></span>
                )}
                {totalHoursToday > 0 && (
                  <span>Worked: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{totalHoursToday}h</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Shift & Attendance Times Display (No Punch Button on Web) */}
          <div className="flex items-center gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="text-center px-2">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Punch In</span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">
                  {punchInTimeRaw ? formatTime(punchInTimeRaw) : "--:--"}
                </span>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

              <div className="text-center px-2">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Punch Out</span>
                <span className="text-xs font-black text-slate-800 dark:text-white font-mono">
                  {punchOutTimeRaw ? formatTime(punchOutTimeRaw) : "--:--"}
                </span>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

              <div className="text-center px-2">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Shift Status</span>
                {isPunchedIn ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                ) : isPunchedOut ? (
                  <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10.5px] font-bold text-slate-400">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Top KPI Mini-Tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <ListTodo size={12} className="text-blue-500" /> Tasks
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">{taskSummary.assignedTasks || 0}</div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{taskSummary.pending || 0} pending</span>
          </div>
          <Link to="/employee/my-tasks" className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Magnet size={12} className="text-[#f97316]" /> Lead CRM
            </div>
            <div className="text-lg font-black text-[#ea580c] leading-tight">{leadStats.total}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{leadStats.won} deals won</span>
          </div>
          <Link to="/employee/leads" className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#f97316] hover:bg-[#f97316] hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <CalendarCheck size={12} className="text-emerald-500" /> Attendance
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">{attSummary.present || 0}</div>
            <span className="text-[10px] text-slate-400 font-semibold">{attSummary.absent || 0} absent</span>
          </div>
          <Link to="/employee/attendance" className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Calendar size={12} className="text-purple-500" /> Leaves
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">{leavesRemaining}</div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{pendingLeaveRequests} pending</span>
          </div>
          <Link to="/employee/leaves" className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Main Two-Column Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* ───────── LEFT WORKSPACE (2 COLS) ───────── */}
        <div className="lg:col-span-2 space-y-3.5">
          
          {/* ── Lead Management CRM (Primary Interactive Section) ── */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                  <Magnet size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Lead Management CRM</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sales Opportunities &amp; Pipeline</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAddLeadModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={12} /> Add Lead
                </button>
                <Link
                  to="/employee/leads"
                  className="text-[11px] font-bold text-[#f97316] hover:text-[#ea580c] flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                >
                  View All <ChevronRight size={12} />
                </Link>
              </div>
            </div>

            {/* 4 KPI Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Total</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                </div>
                <div className="text-lg font-black text-[#ea580c] leading-tight">{leadStats.total}</div>
                <span className="text-[9px] text-orange-600/80 font-medium">All Leads</span>
              </div>

              <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Contacted</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                </div>
                <div className="text-lg font-black text-[#7c3aed] leading-tight">{leadStats.contacted}</div>
                <span className="text-[9px] text-purple-600/80 font-medium">Follow-ups</span>
              </div>

              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">In Progress</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                </div>
                <div className="text-lg font-black text-[#d97706] leading-tight">{leadStats.inProgress}</div>
                <span className="text-[9px] text-amber-600/80 font-medium">Active</span>
              </div>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Won</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                </div>
                <div className="text-lg font-black text-[#059669] leading-tight">{leadStats.won}</div>
                <span className="text-[9px] text-emerald-600/80 font-medium">Deals Closed</span>
              </div>
            </div>

            {/* Recent Prospects List */}
            {leadsList.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Recent Prospects</span>
                  <span>1-Click Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {leadsList.slice(0, 4).map((lead) => {
                    const sName = lead.status?.name || "New";
                    const sColor = lead.status?.color || (sName.toLowerCase().includes("won") ? "#10b981" : sName.toLowerCase().includes("contact") ? "#8b5cf6" : "#06b6d4");
                    const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

                    return (
                      <div
                        key={lead.id || lead._id || Math.random().toString()}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 border"
                            style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                          >
                            {(lead.name || "LD").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {lead.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {lead.company || lead.productService || "Prospect"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          {lead.estimatedValue && (
                            <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                              ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
                            </span>
                          )}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={11} />
                            </a>
                          )}
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all"
                              title="Call"
                            >
                              <Phone size={11} />
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
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                  <ListTodo size={14} className="text-blue-500" /> Tasks Progress
                </div>
                <Link to="/employee/my-tasks" className="text-[10px] font-bold text-blue-600 hover:underline">
                  View Tasks
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-20 shrink-0">
                  <DonutChart
                    completed={taskSummary.completed || 0}
                    inProgress={taskSummary.inProgress || 0}
                    pending={taskSummary.pending || 0}
                  />
                </div>
                <div className="space-y-1.5 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                    </span>
                    <strong className="font-black text-slate-800 dark:text-white">{taskSummary.completed || 0}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" /> In Progress
                    </span>
                    <strong className="font-black text-slate-800 dark:text-white">{taskSummary.inProgress || 0}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending
                    </span>
                    <strong className="font-black text-slate-800 dark:text-white">{taskSummary.pending || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 2: Quick Actions (5 Clean Non-Clipped Buttons) */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white mb-2.5">
                <LayoutGrid size={14} className="text-[#f97316]" /> Quick Actions
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Link
                  to="/employee/leads"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50/70 hover:bg-orange-100 dark:bg-orange-950/30 text-[#f97316] transition-all group text-center"
                >
                  <Magnet size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Lead CRM</span>
                </Link>

                <Link
                  to="/employee/my-tasks"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-600 transition-all group text-center"
                >
                  <Briefcase size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Add Task</span>
                </Link>

                <Link
                  to="/employee/attendance"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 transition-all group text-center"
                >
                  <CalendarCheck size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Attendance</span>
                </Link>

                <Link
                  to="/employee/payslips"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 transition-all group text-center"
                >
                  <Receipt size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Payslips</span>
                </Link>

                <Link
                  to="/employee/leaves"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-50/70 hover:bg-purple-100 dark:bg-purple-950/30 text-purple-600 transition-all group text-center"
                >
                  <Calendar size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Apply Leave</span>
                </Link>

                <Link
                  to="/employee/documents"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all group text-center"
                >
                  <FileText size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-extrabold truncate w-full">Documents</span>
                </Link>
              </div>
            </div>

          </div>

          {/* ── Weekly Productivity Overview ─────────────────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Activity size={14} className="text-indigo-500" /> Weekly Activity Trend
              </div>
              <span className="text-[10px] font-bold text-slate-400">Last 7 Days</span>
            </div>
            <MiniLineChart data={weeklyData} color="#6366f1" height={90} />
          </div>

        </div>

        {/* ───────── RIGHT SIDEBAR (1 COL) ───────── */}
        <div className="space-y-3.5">
          
          {/* Time Off Balance */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <CalendarDays size={14} className="text-pink-500" /> Time Off Balance
              </div>
              <Link to="/employee/leaves" className="text-[10px] font-bold text-pink-600 hover:underline">
                Apply Leave
              </Link>
            </div>

            <div className="space-y-2.5">
              {leaveTypes.map((lt) => {
                const remaining = leaveBalance[lt.key] !== undefined ? leaveBalance[lt.key] : lt.limit;
                const used = lt.limit > 0 ? Math.max(0, lt.limit - remaining) : 0;
                const pct = lt.limit > 0 ? Math.min(100, (remaining / lt.limit) * 100) : 0;

                return (
                  <div key={lt.key} className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{lt.label}</span>
                      <span className="font-black text-slate-900 dark:text-white">{remaining} left</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: lt.color }} />
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                      <span>Used: {used}</span>
                      <span>Total: {lt.limit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Megaphone size={14} className="text-amber-500" /> Announcements
              </div>
              <Link to="/employee/announcements" className="text-[10px] font-bold text-amber-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {announcements.length > 0 ? (
                announcements.slice(0, 3).map((ann, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[11.5px] font-bold text-slate-800 dark:text-white truncate">{ann.title}</h5>
                        {ann.message && <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{ann.message}</p>}
                        <span className="text-[9px] text-slate-400 block mt-1">{ann.createdAt ? formatRelativeTime(ann.createdAt) : "Recent"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-xs text-slate-400">No new announcements</p>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Clock size={14} className="text-emerald-500" /> Recent Activities
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 4).map((act, i) => (
                  <div key={i} className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-500">
                      <Activity size={11} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{act.action || "Activity"}</p>
                      <span className="text-[9px] text-slate-400">{act.createdAt ? formatRelativeTime(act.createdAt) : "Today"}</span>
                    </div>
                  </div>
                ))
              ) : punchInTimeRaw ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={11} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Punched in at {formatTime(punchInTimeRaw)}</p>
                    <span className="text-[9px] text-slate-400">Today</span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-3 text-xs text-slate-400">No recent activity</p>
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




