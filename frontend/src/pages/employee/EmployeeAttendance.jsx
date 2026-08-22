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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Tiny sparkline SVG ─────────────────────────────────────── */
const Sparkline = ({ color = "#2563EB" }) => (
  <svg width="64" height="24" viewBox="0 0 64 24" fill="none">
    <polyline
      points="0,20 10,14 20,16 30,10 40,12 50,5 64,8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ─── Status config ──────────────────────────────────────────── */
const SCFG = {
  present:      { dot: "bg-emerald-500", ring: "ring-emerald-500/30", cell: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-300", label: "P" },
  half_day:     { dot: "bg-amber-400",   ring: "ring-amber-400/30",   cell: "bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800/50",  text: "text-amber-700  dark:text-amber-300",  label: "H" },
  leave:        { dot: "bg-blue-500",    ring: "ring-blue-500/30",    cell: "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800/50",   text: "text-blue-700   dark:text-blue-300",   label: "L" },
  paid_leave:   { dot: "bg-blue-500",    ring: "ring-blue-500/30",    cell: "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800/50",   text: "text-blue-700   dark:text-blue-300",   label: "L" },
  unpaid_leave: { dot: "bg-blue-400",    ring: "ring-blue-400/30",    cell: "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800/50",   text: "text-blue-700   dark:text-blue-300",   label: "L" },
  absent:       { dot: "bg-rose-500",    ring: "ring-rose-500/30",    cell: "bg-rose-50   dark:bg-rose-900/20   border-rose-200   dark:border-rose-800/50",   text: "text-rose-700   dark:text-rose-300",   label: "A" },
  weekly_off:   { dot: "bg-slate-300 dark:bg-slate-600", ring: "ring-slate-300/20", cell: "bg-slate-50 dark:bg-slate-800/30 border-slate-150 dark:border-slate-700/30", text: "text-slate-400 dark:text-slate-500", label: "" },
  holiday:      { dot: "bg-purple-400",  ring: "ring-purple-400/30",  cell: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50", text: "text-purple-700 dark:text-purple-300", label: "H" },
  unknown:      { dot: "",               ring: "",                     cell: "bg-white dark:bg-[#111C24] border-slate-100 dark:border-slate-800/30",            text: "text-slate-700 dark:text-slate-300",   label: "" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ─── KPI Card (matches image 2 style) ──────────────────────── */
const KpiCard = ({ label, value, sub, Icon, iconColor, sparkColor, borderColor }) => (
  <div className={`bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 border-t-2 ${borderColor} p-4 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 leading-none">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={17} strokeWidth={2} />
      </div>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">{sub}</span>
      <Sparkline color={sparkColor} />
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────── */
const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear  = currentDate.getFullYear();

  const { data: monthlyRes, isLoading } = useQuery({
    queryKey: ["employeeMonthlyAttendance", selectedMonth, selectedYear],
    queryFn:  () =>
      getMyMonthlyAttendanceApi({ month: selectedMonth, year: selectedYear }).then(r => r.data),
  });

  const summary  = monthlyRes?.data?.summary || monthlyRes?.summary || { present:0,late:0,absent:0,halfDays:0,paidLeaves:0,unpaidLeaves:0,holidays:0,weekends:0 };
  const daysData = monthlyRes?.data?.days    || monthlyRes?.days    || [];

  const handlePrev = () => setCurrentDate(new Date(selectedYear, selectedMonth - 2, 1));
  const handleNext = () => setCurrentDate(new Date(selectedYear, selectedMonth,     1));

  const today         = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
  const todayDate     = today.getDate();

  /* weekend count */
  const trueWeekends = useMemo(() => {
    let c = 0;
    const d = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = 1; i <= d; i++) { const w = new Date(selectedYear, selectedMonth - 1, i).getDay(); if (w===0||w===6) c++; }
    return c;
  }, [selectedYear, selectedMonth]);

  /* corrected summary */
  const cs = useMemo(() => {
    let wa = 0;
    daysData.forEach(d => {
      const dw = new Date(d.date).getDay();
      if ((dw===0||dw===6) && d.status==="absent") wa++;
    });
    return { ...summary, absent: Math.max(0, summary.absent - wa), weekends: trueWeekends };
  }, [summary, daysData, trueWeekends]);

  const totalDays      = cs.present + cs.paidLeaves + cs.unpaidLeaves + cs.absent + cs.halfDays;
  const attendanceRate = totalDays > 0 ? Math.round((cs.present / totalDays) * 100) : 0;
  const leaveTotal     = cs.paidLeaves + cs.unpaidLeaves;
  const offTotal       = (cs.weekends||0) + (cs.holidays||0);

  /* calendar */
  const calGrid = useMemo(() => {
    const first = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const total = new Date(selectedYear, selectedMonth, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({length:total},(_,i)=>i+1)];
  }, [selectedMonth, selectedYear]);

  const getDayStatus = day => {
    if (!day) return null;
    const dw  = new Date(selectedYear, selectedMonth - 1, day).getDay();
    const isW = dw===0||dw===6;
    const ds  = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const rec = daysData.find(d => d.date===ds);
    if (rec) return rec.status==="absent"&&isW ? "weekly_off" : rec.status;
    return isW ? "weekly_off" : "unknown";
  };

  const handleDayClick = (day, status) => {
    if (!day) return;
    const ds  = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const rec = daysData.find(d => d.date===ds);
    navigate("/employee/attendance/detail", { state: { date:ds, status, record:rec } });
  };

  /* rate color */
  const rateColor = attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400"
                  : attendanceRate >= 60 ? "text-amber-500"
                  : "text-rose-500";
  const rateBarClass = attendanceRate >= 80 ? "from-emerald-500 to-teal-400"
                     : attendanceRate >= 60 ? "from-amber-400 to-yellow-300"
                     : "from-rose-500 to-pink-400";

  return (
    <div className="w-full font-sans pb-12 space-y-4 max-w-[1440px] mx-auto">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 pt-0.5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Attendance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {MONTHS[selectedMonth-1]} {selectedYear} &mdash; Personal attendance record
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm">
          <span className={`text-3xl font-black leading-none ${rateColor}`}>{isLoading ? "—" : `${attendanceRate}%`}</span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Attendance</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rate</p>
          </div>
        </div>
      </div>

      {/* ── 5 KPI Cards (image-2 style) ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Present"      value={isLoading?"—":cs.present}   sub="Days this month"  Icon={UserCheck}   iconColor="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" sparkColor="#10b981" borderColor="border-t-emerald-500"/>
        <KpiCard label="On Leave"     value={isLoading?"—":leaveTotal}   sub="Days this month"  Icon={CalendarOff} iconColor="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"         sparkColor="#3b82f6" borderColor="border-t-blue-500"/>
        <KpiCard label="Absent"       value={isLoading?"—":cs.absent}    sub="Days this month"  Icon={UserX}       iconColor="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"         sparkColor="#f43f5e" borderColor="border-t-rose-500"/>
        <KpiCard label="Half Day"     value={isLoading?"—":cs.halfDays}  sub="Days this month"  Icon={UserMinus}   iconColor="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"   sparkColor="#f59e0b" borderColor="border-t-amber-500"/>
        <KpiCard label="Off / Holiday" value={isLoading?"—":offTotal}   sub="Weekend + holiday" Icon={CalendarDays} iconColor="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"   sparkColor="#94a3b8" borderColor="border-t-slate-400"/>
      </div>

      {/* ── Calendar + Sidebar ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ══ Calendar Panel ══════════════════════════════════ */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* ── Calendar Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={handlePrev}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B101B] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={16} strokeWidth={2.5}/>
            </button>

            <div className="text-center">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {MONTHS[selectedMonth-1]} {selectedYear}
              </h2>
              <p className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                {new Date(selectedYear, selectedMonth, 0).getDate()} days &bull; {isCurrentMonth ? "Current Month" : "Historical"}
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B101B] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronRight size={16} strokeWidth={2.5}/>
            </button>
          </div>

          {/* ── Weekday header row ── */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-black uppercase tracking-widest py-3 select-none
                  ${i===0||i===6 ? "text-rose-400 dark:text-rose-500 bg-rose-50/60 dark:bg-rose-900/10" : "text-slate-500 dark:text-slate-400 bg-white dark:bg-[#111C24]"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Days grid ── */}
          <div className="grid grid-cols-7 p-3 gap-2">
            {isLoading
              ? Array.from({length:35}).map((_,i) => (
                  <div key={i} className="aspect-[5/4] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"/>
                ))
              : calGrid.map((day, i) => {
                  if (!day) return <div key={i}/>;
                  const status = getDayStatus(day);
                  const cfg    = SCFG[status] || SCFG.unknown;
                  const isW    = new Date(selectedYear, selectedMonth-1, day).getDay();
                  const isWEnd = isW===0||isW===6;
                  const isToday= isCurrentMonth && day===todayDate;

                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(day, status)}
                      className={`
                        relative rounded-xl cursor-pointer border transition-all duration-150 group
                        flex flex-col items-center justify-center aspect-[5/4] min-h-[52px]
                        ${cfg.cell}
                        ${isToday ? `ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#111C24] shadow-md shadow-blue-500/15` : "hover:shadow-sm hover:scale-[1.04] hover:z-10"}
                      `}
                    >
                      {/* status dot top-center */}
                      {status && status !== "unknown" && cfg.dot && (
                        <div className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full ${cfg.dot}`}/>
                      )}

                      {/* day number */}
                      <span className={`text-sm font-black leading-none select-none
                        ${isToday ? "text-blue-600 dark:text-blue-400"
                        : isWEnd  ? "text-rose-400 dark:text-rose-500"
                        : cfg.text}`}
                      >
                        {day}
                      </span>

                      {/* status badge bottom */}
                      {cfg.label && (
                        <span className={`text-[8px] font-black uppercase tracking-wider mt-1 leading-none select-none ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      )}

                      {/* today dot at bottom */}
                      {isToday && (
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"/>
                      )}
                    </div>
                  );
                })
            }
          </div>

          {/* ── Legend ── */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/60 dark:bg-[#0B101B]/50 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label:"Present",    dot:"bg-emerald-500" },
              { label:"Half Day",   dot:"bg-amber-400"   },
              { label:"Leave",      dot:"bg-blue-500"    },
              { label:"Absent",     dot:"bg-rose-500"    },
              { label:"Off/Holiday",dot:"bg-slate-400"   },
              { label:"Today",      dot:"bg-blue-500 ring-2 ring-blue-300 ring-offset-1" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${l.dot}`}/>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Sidebar: Rate + Breakdown ═══════════════════════ */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          {/* Attendance Rate Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">Attendance Rate</p>
                <p className="text-[10px] text-slate-400 font-medium">{MONTHS[selectedMonth-1]} {selectedYear}</p>
              </div>
              <span className={`ml-auto text-3xl font-black leading-none ${rateColor}`}>
                {isLoading ? "—" : `${attendanceRate}%`}
              </span>
            </div>

            {/* rate bar */}
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${rateBarClass} transition-all duration-700`}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400 font-semibold">0%</span>
              <span className="text-[10px] text-slate-400 font-semibold">Target: 80%</span>
              <span className="text-[10px] text-slate-400 font-semibold">100%</span>
            </div>
            <p className={`text-[10.5px] font-black mt-3 ${rateColor}`}>
              {attendanceRate >= 80 ? "✅ Excellent — Keep it up!"
               : attendanceRate >= 60 ? "⚠️ Fair — Needs improvement"
               : "❗ Below target — Please improve"}
            </p>
          </div>

          {/* Monthly Breakdown */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-black text-slate-900 dark:text-white">Monthly Breakdown</p>
              <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">{MONTHS[selectedMonth-1]} {selectedYear}</p>
            </div>

            <div className="p-4 space-y-2.5">
              {[
                { label:"Days Present",  value:cs.present,   bar:"bg-emerald-500", pct: totalDays>0 ? (cs.present/totalDays)*100:0,   icon:UserCheck,   ic:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-900/10" },
                { label:"On Leave",      value:leaveTotal,   bar:"bg-blue-500",    pct: totalDays>0 ? (leaveTotal/totalDays)*100:0,    icon:CalendarOff, ic:"text-blue-600 dark:text-blue-400",       bg:"bg-blue-50 dark:bg-blue-900/10"       },
                { label:"Days Absent",   value:cs.absent,    bar:"bg-rose-500",    pct: totalDays>0 ? (cs.absent/totalDays)*100:0,     icon:UserX,       ic:"text-rose-600 dark:text-rose-400",       bg:"bg-rose-50 dark:bg-rose-900/10"       },
                { label:"Half Days",     value:cs.halfDays,  bar:"bg-amber-400",   pct: totalDays>0 ? (cs.halfDays/totalDays)*100:0,   icon:UserMinus,   ic:"text-amber-600 dark:text-amber-400",     bg:"bg-amber-50 dark:bg-amber-900/10"     },
                { label:"Offs/Holidays", value:offTotal,     bar:"bg-slate-400",   pct:100,                                            icon:CalendarDays,ic:"text-slate-500 dark:text-slate-400",     bg:"bg-slate-50 dark:bg-slate-800/30"     },
              ].map(({ label, value, bar, pct, icon:Icon, ic, bg }) => (
                <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${bg}`}>
                  <Icon size={13} className={`${ic} shrink-0`} strokeWidth={2}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate">{label}</span>
                      <span className={`text-sm font-black shrink-0 ml-2 ${ic}`}>{isLoading?"—":value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/70 dark:bg-slate-900/40 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full`} style={{ width:`${Math.min(100, pct)}%` }}/>
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
