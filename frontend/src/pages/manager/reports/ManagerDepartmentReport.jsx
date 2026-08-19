import { useState, useMemo } from "react";
import {
  Building2, Users, BarChart3, ShieldCheck, CheckSquare, Calendar,
  Clock, AlertTriangle, X, TrendingUp, Layers, CheckCircle2
} from "lucide-react";

const COMPLETED_STATUSES = ["complete", "completed", "done", "re_complete", "late_complete", "re_late_complete"];

function getStatusStyle(s) {
  const sl = (s || "").toLowerCase();
  if (sl === "late_complete" || sl === "late-complete" || sl === "re_late_complete" || sl === "late complete") {
    return { pill: "bg-orange-100 text-orange-900 border-orange-300 font-black shadow-2xs", dot: "bg-orange-500" };
  }
  if (sl === "re_complete" || sl === "re_completed") {
    return { pill: "bg-teal-100 text-teal-900 border-teal-300 font-black shadow-2xs", dot: "bg-teal-600" };
  }
  if (COMPLETED_STATUSES.includes(sl)) return { pill: "bg-emerald-100 text-emerald-800 border-emerald-200 font-black shadow-2xs", dot: "bg-emerald-500" };
  if (sl === "overdue") return { pill: "bg-rose-100 text-rose-800 border-rose-200 font-black shadow-2xs", dot: "bg-rose-500" };
  if (sl.includes("progress") || sl.includes("process")) return { pill: "bg-blue-100 text-blue-800 border-blue-200 font-black shadow-2xs", dot: "bg-blue-500" };
  if (sl === "re_pending") return { pill: "bg-indigo-100 text-indigo-800 border-indigo-200 font-black shadow-2xs", dot: "bg-indigo-500" };
  return { pill: "bg-amber-100 text-amber-800 border-amber-200 font-black shadow-2xs", dot: "bg-amber-500" };
}

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors = ["bg-teal-600", "bg-blue-600", "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-emerald-600"];
  const colorIdx = (name?.charCodeAt(0) || 0) % colors.length;
  const sizeClass = size === "sm" ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-sm";
  return (
    <div className={`${sizeClass} ${colors[colorIdx]} rounded-xl flex items-center justify-center text-white font-black shrink-0`}>
      {initials}
    </div>
  );
}

export default function ManagerDepartmentReport({ deptPerformanceList = [] }) {
  const [activeDept, setActiveDept] = useState("__all__");

  // Dept tab list: "All" + each assigned dept
  const deptTabs = useMemo(() => {
    return [{ id: "__all__", name: "All Departments" }, ...deptPerformanceList.map(d => ({ id: d.name, name: d.name }))];
  }, [deptPerformanceList]);

  // Currently visible dept data
  const displayDepts = useMemo(() => {
    if (activeDept === "__all__") return deptPerformanceList;
    return deptPerformanceList.filter(d => d.name === activeDept);
  }, [deptPerformanceList, activeDept]);

  // Currently visible members (union if "All", else filtered by dept)
  const displayMembers = useMemo(() => {
    if (activeDept === "__all__") {
      const seen = new Set();
      return deptPerformanceList.flatMap(d => (d.memberList || []).filter(m => {
        const id = m._id?.toString() || m.id?.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }));
    }
    const dept = deptPerformanceList.find(d => d.name === activeDept);
    return dept?.memberList || [];
  }, [deptPerformanceList, activeDept]);

  // Currently visible tasks
  const displayTasks = useMemo(() => {
    if (activeDept === "__all__") {
      const seen = new Set();
      return deptPerformanceList.flatMap(d => (d.taskList || []).filter(t => {
        const id = t._id?.toString() || t.id?.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }));
    }
    const dept = deptPerformanceList.find(d => d.name === activeDept);
    return dept?.taskList || [];
  }, [deptPerformanceList, activeDept]);

  // Stats for currently selected dept(s)
  const displayStats = useMemo(() => {
    const total = displayDepts.reduce((a, d) => a + (d.total || 0), 0);
    const completed = displayDepts.reduce((a, d) => a + (d.completed || 0), 0);
    const pending = displayDepts.reduce((a, d) => a + (d.pending || 0), 0);
    const overdue = displayDepts.reduce((a, d) => a + (d.overdue || 0), 0);
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, overdue, rate, members: displayMembers.length };
  }, [displayDepts, displayMembers]);

  // Member task stats
  const memberTaskStats = useMemo(() => {
    return displayMembers.map(m => {
      const empId = m._id?.toString() || m.id?.toString();
      const mTasks = displayTasks.filter(t => {
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
        return assignees.some(a => {
          const aId = typeof a === "object" ? (a._id || a.id) : a;
          return aId?.toString() === empId;
        });
      });
      const done = mTasks.filter(t => COMPLETED_STATUSES.includes((t.status || "").toLowerCase())).length;
      const rate = mTasks.length > 0 ? Math.round((done / mTasks.length) * 100) : 100;
      return { ...m, taskCount: mTasks.length, done, rate };
    });
  }, [displayMembers, displayTasks]);

  return (
    <div className="space-y-5 font-sans text-ca-text pb-10">

      {/* ── DEPT FILTER TABS ─────────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl p-4 shadow-2xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-ca-text-secondary mb-3">
          Filter by Assigned Department
        </p>
        <div className="flex flex-wrap gap-2">
          {deptTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDept(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                activeDept === tab.id
                  ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20"
                  : "bg-ca-bg text-ca-text-secondary border-ca-border hover:border-orange-500 hover:text-orange-600"
              }`}
            >
              {tab.id === "__all__" ? (
                <span className="flex items-center gap-1.5"><Layers size={13} /> {tab.name}</span>
              ) : (
                <span className="flex items-center gap-1.5"><Building2 size={13} /> {tab.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI SUMMARY ROW ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Dept(s)", value: displayDepts.length, icon: Building2, color: "orange" },
          { label: "Members", value: displayStats.members, icon: Users, color: "blue" },
          { label: "Total Tasks", value: displayStats.total, icon: BarChart3, color: "violet" },
          { label: "Completed", value: displayStats.completed, icon: CheckCircle2, color: "emerald" },
          { label: "Pending", value: displayStats.pending, icon: Clock, color: "amber" },
          { label: "Overdue", value: displayStats.overdue, icon: AlertTriangle, color: "rose" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-ca-surface border border-ca-border rounded-2xl p-4 shadow-2xs flex flex-col gap-2`}>
            <div className={`w-8 h-8 rounded-xl bg-${color}-50 text-${color}-700 flex items-center justify-center`}>
              <Icon size={16} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ca-text-secondary">{label}</p>
              <p className={`text-2xl font-black text-${color}-700 mt-0`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── COMPLETION RATE BAR ───────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-600" />
            <span className="font-extrabold text-sm text-ca-text uppercase tracking-wider">
              {activeDept === "__all__" ? "Overall Completion Rate" : `${activeDept} — Completion Rate`}
            </span>
          </div>
          <span className="text-xl font-black text-orange-600">{displayStats.rate}%</span>
        </div>
        <div className="w-full h-4 bg-ca-border/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-all duration-700 relative"
            style={{ width: `${displayStats.rate}%` }}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full" />
          </div>
        </div>
        <div className="flex justify-between text-[11px] font-bold text-ca-text-secondary mt-2">
          <span>0%</span>
          <span className="text-orange-600 font-extrabold">{displayStats.completed}/{displayStats.total} tasks completed</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── DEPARTMENT CARDS (when All is selected) ──────────────────────────── */}
      {activeDept === "__all__" && deptPerformanceList.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-ca-text uppercase tracking-wider flex items-center gap-2">
            <Building2 size={15} className="text-orange-600" /> Assigned Departments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptPerformanceList.map((d, i) => {
              const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              return (
                <button
                  key={i}
                  onClick={() => setActiveDept(d.name)}
                  className="text-left bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-orange-500/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-extrabold text-ca-text text-sm group-hover:text-orange-600 transition-colors">{d.name}</p>
                        <p className="text-[11px] text-ca-text-secondary font-medium flex items-center gap-1 mt-0.5">
                          <Users size={11} /> {d.members} member{d.members !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2.5 py-1 rounded-xl">
                      {d.total} tasks
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] font-extrabold">
                      <span className="text-ca-text-secondary">Completion</span>
                      <span className="text-orange-600">{rate}%</span>
                    </div>
                    <div className="w-full h-2 bg-ca-border/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-sm font-black text-emerald-700">{d.completed}</p>
                      <p className="text-[9px] font-extrabold uppercase text-emerald-800">Done</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-sm font-black text-amber-700">{d.pending}</p>
                      <p className="text-[9px] font-extrabold uppercase text-amber-800">Pending</p>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                      <p className="text-sm font-black text-rose-700">{d.overdue}</p>
                      <p className="text-[9px] font-extrabold uppercase text-rose-800">Overdue</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TEAM MEMBERS ─────────────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border bg-ca-bg">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-teal-700" />
            <h3 className="font-extrabold text-sm text-ca-text uppercase tracking-wider">
              {activeDept === "__all__" ? "All Dept Members" : `${activeDept} — Members`}
            </h3>
          </div>
          <span className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-xl">
            {displayMembers.length} Member(s)
          </span>
        </div>

        {memberTaskStats.length === 0 ? (
          <div className="py-12 text-center text-ca-text-secondary font-medium text-sm">
            No members found for this department.
          </div>
        ) : (
          <div className="divide-y divide-ca-border">
            {memberTaskStats.map((m, idx) => (
              <div key={m._id || idx} className="flex items-center gap-4 px-5 py-4 hover:bg-ca-bg/60 transition-colors">
                <Avatar name={`${m.firstName || m.name || ""} ${m.lastName || ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-ca-text text-sm truncate">
                    {`${m.firstName || m.name || "Employee"} ${m.lastName || ""}`.trim()}
                  </p>
                  <p className="text-[11px] text-teal-700 font-semibold truncate">
                    {m.designationId?.name || m.designationId?.title || m.role || "Team Member"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase">Tasks</p>
                    <p className="text-sm font-black text-ca-text">{m.done}/{m.taskCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="w-20 h-2 bg-ca-border/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.rate >= 75 ? "bg-emerald-500" : m.rate >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${m.rate}%` }}
                      />
                    </div>
                    <p className={`text-[10px] font-black ${m.rate >= 75 ? "text-emerald-600" : m.rate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {m.rate}%
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-ca-text-secondary font-bold hidden md:block">
                    {m.employeeCode || "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TASK LIST ─────────────────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border bg-ca-bg">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-teal-700" />
            <h3 className="font-extrabold text-sm text-ca-text uppercase tracking-wider">
              {activeDept === "__all__" ? "All Dept Tasks" : `${activeDept} — Task Log`}
            </h3>
          </div>
          <span className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-xl">
            {displayTasks.length} Task(s)
          </span>
        </div>

        {displayTasks.length === 0 ? (
          <div className="py-12 text-center text-ca-text-secondary font-medium text-sm">
            No tasks found for this department.
          </div>
        ) : (
          <div className="divide-y divide-ca-border">
            {displayTasks.map((t, idx) => {
              const s = (t.status || "pending").toLowerCase();
              const { pill, dot } = getStatusStyle(s);
              const due = t.endDateTime || t.dueDate || t.endDate;
              const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
              const assigneeNames = assignees.map(a => {
                if (typeof a === "object") return `${a.firstName || a.name || ""} ${a.lastName || ""}`.trim();
                const mem = displayMembers.find(m => (m._id || m.id)?.toString() === a?.toString());
                return mem ? `${mem.firstName || mem.name || ""} ${mem.lastName || ""}`.trim() : null;
              }).filter(Boolean);

              return (
                <div key={t._id || idx} className="flex items-center gap-4 px-5 py-4 hover:bg-ca-bg/60 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-ca-text text-sm truncate">{t.title || "Untitled Task"}</p>
                    {assigneeNames.length > 0 && (
                      <p className="text-[11px] text-ca-text-secondary font-medium truncate mt-0.5">
                        Assigned to: {assigneeNames.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {due && (
                      <div className="hidden sm:flex items-center gap-1 text-[11px] text-ca-text-secondary font-semibold">
                        <Calendar size={12} />
                        {new Date(due).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${pill}`}>
                      {t.status || "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
