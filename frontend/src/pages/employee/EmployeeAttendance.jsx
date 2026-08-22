import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyMonthlyAttendanceApi } from "../../api/employeeApi";
import {
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CalendarOff,
  UserX,
  UserMinus,
  CalendarDays,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  present: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-500",
    label: "P",
    fullLabel: "Present",
  },
  half_day: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/60",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-500",
    label: "H",
    fullLabel: "Half Day",
  },
  leave: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800/60",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-500",
    label: "L",
    fullLabel: "Leave",
  },
  paid_leave: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800/60",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-500",
    label: "L",
    fullLabel: "Leave",
  },
  unpaid_leave: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-200 dark:border-indigo-800/60",
    dot: "bg-indigo-400",
    text: "text-indigo-700 dark:text-indigo-400",
    badge: "bg-indigo-400",
    label: "L",
    fullLabel: "Leave",
  },
  absent: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800/60",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    badge: "bg-rose-500",
    label: "A",
    fullLabel: "Absent",
  },
  weekly_off: {
    bg: "bg-slate-50 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700/40",
    dot: "bg-slate-300 dark:bg-slate-600",
    text: "text-slate-400 dark:text-slate-500",
    badge: "bg-slate-300",
    label: "—",
    fullLabel: "Day Off",
  },
  holiday: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800/60",
    dot: "bg-purple-400",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-400",
    label: "H",
    fullLabel: "Holiday",
  },
  unknown: {
    bg: "bg-white dark:bg-[#111C24]",
    border: "border-slate-100 dark:border-slate-800/40",
    dot: "bg-transparent",
    text: "text-slate-400 dark:text-slate-600",
    badge: "bg-transparent",
    label: "",
    fullLabel: "",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear = currentDate.getFullYear();

  const { data: monthlyRes, isLoading } = useQuery({
    queryKey: ["employeeMonthlyAttendance", selectedMonth, selectedYear],
    queryFn: () =>
      getMyMonthlyAttendanceApi({ month: selectedMonth, year: selectedYear }).then(
        (res) => res.data
      ),
  });

  const summary = monthlyRes?.data?.summary || monthlyRes?.summary || {
    present: 0, late: 0, absent: 0, halfDays: 0,
    paidLeaves: 0, unpaidLeaves: 0, holidays: 0, weekends: 0,
  };

  const daysData = monthlyRes?.data?.days || monthlyRes?.days || [];

  const handlePrevMonth = () => setCurrentDate(new Date(selectedYear, selectedMonth - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(selectedYear, selectedMonth, 1));

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
  const todayDate = today.getDate();

  const trueWeekends = useMemo(() => {
    let count = 0;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(selectedYear, selectedMonth - 1, i).getDay();
      if (day === 0 || day === 6) count++;
    }
    return count;
  }, [selectedYear, selectedMonth]);

  const correctedSummary = useMemo(() => {
    let weekendAbsents = 0;
    daysData.forEach((d) => {
      const dateObj = new Date(d.date);
      const dayOfWeek = dateObj.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && d.status === "absent") weekendAbsents++;
    });
    return { ...summary, absent: Math.max(0, summary.absent - weekendAbsents), weekends: trueWeekends };
  }, [summary, daysData, trueWeekends]);

  const totalDays =
    correctedSummary.present +
    correctedSummary.paidLeaves +
    correctedSummary.unpaidLeaves +
    correctedSummary.absent +
    correctedSummary.halfDays;
  const attendanceRate = totalDays > 0 ? Math.round((correctedSummary.present / totalDays) * 100) : 0;

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const blanks = Array.from({ length: firstDayOfMonth }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [selectedMonth, selectedYear]);

  const getDayStatus = (day) => {
    if (!day) return null;
    const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = daysData.find((d) => d.date === dateStr);
    if (record) {
      if (record.status === "absent" && isWeekend) return "weekly_off";
      return record.status;
    }
    if (isWeekend) return "weekly_off";
    return "unknown";
  };

  const handleDayClick = (day, status) => {
    if (!day) return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = daysData.find((d) => d.date === dateStr);
    navigate("/employee/attendance/detail", { state: { date: dateStr, status, record } });
  };

  const statCards = [
    {
      label: "Present", value: correctedSummary.present,
      icon: UserCheck, colorClass: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      valueBg: "text-emerald-700 dark:text-emerald-300",
      borderAccent: "border-l-emerald-500",
    },
    {
      label: "On Leave", value: correctedSummary.paidLeaves + correctedSummary.unpaidLeaves,
      icon: CalendarOff, colorClass: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      valueBg: "text-blue-700 dark:text-blue-300",
      borderAccent: "border-l-blue-500",
    },
    {
      label: "Absent", value: correctedSummary.absent,
      icon: UserX, colorClass: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10 border-rose-500/20",
      valueBg: "text-rose-700 dark:text-rose-300",
      borderAccent: "border-l-rose-500",
    },
    {
      label: "Half Day", value: correctedSummary.halfDays,
      icon: UserMinus, colorClass: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      valueBg: "text-amber-700 dark:text-amber-300",
      borderAccent: "border-l-amber-500",
    },
    {
      label: "Off / Holiday", value: (correctedSummary.weekends || 0) + (correctedSummary.holidays || 0),
      icon: CalendarDays, colorClass: "text-slate-500 dark:text-slate-400",
      iconBg: "bg-slate-100 dark:bg-slate-800 border-slate-300/30",
      valueBg: "text-slate-700 dark:text-slate-300",
      borderAccent: "border-l-slate-400",
    },
  ];

  return (
    <div className="w-full font-sans pb-12 space-y-3 max-w-[1440px] mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            My Attendance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {MONTHS[selectedMonth - 1]} {selectedYear} — Personal attendance log
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span className="text-xs font-black text-slate-900 dark:text-white">
            {attendanceRate}%
          </span>
          <span className="text-[10px] font-semibold text-slate-400">attendance rate</span>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {statCards.map(({ label, value, icon: Icon, colorClass, iconBg, valueBg, borderAccent }) => (
          <div
            key={label}
            className={`bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/90 dark:border-slate-800 border-l-3 ${borderAccent} p-3 shadow-2xs flex items-center gap-3 hover:shadow-md transition-shadow`}
          >
            <div className={`w-9 h-9 rounded-xl ${iconBg} border flex items-center justify-center shrink-0`}>
              <Icon size={16} strokeWidth={2} className={colorClass} />
            </div>
            <div className="min-w-0">
              <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight truncate">{label}</p>
              <p className={`text-2xl font-black leading-tight ${valueBg}`}>{isLoading ? "—" : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Calendar + Summary ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* ── Calendar Panel ─── */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">

          {/* Month Navigator */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>

            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </h2>
              <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">
                {new Date(selectedYear, selectedMonth, 0).getDate()} days total
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 px-3 pt-2.5 pb-1 gap-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[9px] font-black uppercase tracking-widest py-1 rounded-lg ${
                  i === 0 || i === 6
                    ? "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-1">
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))
              : calendarGrid.map((day, i) => {
                  const status = getDayStatus(day);
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
                  const isToday = isCurrentMonth && day === todayDate;
                  const isWeekendDay = day
                    ? new Date(selectedYear, selectedMonth - 1, day).getDay() === 0 ||
                      new Date(selectedYear, selectedMonth - 1, day).getDay() === 6
                    : false;

                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(day, status)}
                      className={`relative rounded-xl flex flex-col items-center justify-center py-1.5 transition-all ${
                        day
                          ? `cursor-pointer group border ${cfg.bg} ${cfg.border} hover:scale-[1.04] hover:shadow-lg hover:z-10 ${
                              isToday
                                ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#111C24] shadow-md shadow-blue-500/20"
                                : ""
                            }`
                          : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {day && (
                        <>
                          {/* Top status dot */}
                          {status && status !== "unknown" && (
                            <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          )}

                          {/* Day number */}
                          <span
                            className={`text-xs sm:text-sm font-bold leading-tight mt-1 ${
                              isToday
                                ? "text-blue-600 dark:text-blue-400 font-black"
                                : isWeekendDay
                                ? "text-rose-400 dark:text-rose-500"
                                : cfg.text
                            }`}
                          >
                            {day}
                          </span>

                          {/* Status label */}
                          {status && status !== "unknown" && cfg.label && (
                            <span className={`text-[8px] font-black uppercase leading-none mt-0.5 ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          )}

                          {/* Today indicator */}
                          {isToday && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })
            }
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B101B]/50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {[
              { label: "Present", dot: "bg-emerald-500" },
              { label: "Half Day", dot: "bg-amber-500" },
              { label: "Leave", dot: "bg-blue-500" },
              { label: "Absent", dot: "bg-rose-500" },
              { label: "Off/Holiday", dot: "bg-slate-400" },
              { label: "Today", dot: "bg-blue-500 ring-2 ring-blue-400 ring-offset-1" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Month Summary Panel ─── */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          {/* Attendance Rate Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <TrendingUp size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">Attendance Rate</h3>
                <p className="text-[9.5px] text-slate-400 font-medium">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <span className={`ml-auto text-2xl font-black leading-none ${attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : attendanceRate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-500"}`}>
                {isLoading ? "—" : `${attendanceRate}%`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  attendanceRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : attendanceRate >= 60 ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-rose-500 to-pink-400"
                }`}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>

            {/* Segments legend */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9.5px] text-slate-400 font-semibold">
                {attendanceRate >= 80 ? "✅ Excellent attendance" : attendanceRate >= 60 ? "⚠️ Needs improvement" : "❗ Below target"}
              </span>
            </div>
          </div>

          {/* Stat Breakdown */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <Clock size={13} className="text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white">Monthly Breakdown</h3>
            </div>

            <div className="p-3 space-y-1.5">
              {[
                {
                  label: "Days Present", value: correctedSummary.present,
                  icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400",
                  bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800/40",
                  bar: "bg-emerald-500", max: totalDays,
                },
                {
                  label: "On Leave", value: correctedSummary.paidLeaves + correctedSummary.unpaidLeaves,
                  icon: CalendarOff, color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/40",
                  bar: "bg-blue-500", max: totalDays,
                },
                {
                  label: "Days Absent", value: correctedSummary.absent,
                  icon: UserX, color: "text-rose-600 dark:text-rose-400",
                  bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-100 dark:border-rose-800/40",
                  bar: "bg-rose-500", max: totalDays,
                },
                {
                  label: "Half Days", value: correctedSummary.halfDays,
                  icon: UserMinus, color: "text-amber-600 dark:text-amber-400",
                  bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/40",
                  bar: "bg-amber-500", max: totalDays,
                },
                {
                  label: "Offs / Holidays", value: (correctedSummary.weekends || 0) + (correctedSummary.holidays || 0),
                  icon: CalendarDays, color: "text-slate-500 dark:text-slate-400",
                  bg: "bg-slate-50 dark:bg-slate-800/40", border: "border-slate-100 dark:border-slate-700/40",
                  bar: "bg-slate-400", max: (correctedSummary.weekends || 0) + (correctedSummary.holidays || 0) + totalDays,
                },
              ].map(({ label, value, icon: Icon, color, bg, border, bar, max }) => (
                <div key={label} className={`flex items-center gap-3 p-2.5 rounded-xl ${bg} border ${border}`}>
                  <Icon size={13} className={`${color} shrink-0`} strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate">{label}</span>
                      <span className={`text-sm font-black ${color} shrink-0 ml-2`}>{isLoading ? "—" : value}</span>
                    </div>
                    <div className="h-1 w-full bg-white/60 dark:bg-slate-900/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar} rounded-full transition-all duration-500`}
                        style={{ width: max > 0 ? `${Math.min(100, (value / max) * 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
