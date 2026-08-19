import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getEmployeeTaskDetailsApi, 
  updateEmployeeTaskStatusApi, 
  startEmployeeTaskTimerApi, 
  stopEmployeeTaskTimerApi, 
  addEmployeeTaskCommentApi,
  uploadTaskMediaApi
} from "../../api/employeeApi";
import { 
  ChevronRight, MoreVertical, Flame, Key, User as UserIcon, Building2, Calendar, 
  Clock, CalendarDays, Paperclip, Mic, Send, Play, CheckCircle2, AlertCircle, MessageSquare, X, Square, Loader2, Trash2, ListTodo, ArrowLeft, Eye, Download
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/common/PageHeader";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

const getNormalizedStatus = (task) => {
  if (!task) return "pending";
  const rawStatus = task.statusKey || task.status || task.statusLabelSnapshot || "pending";
  const s = String(rawStatus).toLowerCase().trim();
  if (["todo", "pending", "open"].includes(s)) return "pending";
  if (["in-progress", "inprogress", "in_process", "in progress", "working"].includes(s)) return "in_process";
  if (["completed", "complete", "done", "finished"].includes(s)) return "complete";
  if (["overdue"].includes(s)) return "overdue";
  return s;
};

const getStatusStyles = (status) => {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-600 border-amber-200";
    case "in_process": return "bg-blue-100 text-blue-600 border-blue-200";
    case "complete": return "bg-emerald-100 text-emerald-600 border-emerald-200";
    case "overdue": return "bg-rose-100 text-rose-600 border-rose-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "pending": return "Pending";
    case "in_process": return "In Progress";
    case "complete": return "Completed";
    case "overdue": return "Overdue";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const EmployeeTaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [commentText, setCommentText] = useState("");
  const chatEndRef = useRef(null);

  // Start Progress Modal State
  const [showStartProgressModal, setShowStartProgressModal] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remark, setRemark] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const { data: taskRes, isLoading } = useQuery({
    queryKey: ["employeeTask", id],
    queryFn: () => getEmployeeTaskDetailsApi(id).then(res => res.data),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data) => {
      if (typeof data === 'string') return updateEmployeeTaskStatusApi(id, data);
      const { status, ...extraData } = data;
      return updateEmployeeTaskStatusApi(id, status, extraData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTask", id] });
      toast.success("Task status updated!");
      setShowStartProgressModal(false);
      setRemark("");
      setNextFollowUpDate("");
      setAttachments([]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status")
  });

  const startTimerMutation = useMutation({
    mutationFn: () => startEmployeeTaskTimerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTask", id] });
      toast.success("Timer started");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to start timer")
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => stopEmployeeTaskTimerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTask", id] });
      toast.success("Timer stopped");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to stop timer")
  });

  const addCommentMutation = useMutation({
    mutationFn: (text) => addEmployeeTaskCommentApi(id, text),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["employeeTask", id] });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to post comment")
  });

  const task = taskRes?.task;

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  }

  if (!task) {
    return <div className="p-6 text-center text-slate-500">Task not found.</div>;
  }

  const normalizedStatus = getNormalizedStatus(task);
  const isTimerActive = taskRes?.activeTimer;

  const handleStatusChange = (newStatus) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadTaskMediaApi(file);
      const fileData = {
        fileUrl: res.data.fileUrl || res.data.url,
        fileName: file.name,
        fileType: file.type
      };
      setAttachments(prev => [...prev, fileData]);
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `VoiceNote_${Date.now()}.webm`, { type: 'audio/webm' });
        
        try {
          setIsUploading(true);
          const res = await uploadTaskMediaApi(audioFile);
          const fileData = {
            fileUrl: res.data.fileUrl || res.data.url,
            fileName: audioFile.name,
            fileType: audioFile.type
          };
          setAttachments(prev => [...prev, fileData]);
        } catch (error) {
          toast.error("Failed to upload voice note");
        } finally {
          setIsUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6 pb-24 font-sans w-full max-w-full">
      {/* Top Bar - Standard PageHeader */}
      <PageHeader 
        title="Task Details" 
        icon={ListTodo} 
      >
        <button 
          onClick={() => navigate("/employee/my-tasks")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/5"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Header */}
          <div className="bg-white dark:bg-[#111C24] rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-md border
                    ${task.priority?.toLowerCase() === "high" ? "bg-red-50 text-red-600 border-red-200/60 dark:bg-red-500/10 dark:border-red-500/20" : 
                      task.priority?.toLowerCase() === "medium" ? "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:border-amber-500/20" : 
                      "bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-500/10 dark:border-orange-500/20"}
                  `}>
                    {task.priority || "Low"} Priority
                  </span>
                  <span className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-md border bg-slate-50 dark:bg-[#0C1520] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300`}>
                    {getStatusLabel(normalizedStatus)}
                  </span>
                </div>
                
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    <span className="text-slate-400 font-medium mr-2">{task.taskCode || "TASK"}</span>
                    {task.title || task.name}
                  </h2>
                </div>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
              {task.description ? (
                <p>{task.description}</p>
              ) : (
                <p className="italic text-slate-400">No detailed description provided.</p>
              )}
            </div>
          </div>
          
          {/* Task Information Panel */}
          <div className="bg-white dark:bg-[#111C24] rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111C24]/30">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Task Information
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
                {/* Task ID */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Key size={13} /> Task ID
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.taskCode || "N/A"}</p>
                </div>

                {/* Assigned By */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <UserIcon size={13} /> Assigned By
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.assignedBy?.name || task.assignedBy?.firstName || "System"}</p>
                </div>

                {/* Department */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Building2 size={13} /> Department
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.departmentId?.name || "N/A"}</p>
                </div>

                {/* Due Date */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Clock size={13} /> Due Date
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(task.dueDate)}</p>
                </div>

                {/* Start Date */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Calendar size={13} /> Start Date
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(task.startDate || task.createdAt)}</p>
                </div>

                {/* Next Follow Up */}
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <CalendarDays size={13} /> Next Follow-up
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(task.nextFollowUpDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Staff */}
          <div className="bg-white dark:bg-[#111C24] rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111C24]/30">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Assigned Staff
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-4">
                {(task.assignees || []).map((emp, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shadow-sm">
                      {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-400">Assignee</span>
                    </div>
                  </div>
                ))}
                {(!task.assignees || task.assignees.length === 0) && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shadow-sm">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-400">Assignee</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 flex flex-col">
          
          {/* Workflow Actions */}
          <div className="bg-white dark:bg-[#111C24] rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111C24]/30">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action Center
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {normalizedStatus === "pending" && (
                <button 
                  onClick={() => setShowStartProgressModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                >
                  <Play size={16} />
                  Start Progress
                </button>
              )}
              
              {normalizedStatus === "in_process" && (
                <>
                  {!isTimerActive ? (
                    <button 
                      onClick={() => startTimerMutation.mutate()}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Play size={16} />
                      Start Timer
                    </button>
                  ) : (
                    <button 
                      onClick={() => stopTimerMutation.mutate()}
                      className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Clock size={16} />
                      Stop Timer
                    </button>
                  )}
                  <button 
                    onClick={() => handleStatusChange("complete")}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    <CheckCircle2 size={16} />
                    Mark as Complete
                  </button>
                </>
              )}

              {normalizedStatus === "complete" && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200/60 dark:border-emerald-500/20 rounded-lg font-bold text-sm">
                  <CheckCircle2 size={16} /> Task Completed
                </div>
              )}
            </div>
          </div>

          {/* Activity Logs / Chat */}
          <div className="bg-white dark:bg-[#111C24] rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 h-[400px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111C24]/30">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Activity & Notes
              </h3>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white dark:bg-[#111C24]/50">
              {(!task.comments || task.comments.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-[#111C24] rounded-full flex items-center justify-center">
                    <MessageSquare size={20} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">No notes or updates yet.</p>
                </div>
              ) : (
                task.comments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                      {comment.senderName?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-800 dark:text-white">
                          {comment.senderName || "User"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="text-[13px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0C1520]/50 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800 shadow-sm">
                        {comment.comment || comment.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#111C24]">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0C1520]/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:border-slate-400 dark:focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-100 dark:focus-within:ring-slate-800 transition-all">
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
                  <Paperclip size={16} />
                </button>
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  placeholder="Type a note..."
                  className="flex-1 bg-transparent border-none px-2 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
                />
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
                  <Mic size={16} />
                </button>
                <button 
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
                >
                  <Send size={14} className={commentText.trim() ? "ml-0.5" : ""} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Progress Modal */}
      {showStartProgressModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0C1520] rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wider">Start Progress (Mark In-Process)</h3>
              <button onClick={() => setShowStartProgressModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!nextFollowUpDate || !remark.trim()) {
                  toast.error("Please fill in all required fields.");
                  return;
                }
                updateStatusMutation.mutate({
                  status: "in_process",
                  nextFollowUpDate,
                  remark,
                  attachments
                });
              }}
              className="p-5 space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Next Follow-Up Date <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="date"
                  value={nextFollowUpDate}
                  onChange={e => setNextFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-50 dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remarks / Progress <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px] resize-none transition-all"
                  placeholder="Describe the work started, current progress, or initial notes..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Attachments</label>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#111C24] rounded-lg border border-slate-200 dark:border-slate-800">
                        <span 
                          onClick={() => setSelectedFileForPreview(att)}
                          className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mr-2 flex-1 cursor-pointer hover:text-amber-500 transition-colors"
                        >
                          {att.fileName || "Attachment"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedFileForPreview(att)}
                            className="text-slate-400 hover:text-amber-500 p-1 rounded transition-colors cursor-pointer"
                            title="Preview File"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="text-slate-400 hover:text-amber-500 p-1 rounded transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                            title="Remove Attachment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#111C24] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isUploading && !isRecording ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />} 
                    Attach File
                  </button>
                  <button 
                    type="button" 
                    onClick={toggleRecording}
                    disabled={isUploading && !isRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 dark:bg-[#111C24] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                  >
                    {isUploading && isRecording ? <Loader2 size={14} className="animate-spin" /> : (isRecording ? <Square size={14} /> : <Mic size={14} />)} 
                    {isRecording ? "Stop Recording" : "Voice Note"}
                  </button>
                </div>
              </div>

              <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStartProgressModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors text-sm disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? "Starting..." : "Start Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedFileForPreview && (
        <AttachmentViewerModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
        />
      )}
    </div>
  );
};

// Helper function
const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
};

export default EmployeeTaskDetails;



