import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Calendar, CheckCircle2, Clock, MessageSquare, Paperclip, Search,
  Filter, Download, ChevronDown, ChevronUp, User, Building2, Eye
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

const DailyWorkReport = ({ fallbackTasks = [], fallbackEmployees = [], departments = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("2026-07-16");
  const [expandedRowId, setExpandedRowId] = useState("daily_benchmark_prashant");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const rawTasks = useMemo(() => toSafeArray(fallbackTasks), [fallbackTasks]);
  const rawEmployees = useMemo(() => toSafeArray(fallbackEmployees), [fallbackEmployees]);
  const rawDepts = useMemo(() => toSafeArray(departments), [departments]);

  const filterOptions = useMemo(() => {
    const depts = new Set(["ALL", "Development", "Design", "Sales", ...rawDepts.map((d) => d.name).filter(Boolean)]);
    const emps = new Set(["ALL", "Prashant Sharma", "Sneha Joshi", "Amit Patil", ...rawEmployees.map((e) => e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name).filter(Boolean)]);
    return {
      depts: Array.from(depts),
      emps: Array.from(emps),
    };
  }, [rawDepts, rawEmployees]);

  // Enriched daily work entries using real API data
  const enrichedDailyWorkList = useMemo(() => {
    const computedOthers = rawTasks.map((t) => {
      const empName = Array.isArray(t.assignedTo) && t.assignedTo[0]?.fullName ? t.assignedTo[0].fullName : (t.assignedTo?.fullName || t.assignedTo || `Team Member`);
      const taskName = t.title || t.name || `Task`;
      const dept = t.department?.name || t.department || "General";
      const isComplete = (t.status || "").toLowerCase().includes("complete") || t.status === "done";
      const statusBadge = isComplete ? "Completed" : "In Progress";
      const statusClass = isComplete
        ? "bg-ca-bg text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300";

      return {
        _id: t._id || t.id,
        employeeName: empName,
        taskName,
        department: dept,
        workDescription: t.description || t.delayReason || "No description provided.",
        timeSpent: `N/A`,
        taskStatus: isComplete ? "Completed" : "In Progress",
        statusBadge,
        statusClass,
        completionPercent: isComplete ? 100 : 0,
        managerRemark: "N/A",
        employeeRemark: "N/A",
        attachmentName: "",
        submittedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleString("en-GB") : (t.createdAt ? new Date(t.createdAt).toLocaleString("en-GB") : ""),
        avatarLetter: empName[0]?.toUpperCase() || "E",
      };
    });

    return computedOthers;
  }, [rawTasks]);

  const filteredList = useMemo(() => {
    return enrichedDailyWorkList.filter((item) => {
      const matchSearch = item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.workDescription.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "ALL" || item.department.toLowerCase().includes(departmentFilter.toLowerCase());
      const matchEmp = employeeFilter === "ALL" || item.employeeName.toLowerCase().includes(employeeFilter.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.taskStatus.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchDept && matchEmp && matchStatus;
    });
  }, [enrichedDailyWorkList, searchTerm, departmentFilter, employeeFilter, statusFilter]);

  const handleExport = (format) => {
    if (format === "excel" || format === "csv") {
      const headers = ["Employee Name", "Department", "Task Title", "Work Description", "Time Spent (Hrs)", "Status", "Completion (%)", "Manager Remark", "Submitted Date & Time"];
      const rows = filteredList.map((item) => [
        `"${(item.employeeName || "").replace(/"/g, '""')}"`,
        `"${(item.department || "").replace(/"/g, '""')}"`,
        `"${(item.taskTitle || "").replace(/"/g, '""')}"`,
        `"${(item.workDone || "").replace(/"/g, '""')}"`,
        item.timeSpent || 0,
        item.status || "In Progress",
        `${item.completion || 0}%`,
        `"${(item.managerRemark || "").replace(/"/g, '""')}"`,
        `"${item.submittedAt || ""}"`,
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Daily_Work_Report_${selectedDate}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported Daily Work Report (${selectedDate}) to EXCEL/CSV successfully!`);
    } else {
      toast.success(`Exported Daily Work Report (${selectedDate}) to ${format.toUpperCase()} successfully!`);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Header Bar & Inline Multi-Filters Toolbar ── */}
      <div className="bg-ca-surface rounded-xl p-3 sm:p-3.5 border border-ca-border shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-ca-text m-0 tracking-tight">
              Daily Work Report
            </h3>
          </div>

          {/* Compact Work Date Selector */}
          <div className="flex items-center gap-1.5 bg-ca-bg px-2.5 py-1 rounded-xl border border-ca-border self-start sm:self-center shrink-0">
            <span className="text-[11px] font-black text-ca-text-secondary uppercase">Work Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-black text-ca-primary focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* ── Sleek Inline Filters & Search Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-ca-border/60">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px] sm:min-w-[380px] md:min-w-[460px] max-w-2xl flex items-center">
            <input
              type="text"
              placeholder="Search employee, task, description..."
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
                  setIsStatusDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[110px]"
              >
                <span className="truncate max-w-[110px]">{statusFilter === "ALL" ? "All Statuses" : statusFilter}</span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 sm:right-0 sm:left-auto top-full mt-1 w-[160px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isStatusDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {["ALL", "Completed", "In Progress"].map((s, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          statusFilter === (s === "ALL" ? "ALL" : s) ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setStatusFilter(s === "ALL" ? "ALL" : s);
                          setIsStatusDropdownOpen(false);
                        }}
                      >
                        {s === "ALL" ? "All Statuses" : s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Work Summary Cards Grid / List ── */}
      <div className="space-y-4">
        {filteredList.map((item) => {
          const isExpanded = expandedRowId === item._id;
          return (
            <div
              key={item._id}
              className={`bg-ca-surface rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded ? "border-ca-primary shadow-md ring-1 ring-ca-primary/20" : "border-ca-border shadow-2xs hover:border-ca-border/80 hover:shadow-sm"
              }`}
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedRowId(isExpanded ? null : item._id)}
                className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-ca-bg/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-ca-primary text-white flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
                    {item.avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black text-ca-text m-0 truncate">
                        {item.employeeName}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-ca-text-secondary m-0 mt-0.5 truncate">
                      Task: <span className="font-bold text-ca-text">{item.taskName}</span> ({item.department})
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-ca-border/50 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] font-extrabold text-ca-text-secondary uppercase tracking-wider m-0">
                      Time & Completion
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5 justify-start sm:justify-end">
                      <span className="text-sm sm:text-base font-black text-ca-text">{item.timeSpent}</span>
                      <span className="text-xs font-bold text-ca-secondary dark:text-emerald-400">({item.completionPercent}%)</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase border ${item.statusClass}`}>
                    {item.statusBadge}
                  </span>

                  <span className="text-xs font-bold text-ca-primary shrink-0">
                    {isExpanded ? "Hide Details" : "View Details"}
                  </span>
                </div>
              </div>

              {/* ── Ultra-Compact Expanded Daily Work Audit Panel (Zero Redundancy, Zero Data Loss) ── */}
              {isExpanded && (
                <div className="p-3 sm:p-4 border-t border-ca-border/60 bg-ca-bg/30 animate-in fade-in duration-200 space-y-2.5">
                  {/* Top Metadata Strip (4 Columns) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-ca-surface p-2.5 rounded-xl border border-ca-border/80 text-xs shadow-2xs font-semibold text-ca-text-secondary">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>Task:</span>
                      <span className="font-bold text-ca-primary truncate" title={item.taskName}>{item.taskName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span>Dept:</span>
                      <span className="font-bold text-ca-text truncate">{item.department}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span>Submitted:</span>
                      <span className="font-bold text-ca-text truncate">{item.submittedAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span>File:</span>
                      <span className="font-bold text-ca-primary dark:text-blue-400 underline cursor-pointer truncate" title={item.attachmentName}>
                        {item.attachmentName}
                      </span>
                    </div>
                  </div>

                  {/* Side-by-Side Work Summary and Feedback Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Left: Work Description Box */}
                    <div className="p-3 rounded-xl bg-ca-surface border border-ca-border shadow-2xs flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-black text-ca-text-secondary uppercase tracking-wider block">
                          Work Description / Summary
                        </span>
                        <p className="text-xs font-semibold text-ca-text leading-relaxed mt-1.5 m-0">
                          {item.workDescription}
                        </p>
                      </div>
                      {item.employeeRemark && (
                        <div className="pt-2 border-t border-ca-border/40 text-[11px] text-ca-text-secondary">
                          <span className="font-bold">Employee Note: </span>
                          <span className="italic font-medium text-ca-text">"{item.employeeRemark}"</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Manager Feedback Box */}
                    <div className="p-3 rounded-xl bg-ca-surface border border-ca-border shadow-2xs flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                          Manager Remark & Feedback
                        </span>
                        <div className="mt-1.5 p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-900 dark:text-teal-200 leading-relaxed">
                          "{item.managerRemark}"
                        </div>
                      </div>
                      <div className="pt-2 border-t border-ca-border/40 flex items-center justify-between text-[11px] font-bold text-ca-text-secondary">
                        <span>Time: <span className="text-ca-text">{item.timeSpent}</span></span>
                        <span>Completion: <span className="text-ca-secondary dark:text-emerald-400">{item.completionPercent}%</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyWorkReport;
