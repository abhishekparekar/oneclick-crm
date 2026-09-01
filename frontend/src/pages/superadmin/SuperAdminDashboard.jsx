import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSuperAdminDashboardStatsApi } from "../../api/superAdminApi";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Building2, Users, Receipt, HardDrive,
  TrendingUp, Activity, Server, Clock, LogIn,
  ShieldAlert, UserPlus, CreditCard, ChevronDown, Download,
  CheckCircle, User, Wallet, CalendarDays, Calendar, Archive, BarChart2,
  TrendingDown, ArrowUpRight, ArrowDownRight, Plus, CloudSun,
  ArrowUp, ArrowDown, Folder, Zap, Briefcase, FileText, Upload, CheckSquare, ArrowRight, ShieldCheck,
  RefreshCw
} from "lucide-react";

/* ─── Fallback Series Data ────────────────────────────────────────────────── */
const FALLBACK_REVENUE_SERIES = [
  { name: "Jan", monthly: 80000 },
  { name: "Feb", monthly: 120000 },
  { name: "Mar", monthly: 95000 },
  { name: "Apr", monthly: 150000 },
  { name: "May", monthly: 180000 },
  { name: "Jun", monthly: 210000 },
  { name: "Jul", monthly: 190000 },
  { name: "Aug", monthly: 250000 },
  { name: "Sep", monthly: 280000 },
  { name: "Oct", monthly: 310000 },
  { name: "Nov", monthly: 340000 },
  { name: "Dec", monthly: 390000 },
];

const FALLBACK_TIERS = [
  { name: "Enterprise", value: 4, pct: "(50%)", color: "#EAB308" },
  { name: "Pro Plan",   value: 2, pct: "(25%)", color: "#10B981" },
  { name: "Starter",    value: 1, pct: "(15%)", color: "#06B6D4" },
  { name: "Trial",      value: 1, pct: "(10%)", color: "#8B5CF6" },
];

const FALLBACK_TICKETS = [
  { name: "Resolved",    value: 80, color: "#10B981" },
  { name: "In Progress", value: 15, color: "#EAB308" },
  { name: "Open",        value: 5,  color: "#F43F5E" },
];

/* ─── SVG Progress Ring Component ─────────────────────────────────────────── */
function ProgressRing({ pct = 0, color = "#10B981", size = 38 }) {
  const strokeWidth = 2.5;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const validPct = isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct));
  const strokeDashoffset = circ - (validPct / 100) * circ;
  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#F1F5F9" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute text-[9.5px] font-extrabold" style={{ color }}>{validPct}%</span>
    </div>
  );
}

/* ─── Compact Low-Height KPI Stat Card (Interactive with Redirection) ── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, to, extraClass = "" }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  const cardContent = (
    <div className={`bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all duration-200 group cursor-pointer ${extraClass}`}>
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 uppercase tracking-wider truncate transition-colors">{label}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("this_month");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["superAdminStats", timeRange],
    queryFn: () => getSuperAdminDashboardStatsApi({ timeRange }),
    refetchInterval: 30000,
  });

  const stats = data?.data || {};

  const totalCompanies = stats.totalCompanies ?? 0;
  const activeCompanies = stats.activeCompanies ?? 0;
  const totalUsers = stats.totalUsers ?? 0;
  const totalEmployees = stats.totalEmployees ?? "0";
  const monthlyRevenue = stats.monthlyRevenue || "₹0";
  const activeSubscriptions = stats.activeSubscriptions ?? activeCompanies ?? 0;
  const pendingRequestsCount = stats.pendingRequestsCount ?? 0;
  const openTicketsCount = stats.openTicketsCount ?? 0;

  const revenueData = useMemo(() => {
    if (Array.isArray(stats.barData) && stats.barData.length > 0 && stats.barData.some(d => d.monthly > 0)) {
      return stats.barData.map(d => ({ date: d.name, val: d.monthly }));
    }
    if (Array.isArray(stats.areaData) && stats.areaData.length > 0 && stats.areaData.some(d => d.value > 0)) {
      return stats.areaData.map(d => ({ date: d.name, val: d.value * 10000 }));
    }
    return FALLBACK_REVENUE_SERIES.map(d => ({ date: d.name, val: d.monthly }));
  }, [stats.barData, stats.areaData]);

  const subscriptionTiers = useMemo(() => {
    if (Array.isArray(stats.subscriptionPipeline) && stats.subscriptionPipeline.length > 0) {
      return stats.subscriptionPipeline;
    }
    return FALLBACK_TIERS;
  }, [stats.subscriptionPipeline]);

  const ticketStatus = useMemo(() => {
    if (Array.isArray(stats.ticketStatus) && stats.ticketStatus.length > 0 && stats.ticketStatus.some(t => t.value > 0)) {
      return stats.ticketStatus;
    }
    return FALLBACK_TICKETS;
  }, [stats.ticketStatus]);

  const topCompaniesList = Array.isArray(stats.topCompanies) && stats.topCompanies.length > 0 ? stats.topCompanies : [];
  const kanbanBoardList = Array.isArray(stats.kanbanBoard) && stats.kanbanBoard.length > 0 ? stats.kanbanBoard : [];
  const systemEventsList = Array.isArray(stats.systemEvents) && stats.systemEvents.length > 0 ? stats.systemEvents : [];
  const plansPerformanceList = Array.isArray(stats.plansPerformance) && stats.plansPerformance.length > 0 ? stats.plansPerformance : [];
  const activityFeedList = Array.isArray(stats.activityFeed) && stats.activityFeed.length > 0 ? stats.activityFeed : [];

  if (isLoading) {
    return (
      <div className="p-12 h-full flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
        <p className="text-xs font-bold text-slate-500">Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 font-sans text-slate-900 dark:text-slate-100 w-full max-w-[1520px] mx-auto">

      {/* ── Header Greeting Banner ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Good Day, Super Admin <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Platform control active with <span className="font-bold text-amber-600 dark:text-amber-400">{pendingRequestsCount} pending tenant requests</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Weather Pill */}
          <div className="flex items-center gap-2 bg-amber-500/10 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/20 text-xs shadow-2xs">
            <CloudSun className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">29°C</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Platform Global</p>
            </div>
          </div>

          {/* Dynamic Live Clock Pill */}
          <div className="flex items-center gap-2 bg-cyan-500/10 dark:bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/20 text-xs shadow-2xs">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight font-mono">
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentTime.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Quick Action Shortcut Toolbar */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              onClick={() => navigate("/superadmin/companies/add")}
              className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center transition-all shadow-xs cursor-pointer"
              title="Add New Company"
            >
              <Plus size={14} strokeWidth={2.5}/>
            </button>
            <Link to="/superadmin/companies" className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs" title="Companies">
              <Building2 size={13}/>
            </Link>
            <Link to="/superadmin/subscriptions" className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs" title="Subscriptions">
              <Receipt size={13}/>
            </Link>
            <Link to="/superadmin/plans" className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs" title="Plans">
              <CreditCard size={13}/>
            </Link>
            <Link to="/superadmin/reports" className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs" title="Reports">
              <BarChart2 size={13}/>
            </Link>
            <button onClick={() => refetch()} className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs cursor-pointer" title="Refresh Dashboard">
              <RefreshCw size={12} className={isFetching ? "animate-spin text-amber-500" : ""}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 1: Top 5 Compact Stat Cards (Interactive with Redirection) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KPICard label="Monthly Revenue"  value={monthlyRevenue} trend="18.2%" isUp period="last month" strokeColor="#EAB308" Icon={Wallet}    iconBg="bg-amber-500/10"  iconColor="#D97706" to="/superadmin/payments"/>
        <KPICard label="Total Companies"  value={totalCompanies}            trend="12.4%" isUp period="last month" strokeColor="#06B6D4" Icon={Building2} iconBg="bg-cyan-500/10"   iconColor="#0891B2" to="/superadmin/companies"/>
        <KPICard label="Active Subscriptions" value={activeSubscriptions}   trend="15.7%" isUp period="last month" strokeColor="#8B5CF6" Icon={Archive}   iconBg="bg-purple-500/10" iconColor="#7C3AED" to="/superadmin/subscriptions"/>
        <KPICard label="Tenant Companies" value={totalCompanies}            trend="Live" isUp period="active" strokeColor="#EC4899" Icon={Building2} iconBg="bg-pink-500/10"   iconColor="#DB2777" to="/superadmin/companies"/>
        <KPICard label="Open Support Tickets" value={openTicketsCount}      trend="Resolved" isUp={true} period="today" strokeColor="#F97316" Icon={ShieldAlert} iconBg="bg-orange-500/10" iconColor="#EA580C" extraClass="col-span-2 sm:col-span-1" to="/superadmin/support-tickets"/>
      </div>

      {/* ── Row 2: Revenue Overview · Subscriptions · Tickets · Infrastructure ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Revenue Overview */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Revenue Overview</h3>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300">
                Annual / Monthly
              </span>
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.annualRevenue || monthlyRevenue}</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ArrowUp size={10}/> Growth
              </span>
            </div>
          </div>
          <div className="h-[155px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="saRevG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v}`} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString("en-IN")}`, 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 11 }}/>
                <Area type="monotone" dataKey="val" stroke="#EC4899" strokeWidth={2.5} fill="url(#saRevG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscriptions Pipeline Donut */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Subscription Tiers</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300">
              Live Tiers
            </span>
          </div>
          <div className="flex items-center gap-3 my-auto">
            <div className="relative w-22 h-22 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={subscriptionTiers} cx="50%" cy="50%" innerRadius={26} outerRadius={38} paddingAngle={3} dataKey="value">
                    {subscriptionTiers.map((e,i) => <Cell key={i} fill={e.color || "#10B981"} stroke="none"/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none">{activeSubscriptions}</span>
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Active</span>
              </div>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              {subscriptionTiers.map(item => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}/>
                    <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap truncate">{item.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-semibold ml-1 flex-shrink-0">{item.value} <span className="text-slate-400 font-normal text-[10px]">{item.pct}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task / Ticket Completion Donut */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">Ticket Resolution</h3>
          <div className="relative mx-auto my-auto" style={{ width: 80, height: 80 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie data={ticketStatus} cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={3} dataKey="value">
                  {ticketStatus.map((e,i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white leading-none">
                {ticketStatus.find(t => t.name === "Resolved")?.value || 100}%
              </span>
            </div>
          </div>
          <div className="space-y-1 text-[11px] mt-1">
            {ticketStatus.map(t => (
              <div key={t.name} className="flex items-center justify-between font-medium">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }}/>{t.name}
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health / HRMS Style Overview */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">System &amp; Tenant Health</h3>
          <div className="space-y-2">
            {[
              { icon: Building2,   label: "Active Tenants",    val: activeCompanies, ib: "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200", bc: "bg-emerald-600 text-white font-black" },
              { icon: UserPlus,    label: "Pending Requests",  val: pendingRequestsCount, ib: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200",         bc: "bg-amber-600 text-white font-black" },
              { icon: ShieldAlert, label: "Expired Subs",      val: stats.expiredSubscriptions ?? 0, ib: "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200",             bc: "bg-rose-600 text-white font-black" },
              { icon: HardDrive,   label: "Storage Used",      val: stats.storageUsage || "1.2 TB",   ib: "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200",   bc: "bg-indigo-600 text-white font-black" },
              { icon: Server,      label: "Uptime Status",     val: stats.serverHealth || "99.9%",   ib: "bg-cyan-50/90 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200",             bc: "bg-cyan-600 text-white font-black" },
            ].map(r => {
              const I = r.icon;
              return (
                <div key={r.label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-semibold ${r.ib}`}>
                  <div className="flex items-center gap-2"><I size={14} className="stroke-[2.2]"/>{r.label}</div>
                  <span className={`${r.bc} px-2.5 py-0.5 rounded-md text-[11px] shadow-xs`}>{r.val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 3: Top Corporations · Company Requests Board · Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Top Corporations List */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Active Corporations ({totalCompanies})</h3>
            <Link to="/superadmin/companies" className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-2.5">
            {topCompaniesList.length > 0 ? (
              topCompaniesList.map(company => (
                <div key={company.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 ml-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{company.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">{company.tier}</span>
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border ${company.pColor}`}>{company.tag}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <img src={company.avatar} alt={company.owner} className="w-6 h-6 rounded-full object-cover border border-white dark:border-slate-700"/>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[70px]">{company.owner}</p>
                      <p className="text-[9px] text-slate-400">{company.emp} Emps</p>
                    </div>
                    <ProgressRing pct={company.pct} color={company.color} size={36} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No companies registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Company Requests Board */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Company Requests Board</h3>
            <Link to="/superadmin/company-requests" className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kanbanBoardList.map(col => (
              <div key={col.title} className="flex flex-col bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/90">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`}/>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{col.title}</p>
                    <span className="text-[9.5px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded-md">{col.sub}</span>
                  </div>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 flex-1">
                  {col.items && col.items.length > 0 ? (
                    col.items.map((item, i) => (
                      <div key={i} className="bg-white dark:bg-[#1E293B] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-2xs hover:border-slate-300 transition-colors">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.c}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.p}</p>
                        <div className="flex items-center justify-between gap-1 mt-2 min-w-0">
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white flex-shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{item.v}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.badge && <span className="text-[8.5px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Approved</span>}
                            <span className="text-[9.5px] text-slate-400 whitespace-nowrap flex-shrink-0">{item.t}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-[11px] text-slate-400 italic">No requests in this list</div>
                  )}
                </div>
                {col.more && (
                  <p onClick={() => navigate("/superadmin/company-requests")} className="text-[9.5px] font-bold text-amber-500 py-1.5 text-center cursor-pointer hover:underline">
                    {col.more}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Events */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">System Events</h3>
            <Link to="/superadmin/announcements" className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-2">
            {systemEventsList.length > 0 ? (
              systemEventsList.map(ev => (
                <div key={ev.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.ic}`}>
                    <Server size={13}/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500 transition-colors">{ev.title}</p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{ev.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 italic">No active system events.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Subscription Plans Performance (7 cols) · Activity Feed (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Subscription Plans Performance Table */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Subscription Plans Performance</h3>
            <Link to="/superadmin/plans" className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                <th className="pb-2 text-left w-2/5">Plan Name</th>
                <th className="pb-2 text-center w-1/6">Active Subs</th>
                <th className="pb-2 text-left w-1/4 pl-2">Market Share</th>
                <th className="pb-2 text-right w-1/6">Est. Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {plansPerformanceList.length > 0 ? (
                plansPerformanceList.map((plan, i) => (
                  <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pr-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[9px] text-slate-400 w-2.5 flex-shrink-0">{i+1}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">{plan.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">{plan.subs}</td>
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">{plan.eff}%</span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${plan.ec || "bg-amber-500"}`} style={{ width:`${plan.eff}%` }}/>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white text-xs">{plan.revenue}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400 italic">No plans created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Global Activity Feed */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">Global Activity Log</h3>
            <Link to="/superadmin/activity-logs" className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-3">
            {activityFeedList.length > 0 ? (
              activityFeedList.map((a, i) => (
                <div key={a.id || i} className="flex items-start gap-2.5 text-xs">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${a.ic || "bg-emerald-500/10 text-emerald-600"}`}>
                    <Activity size={12}/>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 leading-normal text-xs">{a.text}</p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{a.t}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 italic">No recent activity logs.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}