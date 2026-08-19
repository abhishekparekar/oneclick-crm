import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEmployeeTaskApi, uploadTaskMediaApi } from "../../api/employeeApi";
import { X, Calendar, Clock, Upload, Plus, Circle, CheckCircle, Flame, AlertCircle, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EmployeeTaskCreateModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const initialForm = {
    taskType: "one-time", // 'one-time' or 'recurring'
    title: "",
    description: "",
    priority: "medium", // 'low', 'medium', 'high'
    departmentId: user?.department?._id || user?.departmentId || "",
    startDate: getTodayDateString(),
    endDate: "",
    deadlineTime: "17:00",
    followUpDate: getTodayDateString(),
    attachments: [],
    repeatType: "daily",
    weeklyDays: [],
    monthlyDates: [],
    finishDate: "",
  };

  const [form, setForm] = useState(initialForm);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Trigger upload
        handleFileUpload({ target: { files: [file] } });
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
      setForm(prev => ({ ...prev, attachments: [...prev.attachments, fileData] }));
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => createEmployeeTaskApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["employeeTasks"]);
      queryClient.invalidateQueries(["employeeMyTasks"]);
      toast.success("Task created successfully!");
      handleClose(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create task");
    }
  });

  const handleClose = (force = false) => {
    if (!force && JSON.stringify(form) !== JSON.stringify(initialForm)) {
      if (!window.confirm("Data has not been saved. Are you sure you want to close?")) {
        return;
      }
    }
    setForm(initialForm);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleArrayChange = (field, val) => {
    setForm(prev => {
      const arr = [...prev[field]];
      if (arr.includes(val)) {
        return { ...prev, [field]: arr.filter(item => item !== val) };
      } else {
        return { ...prev, [field]: [...arr, val] };
      }
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.taskType === "recurring" ? null : (form.endDate || form.startDate),
      startDate: form.startDate,
      deadlineTime: form.deadlineTime,
      followUpDate: form.followUpDate,
      departmentId: form.departmentId,
      taskType: form.taskType,
      attachments: form.attachments,
      repeatEnabled: form.taskType === "recurring",
      repeatType: form.repeatType,
      weeklyDays: form.weeklyDays,
      monthlyDates: form.monthlyDates,
      finishDate: form.finishDate,
    };
    mutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Create New Task</h2>
          <button onClick={() => handleClose()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
          <form id="employee-task-form" onSubmit={onSubmit} className="space-y-8">
            
            {/* Task Type Segmented Control */}
            <div className="flex justify-center mb-6">
              <div className="bg-slate-100/70 p-1.5 rounded-[14px] flex items-center w-full max-w-sm border border-slate-200/50 shadow-inner">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, taskType: 'one-time' }))}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-300 ${
                    form.taskType === 'one-time' 
                      ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  One-Time Task
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, taskType: 'recurring' }))}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold transition-all duration-300 ${
                    form.taskType === 'recurring' 
                      ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Recurring Task
                </button>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full mb-6" />

            {/* Task Details & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">Task Title <span className="text-[#f97316]">*</span></label>
                  <input 
                    required 
                    type="text" 
                    name="title" 
                    value={form.title} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10 transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm shadow-slate-100/50" 
                    placeholder="What needs to be done?" 
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">Description</label>
                  <textarea 
                    name="description" 
                    value={form.description} 
                    onChange={handleChange} 
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10 transition-all placeholder:text-slate-400 placeholder:font-medium h-28 resize-none shadow-sm shadow-slate-100/50" 
                    placeholder="Add task notes, guidelines or reminders..." 
                  />
                </div>
              </div>

              <div className="space-y-6">
                
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">Priority</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setForm(p => ({ ...p, priority: 'low' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 ${
                        form.priority === 'low' 
                          ? 'bg-[#f0fdf4] border-[#22c55e] text-[#15803d] ring-4 ring-[#22c55e]/15 shadow-sm' 
                          : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Circle size={16} className={form.priority === 'low' ? 'text-[#22c55e] fill-[#22c55e]/20' : 'text-[#22c55e]'} />
                      <span className="text-[13px] font-bold">Low</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setForm(p => ({ ...p, priority: 'medium' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 ${
                        form.priority === 'medium' 
                          ? 'bg-[#fff7ed] border-[#f97316] text-[#c2410c] ring-4 ring-[#f97316]/15 shadow-sm' 
                          : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <AlertCircle size={16} className={form.priority === 'medium' ? 'text-[#f97316] fill-[#f97316]/20' : 'text-[#f97316]'} />
                      <span className="text-[13px] font-bold">Medium</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setForm(p => ({ ...p, priority: 'high' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300 ${
                        form.priority === 'high' 
                          ? 'bg-[#fef2f2] border-[#ef4444] text-[#b91c1c] ring-4 ring-[#ef4444]/15 shadow-sm' 
                          : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Flame size={16} className={form.priority === 'high' ? 'text-[#ef4444] fill-[#ef4444]/20' : 'text-[#ef4444]'} />
                      <span className="text-[13px] font-bold">High</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">Department <span className="text-[#f97316]">*</span></label>
                  <div className="relative">
                    <select 
                      name="departmentId" 
                      value={form.departmentId} 
                      onChange={handleChange} 
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-12 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#f97316] focus:ring-4 focus:ring-[#f97316]/10 transition-all appearance-none shadow-sm shadow-slate-100/50"
                    >
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      {form.departmentId && !["IT", "HR", "Marketing", "Sales"].includes(form.departmentId) && (
                        <option value={form.departmentId}>{user?.department?.name || 'My Department'}</option>
                      )}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <div className="w-[22px] h-[22px] bg-[#fff7ed] border border-[#ffedd5] rounded-[6px] flex items-center justify-center shadow-sm">
                        <div className="w-2.5 h-2.5 bg-[#f97316] rounded-[3px]" />
                      </div>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Timeline & Deadlines */}
            {form.taskType === 'recurring' ? (
              <div>
                <h3 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Calendar size={16} className="text-slate-500" /> RECURRING SCHEDULE SETTINGS
                </h3>

                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-slate-800 mb-2">Repeat Frequency</label>
                  <div className="flex items-center bg-slate-50 p-1.5 rounded-xl">
                    {['daily', 'weekly', 'monthly'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, repeatType: type }))}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
                          form.repeatType === type 
                            ? 'bg-[#0f172a] text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {form.repeatType === 'weekly' && (
                  <div className="mb-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                    <label className="block text-[11px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" /> Select Days of Week <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-between">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                        <div key={day} className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleArrayChange('weeklyDays', day)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                              form.weeklyDays.includes(day)
                                ? i === 0 
                                  ? 'bg-[#0f172a] border-[#0f172a] text-white' 
                                  : 'bg-[#ea580c] border-[#ea580c] text-white'
                                : 'border-slate-200 text-transparent hover:border-slate-300'
                            }`}
                          >
                            {form.weeklyDays.includes(day) ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-slate-300"></span>
                            )}
                          </button>
                          <span className="text-[11px] font-bold text-slate-600">{day}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-4 font-medium">Tasks will be auto-generated on selected days every week.</p>
                  </div>
                )}

                {form.repeatType === 'monthly' && (
                  <div className="mb-6 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                    <label className="block text-[11px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" /> Select Dates of Month <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2 justify-items-center">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                        <button
                          key={date}
                          type="button"
                          onClick={() => handleArrayChange('monthlyDates', date)}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center text-[13px] font-bold transition-all ${
                            form.monthlyDates.includes(date)
                              ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Start Generating <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="date" 
                      name="startDate" 
                      value={form.startDate} 
                      onChange={handleChange} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Daily Deadline (Time) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input 
                        required
                        type="time" 
                        name="deadlineTime" 
                        value={form.deadlineTime} 
                        onChange={handleChange} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-slate-800 mb-1.5">Stop Repeating On (Optional)</label>
                  <input 
                    type="date" 
                    name="finishDate" 
                    value={form.finishDate} 
                    onChange={handleChange} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all placeholder:text-slate-400"
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div className="bg-[#f5f3ff] rounded-xl p-4 flex items-start gap-3 mb-2">
                  <AlertCircle size={18} className="text-[#8b5cf6] shrink-0 mt-0.5" />
                  <p className="text-[13px] font-medium text-[#7c3aed] leading-relaxed">
                    This template will auto-generate a new task {form.repeatType === 'daily' ? 'every day' : form.repeatType === 'weekly' ? 'every week on selected days' : 'every month on the selected dates'} at this exact time, with a deadline of <span className="font-bold">{form.deadlineTime}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-[13px] font-bold text-slate-700 mb-4">Task Timeline & Deadlines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Start Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        name="startDate" 
                        value={form.startDate} 
                        onChange={handleChange} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">End Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        name="endDate" 
                        value={form.endDate} 
                        onChange={handleChange} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Time Deadline</label>
                    <div className="relative">
                      <input 
                        type="time" 
                        name="deadlineTime" 
                        value={form.deadlineTime} 
                        onChange={handleChange} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Follow-up Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        name="followUpDate" 
                        value={form.followUpDate} 
                        onChange={handleChange} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#f97316] transition-all"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            <div className="h-px bg-slate-100 w-full" />

            {/* Attachments */}
            <div>
              <h3 className="text-[13px] font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <FileText size={16} /> ATTACHMENTS
              </h3>
              
              <div className="flex items-center gap-4">
                <div 
                  className={`flex-1 border border-dashed border-slate-300 rounded-xl p-3.5 flex items-center gap-3 bg-white transition-colors cursor-pointer hover:bg-orange-50 hover:border-orange-300 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      if (fileInputRef.current) fileInputRef.current.files = e.dataTransfer.files;
                      handleFileUpload({ target: { files: e.dataTransfer.files } });
                    }
                  }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-[#ea580c] flex items-center justify-center shrink-0">
                    <Plus size={14} className="text-[#ea580c] stroke-[3]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#ea580c]">
                    {isUploading ? "Uploading..." : "Add media or document"}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.webm,.mp4,.mp3,.m4a"
                  />
                </div>

                <button 
                  type="button" 
                  onClick={toggleRecording}
                  className={`w-[52px] h-[52px] rounded-full border flex items-center justify-center transition-all shrink-0 shadow-sm ${
                    isRecording 
                      ? 'bg-red-50 border-red-200 animate-pulse' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  title={isRecording ? "Stop Recording" : "Record Voice Memo"}
                >
                  {isRecording ? (
                    <div className="w-4 h-4 bg-red-500 rounded-sm animate-pulse" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-2.5">Supports: JPG, PNG, PDF, DOC, XLS, Audio (Max. 10MB)</p>
              
              {/* Attachment List */}
              {form.attachments.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {form.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-600 truncate">
                          {file.fileName || 'Attachment'}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button 
            type="button" 
            onClick={() => handleClose()} 
            className="px-6 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="employee-task-form"
            disabled={mutation.isLoading}
            className="px-6 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {mutation.isLoading ? "Creating..." : (
              <>
                <CheckCircle size={16} strokeWidth={3} /> Create Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
