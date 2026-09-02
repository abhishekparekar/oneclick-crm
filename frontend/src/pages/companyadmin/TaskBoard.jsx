import { useState, useEffect, useMemo } from "react";
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
  Eye, Building2, Paperclip
} from "lucide-react";
import TaskCreateModal from "../../components/tasks/TaskCreateModal";

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

// ── Top KPI Stat Card (Matching Dashboard Header Cards) ──────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, extraClass = "" }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className={`bg-white dark:bg-[#111C24] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-4 sm:py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group ${extraClass}`}>
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 sm:mb-1.5">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10.5px]">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9.5px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 sm:h-10 w-12 sm:w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-tb-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-tb-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onClick, activeTab }) => {
  const status = task.status || "pending";
  const statusCfg = task.isTemplate 
    ? { hex: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" } 
    : (STATUS_CONFIG[status] || STATUS_CONFIG.pending);

  const assignedNames = (task.assignedTo || []).filter(a => a && (a.firstName || a.name));
  const deadline = task.endDateTime
    ? new Date(task.endDateTime)
    : task.isTemplate && (task.finishDate || task.endDate) ? new Date(task.finishDate || task.endDate) : null;
  const isOverdue = !task.isTemplate && deadline && !["complete", "completed", "done", "late_complete", "re_late_complete", "cancelled"].includes(status) && deadline < new Date();

  // Subtask progress
  const checklist = task.checklist || task.subtasks || [];
  const completedCount = checklist.filter(s => s.isCompleted || s.completed).length;
  const progressPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : (["complete", "completed", "done", "late_complete", "re_late_complete"].includes(status) ? 100 : 0);

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white dark:bg-[#111C24] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden p-3 sm:p-4 min-h-[110px] sm:min-h-[140px] isolate"
    >
      <div 
        className="absolute top-0 left-0 bottom-0 w-[3.5px] group-hover:w-[4.5px] transition-all duration-300 z-20"
        style={{ backgroundColor: statusCfg.hex }}
      />

      <div className="flex items-center justify-between mb-1.5 sm:mb-2 z-10 relative">
        <div className="flex items-center gap-1.5">
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
              {deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
const TableRow = ({ task, onClick, activeTab }) => {
  const status = task.status || "pending";
  const assignedNames = (task.assignedTo || []).filter(a => a && (a.firstName || a.name));
  const rawDate = task.dueDate || task.endDate || task.endDateTime || task.finishDate || task.startDate;
  const deadline = rawDate ? new Date(rawDate) : null;
  const assignedByName = task.assignedBy?.name || (task.assignedBy?.firstName ? `${task.assignedBy.firstName} ${task.assignedBy.lastName || ""}` : "System");
  const deptName = task.departmentId?.name || (typeof task.department === "string" ? task.department : "") || task.departmentName;

  return (
    <tr onClick={onClick} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.04] transition-colors cursor-pointer group">
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
          deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("tb_activeTab") || "All Time");
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem("tb_statusFilter") || "");
  const [searchQ, setSearchQ] = useState(() => sessionStorage.getItem("tb_searchQ") || "");
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem("tb_viewMode") || "list");
  const [showStatusCards, setShowStatusCards] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState(() => {
    try {
      const stored = sessionStorage.getItem("tb_filters");
      return stored ? JSON.parse(stored) : { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false };
    } catch {
      return { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false };
    }
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const handleOpenFilters = () => {
    setTempFilters({ ...filters });
    setShowFiltersDropdown(true);
  };

  const handleApplyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFiltersDropdown(false);
  };

  const handleClearFilters = () => {
    const empty = { departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false };
    setTempFilters(empty);
    setFilters(empty);
    setStatusFilter("");
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
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];
  const allTasks = useMemo(() => {
    const raw = tasksRes?.tasks || [];
    return raw.map(t => {
      if (t.isTemplate) {
        return {
          ...t,
          status: t.isActive ? "active" : "stopped"
        };
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

    let passesStatus = true;
    if (filters.status) {
      const allowed = filters.status.split(",").map(s => s.trim().toLowerCase());
      passesStatus = allowed.includes((task.status || "").toLowerCase());
    }

    let passesPriority = true;
    if (filters.priority) {
      passesPriority = (task.priority || "medium").toLowerCase() === filters.priority.toLowerCase();
    }

    let passesDeadline = true;
    if (filters.deadlineFilter) {
      const raw = task.endDateTime || task.endDate || task.dueDate;
      const d = raw ? new Date(raw) : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

      if (filters.deadlineFilter === "today") {
        passesDeadline = d && d >= startOfToday && d <= endOfToday;
      } else if (filters.deadlineFilter === "tomorrow") {
        passesDeadline = d && d >= startOfTomorrow && d <= endOfTomorrow;
      } else if (filters.deadlineFilter === "overdue") {
        const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes((task.status || "").toLowerCase());
        passesDeadline = !isDone && d && d < now;
      }
    }

    let passesOverdue = true;
    if (filters.overdue) {
      const st = (task.status || "").toLowerCase();
      const done = ["complete", "completed", "done", "late_complete", "re_late_complete", "late-complete"].includes(st);
      const due = task.endDateTime ? new Date(task.endDateTime) : null;
      passesOverdue = !done && due && due < new Date();
    }

    return passesDate && passesDept && passesAssigned && passesStatus && passesPriority && passesDeadline && passesOverdue;
  }), [allTasks, activeTab, filters]);

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
    if (statusFilter) {
      const taskSt = (task.status || "pending").toLowerCase();
      if (taskSt !== statusFilter.toLowerCase()) return false;
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
  }), [tabFilteredTasks, statusFilter, searchQ]);

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

  // Calculate ONLY custom dropdown filters count (ignoring date tab filters)
  const activeCustomFiltersCount = useMemo(() => {
    return [filters.departmentId, filters.assignedTo, filters.priority, filters.deadlineFilter, filters.startDate, filters.endDate, filters.overdue].filter(Boolean).length;
  }, [filters.departmentId, filters.assignedTo, filters.priority, filters.deadlineFilter, filters.startDate, filters.endDate, filters.overdue]);

  const STATUS_CHIPS = Object.entries(STATUS_CONFIG)
    .map(([key, cfg]) => ({ key, ...cfg, count: statusCounts[key] || 0 }));

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
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">

      {/* ── Page Header & Fixed Height Action Toolbar ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Task Management
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Track team tasks, deadlines, assignments, and project deliverables
          </p>
        </div>

        {/* ── Action Toolbar ── */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Search Box */}
          <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-8 py-1.5 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all w-full sm:w-52 shadow-2xs"
            />
            {searchQ && (
              <button onClick={() => setSearchQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Grouped View Switcher & Action Container */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs h-9 overflow-x-auto hide-scrollbar max-w-full">
            {/* View Switcher Pills */}
            <div className="flex items-center bg-white dark:bg-[#111C24] p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-2xs gap-0.5 h-7">
              <button
                onClick={() => setViewMode("cards")}
                title="Grid Cards View"
                className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all ${
                  viewMode === "cards"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid size={13} /> <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                title="Kanban Board View"
                className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all ${
                  viewMode === "kanban"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Kanban size={13} /> <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Table List View"
                className={`flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <List size={13} /> <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 px-2.5 h-7 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0"
              title="Export tasks to CSV"
            >
              <Download size={13} className="text-slate-400" /> <span className="hidden xs:inline">Export</span>
            </button>

            {/* Advanced Filters Trigger */}
            <button
              onClick={handleOpenFilters}
              className={`flex items-center gap-1.5 px-3 h-8 border rounded-xl text-xs font-extrabold shadow-2xs transition-all shrink-0 cursor-pointer ${
                showFiltersDropdown || activeCustomFiltersCount > 0
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                  : "bg-white dark:bg-[#111C24] border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title="Filter Tasks"
            >
              <SlidersHorizontal size={13} className={showFiltersDropdown || activeCustomFiltersCount > 0 ? "text-slate-950" : "text-amber-600 dark:text-amber-400"} />
              <span>Filters</span>
              {activeCustomFiltersCount > 0 && (
                <span className="flex items-center justify-center min-w-[17px] h-[17px] px-1 bg-slate-900 text-white dark:bg-slate-900 dark:text-white text-[9.5px] rounded-full font-black ml-0.5">
                  {activeCustomFiltersCount}
                </span>
              )}
            </button>

            {/* Refresh Data */}
            <button onClick={() => refetch()} disabled={isFetching} className="w-7 h-7 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all shadow-2xs shrink-0" title="Refresh Tasks">
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""}/>
            </button>

            {/* Primary Action Button (+ New Task) with Crisp White Text */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 h-7 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={14} strokeWidth={3} /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Fixed Modal Dialog */}
      {showFiltersDropdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={() => setShowFiltersDropdown(false)}>
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 w-full max-w-md shadow-2xl rounded-2xl space-y-4 animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-500" />
                <span className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">Advanced Task Filters</span>
              </div>
              <button onClick={() => setShowFiltersDropdown(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={16}/>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
              <select className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2.5 px-3 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.departmentId} onChange={e => setTempFilters(prev => ({ ...prev, departmentId: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Assigned To / Member</label>
              <select className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2.5 px-3 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.assignedTo} onChange={e => setTempFilters(prev => ({ ...prev, assignedTo: e.target.value }))}>
                <option value="">All Members {employees.length > 0 ? `(${employees.length})` : ""}</option>
                {employees.map(e => {
                  const name = e.fullName || e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "Member";
                  const code = e.employeeCode ? ` (${e.employeeCode})` : "";
                  return <option key={e._id} value={e._id}>{name}{code}</option>;
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                <select className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2.5 px-2.5 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.priority} onChange={e => setTempFilters(prev => ({ ...prev, priority: e.target.value }))}>
                  <option value="">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                <select className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2.5 px-2.5 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.deadlineFilter} onChange={e => setTempFilters(prev => ({ ...prev, deadlineFilter: e.target.value }))}>
                  <option value="">All Deadlines</option>
                  <option value="today">Due Today</option>
                  <option value="tomorrow">Due Tomorrow</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2 px-2.5 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.startDate} onChange={e => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs font-semibold py-2 px-2.5 outline-none rounded-xl focus:border-amber-500 cursor-pointer shadow-2xs" value={tempFilters.endDate} onChange={e => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2.5">
              <button onClick={handleClearFilters} className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl transition-colors cursor-pointer">Reset All</button>
              <button onClick={handleApplyFilters} className="flex-1 text-xs font-extrabold text-white bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 shadow-md py-2.5 rounded-xl transition-colors cursor-pointer">Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top 5 KPI Summary Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 pt-1">
        <KPICard label="Total Tasks"     value={totalCount}     trend="14.2%" isUp period="last month" strokeColor="#EAB308" Icon={CheckSquare} iconBg="bg-amber-500/10"  iconColor="#D97706"/>
        <KPICard label="Pending Tasks"   value={pendingCount}   trend="8.1%"  isUp period="last month" strokeColor="#06B6D4" Icon={Clock}        iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="In Progress"     value={inProgressCount} trend="12.5%" isUp period="last month" strokeColor="#8B5CF6" Icon={Sparkles}     iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
        <KPICard label="Completed"       value={completedCount} trend="19.4%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle}  iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Overdue Tasks"   value={overdueCount}   trend="4.2%"  isUp={false} period="yesterday" strokeColor="#F43F5E" Icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="#E11D48" extraClass="col-span-2 sm:col-span-1"/>
      </div>

      {/* ── UNIFIED FILTER & TIMEFRAME CARD CONTAINER ─────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
        
        {/* ── Row 1: Time Boundary Date Pill Tabs ───────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {categoryCounts.map((cat) => {
            const isActive = activeTab === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => handleTabChange(cat.name)}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                    : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span>{cat.name}</span>
                {cat.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Row 2: Task Status Filter Pills (Directly below date pills) ────── */}
        {activeTab !== "Recurring" && (
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                !statusFilter
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                  : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
              }`}
            >
              <span>All Tasks</span>
              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                !statusFilter
                  ? "bg-white/20 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}>
                {tabFilteredTasks.length}
              </span>
            </button>

            {[
              {
                id: "pending",
                label: "Pending",
                count: statusCounts.pending || 0,
                pillInactive: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100/80 shadow-2xs",
                pillActive: "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30",
                badgeInactive: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "in_process",
                label: "In Process",
                count: statusCounts.in_process || 0,
                pillInactive: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100/80 shadow-2xs",
                pillActive: "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30",
                badgeInactive: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "re_pending",
                label: "Re-Pending",
                count: statusCounts.re_pending || 0,
                pillInactive: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-100/80 shadow-2xs",
                pillActive: "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/30",
                badgeInactive: "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "re_in_process",
                label: "Re-In Process",
                count: statusCounts.re_in_process || 0,
                pillInactive: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 hover:bg-cyan-100/80 shadow-2xs",
                pillActive: "bg-cyan-600 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-500/30",
                badgeInactive: "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "complete",
                label: "Completed",
                count: statusCounts.complete || 0,
                pillInactive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/80 shadow-2xs",
                pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30",
                badgeInactive: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "re_complete",
                label: "Re-Completed",
                count: statusCounts.re_complete || 0,
                pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs",
                pillActive: "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/30",
                badgeInactive: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "late_complete",
                label: "Late Completed",
                count: statusCounts.late_complete || 0,
                pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs",
                pillActive: "bg-teal-700 text-white border-teal-700 shadow-xs ring-2 ring-teal-600/30",
                badgeInactive: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "re_late_complete",
                label: "Re-Late Completed",
                count: statusCounts.re_late_complete || 0,
                pillInactive: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 hover:bg-teal-100/80 shadow-2xs",
                pillActive: "bg-teal-800 text-white border-teal-800 shadow-xs ring-2 ring-teal-700/30",
                badgeInactive: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "overdue",
                label: "Overdue",
                count: statusCounts.overdue || 0,
                pillInactive: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100/80 shadow-2xs",
                pillActive: "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30",
                badgeInactive: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200",
                badgeActive: "bg-white/20 text-white"
              },
              {
                id: "cancelled",
                label: "Cancelled",
                count: statusCounts.cancelled || 0,
                pillInactive: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 shadow-2xs",
                pillActive: "bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-500/30",
                badgeInactive: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200",
                badgeActive: "bg-white/20 text-white"
              },
            ].map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(prev => prev === st.id ? "" : st.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                    isSelected
                      ? st.pillActive
                      : st.pillInactive
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                    isSelected
                      ? st.badgeActive
                      : st.badgeInactive
                  }`}>
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active Filters Bar ────────────────────────────────────────── */}
      {activeCustomFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-2xl text-xs shadow-2xs">
          <span className="font-extrabold text-amber-950 dark:text-amber-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={13} className="text-amber-600 dark:text-amber-400" /> Active Filters:
          </span>

          {filters.departmentId && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs">
              Dept: {departments.find(d => String(d._id) === String(filters.departmentId))?.name || "Selected"}
              <button onClick={() => setFilters(prev => ({ ...prev, departmentId: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.assignedTo && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs">
              Assignee: {(() => {
                const emp = employees.find(e => String(e._id) === String(filters.assignedTo));
                return emp ? (emp.fullName || emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || "Selected") : "Selected";
              })()}
              <button onClick={() => setFilters(prev => ({ ...prev, assignedTo: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.priority && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs capitalize">
              Priority: {filters.priority}
              <button onClick={() => setFilters(prev => ({ ...prev, priority: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.deadlineFilter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs capitalize">
              Deadline: {filters.deadlineFilter.replace(/_/g, " ")}
              <button onClick={() => setFilters(prev => ({ ...prev, deadlineFilter: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.startDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs">
              From: {filters.startDate}
              <button onClick={() => setFilters(prev => ({ ...prev, startDate: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {filters.endDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] shadow-2xs">
              To: {filters.endDate}
              <button onClick={() => setFilters(prev => ({ ...prev, endDate: "" }))} className="hover:text-rose-600 transition-colors cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          <button
            onClick={() => { setFilters({ departmentId: "", assignedTo: "", priority: "", deadlineFilter: "", startDate: "", endDate: "", status: "", overdue: false }); setStatusFilter(""); }}
            className="text-xs font-black text-rose-600 hover:text-rose-800 underline ml-auto cursor-pointer"
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── Main Task View Content ───────────────────────────────────────────── */}
      {tasksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
          ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.map(task => (
            <TaskCard key={task._id} task={task} activeTab={activeTab} onClick={() => navigate(getTaskDetailsUrl(task._id))} />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        /* ── KANBAN BOARD VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] hide-scrollbar pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] font-medium text-slate-400">
                      No {col.title.toLowerCase()} tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard key={task._id} task={task} activeTab={activeTab} onClick={() => navigate(getTaskDetailsUrl(task._id))} />
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
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase flex items-center gap-2">
              <Layers size={14} className="text-amber-500" /> Tasks Pipeline Log
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {filteredTasks.length} tasks
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-[#111C24] border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
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
                  <TableRow key={task._id} task={task} activeTab={activeTab} onClick={() => navigate(getTaskDetailsUrl(task._id))} />
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