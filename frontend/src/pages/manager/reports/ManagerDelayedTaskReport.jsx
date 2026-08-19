import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, CheckSquare, Layers } from "lucide-react";

const formatDate = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "—";
  }
};

const getTaskDueDate = (t) => {
  if (!t) return null;
  return t.dueDate || t.endDateTime || t.endDate || t.deadline || t.targetDate || null;
};

const AVATAR_BG = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

export default function ManagerDelayedTaskReport({ delayedTasksList = [], tasksData = [], searchQ = "" }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const allTasks = tasksData.length > 0 ? tasksData : delayedTasksList;

  // Task Stats
  const totalCount = allTasks.length;
  const completedCount = allTasks.filter(t => t.status === "done" || t.status === "completed").length;
  const overdueCount = allTasks.filter(t => {
    const taskDone = t.status === "done" || t.status === "completed";
    const dDate = getTaskDueDate(t);
    return !taskDone && dDate && new Date(dDate) < new Date();
  }).length;
  const pendingCount = totalCount - completedCount;
  const slaRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const title = (t.title || t.name || "").toLowerCase();
      const proj = (t.projectId?.name || t.department || "").toLowerCase();
      const matchesSearch = title.includes(searchQ.toLowerCase()) || proj.includes(searchQ.toLowerCase());

      if (!matchesSearch) return false;

      const dDate = getTaskDueDate(t);
      const isOverdue = t.status !== "done" && t.status !== "completed" && dDate && new Date(dDate) < new Date();
      if (statusFilter === "overdue" && !isOverdue) return false;
      if (statusFilter === "completed" && t.status !== "done" && t.status !== "completed") return false;
      if (statusFilter === "in_progress" && (t.status !== "in_progress" && t.status !== "doing")) return false;
      if (statusFilter === "pending" && (t.status === "done" || t.status === "completed")) return false;

      if (priorityFilter !== "all" && (t.priority || "medium").toLowerCase() !== priorityFilter) return false;

      return true;
    });
  }, [allTasks, searchQ, statusFilter, priorityFilter]);

  return (
    <div className="space-y-5 font-sans">
      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Total Tasks</span>
            <Layers size={14} className="text-teal-600" />
          </div>
          <p className="text-2xl font-black text-ca-text">{totalCount}</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">Tracked Deliverables</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Overdue SLA Breaches</span>
            <AlertTriangle size={14} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{overdueCount}</p>
          <p className="text-[10px] text-rose-700/80 font-extrabold">Requires Immediate Action</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Completed Tasks</span>
            <CheckSquare size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">{slaRate}% On-Time SLA Rate</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Pending Active Tasks</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">In-Queue Workload</p>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────────────── */}
      <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
        {/* Table Title & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-ca-border/60 pb-3">
          <div>
            <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600" /> Comprehensive Task &amp; Delayed Analysis Report
            </h2>
            <p className="text-xs text-ca-text-secondary mt-0.5 font-medium">Detailed tracking of all tasks, deadline breaches, priority levels, and assignees</p>
          </div>

          {/* Status & Priority Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Tasks" },
              { id: "overdue", label: `Overdue (${overdueCount})` },
              { id: "completed", label: "Completed" },
              { id: "pending", label: "Pending" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? f.id === "overdue" ? "bg-rose-600 text-white shadow-2xs" : "bg-teal-800 text-white shadow-2xs"
                    : "bg-ca-bg text-ca-text-secondary hover:text-ca-text border border-ca-border/50"
                }`}
              >
                {f.label}
              </button>
            ))}

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 bg-ca-bg border border-ca-border rounded-lg text-xs font-bold text-ca-text focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Task Analysis Table */}
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-ca-text-secondary font-semibold">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            No tasks found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-[10px] font-black uppercase tracking-wider text-ca-text-secondary">
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Project / Department</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">SLA Status</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40">
                {filteredTasks.map((t, idx) => {
                  const title = t.title || t.name || "Task";
                  const code = t.taskId || (t._id ? `TSK-${t._id.toString().slice(-4)}` : `TSK-${idx + 1}`);
                  const project = t.projectId?.name || t.department || "General";
                  const priority = (t.priority || "medium").toLowerCase();
                  const status = (t.status || "pending").toLowerCase();

                  const dDate = getTaskDueDate(t);
                  const isDone = status === "done" || status === "completed";
                  const isOverdue = !isDone && dDate && new Date(dDate) < new Date();
                  const daysOver = isOverdue ? Math.max(1, Math.floor((new Date() - new Date(dDate)) / (1000 * 60 * 60 * 24))) : 0;

                  const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);

                  return (
                    <tr key={t._id || idx} className={`hover:bg-ca-bg/60 transition-colors ${isOverdue ? "bg-rose-50/20" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-ca-text text-xs max-w-[220px] truncate">{title}</div>
                        <div className="text-[10px] font-mono text-ca-text-secondary">ID: {code}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-teal-700">{project}</td>
                      <td className="py-3 px-4">
                        {assignees.length === 0 ? (
                          <span className="text-ca-text-secondary italic">Unassigned</span>
                        ) : (
                          <div className="flex items-center space-x-1">
                            {assignees.slice(0, 3).map((a, i) => {
                              const name = a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name || "User";
                              return (
                                <div key={i} title={name} className={`w-6 h-6 rounded-full ${avatarClass(name)} flex items-center justify-center font-bold text-[10px] border`}>
                                  {name.charAt(0)}
                                </div>
                              );
                            })}
                            {assignees.length > 3 && (
                              <span className="text-[10px] font-bold text-ca-text-secondary">+{assignees.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          priority === "high" || priority === "urgent" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ca-text">{formatDate(dDate)}</td>
                      <td className="py-3 px-4 text-center">
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 font-black">
                            {daysOver} day(s) late
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                            On Schedule
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          isOverdue ? "bg-rose-50 text-rose-700 border-rose-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {t.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
