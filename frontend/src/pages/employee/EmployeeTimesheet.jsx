import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getDailyTimesheetApi,
  getWeeklyTimesheetApi,
  createManualTimesheetApi,
  getEmployeeTasksApi,
  getEmployeeProjectsApi
} from "../../api/employeeApi";
import { format, addDays, subDays, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Hourglass,
  Plus,
  X,
  Briefcase,
  ClipboardList
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111C24] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-slate-50/50 dark:bg-[#111C24]">
          {children}
        </div>
      </div>
    </div>
  );
};

const EmployeeTimesheet = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isManualLogModalOpen, setIsManualLogModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'

  // Manual Log Form State
  const [logForm, setLogForm] = useState({
    projectId: "",
    taskId: "",
    hoursWorked: "",
    description: ""
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch Daily Logs
  const { data: timesheetRes, isLoading } = useQuery({
    queryKey: ["employeeTimesheetDaily", dateStr],
    queryFn: () => getDailyTimesheetApi({ date: dateStr }).then(res => res.data),
  });
  const dailyLogs = timesheetRes?.logs || [];

  // Fetch Weekly Logs
  const { data: weeklyRes, isLoading: weeklyLoading } = useQuery({
    queryKey: ["employeeTimesheetWeekly", dateStr],
    queryFn: () => getWeeklyTimesheetApi({ week: dateStr }).then(res => res.data),
  });
  const projectsSummary = weeklyRes?.projectsSummary || [];
  const tasksSummary = weeklyRes?.tasksSummary || [];
  const weeklyHoursLogged = (weeklyRes?.totalWeeklyMinutes || 0) / 60;
  const weeklyLogEntries = weeklyRes?.logs?.length || 0;

  // Fetch Tasks for dropdown
  const { data: tasksRes, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["employeeTasks"],
    queryFn: () => getEmployeeTasksApi().then((res) => res.data),
  });
  const tasks = tasksRes?.tasks || [];

  // Fetch Projects for dropdown
  const { data: projectsRes, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["employeeProjects"],
    queryFn: () => getEmployeeProjectsApi().then((res) => res.data),
  });
  const projects = projectsRes?.projects || projectsRes?.data || [];

  const createLogMutation = useMutation({
    mutationFn: (data) => createManualTimesheetApi(data),
    onSuccess: () => {
      toast.success("Hours logged successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeTimesheetDaily"] });
      queryClient.invalidateQueries({ queryKey: ["employeeTimesheetWeekly"] });
      setIsManualLogModalOpen(false);
      setLogForm({ projectId: "", taskId: "", hoursWorked: "", description: "" });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to log hours");
    }
  });

  const handleDateChange = (direction) => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    const hours = parseFloat(logForm.hoursWorked);
    if (!logForm.projectId && !logForm.taskId) {
      toast.error("Please select a project or task");
      return;
    }
    if (!hours || isNaN(hours) || hours <= 0) {
      toast.error("Please enter a valid number of hours");
      return;
    }
    
    // Synthesize start and end time based on selectedDate to satisfy backend
    // Start at 9:00 AM on the selected date
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    
    const totalMinutes = Math.round(hours * 60);
    const end = new Date(start.getTime() + totalMinutes * 60000);

    createLogMutation.mutate({
      projectId: logForm.projectId || undefined,
      taskId: logForm.taskId || undefined,
      description: logForm.description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      totalMinutes
    });
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalMins = 0;
    let sessions = 0;
    dailyLogs.forEach(log => {
      totalMins += (log.totalMinutes || 0);
      sessions += 1;
    });
    return {
      hoursTracked: (totalMins / 60).toFixed(1),
      sessions
    };
  }, [dailyLogs]);

  // Format HH:MM for time display
  const formatTimeStr = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-full max-w-full font-sans pb-24 relative">
      
      {/* Header */}
      <PageHeader title="Timesheets" icon={ClipboardList} />

      {/* Top Section: Date + Tabs + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left: Date Nav & Tabs */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Date Selector */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleDateChange('prev')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-[#f59e0b] hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-[#f59e0b] transition-colors"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 dark:bg-[#f59e0b]/10 px-5 py-2.5 rounded-full border border-amber-200 dark:border-amber-800 dark:border-[#f59e0b]/20">
                <CalendarIcon size={18} className="text-[#f59e0b] dark:text-[#fbbf24]" strokeWidth={2.5} />
                <span className="font-bold text-[#f59e0b] dark:text-[#fbbf24] text-[15px]">{format(selectedDate, 'EEE, MMM d')}</span>
              </div>

              <button 
                onClick={() => handleDateChange('next')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-[#f59e0b] hover:text-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-[#f59e0b] transition-colors"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-50 dark:bg-[#0C1520]/50 rounded-xl p-1 gap-1">
              <button 
                onClick={() => setActiveTab('daily')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white dark:bg-[#111C24] shadow-sm text-[#f59e0b] dark:text-[#fbbf24] border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setActiveTab('weekly')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'weekly' ? 'bg-white dark:bg-[#111C24] shadow-sm text-[#f59e0b] dark:text-[#fbbf24] border border-slate-200 dark:border-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Weekly
              </button>
            </div>
          </div>
          
          {/* Action Button */}
          {activeTab === 'daily' && (
            <button 
              onClick={() => setIsManualLogModalOpen(true)}
              className="w-full bg-[#f59e0b] hover:bg-[#b45309] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-[14px] flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Clock size={18} /> Log Hours Manually
            </button>
          )}
        </div>

        {/* Right: Metrics */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-6 flex flex-col justify-center divide-y divide-slate-100 dark:divide-slate-700/50">
          <div className="py-4 flex flex-col items-center justify-center text-center">
            <div className="text-4xl font-black text-[#f59e0b] dark:text-[#fbbf24] mb-1">{activeTab === 'daily' ? metrics.hoursTracked : weeklyHoursLogged.toFixed(1)}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{activeTab === 'daily' ? 'Hours Tracked' : 'Weekly Hours'}</div>
          </div>
          <div className="py-4 flex flex-col items-center justify-center text-center">
            <div className="text-4xl font-black text-slate-800 dark:text-white mb-1">{activeTab === 'daily' ? metrics.sessions : weeklyLogEntries}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{activeTab === 'daily' ? 'Work Sessions' : 'Log Entries'}</div>
          </div>
        </div>

      </div>

      {/* Daily/Weekly Content */}
      {activeTab === 'daily' ? (
        <>
          <h3 className="text-[11px] font-extrabold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-widest mb-4">Daily Log List</h3>
          <div className="bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
            {isLoading ? (
              <div className="py-24 text-center text-slate-400 font-bold">Loading timesheet logs...</div>
            ) : dailyLogs.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="bg-amber-50 dark:bg-amber-950/30 dark:bg-slate-700/30 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                  <Hourglass size={40} className="text-[#f59e0b] dark:text-slate-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-[#1e293b] dark:text-white mb-2">No timesheet logs for this date.</h3>
                <p className="text-[14px] text-slate-500 font-medium">Once you log your hours, they will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-200 dark:border-amber-800 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30 dark:bg-[#0C1520]/20">
                      <th className="p-5 text-[11px] font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Task / Description</th>
                      <th className="p-5 text-[11px] font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Duration</th>
                      <th className="p-5 text-[11px] font-bold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {dailyLogs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="p-5">
                          <div className="font-bold text-slate-800 dark:text-white text-sm mb-1">{log.task?.title || "Unknown Task"}</div>
                          <div className="text-xs text-slate-500 truncate max-w-md">{log.description || "No description provided."}</div>
                        </td>
                        <td className="p-5">
                          <div className="font-mono font-bold text-[#f59e0b] dark:text-[#fbbf24]">
                            {log.timerActive ? "Running..." : formatTimeStr(log.totalMinutes || 0)}
                          </div>
                        </td>
                        <td className="p-5">
                          {log.timerActive ? (
                            <span className="px-3 py-1 bg-[#f59e0b] text-white font-bold text-[11px] rounded-full uppercase tracking-wider shadow-sm">Active Timer</span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-full uppercase tracking-wider">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <h3 className="text-[11px] font-extrabold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-widest mb-4">Total Hours By Project</h3>
          <div className="bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden mb-6">
            {weeklyLoading ? (
              <div className="py-16 text-center text-slate-400 font-bold">Loading...</div>
            ) : (!projectsSummary || projectsSummary.length === 0) ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="bg-amber-50 dark:bg-amber-950/30 dark:bg-slate-700/30 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                  <Briefcase size={32} className="text-[#f59e0b] dark:text-slate-500" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] text-slate-500 font-medium">No project hours logged this week.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {projectsSummary.map((ps, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{ps.project?.name || "Unknown Project"}</span>
                    <span className="font-mono font-bold text-[#f59e0b] dark:text-[#fbbf24]">{formatTimeStr(ps.totalMinutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className="text-[11px] font-extrabold text-[#f59e0b] dark:text-[#fbbf24] uppercase tracking-widest mb-4">Total Hours By Task</h3>
          <div className="bg-white dark:bg-[#111C24] rounded-[1.5rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
            {weeklyLoading ? (
              <div className="py-16 text-center text-slate-400 font-bold">Loading...</div>
            ) : (!tasksSummary || tasksSummary.length === 0) ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="bg-amber-50 dark:bg-amber-950/30 dark:bg-slate-700/30 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList size={32} className="text-[#f59e0b] dark:text-slate-500" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] text-slate-500 font-medium">No task hours logged this week.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {tasksSummary.map((ts, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{ts.task?.title || "Unknown Task"}</span>
                    <span className="font-mono font-bold text-[#f59e0b] dark:text-[#fbbf24]">{formatTimeStr(ts.totalMinutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Global FAB */}
      <div className="fixed bottom-8 right-8 z-40">
        <button 
          onClick={() => setIsManualLogModalOpen(true)}
          className="w-16 h-16 bg-[#f59e0b] hover:bg-[#b45309] text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        >
          <Plus size={32} strokeWidth={2} />
        </button>
      </div>

      {/* Log Hours Modal */}
      <Modal 
        isOpen={isManualLogModalOpen} 
        onClose={() => setIsManualLogModalOpen(false)} 
        title="Manual Time Entry"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              Associated Project {projectsLoading ? "(Loading...)" : `(${projects.length})`}
              {projectsError ? ` - Error: ${projectsError.message}` : ''}
            </label>
            <select
              value={logForm.projectId}
              onChange={(e) => setLogForm({...logForm, projectId: e.target.value, taskId: ""})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
            >
              <option value="">Select Project...</option>
              {projects.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.title || p.projectName || "Unknown Project"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              Associated Task {tasksLoading ? "(Loading...)" : `(${tasks.length})`}
              {tasksError ? ` - Error: ${tasksError.message}` : ''}
            </label>
            <select
              value={logForm.taskId}
              onChange={(e) => setLogForm({...logForm, taskId: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
            >
              <option value="">Select Task...</option>
              {tasks
                .filter(t => !logForm.projectId || 
                             t.projectId === logForm.projectId || 
                             (t.projectId && t.projectId._id === logForm.projectId) || 
                             (t.project && t.project._id === logForm.projectId))
                .map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>{t.title || t.name || t.taskName || "Unknown Task"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Log Hours Worked</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g. 4.5"
              value={logForm.hoursWorked}
              onChange={(e) => setLogForm({...logForm, hoursWorked: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Work Description</label>
            <textarea
              value={logForm.description}
              onChange={(e) => setLogForm({...logForm, description: e.target.value})}
              placeholder="What did you work on?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px] resize-y text-sm"
            ></textarea>
          </div>

          <button 
            onClick={handleLogSubmit}
            disabled={createLogMutation.isPending}
            className="w-full bg-[#0066ff] hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm mt-4"
          >
            {createLogMutation.isPending ? "Submitting..." : "Submit Timesheet Log"}
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default EmployeeTimesheet;



