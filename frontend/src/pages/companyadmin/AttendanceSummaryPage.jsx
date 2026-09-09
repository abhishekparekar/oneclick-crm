import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import {
  Users, Download, Search, RefreshCw, CalendarCheck,
  FileSpreadsheet, AlertCircle, XCircle, Clock, Award,
  CheckCircle2, Building2, ChevronRight, Calendar
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ── Executive KPI Card ───────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color = "#2563EB", bg = "bg-blue-500/10", textColor = "text-blue-600 dark:text-blue-400" }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group min-w-0">
    <div className="flex-1 min-w-0 pr-2">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${bg} flex-shrink-0 shadow-2xs`}>
          <Icon size={14} style={{ color }} strokeWidth={2.4} />
        </div>
        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
        {value}
      </div>
      {sub && (
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">{sub}</p>
      )}
    </div>
  </div>
);

const AttendanceSummaryPage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["attendance-summary", month, year],
    queryFn: async () => {
      const res = await api.get(`/payroll/company/attendance-summary?month=${month}&year=${year}`);
      return res.data?.data || [];
    },
    staleTime: 60000,
  });

  const summaries = (data || []).filter(s =>
    `${s.employeeName || ""} ${s.employeeCode || ""} ${s.department || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregated Stats
  const totalEmployees = summaries.length;
  const avgPayable = totalEmployees > 0
    ? (summaries.reduce((a, s) => a + (s.payableDays || 0), 0) / totalEmployees).toFixed(1)
    : "0.0";
  const totalAbsent = summaries.reduce((a, s) => a + (s.absentDays || 0), 0);
  const totalLop = summaries.reduce((a, s) => a + (s.lossOfPayDays || 0), 0).toFixed(1);

  const handleExportCSV = () => {
    if (!summaries.length) return;
    const headers = [
      "Team Member", "Code", "Department", "Total Days", "Working Days",
      "Weekly Off", "Holidays", "Present", "Late", "Half Day", "Absent",
      "Paid Leave", "Unpaid Leave", "Payable Days", "LOP Days"
    ];
    const rows = summaries.map(s => [
      `"${s.employeeName || ""}"`,
      `"${s.employeeCode || ""}"`,
      `"${s.department || ""}"`,
      s.totalCalendarDays ?? "",
      s.workingDays ?? "",
      s.weeklyOffDays ?? "",
      s.holidayDays ?? "",
      s.presentDays ?? 0,
      s.lateDays ?? 0,
      s.halfDays ?? 0,
      s.absentDays ?? 0,
      s.paidLeaveDays ?? 0,
      s.unpaidLeaveDays ?? 0,
      s.payableDays ?? 0,
      s.lossOfPayDays ?? 0,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Summary_${MONTH_NAMES[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-full mx-auto font-sans pb-10">
      {/* ── Top Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <FileSpreadsheet size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Payroll Attendance Summary
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Employee-wise monthly attendance calculation for payroll & salary dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
            title="Refresh Attendance Data"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin text-primary-500" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!summaries.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={13} strokeWidth={2.2} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap gap-3 items-center">
        {/* Month Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <Calendar size={13} className="text-slate-400" />
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1} className="bg-white dark:bg-[#111C24] text-slate-900 dark:text-white">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-slate-400">Year:</span>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-16 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none font-mono"
            min={2020}
            max={2035}
          />
        </div>

        {/* Load / Apply Button */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-xs shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          {isFetching ? "Calculating..." : "Load Data"}
        </button>

        {/* Search */}
        <div className="flex-1 relative min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name, code, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* ── Executive KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Total Employees"
          value={totalEmployees}
          sub={`${MONTH_NAMES[month - 1]} ${year}`}
          icon={Users}
          color="#3B82F6"
          bg="bg-blue-500/10 dark:bg-blue-950/40"
          textColor="text-blue-600 dark:text-blue-400"
        />
        <KPICard
          label="Avg Payable Days"
          value={avgPayable}
          sub="Salary eligible days"
          icon={CalendarCheck}
          color="#10B981"
          bg="bg-emerald-500/10 dark:bg-emerald-950/40"
          textColor="text-emerald-600 dark:text-emerald-400"
        />
        <KPICard
          label="Total Absent Days"
          value={totalAbsent}
          sub="Across all employees"
          icon={XCircle}
          color="#EF4444"
          bg="bg-rose-500/10 dark:bg-rose-950/40"
          textColor="text-rose-600 dark:text-rose-400"
        />
        <KPICard
          label="Total LOP Days"
          value={totalLop}
          sub="Loss of Pay deductions"
          icon={AlertCircle}
          color="#F59E0B"
          bg="bg-amber-500/10 dark:bg-amber-950/40"
          textColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* ── Table Container ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">Calculating payroll attendance metrics...</p>
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            <Users size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No attendance data found</p>
            <p className="text-xs mt-1 text-slate-400">Try changing the month/year filter or click Load Data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-3 text-center">Working Days</th>
                  <th className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400">Present</th>
                  <th className="py-3 px-3 text-center text-amber-600 dark:text-amber-400">Late</th>
                  <th className="py-3 px-3 text-center text-purple-600 dark:text-purple-400">Half Day</th>
                  <th className="py-3 px-3 text-center text-rose-600 dark:text-rose-400">Absent</th>
                  <th className="py-3 px-3 text-center text-blue-600 dark:text-blue-400">Paid Leave</th>
                  <th className="py-3 px-3 text-center text-indigo-600 dark:text-indigo-400">LOP Leave</th>
                  <th className="py-3 px-3 text-center">Holiday</th>
                  <th className="py-3 px-3 text-center">W-Off</th>
                  <th className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-300">Payable Days</th>
                  <th className="py-3 px-3 text-center text-rose-700 dark:text-rose-300">LOP Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {summaries.map((s, i) => {
                  const name = s.employeeName || "Unknown Employee";
                  const initial = name.charAt(0).toUpperCase();
                  const isEven = i % 2 === 0;

                  return (
                    <tr
                      key={s.employeeId || i}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        !isEven ? "bg-slate-50/30 dark:bg-slate-900/20" : ""
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 dark:text-white truncate text-xs">
                              {name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                              <span className="font-mono font-semibold">{s.employeeCode || "—"}</span>
                              <span>·</span>
                              <span className="truncate">{s.department || "General"}</span>
                            </div>
                            {s.error && (
                              <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{s.error}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Working Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {s.workingDays ?? "–"}
                      </td>

                      {/* Present */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {s.presentDays ?? 0}
                        </span>
                      </td>

                      {/* Late */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          (s.lateDays || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {s.lateDays ?? 0}
                        </span>
                      </td>

                      {/* Half Day */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          (s.halfDays || 0) > 0 ? "text-purple-600 dark:text-purple-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {s.halfDays ?? 0}
                        </span>
                      </td>

                      {/* Absent */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          (s.absentDays || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {s.absentDays ?? 0}
                        </span>
                      </td>

                      {/* Paid Leave */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          (s.paidLeaveDays || 0) > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {s.paidLeaveDays ?? 0}
                        </span>
                      </td>

                      {/* LOP Leave */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          (s.unpaidLeaveDays || 0) > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {s.unpaidLeaveDays ?? 0}
                        </span>
                      </td>

                      {/* Holiday */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {s.holidayDays ?? 0}
                      </td>

                      {/* Weekly Off */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {s.weeklyOffDays ?? 0}
                      </td>

                      {/* Payable Days */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-black font-mono text-xs shadow-2xs">
                          {s.payableDays ?? "–"}
                        </span>
                      </td>

                      {/* LOP Days */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl font-black font-mono text-xs border shadow-2xs ${
                          (s.lossOfPayDays || 0) > 0
                            ? "bg-rose-500/10 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-500/25"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-slate-700"
                        }`}>
                          {s.lossOfPayDays ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSummaryPage;
