import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import {
  getCompanyAttendanceApi,
  getEmployeeAttendanceApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import {
  Search, Calendar, CalendarCheck, Users, CheckCircle2, Clock,
  XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronRight,
  CalendarDays, Building2, Filter, RefreshCw, TrendingUp,
  AlarmClock, User, Download, FileSpreadsheet, CheckCircle,
  Coffee, Plane, ShieldCheck, ArrowUp, ArrowDown, MapPin,
} from "lucide-react";

// ── Status Configurations (Matching One Click Design System) ───────────────
const STATUS_CFG = {
  present:     { label: "Present",     bg: "bg-emerald-500/10 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-500" },
  late:        { label: "Late Arrival",bg: "bg-amber-500/10 dark:bg-amber-950/40",   text: "text-amber-700 dark:text-amber-400",   border: "border-amber-500/25",   dot: "bg-amber-500" },
  absent:      { label: "Absent",      bg: "bg-rose-500/10 dark:bg-rose-950/40",     text: "text-rose-700 dark:text-rose-400",     border: "border-rose-500/25",     dot: "bg-rose-500" },
  "half-day":  { label: "Half Day",    bg: "bg-purple-500/10 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/25", dot: "bg-purple-500" },
  half_day:    { label: "Half Day",    bg: "bg-purple-500/10 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/25", dot: "bg-purple-500" },
  "on-leave":  { label: "On Leave",    bg: "bg-blue-500/10 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-400",     border: "border-blue-500/25",     dot: "bg-blue-500" },
  on_leave:    { label: "On Leave",    bg: "bg-blue-500/10 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-400",     border: "border-blue-500/25",     dot: "bg-blue-500" },
  paid_leave:  { label: "Paid Leave",  bg: "bg-blue-500/10 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-400",     border: "border-blue-500/25",     dot: "bg-blue-500" },
  unpaid_leave:{ label: "LOP Leave",   bg: "bg-indigo-500/10 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-500/25", dot: "bg-indigo-500" },
  holiday:     { label: "Holiday",     bg: "bg-slate-500/10 dark:bg-slate-800/60",   text: "text-slate-600 dark:text-slate-300",   border: "border-slate-500/20",   dot: "bg-slate-400" },
  weekly_off:  { label: "Weekly Off",  bg: "bg-slate-500/10 dark:bg-slate-800/60",   text: "text-slate-600 dark:text-slate-300",   border: "border-slate-500/20",   dot: "bg-slate-500" },
};

const StatusBadge = ({ status }) => {
  const k = (status || "absent").toLowerCase();
  const cfg = STATUS_CFG[k] || STATUS_CFG[k.replace(/_/g, "-")] || {
    label: status || "Absent",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
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

// ── Executive KPI Card (Exact Theme Match) ─────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color = "#2563EB", bg = "bg-blue-500/10", textColor = "text-blue-600 dark:text-blue-400" }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group min-w-0">
    <div className="flex-1 min-w-0 pr-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg} flex-shrink-0 shadow-2xs`}>
          <Icon size={13} style={{ color }} strokeWidth={2.4} />
        </div>
        <span className="text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">{label}</span>
      </div>
      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 font-mono">{value}</h3>
      {sub && <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">{sub}</p>}
    </div>
  </div>
);

const Loader = () => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
    <RefreshCw size={24} className="animate-spin text-primary" />
    <p className="text-xs font-bold">Loading attendance intelligence...</p>
  </div>
);

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AttendanceReport() {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // View modes: "daily" | "monthly"
  const [view, setView] = useState("monthly");

  // Daily filters
  const [date, setDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Monthly drill-down
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

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
  const daysInMonth = new Date(year, month, 0).getDate();
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
          weeklyOff: 0,
          holiday: 0,
          overtime: 0,
          totalHours: 0,
        };
      }
      map[key].records.push(rec);
      const st = (rec.status || "absent").toLowerCase().replace(/_/g, "-");
      if (st === "present") {
        map[key].present++;
      } else if (st === "late") {
        map[key].late++;
        map[key].present++; // Late arrival is counted as present day
      } else if (st === "absent") {
        map[key].absent++;
      } else if (st === "half-day") {
        map[key].halfDay++;
      } else if (st.includes("leave")) {
        map[key].onLeave++;
      } else if (st === "weekly-off") {
        map[key].weeklyOff++;
      } else if (st === "holiday") {
        map[key].holiday++;
      }

      const hrs = Number(rec.totalHours || 0);
      map[key].totalHours += hrs;
      if (hrs > 8) {
        map[key].overtime += hrs - 8;
      }
    });

    return Object.values(map)
      .map((emp) => {
        const workingDays = Math.max(0, daysInMonth - emp.weeklyOff - emp.holiday);
        const effectiveWorkingDays =
          workingDays > 0
            ? workingDays
            : (emp.present + emp.absent + emp.halfDay + emp.onLeave) || daysInMonth;
        const attPct =
          effectiveWorkingDays > 0
            ? Math.min(
                100,
                Math.round(
                  ((emp.present + emp.halfDay * 0.5) / effectiveWorkingDays) * 100
                )
              )
            : 0;

        return {
          ...emp,
          workingDays: effectiveWorkingDays,
          attPct,
          overtime: Math.round(emp.overtime * 10) / 10,
          totalHours: Math.round(emp.totalHours * 10) / 10,
        };
      })
      .sort((a, b) => b.present - a.present);
  }, [monthlyRaw, daysInMonth]);

  const monthlyKPIs = useMemo(() => {
    const uniqueEmps = monthlyByEmp.length;
    const totalEntries = monthlyRaw.length;
    const present = monthlyRaw.filter((r) => r.status === "present").length;
    const late = monthlyRaw.filter((r) => r.status === "late").length;
    const absent = monthlyRaw.filter((r) => r.status === "absent").length;
    const avgAtt =
      uniqueEmps > 0 && daysInMonth > 0
        ? Math.round(((present + late) / (uniqueEmps * daysInMonth)) * 100)
        : 0;
    return { uniqueEmps, totalEntries, present, late, absent, avgAtt };
  }, [monthlyRaw, monthlyByEmp, daysInMonth]);

  // ── Helper: Format Date DD/MM/YYYY ──────────────────────────────────────
  const formatDateDDMMYYYY = (d) => {
    if (!d) return "—";
    try {
      const s = String(d).slice(0, 10);
      const parts = s.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        const day = String(dt.getDate()).padStart(2, "0");
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const y = dt.getFullYear();
        return `${day}/${m}/${y}`;
      }
      return d;
    } catch {
      return d;
    }
  };

  // ── Professional Excel (.xlsx) Export Handler (Web Admin) ─────────────────
  const exportAttendanceExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const wb = XLSX.utils.book_new();

      if (view === "monthly") {
        const fileName = `Attendance_Monthly_${months[month - 1]}_${year}`;

        // 1. Sheet 1: Monthly Attendance Summary
        const summaryMetadata = [
          ["Report", "Monthly Employee Attendance Summary Report"],
          ["Generated On", new Date().toLocaleString("en-IN")],
          ["Period", `${months[month - 1]} ${year}`],
          ["Calendar Days in Month", daysInMonth],
          ["Total Enrolled Staff", monthlyKPIs.uniqueEmps],
          ["Staff Displayed", monthlyByEmp.length],
          ["Total Present Count", monthlyKPIs.present],
          ["Total Late Count", monthlyKPIs.late],
          ["Total Absent Count", monthlyKPIs.absent],
          ["Fleet Compliance Rate", `${monthlyKPIs.avgAtt}%`],
        ];

        const summaryHeaders = [
          "#",
          "Employee Name",
          "Employee ID",
          "Department",
          "Designation",
          "Total Working Days",
          "Present Days",
          "Absent Days",
          "Half Days",
          "Leave Days",
          "Weekly Off Days",
          "Holiday Days",
          "Late Days",
          "Total Overtime",
          "Attendance %",
        ];

        const summaryRows = monthlyByEmp.map((emp, i) => [
          i + 1,
          emp.name,
          emp.code,
          emp.dept,
          emp.desig,
          emp.workingDays,
          emp.present,
          emp.absent,
          emp.halfDay,
          emp.onLeave,
          emp.weeklyOff,
          emp.holiday,
          emp.late,
          emp.overtime > 0 ? `${emp.overtime} hrs` : "0.0 hrs",
          `${emp.attPct}%`,
        ]);

        const wsSummaryData = [...summaryMetadata, [], summaryHeaders, ...summaryRows];
        const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

        const summaryColWidths = summaryHeaders.map((h, i) => {
          let maxLen = String(h || "").length;
          summaryRows.forEach((r) => {
            const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : "";
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
        wsSummary["!cols"] = summaryColWidths;
        XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

        // 2. Sheet 2: Date-wise Attendance Details
        const detailHeaders = [
          "#",
          "Date",
          "Employee Name",
          "Employee ID",
          "Department",
          "Punch In",
          "Punch Out",
          "Attendance Status",
          "Late Time",
          "Working Hours",
          "Overtime",
        ];

        const sortedRaw = [...monthlyRaw].sort((a, b) => ((a.date || "") < (b.date || "") ? -1 : 1));
        const detailRows = sortedRaw.map((rec, i) => {
          const emp = rec.employeeId;
          const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
          const inTime = fmtTime(rec.punchInTime || rec.checkIn);
          const outTime = fmtTime(rec.punchOutTime || rec.checkOut);
          const rawStatus = (rec.status || "absent").toLowerCase();
          const totalHrs = Number(rec.totalHours) || 0;
          const otHrs = totalHrs > 8 ? (totalHrs - 8).toFixed(1) : "0.0";
          const lateText = rawStatus === "late" ? `${inTime} (Late Arrival)` : "None";

          return [
            i + 1,
            formatDateDDMMYYYY(rec.date),
            name,
            emp?.employeeCode || "—",
            emp?.departmentId?.name || "—",
            inTime,
            outTime,
            rawStatus.toUpperCase().replace(/_/g, " "),
            lateText,
            `${totalHrs.toFixed(1)} hrs`,
            `${otHrs} hrs`,
          ];
        });

        const wsDetailData = [detailHeaders, ...detailRows];
        const wsDetail = XLSX.utils.aoa_to_sheet(wsDetailData);
        const detailColWidths = detailHeaders.map((h, i) => {
          let maxLen = String(h || "").length;
          detailRows.forEach((r) => {
            const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : "";
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
        wsDetail["!cols"] = detailColWidths;
        XLSX.utils.book_append_sheet(wb, wsDetail, "Date-wise Details");

        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        // Daily View Export (.xlsx)
        const fileName = `Attendance_Daily_${date}`;

        const summaryMetadata = [
          ["Report", "Daily Attendance Log Report"],
          ["Generated On", new Date().toLocaleString("en-IN")],
          ["Date", formatDateDDMMYYYY(date)],
          ["Total Staff Logs", filteredDaily.length],
          ["Present Count", dailyKPIs.present],
          ["Late Count", dailyKPIs.late],
          ["Absent Count", dailyKPIs.absent],
          ["Half Day Count", dailyKPIs.halfDay],
          ["On Leave Count", dailyKPIs.onLeave],
        ];

        const dailyHeaders = [
          "#",
          "Date",
          "Employee Name",
          "Employee ID",
          "Department",
          "Designation",
          "Punch In",
          "Punch Out",
          "Attendance Status",
          "Late Time",
          "Working Hours",
          "Overtime",
          "Source",
        ];

        const dailyRows = filteredDaily.map((rec, i) => {
          const emp = rec.employeeId;
          const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
          const inTime = fmtTime(rec.punchInTime || rec.checkIn);
          const outTime = fmtTime(rec.punchOutTime || rec.checkOut);
          const rawStatus = (rec.status || "absent").toLowerCase();
          const totalHrs = Number(rec.totalHours) || 0;
          const otHrs = totalHrs > 8 ? (totalHrs - 8).toFixed(1) : "0.0";
          const lateText = rawStatus === "late" ? `${inTime} (Late Arrival)` : "None";

          return [
            i + 1,
            formatDateDDMMYYYY(rec.date),
            name,
            emp?.employeeCode || "—",
            emp?.departmentId?.name || "—",
            emp?.designationId?.name || emp?.role || "Staff",
            inTime,
            outTime,
            rawStatus.toUpperCase().replace(/_/g, " "),
            lateText,
            `${totalHrs.toFixed(1)} hrs`,
            `${otHrs} hrs`,
            rec.source || "punch",
          ];
        });

        const wsDailyData = [...summaryMetadata, [], dailyHeaders, ...dailyRows];
        const wsDaily = XLSX.utils.aoa_to_sheet(wsDailyData);
        const dailyColWidths = dailyHeaders.map((h, i) => {
          let maxLen = String(h || "").length;
          dailyRows.forEach((r) => {
            const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : "";
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
        wsDaily["!cols"] = dailyColWidths;
        XLSX.utils.book_append_sheet(wb, wsDaily, "Daily Attendance");

        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
    } catch (err) {
      console.error("[AttendanceReport] Error exporting Excel:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-4 max-w-[1440px] mx-auto pb-24 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Seamless Page Header (Matching Dashboard & Attendance layout) ─────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Attendance Report
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive daily logs, monthly summaries, interactive drill-down & compliance metrics
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative z-30 w-full sm:w-auto">
          {/* Segmented View Switcher Pill */}
          <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setView("daily")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                view === "daily"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays size={13} />
              <span>Daily Report</span>
            </button>
            <button
              type="button"
              onClick={() => setView("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                view === "monthly"
                  ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar size={13} />
              <span>Monthly Summary</span>
            </button>
          </div>

          {/* Export Excel (.xlsx) Button */}
          <button
            type="button"
            onClick={exportAttendanceExcel}
            disabled={exportingExcel}
            className={`flex items-center justify-center gap-1.5 px-3.5 h-8 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer ${
              exportingExcel ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {exportingExcel ? (
              <RefreshCw size={13} className="animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet size={13} className="text-emerald-600" />
            )}
            <span>{exportingExcel ? "Exporting..." : "Export Excel"}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => (view === "daily" ? refetchDaily() : refetchMonthly())}
            className="flex items-center justify-center gap-1.5 px-3 h-8 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw size={13} className="text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. DAILY REPORT VIEW                                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {view === "daily" && (
        <div className="space-y-3.5">
          {/* Top Stat KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <KPICard label="Total Logs" value={dailyKPIs.total} sub="Logged today" icon={CalendarCheck} color="#2563EB" bg="bg-blue-500/10" />
            <KPICard label="Present"    value={dailyKPIs.present} sub="On time" icon={CheckCircle} color="#10B981" bg="bg-emerald-500/10" />
            <KPICard label="Late"       value={dailyKPIs.late} sub="Delayed punch" icon={Clock} color="#F59E0B" bg="bg-amber-500/10" />
            <KPICard label="Absent"     value={dailyKPIs.absent} sub="No show" icon={XCircle} color="#F43F5E" bg="bg-rose-500/10" />
            <KPICard label="Half Day"   value={dailyKPIs.halfDay} sub="Short hours" icon={Coffee} color="#8B5CF6" bg="bg-purple-500/10" />
            <KPICard label="On Leave"   value={dailyKPIs.onLeave} sub="Approved" icon={Plane} color="#3B82F6" bg="bg-blue-500/10" />
          </div>

          {/* Filters Row Toolbar */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] w-full md:w-auto group">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by team member name or employee code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 h-9 bg-white dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Filters Group */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Date Picker */}
                <div className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={todayStr}
                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                  <option value="on-leave">On Leave</option>
                </select>

                {/* Department Filter */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name || d.departmentName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Daily Table */}
            <div className="overflow-x-auto">
              {dailyLoading ? (
                <Loader />
              ) : filteredDaily.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <AlertCircle size={28} className="mx-auto text-amber-500 opacity-60" />
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">No attendance records found for this date</p>
                  <p className="text-xs text-slate-400">Try selecting another date or clearing your search filters</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      {["#", "Team Member", "Department", "Designation", "Status", "Punch In", "Punch Out", "Total Hours", "Source"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredDaily.map((rec, i) => {
                      const emp = rec.employeeId;
                      const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";
                      const inTime = fmtTime(rec.punchInTime || rec.checkIn);
                      const outTime = fmtTime(rec.punchOutTime || rec.checkOut);
                      const duration = dur(rec.punchInTime || rec.checkIn, rec.punchOutTime || rec.checkOut, rec.totalHours);

                      return (
                        <tr key={rec._id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight truncate">{name}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp?.employeeCode || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                            {emp?.departmentId?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                            {emp?.designationId?.name || emp?.role || "Staff"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={rec.status} />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                            {inTime}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                            {outTime}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-sky-600 dark:text-sky-400">
                            {duration}
                          </td>
                          <td className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400">
                            {rec.source || "punch"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. MONTHLY REPORT VIEW                                                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {view === "monthly" && (
        <div className="space-y-3.5">
          {/* Top Stat KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <KPICard label="Staff Roster" value={monthlyKPIs.uniqueEmps} sub="Active employees" icon={Users} color="#2563EB" bg="bg-blue-500/10" />
            <KPICard label="Total Entries" value={monthlyKPIs.totalEntries} sub="Month logs" icon={FileSpreadsheet} color="#4F46E5" bg="bg-indigo-500/10" />
            <KPICard label="Present"      value={monthlyKPIs.present} sub="Full days" icon={CheckCircle} color="#10B981" bg="bg-emerald-500/10" />
            <KPICard label="Late Days"    value={monthlyKPIs.late} sub="Delayed punches" icon={Clock} color="#F59E0B" bg="bg-amber-500/10" />
            <KPICard label="Absent Days"  value={monthlyKPIs.absent} sub="Missed shifts" icon={XCircle} color="#F43F5E" bg="bg-rose-500/10" />
            <KPICard label="Avg Attendance" value={`${monthlyKPIs.avgAtt}%`} sub="Fleet compliance" icon={TrendingUp} color="#0EA5E9" bg="bg-sky-500/10" />
          </div>

          {/* Month & Year Selection Bar */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Calendar size={15} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  Reporting Period
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {daysInMonth} Calendar Days • {monthlyByEmp.length} Enrolled Employees
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-800">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-transparent px-3 py-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-transparent px-3 py-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer border-l border-slate-200 dark:border-slate-800"
                >
                  {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Employee Monthly Summary Table */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Employee Monthly Summary — {months[month - 1]} {year}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Click any row to expand the day-by-day punch log timeline
                </p>
              </div>
              <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                {monthlyByEmp.length} Staff
              </span>
            </div>

            <div className="overflow-x-auto">
              {monthlyLoading ? (
                <Loader />
              ) : monthlyByEmp.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <AlertCircle size={28} className="mx-auto text-amber-500 opacity-60" />
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">No attendance records found for this month</p>
                  <p className="text-xs text-slate-400">Select another month or check employee punches</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      {[
                        "#",
                        "Team Member",
                        "Department",
                        "Designation",
                        "Work Days",
                        "Present",
                        "Late",
                        "Absent",
                        "Half Day",
                        "Leaves",
                        "Weekly Off",
                        "Holiday",
                        "Overtime",
                        "Attendance Rate",
                        "",
                      ].map((h, idx) => (
                        <th
                          key={idx}
                          className={`px-3 py-3 text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap ${
                            idx >= 4 && idx <= 12 ? "text-center" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {monthlyByEmp.map((emp, i) => {
                      const attPct = emp.attPct || 0;
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
                            className={`cursor-pointer transition-colors ${
                              isExpanded
                                ? "bg-blue-50/50 dark:bg-blue-950/20"
                                : "hover:bg-slate-50/80 dark:hover:bg-slate-850/50"
                            }`}
                          >
                            <td className="px-3 py-3.5 text-slate-400 font-bold">{i + 1}</td>
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight truncate">{emp.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                              {emp.dept}
                            </td>
                            <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                              {emp.desig}
                            </td>

                            {/* Total Working Days */}
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                                {emp.workingDays}
                              </span>
                            </td>

                            {/* Counts with clean badge chips */}
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                {emp.present}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                {emp.late}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/10">
                                {emp.absent}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-500/10">
                                {emp.halfDay}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10">
                                {emp.onLeave}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-slate-600 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800">
                                {emp.weeklyOff}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
                                {emp.holiday}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-md font-mono font-black text-sky-600 dark:text-sky-400 bg-sky-500/10">
                                {emp.overtime > 0 ? `${emp.overtime}h` : "—"}
                              </span>
                            </td>

                            {/* Attendance % Wide Gradient Progress Bar */}
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2 min-w-[130px]">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(attPct, 100)}%`,
                                      background:
                                        attPct >= 80
                                          ? "linear-gradient(90deg, #10B981, #059669)"
                                          : attPct >= 60
                                          ? "linear-gradient(90deg, #F59E0B, #D97706)"
                                          : "linear-gradient(90deg, #F43F5E, #E11D48)",
                                    }}
                                  />
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono tracking-tight shrink-0 ${
                                    attPct >= 80
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                      : attPct >= 60
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                                  }`}
                                >
                                  {attPct}%
                                </span>
                              </div>
                            </td>

                            {/* Chevron Toggle Icon */}
                            <td className="px-3 py-3.5 text-right">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Daily Breakdown Grid */}
                          {isExpanded && (
                            <tr key={`exp-${emp._id}`}>
                              <td colSpan={15} className="p-0 bg-slate-50/70 dark:bg-[#0E1624]">
                                <div className="p-4 sm:p-5 space-y-3 border-y border-slate-200/80 dark:border-slate-800/80">
                                  {/* Employee Monthly Summary Bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                      <Clock size={15} className="text-blue-500" />
                                      <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                          {emp.name} — Monthly Attendance Overview
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          {emp.code} • {emp.dept} • {emp.desig} • {months[month - 1]} {year}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-700 dark:text-slate-300">
                                        Working Days: <b>{emp.workingDays}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-extrabold">
                                        Present: <b>{emp.present}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 font-extrabold">
                                        Absent: <b>{emp.absent}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 font-extrabold">
                                        Half Days: <b>{emp.halfDay}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-extrabold">
                                        Leaves: <b>{emp.onLeave}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
                                        Weekly Off: <b>{emp.weeklyOff}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 font-extrabold">
                                        Holidays: <b>{emp.holiday}</b>
                                      </span>
                                      <span className="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-600 font-extrabold">
                                        Overtime: <b>{emp.overtime}h</b>
                                      </span>
                                    </div>
                                  </div>

                                  {empDetailLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                      <RefreshCw size={18} className="animate-spin text-blue-500" />
                                    </div>
                                  ) : empRecords.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-4">
                                      No individual punch logs recorded for this employee in {months[month - 1]} {year}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                                      {empRecords
                                        .sort((a, b) => (a.date < b.date ? -1 : 1))
                                        .map((dr) => {
                                          const inT = fmtTime(dr.punchInTime || dr.checkIn);
                                          const outT = fmtTime(dr.punchOutTime || dr.checkOut);
                                          const dStr = dur(dr.punchInTime || dr.checkIn, dr.punchOutTime || dr.checkOut, dr.totalHours);
                                          const otHrs = dr.totalHours && dr.totalHours > 8 ? (dr.totalHours - 8).toFixed(1) : null;

                                          return (
                                            <div
                                              key={dr._id || dr.date}
                                              className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-2xs space-y-1.5 hover:shadow-xs transition-all"
                                            >
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="text-[10.5px] font-black text-slate-900 dark:text-white">
                                                  {fmtDate(dr.date)}
                                                </span>
                                                <StatusBadge status={dr.status} />
                                              </div>

                                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono space-y-0.5">
                                                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                                  <span className="text-[9px] text-slate-400 font-sans">IN</span>
                                                  <span>{inT}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold">
                                                  <span className="text-[9px] text-slate-400 font-sans">OUT</span>
                                                  <span>{outT}</span>
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[9.5px]">
                                                <span className="text-sky-600 dark:text-sky-400 font-black">
                                                  {dStr !== "—" ? `⏱️ ${dStr}` : "—"}
                                                </span>
                                                {otHrs && (
                                                  <span className="text-amber-600 dark:text-amber-400 font-extrabold bg-amber-500/10 px-1 rounded">
                                                    +{otHrs}h OT
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Monthly Attendance % Comparison Visual Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Attendance % Fleet Comparison
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Employee compliance rate benchmarked against monthly target
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                Target: 80%+
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {monthlyByEmp.map((emp) => {
                const pct = Math.round(((emp.present + emp.late) / daysInMonth) * 100);
                return (
                  <div key={emp._id} className="flex items-center gap-3 text-xs">
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white w-40 truncate">
                      {emp.name}
                    </span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background:
                            pct >= 80
                              ? "linear-gradient(90deg, #10B981, #059669)"
                              : pct >= 60
                              ? "linear-gradient(90deg, #F59E0B, #D97706)"
                              : "linear-gradient(90deg, #F43F5E, #E11D48)",
                        }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-black font-mono w-10 text-right ${
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
        </div>
      )}
    </div>
  );
}
