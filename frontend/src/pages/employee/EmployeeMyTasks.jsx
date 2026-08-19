import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isToday, isYesterday, isThisWeek, isThisMonth, subMonths, isSameMonth, isTomorrow, isFuture } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  getEmployeeTasksApi,
  updateEmployeeTaskStatusApi,
  uploadTaskMediaApi
} from "../../api/employeeApi";
import { toast } from "react-hot-toast";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  CheckSquare, Clock, Search, Filter, CheckCircle2, AlertCircle,
  Play, Square, Plus, Send, X, User, ListTodo, FileText, Repeat,
  Briefcase, Calendar, Check, Eye, ChevronRight, LayoutGrid, List,
  Download, ArrowUp, ArrowDown, Sparkles, AlertTriangle, Layers, CalendarClock, Tag
} from "lucide-react";
import EmployeeTaskCreateModal from "../../components/tasks/EmployeeTaskCreateModal";

// ── Status & Priority Config matching Dashboard System ──────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pending", hex: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-500" },
  "in progress": { label: "In Process", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  in_process: { label: "In Process", hex: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  completed: { label: "Completed", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  complete: { label: "Completed", hex: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  overdue: { label: "Overdue", hex: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/60", dot: "bg-rose-500" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800/60" },
  medium: { label: "Medium", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800/60" },
  low: { label: "Low", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800/60" },
};

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

const StatusBadge = ({ status }) => {
  const s = (status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label || status?.replace(/_/g, " ")}
    </span>
  );
};

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, extraClass = "" }) => {
  const sparkData = useMemo(() => [
    { v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 18 }, { v: 25 }, { v: 22 }, { v: 30 },
  ], []);

  return (
    <div className={`bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group ${extraClass}`}>
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-0.5 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px]">
          <span className={`inline-flex items-center font-semibold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-e-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-e-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const EmployeeMyTasks = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTime, setFilterTime] = useState("All Time");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards");

  // Mark Complete Modal State
  const [completeModalTask, setCompleteModalTask] = useState(null);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterPriority, setFilterPriority] = useState("All Priorities");
  const [filterDeadline, setFilterDeadline] = useState("All Tasks");
  const [tempPriority, setTempPriority] = useState("All Priorities");
  const [tempDeadline, setTempDeadline] = useState("All Tasks");

  const completeTaskMutation = useMutation({
    mutationFn: (data) => updateEmployeeTaskStatusApi(data.id, data.status, { remark: data.remark, attachments: data.attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      toast.success("Task marked as complete!");
      handleCloseCompleteModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to complete task")
  });

  const handleCloseCompleteModal = () => {
    setCompleteModalTask(null);
    setFinalRemarks("");
    setAttachments([]);
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCompleteSubmit = () => {
    if (!finalRemarks.trim()) {
      toast.error("Final remarks are required");
      return;
    }
    completeTaskMutation.mutate({
      id: completeModalTask._id || completeModalTask.id,
      status: "complete",
      remark: finalRemarks,
      attachments
    });
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
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: "audio/webm" });
        try {
          setIsUploading(true);
          const res = await uploadTaskMediaApi(file);
          setAttachments(prev => [...prev, {
            fileUrl: res.data.fileUrl || res.data.url,
            fileName: file.name,
            fileType: file.type
          }]);
        } catch (error) {
          toast.error("Failed to upload voice note");
        } finally {
          setIsUploading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const { data: tasksRes, isLoading } = useQuery({
    queryKey: ["employeeMyTasks"],
    queryFn: () => getEmployeeTasksApi().then((res) => res.data),
  });

  const tasks = tasksRes?.tasks || tasksRes?.data || [];

  const getNormalizedStatus = (task) => {
    const rawStatus = task.statusKey || task.status || task.statusLabelSnapshot || "pending";
    const s = String(rawStatus).toLowerCase().trim();
    if (["todo", "pending", "open"].includes(s)) return "pending";
    if (["in-progress", "inprogress", "in_process", "in progress", "working"].includes(s)) return "in progress";
    if (["completed", "complete", "done", "finished"].includes(s)) return "completed";
    if (["overdue"].includes(s)) return "overdue";
    return s;
  };

  const filteredTasks = tasks.filter((task) => {
    let matchesStatus = false;
    const nStatus = getNormalizedStatus(task);
    if (filterStatus === "All") {
      matchesStatus = true;
    } else if (filterStatus === "Overdue") {
      matchesStatus = nStatus === "overdue" || (task.dueDate && new Date(task.dueDate) < new Date() && nStatus !== "completed");
    } else {
      matchesStatus = nStatus === filterStatus.toLowerCase();
    }

    let matchesTime = true;
    const taskDate = task.createdAt ? new Date(task.createdAt) : (task.date ? new Date(task.date) : new Date());
    if (filterTime === "Today") {
      matchesTime = isToday(taskDate);
    } else if (filterTime === "Yesterday") {
      matchesTime = isYesterday(taskDate);
    } else if (filterTime === "This Week") {
      matchesTime = isThisWeek(taskDate);
    } else if (filterTime === "This Month") {
      matchesTime = isThisMonth(taskDate);
    } else if (filterTime === "Last Month") {
      matchesTime = isSameMonth(taskDate, subMonths(new Date(), 1));
    }

    let matchesPriority = true;
    if (filterPriority !== "All Priorities") {
      matchesPriority = (task.priority || "").toLowerCase() === filterPriority.toLowerCase();
    }

    let matchesDeadline = true;
    if (filterDeadline !== "All Tasks") {
      if (!task.dueDate) {
        matchesDeadline = false;
      } else {
        const d = new Date(task.dueDate);
        if (filterDeadline === "All Deadline Coming") {
          matchesDeadline = isFuture(d) || isToday(d);
        } else if (filterDeadline === "Yesterday") {
          matchesDeadline = isYesterday(d);
        } else if (filterDeadline === "Today") {
          matchesDeadline = isToday(d);
        } else if (filterDeadline === "Today & Tomorrow") {
          matchesDeadline = isToday(d) || isTomorrow(d);
        } else if (filterDeadline === "Tomorrow") {
          matchesDeadline = isTomorrow(d);
        }
      }
    }

    const matchesSearch =
      (task.title || task.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesStatus && matchesTime && matchesPriority && matchesDeadline && matchesSearch;
  });

  const finishedTasks = tasks.filter(t => getNormalizedStatus(t) === "completed").length;
  const workingTasks = tasks.filter(t => getNormalizedStatus(t) === "in progress").length;
  const overdueTasks = tasks.filter(t => getNormalizedStatus(t) === "overdue" || (t.dueDate && new Date(t.dueDate) < new Date() && getNormalizedStatus(t) !== "completed")).length;
  const pendingTasksCount = tasks.filter(t => getNormalizedStatus(t) === "pending").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((finishedTasks / totalTasks) * 100);

  const statusFilters = [
    { label: "All", value: "All" },
    { label: "Pending", value: "Pending" },
    { label: "In Process", value: "In Progress" },
    { label: "Completed", value: "Completed" },
    { label: "Overdue", value: "Overdue" }
  ];
  const timeFilters = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month"];

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 w-full">
      {/* ── Page Header matching Dashboard Layout ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            My Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            View assigned tasks, update work status, and track deadlines
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all w-48 shadow-2xs"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#111C24]/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs gap-0.5">
            <button onClick={() => setViewMode("cards")} title="Grid View" className={`p-1.5 rounded-lg transition-colors ${viewMode === "cards" ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode("list")} title="Table View" className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs font-bold" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>
              <List size={13} />
            </button>
          </div>

          {/* Filter Popover */}
          <div className="relative z-20 shrink-0">
            <button
              onClick={() => {
                if (!showFilterModal) {
                  setTempPriority(filterPriority);
                  setTempDeadline(filterDeadline);
                }
                setShowFilterModal(!showFilterModal);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-2xs transition-all ${showFilterModal ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900" : "bg-white dark:bg-[#111C24] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <Filter size={13} className={showFilterModal ? "text-amber-400 dark:text-amber-600" : "text-slate-400"} />
              Filter
              {(filterPriority !== "All Priorities" || filterDeadline !== "All Tasks") && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            {showFilterModal && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#111C24] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 z-30 space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["All Priorities", "Low", "Medium", "High"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setTempPriority(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          tempPriority === p
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                            : "bg-slate-50 dark:bg-[#111C24] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["All Tasks", "All Deadline Coming", "Yesterday", "Today", "Today & Tomorrow", "Tomorrow"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setTempDeadline(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          tempDeadline === d
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                            : "bg-slate-50 dark:bg-[#111C24] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => { setTempPriority("All Priorities"); setTempDeadline("All Tasks"); }}
                    className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { setFilterPriority(tempPriority); setFilterDeadline(tempDeadline); setShowFilterModal(false); }}
                    className="flex-1 text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-xl shadow-xs"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-xs transition-all"
          >
            <Plus size={14} strokeWidth={2.5} /> New Task
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards matching Top Dashboard Row ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <KPICard label="Total Assigned"  value={totalTasks}      trend="100%" isUp period="all time" strokeColor="#EAB308" Icon={CheckSquare} iconBg="bg-amber-500/10"  iconColor="#D97706"/>
        <KPICard label="Pending Tasks"   value={pendingTasksCount} trend="8.2%"  isUp period="last week" strokeColor="#06B6D4" Icon={Clock}        iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="In Progress"     value={workingTasks}    trend="12.0%" isUp period="last week" strokeColor="#8B5CF6" Icon={Sparkles}     iconBg="bg-purple-500/10" iconColor="#7C3AED"/>
        <KPICard label="Finished Tasks"  value={finishedTasks}   trend={`${progressPercent}%`} isUp period="completion" strokeColor="#10B981" Icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Overdue Tasks"   value={overdueTasks}    trend="2.0%"  isUp={false} period="yesterday" strokeColor="#F43F5E" Icon={AlertCircle}  iconBg="bg-rose-500/10" iconColor="#E11D48" extraClass="col-span-2 sm:col-span-1"/>
      </div>

      {/* ── Filter Pills Bar ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row gap-2 justify-between">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {statusFilters.map(sf => {
            const isActive = filterStatus === sf.value;
            const badgeCount = sf.value === "All" ? totalTasks : tasks.filter(t => {
              const nStatus = getNormalizedStatus(t);
              if (sf.value === "Overdue") return nStatus === "overdue" || (t.dueDate && new Date(t.dueDate) < new Date() && nStatus !== "completed");
              return nStatus === sf.value.toLowerCase();
            }).length;

            return (
              <button
                key={sf.label}
                onClick={() => setFilterStatus(sf.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {sf.label}
                <span className={`px-1.5 py-[1px] rounded-md text-[10px] font-black ${
                  isActive ? "bg-white/20 text-white dark:bg-[#0C1520]/20 dark:text-slate-900" : "bg-slate-100 dark:bg-[#111C24] text-slate-500 dark:text-slate-400"
                }`}>
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar border-t md:border-t-0 pt-1 md:pt-0 border-slate-100 dark:border-slate-800">
          {timeFilters.map(tf => {
            const isActive = filterTime === tf;
            return (
              <button
                key={tf}
                onClick={() => setFilterTime(tf)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-extrabold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Task Grid / List View ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
            <CheckCircle2 size={26} strokeWidth={2} />
          </div>
          <p className="text-slate-900 dark:text-white font-extrabold text-base">No tasks found</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">You are all caught up in this section!</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const status = getNormalizedStatus(task);
            const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const deadline = task.dueDate ? new Date(task.dueDate) : null;

            return (
              <div
                key={task._id || task.id}
                className="group relative flex flex-col bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 p-4 isolate"
              >
                <div className="absolute top-0 left-0 bottom-0 w-[3.5px] group-hover:w-[4.5px] transition-all duration-300 z-20 rounded-l-2xl" style={{ backgroundColor: statusCfg.hex }} />
                
                <div className="flex items-center justify-between mb-2 z-10 relative">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111C24] px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                      {task.taskCode || "TASK"}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>

                <h3 className="font-extrabold text-[14.5px] text-slate-900 dark:text-white leading-snug mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 pr-1 z-10 relative">
                  {task.title || task.name}
                </h3>

                <div className="mt-auto flex items-end justify-between z-10 relative pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col gap-1">
                    {deadline && (
                      <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                        <Calendar size={12} />
                        {deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    {task.departmentId?.name && (
                      <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#111C24]/80 px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 w-max">
                        <Briefcase size={9} /> {task.departmentId.name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status !== "completed" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCompleteModalTask(task); }}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Check size={13} strokeWidth={3} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/employee/tasks/${task._id || task.id}`)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#0C1520]/40">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase flex items-center gap-2">
              <Layers size={14} className="text-amber-500" /> My Assigned Tasks
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {filteredTasks.length} tasks
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-[#0C1520]/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Task Title</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTasks.map((task) => {
                  const status = getNormalizedStatus(task);
                  return (
                    <tr key={task._id || task.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                      <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{task.taskCode || "TASK"}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-[13px]">{task.title || task.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium">{task.departmentId?.name || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/employee/tasks/${task._id || task.id}`)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mark Complete Modal ────────────────────────────────────────────── */}
      {completeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Mark Task as Completed</h3>
              <button onClick={handleCloseCompleteModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Final Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={finalRemarks}
                  onChange={(e) => setFinalRemarks(e.target.value)}
                  placeholder="Enter completion remarks..."
                  className="w-full p-3 bg-slate-50 dark:bg-[#0C1520] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition-all min-h-[90px] resize-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Attachments
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isUploading} />
                    <FileText size={16} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-600">Attach File</span>
                  </label>
                  
                  <button 
                    onClick={toggleRecording}
                    disabled={isUploading}
                    className={`p-2.5 border border-dashed rounded-xl transition-colors flex items-center justify-center ${
                      isRecording ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-300 dark:border-slate-800 text-amber-600 hover:bg-slate-50'
                    }`}
                  >
                    {isRecording ? <Square size={16} className="animate-pulse" /> : <Play size={16} className="rotate-90" />}
                  </button>
                </div>
                
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#0C1520] rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{file.fileName || 'Attachment'}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40">
              <button onClick={handleCloseCompleteModal} className="flex-1 py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleCompleteSubmit}
                disabled={completeTaskMutation.isLoading || isUploading}
                className="flex-1 py-2 px-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {completeTaskMutation.isLoading ? "Submitting..." : "Complete Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <EmployeeTaskCreateModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};

export default EmployeeMyTasks;



