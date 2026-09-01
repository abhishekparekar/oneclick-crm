import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaskByIdApi, updateTaskApi, toggleTaskTemplateApi, getEmployeesApi, deleteTaskApi } from "../../api/companyAdminApi";
import api from "../../api/api";
import { 
  X, Calendar, Clock, AlertCircle, FileText, CheckCircle, Edit3, Paperclip, 
  ChevronLeft, User, CalendarDays, BarChart, Flag, CheckSquare, ClipboardList,
  History, ArrowRight, Play, CheckCircle2, RotateCcw, Share2, HelpCircle,
  MessageSquare, Send, FileIcon, Plus, XCircle, Tag, Repeat, Trash2, Eye, Download,
  Sparkles, ShieldCheck, Layers
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { InProcessModal, CompleteModal, ReopenModal, ShiftModal } from "../../components/tasks/StatusModals";
import TaskEditModal from "../../components/tasks/TaskEditModal";
import TaskStatusModal from "../../components/tasks/TaskStatusModal";
import TaskAttachmentField from "../../components/tasks/TaskAttachmentField";
import { toast } from "react-hot-toast";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

const STATUS_THEMES = {
  pending: { label: "Pending", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", dot: "bg-blue-500", banner: "from-blue-500/10 via-indigo-500/10 to-transparent" },
  in_process: { label: "In Process", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500", banner: "from-amber-500/10 via-orange-500/10 to-transparent" },
  overdue: { label: "Overdue", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800", dot: "bg-rose-500", banner: "from-rose-500/10 via-red-500/10 to-transparent" },
  complete: { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", banner: "from-emerald-500/10 via-teal-500/10 to-transparent" },
  late_complete: { label: "Late Completed", bg: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800", dot: "bg-teal-500", banner: "from-teal-500/10 via-cyan-500/10 to-transparent" },
  re_pending: { label: "Re-Pending", bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-500", banner: "from-indigo-500/10 via-purple-500/10 to-transparent" },
  re_in_process: { label: "Re-In Process", bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800", dot: "bg-cyan-500", banner: "from-cyan-500/10 via-blue-500/10 to-transparent" },
  cancelled: { label: "Cancelled", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700", dot: "bg-slate-400", banner: "from-slate-500/10 via-slate-600/10 to-transparent" }
};

const TIMELINE_CONFIG = {
  created: { label: "Created", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700", iconColor: "text-slate-500", dotBg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-700", icon: Plus },
  generated: { label: "Auto Generated", bg: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800", iconColor: "text-violet-600", dotBg: "bg-violet-100 dark:bg-violet-900/40", border: "border-violet-200 dark:border-violet-800", icon: Plus },
  in_process: { label: "In Process", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800", iconColor: "text-amber-600", dotBg: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-200 dark:border-amber-800", icon: Play },
  re_in_process: { label: "Re-In Process", bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800", iconColor: "text-cyan-600", dotBg: "bg-cyan-100 dark:bg-cyan-900/40", border: "border-cyan-200 dark:border-cyan-800", icon: Play },
  completed: { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", iconColor: "text-emerald-600", dotBg: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
  late_completed: { label: "Completed Late", bg: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800", iconColor: "text-teal-600", dotBg: "bg-teal-100 dark:bg-teal-900/40", border: "border-teal-200 dark:border-teal-800", icon: CheckCircle2 },
  overdue: { label: "Overdue", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800", iconColor: "text-rose-600", dotBg: "bg-rose-100 dark:bg-rose-900/40", border: "border-rose-200 dark:border-rose-800", icon: AlertCircle },
  reopened: { label: "Reopened", bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800", iconColor: "text-indigo-600", dotBg: "bg-indigo-100 dark:bg-indigo-900/40", border: "border-indigo-200 dark:border-indigo-800", icon: RotateCcw },
  shifted: { label: "Shifted", bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800", iconColor: "text-purple-600", dotBg: "bg-purple-100 dark:bg-purple-900/40", border: "border-purple-200 dark:border-purple-800", icon: Share2 },
  comment_added: { label: "Comment Added", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700", iconColor: "text-slate-500", dotBg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700", icon: MessageSquare },
  follow_up: { label: "Follow Up", bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800", iconColor: "text-indigo-600", dotBg: "bg-indigo-100 dark:bg-indigo-900/40", border: "border-indigo-200 dark:border-indigo-800", icon: Calendar },
  cancelled: { label: "Cancelled", bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700", iconColor: "text-slate-500", dotBg: "bg-slate-200 dark:border-slate-700", border: "border-slate-200 dark:border-slate-700", icon: XCircle }
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

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const MiniAvatar = ({ name, size = "w-6 h-6", textSize = "text-[9.5px]" }) => {
  return (
    <div className={`${size} rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-white flex items-center justify-center font-black ${textSize} shrink-0 shadow-2xs`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

/* ── Follow-Up Modal ── */
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#111C24] rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Schedule Next Follow-Up</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Next Follow-Up Date &amp; Time *</label>
            <input 
              required
              type="datetime-local"
              value={nextFollowUpDate}
              onChange={e => setNextFollowUpDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Remark / Update Note</label>
            <textarea 
              value={remark}
              onChange={e => setRemark(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 min-h-[60px] resize-none font-semibold"
              placeholder="Write why you are scheduling this follow-up..."
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Attachments</label>
            <TaskAttachmentField attachments={attachments} onChange={setAttachments} compact={true} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
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
  const [showStatusModal, setShowStatusModal] = useState(false);
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
    queryKey: ["employees", "tasks"],
    queryFn: () => getEmployeesApi({ module: "tasks", limit: 1000 }),
  });

  const employees = employeesRes?.data?.employees || [];
  const task = taskRes?.data?.task;
  const timeline = taskRes?.data?.timeline || [];

  const updateStatusMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch(`/tasks/${id}/status`, payload);
      return res.data;
    },
    onSuccess: () => {
      setShowStatusModal(false);
      toast.success("Task status updated successfully!");
      queryClient.invalidateQueries(["task", id]);
      queryClient.invalidateQueries(["tasks"]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  });

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
    if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
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
      toast.success("Note added successfully");
      setCommentText("");
      setCommentAttachments([]);
      queryClient.invalidateQueries(["task", id]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setCommentMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-2 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <p className="text-xs font-medium">Loading task overview...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white dark:bg-[#111C24] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
        <AlertCircle size={32} className="text-amber-500 mx-auto mb-2" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Task Not Found</h2>
        <p className="text-xs text-slate-400 mb-4">The task details could not be loaded or the task does not exist.</p>
        <button onClick={() => navigate(getBackUrl())} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs cursor-pointer">
          Back to Tasks
        </button>
      </div>
    );
  }

  const theme = STATUS_THEMES[task.status] || STATUS_THEMES.pending;
  const completedChecklistCount = (task.checklist || []).filter(c => c.isCompleted).length;
  const totalChecklistCount = (task.checklist || []).length;

  return (
    <div className="space-y-2.5 pb-6 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <ChevronLeft size={13} /> Back
          </button>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {task.taskId || "TSK"}
            </span>
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
              {task.title}
            </h1>
            <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs ${theme.bg}`}>
              {theme.label}
            </span>
            {task.isTemplate && (
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Recurring
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-start sm:self-auto">
          {(task.status === "pending" || task.status === "re_pending") && (
            <button 
              onClick={() => setShowEdit(true)} 
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Edit3 size={11} className="text-slate-400" />
              <span>Edit</span>
            </button>
          )}

          {/* Status Actions */}
          {!task.isTemplate && !["complete", "completed", "late_complete", "late_completed", "re_complete", "re_completed", "re_late_complete", "re_late_completed", "cancelled", "cancel"].includes((task.status || "").toLowerCase().replace(/-/g, "_")) ? (
            <button 
              onClick={() => setShowStatusModal(true)} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1268D9] hover:bg-[#0D50B8] text-white rounded-xl text-xs font-black shadow-md shadow-[#1268D9]/25 transition-all cursor-pointer"
            >
              <Layers size={13} />
              <span>Update Status</span>
            </button>
          ) : !task.isTemplate ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black shadow-2xs">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>
                {(task.status || "").toLowerCase().includes("late")
                  ? "Late Completed"
                  : (task.status || "").toLowerCase().includes("cancel")
                  ? "Cancelled"
                  : "Task Completed"}
              </span>
            </div>
          ) : null}

          {/* Admin / Manager Reopen Option for completed tasks */}
          {!task.isTemplate && ["complete", "completed", "late_complete", "late_completed", "re_complete", "re_completed", "re_late_complete", "re_late_completed"].includes((task.status || "").toLowerCase().replace(/-/g, "_")) && 
           (user?.role === "Admin" || user?.role === "CompanyAdmin" || user?.role === "Manager") && (
            <button 
              onClick={() => setShowReopen(true)} 
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw size={11} />
              <span>Reopen</span>
            </button>
          )}

          {!task.isTemplate && (task.status === "pending" || task.status === "in_process" || task.status === "overdue" || task.status === "re_pending" || task.status === "re_in_process") && 
           (user?.role === "Admin" || user?.role === "CompanyAdmin" || user?.role === "Manager") && (
            <button 
              onClick={() => setShowShift(true)} 
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Share2 size={11} className="text-slate-400" />
              <span>Shift</span>
            </button>
          )}

          {(user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && task.status !== "cancelled" && (
            <button 
              onClick={handleDelete} 
              disabled={deleteMutation.isLoading}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Trash2 size={11} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          <div className="lg:col-span-5 p-3 sm:p-3.5 space-y-2.5 bg-white dark:bg-[#111C24]">
            
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-amber-600 dark:text-amber-400" /> Task Description
              </h2>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-[#0B101B] rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-100 font-bold leading-relaxed whitespace-pre-wrap shadow-2xs">
              {task.description || "No specific detailed description provided for this task."}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
                <h2 className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-amber-600 dark:text-amber-400" /> Task Specifications
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Assigned To</span>
                  <span className="font-black text-slate-900 dark:text-white truncate block text-xs">
                    {task.assignedTo?.filter(Boolean).map(a => `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name).join(", ") || "Unassigned"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Assigned By</span>
                  <span className="font-black text-slate-900 dark:text-white truncate block text-xs">
                    {task.assignedBy ? `${task.assignedBy.firstName || ""} ${task.assignedBy.lastName || ""}`.trim() || task.assignedBy.name : "System"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Department</span>
                  <span className="font-black text-slate-900 dark:text-white truncate block text-xs">
                    {task.departmentId?.name || "General"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Priority</span>
                  <span className={`inline-block px-2 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider border shadow-2xs ${
                    task.priority === 'high' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700' :
                    task.priority === 'low' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  }`}>
                    {task.priority || "Medium"}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Start Date</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white block text-xs">
                    {formatDate(task.startDateTime || task.startDate)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 space-y-0.5 shadow-2xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Deadline</span>
                  <span className="font-mono font-black text-rose-700 dark:text-rose-400 block text-xs">
                    {formatDate(task.endDateTime || task.endDate || task.finishDate)}
                  </span>
                </div>

                {task.nextFollowUpDate && (
                  <div className="col-span-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700 shadow-2xs">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-teal-900 dark:text-teal-200 block mb-0.5 flex items-center gap-1">
                      <Clock size={10} className="text-teal-700 dark:text-teal-400" /> Next Follow-Up
                    </span>
                    <span className="font-mono font-black text-teal-950 dark:text-teal-100 block text-xs">
                      {formatDateTime(task.nextFollowUpDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-[#0B101B] rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1.5 shadow-2xs">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Workflow Progress</span>
              <div className="flex items-center justify-between relative pt-0.5">
                <div className="flex flex-col items-center gap-0.5 z-10 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] transition-all shadow-2xs ${(task.status === "in_process" || task.status === "re_in_process" || task.status === "complete" || task.status === "late_complete") ? "bg-emerald-600 text-white" : (task.status === "pending" || task.status === "re_pending") ? "bg-amber-500 text-white ring-2 ring-amber-500/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {(task.status === "in_process" || task.status === "re_in_process" || task.status === "complete" || task.status === "late_complete") ? <CheckCircle2 size={12} strokeWidth={3} /> : <span>1</span>}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${(task.status === "pending" || task.status === "re_pending") ? "text-amber-700 dark:text-amber-400" : (task.status === "in_process" || task.status === "re_in_process" || task.status === "complete" || task.status === "late_complete") ? "text-emerald-800 dark:text-emerald-300" : "text-slate-400"}`}>
                    Pending
                  </span>
                </div>

                <div className="flex-1 h-0.5 -mx-1.5 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${(task.status === "in_process" || task.status === "re_in_process" || task.status === "complete" || task.status === "late_complete") ? "bg-emerald-600 w-full" : "w-0"}`} />
                </div>

                <div className="flex flex-col items-center gap-0.5 z-10 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] transition-all shadow-2xs ${(task.status === "complete" || task.status === "late_complete") ? "bg-emerald-600 text-white" : (task.status === "in_process" || task.status === "re_in_process") ? "bg-blue-600 text-white ring-2 ring-blue-600/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {(task.status === "complete" || task.status === "late_complete") ? <CheckCircle2 size={12} strokeWidth={3} /> : <span>2</span>}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${(task.status === "in_process" || task.status === "re_in_process") ? "text-blue-700 dark:text-blue-400" : (task.status === "complete" || task.status === "late_complete") ? "text-emerald-800 dark:text-emerald-300" : "text-slate-400"}`}>
                    In Process
                  </span>
                </div>

                <div className="flex-1 h-0.5 -mx-1.5 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${(task.status === "complete" || task.status === "late_complete") ? "bg-emerald-600 w-full" : "w-0"}`} />
                </div>

                <div className="flex flex-col items-center gap-0.5 z-10 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] transition-all shadow-2xs ${(task.status === "complete" || task.status === "late_complete") ? "bg-emerald-600 text-white ring-2 ring-emerald-600/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {(task.status === "complete" || task.status === "late_complete") ? <CheckCircle2 size={12} strokeWidth={3} /> : <span>3</span>}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${(task.status === "complete" || task.status === "late_complete") ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                    {task.status === "late_complete" ? "Late Done" : "Complete"}
                  </span>
                </div>
              </div>
            </div>

            {task.checklist && task.checklist.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare size={12} className="text-teal-600 dark:text-teal-400" />
                    <span>Subtasks ({completedChecklistCount}/{totalChecklistCount})</span>
                  </span>
                  <span className="font-mono font-black text-teal-700 dark:text-teal-400">
                    {Math.round((completedChecklistCount / totalChecklistCount) * 100)}%
                  </span>
                </div>

                <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${(completedChecklistCount / totalChecklistCount) * 100}%` }}
                  />
                </div>

                <div className="space-y-1 pt-0.5">
                  {task.checklist.map((item, idx) => (
                    <label 
                      key={idx} 
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer text-xs shadow-2xs ${
                        item.isCompleted 
                          ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through" 
                          : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white font-bold"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted || false}
                        onChange={() => toggleChecklistItem(idx)}
                        className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{item.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {task.attachments && task.attachments.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Paperclip size={11} className="text-amber-600 dark:text-amber-400" />
                  <span>Attachments ({task.attachments.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {task.attachments.map((att, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-900 dark:text-white shadow-2xs hover:border-amber-500 transition-all"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <Paperclip size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate max-w-[120px] text-[11px]">{safeDecodeURIComponent(att.fileName)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedFileForPreview(att)}
                          className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                          title="Preview"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadAttachment(att)}
                          className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer"
                          title="Download"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 p-3 sm:p-3.5 space-y-2.5 bg-white dark:bg-[#111C24]">
            
            <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={13} className="text-amber-600 dark:text-amber-400" /> Notes &amp; Remarks ({task.comments?.length || 0})
              </h2>
            </div>

            <form onSubmit={handleAddComment} className="space-y-1.5">
              <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 focus-within:border-amber-500 transition-colors shadow-2xs">
                <textarea 
                  required
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none min-h-[42px] resize-none font-semibold"
                  placeholder="Write a follow-up remark or note..."
                />
                
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 dark:border-slate-800/80 flex-wrap gap-1.5">
                  <TaskAttachmentField attachments={commentAttachments} onChange={setCommentAttachments} compact={true} />
                  
                  <button 
                    type="submit" 
                    disabled={commentMutating || (!commentText.trim() && commentAttachments.length === 0)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-black text-xs flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer ml-auto transition-all"
                  >
                    <Send size={10} strokeWidth={2.5} />
                    <span>{commentMutating ? "Saving..." : "Add Note"}</span>
                  </button>
                </div>
              </div>
            </form>

            {(!task.comments || task.comments.length === 0) ? (
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold text-center py-4 italic">No remarks or notes added yet.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {Array.isArray(task.comments) && [...task.comments].reverse().map((c, idx) => (
                  <div key={c._id || idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/90 dark:border-slate-700/80 space-y-1.5 shadow-2xs hover:border-amber-500 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MiniAvatar name={c.senderName} size="w-5 h-5" textSize="text-[8.5px]" />
                        <span className="font-black text-xs text-slate-900 dark:text-white">{c.senderName}</span>
                        <span className="text-[8.5px] uppercase font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-300/80 dark:border-amber-700/80">
                          {c.senderRole}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{formatDate(c.createdAt)} {formatTime(c.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-semibold bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-200/80 dark:border-slate-800/80">
                      {c.comment}
                    </p>

                    {c.attachments && c.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {c.attachments.map((att, attIdx) => (
                          <a 
                            key={attIdx} 
                            href={att.fileUrl || att.fileData || "#"} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-black text-slate-800 dark:text-white hover:border-amber-500 transition-colors shadow-2xs"
                          >
                            <Paperclip size={10} className="text-amber-600 dark:text-amber-400" />
                            <span className="truncate max-w-[130px]">{safeDecodeURIComponent(att.fileName)}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <History size={12} className="text-amber-600 dark:text-amber-400" />
                <span>Activity History</span>
              </h3>

              {(!timeline || timeline.length === 0) ? (
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold text-center py-2 italic">No history logged yet.</p>
              ) : (
                <div className="relative pl-5 space-y-2 before:absolute before:inset-y-0.5 before:left-[9px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {Array.isArray(timeline) && timeline.map((act) => {
                    const actType = act.action || "";
                    const cfg = getTimelineConfig(actType) || TIMELINE_CONFIG.comment_added;
                    const Icon = cfg.icon;

                    return (
                      <div key={act._id} className="relative group text-xs">
                        <span className={`absolute -left-[21px] top-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs ${cfg.border}`}>
                          {Icon && <Icon size={9} className={cfg.iconColor} />}
                        </span>

                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider border ${cfg.bg}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {act.performedBy?.name || "System"}
                              </span>
                            </div>
                            <span className="text-[9.5px] font-mono font-bold text-slate-400 dark:text-slate-500">
                              {formatDate(act.createdAt)} {formatTime(act.createdAt)}
                            </span>
                          </div>

                          {act.remarks && (
                            <div className="bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 font-semibold shadow-2xs">
                              {act.remarks}
                            </div>
                          )}

                          {act.nextFollowUpDate && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10.5px] font-mono font-bold">
                              <Calendar size={10} className="text-teal-600 dark:text-teal-400" />
                              <span>Next Follow-up: {formatDateTime(act.nextFollowUpDate)}</span>
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
      </div>

      {task && (
        <TaskStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          task={task}
          onSave={(data) => updateStatusMutation.mutate(data)}
          isSubmitting={updateStatusMutation.isPending}
        />
      )}
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
