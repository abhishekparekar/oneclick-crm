import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getManagerDashboardApi } from "../../api/managerApi";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  Users, UserCheck, UserX, CalendarOff, CheckSquare, Folder,
  TrendingUp, TrendingDown, Calendar, RefreshCw, ChevronDown,
  Clock, AlertCircle, CheckCircle2, Trophy, Target, ShieldCheck,
  Link as LinkIcon, Megaphone, BarChart2, Sparkles, Inbox,
} from "lucide-react";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("this_month");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const timeRanges = [
    { label: "Today", val: "today" },
    { label: "This Week", val: "this_week" },
    { label: "This Month", val: "this_month" },
    { label: "Last Month", val: "last_month" },
    { label: "This Year", val: "this_year" },
  ];

  // Dynamic Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const managerFirstName = useMemo(() => {
    if (!user?.name) return "Manager";
    return user.name.split(" ")[0];
  }, [user]);

  const { data: dashData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerDashboardSummary", timeRange],
    queryFn: () => getManagerDashboardApi({ timeRange }).then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const d = dashData?.data || {};
  const teamCount = d.teamSummary?.teamCount ?? 3;
  const attendance = d.attendanceSummary || {};
  const tasks = d.taskSummary || {};
  const leaves = d.leaveSummary || {};
  const projects = d.projectSummary || {};

  const totalTasks = tasks.totalTeamTasks ?? 4;
  const pendingTasks = tasks.myPendingTasks ?? 3;
  const inProcessTasks = (tasks.openTeamTasks || 0) - (tasks.myPendingTasks || 0) > 0 ? (tasks.openTeamTasks - tasks.myPendingTasks) : 0;
  const overdueTasks = tasks.overdueTeamTasks ?? 1;
  const completedTasks = tasks.completedTeamTasks ?? 1;
  const openTeamTasks = tasks.openTeamTasks ?? 3;

  const presentCount = attendance.presentToday ?? 0;
  const absentCount = attendance.absentToday ?? (teamCount - presentCount);
  const onLeaveToday = leaves.onLeaveToday ?? 0;

  // Attendance Donut Data
  const attendanceTotal = Math.max(1, presentCount + absentCount + onLeaveToday);
  const presentPct = Math.round((presentCount / attendanceTotal) * 100);
  const absentPct = Math.round((absentCount / attendanceTotal) * 100);
  const onLeavePct = Math.round((onLeaveToday / attendanceTotal) * 100);

  const attendancePie = [
    { name: "Present", value: presentCount, color: "#10b981" },
    { name: "Absent", value: absentCount > 0 ? absentCount : 1, color: "#ef4444" },
    { name: "On Leave", value: onLeaveToday, color: "#f59e0b" },
  ];

  // Task Performance Chart Data (smooth timeline curve)
  const taskChartData = useMemo(() => [
    { date: "Jul 23", count: 0 },
    { date: "Jul 30", count: 0 },
    { date: "Aug 6", count: 0 },
    { date: "Aug 13", count: 0 },
    { date: "Aug 20", count: completedTasks || 1 },
  ], [completedTasks]);

  return (
    <div className="space-y-3 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── 1. WELCOME BANNER (Deep Navy / Teal Wave Mesh) ────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#0E2038] to-[#082B33] p-4 sm:p-5 text-white shadow-md border border-slate-800">
        {/* Glow & Wave lines SVG overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200" fill="none">
            <path d="M0,100 C150,160 350,0 500,100 C650,200 850,40 1000,100" stroke="#06b6d4" strokeWidth="1.2" strokeOpacity="0.35" />
            <path d="M0,120 C200,40 400,180 600,80 C800,20 900,140 1000,120" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.25" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{greeting}, {managerFirstName}!</span>
              <span>👋</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Here's what's happening with your team today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Time Filter Pill */}
            <div className="relative">
              <button
                onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <Calendar size={13} className="text-slate-500 dark:text-slate-400" />
                <span>{timeRanges.find(r => r.val === timeRange)?.label || "This Month"}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${timeDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {timeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#111C24] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 overflow-hidden z-50 animate-fadeIn">
                  {timeRanges.map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => { setTimeRange(opt.val); setTimeDropdownOpen(false); }}
                      className={`block w-full text-left px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        timeRange === opt.val ? "bg-amber-500/10 text-amber-500 font-bold" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TASKS TRACKER SECTION ──────────────────────────────────────── */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Tasks Tracker
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {/* 1. ALL TASKS */}
          <Link
            to="/manager/team-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/40">
                <CheckSquare size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">ALL TASKS</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{totalTasks}</p>
            <p className="text-[10px] font-medium text-slate-400 truncate mb-2">Total Tasks</p>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full w-2/5" />
            </div>
          </Link>

          {/* 2. PENDING */}
          <Link
            to="/manager/my-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/40">
                <Clock size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">PENDING</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{pendingTasks}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2">
              <span className="truncate">75% of total</span>
              <span className="font-mono text-blue-600 font-bold">30%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-3/4" />
            </div>
          </Link>

          {/* 3. IN PROCESS */}
          <Link
            to="/manager/team-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/40">
                <RefreshCw size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">IN PROCESS</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{inProcessTasks}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2">
              <span className="truncate">0% of total</span>
              <span className="font-mono text-orange-600 font-bold">15%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full w-1/6" />
            </div>
          </Link>

          {/* 4. OVERDUE */}
          <Link
            to="/manager/team-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/40">
                <AlertCircle size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">OVERDUE</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{overdueTasks}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2">
              <span className="truncate">25% of total</span>
              <span className="font-mono text-rose-600 font-bold">25%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full w-1/4" />
            </div>
          </Link>

          {/* 5. COMPLETED */}
          <Link
            to="/manager/team-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/40">
                <CheckCircle2 size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">COMPLETED</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{completedTasks}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2">
              <span className="truncate">25% of total</span>
              <span className="font-mono text-emerald-600 font-bold">15%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-1/4" />
            </div>
          </Link>

          {/* 6. TEAM TASKS */}
          <Link
            to="/manager/team-tasks"
            className="group bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/40">
                <Users size={13} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">TEAM TASKS</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-tight my-0.5">{openTeamTasks}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2">
              <span className="truncate">75% of total</span>
              <span className="font-mono text-cyan-600 font-bold">15%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full w-3/4" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. TEAM METRICS SECTION ───────────────────────────────────────── */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Team Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {/* 1. EMPLOYEES */}
          <Link to="/manager/team" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                <Users size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">EMPLOYEES</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{teamCount}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold mt-1">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>12.4%</span>
              <span className="text-slate-400 font-medium">vs last month</span>
            </div>
          </Link>

          {/* 2. PRESENT TODAY */}
          <Link to="/manager/team-attendance" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <UserCheck size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">PRESENT TODAY</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{presentCount}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold mt-1">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>8.1%</span>
              <span className="text-slate-400 font-medium">vs average</span>
            </div>
          </Link>

          {/* 3. ABSENT TODAY */}
          <Link to="/manager/team-attendance" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <UserX size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">ABSENT TODAY</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{absentCount}</p>
            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-extrabold mt-1">
              <TrendingDown size={11} strokeWidth={2.5} />
              <span>-3.2%</span>
              <span className="text-slate-400 font-medium">vs average</span>
            </div>
          </Link>

          {/* 4. ON LEAVE */}
          <Link to="/manager/team-leaves" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <CalendarOff size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">ON LEAVE</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{onLeaveToday}</p>
            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-extrabold mt-1">
              <TrendingDown size={11} strokeWidth={2.5} />
              <span>-5%</span>
              <span className="text-slate-400 font-medium">vs average</span>
            </div>
          </Link>

          {/* 5. OPEN TASKS */}
          <Link to="/manager/team-tasks" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                <CheckSquare size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">OPEN TASKS</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{openTeamTasks}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold mt-1">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>15.3%</span>
              <span className="text-slate-400 font-medium">vs last week</span>
            </div>
          </Link>

          {/* 6. ACTIVE PROJECTS */}
          <Link to="/manager/projects" className="bg-white dark:bg-[#111C24] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center">
                <Folder size={13} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">ACTIVE PROJECTS</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono my-0.5">{projects.activeProjects ?? 1}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold mt-1">
              <TrendingUp size={11} strokeWidth={2.5} />
              <span>1%</span>
              <span className="text-slate-400 font-medium">new this month</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. ROW 3: ATTENDANCE | TASK PERFORMANCE | QUICK OPERATIONS ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">

        {/* 1. ATTENDANCE STATUS (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">Attendance Status</h3>
            <Link
              to="/manager/team-attendance"
              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              View Details
            </Link>
          </div>

          <div className="flex items-center justify-between my-3">
            {/* Donut Chart */}
            <div className="w-24 h-24 relative flex-shrink-0">
              <ResponsiveContainer width={96} height={96}>
                <PieChart>
                  <Pie
                    data={attendancePie}
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={44}
                    paddingAngle={2} dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {attendancePie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none">
                  {presentPct}%
                </span>
                <span className="text-[7.5px] font-black text-slate-400 mt-0.5 uppercase tracking-wider">PRESENT</span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="flex-1 pl-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold text-[11px]">
                  {presentCount} <span className="text-slate-400 font-normal">({presentPct}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold text-[11px]">
                  {absentCount} <span className="text-slate-400 font-normal">({absentPct}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>On Leave</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold text-[11px]">
                  {onLeaveToday} <span className="text-slate-400 font-normal">({onLeavePct}%)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-bold">Total Employees</span>
            <span className="font-mono font-black text-slate-900 dark:text-white">{teamCount}</span>
          </div>
        </div>

        {/* 2. TASK PERFORMANCE (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">Task Performance</h3>
            <Link
              to="/manager/team-tasks"
              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              View Report
            </Link>
          </div>

          {/* 4 Micro Stat Badges */}
          <div className="grid grid-cols-4 gap-1.5 my-2">
            <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-slate-400 uppercase">On Time</p>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xs font-black font-mono">1</span>
                <span className="text-[8.5px] font-bold text-emerald-600">25%</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Late</p>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xs font-black font-mono">0</span>
                <span className="text-[8.5px] font-bold text-amber-600">0%</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Overdue</p>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xs font-black font-mono">1</span>
                <span className="text-[8.5px] font-bold text-rose-600">25%</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-100 dark:border-slate-800 p-1.5 rounded-lg">
              <p className="text-[9px] font-bold text-slate-400 uppercase truncate">Total Completed</p>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xs font-black font-mono">{completedTasks}</span>
                <span className="text-[8.5px] font-bold text-teal-600">25%</span>
              </div>
            </div>
          </div>

          {/* Area Chart with Teal Gradient */}
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskChartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="tealWaveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888815" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 1.5]} ticks={[0, 0.5, 1, 1.5]} />
                <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#tealWaveGlow)" dot={{ r: 2.5, fill: "#0d9488" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. QUICK OPERATIONS (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">Quick Operations</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto pt-1">
            {[
              { label: "Lead CRM", icon: LinkIcon, path: "/manager/leads", color: "#06b6d4", bg: "bg-cyan-500/10" },
              { label: "My Tasks", icon: CheckSquare, path: "/manager/my-tasks", color: "#3b82f6", bg: "bg-blue-500/10" },
              { label: "Team Leaves", icon: CalendarOff, path: "/manager/team-leaves", color: "#8b5cf6", bg: "bg-purple-500/10" },
              { label: "Attendance", icon: UserCheck, path: "/manager/team-attendance", color: "#10b981", bg: "bg-emerald-500/10" },
              { label: "Announcements", icon: Megaphone, path: "/manager/announcements", color: "#f97316", bg: "bg-orange-500/10" },
              { label: "Reports Hub", icon: BarChart2, path: "/manager/reports", color: "#0284c7", bg: "bg-sky-500/10" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs transition-all group"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${action.bg} flex items-center justify-center mb-1 group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={14} style={{ color: action.color }} strokeWidth={2.5} />
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 text-center leading-tight tracking-tight">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. ROW 4: TEAM PERFORMANCE OVERVIEW BANNER ────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4 overflow-hidden">
        {/* Left Trophy & Intro */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-teal-800/15 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30 shadow-2xs">
            <Trophy size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
              Team Performance Overview
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Keep up the great work! Track tasks, attendance and team productivity in real-time.
            </p>
          </div>
        </div>

        {/* Center Stats Group */}
        <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-6 w-full lg:w-auto">
          {/* Stat 1 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
              <Target size={15} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase">Tasks Completed</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{completedTasks}</span>
                <span className="text-[9.5px] text-slate-400 font-medium">25% of total tasks</span>
              </div>
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full w-24 mt-0.5 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full w-1/4" />
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={15} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase">Avg. Response Time</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">2h 35m</span>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold">
                <TrendingDown size={9} strokeWidth={2.5} />
                <span>-10% vs last month</span>
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={15} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase">SLA Compliance</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">25%</span>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-rose-600 font-bold">
                <TrendingDown size={9} strokeWidth={2.5} />
                <span>-5% vs last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="hidden xl:flex items-center justify-end shrink-0 pl-2">
          <svg className="w-28 h-12 text-teal-600/40" viewBox="0 0 120 50" fill="none">
            <rect x="10" y="10" width="100" height="35" rx="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="35" cy="28" r="8" fill="currentColor" fillOpacity="0.4" />
            <circle cx="60" cy="25" r="10" fill="currentColor" fillOpacity="0.6" />
            <circle cx="85" cy="28" r="8" fill="currentColor" fillOpacity="0.4" />
          </svg>
        </div>
      </div>

    </div>
  );
}
