import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import { Users, Download, Search, RefreshCw, TrendingUp } from "lucide-react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const Chip = ({ label, value, color }) => (
  <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-center min-w-[52px] ${color}`}>
    <span className="text-lg font-black leading-none">{value ?? "–"}</span>
    <span className="text-[12px] mt-0.5 font-medium leading-none opacity-80">{label}</span>
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
      return res.data.data || [];
    },
    staleTime: 60000,
  });

  const summaries = (data || []).filter(s =>
    `${s.employeeName} ${s.employeeCode}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!summaries.length) return;
    const headers = ["Team Member","Code","Department","Total Days","Working Days","Weekly Off","Holidays","Present","Late","Half Day","Absent","Paid Leave","Unpaid Leave","Payable Days","LOP Days"];
    const rows = summaries.map(s => [
      s.employeeName, s.employeeCode, s.department,
      s.totalCalendarDays, s.workingDays, s.weeklyOffDays, s.holidayDays,
      s.presentDays, s.lateDays, s.halfDays, s.absentDays,
      s.paidLeaveDays, s.unpaidLeaveDays, s.payableDays, s.lossOfPayDays,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Summary_${MONTH_NAMES[month - 1]}_${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Summary</h1>
          <p className="text-base text-slate-300 mt-1">Employee-wise payroll attendance breakdown for salary calculation</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV}
            className="px-4 py-2 bg-ca-bg text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 text-base">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="h-10 px-3 rounded-xl border border-ca-border bg-ca-bg text-base font-semibold outline-none">
          {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
          className="h-10 w-24 px-3 rounded-xl border border-ca-border bg-ca-bg text-base font-semibold outline-none" />
        <button onClick={() => refetch()}
          disabled={isFetching}
          className="h-10 px-4 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 transition-colors flex items-center gap-2">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          {isFetching ? "Loading..." : "Load"}
        </button>
        <div className="flex-1 relative min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ca-text-secondary" />
          <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-ca-bg border border-ca-border rounded-xl text-base outline-none" />
        </div>
      </div>

      {/* Summary Cards */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Employees", value: summaries.length, color: "bg-ca-bg text-blue-700 border-ca-border" },
            { label: "Avg Payable Days", value: (summaries.reduce((a, s) => a + (s.payableDays || 0), 0) / summaries.length).toFixed(1), color: "bg-theme-3-light text-theme-2 border-theme-3-light" },
            { label: "Total Absent Days", value: summaries.reduce((a, s) => a + (s.absentDays || 0), 0), color: "bg-ca-primary-light text-red-700 border-ca-border" },
            { label: "Total LOP Days", value: summaries.reduce((a, s) => a + (s.lossOfPayDays || 0), 0).toFixed(1), color: "bg-ca-primary-light text-amber-700 border-amber-200" },
          ].map(c => (
            <div key={c.label} className={`rounded-2xl border p-4 ${c.color}`}>
              <p className="text-sm font-semibold opacity-70 uppercase tracking-wider">{c.label}</p>
              <p className="text-3xl font-black mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-16 text-ca-text-secondary">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No attendance data for {MONTH_NAMES[month - 1]} {year}</p>
            <p className="text-base mt-1">Select a month/year and click Load</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border">
                  <th className="text-left p-4 font-semibold text-ca-text-secondary">Team Member</th>
                  <th className="text-center p-3 font-semibold text-ca-text-secondary bg-ca-bg">Working<br/>Days</th>
                  <th className="text-center p-3 font-semibold text-theme-2 bg-theme-3-light">Present</th>
                  <th className="text-center p-3 font-semibold text-amber-700 bg-ca-primary-light">Half<br/>Day</th>
                  <th className="text-center p-3 font-semibold text-red-700 bg-ca-primary-light">Absent</th>
                  <th className="text-center p-3 font-semibold text-blue-700 bg-ca-bg">Paid<br/>Leave</th>
                  <th className="text-center p-3 font-semibold text-orange-700 bg-ca-primary-light">LOP<br/>Leave</th>
                  <th className="text-center p-3 font-semibold text-primary-700 bg-primary-50">Holiday</th>
                  <th className="text-center p-3 font-semibold text-theme-2 bg-theme-3-light">W-Off</th>
                  <th className="text-center p-3 font-semibold text-theme-2 bg-theme-3-light">Payable</th>
                  <th className="text-center p-3 font-semibold text-red-700 bg-ca-primary-light">LOP</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr key={s.employeeId} className={`border-b border-ca-border hover:bg-ca-hover transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                    <td className="p-4">
                      <p className="font-semibold text-ca-text">{s.employeeName}</p>
                      <p className="text-sm text-ca-text-secondary">{s.employeeCode} · {s.department}</p>
                      {s.error && <p className="text-sm text-ca-primary mt-1">{s.error}</p>}
                    </td>
                    <td className="p-3 text-center font-bold text-ca-text-secondary">{s.workingDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-theme-2">{(s.presentDays || 0) + (s.lateDays || 0)}</td>
                    <td className="p-3 text-center font-bold text-amber-600">{s.halfDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-ca-primary">{s.absentDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-ca-primary">{s.paidLeaveDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-ca-primary">{s.unpaidLeaveDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-primary-600">{s.holidayDays ?? "–"}</td>
                    <td className="p-3 text-center font-bold text-theme-3">{s.weeklyOffDays ?? "–"}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-theme-3-light text-theme-1 font-black text-base">
                        {s.payableDays ?? "–"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-base ${
                        (s.lossOfPayDays || 0) > 0 ? "bg-ca-primary-light text-red-700" : "bg-ca-bg text-ca-text-secondary"
                      }`}>
                        {s.lossOfPayDays ?? "–"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSummaryPage;
