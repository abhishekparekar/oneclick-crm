import { useState, useMemo } from "react";
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
  ArrowUp, ArrowDown, Folder, Zap, Briefcase, FileText, Upload, CheckSquare, ArrowRight, ShieldCheck
} from "lucide-react";

/* ─── Static / Fallback Data ────────────────────────────────────────────────── */
const REVENUE_SERIES = [
  { date: "01 May", val: 800000 },
  { date: "05 May", val: 1050000 },
  { date: "08 May", val: 920000 },
  { date: "12 May", val: 1250000 },
  { date: "15 May", val: 1480000 },
  { date: "19 May", val: 1350000 },
  { date: "22 May", val: 1620000 },
  { date: "26 May", val: 1750000 },
  { date: "30 May", val: 1875430 },
];

const SUBSCRIPTION_PIPELINE = [
  { name: "Enterprise", value: 98, pct: "(56%)", color: "#EAB308" },
  { name: "Pro Plan",   value: 52, pct: "(30%)", color: "#10B981" },
  { name: "Starter",    value: 18, pct: "(10%)", color: "#06B6D4" },
  { name: "Trial",      value: 8,  pct: "(4%)",  color: "#8B5CF6" },
];

const TICKET_STATUS = [
  { name: "Resolved",    value: 78, color: "#10B981" },
  { name: "In Progress", value: 14, color: "#EAB308" },
  { name: "Open",        value: 8,  color: "#F43F5E" },
];

const DEFAULT_COMPANIES = [
  { id: 1, name: "TechNova Solutions",   tier: "Enterprise Tier", tag: "Active",    pColor: "text-emerald-700 bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-900/40", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format", owner: "Rajesh", emp: "1,245", pct: 92, color: "#10B981" },
  { id: 2, name: "Digital Craft Inc",    tier: "Pro Plan",        tag: "Active",    pColor: "text-emerald-700 bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-900/40", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format", owner: "Priya",  emp: "987",   pct: 74, color: "#EAB308" },
  { id: 3, name: "Creative Minds Labs",  tier: "Enterprise Tier", tag: "Trial",     pColor: "text-amber-700 bg-amber-500/10 border-amber-200/80 dark:border-amber-900/40",    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format", owner: "Amit",   emp: "876",   pct: 65, color: "#EC4899" },
  { id: 4, name: "Innovate Systems",     tier: "Starter Tier",    tag: "Pending",   pColor: "text-rose-700 bg-rose-500/10 border-rose-200/80 dark:border-rose-900/40",        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&auto=format", owner: "Sneha",  emp: "754",   pct: 56, color: "#94A3B8" },
];

const DEFAULT_KANBAN = [
  { title: "Pending Requests", sub: "12 Requests", dotColor: "bg-amber-500", items: [{ c: "Skyline Enterprises", p: "Rajesh Sharma", v: "Enterprise", t: "2h ago" }, { c: "DataFlex Systems", p: "Nikhil Rao", v: "Pro Plan", t: "5h ago" }], more: "+ 10 more" },
  { title: "Approved Today",   sub: "8 Companies", dotColor: "bg-emerald-500", items: [{ c: "InnoVision Tech", p: "Priya Nair", v: "Enterprise", t: "3h ago", badge: true }, { c: "FutureSoft Labs", p: "Ankit Gupta", v: "Pro Plan", t: "6h ago", badge: true }], more: "+ 6 more" },
];

const DEFAULT_EVENTS = [
  { id: 1, title: "System Maintenance Window", date: "31 May, 02:00 AM",   ic: "bg-rose-500/10 text-rose-600 dark:text-rose-400",    Icon: Server },
  { id: 2, title: "Quarterly Platform Audit",   date: "Today, 04:00 PM",    ic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",Icon: ShieldCheck },
  { id: 3, title: "New Enterprise Onboarding", date: "Tomorrow, 11:00 AM", ic: "bg-purple-500/10 text-purple-600 dark:text-purple-400", Icon: Building2 },
  { id: 4, title: "Billing Cycle Auto-renew",  date: "01 Jun, 2025",       ic: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",   Icon: Receipt },
  { id: 5, title: "Global Security Advisory",  date: "02 Jun, 2025",       ic: "bg-amber-500/10 text-amber-600 dark:text-amber-400",  Icon: ShieldAlert },
];

const DEFAULT_PLANS = [
  { id: 1, name: "Enterprise Pro", subs: 98, revenue: "₹12.4L", eff: 94, ec: "bg-amber-500" },
  { id: 2, name: "Business Growth",subs: 52, revenue: "₹4.8L",  eff: 82, ec: "bg-emerald-500" },
  { id: 3, name: "Starter Suite",   subs: 18, revenue: "₹1.55L", eff: 65, ec: "bg-cyan-500" },
];

const DEFAULT_FEED = [
  { ic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", Ic: CheckCircle, text: <><span className="font-semibold text-slate-900 dark:text-white">TechNova Solutions</span> renewed Enterprise Plan subscription</>, t: "5 mins ago" },
  { ic: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",    Ic: UserPlus,    text: <><span className="font-semibold text-slate-900 dark:text-white">Skyline Enterprises</span> submitted a company registration request</>, t: "18 mins ago" },
  { ic: "bg-purple-500/10 text-purple-600 dark:text-purple-400", Ic: Zap,         text: <><span className="font-semibold text-slate-900 dark:text-white">Platform Storage</span> expanded by 500GB automatically</>, t: "1 hour ago" },
  { ic: "bg-amber-500/10 text-amber-600 dark:text-amber-400",   Ic: Receipt,     text: <><span className="font-semibold text-slate-900 dark:text-white">Invoice #INV-9402</span> processed successfully</>, t: "2 hours ago" },
];

/* ─── SVG Progress Ring Component ─────────────────────────────────────────── */
function ProgressRing({ pct, color, size = 38 }) {
  const strokeWidth = 2.5;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ - (pct / 100) * circ;
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
      <span className="absolute text-[10px] font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ─── Compact Low-Height KPI Stat Card ────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, extraClass = "" }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className={`bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group ${extraClass}`}>
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
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
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("this_month");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminStats", timeRange],
    queryFn: () => getSuperAdminDashboardStatsApi({ timeRange }),
    refetchInterval: 60000,
  });

  const stats = data?.data || {
    totalCompanies: 248,
    activeCompanies: 186,
    totalEmployees: "24,563",
    totalUsers: "28,745",
    monthlyRevenue: "₹18.75L",
    annualRevenue: "₹2.18Cr",
    activeSubscriptions: 176,
    storageUsage: "2.45 TB",
    serverHealth: "99.9%",
    apiResponseTime: "120ms"
  };

  if (isLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 font-sans text-slate-900 dark:text-slate-100 w-full">

      {/* ── Header Greeting Banner ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Good Morning, Super Admin <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Platform control active with <span className="font-semibold text-amber-500">12 pending tenant requests</span> today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Weather Pill */}
          <div className="flex items-center gap-2 bg-amber-500/10 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/20 text-xs shadow-2xs">
            <CloudSun className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">29°C</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Platform Global</p>
            </div>
          </div>

          {/* Clock Pill */}
          <div className="flex items-center gap-2 bg-cyan-500/10 dark:bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/20 text-xs shadow-2xs">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white leading-tight">10:30 AM</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Fri, 30 May 2025</p>
            </div>
          </div>

          {/* Quick Action Shortcut Toolbar */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              onClick={() => navigate("/superadmin/company-requests")}
              className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center transition-all shadow-xs"
              title="Add Company Request"
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
            <button onClick={() => navigate("/superadmin/reports")} className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs" title="Export Data">
              <Upload size={13}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 1: Top 5 Compact Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KPICard label="Monthly Revenue"  value={stats.monthlyRevenue || "₹18.75L"} trend="18.2%" isUp period="last month" strokeColor="#EAB308" Icon={Wallet}    iconBg="bg-amber-500/10"  iconColor="#D97706"/>
        <KPICard label="Total Companies"  value={stats.totalCompanies}            trend="12.4%" isUp period="last month" strokeColor="#06B6D4" Icon={Building2} iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="Active Subscriptions" value={stats.activeSubscriptions}   trend="15.7%" isUp period="last month" strokeColor="#8B5CF6" Icon={Archive}   iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
        <KPICard label="Global Users"     value={stats.totalUsers}                trend="9.3%" isUp period="last month" strokeColor="#EC4899" Icon={Users}     iconBg="bg-pink-500/10"   iconColor="#DB2777"/>
        <KPICard label="Open Support Tickets" value="14"                         trend="8.6%" isUp={false} period="yesterday" strokeColor="#F97316" Icon={ShieldAlert} iconBg="bg-orange-500/10" iconColor="#EA580C" extraClass="col-span-2 sm:col-span-1"/>
      </div>

      {/* ── Row 2: Revenue Overview · Subscriptions · Tickets · Infrastructure ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Revenue Overview */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Revenue Overview</h3>
              <select className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200/80 rounded-md px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <option>This Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">₹18,75,430</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ArrowUp size={10}/> 18.2% vs last month
              </span>
            </div>
          </div>
          <div className="h-[155px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={REVENUE_SERIES} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="saRevG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v => `${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 11 }}/>
                <Area type="monotone" dataKey="val" stroke="#EC4899" strokeWidth={2.5} fill="url(#saRevG)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscriptions Pipeline Donut */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Subscription Tiers</h3>
            <select className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200/80 rounded-md px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex items-center gap-3 my-auto">
            <div className="relative w-22 h-22 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={SUBSCRIPTION_PIPELINE} cx="50%" cy="50%" innerRadius={26} outerRadius={38} paddingAngle={3} dataKey="value">
                    {SUBSCRIPTION_PIPELINE.map((e,i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none">{stats.activeSubscriptions}</span>
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Active</span>
              </div>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              {SUBSCRIPTION_PIPELINE.map(item => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}/>
                    <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-semibold ml-1 flex-shrink-0">{item.value} <span className="text-slate-400 font-normal text-[10px]">{item.pct}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task / Ticket Completion Donut */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-2">Ticket Resolution</h3>
          <div className="relative mx-auto my-auto" style={{ width: 80, height: 80 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie data={TICKET_STATUS} cx="50%" cy="50%" innerRadius={24} outerRadius={36} paddingAngle={3} dataKey="value">
                  {TICKET_STATUS.map((e,i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">78%</span>
            </div>
          </div>
          <div className="space-y-1 text-[11px] mt-1">
            {TICKET_STATUS.map(t => (
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
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-2">System &amp; Tenant Health</h3>
          <div className="space-y-2">
            {[
              { icon: Building2,   label: "Active Tenants",    val: stats.activeCompanies, ib: "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200", bc: "bg-emerald-600 text-white font-black" },
              { icon: UserPlus,    label: "Pending Requests",  val: 12,                   ib: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200",         bc: "bg-amber-600 text-white font-black" },
              { icon: ShieldAlert, label: "Expired Subs",      val: 28,                   ib: "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200",             bc: "bg-rose-600 text-white font-black" },
              { icon: HardDrive,   label: "Storage Used",      val: stats.storageUsage,   ib: "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200",   bc: "bg-indigo-600 text-white font-black" },
              { icon: Server,      label: "Uptime Status",     val: stats.serverHealth,   ib: "bg-cyan-50/90 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200",             bc: "bg-cyan-600 text-white font-black" },
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
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Top Corporations</h3>
            <Link to="/superadmin/companies" className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-2.5">
            {DEFAULT_COMPANIES.map(company => (
              <div key={company.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 hover:border-slate-300 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 ml-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{company.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">{company.tier}</span>
                    <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border ${company.pColor}`}>{company.tag}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <img src={company.avatar} alt={company.owner} className="w-6 h-6 rounded-full object-cover border border-white dark:border-slate-700"/>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{company.owner}</p>
                    <p className="text-[9px] text-slate-400">{company.emp} Users</p>
                  </div>
                  <ProgressRing pct={company.pct} color={company.color} size={38} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Requests Board */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Company Requests Board</h3>
            <Link to="/superadmin/company-requests" className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_KANBAN.map(col => (
              <div key={col.title} className="flex flex-col bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/90">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`}/>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{col.title}</p>
                    <span className="text-[9.5px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded-md">{col.sub}</span>
                  </div>
                  <ChevronDown size={11} className="text-slate-400"/>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 flex-1">
                  {col.items.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-[#1E293B] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-2xs hover:border-slate-300 transition-colors">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.c}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.p}</p>
                      <div className="flex items-center justify-between gap-1 mt-2 min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex-shrink-0">{item.v}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.badge && <span className="text-[8.5px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Approved</span>}
                          <span className="text-[9.5px] text-slate-400 whitespace-nowrap flex-shrink-0">{item.t}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9.5px] font-semibold text-amber-500 py-1.5 text-center cursor-pointer hover:underline">{col.more}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Platform Events */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">System Events</h3>
            <Link to="/superadmin/announcements" className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-2">
            {DEFAULT_EVENTS.map(ev => {
              const I = ev.Icon;
              return (
                <div key={ev.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.ic}`}><I size={14}/></div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500 transition-colors">{ev.title}</p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{ev.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 4: Subscription Plans Performance (7 cols) · Activity Feed (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Subscription Plans Performance Table */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Subscription Plans Performance</h3>
            <Link to="/superadmin/plans" className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                <th className="pb-2 text-left w-2/5">Plan Name</th>
                <th className="pb-2 text-center w-1/6">Active Subs</th>
                <th className="pb-2 text-left w-1/4 pl-2">Market Share</th>
                <th className="pb-2 text-right w-1/6">Est. Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DEFAULT_PLANS.map((plan, i) => (
                <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pr-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[9px] text-slate-400 w-2.5 flex-shrink-0">{i+1}</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-[11.5px] truncate">{plan.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-center font-medium text-slate-700 dark:text-slate-300 text-[11.5px]">{plan.subs}</td>
                  <td className="py-2.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-[11px]">{plan.eff}%</span>
                      <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${plan.ec}`} style={{ width:`${plan.eff}%` }}/>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white text-[11.5px]">{plan.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Activity Feed */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Global Activity Log</h3>
            <Link to="/superadmin/activity-logs" className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
              View All <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="space-y-3">
            {DEFAULT_FEED.map((a, i) => {
              const I = a.Ic;
              return (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${a.ic}`}><I size={13}/></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300 leading-normal text-[12px]">{a.text}</p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">{a.t}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}