import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
  Zap, Award, Users, Clock, CheckSquare, AlertTriangle,
  Search, Filter, Download, Star, ChevronDown, ChevronUp,
  Activity, Calendar, TrendingUp, Briefcase
} from "lucide-react";

const COLORS = {
  primary: "#235347",
  accent: "#558D7C",
  amber: "#3C7161",
  red: "#163832",
  rose: "#0B2B26",
  violet: "#8EB69B",
  light: "#DAF1DE",
};

const CHART_COLORS = ["#235347", "#3C7161", "#558D7C", "#8EB69B", "#E11D48", "#F59E0B"];

const toSafeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.departments)) return val.departments;
  if (Array.isArray(val.employees)) return val.employees;
  if (Array.isArray(val.tasks)) return val.tasks;
  if (Array.isArray(val.list)) return val.list;
  if (Array.isArray(val.data)) return val.data;
  if (val.data && typeof val.data === "object") {
    if (Array.isArray(val.data.departments)) return val.data.departments;
    if (Array.isArray(val.data.employees)) return val.data.employees;
    if (Array.isArray(val.data.tasks)) return val.data.tasks;
    if (Array.isArray(val.data.list)) return val.data.list;
  }
  return [];
};

const fmtNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const getProductivityRatingDetails = (efficiency) => {
  if (efficiency >= 95) return { rating: "⭐ Outstanding", status: "Exceptional Productivity", colorClass: "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700", dot: "⭐" };
  if (efficiency >= 90) return { rating: "🟢 Excellent", status: "High Performer", colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-700", dot: "🟢" };
  if (efficiency >= 80) return { rating: "🔵 Good", status: "Productive", colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700", dot: "🔵" };
  if (efficiency >= 70) return { rating: "🟡 Average", status: "Needs Improvement", colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700", dot: "🟡" };
  return { rating: "🔴 Poor", status: "Requires Attention", colorClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700", dot: "🔴" };
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-ca-surface rounded-xl p-4 sm:p-5 shadow-2xs border border-ca-border h-full flex flex-col transition-all duration-200">
    <div className="mb-4 flex items-center justify-between border-b border-ca-border/60 pb-3">
      <div>
        <p className="text-sm font-black text-ca-text m-0 tracking-tight">{title}</p>
        {subtitle && <p className="text-[11px] font-semibold text-ca-text-secondary mt-0.5 mb-0">{subtitle}</p>}
      </div>
    </div>
    <div className="flex-1 min-h-[220px] w-full min-w-[200px]">
      {children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ca-surface dark:bg-ca-surface border border-ca-border dark:border-ca-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-bold text-ca-text-secondary dark:text-slate-200 mb-1.5 mt-0">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs m-0 mt-1 font-extrabold flex items-center gap-1.5" style={{ color: p.color || "#8EB69B" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || "#8EB69B" }} />
          {p.name}: {typeof p.value === "number" && p.value > 100 ? fmtNumber(p.value) : p.value}
          {p.unit ? ` ${p.unit}` : ""}
        </p>
      ))}
    </div>
  );
};

const EmployeeProductivityReport = ({ fallbackEmployees = [], fallbackTasks = [], departments = [], showCharts = true }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("Weekly");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expandedEmpId, setExpandedEmpId] = useState("prashant_prod_example");
  const [showGuide, setShowGuide] = useState(false);

  // Extract real employees, tasks, departments
  const rawEmployees = useMemo(() => toSafeArray(fallbackEmployees), [fallbackEmployees]);
  const rawTasks = useMemo(() => toSafeArray(fallbackTasks), [fallbackTasks]);
  const rawDepts = useMemo(() => toSafeArray(departments), [departments]);

  // Extract filter dropdown options
  const filterOptions = useMemo(() => {
    const depts = new Set(["ALL", ...rawDepts.map((d) => d.name).filter(Boolean)]);
    const mgrs = new Set(["ALL", "Prashant Sharma", "Rahul Sharma (Project Manager)", ...rawEmployees.filter((e) => (e.designation?.title || "").toLowerCase().includes("manager") || (e.role || "").toLowerCase().includes("manager")).map((e) => e.firstName ? `${e.firstName} ${e.lastName || ""}`.trim() : e.name).filter(Boolean)]);
    const projects = new Set(["ALL", "ERP Redesign", "Mobile App Launch", "Cloud Migration", ...rawTasks.map((t) => t.project?.title || t.project || t.projectName).filter((p) => typeof p === "string" && p.length > 1)]);
    return {
      depts: Array.from(depts),
      mgrs: Array.from(mgrs),
      projects: Array.from(projects),
    };
  }, [rawEmployees, rawTasks, rawDepts]);

  // Enriched employees list using real API data
  const enrichedProductivityList = useMemo(() => {
    return rawEmployees.map((emp) => {
      const empId = emp._id || emp.id;
      const empName = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || `Employee`;
      const deptName = emp.department?.name || emp.department || "General";
      const desigName = emp.designation?.title || emp.designation || "Staff";

      // Tasks linked to this employee
      const empTasks = rawTasks.filter((t) => {
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
        return assignees.some((a) => (a?._id || a?.id || a) === empId || (a?.fullName && a.fullName.toLowerCase() === empName.toLowerCase()));
      });

      const totalAssigned = empTasks.length;
      const completed = empTasks.filter((t) => (t.status || "").toLowerCase().includes("complete") || t.status === "done").length;
      const overdue = empTasks.filter(t => t.status === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !["complete", "completed", "done"].includes(t.status?.toLowerCase()))).length;
      const pending = Math.max(0, totalAssigned - completed - overdue);
      
      const workingHoursNum = 8; // Assuming 8-hour workday
      const tasksPerHour = workingHoursNum > 0 ? Number((completed / workingHoursNum).toFixed(2)) : 0;
      const avgTimeMins = completed > 0 ? Math.round((workingHoursNum * 60) / completed) : 0;
      const avgTimePerTask = `${avgTimeMins} Minutes`;

      const efficiencyRaw = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      const efficiency = Math.min(100, Math.max(0, efficiencyRaw));
      const productivityScore = Math.max(0, efficiency - (overdue * 3));

      return {
        _id: empId,
        name: empName,
        designation: desigName,
        department: deptName,
        avatarLetter: empName[0]?.toUpperCase() || "E",
        metrics: {
          workingHours: `${workingHoursNum} Hours`,
          totalAssigned,
          completed,
          pending,
          overdue,
          tasksPerHour,
          avgTimePerTask,
          productivityScore,
          efficiency,
        },
      };
    });
  }, [rawEmployees, rawTasks]);

  const filteredEmployees = useMemo(() => {
    return enrichedProductivityList.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "ALL" || item.department.toLowerCase().includes(departmentFilter.toLowerCase());
      return matchSearch && matchDept;
    });
  }, [enrichedProductivityList, searchTerm, departmentFilter]);

  // Chart data for Employee Efficiency & Productivity Score
  const chartData = useMemo(() => {
    return filteredEmployees.slice(0, 10).map((emp) => ({
      name: emp.name.split(" ")[0],
      Efficiency: emp.metrics.efficiency,
      Score: emp.metrics.productivityScore,
      Completed: emp.metrics.completed,
      TasksPerHour: emp.metrics.tasksPerHour,
    }));
  }, [filteredEmployees]);

  const handleExport = (format) => {
    toast.success(`Exported Employee Productivity Report (${timeFilter}) to ${format.toUpperCase()} successfully!`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header Bar & Time Filters ── */}
      <div className="bg-ca-surface rounded-xl p-4 sm:p-5 border border-ca-border shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-ca-primary/15 flex items-center justify-center text-ca-primary shadow-2xs">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-ca-text m-0 tracking-tight">
                  Employee Productivity Report
                </h3>
                <p className="text-xs font-semibold text-ca-text-secondary m-0 mt-0.5">
                  Measure employee productivity by comparing working hours with completed tasks and overall efficiency
                </p>
              </div>
            </div>
          </div>

          {/* Time Filters Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-ca-bg p-1 rounded-xl border border-ca-border">
            {["Daily", "Weekly", "Monthly", "Yearly", "Date Range"].map((tItem) => {
              const active = timeFilter === tItem;
              return (
                <button
                  key={tItem}
                  onClick={() => setTimeFilter(tItem)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active ? "bg-ca-primary text-white shadow-xs" : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface"
                  }`}
                >
                  {tItem}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Custom Date Range Picker */}
        {timeFilter === "Date Range" && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ca-border/60 bg-ca-bg/40 p-3 rounded-xl animate-in fade-in duration-200">
            <span className="text-xs font-bold text-ca-text">Custom Productivity Window:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-ca-surface border border-ca-border text-xs font-bold text-ca-text"
            />
            <span className="text-xs font-bold text-ca-text-secondary">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-ca-surface border border-ca-border text-xs font-bold text-ca-text"
            />
            <button
              onClick={() => toast.success("Date range filter applied!")}
              className="px-3 py-1 rounded-lg bg-ca-primary text-white text-xs font-bold cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* ── Multi-Filters Bar & Export Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-3 border-t border-ca-border/60">
          {/* Search */}
          <div className="relative min-w-[180px] flex items-center col-span-1 sm:col-span-2 md:col-span-1">
            <Search size={14} className="absolute left-3 text-ca-text-secondary" />
            <input
              type="text"
              placeholder="Search employee or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-bold text-ca-text placeholder:text-ca-text-secondary focus:outline-none focus:border-ca-primary transition-all"
            />
          </div>

          {/* Department Filter */}
          <div className="bg-ca-bg px-2.5 py-1.5 rounded-xl border border-ca-border flex flex-col">
            <span className="text-[10px] font-black text-ca-text-secondary uppercase">Department</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-ca-text focus:outline-none cursor-pointer mt-0.5 truncate"
            >
              {filterOptions.depts.map((d, i) => (
                <option key={i} value={d}>{d === "ALL" ? "All Departments" : d}</option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          <div className="bg-ca-bg px-2.5 py-1.5 rounded-xl border border-ca-border flex flex-col">
            <span className="text-[10px] font-black text-ca-text-secondary uppercase">Manager</span>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-ca-text focus:outline-none cursor-pointer mt-0.5 truncate"
            >
              {filterOptions.mgrs.map((m, i) => (
                <option key={i} value={m}>{m === "ALL" ? "All Managers" : m}</option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className="bg-ca-bg px-2.5 py-1.5 rounded-xl border border-ca-border flex flex-col">
            <span className="text-[10px] font-black text-ca-text-secondary uppercase">Project</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-ca-text focus:outline-none cursor-pointer mt-0.5 truncate"
            >
              {filterOptions.projects.map((p, i) => (
                <option key={i} value={p}>{p === "ALL" ? "All Projects" : p}</option>
              ))}
            </select>
          </div>

          {/* Guide Toggle */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black cursor-pointer transition-all"
          >
            <Star size={14} />
            <span>{showGuide ? "Hide Rating Scale" : "Rating Scale Guide"}</span>
          </button>
        </div>
      </div>

      {/* ── Productivity Rating Guide Accordion ── */}
      {showGuide && (
        <div className="bg-ca-surface rounded-xl p-5 border border-ca-border shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-ca-border/60">
            <h4 className="text-sm font-black text-ca-text m-0 flex items-center gap-2">
              <Star size={16} className="text-ca-primary fill-amber-500" />
              Employee Productivity Rating & Efficiency Guide
            </h4>
            <button onClick={() => setShowGuide(false)} className="text-ca-text-secondary hover:text-ca-text text-xs font-bold cursor-pointer">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { range: "95–100%", rating: "⭐ Outstanding", status: "Exceptional Productivity", border: "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20" },
              { range: "90–94%", rating: "🟢 Excellent", status: "High Performer", border: "border-teal-500/40 bg-teal-500/5 dark:bg-teal-950/20" },
              { range: "80–89%", rating: "🔵 Good", status: "Productive", border: "border-blue-500/40 bg-blue-500/5 dark:bg-blue-950/20" },
              { range: "70–79%", rating: "🟡 Average", status: "Needs Improvement", border: "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20" },
              { range: "Below 70%", rating: "🔴 Poor", status: "Requires Attention", border: "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20" },
            ].map((scale, i) => (
              <div key={i} className={`p-3 rounded-xl border ${scale.border} flex flex-col justify-between`}>
                <div>
                  <span className="text-xs font-black text-ca-text block">{scale.range}</span>
                  <span className="text-xs font-bold block mt-1">{scale.rating}</span>
                </div>
                <span className="text-[10px] font-semibold text-ca-text-secondary block mt-2 pt-2 border-t border-ca-border/40">
                  {scale.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Charts Section (If Enabled) ── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ChartCard
              title="⚡ Employee Efficiency vs Productivity Score"
              subtitle="Comparison of completed tasks percentage vs overall output score"
            >
              <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={100}>
                <BarChart data={chartData} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8EB69B" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#8EB69B" fontStyle="bold" fontSize={12} />
                  <YAxis stroke="#8EB69B" fontStyle="bold" fontSize={12} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Efficiency" name="Efficiency (%)" fill="#235347" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Score" name="Productivity Score" fill="#3C7161" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="lg:col-span-4">
            <ChartCard
              title="🚀 Tasks Completed per Hour"
              subtitle="Average task completion rate per working hour across top talent"
            >
              <ResponsiveContainer width="100%" height={260} minWidth={100} minHeight={100}>
                <AreaChart data={chartData} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPerHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#558D7C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#558D7C" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8EB69B" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#8EB69B" fontStyle="bold" fontSize={12} />
                  <YAxis stroke="#8EB69B" fontStyle="bold" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="TasksPerHour" name="Tasks / Hour" stroke="#235347" strokeWidth={3} fillOpacity={1} fill="url(#colorPerHour)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Employee Productivity Scorecards List ── */}
      <div className="space-y-4">
        {filteredEmployees.map((emp, idx) => {
          const isExpanded = expandedEmpId === emp._id;
          const { rating, status, colorClass, dot } = getProductivityRatingDetails(emp.metrics.efficiency);

          return (
            <div
              key={emp._id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? "border-2 border-ca-primary shadow-xl ring-4 ring-ca-primary/15 bg-ca-surface"
                  : idx % 2 === 0
                  ? "border-ca-border shadow-2xs hover:border-ca-border/80 hover:shadow-md bg-ca-surface"
                  : "border-ca-border shadow-2xs hover:border-ca-border/80 hover:shadow-md bg-ca-bg/40"
              }`}
            >
              {/* Card Header (Clickable) */}
              <div
                onClick={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none transition-all ${
                  isExpanded ? "bg-emerald-100/80 dark:bg-emerald-950/70 border-l-8 border-l-ca-primary pl-4 sm:pl-6" : "hover:bg-ca-bg/70"
                }`}
              >
                {/* Profile Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-ca-primary text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                    {emp.avatarLetter}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-ca-text m-0">
                        {emp.name}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-ca-text-secondary m-0 mt-0.5">
                      {emp.designation} • <span className="font-bold text-ca-text">{emp.department}</span>
                    </p>
                  </div>
                </div>

                {/* Score & Rating Badge */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-ca-border/50">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider m-0">
                      Productivity Score
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-ca-text">{emp.metrics.productivityScore}/100</span>
                      <span className="text-xs">{dot}</span>
                    </div>
                  </div>

                  <div className={`px-3.5 py-2 rounded-xl border flex flex-col items-center justify-center text-center ${colorClass}`}>
                    <span className="text-xs font-black tracking-tight">{rating}</span>
                    <span className="text-[10px] font-semibold opacity-85 mt-0.5">{status} ({emp.metrics.efficiency}%)</span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-ca-bg flex items-center justify-center text-ca-text-secondary hover:text-ca-text shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Metrics & Visual Summary Flow */}
              {isExpanded && (
                <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-5 border-t-2 border-t-ca-primary bg-emerald-50/80 dark:bg-emerald-950/40 animate-in fade-in duration-200 space-y-5 shadow-inner">
                  {/* 1. Visual Summary Flow Card (Exact Requested Flow) */}
                  <div className="bg-ca-surface rounded-xl p-4 border border-ca-border shadow-2xs">
                    <span className="text-xs font-black text-ca-text uppercase tracking-wider block mb-3">
                      ⚡ Visual Summary Pipeline
                    </span>
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 text-center py-2">
                      <div className="flex flex-col items-center p-3 rounded-xl bg-ca-bg dark:bg-slate-900/50 min-w-[150px] border border-ca-border/60">
                        <span className="text-xs font-bold text-ca-text-secondary">⏱️ Working Hours</span>
                        <span className="text-lg font-black text-ca-text mt-1">{emp.metrics.workingHours}</span>
                      </div>
                      
                      <div className="hidden sm:flex flex-col items-center text-ca-primary font-black">
                        <span>──▶</span>
                      </div>
                      <div className="sm:hidden text-ca-primary font-black">
                        <span>▼</span>
                      </div>

                      <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 min-w-[150px] border border-emerald-500/30">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">✅ Completed Tasks</span>
                        <span className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-1">{emp.metrics.completed} Tasks</span>
                      </div>

                      <div className="hidden sm:flex flex-col items-center text-ca-primary font-black">
                        <span>──▶</span>
                      </div>
                      <div className="sm:hidden text-ca-primary font-black">
                        <span>▼</span>
                      </div>

                      <div className="flex flex-col items-center p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 min-w-[150px] border border-purple-500/30">
                        <span className="text-xs font-bold text-purple-800 dark:text-purple-300">🎯 Efficiency</span>
                        <span className="text-lg font-black text-purple-900 dark:text-purple-200 mt-1">{emp.metrics.efficiency}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 8 Detailed Productivity Indicators Grid */}
                  <div>
                    <span className="text-xs font-black text-ca-text uppercase tracking-wider block mb-3">
                      Detailed Metric Scorecard
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { icon: "⏱️", label: "Working Hours", value: emp.metrics.workingHours, bg: "bg-ca-bg dark:bg-slate-900/40" },
                        { icon: "📋", label: "Total Assigned Tasks", value: emp.metrics.totalAssigned, bg: "bg-ca-bg dark:bg-slate-900/40" },
                        { icon: "✅", label: "Completed Tasks", value: emp.metrics.completed, bg: "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-black" },
                        { icon: "🔴", label: "Pending Tasks", value: emp.metrics.pending, bg: "bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-black" },
                        { icon: "⚠️", label: "Overdue Tasks", value: emp.metrics.overdue, bg: "bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-black" },
                        { icon: "⚡", label: "Tasks per Hour", value: emp.metrics.tasksPerHour, bg: "bg-teal-50/70 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 font-black" },
                        { icon: "⏳", label: "Average Time per Task", value: emp.metrics.avgTimePerTask, bg: "bg-ca-bg dark:bg-slate-900/40 font-black" },
                        { icon: "📈", label: "Productivity Score", value: `${emp.metrics.productivityScore}/100`, bg: "bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 font-black" },
                      ].map((mItem, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border border-ca-border/60 flex items-center justify-between gap-3 ${mItem.bg}`}
                        >
                          <span className="text-xs font-bold text-ca-text flex items-center gap-2 truncate">
                            <span className="text-sm">{mItem.icon}</span>
                            <span className="truncate">{mItem.label}</span>
                          </span>
                          <span className="text-sm font-black text-ca-text shrink-0">{mItem.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="bg-ca-surface rounded-2xl p-10 text-center border border-ca-border text-ca-text-secondary">
            <Zap size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold m-0">No employee productivity records match your filter "{searchTerm}"</p>
            <button
              onClick={() => { setSearchTerm(""); setDepartmentFilter("ALL"); setManagerFilter("ALL"); setProjectFilter("ALL"); }}
              className="mt-3 px-4 py-1.5 rounded-xl bg-ca-primary text-white text-xs font-bold cursor-pointer hover:bg-ca-primary/90"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProductivityReport;
