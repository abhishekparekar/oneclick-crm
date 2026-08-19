import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTaskByIdApi, updateTaskApi, toggleTaskTemplateApi } from "../../api/companyAdminApi";
import { X, Calendar, Clock, AlertCircle, FileText, CheckCircle, Edit3, Paperclip, Eye, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { InProcessModal, CompleteModal, ReopenModal, ShiftModal } from "./StatusModals";
import TaskEditModal from "./TaskEditModal";
import { toast } from "react-hot-toast";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../common/AttachmentViewerModal";

const STATUS_COLORS = {
  pending: "bg-ca-bg text-ca-text-secondary",
  in_process: "bg-blue-100 text-blue-700",
  overdue: "bg-ca-primary-light text-red-700",
  complete: "bg-green-100 text-green-700",
  late_complete: "bg-orange-100 text-orange-800",
  re_pending: "bg-purple-100 text-purple-700",
  re_in_process: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-gray-200 text-ca-text-secondary",
  active: "bg-ca-bg text-emerald-800",
  inactive: "bg-rose-100 text-rose-800",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
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
  const timeline = data?.data?.timeline || [];

  const updateMutation = useMutation({
    mutationFn: (payload) => updateTaskApi(task?._id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      queryClient.invalidateQueries(["tasks"]);
    }
  });

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

  const toggleChecklistItem = (index) => {
    if (!task) return;
    const newChecklist = [...task.checklist];
    newChecklist[index].isCompleted = !newChecklist[index].isCompleted;
    updateMutation.mutate({ checklist: newChecklist });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed top-0 right-0 h-full w-[500px] bg-white/90 backdrop-blur-3xl shadow-2xl z-50 flex flex-col transform transition-transform duration-300 border-l border-white/80">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold text-ca-text">{task?.isTemplate ? "Recurring Template" : (task?.taskId || "Task Overview")}</h2>
            {task && <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${task.isTemplate ? (task.isActive ? 'bg-ca-bg text-emerald-700' : 'bg-ca-primary-light text-red-700') : STATUS_COLORS[task.status]}`}>{task.isTemplate ? (task.isActive ? "Active" : "Stopped") : task.status?.replace("_", " ")}</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ca-hover rounded-lg transition-colors">
            <X size={20} className="text-ca-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 backdrop-blur-md">
          {isLoading ? (
            <div className="p-8 text-center text-ca-text-secondary">Loading details...</div>
          ) : error ? (
            <div className="p-8 text-center text-ca-primary">Failed to load task details.</div>
          ) : task ? (
            <div className="p-6 space-y-6">
              
              {/* Info Card */}
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white hover:shadow-md transition-all duration-300 space-y-4 relative group">
                {(task.status === "pending" || task.status === "re_pending") && (
                  <button 
                    onClick={() => setShowEdit(true)} 
                    className="absolute top-5 right-5 p-2 rounded-lg text-ca-text-secondary hover:bg-ca-hover hover:text-ca-primary transition-colors"
                    title="Edit Task"
                  >
                    <Edit3 size={18} />
                  </button>
                )}
                <div className="pr-10">
                  <h3 className="text-xl font-bold text-ca-text">{task.title}</h3>
                  <p className="text-sm text-ca-text-secondary mt-1">{task.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Assigned To</p>
                    <p className="text-sm font-medium text-ca-text-secondary">
                      {task.assignedTo?.map(a => `${a.firstName} ${a.lastName}`).join(", ") || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Assigned By</p>
                    <p className="text-sm font-medium text-ca-text-secondary">{task.assignedBy?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Start Date</p>
                    <p className="text-sm font-medium text-ca-text-secondary">{formatDate(task.startDateTime || task.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Deadline</p>
                    <p className="text-sm font-medium text-ca-primary">{formatDate(task.endDateTime || task.endDate || task.finishDate)}</p>
                  </div>
                  {task.isTemplate && (
                    <>
                      <div>
                        <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Repeat Type</p>
                        <p className="text-sm font-medium text-ca-text-secondary capitalize">{task.repeatType || "Recurring"}</p>
                      </div>
                      {task.finishDate && (
                        <div>
                          <p className="text-xs text-ca-text-secondary font-semibold uppercase mb-1">Finish Date</p>
                          <p className="text-sm font-medium text-ca-text-secondary">{formatDate(task.finishDate)}</p>
                        </div>
                      )}
                    </>
                  )}
                  {task.delayedDuration && (task.delayedDuration.days > 0 || task.delayedDuration.hours > 0) && !task.isTemplate && (
                    <div className="col-span-2 bg-ca-primary-light p-2 rounded-lg flex items-start space-x-2">
                      <AlertCircle size={14} className="text-ca-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700 font-medium">
                        Task delayed by {task.delayedDuration.days} days and {task.delayedDuration.hours} hours.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {task.isTemplate && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button 
                    onClick={handleToggleRecurring} 
                    disabled={submitting}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${task.isActive ? 'bg-ca-primary-light text-red-700 hover:bg-red-100' : 'bg-ca-bg text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    <AlertCircle size={16} /> 
                    <span>{task.isActive ? "Stop Recurring Task" : "Resume Recurring Task"}</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "pending" || task.status === "re_pending" || task.status === "overdue") && (
                  <button onClick={() => setShowInProcess(true)} className="flex-1 bg-ca-bg text-blue-700 hover:bg-blue-100 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors">
                    <AlertCircle size={16} /> <span>Mark In-Process</span>
                  </button>
                )}
                
                {(task.status === "in_process" || task.status === "re_in_process") && (
                  <button onClick={() => setShowComplete(true)} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors">
                    <CheckCircle size={16} /> <span>Mark Complete</span>
                  </button>
                )}

                {task.status === "overdue" && (
                  <button onClick={() => setShowComplete(true)} className="flex-1 bg-ca-primary-light text-orange-700 hover:bg-orange-100 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors">
                    <AlertCircle size={16} /> <span>Late Complete</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "pending" || task.status === "in_process" || task.status === "overdue" || task.status === "re_pending" || task.status === "re_in_process") && 
                 (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button onClick={() => setShowShift(true)} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-colors">
                    <FileText size={16} /> <span>Shift Task to Another Member</span>
                  </button>
                )}

                {!task.isTemplate && (task.status === "complete" || task.status === "late_complete") && (user.role === "Admin" || user.role === "CompanyAdmin" || user.role === "Manager") && (
                  <button onClick={() => setShowReopen(true)} className="w-full bg-ca-bg text-ca-text-secondary hover:bg-slate-200 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    Re-open Task
                  </button>
                )}
              </div>

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-ca-text mb-4 uppercase tracking-wider">Attachments ({task.attachments.length})</h3>
                  <div className="space-y-2">
                    {task.attachments.map((att, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-ca-bg border border-ca-border rounded-xl hover:border-amber-500/50 transition-colors"
                      >
                        <div 
                          onClick={() => setSelectedFile(att)}
                          className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1 pr-2"
                        >
                          <Paperclip size={16} className="text-amber-500 shrink-0" />
                          <span className="text-sm text-ca-text font-semibold truncate hover:text-amber-600 transition-colors">
                            {att.fileName || "Attachment"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedFile(att)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Preview File"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              {task.checklist && task.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-ca-text mb-4 uppercase tracking-wider">Checklist</h3>
                  <div className="space-y-2">
                    {task.checklist.map((item, idx) => (
                      <label key={idx} className="flex items-start space-x-3 p-3 bg-ca-surface border border-ca-border rounded-xl cursor-pointer hover:bg-ca-hover transition-colors shadow-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded text-ca-primary focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={item.isCompleted || false}
                          onChange={() => toggleChecklistItem(idx)}
                        />
                        <span className={`text-sm ${item.isCompleted ? 'text-ca-text-secondary line-through' : 'text-ca-text-secondary font-medium'}`}>
                          {item.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-bold text-ca-text mb-4 uppercase tracking-wider">Activity Timeline</h3>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {timeline.map((act, idx) => (
                    <div key={act._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-ca-surface shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <div className={`w-3 h-3 rounded-full ${act.action.includes('complete') ? 'bg-green-500' : act.action.includes('overdue') ? 'bg-ca-primary' : 'bg-blue-500'}`}></div>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-ca-surface p-4 rounded-xl shadow-sm border border-ca-border">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-ca-text text-sm capitalize">{act.action.replace("_", " ")}</span>
                          <span className="text-[10px] text-ca-text-secondary font-medium">{formatDate(act.createdAt)} {formatTime(act.createdAt)}</span>
                        </div>
                        <p className="text-xs text-ca-text-secondary">{act.remarks || "No remarks provided."}</p>
                        <p className="text-[10px] text-ca-text-secondary mt-2 font-medium border-t border-slate-50 pt-2">By {act.performedBy?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>

      {/* Popups */}
      {task && <InProcessModal isOpen={showInProcess} onClose={() => setShowInProcess(false)} task={task} />}
      {task && <CompleteModal isOpen={showComplete} onClose={() => setShowComplete(false)} task={task} isLate={task.status === "overdue"} />}
      {task && <ReopenModal isOpen={showReopen} onClose={() => setShowReopen(false)} task={task} />}
      {task && <ShiftModal isOpen={showShift} onClose={() => setShowShift(false)} task={task} employees={employees} />}
      {task && showEdit && (
        <TaskEditModal 
          isOpen={showEdit} 
          onClose={() => setShowEdit(false)} 
          task={task} 
        />
      {selectedFile && (
        <AttachmentViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </>
  );
}
