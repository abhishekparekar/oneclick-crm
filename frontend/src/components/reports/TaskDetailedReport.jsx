import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getReportsTaskDetailedApi } from "../../api/companyAdminApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  CheckSquare, Clock, AlertCircle, TrendingUp, Filter, Search,
  Download, FileText, Share2, RefreshCw, ChevronRight, UserCheck,
  Calendar, Award, CheckCircle2, AlertTriangle, Layers, ChevronDown
} from "lucide-react";

const COLORS = ["#163832", "#235347", "#387363", "#569684", "#70b2a0", "#8bcbb9", "#a8e2d0"];

const TaskDetailedReport = ({ fallbackTasks = [], taskSummary, departments = [], showCharts = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  const { data: detailedData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["taskDetailedAnalytics"],
    queryFn: () => getReportsTaskDetailedApi().then(r => r.data),
    staleTime: 30000,
  });

  const handleRefreshData = async () => {
    const toastId = toast.loading("Refreshing task analytics and metrics...");
    try {
      await refetch();
      toast.dismiss(toastId);
      toast.success("Task analytics data refreshed successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to refresh task analytics");
    }
  };

  // Use API detailed task list or fallback list passed from Reports.jsx
  const allTasks = useMemo(() => {
    if (detailedData?.list && Array.isArray(detailedData.list) && detailedData.list.length > 0) {
      return detailedData.list;
    }
    const rawFall = Array.isArray(fallbackTasks) ? fallbackTasks : (Array.isArray(fallbackTasks?.tasks) ? fallbackTasks.tasks : (Array.isArray(fallbackTasks?.list) ? fallbackTasks.list : []));
    return rawFall;
  }, [detailedData, fallbackTasks]);

  // Compute Rich Analytics
  const analytics = useMemo(() => {
    let total = allTasks.length;
    let completed = 0;
    let pending = 0;
    let inProcess = 0;
    let overdue = 0;
    let highPrio = 0;
    let medPrio = 0;
    let lowPrio = 0;

    const statusCounts = {};
    const prioCounts = {};
    const empWorkloadMap = {};
    const deptWorkloadMap = {};

    const availableDepts = detailedData?.departments || departments || [];
    if (Array.isArray(availableDepts) && availableDepts.length > 0) {
      availableDepts.forEach((d) => {
        const dName = typeof d === "string" ? d : (d.name || d.departmentName || d.title);
        if (dName && dName.toLowerCase() !== "general") {
          deptWorkloadMap[dName] = { name: dName, total: 0, completed: 0, pending: 0, overdue: 0 };
        }
      });
    }

    allTasks.forEach((t) => {
      const st = t.status || "pending";
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      if (["complete", "completed", "done", "late_complete", "re_complete"].includes(st)) completed++;
      else if (st === "in_process" || st === "re_in_process") inProcess++;
      else if (st === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !["complete", "completed"].includes(st))) overdue++;
      else pending++;

      const p = (t.priority || "medium").toLowerCase();
      prioCounts[p] = (prioCounts[p] || 0) + 1;
      if (p === "high") highPrio++;
      else if (p === "low") lowPrio++;
      else medPrio++;

      // Department mapping
      const deptName = t.departmentId?.name || t.departmentId?.departmentName || t.department || "General Administration";
      if (!deptWorkloadMap[deptName]) {
        deptWorkloadMap[deptName] = { name: deptName, total: 0, completed: 0, pending: 0, overdue: 0 };
      }
      deptWorkloadMap[deptName].total += 1;
      if (["complete", "completed", "done", "late_complete"].includes(st)) deptWorkloadMap[deptName].completed += 1;
      else if (st === "overdue") deptWorkloadMap[deptName].overdue += 1;
      else deptWorkloadMap[deptName].pending += 1;

      // Employee mapping
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
      if (assignees.length === 0) {
        if (!empWorkloadMap["unassigned"]) {
          empWorkloadMap["unassigned"] = { id: "unassigned", name: "Unassigned Tasks", total: 0, completed: 0, overdue: 0, dept: deptName };
        }
        empWorkloadMap["unassigned"].total += 1;
      } else {
        assignees.forEach((a) => {
          if (!a) return;
          const id = a._id || a.id || a.toString();
          const empName = a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name || "Team Member";
          if (!empWorkloadMap[id]) {
            empWorkloadMap[id] = { id, name: empName, total: 0, completed: 0, overdue: 0, dept: deptName };
          }
          empWorkloadMap[id].total += 1;
          if (["complete", "completed", "done", "late_complete"].includes(st)) empWorkloadMap[id].completed += 1;
          else if (st === "overdue") empWorkloadMap[id].overdue += 1;
        });
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const empList = Object.values(empWorkloadMap)
      .map(e => ({ ...e, completionRate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    const deptList = Object.values(deptWorkloadMap)
      .map(d => ({
        ...d,
        remaining: Math.max(0, d.total - d.completed),
        completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    const statusChartData = [
      { name: "Completed", value: completed, color: "#10b981" },
      { name: "In Process", value: inProcess, color: "#f59e0b" },
      { name: "Pending", value: pending, color: "#3b82f6" },
      { name: "Overdue", value: overdue, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return {
      total,
      completed,
      pending,
      inProcess,
      overdue,
      highPrio,
      medPrio,
      lowPrio,
      completionRate,
      statusChartData,
      empList,
      deptList,
    };
  }, [allTasks]);

  // Filtered Tasks for Deep Dive Table
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const st = task.status || "pending";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      const pr = (task.priority || "medium").toLowerCase();
      if (priorityFilter !== "all" && pr !== priorityFilter) return false;
      if (departmentFilter !== "all") {
        const dName = task.departmentId?.name || task.departmentId?.departmentName || task.department || "General Administration";
        if (dName !== departmentFilter) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (task.title || "").toLowerCase();
        const desc = (task.description || "").toLowerCase();
        const taskId = (task.taskId || "").toLowerCase();
        const assignees = (task.assignedTo || []).map(a => (a.fullName || `${a.firstName || ""} ${a.lastName || ""}`).toLowerCase()).join(" ");
        if (!title.includes(q) && !desc.includes(q) && !taskId.includes(q) && !assignees.includes(q)) return false;
      }
      return true;
    });
  }, [allTasks, statusFilter, priorityFilter, departmentFilter, searchTerm]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) return;
    const headers = ["Task ID", "Title", "Status", "Priority", "Assigned To", "Start Date", "Deadline"];
    const rows = filteredTasks.map(t => [
      t.taskId || t._id?.toString().slice(-6) || "—",
      `"${(t.title || t.name || "").replace(/"/g, '""')}"`,
      t.status || "pending",
      t.priority || "medium",
      `"${(t.assignedTo || []).map(a => a.fullName || a.firstName || a.name || a.email).filter(Boolean).join(", ")}"`,
      (t.startDateTime || t.startDate) ? new Date(t.startDateTime || t.startDate).toLocaleDateString() : "—",
      (t.endDateTime || t.deadlineTime || t.dueDate || t.endDate) ? new Date(t.endDateTime || t.deadlineTime || t.dueDate || t.endDate).toLocaleDateString() : "—"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Task_Detailed_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Total Tasks</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-text">{analytics.total}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg text-ca-text-secondary border border-ca-border/60">100%</span>
          </div>
          <span className="text-[10px] text-ca-text-secondary mt-1.5 font-medium leading-tight">All monitored tasks</span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-secondary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Completed</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-secondary dark:text-emerald-400">{analytics.completed}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60">
              {analytics.completionRate}%
            </span>
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <CheckCircle2 size={11} /> Successfully closed
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">In Process</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{analytics.inProcess}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {analytics.total > 0 ? Math.round((analytics.inProcess / analytics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <Clock size={11} /> Currently active
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Pending</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-primary dark:text-blue-400">{analytics.pending}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-bg dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-ca-border dark:border-blue-800/60">
              {analytics.total > 0 ? Math.round((analytics.pending / analytics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1.5 font-semibold leading-tight">Awaiting kickoff</span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-ca-primary opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">Overdue SLA</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-ca-primary dark:text-red-400">{analytics.overdue}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-ca-primary-light dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-ca-border dark:border-red-800/60">
              {analytics.total > 0 ? Math.round((analytics.overdue / analytics.total) * 100) : 0}%
            </span>
          </div>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1.5 font-semibold flex items-center gap-1 leading-tight">
            <AlertTriangle size={11} /> Needs escalation
          </span>
        </div>

        <div className="bg-ca-surface p-3 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 opacity-80" />
          <span className="text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">High Priority</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-black text-violet-600 dark:text-violet-400">{analytics.highPrio}</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
              Critical
            </span>
          </div>
          <span className="text-[10px] text-violet-600/80 dark:text-violet-400/80 mt-1.5 font-semibold leading-tight">Top priority tasks</span>
        </div>
      </div>

      {/* ── Charts Grid: Workload by Department & Status Breakdown ───────────── */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in-50 duration-300">
          {/* Department Workload Bar Chart */}
          <div className="lg:col-span-2 bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black text-ca-text m-0">Departmental Task Load & Completion Rates</h3>
                <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Comparing assigned tasks versus completed tasks across departments</p>
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
                    <XAxis dataKey="name" stroke="#8EB69B" fontSize={10} fontWeight={600} interval={0} tickFormatter={(val) => val.replace(/department/i, 'Dept').replace(/administration/i, 'Admin').trim()} />
                    <YAxis stroke="#8EB69B" fontSize={10} fontWeight={600} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-ca-surface)", borderColor: "var(--color-ca-border)", borderRadius: "10px", fontSize: "11px", padding: "6px 10px", color: "var(--color-ca-text)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                    <Bar dataKey="completed" stackId="a" name="Completed Tasks" fill="#569684" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="remaining" stackId="a" name="Pending / Active Tasks" fill="#235347" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-bold text-ca-text-secondary">No departmental task data available</div>
              )}
            </div>
          </div>

          {/* Status Distribution Gauge */}
          <div className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black text-ca-text m-0">Status Distribution</h3>
              <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Proportion of tasks in each lifecycle phase</p>
            </div>
            <div className="relative h-[170px] w-full flex flex-col items-center justify-center my-1.5">
              {analytics.statusChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={analytics.statusChartData}
                        cx="50%"
                        cy="75%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={55}
                        outerRadius={75}
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
                  <div className="absolute bottom-4 flex flex-col items-center pointer-events-none">
                    <span className="text-xl font-black text-ca-text">{analytics.total || 0}</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-ca-text-secondary">Total Tasks</span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] font-bold text-ca-text-secondary">No tasks available</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {analytics.statusChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 rounded-md bg-ca-bg border border-ca-border/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-ca-text truncate">{item.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-ca-text ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Workload Scoreboard ───────────────────────────────────── */}
      <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-black text-ca-text m-0">Team Member Workload & Execution Scoreboard</h3>
            <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Individual performance rankings based on throughput, completion ratios, and overdue tasks</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-ca-primary/10 text-ca-primary border border-ca-primary/20">
            {analytics.empList.length} Active Assignees
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
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-ca-surface border border-ca-border text-ca-text shrink-0">
                  #{idx + 1}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-ca-text-secondary">Completion Rate</span>
                  <span className={emp.completionRate >= 80 ? "text-ca-secondary dark:text-emerald-400 font-black" : "text-amber-600 dark:text-amber-400 font-black"}>
                    {emp.completionRate}%
                  </span>
                </div>
                <div className="w-full h-1 bg-ca-surface rounded-full overflow-hidden border border-ca-border/40">
                  <div className="h-full bg-ca-secondary rounded-full transition-all duration-300" style={{ width: `${emp.completionRate}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-ca-border/40 text-center">
                <div>
                  <span className="text-[9px] font-bold text-ca-text-secondary block">Assigned</span>
                  <span className="text-[11px] font-black text-ca-text">{emp.total}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-ca-secondary dark:text-emerald-400 block">Done</span>
                  <span className="text-[11px] font-black text-ca-secondary dark:text-emerald-400">{emp.completed}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-ca-primary dark:text-red-400 block">Overdue</span>
                  <span className="text-[11px] font-black text-ca-primary dark:text-red-400">{emp.overdue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Deep Dive Task Table & Filters ─────────────────────────────────── */}
      <div className="bg-ca-surface p-3.5 rounded-xl border border-ca-border shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-xs font-black text-ca-text m-0">Task Execution Register ({filteredTasks.length})</h3>
            <p className="text-[11px] text-ca-text-secondary m-0 mt-0.5">Granular item-by-item breakdown with status filters, search, and CSV export capabilities</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ca-text-secondary" />
              <input
                type="text"
                placeholder="Search tasks, ID, assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 rounded-lg bg-ca-bg border border-ca-border text-[11px] text-ca-text placeholder:text-slate-400 font-semibold outline-none focus:border-ca-primary w-48 sm:w-56"
              />
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
                  {statusFilter === "all" ? "All Statuses" : statusFilter.replace("_", " ")}
                </span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 left-0 top-full mt-1 w-[140px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isStatusDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {[
                    { value: "all", label: "All Statuses" },
                    { value: "pending", label: "Pending" },
                    { value: "in_process", label: "In Process" },
                    { value: "complete", label: "Completed" },
                    { value: "overdue", label: "Overdue" },
                    { value: "cancelled", label: "Cancelled" },
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

            {/* Priority Filter */}
            <div 
              className="relative flex items-center gap-1.5 bg-ca-bg px-2.5 py-1 rounded-lg border border-ca-border outline-none hover:border-ca-primary/50 transition-colors"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setIsPriorityDropdownOpen(false);
                }
              }}
            >
              <div
                onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                className="flex items-center justify-between bg-transparent cursor-pointer min-w-[100px]"
              >
                <span className="truncate font-bold text-[11px] text-ca-text capitalize">
                  {priorityFilter === "all" ? "All Priorities" : `${priorityFilter} Priority`}
                </span>
                <ChevronDown size={14} className={`text-ca-text-secondary transition-transform ml-1 shrink-0 ${isPriorityDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              <div className={`absolute z-50 right-0 sm:left-0 sm:right-auto top-full mt-1 w-[140px] bg-ca-bg border border-ca-border rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top ${isPriorityDropdownOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}`}>
                <ul className="py-1 m-0 list-none max-h-60 overflow-y-auto custom-scrollbar">
                  {[
                    { value: "all", label: "All Priorities" },
                    { value: "high", label: "High Priority" },
                    { value: "medium", label: "Medium Priority" },
                    { value: "low", label: "Low Priority" },
                  ].map((p, i) => (
                    <li key={i}>
                      <button
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          priorityFilter === p.value ? "bg-ca-primary/10 text-ca-primary" : "text-ca-text hover:bg-ca-primary/10 hover:text-ca-primary"
                        }`}
                        onClick={() => {
                          setPriorityFilter(p.value);
                          setIsPriorityDropdownOpen(false);
                        }}
                      >
                        {p.label}
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
                <th className="p-2.5">Task ID</th>
                <th className="p-2.5">Task Title & Description</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5">Assigned Team</th>
                <th className="p-2.5">Priority</th>
                <th className="p-2.5">Deadline</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/40 text-[11px] font-semibold text-ca-text">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, i) => {
                  const st = task.status || "pending";
                  const prio = (task.priority || "medium").toLowerCase();
                  const deptName = task.departmentId?.name || task.departmentId?.departmentName || task.department || "General";
                  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : (Array.isArray(task.assignees) ? task.assignees : (task.assignees ? [task.assignees] : [])));

                  return (
                    <tr key={task._id || i} className={`transition-colors border-b border-ca-border/40 ${i % 2 === 0 ? "bg-ca-surface hover:bg-ca-bg/70" : "bg-ca-bg/50 hover:bg-ca-bg"}`}>
                      <td className="p-2.5 font-mono text-[10px] font-black text-ca-primary">{task.taskId || "—"}</td>
                      <td className="p-2.5 max-w-xs">
                        <div className="font-extrabold text-ca-text text-[11px] truncate">{task.title || "Untitled Task"}</div>
                        {task.description && <div className="text-[10px] text-ca-text-secondary font-medium truncate mt-0.5">{task.description}</div>}
                      </td>
                      <td className="p-2.5 font-bold text-ca-text-secondary">{deptName}</td>
                      <td className="p-2.5">
                        {assignees.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {assignees.slice(0, 2).map((a, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-ca-bg border border-ca-border/60 text-[9px] font-bold text-ca-text">
                                {a.fullName || a.firstName || a.name || "Member"}
                              </span>
                            ))}
                            {assignees.length > 2 && (
                              <span className="text-[9px] font-extrabold text-ca-text-secondary dark:text-[#8EB69B]">+{assignees.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ca-text-secondary dark:text-[#8EB69B] font-normal">—</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                          prio === "high" ? "bg-ca-primary-light dark:bg-red-950/50 text-ca-primary dark:text-red-300 border border-ca-border dark:border-red-800/60" :
                          prio === "low" ? "bg-ca-bg dark:bg-emerald-950/50 text-ca-secondary dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60" :
                          "bg-ca-primary-light dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                        }`}>
                          {task.priority || "Medium"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-ca-text-secondary dark:text-[#8EB69B]">
                        {task.endDateTime ? new Date(task.endDateTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          ["complete", "completed", "done", "late_complete"].includes(st) ? "bg-ca-bg dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-ca-border dark:border-emerald-800/60" :
                          st === "in_process" ? "bg-ca-primary-light dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60" :
                          st === "overdue" ? "bg-ca-primary-light dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-ca-border dark:border-red-800/60" :
                          "bg-ca-bg dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-ca-border dark:border-blue-800/60"
                        }`}>
                          {st.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ca-text-secondary dark:text-[#8EB69B] font-bold text-xs">
                    No task records match your selected filters.
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

export default TaskDetailedReport;
