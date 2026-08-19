import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanySettingsApi, updateCompanySettingsApi, getLeaveSettingsApi, updateLeaveSettingsApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Settings as SettingsIcon, Clock, Calendar, Globe, Save, AlertCircle,
  ShieldCheck, DollarSign, FileText, Sparkles, ArrowUp, ArrowDown, Edit2, Loader2
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
    defaultCasualLeaves: 12,
    defaultSickLeaves: 10,
    defaultAnnualLeaves: 15,
    defaultUnpaidLeaves: 0,
    allowPaidLeaveOverflowAsLWP: true,
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: res, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: getCompanySettingsApi
  });

  const { data: leaveRes, isLoading: isLeaveLoading } = useQuery({
    queryKey: ['leaveSettings'],
    queryFn: getLeaveSettingsApi
  });

  useEffect(() => {
    if (res?.data?.settings) {
      const s = res.data.settings;
      setFormData(prev => ({
        ...prev,
        shiftStartTime: s.shiftStartTime || "09:30",
        shiftEndTime: s.shiftEndTime || "18:30",
        graceMinutes: s.graceMinutes ?? 15,
        lateMarkGraceMinutes: s.lateMarkGraceMinutes ?? 15,
        halfDayHours: s.halfDayHours ?? 4,
        fullDayHours: s.fullDayHours ?? 8,
        workingDays: s.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        timezone: s.timezone || "Asia/Kolkata",
        currency: s.currency || "INR"
      }));
    }
  }, [res]);

  useEffect(() => {
    if (leaveRes?.data?.settings) {
      const ls = leaveRes.data.settings;
      setFormData(prev => ({
        ...prev,
        defaultCasualLeaves: ls.defaultCasualLeaves ?? 12,
        defaultSickLeaves: ls.defaultSickLeaves ?? 10,
        defaultAnnualLeaves: ls.defaultAnnualLeaves ?? 15,
        defaultUnpaidLeaves: ls.defaultUnpaidLeaves ?? 0,
        allowPaidLeaveOverflowAsLWP: ls.allowPaidLeaveOverflowAsLWP ?? true,
      }));
    }
  }, [leaveRes]);

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
        currency: data.currency
      };

      const leavePayload = {
        defaultCasualLeaves: data.defaultCasualLeaves,
        defaultSickLeaves: data.defaultSickLeaves,
        defaultAnnualLeaves: data.defaultAnnualLeaves,
        defaultUnpaidLeaves: data.defaultUnpaidLeaves,
        allowPaidLeaveOverflowAsLWP: data.allowPaidLeaveOverflowAsLWP
      };

      await Promise.all([
        updateCompanySettingsApi(companyPayload),
        updateLeaveSettingsApi(leavePayload)
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companySettings']);
      queryClient.invalidateQueries(['leaveSettings']);
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

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const isLoading = isCompanyLoading || isLeaveLoading;

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Company System Settings <SettingsIcon size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Configure shift timings, grace periods, working days, and default annual leave quotas.
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
        <KPICard label="Grace Period" value={`${formData.graceMinutes} mins`} trend="Buffer" isUp period="arrival" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Grace Period (Mins)</label>
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

            {/* ── 2. Working Days Card ────────────────────────────────────────────── */}
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

            {/* ── 3. Default Leave Quotas ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Default Annual Leave Quotas</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Standard annual leave balances allocated to new joiners</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Casual Leaves (CL)</label>
                  <input
                    type="number"
                    name="defaultCasualLeaves"
                    value={formData.defaultCasualLeaves}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Sick Leaves (SL)</label>
                  <input
                    type="number"
                    name="defaultSickLeaves"
                    value={formData.defaultSickLeaves}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Earned Leaves (EL)</label>
                  <input
                    type="number"
                    name="defaultAnnualLeaves"
                    value={formData.defaultAnnualLeaves}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  />
                </div>
              </div>
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