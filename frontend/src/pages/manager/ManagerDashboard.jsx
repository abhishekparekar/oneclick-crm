import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getManagerDashboardApi } from "../../api/managerApi";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Users, UserCheck, UserX, CalendarOff, CheckSquare, Folder,
  TrendingUp, TrendingDown, UserPlus, Calendar, BarChart2,
  DollarSign, RefreshCw, CalendarDays, ChevronRight, ChevronDown,
  Clock, AlertCircle, CheckCircle, Flame, Gift, Megaphone, LayoutDashboard, Magnet
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date();
const todayFmt = today.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", weekday: "short" });

const getCardStyle = (label) => {
  switch (label?.toLowerCase()) {
    case "all tasks":
      return { accent: "#6B7280", accentBg: "bg-gray-100", accentText: "text-gray-600", bar: "bg-gray-400", pct: null };
    case "pending":
      return { accent: "#2563EB", accentBg: "bg-blue-50", accentText: "text-blue-600", bar: "bg-blue-500", pct: 30 };
    case "in process":
      return { accent: "#D97706", accentBg: "bg-amber-50", accentText: "text-amber-600", bar: "bg-amber-500", pct: 15 };
    case "overdue":
      return { accent: "#DC2626", accentBg: "bg-red-50", accentText: "text-red-600", bar: "bg-red-500", pct: 25 };
    case "completed":
      return { accent: "#16A34A", accentBg: "bg-emerald-50", accentText: "text-emerald-600", bar: "bg-emerald-500", pct: 15 };
    case "team tasks":
      return { accent: "#0891B2", accentBg: "bg-cyan-50", accentText: "text-cyan-600", bar: "bg-cyan-500", pct: 15 };
    case "employees":
      return { accent: "#2563EB", accentBg: "bg-blue-50", accentText: "text-blue-600", trend: "green" };
    case "present today":
      return { accent: "#16A34A", accentBg: "bg-emerald-50", accentText: "text-emerald-600", trend: "green" };
    case "absent today":
      return { accent: "#DC2626", accentBg: "bg-red-50", accentText: "text-red-600", trend: "red" };
    case "on leave":
      return { accent: "#D97706", accentBg: "bg-amber-50", accentText: "text-amber-600", trend: "amber" };
    case "open tasks":
      return { accent: "#7C3AED", accentBg: "bg-violet-50", accentText: "text-violet-600", trend: "amber" };
    case "active projects":
      return { accent: "#C2410C", accentBg: "bg-orange-50", accentText: "text-orange-600", trend: "orange" };
    default:
      return { accent: "#6B7280", accentBg: "bg-gray-100", accentText: "text-gray-600", bar: "bg-gray-300", pct: null };
  }
};

// ── Stat Card — Task Tracker (with progress bar, Stitch style) ──────────────
const StatCard = ({ label, value, trend, trendLabel, icon: Icon, to, showBar, total }) => {
  const CardWrapper = to ? Link : "div";
  const st = getCardStyle(label);
  const pct = showBar && total ? Math.round(((value || 0) / total) * 100) : st.pct;

  return (
    <CardWrapper
      to={to}
      className={`group relative bg-white dark:bg-[var(--color-ca-card)] rounded-xl p-3.5 border border-gray-100 dark:border-white/5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col justify-between h-full ${
        to ? "cursor-pointer" : ""
      }`}
    >
      {/* Decorative Top Line */}
      <div className="absolute top-0 left-0 w-full h-[3px] opacity-80" style={{ backgroundColor: st.accent }} />
      
      {/* Soft Ambient Glow on Hover */}
      <div 
        className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none" 
        style={{ backgroundColor: st.accent }}
      />

      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-2 relative z-10">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.accentBg} dark:bg-opacity-10 border border-white/60 dark:border-white/5 shadow-sm`}>
            <Icon size={14} style={{ color: st.accent }} strokeWidth={2.5} />
          </div>
        )}
        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate">
          {label}
        </span>
      </div>

      {/* Value */}
      <div className="relative z-10 mb-1.5 mt-0.5">
        <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
          {value ?? "0"}
        </p>
      </div>

      {/* Trend badge OR progress bar */}
      <div className="mt-auto relative z-10">
        {trend !== undefined ? (
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${
              trend >= 0 ? "text-emerald-700 bg-emerald-500/15 dark:bg-transparent dark:text-emerald-500 dark:px-0" : "text-rose-700 bg-rose-500/15 dark:bg-transparent dark:text-rose-500 dark:px-0"
            }`}>
              {trend >= 0 ? <TrendingUp size={11} className="mr-1" strokeWidth={3} /> : <TrendingDown size={11} className="mr-1" strokeWidth={3} />}
              {trend >= 0 ? "+" : ""}{trend}%
            </div>
            <span className="text-gray-400 font-medium text-[9.5px] truncate">{trendLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-[var(--color-ca-card)] h-1.5 rounded-full overflow-hidden shadow-inner">
              <div
                className={`${st.bar} h-full rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(pct ?? 100, 100)}%` }}
              />
            </div>
            {pct !== null && (
              <span className={`text-[10px] font-black flex-shrink-0 ${st.accentText}`}>{pct}%</span>
            )}
          </div>
        )}
      </div>
    </CardWrapper>
  );
};

// ── Card Header ───────────────────────────────────────────────────────────────
const CardHeader = ({ title, action }) => (
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
    <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">{title}</h3>
    {action}
  </div>
);

// ── Mini Avatar Row ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-orange-500 text-white",
  "bg-blue-500 text-white",
  "bg-violet-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
];

const Avatar = ({ name, idx, size = "w-8 h-8" }) => (
  <div className={`${size} rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center font-black text-xs flex-shrink-0 border border-white dark:border-gray-900 shadow-sm`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

const timeRanges = [
  { label: "Today", val: "today" },
  { label: "This Week", val: "this_week" },
  { label: "This Month", val: "this_month" },
  { label: "Last Month", val: "last_month" },
  { label: "This Year", val: "this_year" },
];

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("this_month");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const { data: dashData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerDashboardSummary", timeRange],
    queryFn: () => getManagerDashboardApi({ timeRange }).then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-2.5 animate-pulse">
        <div className="h-16 bg-white rounded-xl border border-slate-100" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-slate-100" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-white rounded-xl border border-slate-100" />)}
        </div>
      </div>
    );
  }

  const d = dashData?.data || {};
  const teamCount = d.teamSummary?.teamCount || 0;
  const attendance = d.attendanceSummary || {};
  const tasks = d.taskSummary || {};
  const leaves = d.leaveSummary || {};
  const projects = d.projectSummary || {};

  const presentCount = attendance.presentToday || 0;
  const absentCount = attendance.absentToday || 0;
  const halfDayCount = attendance.halfDayToday || 0;
  const onLeaveToday = leaves.onLeaveToday || 0;

  const attendancePie = [
    { name: "Present", value: presentCount, color: "#10b981" },
    { name: "Absent", value: absentCount, color: "#ef4444" },
    { name: "Half Day", value: halfDayCount, color: "#f59e0b" },
    { name: "Leave", value: onLeaveToday, color: "#3b82f6" },
  ].filter(item => item.value > 0);

  // Task trend line chart (Dynamic mock since historical points are not provided)
  const taskTrend = (() => {
    const arr = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      arr.push({
        date: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        count: i === 0 ? (tasks.teamTaskDoneCount || 0) : Math.max(0, (tasks.teamTaskDoneCount || 0) - (i * 3))
      });
    }
    return arr;
  })();

  const recentTasksList = d.recentTasks || [];
  const pendingLeavesList = d.pendingLeaves || [];

  return (
    <div className="space-y-2.5 pb-4">
      {/* ── Page Title ─────────────────────────────────────────────────────── */}
      <PageHeader title="Dashboard Overview" icon={LayoutDashboard}>
        <div className="relative z-50">
          <button
            onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
            className="flex items-center gap-2 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
          >
            <CalendarDays size={13} className="text-slate-400 dark:text-slate-400" />
            <span className="min-w-[75px] text-left">{timeRanges.find(r => r.val === timeRange)?.label || "This Month"}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${timeDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          
          {timeDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#111C24] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 overflow-hidden">
              {timeRanges.map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { setTimeRange(opt.val); setTimeDropdownOpen(false); }}
                  className={`block w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${timeRange === opt.val ? "bg-amber-500/10 text-amber-500 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh Live Data"
          className="flex items-center justify-center p-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 font-bold shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} strokeWidth={2.2} />
        </button>
      </PageHeader>

      {/* ── Tasks Tracker ──────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Tasks Tracker</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="All Tasks" value={tasks.totalTeamTasks} icon={CheckSquare} to="/manager/team-tasks" />
          <StatCard label="Pending" value={tasks.myPendingTasks} icon={Clock} to="/manager/my-tasks" />
          <StatCard label="In Process" value={(tasks.openTeamTasks || 0) - (tasks.myPendingTasks || 0)} icon={RefreshCw} to="/manager/team-tasks" />
          <StatCard label="Overdue" value={tasks.overdueTeamTasks} icon={AlertCircle} to="/manager/team-tasks" />
          <StatCard label="Completed" value={tasks.completedTeamTasks} icon={CheckCircle} to="/manager/team-tasks" />
          <StatCard label="Team Tasks" value={tasks.openTeamTasks} icon={CheckCircle} to="/manager/team-tasks" />
        </div>
      </div>

      {/* ── Company Metrics ─────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Team Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Employees" value={teamCount} trend={12.4} trendLabel="vs last month" icon={Users} to="/manager/team" />
          <StatCard label="Present Today" value={presentCount} trend={8.1} trendLabel="vs average" icon={UserCheck} to="/manager/team-attendance" />
          <StatCard label="Absent Today" value={absentCount} trend={-3.2} trendLabel="vs average" icon={UserX} to="/manager/team-attendance" />
          <StatCard label="On Leave" value={onLeaveToday} trend={-5.0} trendLabel="vs average" icon={CalendarOff} to="/manager/team-leaves" />
          <StatCard label="Open Tasks" value={tasks.openTeamTasks} trend={15.3} trendLabel="vs last week" icon={CheckSquare} to="/manager/team-tasks" />
          <StatCard label="Active Projects" value={projects.activeProjects} trend={1} trendLabel="new this month" icon={Folder} to="/manager/projects" />
        </div>
      </div>

      {/* ── Row 2: Attendance | Employee Trend | Quick Actions ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Attendance Status Donut */}
        <div className="bg-white dark:bg-[var(--color-ca-card)] rounded-lg border border-gray-200 dark:border-white/5 shadow-sm p-3.5 flex flex-col">
          <CardHeader
            title="Attendance Status"
            action={
              <Link to="/manager/team-attendance" className="text-[10px] font-bold uppercase tracking-wide text-orange-655 hover:text-orange-700 bg-orange-50 dark:bg-[var(--color-ca-card)] rounded-md px-2 py-1 flex items-center space-x-0.5 transition-colors">
                <span>View Grid</span><ChevronRight size={10} />
              </Link>
            }
          />
          <div className="flex items-center justify-between flex-1 relative">
            <div style={{ width: 96, height: 96, flexShrink: 0 }} className="relative">
              <ResponsiveContainer width={96} height={96} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={attendancePie.length > 0 ? attendancePie : [{ name: "No Data", value: 1, color: "#E5E7EB" }]}
                    cx="50%" cy="50%"
                    innerRadius={32} outerRadius={46}
                    paddingAngle={3} dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {(attendancePie.length > 0 ? attendancePie : [{ color: "#E5E7EB" }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {attendancePie.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-0.5">
                  <span className="text-[17px] font-black text-gray-800 dark:text-white leading-none">
                    {Math.round((presentCount / ((presentCount + absentCount + halfDayCount) || 1)) * 100)}%
                  </span>
                  <span className="text-[7.5px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Present</span>
                </div>
              )}
            </div>
            <div className="ml-4 space-y-2.5 flex-1 pr-2">
              {attendancePie.map((item) => {
                const total = presentCount + absentCount + halfDayCount || 1;
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-gray-600 font-bold dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">
                      {item.value} <span className="text-gray-400 font-bold ml-1">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              {attendancePie.length === 0 && (
                <p className="text-xs text-gray-400 italic">No attendance data today.</p>
              )}
            </div>
          </div>
        </div>

        {/* Task completion Line Chart */}
        <div className="bg-white dark:bg-[var(--color-ca-card)] rounded-lg border border-gray-200 dark:border-white/5 shadow-sm p-3.5 flex flex-col">
          <CardHeader
            title="Task Performance"
            action={
              <Link to="/manager/team-tasks" className="text-[10px] font-bold uppercase tracking-wide text-gray-500 border border-gray-200 rounded-md px-2 py-1 hover:bg-gray-50 transition-colors">
                Tasks
              </Link>
            }
          />
          <ResponsiveContainer width="100%" height={90} minWidth={1} minHeight={1}>
            <AreaChart data={taskTrend} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <defs>
                <linearGradient id="orangeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C2410C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C2410C" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF", fontWeight: "600" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#9CA3AF", fontWeight: "600" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "8px", fontSize: "11px", color: "var(--color-ca-text)", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                itemStyle={{ color: "#ea580c", fontWeight: "bold" }}
                labelStyle={{ color: "var(--color-ca-text)", fontWeight: "bold", marginBottom: "4px" }}
              />
              <Area type="monotone" dataKey="count" name="Tasks" stroke="#C2410C" strokeWidth={2.5} fillOpacity={1} fill="url(#orangeGlow)" dot={{ r: 3, fill: "#C2410C", strokeWidth: 1.5, stroke: "#fff" }} activeDot={{ r: 5, fill: "#EA580C", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Operations */}
        <div className="bg-white dark:bg-[var(--color-ca-card)] rounded-lg border border-gray-200 dark:border-white/5 shadow-sm p-3.5">
          <CardHeader title="Quick Operations" />
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Lead CRM", icon: Magnet, path: "/manager/leads", color: "#F97316", bg: "#FFF7ED" },
              { label: "My Tasks", icon: CheckSquare, path: "/manager/my-tasks", color: "#2563EB", bg: "#EFF6FF" },
              { label: "Team Leaves", icon: CalendarOff, path: "/manager/team-leaves", color: "#8B5CF6", bg: "#F5F3FF" },
              { label: "Attendance", icon: UserCheck, path: "/manager/team-attendance", color: "#10B981", bg: "#ECFDF5" },
              { label: "Announcements", icon: Megaphone, path: "/manager/announcements", color: "#EA580C", bg: "#FFF7ED" },
              { label: "Reports Hub", icon: BarChart2, path: "/manager/reports", color: "#06B6D4", bg: "#ECFEFF" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-lg border border-gray-100 dark:border-white/5 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: action.bg }}
                  >
                    <Icon size={16} style={{ color: action.color }} />
                  </div>
                  <span className="text-[9.5px] text-gray-600 font-bold text-center leading-tight dark:text-slate-400 tracking-wide">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Tasks | Pending Team Leaves ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-[var(--color-ca-card)] rounded-lg border border-gray-200 dark:border-white/5 shadow-sm p-3.5">
          <CardHeader
            title="Recent Team Tasks"
            action={
              <Link to="/manager/team-tasks" className="text-[10px] uppercase font-bold text-orange-655 px-2 py-1 bg-orange-50 dark:bg-[var(--color-ca-card)] rounded-md hover:bg-orange-100 transition-colors">All Tasks</Link>
            }
          />
          <div className="flex space-x-4 overflow-x-auto pb-1">
            {recentTasksList.length > 0 ? recentTasksList.map((task, idx) => {
              const name = task.title || "—";
              const assignee = task.assignedTo?.fullName || task.assignedTo?.name || "Unassigned";
              return (
                <div key={task._id} className="flex-shrink-0 text-center w-20">
                  <Avatar name={assignee} idx={idx} size="w-8 h-8 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{assignee}</p>
                  <p className="text-[9.5px] font-medium text-gray-450 truncate" title={name}>{name}</p>
                </div>
              );
            }) : (
              <p className="text-xs text-gray-400 italic py-2">No recent tasks.</p>
            )}
          </div>
        </div>

        {/* Pending Team Leaves */}
        <div className="bg-white dark:bg-[var(--color-ca-card)] rounded-lg border border-gray-200 dark:border-white/5 shadow-sm p-3.5">
          <CardHeader
            title="Pending Leave Requests"
            action={
              <Link to="/manager/team-leaves" className="text-[10px] uppercase font-bold text-orange-655 px-2 py-1 bg-orange-50 dark:bg-[var(--color-ca-card)] rounded-md hover:bg-orange-100 transition-colors">Portal</Link>
            }
          />
          <div className="flex space-x-4 overflow-x-auto pb-1">
            {pendingLeavesList.length > 0 ? pendingLeavesList.map((leave, idx) => {
              const empName = leave.employeeId?.fullName || leave.employeeId?.name || leave.employee?.name || "Employee";
              const type = leave.leaveType || "Leave";
              const dateStr = leave.startDate ? new Date(leave.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
              return (
                <div key={leave._id} className="flex-shrink-0 text-center w-20">
                  <Avatar name={empName} idx={idx + 2} size="w-8 h-8 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{empName}</p>
                  <p className="text-[9.5px] font-bold text-orange-600 dark:text-orange-400 mt-0.5 flex items-center justify-center gap-0.5">
                    {type} • {dateStr}
                  </p>
                </div>
              );
            }) : (
              <p className="text-xs text-gray-400 italic py-2">No pending leave requests.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;

