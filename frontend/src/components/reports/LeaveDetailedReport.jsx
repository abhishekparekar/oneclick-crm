import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getReportsLeaveDetailedApi } from "../../api/companyAdminApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Calendar, CheckCircle2, AlertCircle, XCircle, Clock, Search,
  Filter, Download, RefreshCw, Users, Layers, Award, ShieldAlert,
  CalendarCheck, CalendarX, FileText, TrendingUp, ChevronDown
} from "lucide-react";

const COLORS = ["#163832", "#235347", "#387363", "#569684", "#70b2a0", "#8bcbb9", "#a8e2d0"];

const LeaveDetailedReport = ({ fallbackLeaves = [], lvSummary, departments = [], showCharts = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const { data: detailedData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["leaveDetailedAnalytics"],
    queryFn: () => getReportsLeaveDetailedApi().then(r => r.data),
    staleTime: 30000,
  });

  const handleRefreshData = async () => {
    const toastId = toast.loading("Refreshing leave analytics and metrics...");
    try {
      await refetch();
      toast.dismiss(toastId);
      toast.success("Leave analytics data refreshed successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to refresh leave analytics");
    }
  };

  // Combine API detailed data or fallback passed from Reports.jsx
  const allLeaves = useMemo(() => {
    if (detailedData?.list && Array.isArray(detailedData.list) && detailedData.list.length > 0) {
      return detailedData.list;
    }
    const rawFall = Array.isArray(fallbackLeaves) ? fallbackLeaves : (Array.isArray(fallbackLeaves?.leaves) ? fallbackLeaves.leaves : []);
    return rawFall;
  }, [detailedData, fallbackLeaves]);

  // Compute Rich Analytics
  const analytics = useMemo(() => {
    let total = allLeaves.length;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let totalDaysTaken = 0;

    const typeMap = {};
    const empLeaveMap = {};

    allLeaves.forEach((l) => {
      const st = l.status || "pending";
      if (st === "approved") approved++;
      else if (st === "rejected") rejected++;
      else pending++;

      // Days taken calculation
      let days = l.days || l.duration || 1;
      if (l.startDate && l.endDate) {
        const d1 = new Date(l.startDate);
        const d2 = new Date(l.endDate);
        if (!isNaN(d1) && !isNaN(d2)) {
          const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
          if (diff > 0 && diff <= 90) days = diff;
        }
      }
      if (st === "approved") totalDaysTaken += days;

      // Leave Type
      const type = l.leaveType || l.type || "Casual Leave";
      if (!typeMap[type]) typeMap[type] = { name: type, total: 0, approved: 0, pending: 0, rejected: 0 };
      typeMap[type].total += 1;
      if (st === "approved") typeMap[type].approved += 1;
      else if (st === "rejected") typeMap[type].rejected += 1;
      else typeMap[type].pending += 1;

      // Employee summary
      const emp = l.employeeId;
      const empId = emp?._id || emp?.id || "unknown";
      const empName = emp?.fullName || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || emp?.name || "Employee";
      const empDept = emp?.departmentId?.name || emp?.departmentId?.departmentName || "General";

      if (!empLeaveMap[empId]) {
        empLeaveMap[empId] = { id: empId, name: empName, dept: empDept, total: 0, approved: 0, pending: 0, rejected: 0, days: 0 };
      }
      empLeaveMap[empId].total += 1;
      if (st === "approved") {
        empLeaveMap[empId].approved += 1;
        empLeaveMap[empId].days += days;
      } else if (st === "rejected") empLeaveMap[empId].rejected += 1;
      else empLeaveMap[empId].pending += 1;
    });

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const typeList = Object.values(typeMap).sort((a, b) => b.total - a.total);
    const empList = Object.values(empLeaveMap).sort((a, b) => b.total - a.total);

    const statusChartData = [
      { name: "Approved", value: approved, color: "#10b981" },
      { name: "Pending Approval", value: pending, color: "#f59e0b" },
      { name: "Rejected / Cancelled", value: rejected, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return {
      total,
      approved,
      pending,
      rejected,
      totalDaysTaken,
      approvalRate,
      typeList,
      statusChartData,
      empList,
      types: typeList.map(t => t.name),
    };
  }, [allLeaves]);

  // Filtered Leaves
  const filteredLeaves = useMemo(() => {
    return allLeaves.filter((lv) => {
      if (statusFilter !== "all" && (lv.status || "pending") !== statusFilter) return false;
      const t = lv.leaveType || lv.type || "Casual Leave";
      if (typeFilter !== "all" && t !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const reason = (lv.reason || "").toLowerCase();
        const empName = (lv.employeeId?.fullName || `${lv.employeeId?.firstName || ""} ${lv.employeeId?.lastName || ""}` || "").toLowerCase();
        const type = (lv.leaveType || lv.type || "").toLowerCase();
        if (!reason.includes(q) && !empName.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [allLeaves, statusFilter, typeFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeaves.length === 0) return;
    const headers = ["Employee Name", "Leave Type", "Start Date", "End Date", "Duration (Days)", "Status", "Reason"];
    const rows = filteredLeaves.map(l => {
      const emp = l.employeeId;
      const empName = emp?.fullName || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || l.employeeName || "Employee";
      let days = l.days || l.duration || 1;
      return [
        `"${empName.replace(/"/g, '""')}"`,
        `"${l.leaveType || l.type || "Casual Leave"}"`,
        l.startDate ? new Date(l.startDate).toLocaleDateString() : "—",
        l.endDate ? new Date(l.endDate).toLocaleDateString() : "—",
        days,
        l.status || "pending",
        `"${(l.reason || "").replace(/"/g, '""')}"`
      ];
    });
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Leave_Detailed_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Total Applications</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-text">{analytics.total}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg text-ca-text-secondary border border-ca-border/60">100%</span>
          </div>
          <span className="text-[10px] text-ca-text-secondary mt-1.5 font-medium flex items-center gap-1 leading-tight">
            <FileText size={11} /> All leave requests submitted
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-secondary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Approved Leaves</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-secondary dark:text-emerald-400">{analytics.approved}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60">
              {analytics.approvalRate}%
            </span>
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <CheckCircle2 size={11} /> Successfully authorized
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Pending Approvals</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{analytics.pending}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {analytics.total > 0 ? Math.round((analytics.pending / analytics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <Clock size={11} /> Awaiting manager review
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Rejected Requests</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-primary dark:text-red-400">{analytics.rejected}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-primary-light dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-ca-border dark:border-red-800/60">
              {analytics.total > 0 ? Math.round((analytics.rejected / analytics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <XCircle size={11} /> Denied by HR/Manager
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden sm:col-span-3 lg:col-span-1">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Total Days Taken</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-primary dark:text-blue-400">{analytics.totalDaysTaken}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-ca-border dark:border-blue-800/60">
              Days
            </span>
          </div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1.5 font-semibold leading-tight">Approved absence volume</span>
        </div>
      </div>

      {/* ── Charts: Leave Category Allocation & Status Distribution ────────── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in-50 duration-300">
          <div className="lg:col-span-2 bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black text-ca-text m-0">Leave Utilization by Category / Type</h3>
                <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Comparing applications, approvals, and rejections across classifications</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-ca-bg text-ca-text border border-ca-border/60">
                {analytics.typeList.length} Categories
              </span>
            </div>
            <div className="h-[210px] w-full">
              {analytics.typeList.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={analytics.typeList} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                    <XAxis dataKey="name" stroke="#8EB69B" fontSize={10} fontWeight={600} interval={0} tickFormatter={(val) => val.replace(/leave/i, '').trim() || val} />
                    <YAxis stroke="#8EB69B" fontSize={10} fontWeight={600} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "10px", fontSize: "11px", padding: "6px 10px", color: "var(--color-ca-text)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                    <Bar dataKey="approved" name="Approved" fill="#163832" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#569684" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#8bcbb9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-bold text-ca-text-secondary">No leave category data available</div>
              )}
            </div>
          </div>

          {/* Status Distribution Donut */}
          <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black text-ca-text m-0">Status Breakdown</h3>
              <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Approval vs pending vs rejection ratios</p>
            </div>
            <div className="h-[170px] w-full flex items-center justify-center my-1.5">
              {analytics.statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={analytics.statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-ca-surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "10px", fontSize: "11px", padding: "6px 10px", color: "var(--color-ca-text)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[11px] font-bold text-ca-text-secondary">No leave records</div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1 mt-1 text-[11px]">
              {analytics.statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 rounded-md bg-ca-bg border border-ca-border/60">
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

      {/* ── Employee Leave Utilization Scoreboard ──────────────────────────── */}
      <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-black text-ca-text m-0">Employee Leave Frequency Scoreboard</h3>
            <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Individuals with the highest volume of absence requests and days utilized</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-ca-primary/10 text-ca-primary border border-ca-primary/20">
            {analytics.empList.length} Applicants
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {analytics.empList.slice(0, 8).map((emp, idx) => (
            <div key={emp.id || idx} className="p-2.5 rounded-lg bg-ca-bg border border-ca-border/60 flex flex-col justify-between gap-2 hover:border-ca-primary transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black text-ca-text truncate m-0">{emp.name}</h4>
                  <span className="text-[10px] font-semibold text-ca-text-secondary block truncate">{emp.dept}</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60 shrink-0">
                  {emp.days} Days
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-ca-border/40 text-center">
                <div>
                  <span className="text-[9px] font-bold text-ca-text-secondary block">Total</span>
                  <span className="text-[11px] font-black text-ca-text">{emp.total}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-ca-secondary dark:text-emerald-400 block">Approved</span>
                  <span className="text-[11px] font-black text-ca-secondary dark:text-emerald-400">{emp.approved}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block">Pending</span>
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">{emp.pending}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Comprehensive Leave Register Table ─────────────────────────────── */}
      <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-xs font-black text-ca-text m-0">Master Leave Register ({filteredLeaves.length})</h3>
            <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Granular log of every single leave application with dates, duration, rationale, and status</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ca-text-secondary" />
              <input
                type="text"
                placeholder="Search employee or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border text-[11px] text-ca-text placeholder:text-slate-400 font-semibold outline-none focus:border-ca-primary w-48 sm:w-56"
              />
            </div>

            {/* Type Filter */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-2.5 py-1 rounded-lg border border-ca-border outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsTypeDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[120px]"
              >
                <span className="truncate font-bold text-[11px] text-ca-text">
                  {typeFilter === "all" ? "All Leave Types" : typeFilter}
                </span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 top-full mt-1 w-[180px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isTypeDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  <li key="all">
                    <button
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        typeFilter === "all" ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                      }`}
                      onClick={() => {
                        setTypeFilter("all");
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      All Leave Types
                    </button>
                  </li>
                  {analytics.types.map((t, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          typeFilter === t ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setTypeFilter(t);
                          setIsTypeDropdownOpen(false);
                        }}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Status Filter */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-2.5 py-1 rounded-lg border border-ca-border outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsStatusDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[100px]"
              >
                <span className="truncate font-bold text-[11px] text-ca-text capitalize">
                  {statusFilter === "all" ? "All Statuses" : statusFilter}
                </span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 sm:left-0 sm:right-auto top-full mt-1 w-[140px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isStatusDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {[
                    { value: "all", label: "All Statuses" },
                    { value: "approved", label: "Approved" },
                    { value: "pending", label: "Pending" },
                    { value: "rejected", label: "Rejected" },
                  ].map((s, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          statusFilter === s.value ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setStatusFilter(s.value);
                          setIsStatusDropdownOpen(false);
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-lg border border-ca-border/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ca-bg border-b border-ca-border/80 text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">
                <th className="p-2.5">Applicant</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5">Leave Category</th>
                <th className="p-2.5">Date Range & Duration</th>
                <th className="p-2.5">Reason / Rationale</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/40 text-[11px] font-semibold text-ca-text">
              {filteredLeaves.length > 0 ? (
                filteredLeaves.map((lv, i) => {
                  const st = lv.status || "pending";
                  const emp = lv.employeeId;
                  const empName = emp?.fullName || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
                  const dept = emp?.departmentId?.name || emp?.departmentId?.departmentName || "General";
                  let days = lv.days || lv.duration || 1;
                  if (lv.startDate && lv.endDate) {
                    const d1 = new Date(lv.startDate);
                    const d2 = new Date(lv.endDate);
                    if (!isNaN(d1) && !isNaN(d2)) {
                      const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
                      if (diff > 0 && diff <= 90) days = diff;
                    }
                  }

                  return (
                    <tr key={lv._id || i} className={`transition-colors border-b border-ca-border/40 ${i % 2 === 0 ? "bg-ca-surface hover:bg-ca-bg/70" : "bg-ca-bg/50 hover:bg-ca-bg"}`}>
                      <td className="p-2.5">
                        <div className="font-extrabold text-ca-text text-[11px]">{empName}</div>
                        {emp?.email && <div className="text-[10px] text-ca-text-secondary font-medium">{emp.email}</div>}
                      </td>
                      <td className="p-2.5 font-bold text-ca-text-secondary">{dept}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-ca-bg border border-ca-border/60 text-[10px] font-bold text-ca-primary">
                          {lv.leaveType || lv.type || "Casual Leave"}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-mono text-[10px] text-ca-text">
                          {lv.startDate ? new Date(lv.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          {" → "}
                          {lv.endDate ? new Date(lv.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </div>
                        <div className="text-[10px] text-ca-text-secondary dark:text-[#8EB69B] font-bold mt-0.5">({days} {days === 1 ? "Day" : "Days"})</div>
                      </td>
                      <td className="p-2.5 max-w-xs">
                        <div className="text-[11px] text-ca-text dark:text-slate-200 font-medium truncate">{lv.reason || "No specific reason provided"}</div>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          st === "approved"
                            ? "bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60"
                            : st === "rejected"
                            ? "bg-ca-primary-light dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-ca-border dark:border-red-800/60"
                            : "bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                        }`}>
                          {st}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ca-text-secondary dark:text-[#8EB69B] font-bold text-xs">
                    No leave records match your selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailedReport;
