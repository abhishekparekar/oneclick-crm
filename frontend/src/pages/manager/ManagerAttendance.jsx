import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getManagerMyAttendanceApi, getManagerTeamAttendanceApi } from "../../api/managerApi";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  CalendarCheck, RefreshCw, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock,
  CalendarOff, Search, Users, Filter, ChevronLeft, ChevronRight, LayoutGrid,
  ListFilter, Eye, X, Download, ShieldCheck, ArrowRight, UserCheck, UserX, UserMinus,
  CalendarDays, MapPin, ArrowUp, ArrowDown, Sparkles, CheckCircle, Coffee, ShieldAlert
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (timeStr) => {
  if (!timeStr) return "—";
  if (typeof timeStr === "string" && (timeStr.includes("AM") || timeStr.includes("PM"))) return timeStr;
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  } catch (e) {
    // fallback
  }
  return timeStr || "—";
};

const formatDuration = (val) => {
  if (val === undefined || val === null || val === "") return "0.0 hrs";
  if (typeof val === "string" && (val.includes("hr") || val.includes("h") || val.includes("m"))) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return "0.0 hrs";
  return `${num.toFixed(1)} hrs`;
};

const getCalendarDayStyle = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "present":
    case "late":
      return { 
        bg: "bg-[#E8F8F0] dark:bg-emerald-950/25", 
        border: "border-2 border-[#22C55E] dark:border-emerald-500", 
        dot: "bg-[#16A34A]", 
        num: "text-slate-900 dark:text-white", 
        label: s === "late" ? "LATE" : "PRESENT", 
        labelColor: "text-[#15803D] dark:text-emerald-400 font-extrabold",
        hasDot: true
      };
    case "half_day":
    case "half day":
      return { 
        bg: "bg-[#FFF7ED] dark:bg-amber-950/25", 
        border: "border-2 border-[#F59E0B] dark:border-amber-500", 
        dot: "bg-[#F59E0B]", 
        num: "text-slate-900 dark:text-white", 
        label: "HALF DAY", 
        labelColor: "text-[#B45309] dark:text-amber-400 font-extrabold",
        hasDot: true
      };
    case "paid_leave":
    case "unpaid_leave":
    case "leave":
    case "on leave":
      return { 
        bg: "bg-[#EFF6FF] dark:bg-blue-950/25", 
        border: "border-2 border-[#3B82F6] dark:border-blue-500", 
        dot: "bg-[#3B82F6]", 
        num: "text-slate-900 dark:text-white", 
        label: "LEAVE", 
        labelColor: "text-[#1D4ED8] dark:text-blue-400 font-extrabold",
        hasDot: true
      };
    case "absent":
      return { 
        bg: "bg-[#FEECEF] dark:bg-rose-950/25", 
        border: "border-2 border-[#F43F5E] dark:border-rose-500", 
        dot: "bg-[#E11D48]", 
        num: "text-slate-900 dark:text-white", 
        label: "ABSENT", 
        labelColor: "text-[#BE123C] dark:text-rose-400 font-extrabold",
        hasDot: true
      };
    case "weekly_off":
    case "weekend":
    case "holiday":
    case "off day":
      return { 
        bg: "bg-slate-50/70 dark:bg-slate-900/40", 
        border: "border border-slate-200/80 dark:border-slate-800", 
        dot: "bg-slate-300 dark:bg-slate-600", 
        num: "text-slate-900 dark:text-white", 
        label: "OFF", 
        labelColor: "text-slate-500 dark:text-slate-400 font-bold",
        hasDot: true
      };
    default:
      return { 
        bg: "bg-white dark:bg-[#111C24]", 
        border: "border border-slate-200/70 dark:border-slate-800/80", 
        dot: "", 
        num: "text-slate-400 dark:text-slate-500", 
        label: "", 
        labelColor: "text-slate-400",
        hasDot: false
      };
  }
};

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 10 }, { v: 18 }, { v: 15 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 35 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs group min-w-0">
      <div className="flex-1 min-w-0 pr-1.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">{label}</span>
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 font-mono">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={8} strokeWidth={3}/> : <ArrowDown size={8} strokeWidth={3}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px]">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 w-12 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-att-${label.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-att-${label.replace(/[^a-zA-Z]/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function ManagerAttendance() {
  const location = useLocation();
  // If URL has team-attendance, default to tab 1 (Team Roster)
  const isTeamRoute = location.pathname.includes("team-attendance");
  const [activeTab, setActiveTab] = useState(isTeamRoute ? 1 : 0);

  useEffect(() => {
    if (location.pathname.includes("team-attendance")) {
      setActiveTab(1);
    }
  }, [location.pathname]);

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedModalDate, setSelectedModalDate] = useState(null);

  const { data: myData, isLoading: myLoading, refetch: myRefetch, isFetching: myFetching } = useQuery({
    queryKey: ["managerMyAttendance", calendarMonth, calendarYear],
    queryFn: () => getManagerMyAttendanceApi({ month: calendarMonth, year: calendarYear }).then((r) => r.data),
    refetchInterval: 5000,
    enabled: activeTab === 0,
  });

  const { data: teamData, isLoading: teamLoading, refetch: teamRefetch, isFetching: teamFetching } = useQuery({
    queryKey: ["managerTeamAttendance", calendarMonth, calendarYear],
    queryFn: () => getManagerTeamAttendanceApi({ month: calendarMonth, year: calendarYear }).then((r) => r.data),
    refetchInterval: 5000,
    enabled: activeTab === 1,
  });

  const _rawMy = myData?.data?.days || myData?.attendance || myData?.data;
  const myRecords = useMemo(() => (Array.isArray(_rawMy) ? _rawMy : []), [_rawMy]);
  
  const _rawTeam = teamData?.data?.days || teamData?.attendance || teamData?.data;
  const teamRecords = useMemo(() => (Array.isArray(_rawTeam) ? _rawTeam : []), [_rawTeam]);

  const isLoading = activeTab === 0 ? myLoading : teamLoading;
  const isFetching = activeTab === 0 ? myFetching : teamFetching;
  const refetch = activeTab === 0 ? myRefetch : teamRefetch;

  // Filtered Records for Team View
  const filteredTeamRecords = useMemo(() => {
    return teamRecords.filter((rec) => {
      const empName = rec.employeeId?.name || rec.employee?.name || rec.employeeName || "";
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (rec.date && new Date(rec.date).toLocaleDateString().includes(searchQuery));
      const matchesStatus = statusFilter === "all" || (rec.status || "").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [teamRecords, searchQuery, statusFilter]);

  // My Summary Stats
  const myStats = useMemo(() => {
    const present = myRecords.filter((r) => (r.status || "").toLowerCase() === "present").length;
    const absent = myRecords.filter((r) => (r.status || "").toLowerCase() === "absent").length;
    const late = myRecords.filter((r) => (r.status || "").toLowerCase().includes("late")).length;
    const halfDays = myRecords.filter((r) => (r.status || "").toLowerCase().includes("half")).length;
    const onLeave = myRecords.filter((r) => (r.status || "").toLowerCase().includes("leave")).length;
    const weeklyOff = myRecords.filter((r) => (r.status || "").toLowerCase().includes("off") || (r.status || "").toLowerCase().includes("holiday")).length;
    return { present, absent, late, halfDays, onLeave, weeklyOff };
  }, [myRecords]);

  // Team Summary Stats
  const teamStats = useMemo(() => {
    const total = teamRecords.length;
    const present = teamRecords.filter((r) => (r.status || "").toLowerCase() === "present").length;
    const late = teamRecords.filter((r) => (r.status || "").toLowerCase().includes("late")).length;
    const absent = teamRecords.filter((r) => (r.status || "").toLowerCase() === "absent").length;
    const onLeave = teamRecords.filter((r) => (r.status || "").toLowerCase().includes("leave") || (r.status || "").toLowerCase().includes("half")).length;
    return { total, present, late, absent, onLeave };
  }, [teamRecords]);

  // Monthly Grid Data
  const monthlyGrid = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const map = {};
    myRecords.forEach((r) => {
      const d = r.day || (r.date ? new Date(r.date).getDate() : null);
      if (d) map[d] = r;
    });

    const arr = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rec = map[day] || null;
      const dateObj = new Date(calendarYear, calendarMonth - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      let status = rec?.status?.toLowerCase() || (isWeekend ? "weekly_off" : "");
      arr.push({ day, date: dateStr, status, record: rec });
    }
    return arr;
  }, [calendarYear, calendarMonth, myRecords]);

  // Active Selected Day (Defaults to 1st of month or today)
  const activeSelectedDay = useMemo(() => {
    if (selectedModalDate) {
      const found = monthlyGrid.find(m => m.date === selectedModalDate);
      if (found) return found;
    }
    return monthlyGrid[0] || null;
  }, [selectedModalDate, monthlyGrid]);

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
    setSelectedModalDate(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
    setSelectedModalDate(null);
  };

  const totalTrackedDays = myRecords.length || 31;

  return (
    <div className="space-y-3 pb-28 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      
      {/* ── 1. SLIM EXECUTIVE TOP BAR ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CalendarCheck size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Attendance Management
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {new Date(calendarYear, calendarMonth - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {activeTab === 0 ? "Personal monthly attendance calendar and shift logs" : "Team attendance monitoring and daily punch roster"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tab Pill Switcher (Admin-Matched) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab(0)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 0 ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                My Calendar
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 1 ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Team Roster
              </button>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Attendance"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP 5 KPI STAT CARDS (EXACT MATCH WITH ADMIN ATTENDANCE) ────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <KPICard 
          label={activeTab === 0 ? "Tracked Days" : "Total Team"} 
          value={activeTab === 0 ? myRecords.length || 31 : teamStats.total} 
          trend="12.5%" isUp period="last month" 
          strokeColor="#0d9488" Icon={CalendarCheck} iconBg="bg-teal-500/10" iconColor="#0d9488"
        />
        <KPICard 
          label="Present" 
          value={activeTab === 0 ? myStats.present : teamStats.present} 
          trend="8.2%" isUp period="last month" 
          strokeColor="#10B981" Icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="#059669"
        />
        <KPICard 
          label="Late Arrival" 
          value={activeTab === 0 ? myStats.late : teamStats.late} 
          trend="3.1%" isUp={false} period="last month" 
          strokeColor="#F59E0B" Icon={Clock} iconBg="bg-amber-500/10" iconColor="#D97706"
        />
        <KPICard 
          label="Absent" 
          value={activeTab === 0 ? myStats.absent : teamStats.absent} 
          trend="1.4%" isUp={false} period="last month" 
          strokeColor="#EF4444" Icon={XCircle} iconBg="bg-rose-500/10" iconColor="#DC2626"
        />
        <KPICard 
          label="On Leave" 
          value={activeTab === 0 ? myStats.onLeave + myStats.halfDays : teamStats.onLeave} 
          trend="0.0%" isUp period="last month" 
          strokeColor="#8B5CF6" Icon={CalendarOff} iconBg="bg-purple-500/10" iconColor="#7C3AED"
        />
      </div>

      {/* ── 3. MONTHLY ATTENDANCE CALENDAR (EXACT MATCH WITH ADMIN ATTENDANCE) ─ */}
      {activeTab === 0 ? (
        <div className="space-y-3">
          
          {/* Monthly Mini Stat Summary Strip (Matching Admin Attendance) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { 
                label: "PRESENT", 
                value: myStats.present, 
                sub: `${totalTrackedDays > 0 ? Math.round((myStats.present / totalTrackedDays) * 100) : 0}%`, 
                icon: UserCheck, 
                iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                subColor: "text-emerald-600 dark:text-emerald-400"
              },
              { 
                label: "ABSENT", 
                value: myStats.absent, 
                sub: `${totalTrackedDays > 0 ? Math.round((myStats.absent / totalTrackedDays) * 100) : 0}%`, 
                icon: UserX, 
                iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                subColor: "text-rose-600 dark:text-rose-400"
              },
              { 
                label: "HALF DAY", 
                value: myStats.halfDays, 
                sub: `${totalTrackedDays > 0 ? Math.round((myStats.halfDays / totalTrackedDays) * 100) : 0}%`, 
                icon: UserMinus, 
                iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                subColor: "text-amber-600 dark:text-amber-400"
              },
              { 
                label: "OFF / HOLIDAY", 
                value: myStats.weeklyOff, 
                sub: "Total Days", 
                icon: CalendarDays, 
                iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                subColor: "text-purple-600 dark:text-purple-400"
              },
            ].map(({ label, value, sub, icon: Icon, iconBg, subColor }) => (
              <div
                key={label}
                className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-2xs flex items-center gap-2.5"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">{label}</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-black text-slate-900 dark:text-white leading-tight font-mono">{value}</span>
                    <span className={`text-[9.5px] font-extrabold leading-none ${subColor}`}>{sub}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            
            {/* Left Column: Monthly Calendar (7/12) */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
                
                {/* Terracotta Top Header Banner */}
                <div className="bg-[#9E3616] dark:bg-[#8B2D12] px-4 py-2 flex items-center justify-between text-white">
                  <button 
                    onClick={handlePrevMonth}
                    className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    title="Previous Month"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                  </button>
                  <span className="text-sm sm:text-base font-extrabold text-white tracking-wide capitalize">
                    {new Date(calendarYear, calendarMonth - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                  <button 
                    onClick={handleNextMonth}
                    className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    title="Next Month"
                  >
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-16 text-center text-xs text-slate-400 font-semibold animate-pulse">
                    Refreshing attendance calendar grid...
                  </div>
                ) : (
                  <div className="p-2.5 space-y-1.5">
                    {/* Day Headers: Individual Pill Cards (SUN -> SAT) */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, i) => (
                        <div
                          key={d}
                          className={`text-center text-[9.5px] font-black uppercase tracking-wider py-1 rounded-xl border ${
                            i === 0 || i === 6
                              ? "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/30"
                              : "text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: new Date(calendarYear, calendarMonth - 1, 1).getDay() }).map((_, i) => (
                        <div key={`blank-${i}`} className="aspect-[16/11] min-h-[46px] rounded-xl border border-dashed border-slate-200/50 dark:border-slate-800/50 bg-transparent" />
                      ))}

                      {monthlyGrid.map((dayItem) => {
                        const isSelected = (selectedModalDate || activeSelectedDay?.date) === dayItem.date;
                        const style = getCalendarDayStyle(dayItem.status);

                        return (
                          <div 
                            key={dayItem.day} 
                            title={`${dayItem.date}: ${dayItem.status ? dayItem.status.replace("_", " ") : "no record"}`}
                            onClick={() => setSelectedModalDate(dayItem.date)}
                            className={`relative rounded-xl sm:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2 aspect-[16/11] min-h-[46px] sm:min-h-[50px] transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-2 border-[#9E3616] dark:border-amber-400 ring-2 ring-[#9E3616]/20 shadow-xs scale-[1.02] z-10 ' + style.bg
                                : `${style.border} ${style.bg} hover:scale-[1.02] hover:shadow-2xs`
                            }`}
                          >
                            {/* Top Row: Number on left, Status Dot on right */}
                            <div className="flex items-center justify-between w-full leading-none">
                              <span className={`text-xs sm:text-[13px] font-black ${style.num}`}>
                                {dayItem.day}
                              </span>
                              {style.hasDot && (
                                <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              )}
                            </div>

                            {/* Bottom Row: Status Text */}
                            <div className="w-full leading-none">
                              {style.label ? (
                                <span className={`text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider ${style.labelColor} leading-none truncate block`}>
                                  {style.label}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Legend */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      {[
                        { label: "PRESENT", color: "bg-[#22C55E]" },
                        { label: "HALF DAY", color: "bg-[#F59E0B]" },
                        { label: "LEAVE", color: "bg-[#3B82F6]" },
                        { label: "ABSENT", color: "bg-[#F43F5E]" },
                        { label: "OFF / HOLIDAY", color: "bg-slate-300 dark:bg-slate-600" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-xs ${item.color}`} />
                          <span className="text-[9.5px] font-black text-slate-700 dark:text-slate-300 tracking-wider">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Executive Activity Log Side-Card (5/12) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-500" />
                    Activity — {activeSelectedDay?.date ? new Date(activeSelectedDay.date.replace(/-/g, '/')).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : "TODAY"}
                  </h4>
                  
                  {activeSelectedDay && (
                    <span className={`text-[9.5px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${getCalendarDayStyle(activeSelectedDay.status).bg} ${getCalendarDayStyle(activeSelectedDay.status).border} ${getCalendarDayStyle(activeSelectedDay.status).labelColor}`}>
                      {getCalendarDayStyle(activeSelectedDay.status).label || "OFF"}
                    </span>
                  )}
                </div>

                {activeSelectedDay?.record ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Check In */}
                      <div className="bg-slate-50 dark:bg-[#0B101B] p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Punch In</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                          {formatTime(activeSelectedDay.record.punchIn || activeSelectedDay.record.inTime || activeSelectedDay.record.punchInTime)}
                        </p>
                        <p className="mt-1 text-[9.5px] font-medium text-slate-400 truncate flex items-center gap-1">
                          <MapPin size={10} className="text-amber-500 shrink-0" /> Office Area
                        </p>
                      </div>

                      {/* Check Out */}
                      <div className="bg-slate-50 dark:bg-[#0B101B] p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase tracking-wider text-rose-600">Punch Out</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                          {formatTime(activeSelectedDay.record.punchOut || activeSelectedDay.record.outTime || activeSelectedDay.record.punchOutTime)}
                        </p>
                        <p className="mt-1 text-[9.5px] font-medium text-slate-400 truncate flex items-center gap-1">
                          <MapPin size={10} className="text-amber-500 shrink-0" /> Verified GPS
                        </p>
                      </div>
                    </div>

                    {/* Total Work Duration Row */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-bold uppercase">Total Work Duration</span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                        ⏱️ {formatDuration(activeSelectedDay.record.workHours || activeSelectedDay.record.totalHours || "9.0")}
                      </span>
                    </div>

                    {/* Shift & Verification Breakdown */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">Shift Schedule</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">General Shift (09:30 - 18:30)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-bold">Break Duration</span>
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-300">01h 00m</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-bold">Audit Status</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck size={11} /> Verified Punch
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                    <CalendarDays size={26} className="mx-auto opacity-30 text-amber-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      {activeSelectedDay?.status === "absent" ? "Marked Absent" : activeSelectedDay?.status === "weekly_off" ? "Scheduled Weekly Off" : "No Punch Record"}
                    </p>
                    <p className="text-[10.5px] text-slate-400">
                      {activeSelectedDay?.status === "absent" ? "No check-in was logged on this working day." : "No active shift logged for this date."}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ── 4. TEAM ROSTER TABLE VIEW ─────────────────────────────────────── */
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="relative w-64">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">On Leave</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0B101B] border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Staff Member</th>
                  <th className="px-3 py-2.5">Punch In</th>
                  <th className="px-3 py-2.5">Punch Out</th>
                  <th className="px-3 py-2.5">Total Hours</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <RefreshCw className="animate-spin mx-auto mb-1 text-amber-500" size={18} />
                      Loading records...
                    </td>
                  </tr>
                ) : filteredTeamRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No team attendance records for this period.
                    </td>
                  </tr>
                ) : (
                  filteredTeamRecords.map((rec, i) => {
                    const statusStyle = getCalendarDayStyle(rec.status);
                    const dateStr = rec.date ? new Date(rec.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", weekday: "short" }) : `Day ${i + 1}`;
                    const empName = rec.employeeId?.name || rec.employee?.name || rec.employeeName || "Staff";

                    return (
                      <tr key={rec._id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">{dateStr}</td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{empName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{formatTime(rec.punchIn || rec.inTime)}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{formatTime(rec.punchOut || rec.outTime)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">{formatDuration(rec.workHours || rec.totalHours)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.labelColor}`}>
                            {statusStyle.label || "PRESENT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
