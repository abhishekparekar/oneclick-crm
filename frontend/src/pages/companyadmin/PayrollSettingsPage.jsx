import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Edit2,
  ShieldCheck,
  ExternalLink,
  CalendarCheck,
  Check,
  Calculator,
  Gift,
} from "lucide-react";

const ALL_WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const PayrollSettingsPage = () => {
  const now = new Date();
  const [settings, setSettings] = useState({
    salaryCalculationMode: "working_days",
    payableMonthDays: 0,
    weeklyOffDays: [0, 6],
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

  const [companyWorkingDays, setCompanyWorkingDays] = useState([
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
  ]);
  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [previewMonth, setPreviewMonth] = useState(now.getMonth() + 1);
  const [previewYear, setPreviewYear] = useState(now.getFullYear());

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, holidaysRes] = await Promise.all([
        api.get("/company/payroll-settings"),
        api.get("/company/holidays").catch(() => ({ data: { holidays: [] } })),
      ]);

      if (settingsRes.data?.success && settingsRes.data?.data) {
        const data = settingsRes.data.data;
        setSettings(prev => ({ ...prev, ...data }));
        if (Array.isArray(data.companyWorkingDays) && data.companyWorkingDays.length > 0) {
          setCompanyWorkingDays(data.companyWorkingDays);
        }
      }

      if (holidaysRes.data?.holidays) {
        setHolidays(holidaysRes.data.holidays);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      const res = await api.put("/company/payroll-settings", settings);
      if (res.data?.success) {
        setMessage({ type: "success", text: "Payroll formula settings saved successfully!" });
        setIsEditing(false);
        if (res.data.data) {
          setSettings(prev => ({ ...prev, ...res.data.data }));
          if (res.data.data.companyWorkingDays) {
            setCompanyWorkingDays(res.data.data.companyWorkingDays);
          }
        }
        setTimeout(() => setMessage({ type: "", text: "" }), 4000);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update payroll settings" });
    } finally {
      setSaving(false);
    }
  };

  // Derive weekly off numeric indices and day names directly from company active working days
  const { workingIndices, derivedWeeklyOffIndices, weeklyOffDayNames } = useMemo(() => {
    const wIndices = (companyWorkingDays || [])
      .map(d => DAY_MAP[String(d).toLowerCase().trim()])
      .filter(n => n !== undefined);

    const offIndices = [0, 1, 2, 3, 4, 5, 6].filter(d => !wIndices.includes(d));
    const offNames = ALL_WEEK_DAYS.filter((_, i) => offIndices.includes(i));
    return {
      workingIndices: wIndices,
      derivedWeeklyOffIndices: offIndices,
      weeklyOffDayNames: offNames,
    };
  }, [companyWorkingDays]);

  // Actual Live Divisor Preview calculations for the selected previewMonth and previewYear
  const previewStats = useMemo(() => {
    const totalDays = getDaysInMonth(previewMonth, previewYear);

    // Filter holidays for the selected month & year
    const monthHolidays = (holidays || []).filter(h => {
      if (!h || !h.date) return false;
      const d = new Date(h.date);
      return d.getFullYear() === previewYear && (d.getMonth() + 1) === previewMonth;
    });

    // Map holiday date strings (YYYY-MM-DD)
    const holidayDateSet = new Set(
      monthHolidays.map(h => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    );

    let weeklyOffCount = 0;
    let holidayCount = 0;
    let workingDayCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(previewYear, previewMonth - 1, d);
      const dow = date.getDay();
      const dStr = `${previewYear}-${String(previewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const isOff = derivedWeeklyOffIndices.includes(dow);
      const isHoli = holidayDateSet.has(dStr);

      if (isOff) {
        weeklyOffCount++;
      } else if (isHoli) {
        // Holiday falling on an otherwise active working day
        holidayCount++;
      } else {
        workingDayCount++;
      }
    }

    const adminOverride = Number(settings.payableMonthDays) || 0;
    let effectiveDivisor = 0;
    let formulaBreakdown = "";

    if (adminOverride > 0) {
      effectiveDivisor = adminOverride;
      formulaBreakdown = `Locked to Admin Override (${adminOverride} Days)`;
    } else if (settings.salaryCalculationMode === "calendar_days") {
      effectiveDivisor = totalDays;
      formulaBreakdown = `All ${totalDays} Calendar Days in ${MONTH_NAMES[previewMonth - 1]} ${previewYear}`;
    } else {
      // working_days mode
      effectiveDivisor = workingDayCount;
      const parts = [`${workingDayCount} Working Days`];
      if (settings.includeWeeklyOffAsPaid) {
        effectiveDivisor += weeklyOffCount;
        parts.push(`${weeklyOffCount} Paid Offs`);
      }
      if (settings.includeHolidayAsPaid) {
        effectiveDivisor += holidayCount;
        parts.push(`${holidayCount} Paid Holidays`);
      }
      formulaBreakdown = `${parts.join(" + ")} = ${effectiveDivisor} Days`;
    }

    return {
      totalDays,
      workingDayCount,
      weeklyOffCount,
      holidayCount,
      monthHolidays,
      effectiveDivisor,
      formulaBreakdown,
    };
  }, [
    previewMonth,
    previewYear,
    derivedWeeklyOffIndices,
    holidays,
    settings.payableMonthDays,
    settings.salaryCalculationMode,
    settings.includeWeeklyOffAsPaid,
    settings.includeHolidayAsPaid,
  ]);

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
            Configure payable month divisor rules, weekly off pay policies, and live formula previews.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              <Edit2 size={15} strokeWidth={2.5} />
              <span>Edit Payroll Formulas</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">
              {settings.salaryCalculationMode === "working_days" ? "Working Days" : "Calendar Days"}
            </h3>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Formula Rule</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <IndianRupee size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Effective Divisor</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">
              {previewStats.effectiveDivisor} Days
            </h3>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {Number(settings.payableMonthDays) > 0 ? "Admin Override" : "Live Computed"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Calendar size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Weekly Off Pay</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">
              {settings.includeWeeklyOffAsPaid ? "Paid Offs" : "Unpaid Offs"}
            </h3>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
              {weeklyOffDayNames.length} Days/wk Off
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Holiday Pay</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">
              {settings.includeHolidayAsPaid ? "Paid Holidays" : "Unpaid"}
            </h3>
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400">Company Calendar</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Gift size={16} />
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`p-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 ${
          message.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
        }`}>
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
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                Monthly Basic Salary ÷ <span className="font-bold text-slate-900 dark:text-white">Payable Month Days</span> × Employee Payable Days = Net Payable Salary
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Calculation Mode</label>
                <select
                  name="salaryCalculationMode"
                  value={settings.salaryCalculationMode}
                  onChange={handle}
                  disabled={!isEditing}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                >
                  <option value="working_days">Working Days Mode (Based on active operational days)</option>
                  <option value="calendar_days">Calendar Days Mode (All days in month)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Payable Month Days Override (0 = auto live calculate)
                </label>
                <input
                  type="number"
                  name="payableMonthDays"
                  min="0"
                  max="31"
                  value={settings.payableMonthDays || 0}
                  onChange={handle}
                  disabled={!isEditing}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  placeholder="e.g. 26 or 30 (0 for live dynamic formula)"
                />
              </div>
            </div>
          </div>

          {/* ── 2. Operational Working Days & Pay Policies ─────────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                  <CalendarCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Working Days & Off Pay Rules</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Operational days are synchronized directly from Company System Settings
                  </p>
                </div>
              </div>

              <Link
                to="/company/settings"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all w-fit"
              >
                <span>Edit in System Settings</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Synced Working Days Display */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Active Working Days ({companyWorkingDays.length} days/week)
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALL_WEEK_DAYS.map((day) => {
                    const isActive = companyWorkingDays.includes(day);
                    if (!isActive) return null;
                    return (
                      <span
                        key={day}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400"
                      >
                        <Check size={13} strokeWidth={3} />
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Weekly Off Days ({weeklyOffDayNames.length} days/week)
                </span>
                <div className="flex flex-wrap gap-2">
                  {weeklyOffDayNames.length > 0 ? (
                    weeklyOffDayNames.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/60 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      >
                        {day} (Off)
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 font-medium italic">No weekly offs configured (7-day work week)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Payroll Compensation Policies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-amber-500/40 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Pay for Weekly Offs</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Include weekly off days as paid days in the divisor calculation
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="includeWeeklyOffAsPaid"
                  checked={settings.includeWeeklyOffAsPaid}
                  onChange={handle}
                  disabled={!isEditing}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-amber-500/40 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Pay for Company Holidays</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Include official company calendar holidays as paid days
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="includeHolidayAsPaid"
                  checked={settings.includeHolidayAsPaid}
                  onChange={handle}
                  disabled={!isEditing}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 accent-amber-500"
                />
              </label>
            </div>
          </div>

          {/* ── 3. Live Divisor Preview (Actual Dynamic Data) ─────────────────── */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Calculator size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Divisor Preview</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Calculated using actual calendar dates, company working days, and registered holidays
                  </p>
                </div>
              </div>

              {/* Month & Year Selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={previewMonth}
                  onChange={e => setPreviewMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={previewYear}
                  onChange={e => setPreviewYear(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actual Month Data KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl p-3 text-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Calendar Days</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{previewStats.totalDays}</p>
                <span className="text-[10px] text-slate-400 font-medium">In {MONTH_NAMES[previewMonth - 1]}</span>
              </div>

              <div className="rounded-xl p-3 text-center border border-cyan-500/20 bg-cyan-500/5">
                <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Active Working</p>
                <p className="text-xl font-black text-cyan-600 dark:text-cyan-400">{previewStats.workingDayCount}</p>
                <span className="text-[10px] text-cyan-600/80 font-medium">{companyWorkingDays.length} Days/wk</span>
              </div>

              <div className="rounded-xl p-3 text-center border border-purple-500/20 bg-purple-500/5">
                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Weekly Offs</p>
                <p className="text-xl font-black text-purple-600 dark:text-purple-400">{previewStats.weeklyOffCount}</p>
                <span className="text-[10px] text-purple-600/80 font-medium">{settings.includeWeeklyOffAsPaid ? "Paid" : "Unpaid"}</span>
              </div>

              <div className="rounded-xl p-3 text-center border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Holidays</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{previewStats.holidayCount}</p>
                <span className="text-[10px] text-emerald-600/80 font-medium">{settings.includeHolidayAsPaid ? "Paid" : "Unpaid"}</span>
              </div>

              <div className="col-span-2 md:col-span-1 rounded-xl p-3 text-center border border-amber-500/40 bg-amber-500/10 shadow-xs">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Effective Divisor</p>
                <p className="text-2xl font-black text-amber-500">{previewStats.effectiveDivisor}</p>
                <span className="text-[10px] text-amber-600/90 font-bold">Salary Divisor</span>
              </div>
            </div>

            {/* Formula Explanation Banner */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Applied Rule: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{previewStats.formulaBreakdown}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  Daily Salary = Monthly Basic ÷ {previewStats.effectiveDivisor}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                Example: If an employee's Monthly Basic is <b className="text-slate-700 dark:text-slate-300">₹30,000</b>, their per-day payable rate is{" "}
                <b className="text-emerald-600 dark:text-emerald-400">
                  ₹{previewStats.effectiveDivisor > 0 ? (30000 / previewStats.effectiveDivisor).toFixed(2) : "0.00"}
                </b>
                {" "}per day.
              </div>
            </div>

            {/* Registered Holidays for this Preview Month */}
            {previewStats.monthHolidays.length > 0 && (
              <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Official Holidays in {MONTH_NAMES[previewMonth - 1]} {previewYear}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {previewStats.monthHolidays.map((h, idx) => {
                    const hDate = new Date(h.date);
                    const formattedDate = hDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold"
                      >
                        <Gift size={11} />
                        {formattedDate}: {h.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </fieldset>

        {isEditing && (
          <div className="sticky bottom-4 bg-white dark:bg-[#111C24] rounded-2xl border border-amber-500/40 p-4 shadow-xl flex items-center justify-between z-30">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unsaved configuration changes.</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
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
