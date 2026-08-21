import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaskByIdApi, updateTaskApi, toggleTaskTemplateApi } from "../../api/companyAdminApi";
import { X, Calendar, Clock, AlertCircle, FileText, CheckCircle2, Edit3, Paperclip, Eye, Download, Play, RotateCcw, Share2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { InProcessModal, CompleteModal, ReopenModal, ShiftModal } from "./StatusModals";
import TaskEditModal from "./TaskEditModal";
import { toast } from "react-hot-toast";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../common/AttachmentViewerModal";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  in_process: { label: "In Process", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  overdue: { label: "Overdue", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  complete: { label: "Completed", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  late_complete: { label: "Late Completed", bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  re_pending: { label: "Re-Pending", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  re_in_process: { label: "Re-In Process", bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  cancelled: { label: "Cancelled", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function TaskOverviewDrawer({ taskId, onClose, departments = [], employees = [] }) {
  const { user } = useAuth();
  
  // Modals state
  const [showInProcess, setShowInProcess] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [showShift, setShowShift] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskByIdApi(taskId).then(res => res.data),
    enabled: !!taskId,
  });

  const task = data?.data?.task;

  const handleToggleRecurring = async () => {
    try {
      setSubmitting(true);
      const res = await toggleTaskTemplateApi(taskId);
      if (res.data?.success) {
        toast.success(res.data.message || "Task status updated");
        queryClient.invalidateQueries(["task", taskId]);
        queryClient.invalidateQueries(["tasks"]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error toggling recurring task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!taskId) return null;

  const statusKey = (task?.status || "pending").toLowerCase();
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={onClose} />
      
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#111C24] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 border-l border-slate-200 dark:border-slate-800 animate-slideLeft text-xs font-sans">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-[10px]">
              {task?.isTemplate ? "Recurring" : (task?.taskId || "TSK")}
            </span>
            {task && (
              <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${statusCfg.bg}`}>
                {task.isTemplate ? (task.isActive ? "Active" : "Stopped") : statusCfg.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading task overview...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500">Failed to load task details.</div>
          ) : task ? (
            <div className="space-y-3">
              
              {/* Info Card */}
              <div className="bg-slate-50 dark:bg-[#0B101B] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white leading-snug">{task.title}</h3>
                  {(task.status === "pending" || task.status === "re_pending") && (
                    <button 
                      onClick={() => setShowEdit(true)} 
                      className="p-1 rounded text-slate-400 hover:text-amber-600 cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit3 size={13} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-medium">{task.description || "No description provided."}</p>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Assigned To</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {task.assignedTo?.map(a => `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name).join(", ") || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Assigned By</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{task.assignedBy?.name || "System"}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Start Date</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 block">{formatDate(task.startDateTime || task.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Deadline</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400 block">{formatDate(task.endDateTime || task.endDate || task.finishDate)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {task.isTemplate && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button 
                    onClick={handleToggleRecurring} 
                    disabled={submitting}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${task.isActive ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}
                  >
                    <AlertCircle size={13} /> 
                    <span>{task.isActive ? "Stop Recurring Task" : "Resume Recurring Task"}</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "pending" || task.status === "re_pending" || task.status === "overdue") && (
                  <button onClick={() => setShowInProcess(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                    <Play size={11} /> <span>In-Process</span>
                  </button>
                )}
                
                {(task.status === "in_process" || task.status === "re_in_process") && (
                  <button onClick={() => setShowComplete(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                    <CheckCircle2 size={11} /> <span>Complete</span>
                  </button>
                )}

                {task.status === "overdue" && (
                  <button onClick={() => setShowComplete(true)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer">
                    <AlertCircle size={11} /> <span>Late Complete</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "pending" || task.status === "in_process" || task.status === "overdue" || task.status === "re_pending" || task.status === "re_in_process") && 
                 (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button onClick={() => setShowShift(true)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                    <Share2 size={12} className="text-slate-400" /> <span>Shift Task to Another Member</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "complete" || task.status === "late_complete") && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button onClick={() => setShowReopen(true)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                    Re-open Task
                  </button>
                )}
              </div>

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Attachments ({task.attachments.length})</h4>
                  <div className="space-y-1">
                    {task.attachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400"
                      >
                        <div 
                          onClick={() => setSelectedFile(att)}
                          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 pr-2"
                        >
                          <Paperclip size={12} className="text-amber-500 shrink-0" />
                          <span className="truncate">{att.fileName || "Attachment"}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedFile(att)}
                            className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                            title="Preview"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
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
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {task && <InProcessModal isOpen={showInProcess} onClose={() => setShowInProcess(false)} task={task} />}
      {task && <CompleteModal isOpen={showComplete} onClose={() => setShowComplete(false)} task={task} isLate={task.status === "overdue"} />}
      {task && <ReopenModal isOpen={showReopen} onClose={() => setShowReopen(false)} task={task} />}
      {task && <ShiftModal isOpen={showShift} onClose={() => setShowShift(false)} task={task} employees={employees} />}
      {task && showEdit && (
        <TaskEditModal 
          isOpen={showEdit} 
          onClose={() => setShowEdit(false)} 
          task={task} 
          departments={departments}
          employees={employees}
        />
      )}

      {selectedFile && (
        <AttachmentViewerModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
}
