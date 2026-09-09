import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCompanyAttendanceApi,
  getEmployeeAttendanceApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import {
  Search, Calendar, CalendarCheck, Users, CheckCircle2, Clock,
  XCircle, AlertCircle, ChevronDown, ChevronUp,
  CalendarDays, Building2, Filter, RefreshCw, TrendingUp,
  AlarmClock, User, Download, FileSpreadsheet,
} from "lucide-react";

// ── Status Configurations ──────────────────────────────────────────────────
const STATUS_CFG = {
  present:     { label: "Present",     cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  late:        { label: "Late",        cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  absent:      { label: "Absent",      cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  "half-day":  { label: "Half Day",    cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  half_day:    { label: "Half Day",    cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  "on-leave":  { label: "On Leave",    cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
  on_leave:    { label: "On Leave",    cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
  paid_leave:  { label: "Paid Leave",  cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
  unpaid_leave:{ label: "LOP Leave",   cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
  holiday:     { label: "Holiday",     cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  weekly_off:  { label: "Weekly Off",  cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
};

const badge = (st) => {
  const k = (st || "absent").toLowerCase().replace(/_/g, "-");
  const cfg = STATUS_CFG[k] || STATUS_CFG[st] || { label: st || "Absent", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const fmtTime = (t) => {
  if (!t) return "—";
  try {
    return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

const dur = (ci, co, totalHours) => {
  if (totalHours && totalHours > 0) {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    return `${h}h ${m}m`;
  }
  if (!ci || !co) return "—";
  const ms = new Date(co) - new Date(ci);
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

const KPI = ({ label, value, color = "#2563eb" }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-2xs">
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</p>
    <p className="text-base sm:text-lg font-black mt-0.5" style={{ color }}>{value ?? "—"}</p>
  </div>
);

const Loader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AttendanceReport() {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // View modes: "daily" | "monthly"
  const [view, setView] = useState("daily");

  // Daily filters
  const [date, setDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Monthly drill-down
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: deptData } = useQuery({
    queryKey: ["dept-list-report"],
    queryFn: () => getDepartmentsApi(),
    select: (r) => r.data?.departments || r.data || [],
  });
  const departments = deptData || [];

  // Daily attendance
  const { data: dailyRes, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ["att-daily-report", date],
    queryFn: () => getCompanyAttendanceApi({ date }),
    select: (r) => r.data?.attendance || [],
  });
  const dailyRaw = dailyRes || [];

  // Monthly summary (all records for month)
  const { data: monthlyRes, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ["att-monthly-all-report", month, year],
    queryFn: () => getCompanyAttendanceApi({ month, year }),
    select: (r) => r.data?.attendance || [],
    enabled: view === "monthly",
  });
  const monthlyRaw = monthlyRes || [];

  // Employee monthly detail drilldown
  const { data: empDetail, isLoading: empDetailLoading } = useQuery({
    queryKey: ["att-emp-detail-report", selectedEmp?._id, month, year],
    queryFn: () => getEmployeeAttendanceApi(selectedEmp._id, { month, year }),
    select: (r) => r.data?.attendance || [],
    enabled: !!selectedEmp,
  });

  // ── Derived Daily Data ───────────────────────────────────────────────────
  const filteredDaily = useMemo(() => {
    return dailyRaw.filter((rec) => {
      const emp = rec.employeeId;
      if (!emp) return false;
      const st = (rec.status || "absent").toLowerCase();
      if (statusFilter !== "all" && st !== statusFilter && st !== statusFilter.replace(/-/g, "_")) return false;
      if (deptFilter !== "all") {
        const dId = typeof emp.departmentId === "object"
          ? emp.departmentId?._id?.toString()
          : emp.departmentId?.toString();
        if (dId !== deptFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        const code = (emp.employeeCode || "").toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [dailyRaw, statusFilter, deptFilter, search]);

  // Daily KPIs
  const dailyKPIs = useMemo(() => {
    const byStatus = (s) =>
      dailyRaw.filter((r) => {
        const st = (r.status || "absent").toLowerCase().replace(/_/g, "-");
        return st === s || (s === "on-leave" && st.includes("leave"));
      }).length;

    return {
      total: dailyRaw.length,
      present: byStatus("present"),
      late: byStatus("late"),
      absent: byStatus("absent"),
      halfDay: byStatus("half-day"),
      onLeave: byStatus("on-leave"),
    };
  }, [dailyRaw]);

  // ── Monthly Grouped by Employee ──────────────────────────────────────────
  const monthlyByEmp = useMemo(() => {
    const map = {};
    monthlyRaw.forEach((rec) => {
      const emp = rec.employeeId;
      if (!emp || !emp._id) return;
      const key = emp._id.toString();
      if (!map[key]) {
        map[key] = {
          _id: emp._id,
          name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
          code: emp.employeeCode || "—",
          dept: emp.departmentId?.name || "—",
          desig: emp.designationId?.name || emp.role || "Staff",
          records: [],
          present: 0,
          late: 0,
          absent: 0,
          halfDay: 0,
          onLeave: 0,
        };
      }
      map[key].records.push(rec);
      const st = (rec.status || "absent").toLowerCase().replace(/_/g, "-");
      if (st === "present") map[key].present++;
      else if (st === "late") map[key].late++;
      else if (st === "absent") map[key].absent++;
      else if (st === "half-day") map[key].halfDay++;
      else if (st.includes("leave")) map[key].onLeave++;
    });
    return Object.values(map).sort((a, b) => b.present - a.present);
  }, [monthlyRaw]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthlyKPIs = useMemo(() => {
    const uniqueEmps = monthlyByEmp.length;
    const totalEntries = monthlyRaw.length;
    const present = monthlyRaw.filter((r) => r.status === "present").length;
    const late = monthlyRaw.filter((r) => r.status === "late").length;
    const absent = monthlyRaw.filter((r) => r.status === "absent").length;
    const avgAtt = uniqueEmps > 0 && daysInMonth > 0
      ? Math.round(((present + late) / (uniqueEmps * daysInMonth)) * 100)
      : 0;
    return { uniqueEmps, totalEntries, present, late, absent, avgAtt };
  }, [monthlyRaw, monthlyByEmp, daysInMonth]);

  // ── Export Daily to CSV ───────────────────────────────────────────────────
  const exportDailyCSV = () => {
    if (!filteredDaily.length) return;
    const headers = ["#", "Employee Code", "Employee Name", "Department", "Status", "Punch In", "Punch Out", "Total Hours", "Source"];
    const rows = filteredDaily.map((rec, i) => {
      const emp = rec.employeeId;
      const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
      const inTime = fmtTime(rec.punchInTime || rec.checkIn);
      const outTime = fmtTime(rec.punchOutTime || rec.checkOut);
      const duration = dur(rec.punchInTime || rec.checkIn, rec.punchOutTime || rec.checkOut, rec.totalHours);
      return [
        i + 1,
        `"${emp?.employeeCode || "—"}"`,
        `"${name}"`,
        `"${emp?.departmentId?.name || "—"}"`,
        `"${rec.status || "absent"}"`,
        `"${inTime}"`,
        `"${outTime}"`,
        `"${duration}"`,
        `"${rec.source || "punch"}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Attendance_Daily_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Export Monthly to CSV ─────────────────────────────────────────────────
  const exportMonthlyCSV = () => {
    if (!monthlyByEmp.length) return;
    const headers = ["#", "Employee Code", "Employee Name", "Department", "Designation", "Present Days", "Late Days", "Absent Days", "Half Days", "Leave Days", "Attendance %"];
    const rows = monthlyByEmp.map((emp, i) => {
      const attPct = Math.round(((emp.present + emp.late) / daysInMonth) * 100);
      return [
        i + 1,
        `"${emp.code}"`,
        `"${emp.name}"`,
        `"${emp.dept}"`,
        `"${emp.desig}"`,
        emp.present,
        emp.late,
        emp.absent,
        emp.halfDay,
        emp.onLeave,
        `"${attPct}%"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Attendance_Monthly_${months[month - 1]}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 space-y-3.5">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-2xs">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <CalendarCheck className="text-primary" size={22} />
              Attendance Report
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily & monthly employee attendance logs, timings, drill-down, and compliance summaries
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (view === "daily" ? exportDailyCSV() : exportMonthlyCSV())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-bold text-foreground transition-all shadow-2xs cursor-pointer"
            >
              <Download size={13} className="text-primary" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => (view === "daily" ? refetchDaily() : refetchMonthly())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── View Toggle (Pill Switcher) ── */}
        <div className="flex gap-1 bg-muted/60 border border-border/80 rounded-xl p-1 w-fit shadow-2xs">
          {[
            { id: "daily",   label: "Daily Report",   icon: CalendarDays },
            { id: "monthly", label: "Monthly Report",  icon: Calendar },
          ].map((v) => {
            const Icon = v.icon;
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                <Icon size={14} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 1. DAILY REPORT VIEW                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === "daily" && (
          <div className="space-y-3">
            {/* Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
              {/* Date Picker */}
              <div className="flex items-center gap-1.5 bg-muted/50 border border-border px-2.5 py-1.5 rounded-lg text-xs">
                <Calendar size={13} className="text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="half-day">Half Day</option>
                <option value="on-leave">On Leave</option>
              </select>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name || d.departmentName}
                  </option>
                ))}
              </select>

              {/* Search Box */}
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 flex-1 min-w-[180px]">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or employee code..."
                  className="bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none flex-1"
                />
              </div>

              <span className="text-[11px] font-bold text-muted-foreground px-1">
                {filteredDaily.length} records
              </span>
            </div>

            {/* Daily KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
              <KPI label="Total Logs" value={dailyKPIs.total}   color="#2563EB" />
              <KPI label="Present"    value={dailyKPIs.present} color="#10B981" />
              <KPI label="Late"       value={dailyKPIs.late}    color="#F59E0B" />
              <KPI label="Absent"     value={dailyKPIs.absent}  color="#F43F5E" />
              <KPI label="Half Day"   value={dailyKPIs.halfDay} color="#0EA5E9" />
              <KPI label="On Leave"   value={dailyKPIs.onLeave} color="#8B5CF6" />
            </div>

            {/* Daily Table */}
            {dailyLoading ? (
              <Loader />
            ) : filteredDaily.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-xs space-y-2">
                <AlertCircle className="mx-auto text-amber-500 opacity-60" size={28} />
                <p className="font-bold text-sm text-foreground">No attendance records found for this date</p>
                <p className="text-[11px]">Try picking another date or adjusting status / department filters.</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        {["#", "Employee", "Dept", "Designation", "Status", "Check In", "Check Out", "Duration", "Source"].map((h) => (
                          <th
                            key={h}
                            className="px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredDaily.map((rec, i) => {
                        const emp = rec.employeeId;
                        const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
                        const inTime = fmtTime(rec.punchInTime || rec.checkIn);
                        const outTime = fmtTime(rec.punchOutTime || rec.checkOut);
                        const duration = dur(rec.punchInTime || rec.checkIn, rec.punchOutTime || rec.checkOut, rec.totalHours);

                        return (
                          <tr key={rec._id || i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3.5 py-2.5 text-muted-foreground font-bold">{i + 1}</td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground text-xs leading-tight">{name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{emp?.employeeCode || "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-muted-foreground font-medium">
                              {emp?.departmentId?.name || "—"}
                            </td>
                            <td className="px-3.5 py-2.5 text-muted-foreground font-medium">
                              {emp?.designationId?.name || emp?.role || "Staff"}
                            </td>
                            <td className="px-3.5 py-2.5">{badge(rec.status)}</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                              {inTime}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-foreground">
                              {outTime}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                              {duration}
                            </td>
                            <td className="px-3.5 py-2.5 text-[10.5px] uppercase font-bold text-muted-foreground">
                              {rec.source || "punch"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2. MONTHLY REPORT VIEW                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === "monthly" && (
          <div className="space-y-3">
            {/* Month & Year Selectors */}
            <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="text-muted-foreground" size={14} />
                <span className="text-xs font-bold text-muted-foreground">Select Month:</span>
              </div>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none"
              >
                {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <span className="text-[11px] font-bold text-muted-foreground ml-auto">
                {daysInMonth} Days in Month • {monthlyByEmp.length} Staff Enrolled
              </span>
            </div>

            {/* Monthly KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
              <KPI label="Employees"  value={monthlyKPIs.uniqueEmps}   color="#2563EB" />
              <KPI label="Total Logs" value={monthlyKPIs.totalEntries} color="#4F46E5" />
              <KPI label="Present"    value={monthlyKPIs.present}      color="#10B981" />
              <KPI label="Late"       value={monthlyKPIs.late}         color="#F59E0B" />
              <KPI label="Absent"     value={monthlyKPIs.absent}       color="#F43F5E" />
              <KPI label="Avg Att %"  value={`${monthlyKPIs.avgAtt}%`} color="#0EA5E9" />
            </div>

            {monthlyLoading ? (
              <Loader />
            ) : monthlyByEmp.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground text-xs space-y-2">
                <AlertCircle className="mx-auto text-amber-500 opacity-60" size={28} />
                <p className="font-bold text-sm text-foreground">No attendance records found for this month</p>
                <p className="text-[11px]">Select another month or year to review historical logs.</p>
              </div>
            ) : (
              <>
                {/* Employee Monthly Summary Table */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs">
                  <div className="px-3.5 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">
                      Employee Monthly Summary — {months[month - 1]} {year}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Click any employee row to expand daily breakdown
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          {["#", "Employee", "Dept", "Desig", "Present", "Late", "Absent", "Half", "Leave", "Att %"].map((h) => (
                            <th
                              key={h}
                              className="px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {monthlyByEmp.map((emp, i) => {
                          const attPct = Math.round(((emp.present + emp.late) / daysInMonth) * 100);
                          const isExpanded = expandedRow === emp._id?.toString();
                          const empRecords = empDetail || [];

                          return (
                            <React.Fragment key={emp._id || i}>
                              <tr
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedRow(null);
                                    setSelectedEmp(null);
                                  } else {
                                    setExpandedRow(emp._id?.toString());
                                    setSelectedEmp(emp);
                                  }
                                }}
                                className={`transition-colors cursor-pointer ${
                                  isExpanded ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/40"
                                }`}
                              >
                                <td className="px-3.5 py-2.5 text-muted-foreground font-bold">{i + 1}</td>
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">
                                      {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground text-xs leading-tight">{emp.name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{emp.code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3.5 py-2.5 text-muted-foreground font-medium">{emp.dept}</td>
                                <td className="px-3.5 py-2.5 text-muted-foreground font-medium">{emp.desig}</td>
                                <td className="px-3.5 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{emp.present}</td>
                                <td className="px-3.5 py-2.5 font-bold text-amber-600 dark:text-amber-400">{emp.late}</td>
                                <td className="px-3.5 py-2.5 font-bold text-rose-600 dark:text-rose-400">{emp.absent}</td>
                                <td className="px-3.5 py-2.5 font-bold text-sky-600 dark:text-sky-400">{emp.halfDay}</td>
                                <td className="px-3.5 py-2.5 font-bold text-violet-600 dark:text-violet-400">{emp.onLeave}</td>
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="h-1.5 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${Math.min(attPct, 100)}%`,
                                          background: attPct >= 80 ? "#10B981" : attPct >= 60 ? "#F59E0B" : "#F43F5E",
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`text-[10px] font-black ${
                                        attPct >= 80
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : attPct >= 60
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-rose-600 dark:text-rose-400"
                                      }`}
                                    >
                                      {attPct}%
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp size={12} className="text-muted-foreground ml-auto" />
                                    ) : (
                                      <ChevronDown size={12} className="text-muted-foreground ml-auto" />
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Daily Breakdown Grid */}
                              {isExpanded && (
                                <tr key={`exp-${emp._id}`}>
                                  <td colSpan={10} className="px-0 py-0 bg-muted/30">
                                    {empDetailLoading ? (
                                      <div className="flex items-center justify-center py-6">
                                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                      </div>
                                    ) : empRecords.length === 0 ? (
                                      <p className="text-center text-[11px] text-muted-foreground py-4 font-medium">
                                        No individual daily logs found for this month
                                      </p>
                                    ) : (
                                      <div className="p-3.5 sm:p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[11px] font-extrabold text-foreground uppercase tracking-wider">
                                            Daily Breakdown — {emp.name} ({empRecords.length} Days Recorded)
                                          </p>
                                          <span className="text-[10px] font-bold text-muted-foreground">
                                            {months[month - 1]} {year}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                          {empRecords
                                            .sort((a, b) => (a.date < b.date ? -1 : 1))
                                            .map((dr) => {
                                              const inT = fmtTime(dr.punchInTime || dr.checkIn);
                                              const outT = fmtTime(dr.punchOutTime || dr.checkOut);
                                              const dStr = dur(dr.punchInTime || dr.checkIn, dr.punchOutTime || dr.checkOut, dr.totalHours);

                                              return (
                                                <div
                                                  key={dr._id || dr.date}
                                                  className="bg-card rounded-xl border border-border/80 p-2 shadow-2xs space-y-1"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <p className="text-[10.5px] font-black text-foreground">
                                                      {fmtDate(dr.date)}
                                                    </p>
                                                    {badge(dr.status)}
                                                  </div>

                                                  <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{inT}</span>
                                                    <span>→</span>
                                                    <span className="text-rose-600 dark:text-rose-400 font-bold">{outT}</span>
                                                  </div>

                                                  {dStr !== "—" && (
                                                    <div className="text-[9.5px] text-sky-600 dark:text-sky-400 font-bold font-mono text-right">
                                                      ⏱️ {dStr}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Attendance % Comparison Visual Card */}
                <div className="bg-card rounded-xl border border-border p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-primary" />
                      Attendance % Comparison by Staff
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Target: 80%+
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {monthlyByEmp.map((emp) => {
                      const pct = Math.round(((emp.present + emp.late) / daysInMonth) * 100);
                      return (
                        <div key={emp._id} className="flex items-center gap-2 text-xs">
                          <span className="text-[11px] font-bold text-foreground w-36 truncate">{emp.name}</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                background: pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#F43F5E",
                              }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-black w-10 text-right font-mono ${
                              pct >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : pct >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
