import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getEmployeeTasksApi, 
  getDailyTimesheetApi,
  startEmployeeTaskTimerApi,
  stopEmployeeTaskTimerApi
} from "../../api/employeeApi";
import { format, differenceInSeconds } from "date-fns";
import toast from "react-hot-toast";
import { Clock, Play, Square, Plus, ChevronDown } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const EmployeeWorkTracker = () => {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Timer State
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const timerRef = useRef(null);

  // Fetch Assigned Tasks for dropdown
  const { data: tasksRes } = useQuery({
    queryKey: ["employeeTasks"],
    queryFn: () => getEmployeeTasksApi().then((res) => res.data),
  });
  const tasks = tasksRes?.tasks || [];

  // Fetch Today's Logged Sessions
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const { data: timesheetRes, isLoading: timesheetLoading } = useQuery({
    queryKey: ["employeeTimesheetDaily", todayDateStr],
    queryFn: () => getDailyTimesheetApi({ date: todayDateStr }).then(res => res.data),
  });
  
  const dailyLogs = timesheetRes?.logs || [];

  // Mutations
  const startTimerMutation = useMutation({
    mutationFn: (taskId) => startEmployeeTaskTimerApi(taskId),
    onSuccess: (data) => {
      // Data returns the newly started timesheet session
      toast.success("Stopwatch started");
      queryClient.invalidateQueries({ queryKey: ["employeeTimesheetDaily"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to start stopwatch");
      setIsTracking(false);
      setElapsedSeconds(0);
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: (taskId) => stopEmployeeTaskTimerApi(taskId),
    onSuccess: () => {
      toast.success("Stopwatch stopped");
      queryClient.invalidateQueries({ queryKey: ["employeeTimesheetDaily"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to stop stopwatch");
    }
  });

  // Sync state with backend daily logs (to detect if a timer is already running)
  useEffect(() => {
    const activeLog = dailyLogs.find(log => log.timerActive === true);
    if (activeLog) {
      setIsTracking(true);
      setActiveSessionId(activeLog._id);
      setSelectedTaskId(activeLog.task?._id || activeLog.taskId?._id || activeLog.taskId);
      
      const secondsSinceStart = differenceInSeconds(new Date(), new Date(activeLog.startTime));
      setElapsedSeconds(secondsSinceStart > 0 ? secondsSinceStart : 0);
    } else {
      setIsTracking(false);
      setActiveSessionId(null);
      // We don't reset elapsedSeconds immediately so they can see their last stopped time for a moment, 
      // but typically we'd reset if there's no active session.
      if (!isTracking) {
        setElapsedSeconds(0);
      }
    }
  }, [dailyLogs]);

  // Handle the ticking interval
  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  // Handle clicking outside custom dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartStopwatch = () => {
    if (!selectedTaskId) {
      toast.error("Please select an assigned task first.");
      return;
    }
    setIsTracking(true);
    setElapsedSeconds(0); // reset locally immediately for snappy UI
    startTimerMutation.mutate(selectedTaskId);
  };

  const handleStopStopwatch = () => {
    setIsTracking(false);
    stopTimerMutation.mutate(selectedTaskId);
  };

  // Format elapsed seconds into HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-full font-sans pb-24 relative">
      {/* Header */}
      <PageHeader title="Work Tracker" icon={Clock} />

      {/* ACTIVE TASK IN FOCUS */}
      <h3 className="text-[11px] font-extrabold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-widest mb-4">Active Task In Focus</h3>
      <div className="bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-8 mb-10 relative overflow-hidden">
        
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/5 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Custom Dropdown */}
        <div className="mb-12 relative z-10" ref={dropdownRef}>
          <div 
            onClick={() => !isTracking && setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between bg-slate-50 dark:bg-[#0C1520]/50 border ${isDropdownOpen ? 'border-[#f59e0b] ring-1 ring-[#f59e0b]' : 'border-slate-200 dark:border-slate-800'} text-slate-700 dark:text-slate-300 font-bold text-[15px] rounded-xl px-5 py-4 cursor-pointer transition-colors shadow-sm ${isTracking ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span>
              {selectedTaskId 
                ? (() => {
                    const t = tasks.find(task => task._id === selectedTaskId);
                    return t ? `${t.title} - ${t.project?.name || "No Project"}` : "Select an assigned task to start working...";
                  })()
                : "Select an assigned task to start working..."}
            </span>
            <ChevronDown className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={20} />
          </div>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111C24] border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden z-50 max-h-60 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="px-5 py-4 text-slate-500 font-medium">No tasks assigned.</div>
              ) : (
                tasks.map(t => (
                  <div 
                    key={t._id}
                    onClick={() => {
                      setSelectedTaskId(t._id);
                      setIsDropdownOpen(false);
                    }}
                    className={`px-5 py-3 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${selectedTaskId === t._id ? 'bg-amber-50 dark:bg-amber-950/30 dark:bg-[#f59e0b]/20 text-[#f59e0b] dark:text-[#fbbf24] font-bold border-l-4 border-[#f59e0b]' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium border-l-4 border-transparent'}`}
                  >
                    <span>{t.title}</span>
                    <span className={`text-xs ${selectedTaskId === t._id ? 'opacity-100 font-bold' : 'opacity-60'}`}>{t.project?.name || "No Project"}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Stopwatch Layout */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 relative z-10">
          
          {/* Left: Clock */}
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <div className={`relative w-64 h-64 rounded-full border-[8px] flex flex-col items-center justify-center transition-all duration-500 ${isTracking ? 'border-[#f59e0b] shadow-[0_0_30px_rgba(186,51,4,0.2)] bg-amber-50 dark:bg-amber-950/30 dark:bg-[#f59e0b]/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0C1520]/30'}`}>
              <div className="text-5xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter">
                {formatTime(elapsedSeconds)}
              </div>
              <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${isTracking ? 'text-[#f59e0b] dark:text-[#fbbf24]' : 'text-slate-400'}`}>
                {isTracking ? "Tracking Active" : "System Idle"}
              </div>
              {/* Spinning inner ring if tracking */}
              {isTracking && (
                <div className="absolute inset-[-8px] border-[8px] border-transparent border-t-[#f59e0b]/30 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
              )}
            </div>
          </div>

          {/* Right: Button */}
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            {isTracking ? (
              <button 
                onClick={handleStopStopwatch}
                disabled={stopTimerMutation.isPending}
                className="flex items-center justify-center gap-3 w-full max-w-[280px] bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-8 py-5 rounded-2xl text-lg font-black transition-all shadow-lg active:scale-95 disabled:opacity-70 group"
              >
                <Square size={24} fill="currentColor" className="text-rose-500 group-hover:scale-110 transition-transform" /> {stopTimerMutation.isPending ? "Stopping..." : "Stop Timer"}
              </button>
            ) : (
              <button 
                onClick={handleStartStopwatch}
                disabled={startTimerMutation.isPending || !selectedTaskId}
                className="flex items-center justify-center gap-3 w-full max-w-[280px] bg-[#f59e0b] text-white px-8 py-5 rounded-2xl text-lg font-black transition-all shadow-[0_8px_20px_rgba(186,51,4,0.3)] hover:shadow-[0_12px_25px_rgba(186,51,4,0.4)] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:shadow-none active:scale-95 group"
              >
                <Play size={24} fill="currentColor" className="group-hover:scale-110 transition-transform" /> {startTimerMutation.isPending ? "Starting..." : "Start Timer"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TODAY'S LOGGED SESSIONS */}
      <h3 className="text-[11px] font-extrabold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-widest mb-4">Today's Logged Sessions</h3>
      <div className="bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
        {timesheetLoading ? (
          <div className="text-center py-12 text-slate-400 font-bold">Loading today's sessions...</div>
        ) : dailyLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="bg-amber-50 dark:bg-amber-950/30 dark:bg-slate-700/30 w-20 h-20 rounded-full flex items-center justify-center mb-4">
              <Clock size={32} className="text-[#f59e0b] dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-[17px] font-bold text-slate-800 dark:text-white mb-1">No hours logged today yet.</h3>
            <p className="text-[14px] text-slate-500 font-medium">Your logged work sessions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30 dark:bg-[#0C1520]/20">
                  <th className="p-5 text-xs font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Task</th>
                  <th className="p-5 text-xs font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Time Logged</th>
                  <th className="p-5 text-xs font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {dailyLogs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="p-5">
                      <div className="font-bold text-slate-800 dark:text-white text-sm">{log.task?.title || "Unknown Task"}</div>
                    </td>
                    <td className="p-5">
                      <div className="font-mono font-bold text-[#f59e0b] dark:text-[#fbbf24]">
                        {log.timerActive ? "Running..." : formatTime((log.totalMinutes || 0) * 60)}
                      </div>
                    </td>
                    <td className="p-5">
                      {log.timerActive ? (
                        <span className="px-3 py-1 bg-[#f59e0b] text-white font-bold text-[11px] rounded-full uppercase tracking-wider shadow-sm">Active</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-full uppercase tracking-wider">Logged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global FAB handles quick actions */}

    </div>
  );
};

export default EmployeeWorkTracker;



