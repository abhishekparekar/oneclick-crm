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
  BarChart2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const summary = monthlyRes?.data?.summary ||
    monthlyRes?.summary || {
      present: 0,
      late: 0,
      absent: 0,
      halfDays: 0,
      paidLeaves: 0,
      unpaidLeaves: 0,
      holidays: 0,
      weekends: 0,
    };

  const daysData = monthlyRes?.data?.days || monthlyRes?.days || [];

  const handlePrevMonth = () => setCurrentDate(new Date(selectedYear, selectedMonth - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(selectedYear, selectedMonth, 1));

  const monthName = currentDate.toLocaleString("default", { month: "long" });

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

  const getStatusStyle = (status) => {
    switch (status) {
      case "present":
        return { bg: "bg-emerald-500/10 dark:bg-emerald-900/20", top: "bg-emerald-500", num: "text-slate-900 dark:text-white", label: "P", labelColor: "text-emerald-600 dark:text-emerald-400" };
      case "half_day":
        return { bg: "bg-amber-500/10 dark:bg-amber-900/20", top: "bg-amber-500", num: "text-slate-900 dark:text-white", label: "H", labelColor: "text-amber-600 dark:text-amber-400" };
      case "leave":
      case "paid_leave":
      case "unpaid_leave":
        return { bg: "bg-blue-500/10 dark:bg-blue-900/20", top: "bg-blue-500", num: "text-slate-900 dark:text-white", label: "L", labelColor: "text-blue-600 dark:text-blue-400" };
      case "absent":
        return { bg: "bg-rose-500/10 dark:bg-rose-900/20", top: "bg-rose-500", num: "text-slate-900 dark:text-white", label: "A", labelColor: "text-rose-600 dark:text-rose-400" };
      case "weekend":
      case "weekly_off":
      case "holiday":
        return { bg: "bg-slate-100 dark:bg-slate-800/60", top: "bg-slate-300 dark:bg-slate-600", num: "text-slate-400 dark:text-slate-500", label: "—", labelColor: "text-slate-400" };
      default:
        return { bg: "bg-white dark:bg-[#111C24]", top: "bg-transparent", num: "text-slate-400", label: "", labelColor: "text-slate-300" };
    }
  };

  const handleDayClick = (day, status) => {
    if (!day) return;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = daysData.find((d) => d.date === dateStr);
    navigate("/employee/attendance/detail", { state: { date: dateStr, status, record } });
  };

  return (
    <div className="w-full font-sans pb-12 space-y-4">

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Present", value: correctedSummary.present, icon: UserCheck, color: "emerald" },
          { label: "Leave", value: correctedSummary.paidLeaves + correctedSummary.unpaidLeaves, icon: CalendarOff, color: "blue" },
          { label: "Absent", value: correctedSummary.absent, icon: UserX, color: "rose" },
          { label: "Half Day", value: correctedSummary.halfDays, icon: UserMinus, color: "amber" },
          { label: "Off / Holiday", value: (correctedSummary.weekends || 0) + (correctedSummary.holidays || 0), icon: CalendarDays, color: "slate" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 flex items-center justify-center shrink-0 border border-${color}-500/20`}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight truncate">{label}</h3>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Calendar + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendar Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Month Navigator */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:border-amber-400 transition-all shadow-2xs"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {monthName} {selectedYear}
              </h2>
            </div>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:border-amber-400 transition-all shadow-2xs"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-3 pb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <div
                key={d}
                className={`text-center text-[9px] font-extrabold uppercase tracking-widest py-1.5 rounded-lg ${i === 0 || i === 6 ? "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10" : "text-slate-500 dark:text-slate-400"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 p-3">
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))
              : calendarGrid.map((day, i) => {
                  const status = getDayStatus(day);
                  const style = getStatusStyle(status);
                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(day, status)}
                      className={`relative rounded-xl flex flex-col items-center justify-center aspect-square transition-all ${
                        day
                          ? `cursor-pointer hover:scale-105 hover:shadow-md ${style.bg} border border-slate-100 dark:border-slate-800/60`
                          : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {day && (
                        <>
                          {/* Top indicator bar */}
                          {status && status !== "unknown" && (
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${style.top}`} />
                          )}
                          <span className={`text-xs sm:text-sm font-bold ${style.num}`}>{day}</span>
                          {status && status !== "unknown" && (
                            <span className={`text-[8px] font-extrabold uppercase ${style.labelColor} leading-none mt-0.5`}>
                              {style.label}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: "Present", color: "bg-emerald-500" },
              { label: "Half Day", color: "bg-amber-500" },
              { label: "Leave", color: "bg-blue-500" },
              { label: "Absent", color: "bg-rose-500" },
              { label: "Off / Holiday", color: "bg-slate-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-sm ${item.color}`} />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Month Summary Panel */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <BarChart2 size={14} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white">Month Summary</h2>
              <p className="text-[10px] text-slate-400 font-medium">{monthName} {selectedYear}</p>
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* Attendance Rate Bar */}
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                <span className={`text-xl font-extrabold leading-none ${attendanceRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {attendanceRate}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${attendanceRate >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>

            {/* Stat Rows */}
            <div className="space-y-2">
              {[
                { label: "Days Present", value: correctedSummary.present, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "On Leave", value: correctedSummary.paidLeaves + correctedSummary.unpaidLeaves, icon: CalendarOff, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
                { label: "Days Absent", value: correctedSummary.absent, icon: UserX, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
                { label: "Half Days", value: correctedSummary.halfDays, icon: UserMinus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                { label: "Offs / Holidays", value: (correctedSummary.weekends || 0) + (correctedSummary.holidays || 0), icon: CalendarDays, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`flex items-center justify-between p-2.5 rounded-xl ${bg} border border-slate-100 dark:border-slate-800`}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className={color} strokeWidth={2} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                  <span className={`text-sm font-extrabold ${color}`}>{value}</span>
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
