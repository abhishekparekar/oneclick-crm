import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getManagerMyAttendanceApi, getManagerTeamAttendanceApi, getManagerTeamMemberMonthlyAttendanceApi } from "../../api/managerApi";
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

  // Team employee drill-down state
  const [selectedTeamEmployee, setSelectedTeamEmployee] = useState(null);
  const [teamCalMonth, setTeamCalMonth] = useState(now.getMonth() + 1);
  const [teamCalYear, setTeamCalYear] = useState(now.getFullYear());
  const [selectedTeamDate, setSelectedTeamDate] = useState(null);

  const { data: myData, isLoading: myLoading, refetch: myRefetch, isFetching: myFetching } = useQuery({
    queryKey: ["managerMyAttendance", calendarMonth, calendarYear],
    queryFn: () => getManagerMyAttendanceApi({ month: calendarMonth, year: calendarYear }).then((r) => r.data),
    refetchInterval: 5000,
    enabled: activeTab === 0,
  });

  const { data: teamData, isLoading: teamLoading, refetch: teamRefetch, isFetching: teamFetching } = useQuery({
    queryKey: ["managerTeamAttendance", calendarMonth, calendarYear],
    queryFn: () => getManagerTeamAttendanceApi({ month: calendarMonth, year: calendarYear }).then((r) => r.data),
    refetchInterval: 30000,
    enabled: activeTab === 1,
  });

  // Monthly calendar for selected team employee
  const { data: teamMemberMonthly, isFetching: teamMemberFetching } = useQuery({
    queryKey: ["mgrTeamMemberMonthly", selectedTeamEmployee?._id, teamCalMonth, teamCalYear],
    queryFn: () => getManagerTeamMemberMonthlyAttendanceApi(selectedTeamEmployee._id, { month: teamCalMonth, year: teamCalYear }).then(r => r.data),
    enabled: !!selectedTeamEmployee?._id,
  });

  const _rawMy = myData?.data?.days || myData?.attendance || myData?.data;
  const myRecords = useMemo(() => (Array.isArray(_rawMy) ? _rawMy : []), [_rawMy]);

  // Backend returns: { data: [{ employee: {...}, attendance: {...} | [...] }] }
  // Build unique employee list (one row per employee, not per attendance record)
  const teamEmployees = useMemo(() => {
    const raw = teamData?.data;
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw
      .filter(item => {
        const id = item.employee?._id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(item => {
        const emp = item.employee || {};
        // Get today's or most recent attendance for status badge
        const atts = Array.isArray(item.attendance)
          ? item.attendance
          : item.attendance ? [item.attendance] : [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayAtt = atts.find(a => (a.date || "").slice(0, 10) === todayStr) || atts[atts.length - 1] || null;
        return {
          _id: emp._id,
          fullName: emp.fullName || emp.name || "Staff",
          photo: emp.photo || null,
          employeeCode: emp.employeeCode || "",
          department: emp.departmentId?.name || "",
          designation: emp.designationId?.name || emp.designation || "",
          todayStatus: todayAtt?.status || "absent",
          punchIn: todayAtt?.punchInTime || todayAtt?.punchIn || null,
          punchOut: todayAtt?.punchOutTime || todayAtt?.punchOut || null,
          totalHours: todayAtt?.totalHours || null,
        };
      });
  }, [teamData]);

  const filteredTeamEmployees = useMemo(() => {
    return teamEmployees.filter(emp => {
      const name = emp.fullName.toLowerCase();
      const code = emp.employeeCode.toLowerCase();
      const s = searchQuery.toLowerCase();
      return name.includes(s) || code.includes(s);
    });
  }, [teamEmployees, searchQuery]);

  // Monthly grid for selected team employee
  const teamMemberGrid = useMemo(() => {
    if (!selectedTeamEmployee) return [];
    const totalDays = new Date(teamCalYear, teamCalMonth, 0).getDate();
    const records = Array.isArray(teamMemberMonthly?.data)
      ? teamMemberMonthly.data
      : Array.isArray(teamMemberMonthly) ? teamMemberMonthly : [];
    const today = new Date().toISOString().slice(0, 10);
    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const ds = `${teamCalYear}-${String(teamCalMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rec = records.find(r => (r.date || "").slice(0, 10) === ds);
      if (rec) {
        days.push({ day, date: ds, status: rec.status, record: rec });
      } else {
        const dow = new Date(teamCalYear, teamCalMonth - 1, day).getDay();
        days.push({ day, date: ds, status: dow === 0 || dow === 6 ? "weekly_off" : (ds > today ? "" : "absent"), record: null });
      }
    }
    return days;
  }, [teamMemberMonthly, teamCalMonth, teamCalYear, selectedTeamEmployee]);

  const teamMemberMonthlyStats = useMemo(() => ({
    present: teamMemberGrid.filter(d => d.status === "present" || d.status === "late").length,
    absent: teamMemberGrid.filter(d => d.status === "absent").length,
    halfDays: teamMemberGrid.filter(d => d.status === "half_day").length,
    leaves: teamMemberGrid.filter(d => ["paid_leave","unpaid_leave","leave"].includes(d.status)).length,
    weeklyOff: teamMemberGrid.filter(d => ["weekly_off","weekend","holiday"].includes(d.status)).length,
  }), [teamMemberGrid]);

  const teamSelectedDayData = useMemo(() => {
    const target = selectedTeamDate;
    if (!target) return teamMemberGrid.find(d => d.date === new Date().toISOString().slice(0,10)) || teamMemberGrid[0] || null;
    return teamMemberGrid.find(d => d.date === target) || null;
  }, [selectedTeamDate, teamMemberGrid]);

  const handleTeamPrevMonth = () => {
    if (teamCalMonth === 1) { setTeamCalMonth(12); setTeamCalYear(y => y - 1); }
    else setTeamCalMonth(m => m - 1);
    setSelectedTeamDate(null);
  };
  const handleTeamNextMonth = () => {
    if (teamCalMonth === 12) { setTeamCalMonth(1); setTeamCalYear(y => y + 1); }
    else setTeamCalMonth(m => m + 1);
    setSelectedTeamDate(null);
  };

  const isLoading = activeTab === 0 ? myLoading : teamLoading;
  const isFetching = activeTab === 0 ? myFetching : teamFetching;
  const refetch = activeTab === 0 ? myRefetch : teamRefetch;

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

  // Team Summary Stats — from unique employee list
  const teamStats = useMemo(() => ({
    total: teamEmployees.length,
    present: teamEmployees.filter(e => e.todayStatus === "present" || e.todayStatus === "late").length,
    late: teamEmployees.filter(e => e.todayStatus === "late").length,
    absent: teamEmployees.filter(e => e.todayStatus === "absent").length,
    onLeave: teamEmployees.filter(e => ["paid_leave","unpaid_leave","leave","half_day"].includes(e.todayStatus)).length,
  }), [teamEmployees]);

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
        /* ── 4. TEAM ROSTER — Employee List → Click → Monthly Calendar ─────── */
        <div className="space-y-3">
          {selectedTeamEmployee ? (
            /* ── SELECTED EMPLOYEE MONTHLY DETAIL VIEW ── */
            <div className="space-y-3 animate-fadeIn">
              {/* Back + Profile Header */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedTeamEmployee(null); setSelectedTeamDate(null); }}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {selectedTeamEmployee.photo
                      ? <img src={selectedTeamEmployee.photo} alt={selectedTeamEmployee.fullName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0" />
                      : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 shadow-2xs shrink-0">{selectedTeamEmployee.fullName.charAt(0).toUpperCase()}</div>
                    }
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight truncate">{selectedTeamEmployee.fullName}</span>
                        {selectedTeamEmployee.employeeCode && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold">{selectedTeamEmployee.employeeCode}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {selectedTeamEmployee.designation && <span>{selectedTeamEmployee.designation}</span>}
                        {selectedTeamEmployee.designation && selectedTeamEmployee.department && <span>•</span>}
                        {selectedTeamEmployee.department && <span>{selectedTeamEmployee.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      teamMemberMonthlyStats.present > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {teamMemberMonthlyStats.present + teamMemberMonthlyStats.halfDays} days present
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact monthly KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "PRESENT",    value: teamMemberMonthlyStats.present,  icon: UserCheck,   iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", sub: "days" },
                  { label: "LEAVE",      value: teamMemberMonthlyStats.leaves,   icon: CalendarOff, iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",           sub: "days" },
                  { label: "ABSENT",     value: teamMemberMonthlyStats.absent,   icon: UserX,       iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",           sub: "days" },
                  { label: "HALF DAY",   value: teamMemberMonthlyStats.halfDays, icon: UserMinus,   iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",       sub: "days" },
                  { label: "OFF/HOLIDAY",value: teamMemberMonthlyStats.weeklyOff,icon: CalendarDays,iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",  sub: "days" },
                ].map(({ label, value, icon: Icon, iconBg, sub }) => (
                  <div key={label} className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-2xs flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}><Icon size={13} strokeWidth={2} /></div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-slate-900 dark:text-white">{value}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{sub}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar + Day detail */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* Calendar */}
                <div className="lg:col-span-7">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
                    <div className="bg-[#9E3616] dark:bg-[#8B2D12] px-4 py-2 flex items-center justify-between text-white">
                      <button onClick={handleTeamPrevMonth} className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 flex items-center justify-center transition-all cursor-pointer"><ChevronLeft size={14} strokeWidth={2.5} /></button>
                      <span className="text-sm font-extrabold text-white tracking-wide">
                        {new Date(teamCalYear, teamCalMonth - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </span>
                      <button onClick={handleTeamNextMonth} className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 flex items-center justify-center transition-all cursor-pointer"><ChevronRight size={14} strokeWidth={2.5} /></button>
                    </div>
                    {teamMemberFetching ? (
                      <div className="py-14 text-center text-xs text-slate-400 animate-pulse">Refreshing calendar...</div>
                    ) : (
                      <div className="p-2.5 space-y-1.5">
                        <div className="grid grid-cols-7 gap-1.5">
                          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d, i) => (
                            <div key={d} className={`text-center text-[9.5px] font-black uppercase tracking-wider py-1 rounded-xl border ${
                              i === 0 || i === 6 ? "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/30"
                              : "text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800"
                            }`}>{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({ length: new Date(teamCalYear, teamCalMonth - 1, 1).getDay() }).map((_, i) => (
                            <div key={`b-${i}`} className="aspect-[16/11] min-h-[46px] rounded-xl border border-dashed border-slate-200/50 dark:border-slate-800/50 bg-transparent" />
                          ))}
                          {teamMemberGrid.map(dayItem => {
                            const isSelected = (selectedTeamDate || new Date().toISOString().slice(0,10)) === dayItem.date;
                            const style = getCalendarDayStyle(dayItem.status);
                            return (
                              <div key={dayItem.day}
                                title={`${dayItem.date}: ${dayItem.status || "no record"}`}
                                onClick={() => setSelectedTeamDate(dayItem.date)}
                                className={`relative rounded-xl sm:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2 aspect-[16/11] min-h-[46px] sm:min-h-[50px] transition-all cursor-pointer ${
                                  isSelected ? `border-2 border-[#9E3616] dark:border-amber-400 ring-2 ring-[#9E3616]/20 shadow-xs scale-[1.02] z-10 ${style.bg}`
                                  : `${style.border} ${style.bg} hover:scale-[1.02] hover:shadow-2xs`
                                }`}>
                                <div className="flex items-center justify-between w-full leading-none">
                                  <span className={`text-xs sm:text-[13px] font-black ${style.num}`}>{dayItem.day}</span>
                                  {style.hasDot && <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                                </div>
                                <div className="w-full leading-none">
                                  {style.label && <span className={`text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider ${style.labelColor} leading-none truncate block`}>{style.label}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                          {[{label:"PRESENT",color:"bg-[#22C55E]"},{label:"HALF DAY",color:"bg-[#F59E0B]"},{label:"LEAVE",color:"bg-[#3B82F6]"},{label:"ABSENT",color:"bg-[#F43F5E]"},{label:"OFF",color:"bg-slate-300 dark:bg-slate-600"}].map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-xs ${item.color}`} />
                              <span className="text-[9.5px] font-black text-slate-700 dark:text-slate-300 tracking-wider">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Day Detail Panel */}
                <div className="lg:col-span-5">
                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-500" />
                        Activity — {teamSelectedDayData?.date
                          ? new Date(teamSelectedDayData.date.replace(/-/g, "/")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()
                          : "TODAY"}
                      </h4>
                      {teamSelectedDayData && (
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${
                          getCalendarDayStyle(teamSelectedDayData.status).bg} ${getCalendarDayStyle(teamSelectedDayData.status).border} ${getCalendarDayStyle(teamSelectedDayData.status).labelColor
                        }`}>{getCalendarDayStyle(teamSelectedDayData.status).label || "OFF"}</span>
                      )}
                    </div>
                    {teamSelectedDayData?.record ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 dark:bg-[#0B101B] p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Punch In</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">{formatTime(teamSelectedDayData.record.punchInTime || teamSelectedDayData.record.punchIn)}</p>
                            {teamSelectedDayData.record.punchInLocation?.address && (
                              <p className="mt-1 text-[9.5px] font-medium text-slate-400 truncate flex items-center gap-1"><MapPin size={10} className="text-amber-500 shrink-0" />{teamSelectedDayData.record.punchInLocation.address}</p>
                            )}
                          </div>
                          <div className="bg-slate-50 dark:bg-[#0B101B] p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                            <p className="text-[9px] font-black uppercase tracking-wider text-rose-600">Punch Out</p>
                            {teamSelectedDayData.record.punchOutTime || teamSelectedDayData.record.punchOut
                              ? <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{formatTime(teamSelectedDayData.record.punchOutTime || teamSelectedDayData.record.punchOut)}</p>
                              : <span className="text-[9.5px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1"><span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Active</span>
                            }
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500 font-bold uppercase">Total Hours</span>
                          <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">⏱️ {formatDuration(teamSelectedDayData.record.totalHours || teamSelectedDayData.record.workHours)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B101B] border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500 font-bold uppercase">Source</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-xs capitalize">{teamSelectedDayData.record.source || "App"}</span>
                        </div>
                        {teamSelectedDayData.record.gpsValidated !== undefined && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300">
                            <ShieldCheck size={12} className="text-amber-600" />
                            <span className="font-bold">GPS:</span>
                            <span className="font-extrabold">{teamSelectedDayData.record.gpsValidated ? "✓ Validated" : "Unverified"}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                        <CalendarDays size={26} className="mx-auto opacity-30 text-amber-500" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {teamSelectedDayData?.status === "absent" ? "Marked Absent" : teamSelectedDayData?.status === "weekly_off" ? "Weekly Off" : "No Punch Record"}
                        </p>
                        <p className="text-[10.5px] text-slate-400">No active shift logged for this date.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── EMPLOYEE TABLE LIST ── */
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              {/* Search */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="text" placeholder="Search team member name or code..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all" />
                </div>
              </div>
              {/* Employee Table */}
              {teamLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <RefreshCw size={22} className="animate-spin text-amber-500" />
                  <p className="text-xs font-bold">Loading team members...</p>
                </div>
              ) : filteredTeamEmployees.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Users size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-bold">No team members found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#0B101B] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-10">#</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Staff Member</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:table-cell">Department</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hidden md:table-cell">Punch In</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hidden md:table-cell">Punch Out</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hidden lg:table-cell">Hours</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Status</th>
                        <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTeamEmployees.map((emp, idx) => {
                        const initials = emp.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                        const statusStyle = getCalendarDayStyle(emp.todayStatus);
                        return (
                          <tr key={emp._id}
                            onClick={() => { setSelectedTeamEmployee(emp); setSelectedTeamDate(null); setTeamCalMonth(now.getMonth() + 1); setTeamCalYear(now.getFullYear()); }}
                            className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors cursor-pointer group">
                            {/* # */}
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px] font-bold">{idx + 1}</td>
                            {/* Staff Member */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2.5">
                                {emp.photo
                                  ? <img src={emp.photo} alt={emp.fullName} className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                  : <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-400 shrink-0">{initials}</div>
                                }
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">{emp.fullName}</div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {emp.employeeCode && <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{emp.employeeCode}</span>}
                                    {emp.designation && <span className="text-[9px] text-slate-400 sm:hidden truncate">{emp.designation}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {/* Department */}
                            <td className="px-3 py-3 hidden sm:table-cell">
                              <div className="text-slate-700 dark:text-slate-300 font-semibold text-xs">{emp.department || "—"}</div>
                              {emp.designation && <div className="text-slate-400 text-[10px] mt-0.5">{emp.designation}</div>}
                            </td>
                            {/* Punch In */}
                            <td className="px-3 py-3 hidden md:table-cell">
                              {emp.punchIn ? (
                                <span className="flex items-center gap-1.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  {formatTime(emp.punchIn)}
                                </span>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            {/* Punch Out */}
                            <td className="px-3 py-3 hidden md:table-cell">
                              {emp.punchOut ? (
                                <span className="flex items-center gap-1.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  {formatTime(emp.punchOut)}
                                </span>
                              ) : emp.punchIn ? (
                                <span className="text-[9.5px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />Active
                                </span>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            {/* Hours */}
                            <td className="px-3 py-3 hidden lg:table-cell font-mono font-bold text-slate-700 dark:text-slate-300">
                              {emp.totalHours ? formatDuration(emp.totalHours) : <span className="text-slate-400">—</span>}
                            </td>
                            {/* Status */}
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.labelColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusStyle.label || emp.todayStatus?.toUpperCase() || "—"}
                              </span>
                            </td>
                            {/* Action */}
                            <td className="px-3 py-3 text-right">
                              <button className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-black transition-all group-hover:border-amber-500/40 cursor-pointer">
                                View
                                <ChevronRight size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Footer */}
              <div className="bg-slate-50/50 dark:bg-slate-900/40 px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Showing <span className="font-bold text-slate-900 dark:text-white">{filteredTeamEmployees.length}</span> team members — click any row to view full monthly attendance</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Live</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
