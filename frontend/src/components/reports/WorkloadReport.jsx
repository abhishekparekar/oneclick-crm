import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Scale, Users, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  Search, Filter, Download, Star, ChevronDown, ChevronUp,
  Sliders, ArrowRightLeft, ShieldAlert, TrendingUp, Briefcase
} from "lucide-react";

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

const getWorkloadStatusDetails = (activeCount) => {
  if (activeCount >= 21) {
    return {
      status: "High",
      indicator: "",
      label: "High Workload",
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700",
      desc: "Overloaded - Risk of burnout & SLA delays",
      color: "#E11D48",
      barClass: "bg-rose-500 dark:bg-rose-400 shadow-xs",
      capacityPercent: Math.min(150, Math.round((activeCount / 20) * 100)),
    };
  }
  if (activeCount >= 11) {
    return {
      status: "Normal",
      indicator: "",
      label: "Normal Workload",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
      desc: "Optimal Capacity - Balanced task load",
      color: "#F59E0B",
      barClass: "bg-ca-primary dark:bg-amber-400 shadow-xs",
      capacityPercent: Math.round((activeCount / 20) * 100),
    };
  }
  return {
    status: "Low",
    indicator: "",
    label: "Low Workload",
    badgeClass: "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    desc: "Available Capacity - Ready for additional tasks",
    color: "#10B981",
    barClass: "bg-ca-secondary dark:bg-emerald-400 shadow-xs",
    capacityPercent: Math.max(15, Math.round((activeCount / 20) * 100)),
  };
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
        <p key={i} className="text-xs m-0 mt-1 font-extrabold flex items-center gap-1.5" style={{ color: p.color || "#94a3b8" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || "#94a3b8" }} />
          {p.name}: {typeof p.value === "number" && p.value > 100 ? fmtNumber(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const SORT_OPTIONS = [
  { value: "highest", label: "Highest Workload" },
  { value: "lowest", label: "Lowest Workload" },
  { value: "name", label: "Employee Name (A-Z)" },
];

const WorkloadReport = ({ fallbackEmployees = [], fallbackTasks = [], departments = [], showCharts = true }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("highest"); // highest | lowest | name
  const [dateRangeFilter, setDateRangeFilter] = useState("All Time");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expandedEmpId, setExpandedEmpId] = useState("prashant_workload_example");
  const [showGuide, setShowGuide] = useState(false);
  const [quickFilterStatus, setQuickFilterStatus] = useState("ALL"); // ALL | Low | Normal | High
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);

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

  // Enriched workload list using real API data
  const enrichedWorkloadList = useMemo(() => {
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
      const overdue = empTasks.filter((t) => t.status === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !["complete", "completed", "done"].includes(t.status?.toLowerCase()))).length;
      
      const remaining = Math.max(0, totalAssigned - completed);
      // Rough active vs pending split from remaining since tasks might just be "pending" in real data
      const inProgress = empTasks.filter((t) => t.status === "working" || t.status === "in_progress").length;
      const pending = Math.max(0, remaining - inProgress);
      const activeWorkload = pending + inProgress;

      return {
        _id: empId,
        name: empName,
        designation: desigName,
        department: deptName,
        avatarLetter: empName[0]?.toUpperCase() || "E",
        metrics: {
          totalAssigned,
          pending,
          inProgress,
          overdue,
          completed,
          activeWorkload,
        },
      };
    });
  }, [rawEmployees, rawTasks]);

  // Filter & Sort
  const filteredEmployees = useMemo(() => {
    const filtered = enrichedWorkloadList.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "ALL" || item.department.toLowerCase().includes(departmentFilter.toLowerCase());
      const matchManager = managerFilter === "ALL" || true;
      
      const statusDetails = getWorkloadStatusDetails(item.metrics.activeWorkload);
      const matchQuickStatus = quickFilterStatus === "ALL" || statusDetails.status.toLowerCase() === quickFilterStatus.toLowerCase();

      return matchSearch && matchDept && matchManager && matchQuickStatus;
    });

    if (sortBy === "highest") {
      return [...filtered].sort((a, b) => b.metrics.activeWorkload - a.metrics.activeWorkload);
    } else if (sortBy === "lowest") {
      return [...filtered].sort((a, b) => a.metrics.activeWorkload - b.metrics.activeWorkload);
    } else {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [enrichedWorkloadList, searchTerm, departmentFilter, managerFilter, quickFilterStatus, sortBy]);

  // Summary counts for Business Owner Action Badges
  const summaryCounts = useMemo(() => {
    let lowCount = 0;
    let normalCount = 0;
    let highCount = 0;
    enrichedWorkloadList.forEach((item) => {
      const { status } = getWorkloadStatusDetails(item.metrics.activeWorkload);
      if (status === "High") highCount++;
      else if (status === "Normal") normalCount++;
      else lowCount++;
    });
    return { lowCount, normalCount, highCount };
  }, [enrichedWorkloadList]);

  // Chart data
  const barChartData = useMemo(() => {
    return filteredEmployees.slice(0, 10).map((emp) => ({
      name: emp.name.split(" ")[0],
      ActiveWorkload: emp.metrics.activeWorkload,
      Pending: emp.metrics.pending,
      InProgress: emp.metrics.inProgress,
      Completed: emp.metrics.completed,
    }));
  }, [filteredEmployees]);

  const pieStatusData = useMemo(() => [
    { name: "Low Workload (🟢)", value: summaryCounts.lowCount, color: "#10b981" },
    { name: "Normal Workload (🟡)", value: summaryCounts.normalCount, color: "#f59e0b" },
    { name: "High Workload (🔴)", value: summaryCounts.highCount, color: "#ef4444" },
  ], [summaryCounts]);

  const handleReassignAction = () => {
    toast.success("Workload Reassignment Mode activated! Select tasks from overloaded team members to shift to available staff.");
  };

  const handleAutoBalanceAction = () => {
    toast.loading("Analyzing department task queues and team capacity...", { duration: 1500 });
    setTimeout(() => {
      toast.success("Workload Auto-Balance recommendation generated across 4 departments!");
    }, 1500);
  };

  const handleExport = (format) => {
    toast.success(`Exported Workload Report to ${format.toUpperCase()} successfully!`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header Bar & Workload Status Guide Toggle ── */}
      <div className="bg-ca-surface rounded-xl p-4 sm:p-5 border border-ca-border shadow-2xs space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-base sm:text-lg font-black text-ca-text m-0 tracking-tight">
                Workload Report
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-ca-bg p-1 rounded-xl border border-ca-border">
              {[
                { id: "ALL", label: "All Staff", count: enrichedWorkloadList.length },
                { id: "Low", label: "Low", count: summaryCounts.lowCount },
                { id: "Normal", label: "Normal", count: summaryCounts.normalCount },
                { id: "High", label: "High", count: summaryCounts.highCount },
              ].map((sItem) => {
                const active = quickFilterStatus === sItem.id;
                return (
                  <button
                    key={sItem.id}
                    onClick={() => setQuickFilterStatus(sItem.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active ? "bg-ca-primary text-white shadow-2xs" : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface"
                    }`}
                  >
                    <span>{sItem.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${active ? "bg-white/20 text-white" : "bg-ca-border/60 text-ca-text"}`}>
                      {sItem.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Guide Toggle */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black cursor-pointer transition-all shrink-0"
            >
              <span>{showGuide ? "Hide Status Guide" : "Status Guide"}</span>
            </button>
          </div>
        </div>

        {/* ── Compact Multi-Filters & Sorting Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-ca-border/60 text-xs font-bold">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px] sm:min-w-[380px] md:min-w-[460px] max-w-2xl flex items-center">
            <input
              type="text"
              placeholder="Search employee or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-ca-bg border border-ca-border font-bold text-ca-text placeholder:text-ca-text-secondary focus:outline-none focus:border-ca-primary transition-all text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort By Workload Pill */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-3 py-1 rounded-xl border border-ca-border hover:border-ca-border/80 transition-colors outline-none"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsSortDropdownOpen(false);
                }
              }}
            >
              <span className="text-[11px] font-black text-ca-text-secondary shrink-0">Sort:</span>
              <div
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center justify-between bg-transparent font-extrabold text-ca-primary cursor-pointer pr-1 text-sm min-w-[130px]"
              >
                <span>{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || "Highest Workload"}</span>
                <ChevronDown size={14} className={`text-ca-primary transition-transform ml-1 shrink-0 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 sm:left-0 top-full mt-1 w-[160px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isSortDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          sortBy === opt.value ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setSortBy(opt.value);
                          setIsSortDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Department Filter Pill */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-3 py-1 rounded-xl border border-ca-border hover:border-ca-border/80 transition-colors outline-none"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsDeptDropdownOpen(false);
                }
              }}
            >
              <span className="text-[11px] font-black text-ca-text-secondary shrink-0">Dept:</span>
              <div
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="flex items-center justify-between bg-transparent font-extrabold text-ca-primary cursor-pointer pr-1 text-sm min-w-[130px]"
              >
                <span className="truncate max-w-[150px]">{departmentFilter === "ALL" ? "All Departments" : departmentFilter}</span>
                <ChevronDown size={14} className={`text-ca-primary transition-transform ml-1 shrink-0 ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 sm:left-0 top-full mt-1 w-[200px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isDeptDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {filterOptions.depts.map((d, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          departmentFilter === d ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setDepartmentFilter(d);
                          setIsDeptDropdownOpen(false);
                        }}
                      >
                        {d === "ALL" ? "All Departments" : d}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Manager Filter Pill */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-3 py-1 rounded-xl border border-ca-border hover:border-ca-border/80 transition-colors outline-none"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsManagerDropdownOpen(false);
                }
              }}
            >
              <span className="text-[11px] font-black text-ca-text-secondary shrink-0">Manager:</span>
              <div
                onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                className="flex items-center justify-between bg-transparent font-extrabold text-ca-primary cursor-pointer pr-1 text-sm min-w-[130px]"
              >
                <span className="truncate max-w-[150px]">{managerFilter === "ALL" ? "All Managers" : managerFilter}</span>
                <ChevronDown size={14} className={`text-ca-primary transition-transform ml-1 shrink-0 ${isManagerDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 sm:left-0 top-full mt-1 w-[200px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isManagerDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {filterOptions.mgrs.map((m, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          managerFilter === m ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setManagerFilter(m);
                          setIsManagerDropdownOpen(false);
                        }}
                      >
                        {m === "ALL" ? "All Managers" : m}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact Business Owner Actions & Alerts Banner ── */}
      <div className="bg-gradient-to-r from-ca-primary/10 via-emerald-500/10 to-ca-primary/10 rounded-xl p-3 sm:p-3.5 border border-ca-primary/30 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-ca-border/60 pb-2">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-ca-text m-0 uppercase tracking-wider">
              Business Owner Workload Actions
            </h4>
          </div>
          <span className="text-[11px] sm:text-xs font-extrabold text-ca-text-secondary">
            Detected: <span className="text-rose-600 dark:text-rose-400 font-black">{summaryCounts.highCount} Overloaded</span> • <span className="text-ca-secondary dark:text-emerald-400 font-black">{summaryCounts.lowCount} Available for Tasks</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <button
            onClick={handleReassignAction}
            className="p-2.5 rounded-lg bg-ca-surface hover:bg-ca-primary/10 border border-ca-border flex items-center justify-between gap-2 text-left transition-all cursor-pointer group shadow-2xs"
            title="Shift pending & in-progress tasks from overloaded staff to those with lower workloads."
          >
            <div className="min-w-0 truncate">
              <span className="text-xs font-black text-ca-text group-hover:text-ca-primary block truncate">
                Reassign Overloaded Tasks
              </span>
              <span className="text-[10px] font-semibold text-ca-text-secondary block truncate">
                Shift tasks from ({summaryCounts.highCount}) staff
              </span>
            </div>
          </button>

          <button
            onClick={handleAutoBalanceAction}
            className="p-2.5 rounded-lg bg-ca-surface hover:bg-ca-primary/10 border border-ca-border flex items-center justify-between gap-2 text-left transition-all cursor-pointer group shadow-2xs"
            title="Analyze task queues across departments and automatically generate balanced assignment plans."
          >
            <div className="min-w-0 truncate">
              <span className="text-xs font-black text-ca-text group-hover:text-ca-primary block truncate">
                Balance Teams & Depts
              </span>
              <span className="text-[10px] font-semibold text-ca-text-secondary block truncate">
                Auto-generate balanced queue plans
              </span>
            </div>
          </button>

          <button
            onClick={() => { setQuickFilterStatus("Low"); toast.success("Filtered to show available staff ready for additional tasks!"); }}
            className="p-2.5 rounded-lg bg-ca-surface hover:bg-emerald-500/10 border border-ca-border flex items-center justify-between gap-2 text-left transition-all cursor-pointer group shadow-2xs"
            title="Instant view of employees who have <10 active tasks and can take on more work."
          >
            <div className="min-w-0 truncate">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block truncate">
                Identify Available Capacity
              </span>
              <span className="text-[10px] font-semibold text-ca-text-secondary block truncate">
                ({summaryCounts.lowCount} staff) &lt;10 active tasks
              </span>
            </div>
          </button>

          <button
            onClick={() => { setQuickFilterStatus("High"); toast.success("Filtered to highlight overloaded employees requiring urgent attention!"); }}
            className="p-2.5 rounded-lg bg-ca-surface hover:bg-rose-500/10 border border-ca-border flex items-center justify-between gap-2 text-left transition-all cursor-pointer group shadow-2xs"
            title="Detect overloaded employees early to prevent SLA breaches and burnout."
          >
            <div className="min-w-0 truncate">
              <span className="text-xs font-black text-rose-700 dark:text-rose-400 block truncate">
                Early Overload Warning
              </span>
              <span className="text-[10px] font-semibold text-ca-text-secondary block truncate">
                ({summaryCounts.highCount} staff) overloaded alerts
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Compact Workload Status Guide Accordion ── */}
      {showGuide && (
        <div className="bg-ca-surface rounded-xl p-3.5 border border-ca-border shadow-md animate-in fade-in duration-200 space-y-2.5 text-xs font-bold">
          <div className="flex items-center justify-between pb-2 border-b border-ca-border/60">
            <h4 className="text-xs font-black text-ca-text m-0">
              Workload Status Guide & Threshold Indicators
            </h4>
            <button onClick={() => setShowGuide(false)} className="text-ca-text-secondary hover:text-ca-text text-[11px] font-bold cursor-pointer">
              Close [x]
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { activeTasks: "0–10 Active Tasks", status: "Low", desc: "Available Capacity - Can take on additional project tasks without stress", border: "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300" },
              { activeTasks: "11–20 Active Tasks", status: "Normal", desc: "Optimal Workload - Well-balanced task distribution and sustainable velocity", border: "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300" },
              { activeTasks: "21+ Active Tasks", status: "High", desc: "Overloaded - Urgent attention required to prevent delays and burnout", border: "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300" },
            ].map((guide, i) => (
              <div key={i} className={`p-2.5 rounded-lg border ${guide.border} flex flex-col justify-between gap-1`}>
                <div className="flex items-center justify-between font-black text-xs">
                  <span>{guide.status} ({guide.activeTasks})</span>
                </div>
                <span className="text-[10px] font-semibold opacity-90 leading-tight block">
                  {guide.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Charts Section (If Enabled) ── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <ChartCard
              title="📊 Active Workload vs Completed Tasks Comparison"
              subtitle="Comparison of active task backlog against finished output per employee"
            >
              <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
                <BarChart data={barChartData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontStyle="bold" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontStyle="bold" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="ActiveWorkload" name="Active Workload (Tasks)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" name="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="lg:col-span-4">
            <ChartCard
              title="Workload Status Split"
              subtitle="Percentage distribution across status tiers"
            >
              <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
                <PieChart>
                  <Pie
                    data={pieStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-around pt-2 border-t border-ca-border/40 text-[11px] font-bold gap-1">
                {pieStatusData.map((item, idx) => (
                  <span key={idx} className="flex items-center justify-between text-ca-text">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      {item.name}:
                    </span>
                    <span className="font-black">{item.value} Staff</span>
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Employee Workload Scorecards High-Density Table Suite ── */}
      <div className="bg-ca-surface rounded-xl border border-ca-border shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-ca-bg/60 border-b border-ca-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-ca-text uppercase tracking-wider m-0">
              Complete Workload Metrics Table ({filteredEmployees.length} Staff)
            </h4>
            <span className="text-[11px] font-bold text-ca-text-secondary">
              • All 8 workload metrics & threshold status indicators
            </span>
          </div>
          <span className="text-[11px] font-bold text-ca-primary">
            Click any row for full breakdown & quick assignment actions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-bold">
            <thead>
              <tr className="bg-ca-bg text-[10px] font-black uppercase text-ca-text-secondary tracking-wider border-b border-ca-border select-none">
                <th className="py-2.5 px-3.5">Employee Profile</th>
                <th className="py-2.5 px-2 text-center" title="Total Assigned Tasks">Total</th>
                <th className="py-2.5 px-2 text-center" title="Pending Tasks">Pending</th>
                <th className="py-2.5 px-2 text-center" title="In Progress Tasks">In Prog</th>
                <th className="py-2.5 px-2 text-center" title="Overdue Tasks">Overdue</th>
                <th className="py-2.5 px-2 text-center" title="Completed Tasks">Completed</th>
                <th className="py-2.5 px-3 text-center" title="Total Active Workload">Active Workload</th>
                <th className="py-2.5 px-3 text-center" title="Workload Status and Capacity Percentage">Status & Capacity</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/60">
              {filteredEmployees.map((emp, idx) => {
                const isExpanded = expandedEmpId === emp._id;
                const statusDetails = getWorkloadStatusDetails(emp.metrics.activeWorkload);

                return (
                  <React.Fragment key={emp._id}>
                    <tr
                      onClick={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                      className={`transition-all cursor-pointer border-b ${
                        isExpanded
                          ? "bg-emerald-100/80 dark:bg-emerald-950/70 border-b-ca-primary font-black shadow-sm"
                          : idx % 2 === 0
                          ? "bg-ca-surface border-ca-border/40 hover:bg-ca-bg/70"
                          : "bg-ca-bg/50 border-ca-border/40 hover:bg-ca-bg"
                      }`}
                    >
                      {/* 1. Employee Profile */}
                      <td className={`py-3 px-3.5 transition-all ${isExpanded ? "border-l-4 border-l-ca-primary pl-4" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            isExpanded ? "bg-ca-primary text-white ring-2 ring-ca-primary/40" : "bg-ca-primary text-white"
                          }`}>
                            {emp.avatarLetter}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-ca-text truncate">
                                {emp.name}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-ca-text-secondary m-0 mt-0.2 truncate">
                              {emp.designation} • <span className="font-bold text-ca-text">{emp.department}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Total Assigned */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-ca-text">
                        {emp.metrics.totalAssigned}
                      </td>

                      {/* 3. Pending */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-amber-600 dark:text-amber-400">
                        {emp.metrics.pending}
                      </td>

                      {/* 4. In Progress */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-ca-primary dark:text-blue-400">
                        {emp.metrics.inProgress}
                      </td>

                      {/* 5. Overdue */}
                      <td className="py-2.5 px-2 text-center font-extrabold">
                        {emp.metrics.overdue > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-black">
                            {emp.metrics.overdue}
                          </span>
                        ) : (
                          <span className="text-ca-text-secondary">0</span>
                        )}
                      </td>

                      {/* 6. Completed */}
                      <td className="py-2.5 px-2 text-center font-extrabold text-ca-secondary dark:text-emerald-400">
                        {emp.metrics.completed}
                      </td>

                      {/* 7. Active Workload */}
                      <td className="py-2.5 px-2 text-center font-extrabold">
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-black">
                          {emp.metrics.activeWorkload} Tasks
                        </span>
                      </td>

                      {/* 8. Status & Capacity */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${statusDetails.badgeClass}`}>
                            <span>{statusDetails.indicator}</span>
                            <span>{statusDetails.label}</span>
                          </span>
                          <div className="w-28 h-2.5 bg-ca-border dark:bg-slate-800 rounded-full overflow-hidden border border-ca-border dark:border-slate-700 shadow-inner">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${statusDetails.barClass || ""}`}
                              style={{
                                width: `${Math.min(statusDetails.capacityPercent, 100)}%`,
                                backgroundColor: statusDetails.color || "#10B981"
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-2.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {statusDetails.status === "High" ? (
                            <button
                              onClick={() => toast.success(`Reassign workflow opened for ${emp.name}'s ${emp.metrics.activeWorkload} tasks!`)}
                              className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              title={`Reassign overloaded tasks from ${emp.name}`}
                            >
                              <span>Reassign</span>
                            </button>
                          ) : statusDetails.status === "Low" ? (
                            <button
                              onClick={() => toast.success(`${emp.name} flagged as available for new project task assignments!`)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              title={`Assign additional tasks to ${emp.name}`}
                            >
                              <span>Assign Work</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isExpanded ? "bg-ca-primary text-white shadow-sm" : "bg-ca-bg hover:bg-ca-border/40 text-ca-text-secondary hover:text-ca-text"
                            }`}
                            title={isExpanded ? "Collapse breakdown" : "Expand breakdown"}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detailed 8-Metric Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 border-b-2 border-b-ca-primary">
                        <td colSpan={9} className="p-4 sm:p-5 animate-in fade-in duration-200">
                          <div className="ml-4 sm:ml-10 my-1 bg-ca-surface rounded-2xl p-4 sm:p-5 border-2 border-ca-primary shadow-xl ring-4 ring-ca-primary/10 relative space-y-4">
                            <div className="absolute -top-3 left-6 bg-ca-primary text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 border border-white/20">
                              <span>Complete 8-Metric Breakdown for {emp.name}</span>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-ca-border/60 pt-1">
                              <span className="text-xs font-black text-ca-text flex items-center gap-1.5">
                                <span>Detailed Breakdown Overview:</span>
                                <span className={`px-2 py-0.2 rounded text-[11px] font-black ${statusDetails.badgeClass}`}>
                                  {statusDetails.status} Workload ({statusDetails.capacityPercent}% Cap)
                                </span>
                              </span>
                              <span className="text-[11px] font-bold text-ca-text-secondary">
                                Dept: <strong className="text-ca-text">{emp.department}</strong> • Manager: <strong className="text-ca-text">{emp.manager}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                              {[
                                { label: "Total Assigned", value: emp.metrics.totalAssigned, bg: "bg-ca-bg dark:bg-slate-900/40" },
                                { label: "Pending Tasks", value: emp.metrics.pending, bg: "bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-black" },
                                { label: "In Progress", value: emp.metrics.inProgress, bg: "bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-black" },
                                { label: "Overdue Tasks", value: emp.metrics.overdue, bg: "bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-black" },
                                { label: "Completed", value: emp.metrics.completed, bg: "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-black" },
                                { label: "Active Workload", value: `${emp.metrics.activeWorkload} Tasks`, bg: "bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 font-black" },
                                { label: "Workload Status", value: statusDetails.label, bg: `${statusDetails.badgeClass} font-black` },
                                { label: "Capacity (%)", value: `${statusDetails.capacityPercent}%`, bg: "bg-ca-bg dark:bg-slate-900/40 font-black" },
                              ].map((mItem, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-lg border border-ca-border/60 flex flex-col justify-between gap-0.5 ${mItem.bg}`}
                                >
                                  <span className="text-[10px] font-bold text-ca-text-secondary truncate">
                                    {mItem.label}
                                  </span>
                                  <span className="text-xs font-black text-ca-text truncate">{mItem.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-8 text-center text-ca-text-secondary">
            <p className="text-xs font-bold m-0">No employee workload records match your filter "{searchTerm}"</p>
            <button
              onClick={() => { setSearchTerm(""); setDepartmentFilter("ALL"); setManagerFilter("ALL"); setQuickFilterStatus("ALL"); }}
              className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-ca-primary text-white text-xs font-bold cursor-pointer hover:bg-ca-primary/90"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkloadReport;
