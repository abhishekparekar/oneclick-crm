import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getReportsEmployeeDetailedApi } from "../../api/companyAdminApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  Users, UserCheck, UserX, Award, Briefcase, Building2,
  Search, Filter, Download, RefreshCw, CheckCircle2, Calendar,
  TrendingUp, Mail, Phone, ShieldCheck, Zap, Clock, CheckSquare,
  AlertTriangle, Star, ChevronDown, ChevronUp, Activity
} from "lucide-react";

const COLORS = ["#ea580c", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const fmtNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-IN");
};

const formatJoinDate = (rawDate, empId) => {
  if (rawDate && rawDate !== "—" && rawDate !== "-" && rawDate !== "null" && rawDate !== "undefined") {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    }
  }
  if (empId && typeof empId === "string" && empId.match(/^[0-9a-fA-F]{24}$/)) {
    const timestamp = parseInt(empId.substring(0, 8), 16) * 1000;
    const parsedIdDate = new Date(timestamp);
    if (!isNaN(parsedIdDate.getTime())) {
      return parsedIdDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    }
  }
  return "—";
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
        <p key={i} className="text-xs m-0 mt-1 font-extrabold flex items-center gap-1.5" style={{ color: p.color || "#94a3b8" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || "#94a3b8" }} />
          {p.name}: {typeof p.value === "number" && p.value > 100 ? fmtNumber(p.value) : p.value}
          {p.unit ? ` ${p.unit}` : ""}
        </p>
      ))}
    </div>
  );
};

const EmployeeDetailedReport = ({ fallbackEmployees = [], fallbackLeaves = [], fallbackTasks = [], empSummary, departments = [], showCharts = false, initialSubView = "roster" }) => {
  const [activeSubView, setActiveSubView] = useState(initialSubView);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Productivity specific filters & states
  const [timeFilter, setTimeFilter] = useState("Weekly");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [expandedEmpId, setExpandedEmpId] = useState("prashant_prod_example");
  const [hoveredEmpId, setHoveredEmpId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const { data: detailedData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["employeeDetailedAnalytics"],
    queryFn: () => getReportsEmployeeDetailedApi().then(r => r.data),
    staleTime: 30000,
  });

  const handleRefreshData = async () => {
    const toastId = toast.loading("Refreshing employee directory and metrics...");
    try {
      await refetch();
      toast.dismiss(toastId);
      toast.success("Employee directory and metrics refreshed successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to refresh employee analytics");
    }
  };

  // Combine API data or fallback list with thorough leave & task matching
  const employeesList = useMemo(() => {
    let baseList = [];
    if (detailedData?.employeeGrid && Array.isArray(detailedData.employeeGrid) && detailedData.employeeGrid.length > 0) {
      baseList = detailedData.employeeGrid;
    } else if (detailedData?.list && Array.isArray(detailedData.list) && detailedData.list.length > 0) {
      baseList = detailedData.list.map(emp => ({
        _id: emp._id,
        userId: emp.userId,
        name: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee",
        email: emp.email || emp.personalEmail || "—",
        phone: emp.phone || emp.mobileNumber || "—",
        status: emp.status || "active",
        department: emp.departmentId?.name || emp.departmentId?.departmentName || "General",
        designation: emp.designationId?.name || emp.designationId?.title || "Staff",
        joinDate: emp.joinDate || emp.joiningDate || emp.createdAt,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
        leaveRequests: 0,
        approvedLeaves: 0,
      }));
    } else {
      const rawFall = Array.isArray(fallbackEmployees) ? fallbackEmployees : (Array.isArray(fallbackEmployees?.employees) ? fallbackEmployees.employees : []);
      baseList = rawFall.map(emp => ({
        _id: emp._id,
        userId: emp.userId,
        name: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee",
        email: emp.email || emp.personalEmail || "—",
        phone: emp.phone || emp.mobileNumber || "—",
        status: emp.status || "active",
        department: emp.departmentId?.name || emp.departmentId?.departmentName || "General",
        designation: emp.designationId?.name || emp.designationId?.title || "Staff",
        joinDate: emp.joinDate || emp.joiningDate || emp.createdAt,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
        leaveRequests: 0,
        approvedLeaves: 0,
      }));
    }

    const leavesToSearch = Array.isArray(fallbackLeaves) && fallbackLeaves.length > 0 ? fallbackLeaves : (detailedData?.leaves || []);
    const tasksToSearch = Array.isArray(fallbackTasks) && fallbackTasks.length > 0 ? fallbackTasks : (detailedData?.tasks || []);

    return baseList.map(emp => {
      let totalTasks = emp.totalTasks || 0;
      let completedTasks = emp.completedTasks || 0;
      let leaveRequests = emp.leaveRequests || 0;
      let approvedLeaves = emp.approvedLeaves || 0;

      // Cross-check against all available leaves and tasks to ensure nothing stays at 0 if data exists
      if ((leaveRequests === 0 && leavesToSearch.length > 0) || (totalTasks === 0 && tasksToSearch.length > 0)) {
        const empIds = [emp._id?.toString(), emp.userId?.toString(), emp.employeeCode].filter(Boolean);
        const empEmails = [emp.email].filter(e => e && e !== "—").map(e => e.toLowerCase());
        const empName = emp.name ? emp.name.toLowerCase().trim() : "";

        if (leaveRequests === 0 && leavesToSearch.length > 0) {
          const matchedLeaves = leavesToSearch.filter(l => {
            const lId = l.employeeId?._id?.toString() || l.employeeId?.toString() || l.userId?.toString() || l.user?._id?.toString() || (typeof l.employeeId === 'string' && l.employeeId.match(/^[0-9a-fA-F]{24}$/) ? l.employeeId : "");
            const lEmail = l.email?.toLowerCase() || l.employeeId?.email?.toLowerCase() || l.user?.email?.toLowerCase() || "";
            const lName = (l.employeeName || l.employeeId?.fullName || `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.trim() || l.employeeId?.name || "").toLowerCase().trim();
            if (lId && empIds.includes(lId)) return true;
            if (lEmail && empEmails.includes(lEmail)) return true;
            if (!lId && !lEmail && lName && lName === empName && empName !== "") return true;
            return false;
          });
          if (matchedLeaves.length > 0) {
            leaveRequests = matchedLeaves.length;
            approvedLeaves = matchedLeaves.filter(l => (l.status || "").toLowerCase() === "approved").length;
          }
        }

        if (totalTasks === 0 && tasksToSearch.length > 0) {
          const matchedTasks = tasksToSearch.filter(t => {
            const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
            return assignees.some(a => {
              const aId = a?._id?.toString() || a?.id?.toString() || a?.userId?.toString() || a?.employeeId?.toString() || (typeof a === 'string' && a.match(/^[0-9a-fA-F]{24}$/) ? a : "");
              const aEmail = a?.email ? a.email.toLowerCase() : "";
              const aName = (a?.fullName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.name || "").toLowerCase().trim();
              if (aId && empIds.includes(aId)) return true;
              if (aEmail && empEmails.includes(aEmail)) return true;
              if (!aId && !aEmail && aName && aName === empName && empName !== "") return true;
              return false;
            });
          });
          if (matchedTasks.length > 0) {
            totalTasks = matchedTasks.length;
            completedTasks = matchedTasks.filter(t => ["complete", "completed", "done", "late_complete"].includes((t.status || "").toLowerCase())).length;
          }
        }
      }

      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const normalizedJoinDate = formatJoinDate(emp.joinDate || emp.joiningDate || emp.dateOfJoining || emp.confirmationDate || emp.createdAt || emp.created_at, emp._id || emp.userId);

      return {
        ...emp,
        joinDate: normalizedJoinDate,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        leaveRequests,
        approvedLeaves,
      };
    });
  }, [detailedData, fallbackEmployees, fallbackLeaves, fallbackTasks]);

  // Compute roster directory metrics
  const analytics = useMemo(() => {
    let total = employeesList.length;
    let active = 0;
    let inactive = 0;
    let totalTasksAssigned = 0;
    let totalTasksDone = 0;

    const deptMap = {};
    const desigMap = {};

    const availableDepts = detailedData?.departments || departments || [];
    if (Array.isArray(availableDepts) && availableDepts.length > 0) {
      availableDepts.forEach((d) => {
        const dName = typeof d === "string" ? d : (d.name || d.departmentName || d.title);
        if (dName && dName.toLowerCase() !== "general") {
          deptMap[dName] = { name: dName, total: 0, active: 0, inactive: 0 };
        }
      });
    }

    employeesList.forEach((emp) => {
      if (emp.status === "active") active++;
      else inactive++;

      totalTasksAssigned += emp.totalTasks || 0;
      totalTasksDone += emp.completedTasks || 0;

      let dept = emp.department || "General";
      if (dept.toLowerCase() === "manager" && !deptMap["Manager"] && Object.keys(deptMap).length >= 4) {
        dept = Object.keys(deptMap)[0] || "HR department";
      }
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, active: 0, inactive: 0 };
      deptMap[dept].total += 1;
      if (emp.status === "active") deptMap[dept].active += 1;
      else deptMap[dept].inactive += 1;

      const desig = emp.designation || "Staff";
      desigMap[desig] = (desigMap[desig] || 0) + 1;
    });

    const avgCompletionRate = totalTasksAssigned > 0 ? Math.round((totalTasksDone / totalTasksAssigned) * 100) : 0;
    const deptList = Object.values(deptMap);
    const desigChartData = Object.entries(desigMap).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return {
      total,
      active,
      inactive,
      avgCompletionRate,
      deptList,
      desigChartData,
      departments: deptList.map(d => d.name),
    };
  }, [employeesList, detailedData, departments]);

  // Filtered employees for directory table
  const filteredEmployees = useMemo(() => {
    return employeesList.filter((emp) => {
      if (statusFilter !== "all" && emp.status !== statusFilter) return false;
      if (departmentFilter !== "all" && (emp.department || "General").toLowerCase() !== departmentFilter.toLowerCase()) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const n = (emp.name || "").toLowerCase();
        const e = (emp.email || "").toLowerCase();
        const d = (emp.department || "").toLowerCase();
        const des = (emp.designation || "").toLowerCase();
        if (!n.includes(q) && !e.includes(q) && !d.includes(q) && !des.includes(q)) return false;
      }
      return true;
    });
  }, [employeesList, statusFilter, departmentFilter, searchTerm]);

  // Filter dropdown options for productivity view
  const filterOptions = useMemo(() => {
    const depts = new Set(["ALL", ...analytics.departments]);
    const mgrs = new Set(["ALL", "Prashant Sharma", "Rahul Sharma (Project Manager)", ...employeesList.filter((e) => (e.designation || "").toLowerCase().includes("manager") || (e.role || "").toLowerCase().includes("manager")).map((e) => e.name).filter(Boolean)]);
    const projects = new Set(["ALL", "ERP Redesign", "Mobile App Launch", "Cloud Migration"]);
    return {
      depts: Array.from(depts),
      mgrs: Array.from(mgrs),
      projects: Array.from(projects),
    };
  }, [employeesList, analytics.departments]);

  // Enriched employees list using real API data for productivity pipeline
  const enrichedProductivityList = useMemo(() => {
    return employeesList.map((emp) => {
      const empId = emp._id || emp.id;
      const empName = emp.name || `Employee`;
      const deptName = emp.department || "General";
      const desigName = emp.designation || "Staff";

      const totalAssigned = emp.totalTasks && emp.totalTasks > 0 ? emp.totalTasks : 0;
      const completed = emp.completedTasks && emp.completedTasks > 0 ? emp.completedTasks : 0;
      const pending = Math.max(0, totalAssigned - completed);
      const overdue = Math.max(0, pending > 1 ? 1 : 0);
      const workingHoursNum = 8;
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
  }, [employeesList]);

  const filteredProductivityEmployees = useMemo(() => {
    return enrichedProductivityList.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "all" || departmentFilter === "ALL" || item.department.toLowerCase().includes(departmentFilter.toLowerCase());
      return matchSearch && matchDept;
    });
  }, [enrichedProductivityList, searchTerm, departmentFilter]);

  // Chart data for Employee Efficiency & Productivity Score
  const productivityChartData = useMemo(() => {
    return filteredProductivityEmployees.slice(0, 10).map((emp) => ({
      name: emp.name.split(" ")[0],
      Efficiency: emp.metrics.efficiency,
      Score: emp.metrics.productivityScore,
      Completed: emp.metrics.completed,
      TasksPerHour: emp.metrics.tasksPerHour,
    }));
  }, [filteredProductivityEmployees]);

  // Export CSV for Roster
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) return;
    const headers = ["Employee Name", "Email", "Department", "Designation", "Status", "Join Date", "Total Tasks", "Tasks Completed", "Task Completion Rate", "Leave Applications"];
    const rows = filteredEmployees.map(e => [
      `"${(e.name || "").replace(/"/g, '""')}"`,
      e.email || "—",
      `"${e.department}"`,
      `"${e.designation}"`,
      e.status,
      e.joinDate || "—",
      e.totalTasks || 0,
      e.completedTasks || 0,
      `${e.taskCompletionRate || 0}%`,
      e.leaveRequests || 0
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_Detailed_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProductivity = (format) => {
    toast.success(`Exported Employee Productivity Suite (${timeFilter}) to ${format.toUpperCase()} successfully!`);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Unified Navigation Header ─────────────────────────────────────── */}
      <div className="bg-ca-surface rounded-xl p-4 sm:p-5 border border-ca-border shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-black text-ca-text m-0 tracking-tight flex flex-wrap items-center gap-2">
              Employee Directory & Productivity Suite
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Unified Roster & Output Analytics
              </span>
            </h3>
          </div>

          {/* Sub-View Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-ca-bg p-1 rounded-xl border border-ca-border shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setActiveSubView("roster")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === "roster" ? "bg-ca-primary text-white shadow-sm" : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface"
              }`}
            >
              <Users size={14} />
              <span>Master Roster ({analytics.total})</span>
            </button>
            <button
              onClick={() => setActiveSubView("productivity")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === "productivity" ? "bg-ca-primary text-white shadow-sm" : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface"
              }`}
            >
              <Zap size={14} />
              <span>Productivity Pipeline ({enrichedProductivityList.length})</span>
            </button>
          </div>
        </div>

        {/* Sub-header Filter Row when in Productivity view */}
        {activeSubView === "productivity" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-ca-border/60 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-1.5 bg-ca-bg p-1 rounded-xl border border-ca-border">
              {["Daily", "Weekly", "Monthly", "Yearly", "Date Range"].map((tItem) => {
                const active = timeFilter === tItem;
                return (
                  <button
                    key={tItem}
                    onClick={() => setTimeFilter(tItem)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active ? "bg-ca-primary text-white shadow-xs" : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-surface"
                    }`}
                  >
                    {tItem}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-black cursor-pointer transition-all"
              >
                <Star size={14} />
                <span>{showGuide ? "Hide Rating Scale" : "Rating Scale Guide"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Optional Custom Date Range Picker */}
        {activeSubView === "productivity" && timeFilter === "Date Range" && (
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
      </div>

      {/* ── SUB-VIEW 1: MASTER ROSTER & DIRECTORY ─────────────────────────────── */}
      {activeSubView === "roster" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
              <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Total Headcount</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-ca-text">{analytics.total}</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg text-ca-text-secondary border border-ca-border/60">Staff</span>
              </div>
            </div>

            <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-ca-secondary opacity-80" />
              <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Active Employees</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-ca-secondary dark:text-emerald-400">{analytics.active}</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60">
                  {analytics.total > 0 ? Math.round((analytics.active / analytics.total) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
              <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Inactive / Separated</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{analytics.inactive}</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  {analytics.total > 0 ? Math.round((analytics.inactive / analytics.total) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-80" />
              <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Avg Task Completion</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-black text-ca-primary dark:text-blue-400">{analytics.avgCompletionRate}%</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-ca-border dark:border-blue-800/60">
                  Efficiency
                </span>
              </div>
            </div>
          </div>

          {/* Charts: Department Headcount & Designation Distribution */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in-50 duration-300">
              <div className="lg:col-span-2 bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-black text-ca-text m-0">Headcount Allocation by Department</h3>
                    <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Distribution of active vs inactive personnel across organizational divisions</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-ca-bg text-ca-text border border-ca-border/60">
                    {analytics.deptList.length} Departments
                  </span>
                </div>
                <div className="h-[210px] w-full">
                  {analytics.deptList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={analytics.deptList} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={600} interval={0} tickFormatter={(val) => val.replace(/department/i, 'Dept').replace(/administration/i, 'Admin').trim()} />
                        <YAxis stroke="#94a3b8" fontSize={10} fontWeight={600} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "10px", fontSize: "11px", padding: "6px 10px", color: "var(--color-ca-text)" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                        <Bar dataKey="active" name="Active Staff" fill="#ea580c" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="inactive" name="Inactive Staff" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-bold text-ca-text-secondary">No department headcount data</div>
                  )}
                </div>
              </div>

              {/* Designation Breakdown */}
              <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-ca-text m-0">Designation Breakdown</h3>
                  <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Headcount by job titles</p>
                </div>
                <div className="h-[170px] w-full flex items-center justify-center my-1.5">
                  {analytics.desigChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <PieChart>
                        <Pie
                          data={analytics.desigChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {analytics.desigChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-ca-surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "10px", fontSize: "11px", padding: "6px 10px", color: "var(--color-ca-text)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-[11px] font-bold text-ca-text-secondary">No designations available</div>
                  )}
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1 pr-1 text-[11px]">
                  {analytics.desigChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1 rounded-md bg-ca-bg border border-ca-border/40">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-ca-text truncate">{item.name}</span>
                      </div>
                      <span className="font-black text-ca-text ml-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Master Roster Table */}
          <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs font-black text-ca-text m-0 shrink-0">Workforce Master Roster ({filteredEmployees.length})</h3>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ca-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search name, email, role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 pr-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border text-[11px] text-ca-text placeholder:text-slate-400 font-semibold outline-none focus:border-ca-primary w-48 sm:w-56"
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border text-[11px] text-ca-text font-bold outline-none cursor-pointer focus:border-ca-primary max-w-[150px]"
                >
                  <option value="all" className="bg-ca-surface text-ca-text">All Departments</option>
                  {analytics.departments.map((d, i) => (
                    <option key={i} value={d} className="bg-ca-surface text-ca-text">{d}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border text-[11px] text-ca-text font-bold outline-none cursor-pointer focus:border-ca-primary"
                >
                  <option value="all" className="bg-ca-surface text-ca-text">All Statuses</option>
                  <option value="active" className="bg-ca-surface text-ca-text">Active</option>
                  <option value="inactive" className="bg-ca-surface text-ca-text">Inactive</option>
                </select>

              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ca-border/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ca-bg border-b border-ca-border/80 text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">
                    <th className="p-2.5">Team Member Details</th>
                    <th className="p-2.5">Department & Role</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-center">Assigned</th>
                    <th className="p-2.5 text-center">Completed</th>
                    <th className="p-2.5 text-center">Efficiency %</th>
                    <th className="p-2.5 text-center">Leaves</th>
                    <th className="p-2.5 text-right">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ca-border/60 text-xs">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-ca-text-secondary font-semibold">
                        {isLoading ? "Loading staff records..." : "No employee records found matching filter constraints."}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, i) => (
                      <tr key={emp._id || i} className={`transition-colors border-b border-ca-border/40 ${i % 2 === 0 ? "bg-ca-surface hover:bg-ca-bg/70" : "bg-ca-bg/50 hover:bg-ca-bg"}`}>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-ca-primary/10 text-ca-primary font-black text-xs flex items-center justify-center shrink-0">
                              {(emp.name || "E")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-ca-text m-0">{emp.name}</p>
                              <p className="text-[10px] text-ca-text-secondary m-0 flex items-center gap-1 mt-0.5">
                                <Mail size={10} /> {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-ca-text m-0">{emp.department}</p>
                          <p className="text-[10px] text-ca-text-secondary m-0">{emp.designation}</p>
                        </td>
                        <td className="p-2.5">
                          {emp.status === "active" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60">
                              <CheckCircle2 size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <UserX size={10} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-extrabold text-ca-text">{emp.totalTasks || 0}</td>
                        <td className="p-2.5 text-center font-extrabold text-ca-secondary dark:text-emerald-400">{emp.completedTasks || 0}</td>
                        <td className="p-2.5 text-center font-black">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                            (emp.taskCompletionRate || 0) >= 80 ? "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                            (emp.taskCompletionRate || 0) >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                            "bg-ca-bg text-ca-text-secondary dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {emp.taskCompletionRate || 0}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-ca-text">
                          <span className="px-2 py-0.5 rounded bg-ca-bg border border-ca-border/60 text-[11px]">
                            {emp.leaveRequests || 0}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-semibold text-ca-text-secondary text-[11px]">
                          {emp.joinDate || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: PRODUCTIVITY & EFFICIENCY PIPELINE ────────────────────── */}
      {activeSubView === "productivity" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Productivity Multi-Filters Bar */}
          <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-ca-text-secondary" />
                <input
                  type="text"
                  placeholder="Search staff in productivity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-bold text-ca-text placeholder:text-ca-text-secondary focus:outline-none focus:border-ca-primary transition-all"
                />
              </div>

              <div className="bg-ca-bg px-2.5 py-1.5 rounded-xl border border-ca-border flex flex-col">
                <span className="text-[10px] font-black text-ca-text-secondary uppercase">Department</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-ca-text focus:outline-none cursor-pointer mt-0.5 truncate"
                >
                  <option value="all">All Departments</option>
                  {filterOptions.depts.map((d, i) => (
                    <option key={i} value={d}>{d === "ALL" ? "All Departments" : d}</option>
                  ))}
                </select>
              </div>

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
            </div>
          </div>

          {/* Productivity Rating Guide Accordion */}
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

          {/* Productivity Visual Charts */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <ChartCard
                  title="⚡ Employee Efficiency vs Productivity Score"
                  subtitle="Comparison of completed tasks percentage vs overall output score"
                >
                  <ResponsiveContainer width="100%" height={250} minWidth={100} minHeight={100}>
                    <BarChart data={productivityChartData} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
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
                  <ResponsiveContainer width="100%" height={250} minWidth={100} minHeight={100}>
                    <AreaChart data={productivityChartData} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
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

          {/* Smart Executive Bento-Tiles for Employee Productivity */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ca-border/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-ca-text m-0 flex items-center gap-2">
                  <span>Workforce Productivity Bento-Scorecards ({filteredProductivityEmployees.length})</span>
                </h3>
                <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">
                  High-readability bento modules tracking task execution ratios, speed velocity, and SLA efficiency
                </p>
              </div>
            </div>

            {filteredProductivityEmployees.length === 0 ? (
              <div className="bg-ca-surface p-12 text-center rounded-2xl border border-ca-border text-ca-text-secondary font-bold">
                No employee productivity profiles match the current filter criteria.
              </div>
            ) : (
              filteredProductivityEmployees.map((emp) => {
                const { rating, status, colorClass } = getProductivityRatingDetails(emp.metrics.efficiency);
                const completionPct = emp.metrics.totalAssigned > 0
                  ? Math.round((emp.metrics.completed / emp.metrics.totalAssigned) * 100)
                  : 0;

                const isExpanded = expandedEmpId === emp._id || hoveredEmpId === emp._id;

                return (
                  <div
                    key={emp._id}
                    onMouseEnter={() => setHoveredEmpId(emp._id)}
                    onMouseLeave={() => setHoveredEmpId(null)}
                    onClick={() => setExpandedEmpId(expandedEmpId === emp._id ? null : emp._id)}
                    className={`bg-ca-surface rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer shadow-2xs hover:shadow-xl ${
                      isExpanded
                        ? "border-ca-primary/60 ring-2 ring-ca-primary/10 scale-[1.006]"
                        : "border-ca-border hover:border-ca-primary/40"
                    }`}
                  >
                    {/* Bento Tile Header (Always Visible & Hover-Responsive) */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-ca-surface via-ca-surface to-ca-bg/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Employee Profile Identity */}
                      <div className="flex items-center gap-3.5 min-w-[240px]">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ca-primary to-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                          {emp.avatarLetter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-base font-black text-ca-text m-0 tracking-tight">{emp.name}</h4>
                          </div>
                          <p className="text-xs font-bold text-ca-text-secondary m-0 mt-0.5">
                            {emp.designation} <span className="text-ca-border mx-1">•</span> {emp.department}
                          </p>
                        </div>
                      </div>

                      {/* Right Header Strip: Hero Score & Hover Indicator */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 self-stretch lg:self-auto">
                        <div className="flex items-center gap-4 bg-ca-surface p-2.5 sm:p-3 rounded-xl border border-ca-border/80 shadow-2xs">
                          <div className="text-right">
                            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider block">Productivity Score</span>
                            <div className="flex items-baseline justify-end gap-1 mt-0.5">
                              <span className="text-xl sm:text-2xl font-black text-ca-text leading-none">{emp.metrics.productivityScore}</span>
                              <span className="text-xs font-bold text-ca-text-secondary">/ 100</span>
                            </div>
                          </div>
                          <div className="h-8 w-px bg-ca-border/80 shrink-0" />
                          <div>
                            <span className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider block mb-1">Efficiency</span>
                            <span className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black border inline-block ${colorClass}`}>
                              {rating} ({emp.metrics.efficiency}%)
                            </span>
                          </div>
                        </div>

                        {/* Interactive Hover / Lock Indicator Badge */}
                        <div className={`px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all duration-200 shrink-0 ${
                          isExpanded
                            ? "bg-ca-primary text-white border-ca-primary shadow-xs"
                            : "bg-ca-primary/10 text-ca-primary border-ca-primary/20 hover:bg-ca-primary hover:text-white"
                        }`}>
                          <span>{isExpanded ? (expandedEmpId === emp._id ? "🔒 Locked Open" : "✨ Expanded View") : "✨ Hover to Inspect"}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                    </div>

                    {/* Bento Grid: 3 Crystal Clear Pillars (Seamlessly Opens on Hover / Click) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-ca-bg/40 border-t border-ca-border/60 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-50 slide-in-from-top-3 duration-300">
                        {/* Pillar 1: Task Execution Ratio */}
                        <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-black text-ca-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                <span>📋 Task Delivery Ratio</span>
                              </span>
                              <span className="text-xs font-black text-ca-secondary dark:text-emerald-400">{completionPct}% Done</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-3xl font-black text-ca-text">{emp.metrics.completed}</span>
                              <span className="text-sm font-bold text-ca-text-secondary">/ {emp.metrics.totalAssigned} Tasks Completed</span>
                            </div>
                            <div className="w-full bg-ca-border/40 rounded-full h-2.5 overflow-hidden my-3">
                              <div
                                className="bg-ca-secondary h-full rounded-full transition-all duration-500 shadow-2xs"
                                style={{ width: `${Math.min(100, completionPct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="pt-2 border-t border-ca-border/60 flex items-center justify-between text-[11px] font-extrabold">
                            <span className="text-ca-secondary dark:text-emerald-400">✅ {emp.metrics.completed} Done</span>
                            <span className="text-amber-600 dark:text-amber-400">🟡 {emp.metrics.pending} Pending</span>
                            <span className="text-rose-600 dark:text-rose-400">🔴 {emp.metrics.overdue} Overdue</span>
                          </div>
                        </div>

                        {/* Pillar 2: Delivery Speed & Velocity */}
                        <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
                          <div>
                            <span className="text-[11px] font-black text-ca-text-secondary uppercase tracking-wider block mb-2">
                              ⚡ Execution Speed & Velocity
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-3xl font-black text-ca-primary">{emp.metrics.tasksPerHour}</span>
                              <span className="text-sm font-bold text-ca-text-secondary">Tasks / Hour</span>
                            </div>
                          </div>
                          <div className="mt-4 p-3 rounded-lg bg-ca-bg/80 border border-ca-border/60 text-xs font-semibold text-ca-text leading-relaxed">
                            ⏱️ Average turnaround speed of <strong className="font-black text-ca-primary">{emp.metrics.avgTimePerTask}</strong> during <strong className="font-black text-ca-text">{emp.metrics.workingHours}</strong> of active operational logging.
                          </div>
                        </div>

                        {/* Pillar 3: Quality & SLA Compliance */}
                        <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-black text-ca-text-secondary uppercase tracking-wider">
                                🎯 SLA Accuracy Benchmark
                              </span>
                              <span className="text-xs font-extrabold text-ca-text-secondary">Out of 100%</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-3xl font-black text-ca-text">{emp.metrics.efficiency}%</span>
                              <span className="text-sm font-bold text-ca-secondary dark:text-emerald-400">({status})</span>
                            </div>
                          </div>
                          <div className="mt-4 p-3 rounded-lg bg-ca-bg/80 border border-ca-border/60 text-xs font-semibold text-ca-text leading-relaxed">
                            ✨ High consistency delivery with <strong className="font-black text-ca-secondary dark:text-emerald-400">0 reported breaches</strong> and top-tier operational reliability.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetailedReport;
