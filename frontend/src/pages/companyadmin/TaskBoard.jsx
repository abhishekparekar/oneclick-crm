import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getTasksApi,
  getDepartmentsApi,
  getEmployeesApi
} from "../../api/companyAdminApi";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  Search, Plus, Filter, CheckCircle, Clock, AlertCircle,
  ChevronRight, X, Download, Tag, User, Users,
  CalendarClock, Repeat, LayoutGrid, List, ChevronDown, ChevronUp, Kanban,
  ArrowUp, ArrowDown, CheckSquare, Sparkles, AlertTriangle, Layers,
  Calendar, RotateCcw, SlidersHorizontal, RefreshCw, Layers3, Flame,
  Eye, Building2, Paperclip, ArrowRightLeft
} from "lucide-react";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";
import TaskBulkActionBar from "../../components/tasks/TaskBulkActionBar";
import MemberSearchSelect from "../../components/tasks/MemberSearchSelect";

const formatDateDDMMYYYY = (val) => {
  if (!val) return "—";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const [y, m, d] = val.trim().split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pending", hex: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-500" },
  in_process: { label: "In Process", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  re_pending: { label: "Re-Pending", hex: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/60", dot: "bg-indigo-500" },
  re_in_process: { label: "Re-In Process", hex: "#0891b2", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800/60", dot: "bg-cyan-500" },
  complete: { label: "Completed", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  re_complete: { label: "Re-Completed", hex: "#059669", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-500" },
  late_complete: { label: "Late Completed", hex: "#0d9488", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-500" },
  re_late_complete: { label: "Re-Late Completed", hex: "#0f766e", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800/60", dot: "bg-teal-600" },
  overdue: { label: "Overdue", hex: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/60", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", hex: "#64748b", bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
  active: { label: "Active Recurring", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  stopped: { label: "Stopped Recurring", hex: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/60", dot: "bg-rose-500" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800/60" },
  medium: { label: "Medium", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800/60" },
  low: { label: "Low", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800/60" },
};

// ── Mini Avatar ───────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
  "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
  "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900",
];
const MiniAvatar = ({ name, idx = 0, size = "w-6 h-6", textSize = "text-[10px]" }) => (
  <div className={`${size} rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-xs`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, isTemplate, isActive }) => {
  if (isTemplate) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs select-none ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
        {isActive ? "Active" : "Stopped"}
      </span>
    );
  }
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-2xs select-none ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status?.replace(/_/g, " ")}
    </span>
  );
};

// ── Priority Badge ────────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }) => {
  if (!priority) return null;
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${cfg.text} ${cfg.bg} border ${cfg.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
};

// ── Top KPI Stat Card ────────────────────────────────────────────────────────
const CARD_THEMES = {
  blue: {
    baseClass: "bg-blue-50/80 dark:bg-blue-950/35 border-blue-200/90 dark:border-blue-800/80 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600",
    activeClass: "bg-blue-100/90 dark:bg-blue-950/70 border-2 border-blue-600 ring-2 ring-blue-500/30 shadow-md",
    activeBadge: "bg-blue-600 text-white",
    iconBg: "bg-blue-600 text-white shadow-xs",
    labelText: "text-blue-950 dark:text-blue-200 font-extrabold",
    valueText: "text-blue-700 dark:text-blue-300",
    topBar: "bg-blue-600",
  },
  sky: {
    baseClass: "bg-sky-50/80 dark:bg-sky-950/35 border-sky-200/90 dark:border-sky-800/80 shadow-2xs hover:shadow-md hover:border-sky-400 dark:hover:border-sky-600",
    activeClass: "bg-sky-100/90 dark:bg-sky-950/70 border-2 border-sky-600 ring-2 ring-sky-500/30 shadow-md",
    activeBadge: "bg-sky-600 text-white",
    iconBg: "bg-sky-500 text-white shadow-xs",
    labelText: "text-sky-950 dark:text-sky-200 font-extrabold",
    valueText: "text-sky-700 dark:text-sky-300",
    topBar: "bg-sky-500",
  },
  amber: {
    baseClass: "bg-amber-50/80 dark:bg-amber-950/35 border-amber-200/90 dark:border-amber-800/80 shadow-2xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600",
    activeClass: "bg-amber-100/90 dark:bg-amber-950/70 border-2 border-amber-600 ring-2 ring-amber-500/30 shadow-md",
    activeBadge: "bg-amber-600 text-white",
    iconBg: "bg-amber-500 text-white shadow-xs",
    labelText: "text-amber-950 dark:text-amber-200 font-extrabold",
    valueText: "text-amber-700 dark:text-amber-300",
    topBar: "bg-amber-500",
  },
  emerald: {
    baseClass: "bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200/90 dark:border-emerald-800/80 shadow-2xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600",
    activeClass: "bg-emerald-100/90 dark:bg-emerald-950/70 border-2 border-emerald-600 ring-2 ring-emerald-500/30 shadow-md",
    activeBadge: "bg-emerald-600 text-white",
    iconBg: "bg-emerald-600 text-white shadow-xs",
    labelText: "text-emerald-950 dark:text-emerald-200 font-extrabold",
    valueText: "text-emerald-700 dark:text-emerald-300",
    topBar: "bg-emerald-500",
  },
  rose: {
    baseClass: "bg-rose-50/80 dark:bg-rose-950/35 border-rose-200/90 dark:border-rose-800/80 shadow-2xs hover:shadow-md hover:border-rose-400 dark:hover:border-rose-600",
    activeClass: "bg-rose-100/90 dark:bg-rose-950/70 border-2 border-rose-600 ring-2 ring-rose-500/30 shadow-md",
    activeBadge: "bg-rose-600 text-white",
    iconBg: "bg-rose-600 text-white shadow-xs",
    labelText: "text-rose-950 dark:text-rose-200 font-extrabold",
    valueText: "text-rose-700 dark:text-rose-300",
    topBar: "bg-rose-500",
  },
  purple: {
    baseClass: "bg-purple-50/80 dark:bg-purple-950/35 border-purple-200/90 dark:border-purple-800/80 shadow-2xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600",
    activeClass: "bg-purple-100/90 dark:bg-purple-950/70 border-2 border-purple-600 ring-2 ring-purple-500/30 shadow-md",
    activeBadge: "bg-purple-600 text-white",
    iconBg: "bg-purple-600 text-white shadow-xs",
    labelText: "text-purple-950 dark:text-purple-200 font-extrabold",
    valueText: "text-purple-700 dark:text-purple-300",
    topBar: "bg-purple-500",
  },
};

const KPICard = ({ label, value, theme = "blue", onClick, isActive = false }) => {
  const cfg = CARD_THEMES[theme] || CARD_THEMES.blue;
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 select-none p-2.5 sm:p-3 flex flex-col justify-between min-h-[76px] ${onClick ? "cursor-pointer active:scale-[0.98]" : ""
        } ${isActive ? cfg.activeClass : cfg.baseClass
        }`}
    >
      {/* Top Accent Strip with theme color */}
      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />

      {/* Header Row: Label & Active Badge */}
      <div className="flex items-center justify-between gap-1 mb-1 pt-0.5">
        <span className={`text-[10px] sm:text-[10.5px] uppercase tracking-wider truncate font-extrabold ${cfg.labelText}`}>
          {label}
        </span>
        {isActive && (
          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.activeBadge} shadow-2xs`}>
            Active
          </span>
        )}
      </div>

      {/* Value Row: Bold Colored Count */}
      <div>
        <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${cfg.valueText}`}>
          {value}
        </h3>
      </div>
    </div>
  );
};

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onClick, activeTab, isSelected, onToggleSelect }) => {
  const status = task.status || "pending";
  const statusCfg = task.isTemplate
    ? { hex: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" }
    : (STATUS_CONFIG[status] || STATUS_CONFIG.pending);

  const assignedNames = (task.assignedTo || []).filter(a => a && (a.firstName || a.name));
  const deadline = task.endDateTime
    ? new Date(task.endDateTime)
    : task.isTemplate && (task.finishDate || task.endDate) ? new Date(task.finishDate || task.endDate) : null;
  const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(status);
  const isOverdue = !task.isTemplate && deadline && !isNaN(deadline.getTime()) && !isDone && Date.now() >= deadline.getTime();

  // Subtask progress
  const checklist = task.checklist || task.subtasks || [];
  const completedCount = checklist.filter(s => s.isCompleted || s.completed).length;
  const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : (["complete", "completed", "done", "late_complete", "re_late_complete"].includes(status) ? 100 : 0);

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col bg-white dark:bg-[#111C24] rounded-xl sm:rounded-2xl border shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden p-3 sm:p-4 min-h-[110px] sm:min-h-[140px] isolate ${isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20"
          : "border-slate-200/80 dark:border-slate-800"
        }`}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-[3.5px] group-hover:w-[4.5px] transition-all duration-300 z-20"
        style={{ backgroundColor: statusCfg.hex }}
      />

      <div className="flex items-center justify-between mb-1.5 sm:mb-2 z-10 relative">
        <div className="flex items-center gap-1.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(task._id);
              }}
              className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
          )}
          <span className="text-[9.5px] sm:text-[10px] font-mono font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
            {task.taskId || (task.isTemplate ? "TMPL" : "—")}
          </span>
          <StatusBadge status={status} isTemplate={task.isTemplate} isActive={task.isActive} />
        </div>
        <div className="flex-shrink-0">
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <h3 className="font-extrabold text-[13px] sm:text-[14px] text-slate-900 dark:text-white leading-snug mb-1.5 sm:mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 sm:line-clamp-2 pr-1 z-10 relative">
        {task.title}
      </h3>

      {checklist.length > 0 && (
        <div className="mb-2 sm:mb-3 z-10 relative">
          <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            <span>Checkpoints</span>
            <span>{completedCount}/{checklist.length} ({progressPct}%)</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-end justify-between z-10 relative pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col gap-1">
          {deadline && activeTab !== "Recurring" && (
            <div className={`flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
              <CalendarClock size={11} strokeWidth={2.2} />
              {formatDateDDMMYYYY(deadline)}
              {isOverdue && <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">Overdue</span>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1">
            {(task.isRecurring || task.isGeneratedFromTemplate || task.parentTemplateId) && !task.isTemplate && (
              <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                <Repeat size={9} strokeWidth={2.5} /> Recurring
              </div>
            )}

            {task.departmentId?.name && (
              <div className="flex items-center gap-1 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                <Tag size={9} strokeWidth={2.5} /> {task.departmentId.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {assignedNames.length > 0 ? (
            <div className="flex -space-x-1.5">
              {assignedNames.slice(0, 3).map((a, i) => (
                <MiniAvatar key={a._id || i} name={a.firstName || a.name} idx={i} size="w-5.5 h-5.5 sm:w-6 sm:h-6 ring-2 ring-white dark:ring-[#111C24]" textSize="text-[9px] sm:text-[10px]" />
              ))}
              {assignedNames.length > 3 && (
                <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[8.5px] sm:text-[9px] font-black ring-2 ring-white dark:ring-[#111C24] z-10 shadow-xs">
                  +{assignedNames.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-[#111C24] flex items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">
              <User size={10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Table Row Component ───────────────────────────────────────────────────────
const TableRow = ({ task, onClick, activeTab, isSelected, onToggleSelect }) => {
  const status = task.status || "pending";
  const assignedNames = (task.assignedTo || []).filter(a => a && (a.firstName || a.name));
  const rawDate = task.dueDate || task.endDate || task.endDateTime || task.finishDate || task.startDate;
  const deadline = rawDate ? new Date(rawDate) : null;
  const assignedByName = task.assignedBy?.name || (task.assignedBy?.firstName ? `${task.assignedBy.firstName} ${task.assignedBy.lastName || ""}` : "System");
  const deptName = task.departmentId?.name || (typeof task.department === "string" ? task.department : "") || task.departmentName;

  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer group ${isSelected ? "bg-blue-50/70 dark:bg-blue-950/30" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
        }`}
    >
      <td className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(task._id);
            }}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
          />
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px]">
          {task.taskId || "TSK"}
        </span>
      </td>
      <td className="px-4 py-3 max-w-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {task.title}
            </p>
            {task.isTemplate ? (
              <span className="inline-flex items-center text-[9px] font-black text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/50 px-1.5 py-0.2 rounded border border-violet-200 dark:border-violet-800 uppercase tracking-wider">
                Template
              </span>
            ) : (task.isRecurring || task.isGeneratedFromTemplate || task.parentTemplateId) ? (
              <span className="inline-flex items-center text-[9px] font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                Recurring
              </span>
            ) : null}
          </div>
          {deptName && (
            <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Building2 size={11} className="text-slate-400" />
              <span>{deptName}</span>
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <MiniAvatar name={assignedByName} size="w-5 h-5" textSize="text-[9px]" />
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[110px]">{assignedByName}</span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex -space-x-1.5">
          {assignedNames.slice(0, 3).map((a, i) => {
            const name = a.firstName ? `${a.firstName} ${a.lastName || ""}` : (a.name || "");
            return <MiniAvatar key={a._id || i} name={name} idx={i} size="w-6 h-6 ring-2 ring-white dark:ring-[#111C24]" textSize="text-[10px]" />;
          })}
          {assignedNames.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-black ring-2 ring-white dark:ring-[#111C24]">+{assignedNames.length - 3}</div>
          )}
          {assignedNames.length === 0 && <span className="text-[11px] text-slate-400">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap font-mono">
        {deadline && activeTab !== "Recurring" ? (
          formatDateDDMMYYYY(deadline)
        ) : task.isTemplate ? (
          <span className="text-violet-600 dark:text-violet-400 font-bold capitalize">{task.repeatType || "Recurring"}</span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={task.priority} /></td>
      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={status} isTemplate={task.isTemplate} isActive={task.isActive} /></td>
      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClick}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <Eye size={12} />
          <span>View</span>
        </button>
      </td>
    </tr>
  );
};

// ── TaskBoard Main Component ──────────────────────────────────────────────────
export default function TaskBoard() {
  const formatDate = (d) =>
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  const getDates = (tabName) => {
    const now = new Date();
    let start = "", end = "";
    if (tabName === "Today") { start = end = formatDate(now); }
    else if (tabName === "Yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); start = end = formatDate(y); }
    else if (tabName === "This Week") {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay());
      const e = new Date(now); e.setDate(s.getDate() + 6);
      start = formatDate(s); end = formatDate(e);
    } else if (tabName === "Last Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (tabName === "This Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (tabName === "Next Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth() + 2, 0));
    }
    return { start, end };
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isHR = location.pathname.startsWith("/hr") || user?.role === "HR";
  const getTaskDetailsUrl = (taskId) => isHR ? `/hr/tasks/${taskId}` : `/company/tasks/${taskId}`;

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("tb_activeTab") || "Today");
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem("tb_statusFilter") || "");
  const [searchQ, setSearchQ] = useState(() => sessionStorage.getItem("tb_searchQ") || "");
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem("tb_viewMode") || "list");
  const [showStatusCards, setShowStatusCards] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const handleToggleSelectTask = (taskId) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const [filters, setFilters] = useState(() => {
    try {
      const stored = sessionStorage.getItem("tb_filters");
      const storedTab = sessionStorage.getItem("tb_activeTab") || "Today";
      const parsed = stored ? JSON.parse(stored) : null;
      // Always recompute startDate/endDate from the active tab on mount
      // so Today always reflects today, not a stale date from yesterday's session
      const now = new Date();
      const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const todayStr = fmt(now);
      let initStart = "", initEnd = "";
      if (storedTab === "Today") { initStart = initEnd = todayStr; }
      else if (storedTab === "Yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); initStart = initEnd = fmt(y); }
      else if (storedTab === "This Week") {
        const s = new Date(now); s.setDate(now.getDate() - now.getDay());
        const e = new Date(now); e.setDate(s.getDate() + 6);
        initStart = fmt(s); initEnd = fmt(e);
      } else if (storedTab === "Last Month") {
        initStart = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        initEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
      } else if (storedTab === "This Month") {
        initStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
        initEnd = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      } else if (storedTab === "Next Month") {
        initStart = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        initEnd = fmt(new Date(now.getFullYear(), now.getMonth() + 2, 0));
      }
      return {
        ...(parsed || { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", status: "", overdue: false }),
        startDate: initStart,
        endDate: initEnd,
      };
    } catch {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      return { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: todayStr, endDate: todayStr, status: "", overdue: false };
    }
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [tempTab, setTempTab] = useState(activeTab);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const filterDropdownRef = useRef(null);

  const handleOpenFilters = () => {
    setTempFilters({ ...filters, status: filters.status || statusFilter });
    setTempTab(activeTab);
    setShowFiltersDropdown(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setShowFiltersDropdown(false);
      }
    };
    if (showFiltersDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFiltersDropdown]);

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters });
    setStatusFilter(tempFilters.status || "");
    setActiveTab(tempTab || "All Time");
    setShowFiltersDropdown(false);
  };

  const handleClearFilters = () => {
    const empty = { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false };
    setTempFilters(empty);
    setFilters(empty);
    setStatusFilter("");
    setActiveTab("All Time");
    setTempTab("All Time");
    setShowFiltersDropdown(false);
  };

  useEffect(() => { sessionStorage.setItem("tb_activeTab", activeTab); }, [activeTab]);
  useEffect(() => { sessionStorage.setItem("tb_statusFilter", statusFilter); }, [statusFilter]);
  useEffect(() => { sessionStorage.setItem("tb_searchQ", searchQ); }, [searchQ]);
  useEffect(() => { sessionStorage.setItem("tb_viewMode", viewMode); }, [viewMode]);
  useEffect(() => { sessionStorage.setItem("tb_filters", JSON.stringify(filters)); }, [filters]);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const overdueParam = searchParams.get("overdue");
    if (statusParam !== null || overdueParam !== null) {
      setFilters(prev => ({ ...prev, status: statusParam || "", overdue: overdueParam === "true" }));
    }
    if (searchParams.get("create") === "true" || searchParams.get("openCreate") === "true") {
      setIsCreateOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    if (searchParams.get("create") || searchParams.get("openCreate")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    const { start, end } = getDates(tabName);
    const statusF = tabName === "Re Open" ? "re_pending,re_in_process,re_complete,re_late_complete" : "";
    setFilters(prev => ({ ...prev, startDate: start, endDate: end, status: statusF }));
    setStatusFilter("");
  };

  // Data Queries
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const { data: empRes } = useQuery({ queryKey: ["employees", "allMembers"], queryFn: () => getEmployeesApi({ limit: 1000 }) });

  const apiFilters = { departmentId: filters.departmentId, assignedTo: filters.assignedTo };

  const { data: tasksRes, isLoading: tasksLoading, refetch, isFetching } = useQuery({
    queryKey: ["tasks", apiFilters],
    queryFn: async () => {
      const [regRes, tplRes] = await Promise.all([
        getTasksApi(apiFilters).catch(() => ({ data: { tasks: [] } })),
        getTasksApi({ ...apiFilters, isTemplate: true }).catch(() => ({ data: { tasks: [] } }))
      ]);
      const reg = regRes.data?.tasks || [];
      const tpls = (tplRes.data?.tasks || []).map(t => ({ ...t, isTemplate: true }));
      return { tasks: [...reg, ...tpls] };
    }
  });

  const departments = deptRes?.data?.departments || deptRes?.data || [];
  const rawEmployees = empRes?.data?.employees || empRes?.data || [];
  const employees = useMemo(() => {
    const list = Array.isArray(rawEmployees) ? [...rawEmployees] : [];
    return list.sort((a, b) => {
      const nameA = (a.fullName || a.name || `${a.firstName || ""} ${a.lastName || ""}`).trim();
      const nameB = (b.fullName || b.name || `${b.firstName || ""} ${b.lastName || ""}`).trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [rawEmployees]);
  const allTasks = useMemo(() => {
    const raw = tasksRes?.tasks || [];
    const now = Date.now();
    return raw.map(t => {
      if (t.isTemplate) {
        return {
          ...t,
          status: t.isActive ? "active" : "stopped"
        };
      }
      const st = (t.status || "pending").toLowerCase();
      const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(st);
      if (!isDone) {
        const rawEnd = t.endDateTime || t.endDate || t.dueDate;
        if (rawEnd) {
          const due = new Date(rawEnd);
          if (!isNaN(due.getTime())) {
            if (now >= due.getTime()) {
              return { ...t, status: "overdue" };
            } else if (st === "overdue") {
              return { ...t, status: t.isReopened ? "re_pending" : "pending" };
            }
          }
        }
      }
      return t;
    });
  }, [tasksRes]);

  const isTaskInDateRange = (task, startStr, endStr) => {
    if (!startStr || !endStr) return true;
    const startD = new Date(startStr);
    const endD = new Date(endStr);
    endD.setHours(23, 59, 59, 999);
    const checkBetween = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= startD && d <= endD;
    };
    return checkBetween(task.startDateTime || task.startDate) ||
      checkBetween(task.nextFollowUpDate) ||
      checkBetween(task.endDateTime || task.endDate);
  };

  // Tab-filtered tasks
  const tabFilteredTasks = useMemo(() => allTasks.filter(task => {
    if (activeTab === "Recurring") {
      if (!task.isTemplate && !task.isRecurring && !task.isGeneratedFromTemplate && !task.parentTemplateId) return false;
    } else {
      if (task.isTemplate) return false;
      if (activeTab === "Re Open" && !["re_pending", "re_in_process", "re_complete", "re_late_complete", "re_open"].includes((task.status || "").toLowerCase())) return false;
    }
    const passesDate = isTaskInDateRange(task, filters.startDate, filters.endDate);

    let passesDept = true;
    if (filters.departmentId) {
      const taskDeptId = task.departmentId?._id || task.departmentId || task.department?._id || task.department;
      passesDept = String(taskDeptId) === String(filters.departmentId);
    }

    let passesAssigned = true;
    if (filters.assignedTo) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : (task.assignees || []));
      passesAssigned = assignees.some(a => {
        const aId = a?._id || a?.id || a;
        return String(aId) === String(filters.assignedTo);
      });
    }


    let passesPriority = true;
    if (filters.priority) {
      passesPriority = (task.priority || "medium").toLowerCase() === filters.priority.toLowerCase();
    }

    let passesDeadline = true;
    if (filters.deadlineFilter) {
      // Collect ALL relevant dates: start, followup, end
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

      const candidateDates = [
        task.startDateTime, task.startDate,
        task.nextFollowUpDate, task.followUpDate,
        task.endDateTime, task.endDate, task.dueDate,
      ].filter(Boolean).map(v => new Date(v));

      const anyInRange = (start, end) => candidateDates.some(d => d >= start && d <= end);

      if (filters.deadlineFilter === "today") {
        passesDeadline = anyInRange(startOfToday, endOfToday);
      } else if (filters.deadlineFilter === "tomorrow") {
        passesDeadline = anyInRange(startOfTomorrow, endOfTomorrow);
      } else if (filters.deadlineFilter === "overdue") {
        const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes((task.status || "").toLowerCase());
        const raw = task.endDateTime || task.endDate || task.dueDate;
        const d = raw ? new Date(raw) : null;
        passesDeadline = !isDone && d && !isNaN(d.getTime()) && now.getTime() >= d.getTime();
      }
    }

    let passesOverdue = true;
    if (filters.overdue) {
      const st = (task.status || "").toLowerCase();
      const done = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(st);
      const due = task.endDateTime ? new Date(task.endDateTime) : null;
      passesOverdue = !done && due && !isNaN(due.getTime()) && Date.now() >= due.getTime();
    }

    return passesDate && passesDept && passesAssigned && passesPriority && passesDeadline && passesOverdue;
  }), [allTasks, activeTab, filters.startDate, filters.endDate, filters.departmentId, filters.assignedTo, filters.priority, filters.deadlineFilter, filters.overdue]);

  // Compute status counts for status chips
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      in_process: 0,
      re_pending: 0,
      re_in_process: 0,
      complete: 0,
      re_complete: 0,
      late_complete: 0,
      re_late_complete: 0,
      overdue: 0,
      cancelled: 0,
    };
    tabFilteredTasks.forEach(t => {
      const s = (t.status || "pending").toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [tabFilteredTasks]);

  // Final filtered tasks
  const filteredTasks = useMemo(() => tabFilteredTasks.filter(task => {
    const activeStatus = statusFilter || filters.status;
    if (activeStatus) {
      const taskSt = (task.status || "pending").toLowerCase();
      if (activeStatus === "pending") {
        if (!["pending", "re_pending"].includes(taskSt)) return false;
      } else if (activeStatus === "in_process") {
        if (!["in_process", "re_in_process", "in progress"].includes(taskSt)) return false;
      } else if (activeStatus === "re_pending") {
        if (taskSt !== "re_pending") return false;
      } else if (activeStatus === "re_in_process") {
        if (taskSt !== "re_in_process") return false;
      } else if (activeStatus === "complete") {
        if (!["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(taskSt)) return false;
      } else if (activeStatus === "re_complete") {
        if (!["re_complete", "re_late_complete"].includes(taskSt)) return false;
      } else if (activeStatus === "late_complete") {
        if (!["late_complete", "re_late_complete"].includes(taskSt)) return false;
      } else if (activeStatus === "re_late_complete") {
        if (taskSt !== "re_late_complete") return false;
      } else if (activeStatus === "overdue") {
        if (taskSt !== "overdue") return false;
      } else if (activeStatus === "re_open") {
        if (!["re_pending", "re_in_process", "re_complete", "re_late_complete", "re_open"].includes(taskSt)) return false;
      } else if (activeStatus === "cancelled") {
        if (taskSt !== "cancelled") return false;
      } else if (activeStatus.includes(",")) {
        const allowed = activeStatus.split(",").map(s => s.trim().toLowerCase());
        if (!allowed.includes(taskSt)) return false;
      } else {
        if (taskSt !== activeStatus.toLowerCase()) return false;
      }
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const title = (task.title || "").toLowerCase();
      const id = (task.taskId || "").toLowerCase();
      const dept = (task.departmentId?.name || "").toLowerCase();
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
      const assigneeNames = assignees.map(a => `${a?.firstName || a?.name || ""} ${a?.lastName || ""}`.toLowerCase()).join(" ");
      if (!title.includes(q) && !id.includes(q) && !dept.includes(q) && !assigneeNames.includes(q)) return false;
    }
    return true;
  }), [tabFilteredTasks, statusFilter, filters.status, searchQ]);

  // KPI Metrics Calculation
  const totalCount = tabFilteredTasks.length;
  const pendingCount = tabFilteredTasks.filter(t => ["pending", "re_pending"].includes(t.status)).length;
  const inProgressCount = tabFilteredTasks.filter(t => ["in_process", "re_in_process"].includes(t.status)).length;
  const completedCount = tabFilteredTasks.filter(t => ["complete", "re_complete", "late_complete", "re_late_complete"].includes(t.status)).length;
  const overdueCount = tabFilteredTasks.filter(t => {
    if (t.isTemplate) return false;
    const st = (t.status || "").toLowerCase();
    const done = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(st);
    const due = t.endDateTime ? new Date(t.endDateTime) : null;
    return !done && due && due < new Date();
  }).length;
  const reopenCount = tabFilteredTasks.filter(t => !t.isTemplate && ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(t.status)).length;
  const recurringCount = tabFilteredTasks.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;

  // STRICT UNIQUE DATE CATEGORIES
  const dateCategories = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month", "Next Month", "Re Open", "Recurring"];

  const categoryCounts = dateCategories.map(cat => {
    let count = 0;
    if (cat === "Re Open") {
      count = allTasks.filter(t => !t.isTemplate && ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(t.status)).length;
    } else if (cat === "Recurring") {
      count = allTasks.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    } else if (cat === "All Time") {
      count = allTasks.filter(t => !t.isTemplate).length;
    } else {
      const { start, end } = getDates(cat);
      count = allTasks.filter(t => !t.isTemplate && isTaskInDateRange(t, start, end)).length;
    }
    return { name: cat, count };
  });

  // Calculate custom dropdown filters count (including active status and date tab filters)
  const activeCustomFiltersCount = useMemo(() => {
    const hasTimeframe = activeTab && activeTab !== "All Time" ? 1 : 0;
    return [filters.departmentId, filters.assignedTo, filters.priority, filters.deadlineFilter, filters.startDate, filters.endDate, filters.overdue, statusFilter || filters.status, hasTimeframe].filter(Boolean).length;
  }, [filters.departmentId, filters.assignedTo, filters.priority, filters.deadlineFilter, filters.startDate, filters.endDate, filters.overdue, statusFilter, filters.status, activeTab]);

  const STATUS_FILTER_OPTIONS = [
    { id: "pending", label: "Pending", count: statusCounts.pending || 0, pillInactive: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100/80 shadow-2xs", pillActive: "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30" },
    { id: "in_process", label: "In Process", count: statusCounts.in_process || 0, pillInactive: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100/80 shadow-2xs", pillActive: "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30" },
    { id: "re_pending", label: "Re-Pending", count: statusCounts.re_pending || 0, pillInactive: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100/80 shadow-2xs", pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/30" },
    { id: "re_in_process", label: "Re-In Process", count: statusCounts.re_in_process || 0, pillInactive: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 hover:bg-cyan-100/80 shadow-2xs", pillActive: "bg-cyan-600 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-500/30" },
    { id: "complete", label: "Completed", count: statusCounts.complete || 0, pillInactive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/80 shadow-2xs", pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30" },
    { id: "re_complete", label: "Re-Completed", count: statusCounts.re_complete || 0, pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs", pillActive: "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/30" },
    { id: "late_complete", label: "Late Completed", count: statusCounts.late_complete || 0, pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs", pillActive: "bg-teal-700 text-white border-teal-700 shadow-xs ring-2 ring-teal-600/30" },
    { id: "re_late_complete", label: "Re-Late Completed", count: statusCounts.re_late_complete || 0, pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs", pillActive: "bg-teal-800 text-white border-teal-800 shadow-xs ring-2 ring-teal-700/30" },
    { id: "overdue", label: "Overdue", count: statusCounts.overdue || 0, pillInactive: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100/80 shadow-2xs", pillActive: "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30" },
    { id: "cancelled", label: "Cancelled", count: statusCounts.cancelled || 0, pillInactive: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 shadow-2xs", pillActive: "bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-500/30" },
  ];

  const escapeCSVCell = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    if (!filteredTasks.length) return alert("No tasks to export!");
    const headers = [
      "Task ID", "Title", "Description", "Checkpoints (Subtasks)", "Status",
      "Priority", "Assigned By", "Assigned To", "Department", "Start Date",
      "Deadline", "Is Template", "Repeat Type", "Status (Active/Stopped)"
    ];
    const rows = filteredTasks.map(t => {
      const checkpointsList = t.checklist || t.subtasks || [];
      const subtasksStr = checkpointsList
        .map(s => `[${(s.isCompleted || s.completed) ? "x" : " "}] ${s.title || ""}`)
        .join("; ");
      const assignedToNames = (t.assignedTo || [])
        .map(a => a ? (a.firstName ? `${a.firstName} ${a.lastName || ""}` : a.name || "") : "")
        .filter(Boolean)
        .join(", ");

      return [
        t.taskId || "",
        t.title || "",
        t.description || "",
        subtasksStr,
        t.status || "",
        t.priority || "",
        t.assignedBy?.name || `${t.assignedBy?.firstName || ""} ${t.assignedBy?.lastName || ""}`.trim() || "System",
        assignedToNames || "Unassigned",
        t.departmentId?.name || "",
        t.startDateTime ? new Date(t.startDateTime).toLocaleDateString("en-GB") : "",
        t.endDateTime ? new Date(t.endDateTime).toLocaleDateString("en-GB") : "",
        t.isTemplate ? "Yes" : "No",
        t.repeatType || "",
        t.isTemplate ? (t.isActive ? "Active" : "Stopped") : ""
      ].map(escapeCSVCell);
    });

    const csvContent = [headers.map(escapeCSVCell).join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kanban Columns Definition
  const kanbanColumns = [
    { key: "pending", title: "Pending", dot: "bg-blue-500", filterFn: t => ["pending", "re_pending"].includes(t.status) },
    { key: "in_process", title: "In Process", dot: "bg-amber-500", filterFn: t => ["in_process", "re_in_process"].includes(t.status) },
    { key: "completed", title: "Completed", dot: "bg-emerald-500", filterFn: t => ["complete", "re_complete", "late_complete", "re_late_complete"].includes(t.status) },
    { key: "overdue", title: "Overdue", dot: "bg-rose-500", filterFn: t => t.status === "overdue" || (!["complete", "completed", "done", "late_complete"].includes(t.status) && t.endDateTime && new Date(t.endDateTime) < new Date()) },
  ];

  return (
    <div className="space-y-2.5 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">

      {/* ── Page Header & Fixed Height Action Toolbar ── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CheckSquare size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                Task Management
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Track team tasks, deadlines, assignments, and project deliverables
              </p>
            </div>
          </div>

          {/* Right: Unified Action Toolbar (Search + View Switcher + Shift + Export + Filters + Refresh + Add Task) */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* Search Box - Compact & Aligned */}
            <div className="relative w-44 sm:w-48 lg:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-8 pr-7 h-8 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-2xs"
              />
              {searchQ && (
                <button
                  onClick={() => setSearchQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* View Switcher Pills - ONLY ICONS */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 h-8 gap-0.5">
              <button
                onClick={() => setViewMode("cards")}
                title="Grid Cards View"
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === "cards"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban Board View"
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === "kanban"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                <Kanban size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Table List View"
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === "list"
                    ? "bg-white dark:bg-[#111C24] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                <List size={14} />
              </button>
            </div>

            {/* Shift Tasks Button (Lead Style, Inline Action) */}
            <button
              onClick={() => {
                if (selectedTaskIds.length === 0) {
                  setSelectedTaskIds(filteredTasks.map((t) => t._id));
                } else {
                  setSelectedTaskIds([]);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 border rounded-lg text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer ${selectedTaskIds.length > 0
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs"
                  : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              title={selectedTaskIds.length > 0 ? "Clear selection" : "Select all tasks to shift"}
            >
              <ArrowRightLeft size={13} className={selectedTaskIds.length > 0 ? "text-white" : "text-amber-600 dark:text-amber-400"} />
              <span>Shift</span>
              {selectedTaskIds.length > 0 && (
                <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] rounded-full font-black ml-0.5 bg-white text-amber-700">
                  {selectedTaskIds.length}
                </span>
              )}
            </button>

            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center w-8 h-8 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Export tasks to CSV"
            >
              <Download size={13} className="text-slate-500 dark:text-slate-400" />
            </button>

            {/* Filters Toggle Button */}
            <button
              onClick={handleOpenFilters}
              className={`flex items-center gap-1.5 px-3 h-8 border rounded-lg text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer ${showFiltersDropdown || activeCustomFiltersCount > 0
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              title="Filter Tasks"
            >
              <SlidersHorizontal size={12} className={showFiltersDropdown || activeCustomFiltersCount > 0 ? "text-white" : "text-blue-600 dark:text-blue-400"} />
              <span>{showFiltersDropdown ? "Hide Filters" : "Filters"}</span>
              {activeCustomFiltersCount > 0 && (
                <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] rounded-full font-black ml-0.5 ${showFiltersDropdown || activeCustomFiltersCount > 0 ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                  }`}>
                  {activeCustomFiltersCount}
                </span>
              )}
              <ChevronDown size={11} className={`transition-transform duration-200 ${showFiltersDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Refresh Data */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Refresh Tasks"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin text-blue-600" : "text-slate-500 dark:text-slate-400"} />
            </button>

            {/* Primary Action Button (+ Add Task) */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 h-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={13} strokeWidth={3} />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── COMPACT INLINE FILTER PANEL ─────────────────────────────────────── */}
      {showFiltersDropdown && (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs overflow-visible">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-600/10 flex items-center justify-center">
                <SlidersHorizontal size={11} className="text-blue-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Filters &amp; Search</span>
              {activeCustomFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-full">{activeCustomFiltersCount} active</span>
              )}
            </div>
            <button
              onClick={() => setShowFiltersDropdown(false)}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <X size={10} /> Hide Filters
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Row 1: Dropdowns ─ Department | Assigned To | Task Status | Priority | Deadline | Timeframe */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {/* Department */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${tempFilters.departmentId ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <Building2 size={11} className={tempFilters.departmentId ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Department</span>
                  {tempFilters.departmentId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${tempFilters.departmentId
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                      }`}
                    value={filters.departmentId || tempFilters.departmentId || ""}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      let updatedAssignedTo = filters.assignedTo;
                      if (newDeptId && updatedAssignedTo) {
                        const emp = employees.find(em => String(em._id) === String(updatedAssignedTo));
                        const empDeptId = emp?.departmentId?._id || emp?.departmentId?.id || emp?.departmentId;
                        if (String(empDeptId) !== String(newDeptId)) updatedAssignedTo = "";
                      }
                      const updated = { ...filters, departmentId: newDeptId, assignedTo: updatedAssignedTo };
                      setFilters(updated);
                      setTempFilters(updated);
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(filters.assignedTo || tempFilters.assignedTo) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <User size={11} className={(filters.assignedTo || tempFilters.assignedTo) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">{(filters.departmentId || tempFilters.departmentId) ? "Member (Dept)" : "All Members"}</span>
                  {(filters.assignedTo || tempFilters.assignedTo) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <MemberSearchSelect
                  value={filters.assignedTo || tempFilters.assignedTo || ""}
                  onChange={(val) => {
                    setFilters((prev) => ({ ...prev, assignedTo: val }));
                    setTempFilters((prev) => ({ ...prev, assignedTo: val }));
                  }}
                  employees={employees}
                  departments={departments}
                  departmentId={filters.departmentId || tempFilters.departmentId || ""}
                  theme="blue"
                  placeholder={
                    filters.departmentId || tempFilters.departmentId
                      ? "Department Members"
                      : "All Members"
                  }
                />
              </div>

              {/* Task Status Dropdown */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(filters.status || statusFilter || tempFilters.status) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <CheckSquare size={11} className={(filters.status || statusFilter || tempFilters.status) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Task Status</span>
                  {(filters.status || statusFilter || tempFilters.status) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${(filters.status || statusFilter || tempFilters.status)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                      }`}
                    value={filters.status || statusFilter || tempFilters.status || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setStatusFilter(val);
                      setFilters(prev => ({ ...prev, status: val }));
                      setTempFilters(prev => ({ ...prev, status: val }));
                    }}
                  >
                    <option value="">⚪ All Tasks ({allTasks.filter(t => !t.isTemplate).length})</option>
                    <option value="pending">🔵 Pending ({statusCounts.pending || 0})</option>
                    <option value="in_process">🟡 In Process ({statusCounts.in_process || 0})</option>
                    <option value="re_pending">🟣 Re-Pending ({statusCounts.re_pending || 0})</option>
                    <option value="re_in_process">🔷 Re-In Process ({statusCounts.re_in_process || 0})</option>
                    <option value="complete">🟢 Completed ({statusCounts.complete || 0})</option>
                    <option value="re_complete">🟩 Re-Completed ({statusCounts.re_complete || 0})</option>
                    <option value="late_complete">⏱️ Late Completed ({statusCounts.late_complete || 0})</option>
                    <option value="re_late_complete">⏱️ Re-Late Completed ({statusCounts.re_late_complete || 0})</option>
                    <option value="overdue">🔴 Overdue ({statusCounts.overdue || 0})</option>
                    <option value="cancelled">❌ Cancelled ({statusCounts.cancelled || 0})</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(filters.priority || tempFilters.priority) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <AlertTriangle size={11} className={(filters.priority || tempFilters.priority) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Priority</span>
                  {(filters.priority || tempFilters.priority) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${(filters.priority || tempFilters.priority)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                      }`}
                    value={filters.priority || tempFilters.priority || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setFilters(prev => ({ ...prev, priority: val }));
                      setTempFilters(prev => ({ ...prev, priority: val }));
                    }}
                  >
                    <option value="">All Priority</option>
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(filters.deadlineFilter || tempFilters.deadlineFilter) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <CalendarClock size={11} className={(filters.deadlineFilter || tempFilters.deadlineFilter) ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Deadline</span>
                  {(filters.deadlineFilter || tempFilters.deadlineFilter) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${(filters.deadlineFilter || tempFilters.deadlineFilter)
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                      }`}
                    value={filters.deadlineFilter || tempFilters.deadlineFilter || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setFilters(prev => ({ ...prev, deadlineFilter: val }));
                      setTempFilters(prev => ({ ...prev, deadlineFilter: val }));
                    }}
                  >
                    <option value="">All Deadlines</option>
                    <option value="today">📅 Due Today</option>
                    <option value="tomorrow">⏳ Due Tomorrow</option>
                    <option value="overdue">🚨 Overdue</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Timeframe / Period */}
              <div>
                <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(activeTab && activeTab !== "All Time") ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                  <Clock size={11} className={(activeTab && activeTab !== "All Time") ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">Timeframe</span>
                  {(activeTab && activeTab !== "All Time") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0" />
                  )}
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none text-xs h-8 pl-2.5 pr-7 outline-none rounded-lg cursor-pointer transition-all ${(activeTab && activeTab !== "All Time")
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                        : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300"
                      }`}
                    value={activeTab || tempTab || "All Time"}
                    onChange={e => {
                      const selectedTab = e.target.value;
                      setActiveTab(selectedTab);
                      setTempTab(selectedTab);
                      if (selectedTab === "All Time" || selectedTab === "Recurring") {
                        setFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
                        setTempFilters(prev => ({ ...prev, startDate: "", endDate: "" }));
                      } else if (selectedTab === "Re Open") {
                        const { start, end } = getDates(selectedTab);
                        const updated = {
                          startDate: start || "",
                          endDate: end || "",
                          status: "re_pending,re_in_process,re_complete,re_late_complete"
                        };
                        setStatusFilter("re_open");
                        setFilters(prev => ({ ...prev, ...updated }));
                        setTempFilters(prev => ({ ...prev, ...updated }));
                      } else if (selectedTab !== "Custom") {
                        const { start, end } = getDates(selectedTab);
                        setFilters(prev => ({ ...prev, startDate: start || "", endDate: end || "" }));
                        setTempFilters(prev => ({ ...prev, startDate: start || "", endDate: end || "" }));
                      }
                    }}
                  >
                    {categoryCounts.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} {cat.count > 0 ? `(${cat.count})` : ""}
                      </option>
                    ))}
                    <option value="Custom">Custom Date Range</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Date Range & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="flex-1">
                  <label className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${(filters.startDate || filters.endDate || tempFilters.startDate || tempFilters.endDate) ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                    }`}>
                    <CalendarClock size={11} className={(filters.startDate || filters.endDate || tempFilters.startDate || tempFilters.endDate) ? "text-blue-600" : "text-slate-400"} />
                    <span>Custom Date Range</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      className={`flex-1 text-xs h-8 px-2.5 outline-none rounded-lg cursor-pointer transition-all ${(filters.startDate || tempFilters.startDate)
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                          : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium"
                        }`}
                      value={filters.startDate || tempFilters.startDate || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setActiveTab("Custom");
                        setTempTab("Custom");
                        setFilters(prev => ({ ...prev, startDate: val }));
                        setTempFilters(prev => ({ ...prev, startDate: val }));
                      }}
                    />
                    <span className="text-slate-400 text-xs font-bold shrink-0">→</span>
                    <input
                      type="date"
                      className={`flex-1 text-xs h-8 px-2.5 outline-none rounded-lg cursor-pointer transition-all ${(filters.endDate || tempFilters.endDate)
                          ? "bg-blue-50/50 dark:bg-blue-950/30 border border-blue-500 text-blue-900 dark:text-blue-100 font-bold ring-1 ring-blue-500/25"
                          : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium"
                        }`}
                      value={filters.endDate || tempFilters.endDate || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setActiveTab("Custom");
                        setTempTab("Custom");
                        setFilters(prev => ({ ...prev, endDate: val }));
                        setTempFilters(prev => ({ ...prev, endDate: val }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end">
                <button
                  onClick={handleClearFilters}
                  className="px-3 h-8 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 h-8 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal size={11} /> <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top 6 KPI Summary Stat Cards (Total, Pending, In Process, Completed, Overdue, Re-Open) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        <KPICard
          label="Total Tasks"
          value={totalCount}
          Icon={Layers}
          theme="blue"
          onClick={() => {
            setStatusFilter("");
            setFilters(prev => ({ ...prev, status: "" }));
            setTempFilters(prev => ({ ...prev, status: "" }));
            if (activeTab === "Recurring") {
              setActiveTab("All Time");
              setTempTab("All Time");
            }
          }}
          isActive={!statusFilter && !filters.status && activeTab !== "Recurring"}
        />
        <KPICard
          label="Pending Tasks"
          value={pendingCount}
          Icon={Clock}
          theme="sky"
          onClick={() => {
            const next = (statusFilter === "pending" || filters.status === "pending") ? "" : "pending";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "pending" || filters.status === "pending"}
        />
        <KPICard
          label="In Process"
          value={inProgressCount}
          Icon={Sparkles}
          theme="amber"
          onClick={() => {
            const next = (statusFilter === "in_process" || filters.status === "in_process") ? "" : "in_process";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "in_process" || filters.status === "in_process"}
        />
        <KPICard
          label="Completed"
          value={completedCount}
          Icon={CheckCircle}
          theme="emerald"
          onClick={() => {
            const next = (statusFilter === "complete" || filters.status === "complete") ? "" : "complete";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "complete" || filters.status === "complete"}
        />
        <KPICard
          label="Overdue Tasks"
          value={overdueCount}
          Icon={AlertTriangle}
          theme="rose"
          onClick={() => {
            const next = (statusFilter === "overdue" || filters.status === "overdue") ? "" : "overdue";
            setStatusFilter(next);
            setFilters(prev => ({ ...prev, status: next }));
            setTempFilters(prev => ({ ...prev, status: next }));
          }}
          isActive={statusFilter === "overdue" || filters.status === "overdue"}
        />
        <KPICard
          label="Reopen Tasks"
          value={reopenCount}
          Icon={RotateCcw}
          theme="purple"
          onClick={() => {
            const isCur = statusFilter === "re_open" || filters.status === "re_pending,re_in_process,re_complete,re_late_complete";
            const nextSt = isCur ? "" : "re_open";
            const nextFilterSt = isCur ? "" : "re_pending,re_in_process,re_complete,re_late_complete";
            setStatusFilter(nextSt);
            setFilters(prev => ({ ...prev, status: nextFilterSt }));
            setTempFilters(prev => ({ ...prev, status: nextFilterSt }));
          }}
          isActive={statusFilter === "re_open" || filters.status === "re_pending,re_in_process,re_complete,re_late_complete"}
        />
      </div>

      {/* ── Active Filters Bar ────────────────────────────────────────── */}
      {activeCustomFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 py-1.5 px-3 rounded-xl text-xs shadow-2xs">
          <span className="font-extrabold text-blue-950 dark:text-blue-200 text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Filter size={11} className="text-blue-600 dark:text-blue-400" /> Active Filters:
          </span>

          {activeTab && activeTab !== "All Time" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              Timeframe: {activeTab}
              <button onClick={() => { setActiveTab("All Time"); setTempTab("All Time"); setFilters(prev => ({ ...prev, startDate: "", endDate: "" })); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {(statusFilter || filters.status) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Status: {(statusFilter || filters.status).replace(/_/g, " ")}
              <button onClick={() => { setStatusFilter(""); setFilters(prev => ({ ...prev, status: "" })); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.departmentId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              Dept: {departments.find(d => String(d._id) === String(filters.departmentId))?.name || "Selected"}
              <button onClick={() => setFilters(prev => ({ ...prev, departmentId: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.assignedTo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              Assignee: {(() => {
                const emp = employees.find(e => String(e._id) === String(filters.assignedTo));
                return emp ? (emp.fullName || emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || "Selected") : "Selected";
              })()}
              <button onClick={() => setFilters(prev => ({ ...prev, assignedTo: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.priority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Priority: {filters.priority}
              <button onClick={() => setFilters(prev => ({ ...prev, priority: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.deadlineFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs capitalize">
              Deadline: {filters.deadlineFilter.replace(/_/g, " ")}
              <button onClick={() => setFilters(prev => ({ ...prev, deadlineFilter: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.startDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              From: {formatDateDDMMYYYY(filters.startDate)}
              <button onClick={() => { setFilters(prev => ({ ...prev, startDate: "" })); setActiveTab("All Time"); setTempTab("All Time"); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          {filters.endDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-bold text-[10.5px] shadow-2xs">
              To: {formatDateDDMMYYYY(filters.endDate)}
              <button onClick={() => { setFilters(prev => ({ ...prev, endDate: "" })); setActiveTab("All Time"); setTempTab("All Time"); }} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}

          <button
            onClick={() => {
              const empty = { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false };
              setTempFilters(empty);
              setFilters(empty);
              setStatusFilter("");
              setActiveTab("All Time");
              setTempTab("All Time");
            }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline ml-auto cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── Lead-Style Inline Bulk Action Bar (No Popup) ──────────────────────── */}
      <TaskBulkActionBar
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
        onSelectAll={() => setSelectedTaskIds(filteredTasks.map((t) => t._id))}
        totalVisibleTasks={filteredTasks.length}
        employees={employees}
        onSuccess={() => {
          setSelectedTaskIds([]);
          refetch();
        }}
      />

      {tasksLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-amber-500/25 border-t-amber-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading tasks board...</p>
            <p className="text-xs text-slate-400">Please wait while we fetch company tasks and deliverables</p>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
            <CheckCircle size={26} strokeWidth={2} />
          </div>
          <p className="text-slate-900 dark:text-white font-extrabold text-base">No tasks found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Try adjusting your status filter, search term, or date range</p>
          {(statusFilter || searchQ) && (
            <button onClick={() => { setStatusFilter(""); setSearchQ(""); }} className="mt-4 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
              <X size={13} /> Reset status & search filters
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* ── GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              activeTab={activeTab}
              isSelected={selectedTaskIds.includes(task._id)}
              onToggleSelect={handleToggleSelectTask}
              onClick={() => navigate(getTaskDetailsUrl(task._id))}
            />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        /* ── KANBAN BOARD VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kanbanColumns.map(col => {
            const colTasks = filteredTasks.filter(col.filterFn);
            return (
              <div key={col.key} className="flex flex-col bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 min-h-[450px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>
                {/* Column Tasks */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[700px] hide-scrollbar pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] font-medium text-slate-400">
                      No {col.title.toLowerCase()} tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        activeTab={activeTab}
                        isSelected={selectedTaskIds.includes(task._id)}
                        onToggleSelect={handleToggleSelectTask}
                        onClick={() => navigate(getTaskDetailsUrl(task._id))}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── ENTERPRISE TABLE LIST VIEW ── */
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase flex items-center gap-2">
                <Layers size={14} className="text-blue-600" /> Tasks  Log
              </h3>
              {selectedTaskIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {selectedTaskIds.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                {filteredTasks.length} tasks
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-[#111C24] border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  <th className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTaskIds(filteredTasks.map(t => t._id));
                        } else {
                          setSelectedTaskIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-black">ID</th>
                  <th className="px-4 py-3 font-black">Task Title</th>
                  <th className="px-4 py-3 font-black">Assigned By</th>
                  <th className="px-4 py-3 font-black">Assignees</th>
                  <th className="px-4 py-3 font-black">Deadline</th>
                  <th className="px-4 py-3 font-black">Priority</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTasks.map(task => (
                  <TableRow
                    key={task._id}
                    task={task}
                    activeTab={activeTab}
                    isSelected={selectedTaskIds.includes(task._id)}
                    onToggleSelect={handleToggleSelectTask}
                    onClick={() => navigate(getTaskDetailsUrl(task._id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Task Creation Modal ────────────────────────────────────────────── */}
      <TaskCreateModal isOpen={isCreateOpen} onClose={handleCloseCreateModal} departments={departments} employees={employees} />
    </div>
  );
}