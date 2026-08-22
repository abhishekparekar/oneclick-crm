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

/* ─── Status config ──────────────────────────────────────────── */
const SCFG = {
  present:      { dot: "bg-emerald-500", cell: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-400", label: "P" },
  half_day:     { dot: "bg-amber-400",   cell: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50",         text: "text-amber-700  dark:text-amber-400",  label: "H" },
  leave:        { dot: "bg-blue-500",    cell: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50",             text: "text-blue-700   dark:text-blue-400",   label: "L" },
  paid_leave:   { dot: "bg-blue-500",    cell: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50",             text: "text-blue-700   dark:text-blue-400",   label: "L" },
  unpaid_leave: { dot: "bg-blue-400",    cell: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50",             text: "text-blue-600   dark:text-blue-400",   label: "L" },
  absent:       { dot: "bg-rose-500",    cell: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50",             text: "text-rose-700   dark:text-rose-400",   label: "A" },
  weekly_off:   { dot: "bg-slate-300 dark:bg-slate-600", cell: "bg-slate-50 dark:bg-slate-800/30 border-slate-150 dark:border-slate-700/30", text: "text-slate-400 dark:text-slate-500", label: "" },
  holiday:      { dot: "bg-purple-400",  cell: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50",     text: "text-purple-600 dark:text-purple-400", label: "H" },
  unknown:      { dot: "",               cell: "bg-white dark:bg-[#111C24] border-slate-100 dark:border-slate-800/30",               text: "text-slate-700  dark:text-slate-300",  label: "" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const EmployeeAttendance = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear  = currentDate.getFullYear();

  const { data: monthlyRes, isLoading } = useQuery({
    queryKey: ["employeeMonthlyAttendance", selectedMonth, selectedYear],
    queryFn:  () => getMyMonthlyAttendanceApi({ month: selectedMonth, year: selectedYear }).then(r => r.data),
  });

  const summary  = monthlyRes?.data?.summary || monthlyRes?.summary || { present:0, late:0, absent:0, halfDays:0, paidLeaves:0, unpaidLeaves:0, holidays:0, weekends:0 };
  const daysData = monthlyRes?.data?.days    || monthlyRes?.days    || [];

  const handlePrev = () => setCurrentDate(new Date(selectedYear, selectedMonth - 2, 1));
  const handleNext = () => setCurrentDate(new Date(selectedYear, selectedMonth,     1));

  const today          = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
  const todayDate      = today.getDate();

  const trueWeekends = useMemo(() => {
    let c = 0;
    const d = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = 1; i <= d; i++) { const w = new Date(selectedYear, selectedMonth - 1, i).getDay(); if (w===0||w===6) c++; }
    return c;
  }, [selectedYear, selectedMonth]);

  const cs = useMemo(() => {
    let wa = 0;
    daysData.forEach(d => { const dw = new Date(d.date).getDay(); if ((dw===0||dw===6) && d.status==="absent") wa++; });
    return { ...summary, absent: Math.max(0, summary.absent - wa), weekends: trueWeekends };
  }, [summary, daysData, trueWeekends]);

  const leaveTotal     = cs.paidLeaves + cs.unpaidLeaves;
  const offTotal       = (cs.weekends || 0) + (cs.holidays || 0);
  const totalDays      = cs.present + leaveTotal + cs.absent + cs.halfDays;
  const attendanceRate = totalDays > 0 ? Math.round((cs.present / totalDays) * 100) : 0;

  const calGrid = useMemo(() => {
    const first = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const total = new Date(selectedYear, selectedMonth, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [selectedMonth, selectedYear]);

  const getDayStatus = day => {
    if (!day) return null;
    const dw  = new Date(selectedYear, selectedMonth - 1, day).getDay();
    const isW = dw === 0 || dw === 6;
    const ds  = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const rec = daysData.find(d => d.date === ds);
    if (rec) return rec.status === "absent" && isW ? "weekly_off" : rec.status;
    return isW ? "weekly_off" : "unknown";
  };

  const handleDayClick = (day, status) => {
    if (!day) return;
    const ds  = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const rec = daysData.find(d => d.date === ds);
    navigate("/employee/attendance/detail", { state: { date: ds, status, record: rec } });
  };

  const rateColor    = attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : attendanceRate >= 60 ? "text-amber-500" : "text-rose-500";
  const rateBarGrad  = attendanceRate >= 80 ? "from-emerald-500 to-teal-400" : attendanceRate >= 60 ? "from-amber-400 to-yellow-300" : "from-rose-500 to-pink-400";
  const rateMsg      = attendanceRate >= 80 ? "✅ Excellent attendance" : attendanceRate >= 60 ? "⚠️ Needs improvement" : "❗ Below target";

  return (
    <div className="w-full font-sans pb-10 space-y-3">

      {/* ── Header — matches "My Leads & Sales Pipeline" exactly ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          My Attendance
        </h1>
      </div>

      {/* ── 5 KPI Cards — compact, same height as leads pipeline cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label:"Present",     value: cs.present,  icon: UserCheck,   accent:"emerald", sparkPath:"M0,14 L10,10 L20,12 L30,7 L40,9 L50,4 L64,6",   sparkClr:"#10b981" },
          { label:"On Leave",    value: leaveTotal,  icon: CalendarOff, accent:"blue",    sparkPath:"M0,18 L10,12 L20,15 L30,9 L40,11 L50,7 L64,10",  sparkClr:"#3b82f6" },
          { label:"Absent",      value: cs.absent,   icon: UserX,       accent:"rose",    sparkPath:"M0,8  L10,14 L20,11 L30,17 L40,13 L50,19 L64,16", sparkClr:"#f43f5e" },
          { label:"Half Day",    value: cs.halfDays, icon: UserMinus,   accent:"amber",   sparkPath:"M0,16 L10,12 L20,14 L30,10 L40,12 L50,8 L64,10",  sparkClr:"#f59e0b" },
          { label:"Off/Holiday", value: offTotal,    icon: CalendarDays,accent:"slate",   sparkPath:"M0,14 L10,13 L20,15 L30,14 L40,13 L50,15 L64,14", sparkClr:"#94a3b8" },
        ].map(({ label, value, icon: Icon, accent, sparkPath, sparkClr }) => (
          <div key={label} className={`bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-${accent}-500 p-3.5 shadow-2xs`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
                <p className={`text-2xl font-black text-slate-900 dark:text-white mt-0.5 leading-none`}>{isLoading ? "—" : value}</p>
              </div>
              <div className={`w-8 h-8 rounded-xl bg-${accent}-50 dark:bg-${accent}-900/20 border border-${accent}-200 dark:border-${accent}-800/50 flex items-center justify-center shrink-0 text-${accent}-600 dark:text-${accent}-400`}>
                <Icon size={15} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500">vs last month</span>
              <svg width="56" height="20" viewBox="0 0 64 24" fill="none">
                <polyline points={sparkPath} stroke={sparkClr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calendar + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* ═══ Calendar Panel ═══════════════════════════════════════ */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <button onClick={handlePrev} className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B101B] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer">
              <ChevronLeft size={14} strokeWidth={2.5}/>
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{MONTHS[selectedMonth-1]} {selectedYear}</p>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(selectedYear, selectedMonth, 0).getDate()} days total</p>
            </div>
            <button onClick={handleNext} className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B101B] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer">
              <ChevronRight size={14} strokeWidth={2.5}/>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[9px] font-black uppercase tracking-widest py-2 select-none ${i===0||i===6 ? "text-rose-400 dark:text-rose-500 bg-rose-50/60 dark:bg-rose-900/10" : "text-slate-500 dark:text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 p-2.5 gap-1.5">
            {isLoading
              ? Array.from({length:35}).map((_,i) => <div key={i} className="h-[52px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"/>)
              : calGrid.map((day, i) => {
                  if (!day) return <div key={i}/>;
                  const status = getDayStatus(day);
                  const cfg    = SCFG[status] || SCFG.unknown;
                  const dw     = new Date(selectedYear, selectedMonth-1, day).getDay();
                  const isWEnd = dw===0||dw===6;
                  const isToday= isCurrentMonth && day===todayDate;

                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(day, status)}
                      className={`relative h-[52px] rounded-xl cursor-pointer border transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${cfg.cell} ${isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#111C24] shadow-md shadow-blue-500/20" : "hover:scale-[1.05] hover:shadow-md hover:z-10"}`}
                    >
                      {/* status dot */}
                      {status && status !== "unknown" && cfg.dot && (
                        <div className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                      )}

                      {/* day number */}
                      <span className={`text-[13px] font-bold leading-none select-none ${isToday ? "text-blue-600 dark:text-blue-400" : isWEnd ? "text-rose-400 dark:text-rose-500" : cfg.text}`}>
                        {day}
                      </span>

                      {/* status label */}
                      {cfg.label && (
                        <span className={`text-[7.5px] font-black uppercase leading-none select-none ${cfg.text}`}>{cfg.label}</span>
                      )}

                      {isToday && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"/>}
                    </div>
                  );
                })
            }
          </div>

          {/* Legend */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-[#0B101B]/50 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {[
              { label:"Present",     dot:"bg-emerald-500" },
              { label:"Half Day",    dot:"bg-amber-400"   },
              { label:"Leave",       dot:"bg-blue-500"    },
              { label:"Absent",      dot:"bg-rose-500"    },
              { label:"Off/Holiday", dot:"bg-slate-400"   },
              { label:"Today",       dot:"bg-blue-500 ring-2 ring-blue-300 ring-offset-[1px]" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${l.dot}`}/>
                <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Right Sidebar ════════════════════════════════════════ */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          {/* Attendance Rate */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <TrendingUp size={13} className="text-blue-600 dark:text-blue-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Attendance Rate</p>
                <p className="text-[9.5px] text-slate-400 font-medium">{MONTHS[selectedMonth-1]} {selectedYear}</p>
              </div>
              <span className={`text-2xl font-black leading-none ${rateColor}`}>{isLoading ? "—" : `${attendanceRate}%`}</span>
            </div>

            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${rateBarGrad} transition-all duration-700`} style={{ width:`${attendanceRate}%` }}/>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-400 font-medium">0%</span>
              <span className="text-[9px] text-slate-400 font-medium">Target 80%</span>
              <span className="text-[9px] text-slate-400 font-medium">100%</span>
            </div>
            <p className={`text-[10px] font-bold mt-2.5 ${rateColor}`}>{rateMsg}</p>
          </div>

          {/* Monthly Breakdown */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Monthly Breakdown</p>
              <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">{MONTHS[selectedMonth-1]} {selectedYear}</p>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label:"Days Present",  value:cs.present,  bar:"bg-emerald-500", pct:totalDays>0?(cs.present/totalDays)*100:0,  icon:UserCheck,    ic:"text-emerald-600 dark:text-emerald-400", bg:"bg-emerald-50 dark:bg-emerald-900/10" },
                { label:"On Leave",      value:leaveTotal,  bar:"bg-blue-500",    pct:totalDays>0?(leaveTotal/totalDays)*100:0,  icon:CalendarOff,  ic:"text-blue-600   dark:text-blue-400",     bg:"bg-blue-50   dark:bg-blue-900/10"     },
                { label:"Days Absent",   value:cs.absent,   bar:"bg-rose-500",    pct:totalDays>0?(cs.absent/totalDays)*100:0,   icon:UserX,        ic:"text-rose-600   dark:text-rose-400",     bg:"bg-rose-50   dark:bg-rose-900/10"     },
                { label:"Half Days",     value:cs.halfDays, bar:"bg-amber-400",   pct:totalDays>0?(cs.halfDays/totalDays)*100:0, icon:UserMinus,    ic:"text-amber-600  dark:text-amber-400",    bg:"bg-amber-50  dark:bg-amber-900/10"    },
                { label:"Offs/Holidays", value:offTotal,    bar:"bg-slate-400",   pct:100,                                       icon:CalendarDays, ic:"text-slate-500  dark:text-slate-400",    bg:"bg-slate-50  dark:bg-slate-800/30"    },
              ].map(({ label, value, bar, pct, icon:Icon, ic, bg }) => (
                <div key={label} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${bg}`}>
                  <Icon size={12} className={`${ic} shrink-0`} strokeWidth={2}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 truncate">{label}</span>
                      <span className={`text-xs font-black shrink-0 ml-2 ${ic}`}>{isLoading?"—":value}</span>
                    </div>
                    <div className="h-1 w-full bg-white/70 dark:bg-slate-900/40 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full`} style={{ width:`${Math.min(100,pct)}%` }}/>
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
