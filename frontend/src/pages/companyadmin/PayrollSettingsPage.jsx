import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Save, AlertCircle, CheckCircle2, Info, Clock, Calendar, IndianRupee, Edit2, Sparkles, ShieldCheck } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const PayrollSettingsPage = () => {
  const now = new Date();
  const [settings, setSettings] = useState({
    salaryCalculationMode: "working_days",
    payableMonthDays: 0,
    weeklyOffDays: [0],
    includeWeeklyOffAsPaid: true,
    includeHolidayAsPaid: true,
    fullDayMinHours: 8,
    halfDayMinHours: 4,
    halfDayDeductionMode: "half_day_lop",
    pfEnabled: true,
    esiEnabled: true,
    professionalTaxEnabled: true,
    tdsEnabled: true,
    defaultCurrency: "INR",
    payslipPrefix: "PAY",
    autoDeductLopFromSalary: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [previewMonth, setPreviewMonth] = useState(now.getMonth() + 1);
  const [previewYear, setPreviewYear] = useState(now.getFullYear());

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/company/payroll-settings");
      if (res.data?.success && res.data?.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (e) {
      console.error("Failed to fetch payroll settings", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const toggleWeeklyOff = (dayIndex) => {
    if (!isEditing) return;
    setSettings(prev => {
      const current = prev.weeklyOffDays || [];
      const updated = current.includes(dayIndex)
        ? current.filter(d => d !== dayIndex)
        : [...current, dayIndex];
      return { ...prev, weeklyOffDays: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const res = await api.put("/company/payroll-settings", settings);
      if (res.data?.success) {
        setMessage({ type: "success", text: "Payroll formula settings saved successfully!" });
        setIsEditing(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 4000);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update payroll settings" });
    } finally {
      setSaving(false);
    }
  };

  // Preview Calculations
  const totalDays = getDaysInMonth(previewMonth, previewYear);
  const weeklyOffDays = settings.weeklyOffDays || [0];
  let autoWorkingDays = 0;
  let autoWeeklyOffs = 0;
  for (let d = 1; d <= totalDays; d++) {
    const dow = new Date(previewYear, previewMonth - 1, d).getDay();
    if (weeklyOffDays.includes(dow)) autoWeeklyOffs++;
    else autoWorkingDays++;
  }
  const adminPayable = Number(settings.payableMonthDays) || 0;
  const effectiveDivisor = adminPayable > 0 ? adminPayable :
    (settings.salaryCalculationMode === "calendar_days" ? totalDays :
      (autoWorkingDays + (settings.includeWeeklyOffAsPaid ? autoWeeklyOffs : 0)));

  if (loading) return (
    <div className="flex h-full items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Payroll & Statutory Formula Settings <IndianRupee size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Configure payable month divisor days, weekly off pay rules, and LOP salary deduction policies.
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
              <span>Edit Payroll Formulas</span>
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

      {/* ── Stat KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Calculation Mode</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{settings.salaryCalculationMode === "working_days" ? "Working Days" : "Calendar Days"}</h3>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Formula Rule</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <IndianRupee size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Payable Divisor</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{effectiveDivisor} Days</h3>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Fixed Divisor</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Calendar size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Weekly Off Pay</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{settings.includeWeeklyOffAsPaid ? "Paid Offs" : "Unpaid"}</h3>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Standard</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">LOP Deduction</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{settings.autoDeductLopFromSalary ? "Auto LOP" : "Manual"}</h3>
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400">Deduction Rule</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Sparkles size={16} />
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 ${message.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"}`}>
          {message.type === "success" ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          <p>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={!isEditing} className="space-y-4">

          {/* ── 1. Salary Calculation Formula ──────────────────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <IndianRupee size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Salary Calculation Formula</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly divisor rules and custom payable day overrides</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Standard Formula:</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">Monthly Basic Salary ÷ <span className="font-bold">Payable Month Days</span> × Employee Payable Days = Net Payable Salary</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Calculation Mode</label>
                <select name="salaryCalculationMode" value={settings.salaryCalculationMode} onChange={handle} disabled={!isEditing}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75">
                  <option value="working_days">Working Days Mode</option>
                  <option value="calendar_days">Calendar Days Mode (all month days)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Payable Month Days Override (0 = auto)
                </label>
                <input type="number" name="payableMonthDays" min="0" max="31"
                  value={settings.payableMonthDays || 0} onChange={handle} disabled={!isEditing}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  placeholder="e.g. 26" />
              </div>
            </div>
          </div>

          {/* ── 2. Weekly Off Days ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                <Calendar size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Off Days</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Specify company weekly off schedule and paid status</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day, i) => (
                <button key={i} type="button"
                  onClick={() => toggleWeeklyOff(i)}
                  disabled={!isEditing}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                    (settings.weeklyOffDays || []).includes(i)
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}>
                  {day}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Pay for Weekly Offs</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Count weekly off days as paid payable days</p>
              </div>
              <input type="checkbox" name="includeWeeklyOffAsPaid" checked={settings.includeWeeklyOffAsPaid} onChange={handle} disabled={!isEditing}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500" />
            </label>
          </div>

          {/* ── 3. Live Divisor Preview ────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Info size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Divisor Preview</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Simulate monthly payroll divisor for any given month</p>
              </div>
            </div>

            <div className="flex gap-3 mb-2">
              <select value={previewMonth} onChange={e => setPreviewMonth(Number(e.target.value))}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold">
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input type="number" value={previewYear} onChange={e => setPreviewYear(Number(e.target.value))}
                className="w-24 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Calendar Days", value: totalDays },
                { label: "Working Days", value: autoWorkingDays },
                { label: "Weekly Offs", value: autoWeeklyOffs },
                { label: "Effective Divisor", value: effectiveDivisor, bold: true },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-3 text-center border ${
                  stat.bold ? "border-amber-500/40 bg-amber-500/10" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
                }`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.bold ? "text-amber-500" : "text-slate-900 dark:text-white"}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

        </fieldset>

        {isEditing && (
          <div className="sticky bottom-4 bg-white dark:bg-[#111C24] rounded-2xl border border-amber-500/40 p-4 shadow-xl flex items-center justify-between z-30">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unsaved configuration changes.</span>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm flex items-center space-x-1.5">
                <Save size={14} strokeWidth={2.5} />
                <span>{saving ? "Saving..." : "Save Formula"}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PayrollSettingsPage;
