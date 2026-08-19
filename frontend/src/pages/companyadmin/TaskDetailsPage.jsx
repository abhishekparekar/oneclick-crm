import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaskByIdApi, updateTaskApi, toggleTaskTemplateApi, getEmployeesApi, deleteTaskApi } from "../../api/companyAdminApi";
import api from "../../api/api";
import { 
  X, Calendar, Clock, AlertCircle, FileText, CheckCircle, Edit3, Paperclip, 
  ChevronLeft, User, CalendarDays, BarChart, Flag, CheckSquare, ClipboardList,
  History, ArrowRight, Play, CheckCircle2, RotateCcw, Share2, HelpCircle,
  MessageSquare, Send, FileIcon, Plus, XCircle, Tag, Repeat, Trash2, Eye, Download
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { InProcessModal, CompleteModal, ReopenModal, ShiftModal } from "../../components/tasks/StatusModals";
import TaskEditModal from "../../components/tasks/TaskEditModal";
import TaskAttachmentField from "../../components/tasks/TaskAttachmentField";
import { toast } from "react-hot-toast";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

/* 
  Tailwind Safelist for dynamic gradients:
  bg-gradient-to-r from-blue-500 to-indigo-600
  from-orange-600 to-orange-700
  from-rose-500 to-red-600
  from-emerald-500 to-teal-600
  from-teal-600 to-teal-800
  from-indigo-500 to-purple-600
  from-cyan-500 to-blue-600
  from-slate-500 to-slate-600
*/
const STATUS_THEMES = {
  pending: {
    label: "Pending",
    bg: "bg-ca-bg text-blue-700 border-blue-150",
    dot: "bg-blue-500",
    banner: "from-blue-50 to-indigo-50 dark:from-blue-500 dark:to-indigo-600"
  },
  in_process: {
    label: "In Process",
    bg: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-700",
    banner: "from-orange-50 to-amber-50 dark:from-orange-600 dark:to-orange-700"
  },
  overdue: {
    label: "Overdue",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    banner: "from-rose-50 to-red-50 dark:from-rose-500 dark:to-red-600"
  },
  complete: {
    label: "Completed",
    bg: "bg-ca-bg text-emerald-700 border-ca-border",
    dot: "bg-ca-secondary",
    banner: "from-emerald-50 to-teal-50 dark:from-emerald-500 dark:to-teal-600"
  },
  late_complete: {
    label: "Late Completed",
    bg: "bg-teal-50 text-teal-850 border-teal-200",
    dot: "bg-teal-600",
    banner: "from-teal-50 to-cyan-50 dark:from-teal-600 dark:to-teal-800"
  },
  re_pending: {
    label: "Re-Pending",
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    banner: "from-indigo-50 to-purple-50 dark:from-indigo-500 dark:to-purple-600"
  },
  re_in_process: {
    label: "Re-In Process",
    bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
    banner: "from-cyan-50 to-blue-50 dark:from-cyan-500 dark:to-blue-600"
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-ca-bg text-ca-text-secondary border-ca-border",
    dot: "bg-slate-400",
    banner: "from-slate-50 to-slate-100 dark:from-slate-500 dark:to-slate-600"
  }
};

const TIMELINE_CONFIG = {
  created: {
    label: "Created",
    bg: "bg-ca-bg text-ca-text-secondary border-ca-border",
    iconColor: "text-ca-text-secondary",
    dotBg: "bg-ca-bg",
    border: "border-ca-border",
    icon: Plus
  },
  generated: {
    label: "Auto Generated",
    bg: "bg-violet-50 text-violet-700 border-violet-100",
    iconColor: "text-violet-600",
    dotBg: "bg-violet-100",
    border: "border-violet-200",
    icon: Plus
  },
  in_process: {
    label: "In Process",
    bg: "bg-ca-bg text-blue-700 border-blue-100",
    iconColor: "text-orange-700",
    dotBg: "bg-blue-100",
    border: "border-ca-border",
    icon: Play
  },
  re_in_process: {
    label: "Re-In Process",
    bg: "bg-cyan-50 text-cyan-700 border-cyan-100",
    iconColor: "text-cyan-600",
    dotBg: "bg-cyan-105",
    border: "border-cyan-200",
    icon: Play
  },
  completed: {
    label: "Completed",
    bg: "bg-ca-bg text-emerald-700 border-emerald-100",
    iconColor: "text-ca-secondary",
    dotBg: "bg-ca-bg",
    border: "border-ca-border",
    icon: CheckCircle2
  },
  late_completed: {
    label: "Completed Late",
    bg: "bg-teal-50 text-teal-850 border-teal-100",
    iconColor: "text-teal-650",
    dotBg: "bg-teal-100",
    border: "border-teal-200",
    icon: CheckCircle2
  },
  overdue: {
    label: "Overdue",
    bg: "bg-rose-50 text-rose-700 border-rose-100",
    iconColor: "text-rose-600",
    dotBg: "bg-rose-100",
    border: "border-rose-200",
    icon: AlertCircle
  },
  reopened: {
    label: "Reopened",
    bg: "bg-indigo-50 text-indigo-700 border-indigo-100",
    iconColor: "text-indigo-600",
    dotBg: "bg-indigo-100",
    border: "border-indigo-200",
    icon: RotateCcw
  },
  shifted: {
    label: "Shifted",
    bg: "bg-purple-50 text-purple-700 border-purple-100",
    iconColor: "text-purple-650",
    dotBg: "bg-purple-100",
    border: "border-purple-200",
    icon: Share2
  },
  comment_added: {
    label: "Comment Added",
    bg: "bg-ca-bg text-ca-text-secondary border-ca-border",
    iconColor: "text-ca-text-secondary",
    dotBg: "bg-ca-bg",
    border: "border-ca-border",
    icon: MessageSquare
  },
  follow_up: {
    label: "Follow Up",
    bg: "bg-indigo-50 text-indigo-700 border-indigo-100",
    iconColor: "text-indigo-600",
    dotBg: "bg-indigo-100",
    border: "border-indigo-200",
    icon: Calendar
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-ca-bg text-slate-655 border-ca-border",
    iconColor: "text-ca-text-secondary",
    dotBg: "bg-ca-border",
    border: "border-ca-border",
    icon: XCircle
  }
};

const getTimelineConfig = (action) => {
  const normalized = action?.toLowerCase() || "comment_added";
  if (normalized.includes("create")) return TIMELINE_CONFIG.created;
  if (normalized.includes("generate")) return TIMELINE_CONFIG.generated;
  if (normalized.includes("in_process") || normalized.includes("in-process") || normalized.includes("in_progress") || normalized.includes("in-progress")) {
    return normalized.includes("re") ? TIMELINE_CONFIG.re_in_process : TIMELINE_CONFIG.in_process;
  }
  if (normalized.includes("complete")) {
    const isLate = normalized.includes("late");
    return isLate ? TIMELINE_CONFIG.late_completed : TIMELINE_CONFIG.completed;
  }
  if (normalized.includes("overdue")) return TIMELINE_CONFIG.overdue;
  if (normalized.includes("reopen")) return TIMELINE_CONFIG.reopened;
  if (normalized.includes("shift")) return TIMELINE_CONFIG.shifted;
  if (normalized.includes("follow")) return TIMELINE_CONFIG.follow_up;
  if (normalized.includes("cancel")) return TIMELINE_CONFIG.cancelled;
  return TIMELINE_CONFIG.comment_added;
};

const safeDecodeURIComponent = (str) => {
  try {
    return decodeURIComponent(str || "");
  } catch (e) {
    return str || "Attachment";
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-ca-bg text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

const MiniAvatar = ({ name, size = "w-7 h-7", textSize = "text-[10px]" }) => {
  const code = (name || "?").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = AVATAR_COLORS[code % AVATAR_COLORS.length];
  return (
    <div className={`${size} rounded-full ${color} flex items-center justify-center font-bold ${textSize} flex-shrink-0 border border-ca-border shadow-sm`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

/* ── Schedule Follow-up Modal ── */
function FollowUpModal({ isOpen, onClose, taskId }) {
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remark, setRemark] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nextFollowUpDate) {
      toast.error("Please select a follow up date");
      return;
    }
    try {
      setLoading(true);
      await api.post(`/tasks/${taskId}/submit-followup`, {
        nextFollowUpDate,
        remark,
        attachments
      });
      toast.success("Follow-up scheduled successfully");
      queryClient.invalidateQueries(["task", taskId]);
      queryClient.invalidateQueries(["tasks"]);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-ca-surface rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-ca-border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border">
          <h3 className="font-extrabold text-ca-text text-xs uppercase tracking-wider">Schedule Next Follow-Up</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-ca-hover rounded-lg text-ca-text-secondary hover:text-slate-650 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">Next Follow-Up Date</label>
            <input 
              required
              type="date"
              value={nextFollowUpDate}
              onChange={e => setNextFollowUpDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full bg-ca-bg border border-ca-border rounded-xl p-2.5 text-xs text-ca-text-secondary focus:outline-none focus:ring-2 focus:ring-orange-700/15 focus:border-orange-700 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">Remark / Update Note</label>
            <textarea 
              value={remark}
              onChange={e => setRemark(e.target.value)}
              className="w-full bg-ca-bg border border-ca-border rounded-xl p-2.5 text-xs text-ca-text-secondary focus:outline-none focus:ring-2 focus:ring-orange-700/15 focus:border-orange-700 min-h-[70px] resize-none transition-all"
              placeholder="Write why you are scheduling the follow-up..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ca-text-secondary uppercase tracking-wider">Attachments</label>
            <TaskAttachmentField attachments={attachments} onChange={setAttachments} compact={true} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-ca-border">
            <button type="button" onClick={onClose} className="bg-ca-bg hover:bg-ca-hover text-ca-text-secondary px-4 py-2 rounded-xl text-xs font-bold transition-all">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
            >
              {loading ? "Scheduling..." : "Schedule Date"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const getBackUrl = () => {
    const role = (user?.role || "").toLowerCase().replace(/\s+/g, "");
    if (role.includes("admin") || role.includes("companyadmin")) return "/company/tasks";
    if (role.includes("manager") || role.includes("teamleader")) return "/manager/team-tasks";
    if (role.includes("employee")) return "/employee/my-tasks";
    return "/company/tasks";
  };

  // Modals state
  const [showInProcess, setShowInProcess] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [showShift, setShowShift] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  // Comments state
  const [commentText, setCommentText] = useState("");
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [commentMutating, setCommentMutating] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: taskRes, isLoading, error } = useQuery({
    queryKey: ["task", id],
    queryFn: () => getTaskByIdApi(id).then(res => res.data),
    enabled: !!id,
  });

  const { data: employeesRes } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesApi,
  });

  const employees = employeesRes?.data?.employees || [];
  const task = taskRes?.data?.task;
  const timeline = taskRes?.data?.timeline || [];

  const updateMutation = useMutation({
    mutationFn: (payload) => updateTaskApi(task?._id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", id]);
      queryClient.invalidateQueries(["tasks"]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTaskApi(id),
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries(["tasks"]);
      navigate(getBackUrl());
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate();
    }
  };

  const handleToggleRecurring = async () => {
    try {
      setSubmitting(true);
      const res = await toggleTaskTemplateApi(id);
      if (res.data?.success) {
        toast.success(res.data.message || "Task status updated");
        queryClient.invalidateQueries(["task", id]);
        queryClient.invalidateQueries(["tasks"]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error toggling recurring task.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecklistItem = (index) => {
    if (!task) return;
    const newChecklist = [...task.checklist];
    newChecklist[index].isCompleted = !newChecklist[index].isCompleted;
    updateMutation.mutate({ checklist: newChecklist });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;
    try {
      setCommentMutating(true);
      await api.post(`/tasks/${id}/comments`, {
        comment: commentText,
        attachments: commentAttachments
      });
      toast.success("Comment/Note added successfully");
      setCommentText("");
      setCommentAttachments([]);
      queryClient.invalidateQueries(["task", id]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment/note");
    } finally {
      setCommentMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-700"></div>
        <p className="text-ca-text-secondary text-sm font-medium">Loading task details...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-ca-surface p-8 rounded-3xl border border-ca-border shadow-sm text-center">
        <AlertCircle size={40} className="text-orange-700 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ca-text mb-2">Task Not Found</h2>
        <p className="text-ca-text-secondary text-sm mb-3">The task details could not be loaded or the task doesn't exist.</p>
        <button onClick={() => navigate(getBackUrl())} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto">
          <ChevronLeft size={16} /> Back to Tasks
        </button>
      </div>
    );
  }

  const theme = STATUS_THEMES[task.status] || STATUS_THEMES.pending;

  return (
    <div className="max-w-7xl mx-auto space-y-3 pb-20">
      
      {/* ── Top Bar & Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 rounded-xl px-4 py-2.5 shadow-md border border-slate-800 relative overflow-hidden">
        {/* Subtle glow inside header */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={() => navigate(getBackUrl())}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-300 shrink-0 shadow-sm"
            title="Back to Tasks"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">
              <span>Task Management</span>
              <span className="opacity-50">/</span>
              <span className="text-slate-300">{task.taskId || "Details"}</span>
            </div>
            <h1 className="text-[17px] font-bold text-white leading-none tracking-tight">Task Overview</h1>
          </div>
        </div>

        {/* ── Action buttons aligned horizontally on the right ── */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto relative z-10">
          {/* Edit Task Button */}
          {(task.status === "pending" || task.status === "re_pending") && (
            <button 
              onClick={() => setShowEdit(true)} 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all"
            >
              <Edit3 size={12} className="text-slate-400" />
              <span>Edit Task</span>
            </button>
          )}

          {/* Add Next Follow-up Date Button */}
          {!task.isTemplate && (task.status !== "complete" && task.status !== "late_complete" && task.status !== "cancelled") && (
            <button 
              onClick={() => setShowFollowUp(true)} 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all"
            >
              <CalendarDays size={12} className="text-slate-400" />
              <span>Schedule Follow-up</span>
            </button>
          )}

          {/* Stop / Resume Recurring Task */}
          {task.isTemplate && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
            <button 
              onClick={handleToggleRecurring} 
              disabled={submitting}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border shadow-sm ${task.isActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
            >
              <AlertCircle size={12} /> 
              <span>{task.isActive ? "Stop Recurring" : "Resume Recurring"}</span>
            </button>
          )}

          {/* Mark In-Process */}
          {!task.isTemplate && (task.status === "pending" || task.status === "re_pending" || task.status === "overdue") && (
            <button onClick={() => setShowInProcess(true)} className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm">
              <Play size={12} /> <span>Mark In-Process</span>
            </button>
          )}
          
          {/* Mark Complete */}
          {(task.status === "in_process" || task.status === "re_in_process") && (
            <button onClick={() => setShowComplete(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm">
              <CheckCircle2 size={12} /> <span>Mark Complete</span>
            </button>
          )}

          {/* Late Complete */}
          {task.status === "overdue" && (
            <button onClick={() => setShowComplete(true)} className="bg-orange-600 hover:bg-orange-500 text-white border border-orange-500 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm">
              <AlertCircle size={12} /> <span>Late Complete</span>
            </button>
          )}

          {/* Shift Task */}
          {!task.isTemplate && (task.status === "pending" || task.status === "in_process" || task.status === "overdue" || task.status === "re_pending" || task.status === "re_in_process") && 
           (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
            <button onClick={() => setShowShift(true)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm">
              <Share2 size={12} className="text-slate-400" /> <span>Shift Task</span>
            </button>
          )}

          {/* Re-open Task */}
          {!task.isTemplate && (task.status === "complete" || task.status === "late_complete") && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
            <button onClick={() => setShowReopen(true)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm">
              <RotateCcw size={12} className="text-slate-400" /> <span>Re-open Task</span>
            </button>
          )}

          {/* Delete Task Button */}
          {(user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && task.status !== "cancelled" && (
            <button 
              onClick={handleDelete} 
              disabled={deleteMutation.isLoading}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all"
            >
              <Trash2 size={12} />
              <span>{deleteMutation.isLoading ? "Deleting..." : "Delete Task"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Highlight Banner ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 py-2 px-3.5 rounded-xl bg-gradient-to-r ${theme.banner} shadow-sm border border-black/5 dark:border-white/10 transition-all relative overflow-hidden`}>

        <div className="flex items-center gap-2.5 relative z-10">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/10 shadow-sm text-slate-700 dark:text-white`}>
            {task.status === 'complete' || task.status === 'late_complete' ? <CheckCircle2 size={16} /> :
             task.status === 'overdue' ? <AlertCircle size={16} /> :
             task.status === 'in_process' || task.status === 're_in_process' ? <Play size={16} /> :
             task.status === 'cancelled' ? <XCircle size={16} /> :
             <Clock size={16} />}
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/70 mb-0">Current Task Status</div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap leading-tight">
              <span className="text-sm font-bold capitalize text-slate-800 dark:text-white">{theme?.label || "Status"}</span>
            </div>
          </div>
        </div>

        {/* Status Description (Right Side) */}
        <div className="relative z-10 flex items-center gap-1.5 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-md border border-black/5 dark:border-white/10 shadow-sm ml-10 md:ml-0 w-fit">
          <span className="text-slate-400 dark:text-white/50 text-[11px] hidden md:inline">•</span>
          <span className="text-[13px] font-medium text-slate-700 dark:text-white/95">
            {task.status === 'pending' || task.status === 're_pending' ? 'Task is queued. Awaiting workflow progress action.' :
             task.status === 'in_process' || task.status === 're_in_process' ? 'Staff members are actively working on this task.' :
             task.status === 'overdue' ? 'Attention: This task has exceeded its scheduled deadline!' :
             task.status === 'complete' || task.status === 'late_complete' ? 'Task is verified and closed successfully.' :
             'This task has been cancelled.'}
          </span>
        </div>
      </div>

      {/* ── Main Workspace Grid (Left: Static Details, Right: Logs & Timelines) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left Column: Task Details & Metadata (5/12) */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* Main Info Box */}
          <div className="bg-ca-surface rounded-[2rem] p-8 shadow-sm border border-ca-border space-y-7 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 dark:from-primary-600 dark:via-orange-700 dark:to-primary-700" />
              
              {/* Task Title & Status Badging */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-black text-ca-text-secondary bg-ca-bg px-2.5 py-1 rounded-lg border border-ca-border/60 font-mono tracking-widest uppercase shadow-sm">
                    {task.taskId || "TASK"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${theme?.bg || ""}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${theme?.dot || ""}`} />
                    {theme?.label || "Status"}
                  </span>
                  {task.isTemplate && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-ca-bg text-violet-600 dark:text-violet-400 border border-ca-border text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                      <Repeat size={10} /> Recurring
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-ca-text tracking-tight leading-snug">{task.title}</h2>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <ClipboardList size={14} className="text-ca-text-secondary" />
                  Description
                </h3>
                <div className="bg-ca-bg rounded-2xl p-4 border border-ca-border/60 text-ca-text text-[13px] font-medium leading-relaxed whitespace-pre-line shadow-inner">
                  {task.description || "No description provided."}
                </div>
              </div>

              {/* Subtasks Checklist */}
              {task.checklist && task.checklist.length > 0 && (
                <div className="pt-6 border-t border-ca-border/40 space-y-3">
                  <h3 className="text-[11px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-ca-text-secondary" />
                    Subtasks Checklist
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {task.checklist.map((item, idx) => (
                      <label 
                        key={idx} 
                        className={`flex items-start gap-3 p-3.5 bg-ca-bg border border-ca-border/60 rounded-2xl cursor-pointer hover:border-orange-700 transition-all shadow-sm ${item.isCompleted ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-orange-700 focus:ring-orange-700/20 w-4 h-4 cursor-pointer border-ca-border"
                          checked={item.isCompleted || false}
                          onChange={() => toggleChecklistItem(idx)}
                        />
                        <span className={`text-[13px] ${item.isCompleted ? 'text-ca-text-secondary line-through font-medium' : 'text-ca-text font-bold'}`}>
                          {item.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="pt-4 border-t border-ca-border/40 space-y-2">
                  <h3 className="text-[10px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-1">
                    <Paperclip size={12} className="text-ca-text-secondary" />
                    Task Attachments ({task.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {task.attachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 bg-ca-bg border border-ca-border/60 rounded-xl hover:border-amber-500/50 transition-all shadow-sm"
                      >
                        <div 
                          onClick={() => setSelectedFileForPreview(att)}
                          className="flex items-center space-x-2.5 cursor-pointer min-w-0 flex-1 pr-2"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Paperclip size={13} className="text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-ca-text font-bold truncate hover:text-amber-600 transition-colors">
                              {safeDecodeURIComponent(att.fileName)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedFileForPreview(att)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Preview File"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          {/* Compact Details Metadata Card */}
          <div className="bg-ca-surface rounded-[2rem] p-7 shadow-sm border border-ca-border space-y-5">
            <h3 className="text-[11px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-ca-border/40">
              <ClipboardList size={16} className="text-ca-text-secondary" />
              Task Details
            </h3>
            
            {/* Compact Key-Value Grid */}
            <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-4 text-[13px] leading-normal">
              
              <div className="flex items-center gap-1.5 text-ca-text-secondary font-black uppercase tracking-widest text-[9px]">
                <User size={13} className="text-ca-text-secondary shrink-0" />
                <span>Assigned To</span>
              </div>
              <div className="font-bold text-ca-text truncate">
                {task.assignedTo?.filter(Boolean).map(a => `${a.firstName || ""} ${a.lastName || ""}`).join(", ") || "Unassigned"}
              </div>

              <div className="flex items-center gap-1.5 text-ca-text-secondary font-black uppercase tracking-widest text-[9px]">
                <User size={13} className="text-ca-text-secondary shrink-0" />
                <span>Assigned By</span>
              </div>
              <div className="font-bold text-ca-text truncate">
                {task.assignedBy ? `${task.assignedBy.firstName || ""} ${task.assignedBy.lastName || ""}`.trim() || task.assignedBy.name : "System"}
              </div>

              {task.departmentId?.name && (
                <>
                  <div className="flex items-center gap-1.5 text-ca-text-secondary font-black uppercase tracking-widest text-[9px]">
                    <Tag size={13} className="text-ca-text-secondary shrink-0" />
                    <span>Department</span>
                  </div>
                  <div className="font-bold text-ca-text">
                    <span className="inline-flex items-center gap-1 bg-ca-bg px-2 py-0.5 rounded-lg border border-ca-border/60">
                      {task.departmentId.name}
                    </span>
                  </div>
                </>
              )}

              {task.priority && (
                <>
                  <div className="flex items-center gap-1.5 text-ca-text-secondary font-black uppercase tracking-widest text-[9px]">
                    <AlertCircle size={13} className="text-ca-text-secondary shrink-0" />
                    <span>Priority</span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border ${task.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' : task.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' : 'bg-ca-bg dark:bg-emerald-950/40 text-ca-secondary dark:text-emerald-400 border-ca-border dark:border-emerald-800'}`}>
                      {task.priority}
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center gap-1.5 text-ca-text-secondary font-bold uppercase tracking-wider text-[9px]">
                <CalendarDays size={13} className="text-ca-text-secondary shrink-0" />
                <span>Start Date</span>
              </div>
              <div className="font-extrabold text-ca-text">{formatDate(task.startDateTime || task.startDate)}</div>

              <div className="flex items-center gap-1.5 text-ca-text-secondary font-bold uppercase tracking-wider text-[9px]">
                <CalendarDays size={13} className="text-ca-text-secondary shrink-0" />
                <span>Deadline</span>
              </div>
              <div className="font-extrabold text-rose-600 dark:text-rose-400">{formatDate(task.endDateTime || task.endDate || task.finishDate)}</div>

              {/* Show Next Follow-up Date if set */}
              {task.nextFollowUpDate && (
                <>
                  <div className="flex items-center gap-1.5 text-ca-text-secondary font-bold uppercase tracking-wider text-[9px]">
                    <CalendarDays size={13} className="text-ca-text-secondary shrink-0" />
                    <span>Next Follow-up</span>
                  </div>
                  <div className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatDate(task.nextFollowUpDate)}</div>
                </>
              )}

              {task.isTemplate && (
                <>
                  <div className="flex items-center gap-1.5 text-ca-text-secondary font-bold uppercase tracking-wider text-[9px]">
                    <RotateCcw size={13} className="text-ca-text-secondary shrink-0" />
                    <span>Repeat Type</span>
                  </div>
                  <div className="font-bold text-ca-text capitalize">{task.repeatType || "Recurring"}</div>
                  
                  {task.finishDate && (
                    <>
                      <div className="flex items-center gap-1.5 text-ca-text-secondary font-bold uppercase tracking-wider text-[9px]">
                        <CalendarDays size={13} className="text-ca-text-secondary shrink-0" />
                        <span>Finish Date</span>
                      </div>
                      <div className="font-bold text-ca-text">{formatDate(task.finishDate)}</div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Note Logs & Activities (7/12) */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Compact Notes & Activity logs */}
          <div className="bg-ca-surface rounded-[2rem] p-7 shadow-sm border border-ca-border space-y-3">
            <div className="flex items-center justify-between pb-4 border-b border-ca-border/40">
              <h3 className="text-[11px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={16} className="text-ca-text-secondary" />
                Notes & Activity Logs ({task.comments?.length || 0})
              </h3>
            </div>

            {/* Comment Submission Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <div className="bg-ca-bg border border-ca-border/60 rounded-2xl overflow-hidden focus-within:border-orange-700 transition-all shadow-inner">
                <textarea 
                  required
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="w-full bg-transparent p-3 text-xs text-ca-text placeholder-ca-text-secondary focus:outline-none min-h-[60px] resize-none leading-relaxed font-medium"
                  placeholder="Write a note, follow-up remark, or comment..."
                />
                
                {/* Horizontal Action Bar inside the Textarea card */}
                <div className="flex items-center justify-between border-t border-ca-border/40 px-3 py-2.5 bg-ca-surface">
                  {/* Compact Attach File button */}
                  <TaskAttachmentField attachments={commentAttachments} onChange={setCommentAttachments} compact={true} />
                  
                  <button 
                    type="submit" 
                    disabled={commentMutating || (!commentText.trim() && commentAttachments.length === 0)}
                    className="btn bg-orange-700 dark:bg-emerald-500 hover:bg-orange-700/95 dark:hover:bg-emerald-400 text-white dark:text-black font-black text-xs px-4 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md dark:shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Send size={11} />
                    <span>{commentMutating ? "Saving..." : "Add Note"}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Comment List */}
            {(!task.comments || task.comments.length === 0) ? (
              <p className="text-ca-text-secondary text-xs text-center py-4">No notes or comments added yet.</p>
            ) : (
              <div className="space-y-3">
                {Array.isArray(task.comments) && [...task.comments].reverse().map((c, idx) => (
                  <div key={c._id || idx} className="flex items-start gap-3 p-3.5 bg-ca-bg border border-ca-border/60 rounded-xl shadow-sm">
                    <MiniAvatar name={c.senderName} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div>
                          <span className="font-extrabold text-ca-text text-[12px]">{c.senderName}</span>
                          <span className="text-[8px] uppercase font-black bg-ca-surface text-orange-700 border border-ca-border px-1.5 py-0.5 rounded ml-1.5 tracking-wider">
                            {c.senderRole}
                          </span>
                        </div>
                        <span className="text-[9px] text-ca-text-secondary font-bold">{formatDate(c.createdAt)} {formatTime(c.createdAt)}</span>
                      </div>
                      
                      <p className="text-xs text-ca-text leading-relaxed break-words whitespace-pre-line font-medium">{c.comment}</p>
                      
                      {/* Comment attachments list */}
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-ca-border/40">
                          {c.attachments.map((att, attIdx) => (
                            <a 
                              key={attIdx} 
                              href={att.fileUrl || att.fileData || "#"} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center space-x-2 p-1.5 bg-ca-surface border border-ca-border rounded-lg hover:border-orange-700 transition-all shadow-sm"
                            >
                              <Paperclip size={11} className="text-orange-700 shrink-0" />
                              <span className="text-[10px] text-ca-text font-bold truncate flex-1">{safeDecodeURIComponent(att.fileName)}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline Card */}
          <div className="bg-ca-surface rounded-[2rem] p-7 shadow-sm border border-ca-border space-y-3">
            <h3 className="text-[11px] font-black text-ca-text-secondary uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-ca-border/40">
              <History size={16} className="text-ca-text-secondary" />
              Activity Timeline
            </h3>
            
            {(!timeline || timeline.length === 0) ? (
              <p className="text-ca-text-secondary text-sm text-center py-3">No workflow activities logged yet.</p>
            ) : (
              <div className="relative pl-8 space-y-5 before:absolute before:inset-y-2 before:left-[15px] before:w-0.5 before:bg-ca-border">
                {Array.isArray(timeline) && timeline.map((act) => {
                  const actType = act.action || "";
                  const cfg = getTimelineConfig(actType) || TIMELINE_CONFIG.comment_added;
                  const Icon = cfg.icon;
                  
                  return (
                    <div key={act._id} className="relative group">
                      {/* Stepper Icon Node */}
                      <span className={`absolute -left-[32px] top-0.5 w-8 h-8 rounded-full border-2 border-ca-surface bg-ca-bg flex items-center justify-center shadow-sm ring-4 ring-ca-bg/50 ${cfg.border} transition-transform group-hover:scale-105 duration-200`}>
                        <div className={`w-6 h-6 rounded-full ${cfg.dotBg} flex items-center justify-center ${cfg.iconColor}`}>
                          {Icon && <Icon size={11} />}
                        </div>
                      </span>
                      
                      <div className="space-y-1">
                        {/* Title Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-ca-text font-semibold inline-flex items-center gap-1">
                            <User size={11} className="text-ca-text-secondary shrink-0" />
                            {act.performedBy?.name || "System"}
                          </span>
                          <span className="text-[9px] text-ca-text-secondary font-bold ml-auto inline-flex items-center gap-1">
                            <Clock size={10} className="text-ca-text-secondary shrink-0" />
                            {formatDate(act.createdAt)} {formatTime(act.createdAt)}
                          </span>
                        </div>

                        {/* Remarks Box */}
                        {act.remarks && (
                          <div className="bg-ca-bg border border-ca-border/60 rounded-xl p-2.5 text-xs text-ca-text leading-relaxed max-w-2xl whitespace-pre-line shadow-sm font-medium">
                            {act.remarks}
                          </div>
                        )}
                        
                        {/* Attachments if any */}
                        {act.attachments && act.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {act.attachments.map((att, attIdx) => (
                              <a 
                                key={attIdx} 
                                href={att.fileUrl || att.fileData || "#"} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 px-2 py-1 bg-ca-bg border border-ca-border/60 rounded-lg hover:border-orange-700 text-[9px] font-bold text-ca-text transition-colors shadow-sm"
                              >
                                <Paperclip size={9} className="text-orange-700 shrink-0" />
                                <span className="truncate max-w-[120px]">{safeDecodeURIComponent(att.fileName)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Action Popups */}
      {task && <InProcessModal isOpen={showInProcess} onClose={() => setShowInProcess(false)} task={task} />}
      {task && <CompleteModal isOpen={showComplete} onClose={() => setShowComplete(false)} task={task} isLate={task.status === "overdue"} />}
      {task && <ReopenModal isOpen={showReopen} onClose={() => setShowReopen(false)} task={task} />}
      {task && <ShiftModal isOpen={showShift} onClose={() => setShowShift(false)} task={task} employees={employees} />}
      {task && <FollowUpModal isOpen={showFollowUp} onClose={() => setShowFollowUp(false)} taskId={task._id} />}
      {task && showEdit && (
        <TaskEditModal 
          isOpen={showEdit} 
          onClose={() => setShowEdit(false)} 
          task={task} 
        />
      )}

      {selectedFileForPreview && (
        <AttachmentViewerModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
        />
      )}
    </div>
  );
}
