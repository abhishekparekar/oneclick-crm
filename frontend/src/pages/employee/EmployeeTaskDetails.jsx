import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTaskDetailsApi,
  updateEmployeeTaskStatusApi,
  addEmployeeTaskCommentApi,
  uploadTaskMediaApi,
  updateEmployeeTaskChecklistApi
} from "../../api/employeeApi";
import {
  ArrowLeft, CheckSquare, Clock, Calendar as CalendarIcon, Send, FileText,
  User, Building, ShieldCheck, CheckCircle2, AlertCircle, MessageSquare,
  RefreshCw, Paperclip, X, ExternalLink, Image as ImageIcon,
  Play, CalendarDays, CheckCircle, Check, Flag, Sparkles, Layers, CheckCheck
} from "lucide-react";

const formatTaskId = (task) => {
  if (!task) return "T-001";
  if (task.taskId && task.taskId.startsWith("T-") && task.taskId.length < 12) return task.taskId;
  if (task.taskSequenceNumber) return `T-${String(task.taskSequenceNumber).padStart(4, "0")}`;
  const idStr = String(task._id || task.id || "").trim();
  if (idStr.length >= 8) return `T-${idStr.slice(-5).toUpperCase()}`;
  return `T-001`;
};

const safeDecode = (str) => {
  try {
    return decodeURIComponent(str || "");
  } catch {
    return str || "Attachment";
  }
};

const normalizeStatus = (val) => {
  if (!val) return "pending";
  let s = val.toLowerCase().replace(/-/g, "_");
  if (s === "todo" || s === "pending" || s === "re_pending") return "pending";
  if (s === "in_progress" || s === "in_process" || s === "re_in_process") return "in_process";
  if (s === "completed" || s === "done" || s === "complete" || s === "re_complete") return "complete";
  if (s === "late_completed" || s === "late_complete" || s === "re_late_complete") return "late_complete";
  return s;
};

const toDateTimeLocal = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatFollowUpDateTime = (dateStr) => {
  if (!dateStr) return "Not Set";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not Set";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ── POPUP ACTION MODAL ───────────────────────────────────────────────────────
function TaskActionModal({ isOpen, onClose, actionType, task, onActionSuccess }) {
  const queryClient = useQueryClient();
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRemarks("");
      setAttachedFile(null);
      setErrorMsg("");

      if (task?.nextFollowUpDate) {
        setNextFollowUpDate(toDateTimeLocal(task.nextFollowUpDate));
      } else if (task?.isTemplate && task?.repeatType?.toLowerCase() === "daily") {
        setNextFollowUpDate(toDateTimeLocal(new Date()));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNextFollowUpDate(toDateTimeLocal(tomorrow));
      }
    }
  }, [isOpen, actionType, task]);

  const submitMut = useMutation({
    mutationFn: async () => {
      let attachmentsList = [];
      if (attachedFile) {
        const uploadRes = await uploadTaskMediaApi(attachedFile);
        const uData = uploadRes.data || uploadRes;
        if (uData.success) {
          attachmentsList.push({
            fileUrl: uData.fileUrl,
            fileName: uData.fileName || attachedFile.name,
            fileType: uData.fileType || attachedFile.type,
          });
        }
      }

      let targetStatus = task.status || "pending";
      let payloadFollowUp = nextFollowUpDate;

      if (actionType === "in_process") {
        targetStatus = "in_process";
      } else if (actionType === "follow_up") {
        targetStatus = "in_process";
      } else if (actionType === "complete") {
        targetStatus = "complete";
        payloadFollowUp = null;
      } else if (actionType === "late_complete") {
        targetStatus = "late_complete";
        payloadFollowUp = null;
      }

      await updateEmployeeTaskStatusApi(task._id, targetStatus, {
        nextFollowUpDate: payloadFollowUp,
        remark: remarks,
        attachments: attachmentsList
      });

      if (remarks?.trim() || attachmentsList.length > 0) {
        await addEmployeeTaskCommentApi(task._id, remarks.trim(), attachmentsList).catch(() => { });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["employeeTaskDetails", task._id]);
      queryClient.invalidateQueries(["employeeMyTasksPage"]);
      queryClient.invalidateQueries(["employeeDashboardSummary"]);
      onActionSuccess?.();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to update task.");
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!remarks.trim() && !attachedFile) {
      setErrorMsg("Please provide Notes (Remarks) OR upload an Attachment before continuing.");
      return;
    }

    if (actionType === "in_process" || actionType === "follow_up") {
      if (!nextFollowUpDate) {
        setErrorMsg("Please select a Next Follow-up Date.");
        return;
      }

      const selectedDate = new Date(nextFollowUpDate);
      selectedDate.setHours(0, 0, 0, 0);

      const taskStartDate = task?.startDate || task?.startDateTime;
      if (taskStartDate) {
        const startDate = new Date(taskStartDate);
        startDate.setHours(0, 0, 0, 0);
        if (selectedDate < startDate) {
          const startStr = startDate.toLocaleDateString("en-GB");
          setErrorMsg(`Follow-up date cannot be before the task's start date (${startStr}).`);
          return;
        }
      }
    }

    submitMut.mutate();
  };

  const isCompleteAction = actionType === "complete" || actionType === "late_complete";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-ca-surface border border-ca-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">

        {/* Modal Header */}
        <div className={`px-6 py-4.5 border-b border-ca-border flex items-center justify-between ${actionType === "in_process" ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200" :
          actionType === "follow_up" ? "bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200" :
            actionType === "complete" ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200" :
              "bg-orange-50/80 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200"
          }`}>
          <div className="flex items-center gap-2.5 font-black text-sm uppercase tracking-wider">
            {actionType === "in_process" && <Play size={18} className="text-blue-600 fill-blue-600" />}
            {actionType === "follow_up" && <CalendarDays size={18} className="text-teal-600" />}
            {actionType === "complete" && <CheckCircle2 size={18} className="text-emerald-600" />}
            {actionType === "late_complete" && <AlertCircle size={18} className="text-orange-600" />}
            <span>
              {actionType === "in_process" ? "Start Task (In Process)" :
                actionType === "follow_up" ? "Schedule Next Follow-Up Date" :
                  actionType === "complete" ? "Mark Task Completed" : "Mark Late Complete"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ca-text-secondary hover:text-ca-text hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">

          {errorMsg && (
            <div className="p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Next Follow-Up Date Input */}
          {!isCompleteAction && (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-teal-600" />
                  Next Follow-Up Date &amp; Time <span className="text-teal-600 font-black">*</span>
                </span>
                <span className="text-[10px] font-normal text-ca-text-secondary lowercase">
                  (When to check progress next)
                </span>
              </label>
              <input
                type="datetime-local"
                required
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-ca-bg border border-ca-border text-ca-text font-bold text-xs focus:outline-hidden focus:border-teal-500 shadow-2xs"
              />
            </div>
          )}

          {/* Remarks / Work Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center justify-between">
              <span>
                {isCompleteAction
                  ? "Final Remarks & Deliverables Note"
                  : actionType === "follow_up"
                    ? "Follow-Up Progress Remarks"
                    : "Initial Remarks / Work Plan"} <span className="text-orange-600 font-black">*</span>
              </span>
              <span className="text-[10px] text-ca-text-secondary">(or attach a file below)</span>
            </label>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isCompleteAction
                  ? "Provide summary of finished deliverables, results, links..."
                  : actionType === "follow_up"
                    ? "What progress was made today and what is scheduled for the next follow-up date..."
                    : "Describe initial plan, starting notes, or any comments..."
              }
              className="w-full p-3 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-medium focus:outline-hidden focus:border-orange-500 shadow-2xs"
            />
          </div>

          {/* File Attachment Field */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center gap-1">
              <Paperclip size={14} className="text-orange-600" /> Work Document / Attachment (Optional)
            </label>
            {attachedFile ? (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-orange-700 shrink-0" />
                  <div className="truncate">
                    <p className="font-black text-orange-950 dark:text-orange-200 truncate">{attachedFile.name}</p>
                    <p className="text-[10px] text-orange-700 dark:text-orange-300 font-mono">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 bg-ca-bg hover:bg-ca-surface rounded-xl border border-dashed border-ca-border cursor-pointer transition-colors text-ca-text-secondary hover:text-ca-text font-bold">
                <Paperclip size={16} />
                <span>Attach Work Document / File</span>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setAttachedFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ca-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-ca-border font-bold text-xs hover:bg-ca-bg text-ca-text transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitMut.isPending}
              className={`px-6 py-2.5 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ${actionType === "in_process" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" :
                actionType === "follow_up" ? "bg-teal-700 hover:bg-teal-800 shadow-teal-700/20" :
                  actionType === "complete" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" :
                    "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20"
                }`}
            >
              {submitMut.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : actionType === "in_process" ? (
                <Play size={14} className="fill-white" />
              ) : actionType === "follow_up" ? (
                <CalendarDays size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>
                {submitMut.isPending
                  ? "Updating..."
                  : actionType === "in_process"
                    ? "Start Task (In Process)"
                    : actionType === "follow_up"
                      ? "Save Follow-Up"
                      : actionType === "complete"
                        ? "Complete Task"
                        : "Confirm"}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// ── MAIN EMPLOYEE TASK DETAILS COMPONENT ────────────────────────────────────
export default function EmployeeTaskDetails() {
  const { id: taskId } = useParams();
  const navigate = useNavigate();

  const [modalActionType, setModalActionType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Standalone comment state
  const [standaloneComment, setStandaloneComment] = useState("");
  const [standaloneFile, setStandaloneFile] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch Task Details
  const { data: taskRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["employeeTaskDetails", taskId],
    queryFn: async () => {
      const res = await getTaskDetailsApi(taskId).catch(() => ({ data: {} }));
      const p = res.data?.data || res.data || {};
      return p.task ? p.task : p;
    },
    enabled: Boolean(taskId)
  });

  if (isLoading || !taskRes) {
    return (
      <div className="space-y-4 pb-12 font-sans w-full max-w-[1440px] mx-auto min-h-[500px] flex flex-col items-center justify-center">
        <div className="p-8 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Loading task details...</p>
        </div>
      </div>
    );
  }

  const task = taskRes || {};
  const currentRawStatus = (task.myStatus || task.statusKey || task.status || "pending").toLowerCase();
  const normalizedSt = normalizeStatus(currentRawStatus);
  const isCompleted = normalizedSt === "complete" || normalizedSt === "late_complete";

  const isOverdueTime = !isCompleted && Boolean(task.dueDate || task.endDateTime) && new Date(task.dueDate || task.endDateTime) < new Date();
  const isOverdue = !isCompleted && (normalizedSt === "overdue" || isOverdueTime);
  const isInProgress = normalizedSt === "in_process";
  const isPending = normalizedSt === "pending";

  const priorityTheme = (() => {
    const p = (task.priority || "medium").toLowerCase();
    if (p === "urgent" || p === "high") return { bg: "bg-rose-500/20 text-rose-300 border-rose-500/40", label: "HIGH" };
    if (p === "low") return { bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "LOW" };
    return { bg: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "MEDIUM" };
  })();

  const openActionModal = (type) => {
    setModalActionType(type);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (actionType) => {
    refetch();
    const msg = actionType === "in_process" ? "Task successfully moved to In-Progress!" :
      actionType === "follow_up" ? "Follow-up schedule and progress notes updated!" :
        actionType === "complete" ? "Task successfully marked as Completed!" :
          "Task status updated successfully!";
    setToastMessage({ type: "success", text: msg });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Add Standalone Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!standaloneComment.trim() && !standaloneFile) return;

    setIsSubmittingComment(true);
    try {
      let attachmentsList = [];
      if (standaloneFile) {
        const uploadRes = await uploadTaskMediaApi(standaloneFile);
        const uData = uploadRes.data || uploadRes;
        if (uData.success) {
          attachmentsList.push({
            fileUrl: uData.fileUrl,
            fileName: uData.fileName || standaloneFile.name,
            fileType: uData.fileType || standaloneFile.type,
          });
        }
      }

      await addEmployeeTaskCommentApi(taskId, standaloneComment.trim(), attachmentsList);
      setStandaloneComment("");
      setStandaloneFile(null);
      refetch();
      setToastMessage({ type: "success", text: "Comment posted to task discussion." });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-ca-text w-full max-w-[1440px] mx-auto">

      {/* ── ACTION POPUP MODAL ─────────────────────────────────────────────────── */}
      <TaskActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        actionType={modalActionType}
        task={task}
        onActionSuccess={() => handleModalSuccess(modalActionType)}
      />

      {/* ── SUCCESS TOAST NOTIFICATION ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── TOP NAVIGATION BAR & ACTION TOOLBAR (CLEAN FLOATING ADMIN STYLE) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-[11px] font-mono font-black shrink-0">
                {formatTaskId(task)}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {task.title || task.name || "Task"}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isCompleted ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700" :
                isInProgress ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700" :
                isOverdue ? "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700" :
                "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700"
              }`}>
                {isOverdue && !isCompleted ? "OVERDUE" : normalizedSt.replace("_", " ").toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${priorityTheme.bg}`}>
                {priorityTheme.label}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Workflow Action Button */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
          {isPending && !isOverdue && (
            <button
              onClick={() => openActionModal("in_process")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Play size={13} className="fill-white" />
              <span>Start Task (In Process)</span>
            </button>
          )}

          {isInProgress && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openActionModal("follow_up")}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <CalendarDays size={13} />
                <span>Next Follow-Up</span>
              </button>

              <button
                onClick={() => openActionModal("complete")}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Mark Completed</span>
              </button>
            </div>
          )}

          {isOverdue && !isCompleted && (
            <button
              onClick={() => openActionModal("late_complete")}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <AlertCircle size={13} />
              <span>Mark Late Complete</span>
            </button>
          )}

          {isCompleted && (
            <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              <span>Completed &amp; Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. SINGLE UNIFIED 2-COLUMN WORKSPACE CONTAINER ─────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* ── LEFT SECTION (5 / 12 width): TASK SPECIFICATIONS & PROGRESS ── */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4">
            
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-amber-600 dark:text-amber-400" /> Task Specifications &amp; Details
              </h2>
            </div>

            {/* Description & Instructions */}
            <div className="space-y-1">
              <p className="text-[10.5px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Description &amp; Instructions
              </p>
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B101B] rounded-xl border border-slate-300/90 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-bold leading-relaxed shadow-2xs">
                {task.description || "No specific detailed description provided for this task."}
              </div>
            </div>

            {/* Key Dates & Meta Specs Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* Start Date */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B101B] rounded-xl border border-slate-300/90 dark:border-slate-700 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">Start Date</span>
                <span className="font-mono font-black text-slate-950 dark:text-white block text-xs">
                  {task.startDate || task.startDateTime ? new Date(task.startDate || task.startDateTime).toLocaleDateString("en-GB") : "—"}
                </span>
              </div>

              {/* Due Date */}
              <div className={`p-2.5 rounded-xl border space-y-0.5 shadow-2xs ${isOverdueTime ? "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800" : "bg-slate-50 dark:bg-[#0B101B] border-slate-300/90 dark:border-slate-700"}`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">Due Date</span>
                <span className={`font-mono font-black block text-xs ${isOverdueTime ? "text-rose-700 dark:text-rose-300" : "text-slate-950 dark:text-white"}`}>
                  {task.dueDate || task.endDateTime || task.finishDate ? new Date(task.dueDate || task.endDateTime || task.finishDate).toLocaleDateString("en-GB") : "—"}
                </span>
              </div>

              {/* Next Follow-Up */}
              <div className="col-span-2 p-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-300 dark:border-teal-700 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-950 dark:text-teal-200 flex items-center gap-1">
                  <Clock size={11} className="text-teal-700 dark:text-teal-400" /> Next Follow-Up
                </span>
                <span className="font-mono font-black text-teal-950 dark:text-teal-100 block text-xs" title={formatFollowUpDateTime(task.nextFollowUpDate)}>
                  {formatFollowUpDateTime(task.nextFollowUpDate)}
                </span>
              </div>

              {/* Department */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B101B] rounded-xl border border-slate-300/90 dark:border-slate-700 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">Department</span>
                <span className="font-black text-slate-950 dark:text-white block truncate text-xs">
                  {task.departmentId?.name || task.departmentName || "General Team"}
                </span>
              </div>

              {/* Priority */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B101B] rounded-xl border border-slate-300/90 dark:border-slate-700 space-y-0.5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">Priority</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs ${priorityTheme.bg}`}>
                  {priorityTheme.label}
                </span>
              </div>
            </div>

            {/* Workflow Progress Stepper */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#0B101B] rounded-xl border border-slate-300/90 dark:border-slate-700 space-y-2.5 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">Workflow Progress</span>
              <div className="flex items-center justify-between relative pt-1">
                {/* Step 1: Pending */}
                <div className="flex flex-col items-center gap-1 z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-2xs ${(isInProgress || isCompleted) ? "bg-emerald-600 text-white" : isPending ? "bg-amber-500 text-white ring-2 ring-amber-500/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {(isInProgress || isCompleted) ? <Check size={14} strokeWidth={3} /> : <span>1</span>}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isPending ? "text-amber-700 dark:text-amber-400 font-black" : (isInProgress || isCompleted) ? "text-emerald-800 dark:text-emerald-300 font-bold" : "text-slate-500 font-bold"}`}>
                    Pending
                  </span>
                </div>

                {/* Line 1 */}
                <div className="flex-1 h-0.5 -mx-2 bg-slate-300 dark:bg-slate-700 relative overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${(isInProgress || isCompleted) ? "bg-emerald-600 w-full" : "w-0"}`} />
                </div>

                {/* Step 2: In Progress */}
                <div className="flex flex-col items-center gap-1 z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-2xs ${isCompleted ? "bg-emerald-600 text-white" : isInProgress ? "bg-blue-600 text-white ring-2 ring-blue-600/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : <span>2</span>}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isInProgress ? "text-blue-700 dark:text-blue-400 font-black" : isCompleted ? "text-emerald-800 dark:text-emerald-300 font-bold" : "text-slate-500 font-bold"}`}>
                    In Progress
                  </span>
                </div>

                {/* Line 2 */}
                <div className="flex-1 h-0.5 -mx-2 bg-slate-300 dark:bg-slate-700 relative overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-600 w-full" : "w-0"}`} />
                </div>

                {/* Step 3: Complete */}
                <div className="flex flex-col items-center gap-1 z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-2xs ${isCompleted ? "bg-emerald-600 text-white ring-2 ring-emerald-600/30" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : <span>3</span>}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isCompleted ? "text-emerald-700 dark:text-emerald-400 font-black" : "text-slate-500 font-bold"}`}>
                    {normalizedSt === "late_complete" ? "Late Done" : "Complete"}
                  </span>
                </div>
              </div>
            </div>

            {/* Task Attachments (If any) */}
            {Array.isArray(task.attachments) && task.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                  Attached Documents ({task.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.attachments.map((att, idx) => {
                    const fileName = safeDecode(att.fileName);
                    const isImage = (att.fileType || "").startsWith("image/");
                    return (
                      <a
                        key={idx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-[#0B101B] hover:bg-amber-50/70 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl transition-all group shadow-2xs"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700">
                          {isImage ? <ImageIcon size={15} /> : <FileText size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">
                            {fileName || "Document Attachment"}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold flex items-center gap-1">
                            <span>Open Attachment</span>
                            <ExternalLink size={9} />
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SECTION (7 / 12 width): COMMENTS & DISCUSSION TIMELINE ── */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 bg-slate-50/60 dark:bg-slate-900/30">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={15} className="text-amber-600 dark:text-amber-400" /> Comments &amp; Discussion Timeline
              </h2>
              <span className="text-[10.5px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {task.comments?.length || 0} Comments
              </span>
            </div>

            {/* Comments Stream */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
              {Array.isArray(task.comments) && task.comments.length > 0 ? (
                task.comments.map((c, idx) => (
                  <div key={idx} className="p-3.5 bg-white dark:bg-[#0B101B] rounded-xl border border-slate-300 dark:border-slate-700 text-xs space-y-2 shadow-2xs hover:border-amber-500 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-950 dark:text-white font-black text-xs">{c.senderName || "Team Member"}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {c.senderRole || "Member"}
                        </span>
                      </div>
                      <span className="font-mono text-slate-900 dark:text-slate-200 font-black text-[11px]">
                        {new Date(c.createdAt || Date.now()).toLocaleDateString("en-GB")}
                      </span>
                    </div>

                    {c.comment && (
                      <p className="text-slate-950 dark:text-slate-100 font-semibold text-xs leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                        {c.comment}
                      </p>
                    )}

                    {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {c.attachments.map((att, aIdx) => {
                          const attName = safeDecode(att.fileName) || "Attachment Document";
                          return (
                            <a
                              key={aIdx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-amber-500 rounded-lg text-xs font-black text-slate-950 dark:text-white transition-all shadow-2xs group"
                            >
                              <Paperclip size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="max-w-[200px] truncate">{attName}</span>
                              <ExternalLink size={10} className="text-slate-400 group-hover:text-amber-600 shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-bold italic flex flex-col items-center gap-2">
                  <MessageSquare size={24} className="text-slate-400" />
                  <p>No discussion comments yet. Be the first to post a remark below!</p>
                </div>
              )}
            </div>

            {/* Quick Comment Composer */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <textarea
                rows={2}
                value={standaloneComment}
                onChange={(e) => setStandaloneComment(e.target.value)}
                placeholder="Post a remark, note or progress update to the task thread..."
                className="w-full p-3 rounded-xl bg-white dark:bg-[#0B101B] border-2 border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white hover:text-amber-600 cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Paperclip size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>{standaloneFile ? standaloneFile.name : "Attach document / file"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setStandaloneFile(e.target.files[0]);
                    }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmittingComment || (!standaloneComment.trim() && !standaloneFile)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Send size={12} strokeWidth={2.5} />
                  <span>{isSubmittingComment ? "Posting..." : "Post Comment"}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
