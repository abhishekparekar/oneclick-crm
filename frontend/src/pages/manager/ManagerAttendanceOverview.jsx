import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getManagerTeamAttendanceApi,
  getManagerTeamMemberMonthlyAttendanceApi,
  manualUpdateManagerTeamAttendanceApi,
  getManagerRegularizationApi,
  approveManagerRegularizationApi,
  rejectManagerRegularizationApi,
} from "../../api/managerApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Search, CalendarCheck, RefreshCw, Download, Clock, MapPin, MapPinOff,
  ChevronLeft, ChevronRight, ArrowLeft, CheckCircle, XCircle,
  CalendarDays, UserCheck, UserX, UserMinus, CalendarOff,
  FileSpreadsheet, Coffee, Plane, ChevronDown, Settings2,
  ShieldCheck, CheckCircle2, Check, X, ArrowUp, ArrowDown,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (v) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const getSafeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const t = rawUrl.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:") || t.startsWith("blob:")) return t;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+api$/, "").replace(/\/+$/, "");
  return `${base}/${t.replace(/^\/+/, "")}`;
};

const AVATAR_COLORS = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];
const MiniAvatar = ({ name, photo, size = "w-8 h-8", textSize = "text-[11px]" }) => {
  const url = getSafeUrl(photo);
  if (url) return <img src={url} alt={name || "Avatar"} className={`${size} rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-2xs`} />;
  return (
    <div className={`${size} rounded-xl ${AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

const getCalendarDayStyle = (status) => {
  switch (status) {
    case "present": case "late":
      return { bg: "bg-[#E8F8F0] dark:bg-emerald-950/25", border: "border-2 border-[#22C55E] dark:border-emerald-500", dot: "bg-[#16A34A]", num: "text-slate-900 dark:text-white", label: status === "late" ? "LATE" : "PRESENT", labelColor: "text-[#15803D] dark:text-emerald-400 font-extrabold", hasDot: true };
    case "half_day":
      return { bg: "bg-[#FFF7ED] dark:bg-amber-950/25", border: "border-2 border-[#F59E0B] dark:border-amber-500", dot: "bg-[#F59E0B]", num: "text-slate-900 dark:text-white", label: "HALF DAY", labelColor: "text-[#B45309] dark:text-amber-400 font-extrabold", hasDot: true };
    case "paid_leave": case "unpaid_leave": case "leave":
      return { bg: "bg-[#EFF6FF] dark:bg-blue-950/25", border: "border-2 border-[#3B82F6] dark:border-blue-500", dot: "bg-[#3B82F6]", num: "text-slate-900 dark:text-white", label: "LEAVE", labelColor: "text-[#1D4ED8] dark:text-blue-400 font-extrabold", hasDot: true };
    case "absent":
      return { bg: "bg-[#FEECEF] dark:bg-rose-950/25", border: "border-2 border-[#F43F5E] dark:border-rose-500", dot: "bg-[#E11D48]", num: "text-slate-900 dark:text-white", label: "ABSENT", labelColor: "text-[#BE123C] dark:text-rose-400 font-extrabold", hasDot: true };
    case "weekly_off": case "weekend": case "holiday":
      return { bg: "bg-slate-50/70 dark:bg-slate-900/40", border: "border border-slate-200/80 dark:border-slate-800", dot: "bg-slate-300 dark:bg-slate-600", num: "text-slate-900 dark:text-white", label: "OFF", labelColor: "text-slate-500 dark:text-slate-400 font-bold", hasDot: true };
    default:
      return { bg: "bg-white dark:bg-[#111C24]", border: "border border-slate-200/70 dark:border-slate-800/80", dot: "", num: "text-slate-400 dark:text-slate-500", label: "", labelColor: "text-slate-400", hasDot: false };
  }
};

const STATUS_CFG = {
  present:      { label: "Present",        bg: "bg-emerald-50 dark:bg-emerald-950/40",  text: "text-emerald-700 dark:text-emerald-300",  border: "border-emerald-200 dark:border-emerald-800/60",  dot: "bg-emerald-500" },
  late:         { label: "Late Arrival",   bg: "bg-amber-50 dark:bg-amber-950/40",      text: "text-amber-800 dark:text-amber-300",       border: "border-amber-200 dark:border-amber-800/60",      dot: "bg-amber-500" },
  half_day:     { label: "Half Day",       bg: "bg-purple-50 dark:bg-purple-950/40",    text: "text-purple-700 dark:text-purple-300",     border: "border-purple-200 dark:border-purple-800/60",    dot: "bg-purple-500" },
  absent:       { label: "Absent",         bg: "bg-rose-50 dark:bg-rose-950/40",        text: "text-rose-700 dark:text-rose-300",         border: "border-rose-200 dark:border-rose-800/60",        dot: "bg-rose-500" },
  paid_leave:   { label: "On Leave (Paid)",bg: "bg-blue-50 dark:bg-blue-950/40",        text: "text-blue-700 dark:text-blue-300",         border: "border-blue-200 dark:border-blue-800/60",        dot: "bg-blue-500" },
  unpaid_leave: { label: "On Leave (LWP)", bg: "bg-indigo-50 dark:bg-indigo-950/40",    text: "text-indigo-700 dark:text-indigo-300",     border: "border-indigo-200 dark:border-indigo-800/60",    dot: "bg-indigo-500" },
  holiday:      { label: "Holiday",        bg: "bg-slate-100 dark:bg-slate-800/60",     text: "text-slate-600 dark:text-slate-300",       border: "border-slate-200 dark:border-slate-700",         dot: "bg-slate-400" },
  weekly_off:   { label: "Weekly Off",     bg: "bg-slate-100 dark:bg-slate-800/60",     text: "text-slate-600 dark:text-slate-300",       border: "border-slate-200 dark:border-slate-700",         dot: "bg-slate-500" },
};

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [{ v: 10 }, { v: 18 }, { v: 15 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 35 }], []);
  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group min-w-0">
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize tracking-tight truncate">{label}</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[10px] sm:text-[10.5px] whitespace-nowrap">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}{trend}
          </span>
          <span className="text-slate-400 text-[9px] sm:text-[9.5px]">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 sm:h-9 w-10 sm:w-12 opacity-65 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={32}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-mgr-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-mgr-${label.replace(/\s+/g, "")})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, defaultLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  const label = selectedOption ? selectedOption.label : defaultLabel;
  return (
    <div className="relative shrink-0 flex-1 sm:flex-initial min-w-0">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 h-8 bg-white dark:bg-[#111C24] border rounded-xl text-xs font-bold transition-all w-full min-w-0 sm:min-w-[120px] shadow-2xs ${isOpen ? "border-amber-500 ring-2 ring-amber-500/10 text-amber-600 dark:text-amber-400" : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
        <span className="truncate">{label}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 text-slate-400 shrink-0 ${isOpen ? "rotate-180 text-amber-500" : ""}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 min-w-[150px] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-fadeIn">
            <button type="button" onClick={() => { onChange(""); setIsOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === "" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
              {defaultLabel}
            </button>
            {options.map(opt => (
              <button type="button" key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === opt.value ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManagerAttendanceOverview() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  // ── State ─────────────────────────────────────────────────────────────────
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedModalDate, setSelectedModalDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [manualStatus, setManualStatus] = useState("present");
  const [manualInTime, setManualInTime] = useState("09:30");
  const [manualOutTime, setManualOutTime] = useState("18:30");
  const [manualReasonText, setManualReasonText] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: attendanceRes, isLoading: isAttLoading, refetch: refetchAttendance, isFetching: isAttFetching } = useQuery({
    queryKey: ["mgrTeamAttendanceDaily", date],
    queryFn: () => getManagerTeamAttendanceApi({ date }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: monthlyAttendanceRes, isFetching: isFetchingMonthly } = useQuery({
    queryKey: ["mgrEmployeeMonthlyGrid", selectedEmployee?._id, calendarMonth, calendarYear],
    queryFn: () => getManagerTeamMemberMonthlyAttendanceApi(selectedEmployee._id, { month: calendarMonth, year: calendarYear }).then(r => r.data),
    enabled: !!selectedEmployee?._id,
  });

  const { data: regularizationRes, refetch: refetchRegularizations } = useQuery({
    queryKey: ["mgrRegularizations"],
    queryFn: () => getManagerRegularizationApi().then(r => r.data),
  });

  // ── Normalize team data: backend returns [{ employee, attendance }] ────────
  const fullAttendanceData = useMemo(() => {
    const raw = attendanceRes?.data;
    if (!Array.isArray(raw)) return [];
    return raw.map(item => {
      const emp = item.employee || {};
      // attendance can be single object (daily) or array (monthly) — for daily it's one record or null
      const att = Array.isArray(item.attendance) ? item.attendance[0] : item.attendance;
      return {
        _id: att?._id || `no-record-${emp._id}`,
        employeeId: {
          _id: emp._id,
          firstName: emp.fullName?.split(" ")[0] || emp.firstName || "",
          lastName: emp.fullName?.split(" ").slice(1).join(" ") || emp.lastName || "",
          fullName: emp.fullName || emp.name || "",
          employeeCode: emp.employeeCode || "",
          photo: emp.photo || null,
          departmentId: { name: emp.departmentId?.name || "" },
          designationId: { name: emp.designationId?.name || emp.designation || "" },
        },
        date: att?.date || date,
        punchInTime: att?.punchInTime || null,
        punchOutTime: att?.punchOutTime || null,
        totalHours: att?.totalHours || null,
        status: att?.status || "absent",
        source: att?.source || "System",
        gpsValidated: att?.gpsValidated || false,
        punchInLocation: att?.punchInLocation || null,
        punchOutLocation: att?.punchOutLocation || null,
        hasRecord: !!att,
      };
    });
  }, [attendanceRes, date]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return fullAttendanceData.filter(rec => {
      const name = (rec.employeeId?.fullName || `${rec.employeeId?.firstName || ""} ${rec.employeeId?.lastName || ""}`).toLowerCase();
      const code = (rec.employeeId?.employeeCode || "").toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = name.includes(s) || code.includes(s);
      const matchStatus = !statusFilter || rec.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [fullAttendanceData, search, statusFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const data = fullAttendanceData;
    const present = data.filter(r => r.status === "present" || r.status === "late").length;
    const absent = data.filter(r => r.status === "absent").length;
    const late = data.filter(r => r.status === "late").length;
    const halfDay = data.filter(r => r.status === "half_day").length;
    const leaves = data.filter(r => r.status === "paid_leave" || r.status === "unpaid_leave").length;
    const regs = Array.isArray(regularizationRes?.data) ? regularizationRes.data.length : (regularizationRes?.data?.requests?.length || 0);
    return { total: data.length, present, absent, late, halfDay, leaves, pendingRegularizations: regs };
  }, [fullAttendanceData, regularizationRes]);

  // ── Monthly Grid ──────────────────────────────────────────────────────────
  const monthlyGrid = useMemo(() => {
    const totalDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const records = Array.isArray(monthlyAttendanceRes?.data) ? monthlyAttendanceRes.data
      : Array.isArray(monthlyAttendanceRes) ? monthlyAttendanceRes : [];
    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const ds = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rec = records.find(r => (r.date || "").slice(0, 10) === ds);
      if (rec) {
        days.push({ day, date: ds, status: rec.status, record: rec });
      } else {
        const dow = new Date(calendarYear, calendarMonth - 1, day).getDay();
        days.push({ day, date: ds, status: dow === 0 || dow === 6 ? "weekly_off" : (ds > today ? "" : "absent"), record: null });
      }
    }
    return days;
  }, [monthlyAttendanceRes, calendarMonth, calendarYear, today]);

  const selectedDayData = useMemo(() => {
    const targetDate = selectedModalDate || date;
    const monthDay = monthlyGrid.find(d => d.date === targetDate);
    if (monthDay) return { record: monthDay.record, status: monthDay.status || "absent" };
    return null;
  }, [selectedEmployee, selectedModalDate, date, monthlyGrid]);

  const activeRecord = selectedDayData?.record || null;
  const activeCalculatedStatus = selectedDayData?.status || "absent";

  useEffect(() => {
    if (activeRecord) {
      setManualStatus(activeRecord.status || "present");
      setManualInTime(activeRecord.punchInTime ? new Date(activeRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "09:30");
      setManualOutTime(activeRecord.punchOutTime ? new Date(activeRecord.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "18:30");
      setManualReasonText(activeRecord.manualReason || "");
    } else {
      setManualStatus(activeCalculatedStatus === "" ? "absent" : activeCalculatedStatus);
      setManualInTime("09:30");
      setManualOutTime("18:30");
      setManualReasonText("");
    }
  }, [activeRecord, activeCalculatedStatus, selectedEmployee]);

  // ── Monthly stats ─────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => ({
    present: monthlyGrid.filter(d => d.status === "present" || d.status === "late").length,
    absent: monthlyGrid.filter(d => d.status === "absent").length,
    halfDays: monthlyGrid.filter(d => d.status === "half_day").length,
    leaves: monthlyGrid.filter(d => ["paid_leave", "unpaid_leave", "leave"].includes(d.status)).length,
    weeklyOff: monthlyGrid.filter(d => ["weekly_off", "weekend", "holiday"].includes(d.status)).length,
  }), [monthlyGrid]);

  const totalTrackedDays = monthlyStats.present + monthlyStats.absent + monthlyStats.halfDays + monthlyStats.leaves;
  const attendanceRate = totalTrackedDays > 0 ? Math.round(((monthlyStats.present + monthlyStats.halfDays * 0.5) / totalTrackedDays) * 100) : 0;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: approveManagerRegularizationApi,
    onSuccess: () => { queryClient.invalidateQueries(["mgrRegularizations"]); queryClient.invalidateQueries(["mgrTeamAttendanceDaily"]); triggerToast("Regularization approved"); },
    onError: e => triggerToast(e?.response?.data?.message || "Approve failed", "error"),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectManagerRegularizationApi(id, reason),
    onSuccess: () => { queryClient.invalidateQueries(["mgrRegularizations"]); triggerToast("Regularization rejected"); setRejectModalId(null); setRejectionReason(""); },
    onError: e => triggerToast(e?.response?.data?.message || "Reject failed", "error"),
  });

  // ── Month navigation ──────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (calendarMonth === 1) { setCalendarMonth(12); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (calendarMonth === 12) { setCalendarMonth(1); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleSaveManualUpdate = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setIsSavingManual(true);
    try {
      const recordId = activeRecord?._id || "new";
      const payload = {
        status: manualStatus,
        punchInTime: manualInTime,
        punchOutTime: manualOutTime,
        manualReason: manualReasonText,
        employeeId: selectedEmployee._id,
        date: selectedModalDate || date,
      };
      const res = await manualUpdateManagerTeamAttendanceApi(recordId, payload);
      if (res.data?.success) {
        queryClient.invalidateQueries(["mgrTeamAttendanceDaily"]);
        queryClient.invalidateQueries(["mgrEmployeeMonthlyGrid"]);
        triggerToast("Attendance record manually updated");
      } else {
        triggerToast("Failed to save changes", "error");
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "An error occurred", "error");
    } finally {
      setIsSavingManual(false);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredData.length === 0) { triggerToast("No data to export", "error"); return; }
    const headers = ["Employee Code", "Name", "Department", "Date", "Punch In", "Punch Out", "Total Hours", "Status", "Source"];
    const rows = filteredData.map(rec => [
      rec.employeeId?.employeeCode || "—",
      rec.employeeId?.fullName || `${rec.employeeId?.firstName || ""} ${rec.employeeId?.lastName || ""}`.trim(),
      rec.employeeId?.departmentId?.name || "—",
      rec.date || "—",
      formatTime(rec.punchInTime),
      formatTime(rec.punchOutTime),
      rec.totalHours ? `${rec.totalHours.toFixed(2)} hrs` : "0",
      rec.status || "—",
      rec.source || "—",
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Team_Attendance_${date}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    triggerToast("Export completed successfully");
  };

  // ── Export timesheet ──────────────────────────────────────────────────────
  const handleExportEmployeeTimesheet = () => {
    if (!selectedEmployee || monthlyGrid.length === 0) return;
    const headers = ["Date", "Day", "Status", "Punch In", "Punch Out", "Total Hours"];
    const rows = monthlyGrid.map(d => {
      const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
      const inTime = d.record?.punchInTime ? formatTime(d.record.punchInTime) : "—";
      const outTime = d.record?.punchOutTime ? formatTime(d.record.punchOutTime) : "—";
      const hrs = d.record?.totalHours ? `${d.record.totalHours.toFixed(1)}h` : "0h";
      return [d.date, dayName, d.status || "—", inTime, outTime, hrs].join(",");
    });
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `${selectedEmployee.fullName || "Employee"}_Attendance_${calendarMonth}_${calendarYear}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    triggerToast("Employee timesheet exported successfully");
  };

  // ── Regularization list ───────────────────────────────────────────────────
  const regRequests = Array.isArray(regularizationRes?.data) ? regularizationRes.data
    : (regularizationRes?.data?.requests || []);

  // ══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE DETAIL VIEW (same as admin)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedEmployee) {
    const selectedEmpPhotoUrl = getSafeUrl(selectedEmployee.photo);
    const selectedEmpName = selectedEmployee.fullName || `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim();
    const deptName = selectedEmployee.departmentId?.name || selectedEmployee.department || "";
    const designationName = selectedEmployee.designation || selectedEmployee.designationId?.name || "";

    return (
      <div className="space-y-3 animate-fadeIn pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-bold flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
            {toast.type === "error" ? <X size={14}/> : <Check size={14}/>} {toast.message}
          </div>
        )}

        {/* Compact Profile Header Bar */}
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedEmployee(null); setSelectedModalDate(null); }}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
                title="Back to attendance overview">
                <ArrowLeft size={15} />
              </button>
              {selectedEmpPhotoUrl
                ? <img src={selectedEmpPhotoUrl} alt={selectedEmpName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0" />
                : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 shadow-2xs shrink-0">{selectedEmpName.charAt(0).toUpperCase()}</div>
              }
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-tight truncate">{selectedEmpName}</h1>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold">{selectedEmployee.employeeCode}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {designationName && <span>{designationName}</span>}
                  {designationName && deptName && <span>•</span>}
                  {deptName && <span>{deptName}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{attendanceRate}% Rate</span>
              </div>
              <button onClick={handleExportEmployeeTimesheet}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs transition-all cursor-pointer">
                <Download size={12} className="text-amber-500" /><span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[
            { label: "PRESENT",     value: monthlyStats.present,  sub: `${totalTrackedDays > 0 ? Math.round((monthlyStats.present / totalTrackedDays) * 100) : 0}%`, icon: UserCheck,  iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", subColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "LEAVE",       value: monthlyStats.leaves,   sub: `${totalTrackedDays > 0 ? Math.round((monthlyStats.leaves / totalTrackedDays) * 100) : 0}%`,   icon: CalendarOff, iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",         subColor: "text-blue-600 dark:text-blue-400" },
            { label: "ABSENT",      value: monthlyStats.absent,   sub: `${totalTrackedDays > 0 ? Math.round((monthlyStats.absent / totalTrackedDays) * 100) : 0}%`,   icon: UserX,       iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",         subColor: "text-rose-600 dark:text-rose-400" },
            { label: "HALF DAY",    value: monthlyStats.halfDays, sub: `${totalTrackedDays > 0 ? Math.round((monthlyStats.halfDays / totalTrackedDays) * 100) : 0}%`, icon: UserMinus,   iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",     subColor: "text-amber-600 dark:text-amber-400" },
            { label: "OFF/HOLIDAY", value: monthlyStats.weeklyOff,sub: "Total Days",                                                                                    icon: CalendarDays,iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", subColor: "text-purple-600 dark:text-purple-400" },
          ].map(({ label, value, sub, icon: Icon, iconBg, subColor }) => (
            <div key={label} className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}><Icon size={15} strokeWidth={2} /></div>
              <div className="min-w-0">
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{label}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">{value}</span>
                  <span className={`text-[10px] font-extrabold leading-none ${subColor}`}>{sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Left: Calendar */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
              <div className="bg-[#9E3616] dark:bg-[#8B2D12] px-4 py-2 flex items-center justify-between text-white">
                <button onClick={handlePrevMonth} className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs" title="Previous Month"><ChevronLeft size={14} strokeWidth={2.5} /></button>
                <span className="text-sm sm:text-base font-extrabold text-white tracking-wide capitalize">
                  {new Date(calendarYear, calendarMonth - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
                <button onClick={handleNextMonth} className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs" title="Next Month"><ChevronRight size={14} strokeWidth={2.5} /></button>
              </div>

              {isFetchingMonthly ? (
                <div className="py-14 text-center text-xs text-slate-400 font-semibold animate-pulse">Refreshing attendance grid...</div>
              ) : (
                <div className="p-2.5 space-y-1.5">
                  <div className="grid grid-cols-7 gap-1.5">
                    {["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d, i) => (
                      <div key={d} className={`text-center text-[9.5px] font-black uppercase tracking-wider py-1 rounded-xl border ${i === 0 || i === 6 ? "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/30" : "text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800"}`}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: new Date(calendarYear, calendarMonth - 1, 1).getDay() }).map((_, i) => (
                      <div key={`blank-${i}`} className="aspect-[16/11] min-h-[46px] rounded-xl border border-dashed border-slate-200/50 dark:border-slate-800/50 bg-transparent" />
                    ))}
                    {monthlyGrid.map((dayItem) => {
                      const isSelected = (selectedModalDate || date) === dayItem.date;
                      const style = getCalendarDayStyle(dayItem.status);
                      return (
                        <div key={dayItem.day}
                          title={`${dayItem.date}: ${dayItem.status ? dayItem.status.replace("_", " ") : "no record"}`}
                          onClick={() => setSelectedModalDate(dayItem.date)}
                          className={`relative rounded-xl sm:rounded-2xl flex flex-col justify-between p-1.5 sm:p-2 aspect-[16/11] min-h-[46px] sm:min-h-[50px] transition-all cursor-pointer ${isSelected ? `border-2 border-[#9E3616] dark:border-amber-400 ring-2 ring-[#9E3616]/20 shadow-xs scale-[1.02] z-10 ${style.bg}` : `${style.border} ${style.bg} hover:scale-[1.02] hover:shadow-2xs`}`}
                        >
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
                    {[{ label: "PRESENT", color: "bg-[#22C55E]" }, { label: "HALF DAY", color: "bg-[#F59E0B]" }, { label: "LEAVE", color: "bg-[#3B82F6]" }, { label: "ABSENT", color: "bg-[#F43F5E]" }, { label: "OFF / HOLIDAY", color: "bg-slate-300 dark:bg-slate-600" }].map(item => (
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

          {/* Right: Activity + Manual Correction */}
          <div className="lg:col-span-5 space-y-3">
            {/* Activity log */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-500" />
                  Activity — {new Date((selectedModalDate || date).replace(/-/g, "/")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
                </h4>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                  activeCalculatedStatus === "present" || activeCalculatedStatus === "late" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : activeCalculatedStatus === "half_day" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  : activeCalculatedStatus.includes("leave") ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                  : activeCalculatedStatus === "weekly_off" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                }`}>{activeCalculatedStatus.replace("_", " ")}</span>
              </div>

              {activeRecord ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Punch In</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{formatTime(activeRecord.punchInTime)}</p>
                      {activeRecord.punchInLocation?.latitude && (
                        <p className="mt-1 text-[9.5px] font-medium text-slate-500 truncate flex items-center gap-1">
                          <MapPin size={10} className="text-amber-500 shrink-0" />{activeRecord.punchInLocation.address || "Office Area"}
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Punch Out</p>
                      {activeRecord.punchOutTime
                        ? <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatTime(activeRecord.punchOutTime)}</p>
                        : <span className="text-[9.5px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1"><span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Active</span>
                      }
                      {activeRecord.punchOutLocation?.latitude && (
                        <p className="mt-1 text-[9.5px] font-medium text-slate-500 truncate flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-500 shrink-0" />{activeRecord.punchOutLocation.address || "Validated"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1 font-bold"><ShieldCheck size={12} className="text-amber-600 dark:text-amber-400" />GPS Validation</span>
                    <span className="font-extrabold text-[9.5px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {activeRecord.gpsValidated ? "✓ Validated" : "Unverified"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/40">
                  <MapPinOff className="mx-auto text-slate-300 dark:text-slate-600 mb-1" size={20} />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">No punch activity recorded</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Calculated status: <span className="font-bold text-rose-500 capitalize">{activeCalculatedStatus.replace("_", " ")}</span></p>
                </div>
              )}
            </div>

            {/* Manual Correction Form */}
            <form onSubmit={handleSaveManualUpdate} className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center border-b border-slate-100 dark:border-slate-800/80 pb-2 gap-1.5">
                <Settings2 size={13} className="text-[#004D40] dark:text-[#00695C]" />Manual Correction
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black uppercase text-slate-400">Punch In</label>
                  <div className="relative">
                    <input type="time" value={manualInTime} onChange={e => setManualInTime(e.target.value)}
                      className="w-full px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all pr-6" />
                    <Clock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black uppercase text-slate-400">Punch Out</label>
                  <div className="relative">
                    <input type="time" value={manualOutTime} onChange={e => setManualOutTime(e.target.value)}
                      className="w-full px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all pr-6" />
                    <Clock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Status</label>
                <select value={manualStatus} onChange={e => setManualStatus(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all cursor-pointer">
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half_day">Half Day</option>
                  <option value="paid_leave">Paid Leave</option>
                  <option value="unpaid_leave">Unpaid Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Reason / Note</label>
                <textarea value={manualReasonText} onChange={e => setManualReasonText(e.target.value)}
                  placeholder="Reason for manual adjustment..." rows={2}
                  className="w-full px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all resize-none" />
              </div>
              <button type="submit" disabled={isSavingManual}
                className="w-full bg-[#004D40] hover:bg-[#00382E] dark:bg-[#00695C] dark:hover:bg-[#004D40] text-white py-2 rounded-lg font-bold transition-all flex items-center justify-center disabled:opacity-50 shadow-xs cursor-pointer text-xs">
                {isSavingManual ? <RefreshCw size={13} className="animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN OVERVIEW TABLE (exact same as admin)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fadeIn space-y-4 max-w-[1440px] mx-auto pb-24 font-sans text-slate-900 dark:text-slate-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-bold flex items-center gap-2 ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
          {toast.type === "error" ? <X size={14}/> : <Check size={14}/>} {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Attendance Overview</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Team attendance logs, GPS fencing, and monthly reports</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative z-30 w-full sm:w-auto">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="flex-1 sm:flex-initial px-3 h-8 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer" />
          <button onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 h-8 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer">
            <Download size={13} className="text-slate-400" /> Export CSV
          </button>
          <button onClick={() => refetchAttendance()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/25 transition-all shrink-0 cursor-pointer">
            <RefreshCw size={13} strokeWidth={2.5} className={isAttFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <KPICard label="Present"  value={stats.present}               trend="12.4%" isUp period="last week"  strokeColor="#10B981" Icon={CheckCircle}     iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Absent"   value={stats.absent}                trend="2.1%"  isUp={false} period="yesterday"   strokeColor="#F43F5E" Icon={XCircle}        iconBg="bg-rose-500/10"    iconColor="#E11D48" />
        <KPICard label="Late"     value={stats.late}                  trend="5.2%"  isUp period="last week"  strokeColor="#EAB308" Icon={Clock}           iconBg="bg-amber-500/10"   iconColor="#D97706" />
        <KPICard label="Half Day" value={stats.halfDay}               trend="1.1%"  isUp period="last week"  strokeColor="#8B5CF6" Icon={Coffee}          iconBg="bg-purple-500/10"  iconColor="#7C3AED" />
        <KPICard label="On Leave" value={stats.leaves}                trend="4.0%"  isUp period="last month" strokeColor="#3B82F6" Icon={Plane}           iconBg="bg-blue-500/10"    iconColor="#2563EB" />
        <KPICard label="Pending"  value={stats.pendingRegularizations}trend="0.0%"  isUp period="today"      strokeColor="#64748B" Icon={FileSpreadsheet}  iconBg="bg-slate-500/10"   iconColor="#475569" />
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] w-full md:w-auto group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
            <input type="text" placeholder="Search by team member name or employee code..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-white dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 focus:border-amber-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs" />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <CustomSelect value={statusFilter} onChange={setStatusFilter}
              options={[
                { value: "present", label: "Present" }, { value: "late", label: "Late Arrival" },
                { value: "half_day", label: "Half Day" }, { value: "absent", label: "Absent" },
                { value: "paid_leave", label: "Leave" }, { value: "weekly_off", label: "Weekly Off" },
              ]}
              defaultLabel="All Statuses" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isAttLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <p className="text-xs font-bold">Fetching attendance metrics...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                <CalendarCheck size={26} strokeWidth={2} />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 dark:text-white">No records found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try altering the filter query or selected date</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-4 sm:px-6 py-3 font-bold">Team Member</th>
                  <th className="px-4 sm:px-6 py-3 font-bold">Department</th>
                  <th className="px-4 sm:px-6 py-3 font-bold">Punch In / Out</th>
                  <th className="px-4 sm:px-6 py-3 font-bold text-center">Hours</th>
                  <th className="px-4 sm:px-6 py-3 font-bold text-center">GPS Validation</th>
                  <th className="px-4 sm:px-6 py-3 font-bold">Status</th>
                  <th className="px-4 sm:px-6 py-3 font-bold">Source</th>
                  <th className="px-4 sm:px-6 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredData.map(rec => {
                  const emp = rec.employeeId;
                  const empName = emp?.fullName || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
                  const empCode = emp?.employeeCode || "—";
                  const deptName = emp?.departmentId?.name || "—";
                  const desgName = emp?.designationId?.name || "—";
                  const statusInfo = STATUS_CFG[rec.status] || STATUS_CFG.absent;
                  const geoBadge = rec.gpsValidated
                    ? <span className="inline-flex items-center text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300"><CheckCircle size={10} className="mr-1 text-emerald-500" /> Validated</span>
                    : <span className="text-[10px] text-slate-400 font-medium">—</span>;

                  return (
                    <tr key={rec._id}
                      onClick={() => { setSelectedEmployee({ ...emp, fullName: empName }); setSelectedModalDate(date); }}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/80 ${selectedEmployee?._id === emp?._id ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center space-x-3">
                          <MiniAvatar name={empName} photo={emp?.photo} size="w-8 h-8" textSize="text-[11px]" />
                          <div className="flex flex-col justify-center">
                            <p className="font-extrabold text-slate-900 dark:text-white text-[13px] leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{empName}</p>
                            <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-0.5">{empCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-xs leading-tight">{deptName}</p>
                        <p className="text-[10.5px] text-slate-400 font-medium">{desgName}</p>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.punchInTime ? formatTime(rec.punchInTime) : <span className="text-slate-400">—</span>}
                          <span className="text-slate-400">→</span>
                          {rec.punchOutTime ? formatTime(rec.punchOutTime) : (rec.punchInTime ? <span className="text-[9.5px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200">In Progress</span> : <span className="text-slate-400">—</span>)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                        {rec.totalHours ? `${Math.floor(rec.totalHours)}h ${Math.round((rec.totalHours - Math.floor(rec.totalHours)) * 60)}m` : "—"}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center">{geoBadge}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />{statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-slate-500 dark:text-slate-400 capitalize text-xs">{rec.source}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedEmployee({ ...emp, fullName: empName }); setSelectedModalDate(date); }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A2632] dark:hover:bg-[#223344] border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer">
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-900/40 px-4 sm:px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Showing <span className="font-bold text-slate-900 dark:text-white">{filteredData.length}</span> active team records</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">Live Stream Active</span>
          </div>
        </div>
      </div>

      {/* Pending Regularization Requests */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="bg-slate-50/60 dark:bg-slate-900/40 px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={18} strokeWidth={2.3} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Pending Regularization Requests</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${regRequests.length > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}>
                  {regRequests.length > 0 ? (<><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{regRequests.length} Action Required</>) : (<><Check size={12} strokeWidth={3} />0 Pending</>)}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Review employee punch corrections and attendance regularizations</p>
            </div>
          </div>
          <button onClick={() => refetchRegularizations()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer">
            <RefreshCw size={13} className="text-slate-400" /><span>Refresh Queue</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {regRequests.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 size={22} className="text-emerald-500" />
              </div>
              <p className="font-extrabold text-slate-900 dark:text-white">All caught up!</p>
              <p className="text-xs text-slate-400">No pending regularization requests from your team</p>
            </div>
          ) : (
            <div className="space-y-3">
              {regRequests.map(req => {
                const empName = req.employeeId?.fullName || `${req.employeeId?.firstName || ""} ${req.employeeId?.lastName || ""}`.trim();
                return (
                  <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <MiniAvatar name={empName} photo={req.employeeId?.photo} size="w-8 h-8" textSize="text-[11px]" />
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{empName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{req.date} — {req.manualReason || req.regularizationReason || "Regularization request"}</p>
                      </div>
                    </div>
                    {rejectModalId === req._id ? (
                      <div className="flex flex-col gap-2 sm:w-64">
                        <input type="text" placeholder="Rejection reason..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                          className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500" />
                        <div className="flex gap-2">
                          <button onClick={() => rejectMut.mutate({ id: req._id, reason: rejectionReason })}
                            className="flex-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer">Confirm Reject</button>
                          <button onClick={() => { setRejectModalId(null); setRejectionReason(""); }}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => approveMut.mutate(req._id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1">
                          <Check size={12} />Approve
                        </button>
                        <button onClick={() => setRejectModalId(req._id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1">
                          <X size={12} />Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
