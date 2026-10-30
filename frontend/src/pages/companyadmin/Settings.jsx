import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanySettingsApi, updateCompanySettingsApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Settings as SettingsIcon, Clock, Calendar, Globe, Save, AlertCircle,
  ShieldCheck, DollarSign, Sparkles, ArrowUp, ArrowDown, Edit2, Loader2,
  Bell, LogIn, LogOut, User, Users, Coffee, Utensils,
  CheckCircle2, AlertTriangle, MessageSquare, CalendarClock, UserCheck,
  PlusCircle, RefreshCw, Clock4, LayoutGrid, Table, Check
} from "lucide-react";

/* ── Top KPI Stat Card ────────────────────────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`inline-flex items-center font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={2.5}/> : <ArrowDown size={10} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-set-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-set-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const TASK_NOTIFICATION_CONFIGS = [
  {
    key: "taskCreated",
    label: "Task Creation",
    trigger: "New task or recurring template created",
    icon: PlusCircle,
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "taskAssigned",
    label: "Task Assignment & Shifting",
    trigger: "Task assigned, shifted, or reassigned",
    icon: UserCheck,
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "taskStatusChanged",
    label: "Task Status Updates",
    trigger: "Started in-process, reopened, or updated",
    icon: RefreshCw,
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "taskCompleted",
    label: "Task Completion (On-Time)",
    trigger: "Task marked complete within deadline",
    icon: CheckCircle2,
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "taskLateCompleted",
    label: "Task Late Completion",
    trigger: "Overdue task completed after deadline",
    icon: Clock4,
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "taskOverdue",
    label: "Task Overdue & Reminders",
    trigger: "Deadline warnings & overdue alerts",
    icon: AlertTriangle,
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-600 dark:text-rose-400",
  },
  {
    key: "taskComments",
    label: "Task Comments & Media",
    trigger: "New comments or attachments posted",
    icon: MessageSquare,
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-600 dark:text-cyan-400",
  },
  {
    key: "taskFollowUp",
    label: "Task Follow-up Reminders",
    trigger: "Scheduled follow-up reminders & updates",
    icon: CalendarClock,
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-600 dark:text-teal-400",
  },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    shiftStartTime: "09:30",
    shiftEndTime: "18:30",
    graceMinutes: 15,
    lateMarkGraceMinutes: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    timezone: "Asia/Kolkata",
    currency: "INR",
    attendanceNotifications: {
      punchIn: {
        enabled: false,
        notifyEmployee: false,
        notifyManager: false,
        notifyAdmin: false,
      },
      punchOut: {
        enabled: false,
        notifyEmployee: false,
        notifyManager: false,
        notifyAdmin: false,
      },
    },
    taskNotifications: {
      taskCreated: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskAssigned: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskStatusChanged: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskCompleted: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskLateCompleted: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskOverdue: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskComments: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
      taskFollowUp: { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true },
    },
    breaks: {
      lunchBreak: {
        enabled: true,
        durationMinutes: 45,
        startTime: "13:00",
        endTime: "14:00",
      },
      teaBreak: {
        enabled: true,
        durationMinutes: 15,
        maxPerDay: 2,
      },
      deductFromWorkingHours: true,
    },
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [taskNotifView, setTaskNotifView] = useState("cards");

  const { data: res, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => getCompanySettingsApi().then((r) => r?.data || r),
  });

  const settingsData = res?.data?.settings || res?.settings || res?.data || null;

  useEffect(() => {
    if (settingsData) {
      setFormData(prev => ({
        ...prev,
        shiftStartTime: settingsData.shiftStartTime || "09:30",
        shiftEndTime: settingsData.shiftEndTime || "18:30",
        graceMinutes: settingsData.graceMinutes ?? 15,
        lateMarkGraceMinutes: settingsData.lateMarkGraceMinutes ?? 15,
        halfDayHours: settingsData.halfDayHours ?? 4,
        fullDayHours: settingsData.fullDayHours ?? 8,
        workingDays: settingsData.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        timezone: settingsData.timezone || "Asia/Kolkata",
        currency: settingsData.currency || "INR",
        attendanceNotifications: {
          punchIn: {
            enabled: settingsData.attendanceNotifications?.punchIn?.enabled ?? false,
            notifyEmployee: settingsData.attendanceNotifications?.punchIn?.notifyEmployee ?? false,
            notifyManager: settingsData.attendanceNotifications?.punchIn?.notifyManager ?? false,
            notifyAdmin: settingsData.attendanceNotifications?.punchIn?.notifyAdmin ?? false,
          },
          punchOut: {
            enabled: settingsData.attendanceNotifications?.punchOut?.enabled ?? false,
            notifyEmployee: settingsData.attendanceNotifications?.punchOut?.notifyEmployee ?? false,
            notifyManager: settingsData.attendanceNotifications?.punchOut?.notifyManager ?? false,
            notifyAdmin: settingsData.attendanceNotifications?.punchOut?.notifyAdmin ?? false,
          },
        },
        taskNotifications: {
          taskCreated: {
            enabled: settingsData.taskNotifications?.taskCreated?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskCreated?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskCreated?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskCreated?.notifyAdmin ?? true,
          },
          taskAssigned: {
            enabled: settingsData.taskNotifications?.taskAssigned?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskAssigned?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskAssigned?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskAssigned?.notifyAdmin ?? true,
          },
          taskStatusChanged: {
            enabled: settingsData.taskNotifications?.taskStatusChanged?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskStatusChanged?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskStatusChanged?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskStatusChanged?.notifyAdmin ?? true,
          },
          taskCompleted: {
            enabled: settingsData.taskNotifications?.taskCompleted?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskCompleted?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskCompleted?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskCompleted?.notifyAdmin ?? true,
          },
          taskLateCompleted: {
            enabled: settingsData.taskNotifications?.taskLateCompleted?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskLateCompleted?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskLateCompleted?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskLateCompleted?.notifyAdmin ?? true,
          },
          taskOverdue: {
            enabled: settingsData.taskNotifications?.taskOverdue?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskOverdue?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskOverdue?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskOverdue?.notifyAdmin ?? true,
          },
          taskComments: {
            enabled: settingsData.taskNotifications?.taskComments?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskComments?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskComments?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskComments?.notifyAdmin ?? true,
          },
          taskFollowUp: {
            enabled: settingsData.taskNotifications?.taskFollowUp?.enabled ?? true,
            notifyAssignee: settingsData.taskNotifications?.taskFollowUp?.notifyAssignee ?? true,
            notifyManager: settingsData.taskNotifications?.taskFollowUp?.notifyManager ?? true,
            notifyAdmin: settingsData.taskNotifications?.taskFollowUp?.notifyAdmin ?? true,
          },
        },
        breaks: {
          lunchBreak: {
            enabled: settingsData.breaks?.lunchBreak?.enabled ?? true,
            durationMinutes: settingsData.breaks?.lunchBreak?.durationMinutes ?? 45,
            startTime: settingsData.breaks?.lunchBreak?.startTime || "13:00",
            endTime: settingsData.breaks?.lunchBreak?.endTime || "14:00",
          },
          teaBreak: {
            enabled: settingsData.breaks?.teaBreak?.enabled ?? true,
            durationMinutes: settingsData.breaks?.teaBreak?.durationMinutes ?? 15,
            maxPerDay: settingsData.breaks?.teaBreak?.maxPerDay ?? 2,
          },
          deductFromWorkingHours: settingsData.breaks?.deductFromWorkingHours ?? true,
        },
      }));
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const companyPayload = {
        shiftStartTime: data.shiftStartTime,
        shiftEndTime: data.shiftEndTime,
        graceMinutes: data.graceMinutes,
        lateMarkGraceMinutes: data.lateMarkGraceMinutes,
        halfDayHours: data.halfDayHours,
        fullDayHours: data.fullDayHours,
        workingDays: data.workingDays,
        timezone: data.timezone,
        currency: data.currency,
        attendanceNotifications: data.attendanceNotifications,
        taskNotifications: data.taskNotifications,
        breaks: data.breaks,
      };

      const response = await updateCompanySettingsApi(companyPayload);
      return response?.data?.settings || companyPayload;
    },
    onSuccess: (updatedSettings) => {
      if (updatedSettings) {
        setFormData(prev => ({ ...prev, ...updatedSettings }));
        queryClient.setQueryData(['companySettings'], { success: true, settings: updatedSettings });
      }
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      queryClient.invalidateQueries(['companySettings']);
      setSuccessMsg("System settings updated successfully.");
      setIsEditing(false);
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || "Failed to update settings.");
      setSuccessMsg("");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const isSelected = prev.workingDays.includes(day);
      if (isSelected) {
        return { ...prev, workingDays: prev.workingDays.filter(d => d !== day) };
      } else {
        return { ...prev, workingDays: [...prev.workingDays, day] };
      }
    });
  };

  const handleNotificationToggle = (type, field) => {
    setFormData(prev => {
      const current = prev.attendanceNotifications?.[type] || {};
      return {
        ...prev,
        attendanceNotifications: {
          ...prev.attendanceNotifications,
          [type]: {
            ...current,
            [field]: !current[field],
          },
        },
      };
    });
  };

  const handleTaskNotificationToggle = (category, field) => {
    setFormData(prev => {
      const current = prev.taskNotifications?.[category] || {
        enabled: true,
        notifyAssignee: true,
        notifyManager: true,
        notifyAdmin: true,
      };
      return {
        ...prev,
        taskNotifications: {
          ...prev.taskNotifications,
          [category]: {
            ...current,
            [field]: !current[field],
          },
        },
      };
    });
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const isLoading = isCompanyLoading;

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Company System Settings <SettingsIcon size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Configure shift timings, grace periods, and working days.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition-all"
            >
              <Edit2 size={15} strokeWidth={2.5} />
              <span>Edit System Settings</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel Editing
            </button>
          )}
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Shift Schedule" value={`${formData.shiftStartTime} - ${formData.shiftEndTime}`} trend="Regular" isUp period="daily" strokeColor="#06B6D4" Icon={Clock} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Late Grace Period" value={`${formData.graceMinutes} mins`} trend="Buffer" isUp period="arrival" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Working Days" value={`${formData.workingDays.length} Days/wk`} trend="Standard" isUp period="week" strokeColor="#8B5CF6" Icon={Calendar} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Default Timezone" value={formData.timezone.split('/')[1] || "Kolkata"} trend="IST" isUp period="region" strokeColor="#EAB308" Icon={Globe} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={!isEditing} className="space-y-4">

            {/* ── 1. Shift & Timings Card ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Shift & Timing Configurations</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Office hours, late grace threshold, and shift durations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Shift Start Time</label>
                  <input
                    type="time"
                    name="shiftStartTime"
                    value={formData.shiftStartTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Shift End Time</label>
                  <input
                    type="time"
                    name="shiftEndTime"
                    value={formData.shiftEndTime}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Late Grace Period (Mins)</label>
                  <input
                    type="number"
                    name="graceMinutes"
                    value={formData.graceMinutes}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Full Day Hours</label>
                  <input
                    type="number"
                    name="fullDayHours"
                    value={formData.fullDayHours}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>

            {/* ── 2. Break & Meal Policies Card ───────────────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Coffee size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Break & Meal Policies</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Configure Lunch and Tea break durations, allowances, and work-hour deduction rules</p>
                  </div>
                </div>

                {/* Deduct Breaks Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.breaks?.deductFromWorkingHours ?? true}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        breaks: {
                          ...prev.breaks,
                          deductFromWorkingHours: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Deduct Breaks from Working Hours
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 🍱 Lunch Break Box */}
                <div className="p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍱</span>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-400">Lunch Break Policy</h4>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.breaks?.lunchBreak?.enabled ?? true}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              lunchBreak: {
                                ...prev.breaks?.lunchBreak,
                                enabled: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={formData.breaks?.lunchBreak?.durationMinutes ?? 45}
                        disabled={!isEditing || !formData.breaks?.lunchBreak?.enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              lunchBreak: {
                                ...prev.breaks?.lunchBreak,
                                durationMinutes: Number(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Window Start</label>
                      <input
                        type="time"
                        value={formData.breaks?.lunchBreak?.startTime || "13:00"}
                        disabled={!isEditing || !formData.breaks?.lunchBreak?.enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              lunchBreak: {
                                ...prev.breaks?.lunchBreak,
                                startTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Window End</label>
                      <input
                        type="time"
                        value={formData.breaks?.lunchBreak?.endTime || "14:00"}
                        disabled={!isEditing || !formData.breaks?.lunchBreak?.enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              lunchBreak: {
                                ...prev.breaks?.lunchBreak,
                                endTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* ☕ Tea Break Box */}
                <div className="p-4 rounded-xl border border-teal-200/70 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">☕</span>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-900 dark:text-teal-400">Tea / Short Break Policy</h4>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.breaks?.teaBreak?.enabled ?? true}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              teaBreak: {
                                ...prev.breaks?.teaBreak,
                                enabled: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-teal-500 focus:ring-teal-400"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={formData.breaks?.teaBreak?.durationMinutes ?? 15}
                        disabled={!isEditing || !formData.breaks?.teaBreak?.enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              teaBreak: {
                                ...prev.breaks?.teaBreak,
                                durationMinutes: Number(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Max Breaks / Day</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.breaks?.teaBreak?.maxPerDay ?? 2}
                        disabled={!isEditing || !formData.breaks?.teaBreak?.enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            breaks: {
                              ...prev.breaks,
                              teaBreak: {
                                ...prev.breaks?.teaBreak,
                                maxPerDay: Number(e.target.value) || 1,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. Working Days Card ────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Working Days</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Select standard operational days for your organization</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = formData.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 3. Attendance Notification Controls ────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Punch Notification Controls</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Configure who receives alerts when employees punch in or punch out
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Punch In Settings */}
                <div className={`p-4 rounded-xl border transition-all ${
                  formData.attendanceNotifications?.punchIn?.enabled
                    ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800"
                    : "bg-slate-100/40 dark:bg-slate-900/20 border-slate-200/40 dark:border-slate-800/40 opacity-70"
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <LogIn size={13} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Punch-In Notifications</h4>
                        <p className="text-[11px] text-slate-500">Triggered upon clock-in</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={formData.attendanceNotifications?.punchIn?.enabled}
                        onChange={() => handleNotificationToggle("punchIn", "enabled")}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {/* Recipient Roles */}
                  <div className="pt-3 space-y-2.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Target Recipients
                    </span>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <User size={13} className="text-slate-400" />
                        Employee (Self Confirmation)
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchIn?.enabled}
                        checked={formData.attendanceNotifications?.punchIn?.notifyEmployee}
                        onChange={() => handleNotificationToggle("punchIn", "notifyEmployee")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <Users size={13} className="text-slate-400" />
                        Department & Reporting Managers
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchIn?.enabled}
                        checked={formData.attendanceNotifications?.punchIn?.notifyManager}
                        onChange={() => handleNotificationToggle("punchIn", "notifyManager")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <ShieldCheck size={13} className="text-slate-400" />
                        Company Administrators & HR
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchIn?.enabled}
                        checked={formData.attendanceNotifications?.punchIn?.notifyAdmin}
                        onChange={() => handleNotificationToggle("punchIn", "notifyAdmin")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>
                  </div>
                </div>

                {/* Punch Out Settings */}
                <div className={`p-4 rounded-xl border transition-all ${
                  formData.attendanceNotifications?.punchOut?.enabled
                    ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800"
                    : "bg-slate-100/40 dark:bg-slate-900/20 border-slate-200/40 dark:border-slate-800/40 opacity-70"
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <LogOut size={13} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Punch-Out Notifications</h4>
                        <p className="text-[11px] text-slate-500">Triggered upon clock-out</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={formData.attendanceNotifications?.punchOut?.enabled}
                        onChange={() => handleNotificationToggle("punchOut", "enabled")}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {/* Recipient Roles */}
                  <div className="pt-3 space-y-2.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Target Recipients
                    </span>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <User size={13} className="text-slate-400" />
                        Employee (Self Confirmation)
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchOut?.enabled}
                        checked={formData.attendanceNotifications?.punchOut?.notifyEmployee}
                        onChange={() => handleNotificationToggle("punchOut", "notifyEmployee")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <Users size={13} className="text-slate-400" />
                        Department & Reporting Managers
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchOut?.enabled}
                        checked={formData.attendanceNotifications?.punchOut?.notifyManager}
                        onChange={() => handleNotificationToggle("punchOut", "notifyManager")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                        <ShieldCheck size={13} className="text-slate-400" />
                        Company Administrators & HR
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditing || !formData.attendanceNotifications?.punchOut?.enabled}
                        checked={formData.attendanceNotifications?.punchOut?.notifyAdmin}
                        onChange={() => handleNotificationToggle("punchOut", "notifyAdmin")}
                        className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. Task Notification Control System ────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Task Notification Control System</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                        Admin & Manager Controls
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Individually enable or disable task event alerts sent to Administrators, Managers, and Assignees
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Toggle: Grid Cards vs Table Matrix */}
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setTaskNotifView("cards")}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
                        taskNotifView === "cards"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <LayoutGrid size={13} />
                      <span>Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskNotifView("table")}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
                        taskNotifView === "table"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <Table size={13} />
                      <span>Matrix Table</span>
                    </button>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const updated = {};
                            TASK_NOTIFICATION_CONFIGS.forEach(item => {
                              updated[item.key] = { enabled: true, notifyAssignee: true, notifyManager: true, notifyAdmin: true };
                            });
                            return { ...prev, taskNotifications: updated };
                          });
                        }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200/60 dark:border-emerald-800/60"
                      >
                        Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const updated = {};
                            TASK_NOTIFICATION_CONFIGS.forEach(item => {
                              updated[item.key] = { enabled: false, notifyAssignee: false, notifyManager: false, notifyAdmin: false };
                            });
                            return { ...prev, taskNotifications: updated };
                          });
                        }}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        Mute All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* View 1: Spacious 2-Column Cards Grid */}
              {taskNotifView === "cards" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {TASK_NOTIFICATION_CONFIGS.map(config => {
                    const state = formData.taskNotifications?.[config.key] || {
                      enabled: true,
                      notifyAssignee: true,
                      notifyManager: true,
                      notifyAdmin: true,
                    };
                    const isCategoryActive = state.enabled;
                    const IconComp = config.icon;

                    return (
                      <div
                        key={config.key}
                        className={`p-4 rounded-xl border transition-all ${
                          isCategoryActive
                            ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                            : "bg-slate-100/40 dark:bg-slate-900/20 border-slate-200/40 dark:border-slate-800/40 opacity-60"
                        }`}
                      >
                        {/* Header with Icon, Name, Active Badge & Master Toggle */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl ${config.badgeBg} ${config.badgeText} flex items-center justify-center flex-shrink-0 font-bold shadow-xs`}>
                              <IconComp size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{config.label}</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{config.trigger}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isCategoryActive ? (
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                Disabled
                              </span>
                            )}
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                disabled={!isEditing}
                                checked={isCategoryActive}
                                onChange={() => handleTaskNotificationToggle(config.key, "enabled")}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>
                        </div>

                        {/* Recipient Rows with Interactive Styles */}
                        <div className="pt-3 space-y-2">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Target Recipients
                          </span>

                          <div className="space-y-1.5">
                            <label className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                              state.notifyAssignee && isCategoryActive
                                ? "bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                                : "bg-transparent opacity-60"
                            }`}>
                              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                                <User size={13} className="text-slate-400" />
                                <span>Assignee / Assigned Employee</span>
                              </span>
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyAssignee}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyAssignee")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </label>

                            <label className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                              state.notifyManager && isCategoryActive
                                ? "bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                                : "bg-transparent opacity-60"
                            }`}>
                              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                                <Users size={13} className="text-slate-400" />
                                <span>Department & Reporting Managers</span>
                              </span>
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyManager}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyManager")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </label>

                            <label className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                              state.notifyAdmin && isCategoryActive
                                ? "bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                                : "bg-transparent opacity-60"
                            }`}>
                              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                                <ShieldCheck size={13} className="text-slate-400" />
                                <span>Company Administrators & HR</span>
                              </span>
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyAdmin}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyAdmin")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View 2: Executive Matrix Table View */
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5"><User size={12} /> Assignee</span>
                        </th>
                        <th className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5"><Users size={12} /> Managers</span>
                        </th>
                        <th className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> Admin & HR</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {TASK_NOTIFICATION_CONFIGS.map(config => {
                        const state = formData.taskNotifications?.[config.key] || {
                          enabled: true,
                          notifyAssignee: true,
                          notifyManager: true,
                          notifyAdmin: true,
                        };
                        const isCategoryActive = state.enabled;
                        const IconComp = config.icon;

                        return (
                          <tr
                            key={config.key}
                            className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30 ${
                              !isCategoryActive ? "opacity-60 bg-slate-50/20 dark:bg-slate-900/10" : ""
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg ${config.badgeBg} ${config.badgeText} flex items-center justify-center flex-shrink-0 font-bold`}>
                                  <IconComp size={14} />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white text-xs">{config.label}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{config.trigger}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  disabled={!isEditing}
                                  checked={isCategoryActive}
                                  onChange={() => handleTaskNotificationToggle(config.key, "enabled")}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
                              </label>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyAssignee}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyAssignee")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyManager}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyManager")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                disabled={!isEditing || !isCategoryActive}
                                checked={state.notifyAdmin}
                                onChange={() => handleTaskNotificationToggle(config.key, "notifyAdmin")}
                                className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </fieldset>

          {isEditing && (
            <div className="sticky bottom-4 bg-white dark:bg-[#111C24] rounded-2xl border border-amber-500/40 p-4 shadow-xl flex items-center justify-between z-30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">You have unsaved configuration changes.</span>
              <div className="flex items-center space-x-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm flex items-center space-x-1.5">
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}

    </div>
  );
};

export default Settings;