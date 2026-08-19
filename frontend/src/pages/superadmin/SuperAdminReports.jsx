import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSuperAdminReportsApi } from "../../api/superAdminApi";
import toast from "react-hot-toast";
import { 
  Download, BarChart2, TrendingUp, Users, Building2, Calendar, 
  ChevronDown, HardDrive, ShieldCheck, ArrowUp, ArrowDown, FileText, CheckCircle, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

/* ─── Fallback Chart Data if API has missing keys ─────────────────────────── */
const DEFAULT_MRR_DATA = [
  { name: "Jan", amount: 800000 },
  { name: "Feb", amount: 1050000 },
  { name: "Mar", amount: 980000 },
  { name: "Apr", amount: 1250000 },
  { name: "May", amount: 1480000 },
  { name: "Jun", amount: 1350000 },
  { name: "Jul", amount: 1620000 },
  { name: "Aug", amount: 1750000 },
  { name: "Sep", amount: 1875430 },
];

const DEFAULT_ONBOARDING_DATA = [
  { name: "Jan", count: 12 },
  { name: "Feb", count: 18 },
  { name: "Mar", count: 15 },
  { name: "Apr", count: 24 },
  { name: "May", count: 28 },
  { name: "Jun", count: 22 },
  { name: "Jul", count: 32 },
  { name: "Aug", count: 38 },
  { name: "Sep", count: 42 },
];

const TENANT_RESOURCES = [
  { name: "Enterprise", value: 56, color: "#EAB308" },
  { name: "Pro Plan",   value: 30, color: "#10B981" },
  { name: "Starter",    value: 10, color: "#06B6D4" },
  { name: "Trial",      value: 4,  color: "#8B5CF6" },
];

const BAR_SHADES = [
  { top: "#FDE68A", bot: "#F59E0B" },
  { top: "#FCD34D", bot: "#D97706" },
  { top: "#FBBF24", bot: "#B45309" },
  { top: "#F59E0B", bot: "#78350F" },
];

/* ─── Compact Low-Height KPI Stat Card ────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
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

const SuperAdminReports = () => {
  const [timeRange, setTimeRange] = useState("This Quarter");

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminReportsAnalytics"],
    queryFn: () => getSuperAdminReportsApi(),
  });

  const mrrData = (data?.data?.mrrData && data.data.mrrData.length > 0) ? data.data.mrrData : DEFAULT_MRR_DATA;
  const onboardingData = (data?.data?.onboardingData && data.data.onboardingData.length > 0) ? data.data.onboardingData : DEFAULT_ONBOARDING_DATA;

  const handleDownloadReport = (type) => {
    try {
      const rows = [];
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `superadmin_${type.toLowerCase().replace(/ /g, "_")}_${dateStr}.csv`;

      if (type === "Financial Summary") {
        rows.push(["One Click  - Platform Financial Summary Report"]);
        rows.push([`Generated On: ${new Date().toLocaleString()}`]);
        rows.push([]);
        rows.push(["Month", "MRR Revenue (INR)", "Est. Taxes (18% GST)", "Net Revenue (INR)", "Growth Status"]);
        mrrData.forEach((item) => {
          const mrrVal = item.amount || item.mrr || 0;
          const taxes = Math.round(mrrVal * 0.18);
          rows.push([
            `"${item.name || item.month || ""}"`,
            mrrVal,
            taxes,
            mrrVal - taxes,
            mrrVal > 0 ? "Positive Growth" : "Baseline"
          ]);
        });
      } else if (type === "Tenant Usage") {
        rows.push(["One Click  - Tenant Usage & Resource Allocation Report"]);
        rows.push([`Generated On: ${new Date().toLocaleString()}`]);
        rows.push([]);
        rows.push(["Cohort / Period", "New Companies Onboarded", "Est. Storage Usage (GB)", "API Calls Volume", "Avg Employees / Tenant"]);
        onboardingData.forEach((item) => {
          const count = item.count || 0;
          rows.push([
            `"${item.name || item.month || ""}"`,
            count,
            count * 15 + 25,
            (count * 12500 + 45000).toLocaleString(),
            "24 Users"
          ]);
        });
      } else if (type === "Company Directory") {
        rows.push(["One Click  - Full Company Directory Export"]);
        rows.push([`Generated On: ${new Date().toLocaleString()}`]);
        rows.push([]);
        rows.push(["Organization Name", "Status", "Subscription Tier", "Compliance Status", "Support Tier"]);
        rows.push(["Acme Corporation Global", "Active", "Enterprise", "Verified", "24/7 Dedicated"]);
        rows.push(["TechSphere Solutions", "Active", "Enterprise", "Verified", "Priority"]);
        rows.push(["Quantika Labs Pvt Ltd", "Trial", "Trial", "Pending Verification", "Standard"]);
        rows.push(["Starlight Retail Ventures", "Active", "Enterprise", "Verified", "24/7 Dedicated"]);
      } else if (type === "Global Users") {
        rows.push(["One Click  - Global Platform Users Analytics"]);
        rows.push([`Generated On: ${new Date().toLocaleString()}`]);
        rows.push([]);
        rows.push(["User Category", "Total Count", "Active Users (24h)", "2FA Enabled Ratio", "Security Status"]);
        rows.push(["Super Administrators", "3", "3", "100%", "Secured"]);
        rows.push(["Company Administrators", "186", "172", "94.5%", "Secured"]);
        rows.push(["Active Employees", "24563", "21840", "88.2%", "Nominal"]);
      } else {
        rows.push(["One Click  - Export Data"]);
        rows.push([`Generated On: ${new Date().toLocaleString()}`]);
      }

      const csvContent = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${type} report!`);
    } catch (err) {
      console.error("Error exporting report:", err);
      toast.error(`Failed to export ${type} report.`);
    }
  };

  const REPORT_CARDS = [
    { title: "Financial Summary", description: "Monthly recurring revenue, GST breakdowns, transaction charges, and projected ARR.", icon: TrendingUp, size: "1.2 MB" },
    { title: "Tenant Usage", description: "Resource utilization metrics: storage limits, API throughput, and employee counts per tenant.", icon: BarChart2, size: "850 KB" },
    { title: "Company Directory", description: "Complete directory export of active, trial, suspended, and pending company tenants.", icon: Building2, size: "2.1 MB" },
    { title: "Global Users", description: "Platform user roster across all tiers, last login timestamps, and 2FA security status.", icon: Users, size: "3.4 MB" },
  ];

  return (
    <div className="space-y-4 w-full pb-10 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Platform-wide financial, tenant usage, and resource performance intelligence.</p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Time Filter Select */}
          <div className="relative inline-flex items-center">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 pl-3 pr-8 py-2 rounded-xl cursor-pointer focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
            >
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="Last 6 Months">Last 6 Months</option>
              <option value="This Year">This Year</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Download All Reports Button */}
          <button 
            onClick={() => handleDownloadReport("Financial Summary")}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* ── Row 1: KPI Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KPICard label="Total MRR Revenue"  value="₹18.75L" trend="18.2%" isUp period="last month" strokeColor="#EAB308" Icon={TrendingUp}   iconBg="bg-amber-500/10"  iconColor="#D97706"/>
        <KPICard label="Active Tenants"     value="186"     trend="12.4%" isUp period="last month" strokeColor="#10B981" Icon={Building2}    iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Avg Storage / Tenant" value="13.2 GB" trend="5.8%"  isUp period="capacity"   strokeColor="#06B6D4" Icon={HardDrive}    iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="API Calls Volume"   value="1.82M"   trend="14.5%" isUp period="last month" strokeColor="#8B5CF6" Icon={BarChart2}     iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
      </div>

      {/* ── Row 2: MRR Growth Area & Tenant Onboarding Bar ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* MRR Revenue Area Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Monthly Recurring Revenue (MRR)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Platform platform-wide subscription billing curve</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ArrowUp size={10}/> +18.2% Growth
            </span>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={mrrData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={val => `₹${(val / 100000).toFixed(0)}L`} tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={val => [`₹${val.toLocaleString()}`, 'MRR']} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorMRR)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Tenant Onboarding Bar Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">New Companies Onboarded</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Monthly organization registration volume</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">2025 Cohort</span>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={onboardingData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={val => [val, 'New Companies']} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {onboardingData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_SHADES[index % BAR_SHADES.length].bot} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Row 3: Tenant Tier Breakdown & Pre-Built Export Cards ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Tenant Resources Donut */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-2">Resource Allocation by Tier</h3>
          <div className="flex items-center gap-3 my-auto">
            <div className="relative w-24 h-24 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={TENANT_RESOURCES} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3} dataKey="value">
                    {TENANT_RESOURCES.map((e,i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none">186</span>
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Tenants</span>
              </div>
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              {TENANT_RESOURCES.map(item => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }}/>
                    <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-semibold ml-1 flex-shrink-0">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pre-Built Data Export Section */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Export Intelligence Reports</h3>
            <span className="text-[10px] font-semibold text-slate-400">CSV / Spreadsheet Format</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {REPORT_CARDS.map((report) => {
              const Icon = report.icon;
              return (
                <div 
                  key={report.title} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 hover:border-amber-500/40 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-500 transition-colors">{report.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{report.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadReport(report.title)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 transition-all flex-shrink-0 shadow-2xs"
                  >
                    <Download size={11} />
                    <span>CSV</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SuperAdminReports;
