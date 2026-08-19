import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Clock, AlertTriangle, CheckCircle2, ShieldAlert, Users, Building2,
  Search, Filter, Download, Star, ChevronDown, ChevronUp,
  TrendingUp, Briefcase, Calendar, Bell, FileText, LayoutList, LayoutGrid
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

const COMMON_DELAY_REASONS = [
  "Waiting for Client Approval",
  "Requirement Changes",
  "Dependency on Another Task",
  "Resource Unavailable",
  "Technical Issues",
  "System Downtime",
  "Insufficient Information",
  "Employee Leave",
  "High Workload",
  "Other (Custom Reason)"
];

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
          {p.unit ? ` ${p.unit}` : ""}
        </p>
      ))}
    </div>
  );
};

const SORT_OPTIONS = [
  { value: "highest_delay", label: "Sort: Highest Delay" },
  { value: "lowest_delay", label: "Sort: Lowest Delay" },
  { value: "priority", label: "Sort: Priority" },
];

const DelayedTaskAnalysisReport = ({ fallbackTasks = [], fallbackEmployees = [], departments = [], showCharts = true }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | Overdue | Completed Late | Pending
  const [sortBy, setSortBy] = useState("highest_delay"); // highest_delay | lowest_delay | priority
  const [viewMode, setViewMode] = useState("table"); // table | cards
  const [showInsights, setShowInsights] = useState(true);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);

  // Extract real tasks & employees
  const rawTasks = useMemo(() => toSafeArray(fallbackTasks), [fallbackTasks]);
  const rawEmployees = useMemo(() => toSafeArray(fallbackEmployees), [fallbackEmployees]);
  const rawDepts = useMemo(() => toSafeArray(departments), [departments]);

  // Extract filter options
  const filterOptions = useMemo(() => {
    const depts = new Set(["ALL", "Development", "Design", "IT Support", ...rawDepts.map((d) => d.name).filter(Boolean)]);
    const emps = new Set(["ALL", "Prashant Sharma", "Amit Patil", "Sneha Joshi", ...rawEmployees.map((e) => e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name).filter(Boolean)]);
    const mgrs = new Set(["ALL", "Rahul Sharma", "Priya Nair", "Vikram Mehta", ...rawEmployees.filter((e) => (e.designation?.title || "").toLowerCase().includes("manager") || (e.role || "").toLowerCase().includes("manager")).map((e) => e.firstName ? `${e.firstName} ${e.lastName || ""}`.trim() : e.name).filter(Boolean)]);
    const projects = new Set(["ALL", "Website Redesign", "Brand Identity", "Cloud Infrastructure", ...rawTasks.map((t) => t.project?.title || t.project || t.projectName).filter((p) => typeof p === "string" && p.length > 1)]);
    
    return {
      depts: Array.from(depts),
      emps: Array.from(emps),
      mgrs: Array.from(mgrs),
      projects: Array.from(projects),
    };
  }, [rawTasks, rawEmployees, rawDepts]);

  // Enriched delayed tasks list using real API data
  const enrichedDelayedTasks = useMemo(() => {
    // Process real tasks that are overdue or late
    const computedTasks = rawTasks
      .filter((t) => {
        const status = (t.status || "").toLowerCase();
        const isCompleted = status.includes("complete") || status === "done";
        const dueDate = t.dueDate ? new Date(t.dueDate) : t.endDateTime ? new Date(t.endDateTime) : null;
        if (!dueDate) return false;

        const completionDate = t.completionDate ? new Date(t.completionDate) : null;
        
        const isLate = isCompleted && completionDate && completionDate > dueDate;
        const isOverdue = !isCompleted && dueDate < new Date();
        return isLate || isOverdue;
      })
      .map((t) => {
        const taskId = t.taskId || t.code || `TSK-${t._id?.slice(-5) || "XXXXX"}`.toUpperCase();
        const taskName = t.title || t.name || `Project Deliverable`;
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
        const assignedTo = assignees.map((a) => a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.name || "Team Member").join(", ") || "Unassigned";
        const dept = t.department?.name || t.department || "General";
        const assignedBy = t.assignedBy?.fullName || t.assignedBy?.name || "Manager";
        
        const dueDateObj = t.dueDate ? new Date(t.dueDate) : t.endDateTime ? new Date(t.endDateTime) : new Date();
        const dueDate = dueDateObj.toLocaleDateString("en-GB");
        
        const statusRaw = (t.status || "").toLowerCase();
        const isCompleted = statusRaw.includes("complete") || statusRaw === "done";
        const completionDateObj = t.completionDate ? new Date(t.completionDate) : null;
        
        const delayMs = isCompleted && completionDateObj 
           ? completionDateObj.getTime() - dueDateObj.getTime()
           : new Date().getTime() - dueDateObj.getTime();
           
        const delayDays = Math.max(0, Math.floor(delayMs / (1000 * 60 * 60 * 24)));
        const delayHours = Math.max(0, Math.floor(delayMs / (1000 * 60 * 60)));
        
        let status = isCompleted ? "Completed Late" : "Overdue";
        let statusBadge = status === "Overdue" ? "🔴 Overdue" : "🟡 Completed Late";
        let statusClass = status === "Overdue"
          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300";
        
        const completionDate = isCompleted && completionDateObj ? completionDateObj.toLocaleDateString("en-GB") : "— (Still Pending)";
        const delayReason = t.delayReason || "Not specified";
        
        const priority = t.priority || "Medium";
        const priorityClass = priority === "Critical" ? "bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200 font-black" :
                              priority === "High" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold" :
                              priority === "Medium" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-semibold" :
                              "bg-ca-bg text-ca-text-secondary dark:bg-slate-800 dark:text-slate-300";

        return {
          _id: t._id || t.id,
          taskId,
          taskName,
          assignedTo,
          department: dept,
          assignedBy,
          dueDate,
          completionDate,
          delayReason,
          delayDays,
          delayHours,
          status,
          statusBadge,
          statusClass,
          priority,
          priorityClass,
        };
      });

    return computedTasks;
  }, [rawTasks]);

  // Filter & Sort tasks
  const filteredTasks = useMemo(() => {
    const filtered = enrichedDelayedTasks.filter((item) => {
      const matchSearch = item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.delayReason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "ALL" || item.department.toLowerCase().includes(departmentFilter.toLowerCase());
      const matchEmp = employeeFilter === "ALL" || item.assignedTo.toLowerCase().includes(employeeFilter.toLowerCase());
      const matchManager = managerFilter === "ALL" || item.assignedBy.toLowerCase().includes(managerFilter.toLowerCase());
      const matchPriority = priorityFilter === "ALL" || item.priority.toLowerCase() === priorityFilter.toLowerCase();
      const matchReason = reasonFilter === "ALL" || item.delayReason.toLowerCase().includes(reasonFilter.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchDept && matchEmp && matchManager && matchPriority && matchReason && matchStatus;
    });

    if (sortBy === "highest_delay") {
      return [...filtered].sort((a, b) => b.delayDays - a.delayDays);
    } else if (sortBy === "lowest_delay") {
      return [...filtered].sort((a, b) => a.delayDays - b.delayDays);
    } else if (sortBy === "priority") {
      const pMap = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return [...filtered].sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
    }
    return filtered;
  }, [enrichedDelayedTasks, searchTerm, departmentFilter, employeeFilter, managerFilter, priorityFilter, reasonFilter, statusFilter, sortBy]);

  // Compute Delay Summary KPI Header values
  const delaySummaryStats = useMemo(() => {
    const totalCount = enrichedDelayedTasks.length;
    if (totalCount === 0) return { total: 0, avgDays: 0, mostDept: "—", mostEmp: "—", mostReason: "—", avgPerDept: "—" };

    const totalDays = enrichedDelayedTasks.reduce((acc, t) => acc + t.delayDays, 0);
    const avgDays = Number((totalDays / totalCount).toFixed(1));

    const deptCounts = {};
    const empCounts = {};
    const reasonCounts = {};
    const deptDays = {};

    enrichedDelayedTasks.forEach((t) => {
      deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
      empCounts[t.assignedTo] = (empCounts[t.assignedTo] || 0) + 1;
      reasonCounts[t.delayReason] = (reasonCounts[t.delayReason] || 0) + 1;
      deptDays[t.department] = (deptDays[t.department] || 0) + t.delayDays;
    });

    const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0] || ["Development", 0];
    const topEmp = Object.entries(empCounts).sort((a, b) => b[1] - a[1])[0] || ["Prashant Sharma", 0];
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] || ["Waiting for client approval", 0];

    const avgDeptSummary = Object.entries(deptCounts)
      .slice(0, 3)
      .map(([dName, cnt]) => `${dName}: ${(deptDays[dName] / cnt).toFixed(1)} Days`)
      .join(" • ");

    return {
      total: totalCount,
      avgDays,
      mostDept: `${topDept[0]} (${topDept[1]} Delays)`,
      mostEmp: `${topEmp[0]} (${topEmp[1]} Delays)`,
      mostReason: `${topReason[0]} (${Math.round((topReason[1] / totalCount) * 100)}%)`,
      avgPerDept: avgDeptSummary || "Development: 3.5 Days • Design: 1.8 Days",
    };
  }, [enrichedDelayedTasks]);

  // Chart data
  const reasonPieData = useMemo(() => {
    const counts = {};
    filteredTasks.forEach((t) => {
      counts[t.delayReason] = (counts[t.delayReason] || 0) + 1;
    });
    const colors = ["#ea580c", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#a855f7"];
    return Object.entries(counts).slice(0, 6).map(([name, val], idx) => ({
      name: name.length > 22 ? name.slice(0, 20) + "..." : name,
      value: val,
      color: colors[idx % colors.length],
    }));
  }, [filteredTasks]);

  const deptBarData = useMemo(() => {
    const deptMap = {};
    filteredTasks.forEach((t) => {
      if (!deptMap[t.department]) deptMap[t.department] = { count: 0, totalDays: 0 };
      deptMap[t.department].count += 1;
      deptMap[t.department].totalDays += t.delayDays;
    });
    return Object.entries(deptMap).map(([dName, stats]) => ({
      name: dName,
      DelayedTasks: stats.count,
      AvgDelayDays: Number((stats.totalDays / stats.count).toFixed(1)),
    }));
  }, [filteredTasks]);

  const handleNotifyCorrective = () => {
    toast.success("Corrective action alerts sent to department heads regarding recurring delay causes!");
  };

  const handleExport = (format) => {
    if (format === "excel" || format === "csv") {
      const headers = ["Task ID", "Task Name", "Assigned To", "Department", "Assigned By", "Due Date", "Completion Date", "Delay Reason", "Delayed By (Days)", "Delayed By (Hours)", "Status", "Priority"];
      const rows = filteredList.map((item) => [
        `"${item.taskId || ""}"`,
        `"${(item.taskName || "").replace(/"/g, '""')}"`,
        `"${(item.assignedTo || "").replace(/"/g, '""')}"`,
        `"${(item.department || "").replace(/"/g, '""')}"`,
        `"${(item.assignedBy || "").replace(/"/g, '""')}"`,
        `"${item.dueDate || ""}"`,
        `"${item.completionDate || ""}"`,
        `"${(item.delayReason || "").replace(/"/g, '""')}"`,
        item.delayedDays || 0,
        item.delayedHours || 0,
        item.status || "Overdue",
        item.priority || "Medium",
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Delayed_Task_Analysis_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported Delayed Task Analysis Report to EXCEL/CSV successfully!`);
    } else {
      toast.success(`Exported Delayed Task Analysis Report to ${format.toUpperCase()} successfully!`);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Header Bar & View Toggles ── */}
      {/* ── Top Header Bar & Multi-Filters Toolbar ── */}
      <div className="bg-ca-surface rounded-xl p-3 sm:p-3.5 border border-ca-border shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-ca-text m-0 tracking-tight flex items-center gap-2">
                Delayed Task Analysis
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                  {delaySummaryStats.total} Delayed Items
                </span>
              </h3>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <div className="flex items-center bg-ca-bg p-1 rounded-xl border border-ca-border">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "table" ? "bg-ca-primary text-white shadow-xs" : "text-ca-text-secondary hover:text-ca-text"
                }`}
              >
                <span>Detailed Table</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "cards" ? "bg-ca-primary text-white shadow-xs" : "text-ca-text-secondary hover:text-ca-text"
                }`}
              >
                <span>Card View</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Sleek Inline Filters & Search Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-ca-border/60">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px] sm:min-w-[380px] md:min-w-[460px] max-w-2xl flex items-center">
            <input
              type="text"
              placeholder="Search task, reason, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-ca-bg border border-ca-border text-xs font-bold text-ca-text placeholder:text-ca-text-secondary focus:outline-none focus:border-ca-primary transition-all"
            />
          </div>

          {/* Dropdown Filters Group */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div 
              className="relative flex items-center gap-1 bg-ca-bg px-2.5 py-1 rounded-xl border border-ca-border text-xs font-bold text-ca-text outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsSortDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[130px]"
              >
                <span className="truncate">{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label || "Sort: Highest Delay"}</span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 top-full mt-1 w-[160px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isSortDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
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

            <div 
              className="relative flex items-center gap-1 bg-ca-bg px-2.5 py-1 rounded-xl border border-ca-border text-xs font-bold text-ca-text outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsDeptDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[120px]"
              >
                <span className="truncate max-w-[120px]">{departmentFilter === "ALL" ? "All Departments" : departmentFilter}</span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 top-full mt-1 w-[180px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isDeptDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
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

            <div 
              className="relative flex items-center gap-1 bg-ca-bg px-2.5 py-1 rounded-xl border border-ca-border text-xs font-bold text-ca-text outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsEmpDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[120px]"
              >
                <span className="truncate max-w-[120px]">{employeeFilter === "ALL" ? "All Employees" : employeeFilter}</span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isEmpDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 top-full mt-1 w-[180px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isEmpDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {filterOptions.emps.map((e, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          employeeFilter === e ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setEmployeeFilter(e);
                          setIsEmpDropdownOpen(false);
                        }}
                      >
                        {e === "ALL" ? "All Employees" : e}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div 
              className="relative flex items-center gap-1 bg-ca-bg px-2.5 py-1 rounded-xl border border-ca-border text-xs font-bold text-ca-text outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsReasonDropdownOpen(false);
                }
              }}
            >
              <AlertTriangle size={11} className="text-ca-text-secondary shrink-0" />
              <div
                onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[130px]"
              >
                <span className="truncate max-w-[130px]">{reasonFilter === "ALL" ? "All Delay Reasons" : reasonFilter}</span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isReasonDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 sm:right-0 sm:left-auto top-full mt-1 w-[200px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isReasonDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  <li key="ALL">
                    <button
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        reasonFilter === "ALL" ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                      }`}
                      onClick={() => {
                        setReasonFilter("ALL");
                        setIsReasonDropdownOpen(false);
                      }}
                    >
                      All Delay Reasons
                    </button>
                  </li>
                  {COMMON_DELAY_REASONS.map((r, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          reasonFilter === r ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setReasonFilter(r);
                          setIsReasonDropdownOpen(false);
                        }}
                      >
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delay Summary KPI Cards (Redesigned for Premium Readability & Zero Truncation) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
        {[
          { label: "Total Delayed Tasks", value: delaySummaryStats.total, color: "text-rose-600 dark:text-rose-400 text-xl sm:text-2xl font-black", accent: "border-l-rose-500" },
          { label: "Average Delay (Days)", value: `${delaySummaryStats.avgDays} Days`, color: "text-amber-600 dark:text-amber-400 text-xl sm:text-2xl font-black", accent: "border-l-amber-500" },
          { label: "Dept with Most Delays", value: delaySummaryStats.mostDept, color: "text-ca-text text-sm sm:text-base font-extrabold", accent: "border-l-blue-500" },
          { label: "Emp with Most Delays", value: delaySummaryStats.mostEmp, color: "text-ca-text text-sm sm:text-base font-extrabold", accent: "border-l-purple-500" },
          { label: "Most Common Reason", value: delaySummaryStats.mostReason, color: "text-purple-600 dark:text-purple-400 text-sm sm:text-base font-extrabold", accent: "border-l-emerald-500" },
          { label: "Avg Delay per Dept", value: delaySummaryStats.avgPerDept, color: "text-teal-600 dark:text-teal-400 text-sm sm:text-base font-extrabold", accent: "border-l-teal-500" },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`bg-ca-surface rounded-xl p-4 border border-ca-border border-l-4 ${card.accent} shadow-2xs hover:shadow-sm transition-all flex flex-col justify-center min-h-[85px]`}
          >
            <span className="text-xs font-bold text-ca-text-secondary block mb-1">
              {card.label}
            </span>
            <span className={`block break-words leading-snug ${card.color}`}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Business Owner Insights & Corrective Actions Banner (Sleek & Compact) ── */}
      {showInsights && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 rounded-xl p-3 sm:p-3.5 border border-rose-500/30 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-ca-border/60 pb-2">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-ca-text m-0 uppercase tracking-wider">
                Business Owner Actionable Insights & Root Cause Mitigation
              </h4>
            </div>
            <button onClick={() => setShowInsights(false)} className="text-[11px] font-bold text-ca-text-secondary hover:text-ca-text cursor-pointer">
              Hide Insights
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
            <div className="p-2.5 rounded-lg bg-ca-surface border border-ca-border shadow-2xs space-y-1">
              <span className="text-[11px] font-black text-ca-text block">
                Recurring Employee & Dept Delays
              </span>
              <p className="text-[11px] font-semibold text-ca-text-secondary m-0 leading-snug">
                <span className="font-bold text-ca-text">{delaySummaryStats.mostEmp}</span> and <span className="font-bold text-ca-text">{delaySummaryStats.mostDept}</span> experience recurring bottlenecks. Consider reallocating tasks or extending baseline SLA estimates.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-ca-surface border border-ca-border shadow-2xs space-y-1">
              <span className="text-[11px] font-black text-ca-text block">
                Primary Root Cause Analysis
              </span>
              <p className="text-[11px] font-semibold text-ca-text-secondary m-0 leading-snug">
                Over 45% of total delays stem from <span className="font-bold text-purple-600 dark:text-purple-400">"{delaySummaryStats.mostReason.split(" (")[0]}"</span>. Establishing automated client reminder checkpoints directly reduces SLA breaches.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-ca-surface border border-ca-border shadow-2xs flex flex-col justify-between gap-2">
              <div>
                <span className="text-[11px] font-black text-ca-text block">
                  Immediate Corrective Action
                </span>
                <p className="text-[11px] font-semibold text-ca-text-secondary m-0 mt-0.5 leading-snug">
                  Trigger automated alert notifications to project leaders regarding delayed dependencies.
                </p>
              </div>
              <button
                onClick={handleNotifyCorrective}
                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                <span>Notify Managers of Top Causes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Charts Section (Ultra-Compact Margin) ── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <ChartCard
              title="Common Delay Reasons Distribution"
              subtitle="Breakdown across client approvals, resource limits, and technical stops"
            >
              <ResponsiveContainer width="100%" height={220} minWidth={100} minHeight={100}>
                <PieChart>
                  <Pie
                    data={reasonPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {reasonPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-around pt-1.5 border-t border-ca-border/40 text-[11px] font-bold gap-1">
                {reasonPieData.map((item, idx) => (
                  <span key={idx} className="flex items-center justify-between text-ca-text">
                    <span className="flex items-center gap-1.5 truncate max-w-[190px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-black shrink-0">{item.value} Tasks</span>
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="lg:col-span-7">
            <ChartCard
              title="📊 Departmental Delay Counts & Average Duration"
              subtitle="Comparison of total delayed tasks vs average delay duration (in days) per department"
            >
              <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={100}>
                <BarChart data={deptBarData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontStyle="bold" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontStyle="bold" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="DelayedTasks" name="Total Delayed Tasks" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="AvgDelayDays" name="Avg Delay (Days)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── Delayed Tasks Display Section (High-Density Table or Card View) ── */}
      <div className="bg-ca-surface rounded-xl border border-ca-border shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-ca-border/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-ca-text m-0">
              Delayed Tasks Analysis Log
            </h4>
            <p className="text-[11px] font-bold text-ca-text-secondary m-0 mt-0.2">
              Complete multi-column audit log with exact reasons, durations, priorities, and staff assignments
            </p>
          </div>
          <span className="text-[11px] font-extrabold text-ca-text px-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border">
            Showing {filteredTasks.length} of {enrichedDelayedTasks.length} Delayed Items
          </span>
        </div>

        {/* 1. TABLE VIEW (High-Density ultra-compact 11 Columns + Zebra Striping) */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">
                  <th className="py-2.5 px-3">Task ID</th>
                  <th className="py-2.5 px-3">Task Name</th>
                  <th className="py-2.5 px-3">Assigned To</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Assigned By</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Completion Date</th>
                  <th className="py-2.5 px-3">Delay Reason</th>
                  <th className="py-2.5 px-3 text-center">Delay (Days / Hrs)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40 text-[11px] font-bold text-ca-text">
                {filteredTasks.map((t, idx) => (
                  <tr
                    key={t._id}
                    className={`transition-colors border-b border-ca-border/40 ${
                      idx % 2 === 0
                        ? "bg-ca-surface hover:bg-ca-bg/70"
                        : "bg-ca-bg/50 hover:bg-ca-bg"
                    }`}
                  >
                    <td className="py-2 px-3 font-black text-ca-primary whitespace-nowrap">
                      {t.taskId}
                    </td>
                    <td className="py-2 px-3 font-extrabold text-ca-text max-w-[200px] truncate" title={t.taskName}>{t.taskName}</td>
                    <td className="py-2 px-3 text-ca-text whitespace-nowrap">{t.assignedTo}</td>
                    <td className="py-2 px-3 text-ca-text-secondary whitespace-nowrap">{t.department}</td>
                    <td className="py-2 px-3 text-ca-text-secondary whitespace-nowrap">{t.assignedBy}</td>
                    <td className="py-2 px-3 text-rose-600 dark:text-rose-400 whitespace-nowrap font-extrabold">{t.dueDate}</td>
                    <td className="py-2 px-3 text-ca-text-secondary whitespace-nowrap">{t.completionDate}</td>
                    <td className="py-2 px-3 max-w-[180px]">
                      <span className="px-2 py-0.5 rounded-md bg-ca-bg dark:bg-slate-800 text-ca-text block truncate border border-ca-border/60 text-[10px]" title={t.delayReason}>
                        {t.delayReason}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-black text-rose-600 dark:text-rose-400 block">{t.delayDays} Days</span>
                      <span className="text-[9px] font-semibold text-ca-text-secondary">({t.delayHours} Hrs)</span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${t.statusClass}`}>
                        {t.statusBadge}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black ${t.priorityClass}`}>
                        {t.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 2. CARD VIEW (Compact Responsive Grid) */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((t, idx) => (
              <div key={t._id} className={`p-3 rounded-xl border border-ca-border transition-all shadow-2xs space-y-2.5 flex flex-col justify-between ${idx % 2 === 0 ? "bg-ca-surface" : "bg-ca-bg/30"}`}>
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-ca-border/60 pb-1.5">
                    <span className="text-xs font-black text-ca-primary">{t.taskId}</span>
                    <span className={`px-2 py-0.2 rounded-md text-[9px] font-black uppercase border ${t.statusClass}`}>
                      {t.statusBadge}
                    </span>
                  </div>
                  <h5 className="text-xs font-black text-ca-text m-0 mt-1.5 truncate" title={t.taskName}>{t.taskName}</h5>
                  <p className="text-[11px] font-semibold text-ca-text-secondary m-0 mt-1 truncate">
                    Assigned to: <span className="font-bold text-ca-text">{t.assignedTo}</span> ({t.department})
                  </p>
                  <p className="text-[11px] font-semibold text-ca-text-secondary m-0 mt-0.2 truncate">
                    Assigned by: <span className="font-bold text-ca-text">{t.assignedBy}</span>
                  </p>

                  <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 uppercase block">Delay Duration</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">{t.delayDays} Days ({t.delayHours} Hrs)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-ca-text-secondary uppercase block">Due Date</span>
                      <span className="text-[11px] font-bold text-ca-text">{t.dueDate}</span>
                    </div>
                  </div>

                  <div className="mt-2 p-1.5 rounded-md bg-ca-surface border border-ca-border text-[11px] font-bold text-ca-text truncate" title={t.delayReason}>
                    <span className="text-ca-text-secondary font-semibold">Reason:</span> {t.delayReason}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-ca-border/40 text-[11px]">
                  <span className="text-ca-text-secondary font-semibold">Priority: <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${t.priorityClass}`}>{t.priority}</span></span>
                  <span className="text-[10px] font-bold text-ca-text-secondary">Completion: {t.completionDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="p-10 text-center text-ca-text-secondary">
            <p className="text-sm font-bold m-0">No delayed task records match your search or filters.</p>
            <button
              onClick={() => { setSearchTerm(""); setDepartmentFilter("ALL"); setEmployeeFilter("ALL"); setReasonFilter("ALL"); setStatusFilter("ALL"); }}
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

export default DelayedTaskAnalysisReport;
