import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyAttendanceApi,
  getEmployeesApi,
  getDepartmentsApi,
  getBranchesApi,
  getRegularizationRequestsApi,
  approveRegularizationApi,
  rejectRegularizationApi,
  getAttendanceSettingsApi,
  manualUpdateAttendanceApi,
  deleteAttendanceApi,
  getEmployeeAttendanceApi,
  getCompanySettingsApi,
} from "../../api/companyAdminApi";
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  Search,
  Filter,
  CalendarCheck,
  RefreshCw,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  PlusCircle,
  User,
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Map,
  Calendar,
  MapPinOff,
  Trash2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CalendarDays,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  ChevronDown,
  Coffee,
  Plane,
  MoreVertical,
  Layers,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  MessageSquareQuote,
  Zap,
  Check,
  X,
  FileText
} from "lucide-react";

import CustomDatePicker from "../../components/common/CustomDatePicker";

// ── Helpers ──────────────────────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

const formatTime = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "—";
  }
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "—";
  }
};

// ── Safe Image URL Helper ───────────────────────────────────────────────────
const getSafeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+api$/, "").replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

// ── Avatar Helper ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];
const MiniAvatar = ({ name, photo, size = "w-8 h-8", textSize = "text-[11px]" }) => {
  const photoUrl = getSafeUrl(photo);
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || "Avatar"}
        className={`${size} rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-2xs`}
      />
    );
  }
  return (
    <div className={`${size} rounded-xl ${AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

// ── Status Configurations ───────────────────────────────────────────────────
const STATUS_CFG = {
  present: { label: "Present", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/60", dot: "bg-emerald-500" },
  late: { label: "Late Arrival", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/60", dot: "bg-amber-500" },
  half_day: { label: "Half Day", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800/60", dot: "bg-purple-500" },
  absent: { label: "Absent", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/60", dot: "bg-rose-500" },
  paid_leave: { label: "On Leave (Paid)", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-500" },
  unpaid_leave: { label: "On Leave (LWP)", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800/60", dot: "bg-indigo-500" },
  holiday: { label: "Holiday", bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
  weekly_off: { label: "Weekly Off", bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-500" },
};

const exportFieldOptions = [
  { key: "employeeCode", label: "Employee Code" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "date", label: "Date" },
  { key: "punchIn", label: "Punch In" },
  { key: "punchOut", label: "Punch Out" },
  { key: "totalHours", label: "Total Hours" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
];

const getExportFieldValue = (fieldKey, item, rowType, selectedEmployee) => {
  const dailyName = `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`.trim();
  const monthlyName = `${selectedEmployee?.firstName || ""} ${selectedEmployee?.lastName || ""}`.trim();
  const inTime = rowType === "daily" ? formatTime(item.punchInTime) : formatTime(item.record?.punchInTime);
  const outTime = rowType === "daily" ? formatTime(item.punchOutTime) : formatTime(item.record?.punchOutTime);
  const totalHours = rowType === "daily" ? item.totalHours : item.record?.totalHours;
  const status = rowType === "daily" ? item.status : item.status || item.record?.status || "";
  const source = rowType === "daily" ? item.source : item.record?.source || "";

  switch (fieldKey) {
    case "employeeCode":
      return rowType === "daily" ? item.employeeId?.employeeCode || "—" : selectedEmployee?.employeeCode || "—";
    case "name":
      return rowType === "daily" ? dailyName : monthlyName;
    case "department":
      return rowType === "daily" ? item.employeeId?.departmentId?.name || "—" : selectedEmployee?.departmentId?.name || "—";
    case "date":
      return item.date || "—";
    case "punchIn":
      return inTime || "—";
    case "punchOut":
      return outTime || "—";
    case "totalHours":
      return totalHours ? `${totalHours.toFixed(2)} hrs` : "0";
    case "status":
      return status || "—";
    case "source":
      return source || "—";
    default:
      return "";
  }
};

// ── Top KPI Stat Card (Matching Task Board & Dashboard Design) ───────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 10 }, { v: 18 }, { v: 15 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 35 },
  ], []);

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
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] sm:text-[9.5px]">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 sm:h-9 w-10 sm:w-12 opacity-65 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={32}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-att-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-att-${label.replace(/\s+/g, '')})`}/>
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 h-8 bg-white dark:bg-[#111C24] border rounded-xl text-xs font-bold transition-all w-full min-w-0 sm:min-w-[120px] shadow-2xs ${isOpen ? "border-amber-500 ring-2 ring-amber-500/10 text-amber-600 dark:text-amber-400" : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 text-slate-400 shrink-0 ${isOpen ? "rotate-180 text-amber-500" : ""}`} />
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 min-w-[150px] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-fadeIn">
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === "" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {defaultLabel}
            </button>
            {options.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === opt.value ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CompanyAttendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settingsRes } = useQuery({ queryKey: ["companySettings"], queryFn: () => getCompanySettingsApi() });
  const companyWorkingDays = settingsRes?.data?.settings?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // ── States ─────────────────────────────────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedModalDate, setSelectedModalDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [toast, setToast] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Drawer Manual Edit Form State
  const [manualStatus, setManualStatus] = useState("present");
  const [manualInTime, setManualInTime] = useState("09:30");
  const [manualOutTime, setManualOutTime] = useState("18:30");
  const [manualReasonText, setManualReasonText] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    officeName: "",
    latitude: 0,
    longitude: 0,
    allowedRadiusMeters: 100,
    attendanceMode: "office_only",
    requireGps: true,
    requireSelfie: false,
    allowAdminBypassGeoFencing: true,
  });
  const [selectedExportFields, setSelectedExportFields] = useState(exportFieldOptions.map((item) => item.key));

  // ── Toast Trigger ──────────────────────────────────────────────────────────
  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── API Queries ────────────────────────────────────────────────────────────
  // Daily attendance logs
  const { data: attendanceRes, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ["companyAttendanceDaily", date],
    queryFn: () => getCompanyAttendanceApi({ date }),
  });

  // All employees list (to build comprehensive list of absent & present employees)
  const { data: employeesRes, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ["companyEmployeesList"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  // Departments
  const { data: deptsRes } = useQuery({
    queryKey: ["companyDepartmentsList"],
    queryFn: () => getDepartmentsApi(),
  });

  // Branches
  const { data: branchesRes } = useQuery({
    queryKey: ["companyBranchesList"],
    queryFn: () => getBranchesApi(),
  });

  // Pending regularizations
  const { data: regularizationRes, refetch: refetchRegularizations } = useQuery({
    queryKey: ["pendingRegularizations"],
    queryFn: () => getRegularizationRequestsApi(),
  });

  // Attendance settings
  const { data: attendanceSettingsRes, refetch: refetchSettings } = useQuery({
    queryKey: ["attendanceSettings"],
    queryFn: () => getAttendanceSettingsApi(),
  });

  // Monthly attendance grid for selected employee
  const { data: monthlyAttendanceRes, isFetching: isFetchingMonthly } = useQuery({
    queryKey: ["employeeMonthlyGrid", selectedEmployee?._id, calendarMonth, calendarYear],
    queryFn: () => getEmployeeAttendanceApi(selectedEmployee._id, { month: calendarMonth, year: calendarYear }),
    enabled: !!selectedEmployee?._id,
  });

  // ── Settings Sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (attendanceSettingsRes?.data?.settings) {
      setSettingsForm(attendanceSettingsRes.data.settings);
    }
  }, [attendanceSettingsRes]);

  // ── Compute Calendar Preview Grid ──────────────────────────────────────────
  const monthlyGrid = useMemo(() => {
    const totalDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const records = monthlyAttendanceRes?.data?.attendance || monthlyAttendanceRes?.data || [];
    
    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const currentDateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayRecord = records.find(r => r.date === currentDateStr);
      
      if (dayRecord) {
        days.push({ day, date: currentDateStr, status: dayRecord.status, record: dayRecord });
      } else {
        const dayOfWeek = new Date(calendarYear, calendarMonth - 1, day).getDay();
        const isOff = dayOfWeek === 0 || dayOfWeek === 6;
        days.push({ 
          day, 
          date: currentDateStr, 
          status: isOff ? "weekly_off" : (currentDateStr > new Date().toISOString().slice(0,10) ? "" : "absent"), 
          record: null 
        });
      }
    }
    return days;
  }, [monthlyAttendanceRes, calendarMonth, calendarYear]);

  // ── Sync Manual Edit Form ──────────────────────────────────────────────────
  const selectedDayData = useMemo(() => {
    if (!selectedEmployee) return null;
    const targetDate = selectedModalDate || date;
    
    const monthDay = monthlyGrid?.find(d => d.date === targetDate);
    if (monthDay) {
      return {
        record: monthDay.record,
        status: monthDay.status || "absent",
      };
    }

    if (targetDate === date && attendanceRes) {
      const records = attendanceRes?.data?.attendance || attendanceRes?.data || [];
      const rec = records.find((r) => r.employeeId?._id === selectedEmployee._id);
      return {
        record: rec || null,
        status: rec ? rec.status : "absent",
      };
    }

    return null;
  }, [selectedEmployee, attendanceRes, selectedModalDate, date, monthlyGrid]);

  const activeRecord = selectedDayData?.record || null;
  const activeCalculatedStatus = selectedDayData?.status || "absent";

  useEffect(() => {
    if (activeRecord) {
      setManualStatus(activeRecord.status || "present");
      setManualInTime(activeRecord.punchInTime ? new Date(activeRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "09:30");
      setManualOutTime(activeRecord.punchOutTime ? new Date(activeRecord.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "18:30");
      setManualReasonText(activeRecord.manualReason || "");
    } else {
      const fallbackStatus = activeCalculatedStatus === "" ? "absent" : activeCalculatedStatus;
      const allowedManualStatuses = ["present", "late", "half_day", "absent", "paid_leave", "unpaid_leave"];
      setManualStatus(allowedManualStatuses.includes(fallbackStatus) ? fallbackStatus : "absent");
      setManualInTime("09:30");
      setManualOutTime("18:30");
      setManualReasonText("");
    }
  }, [activeRecord, activeCalculatedStatus, selectedEmployee]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const approveRegularizationMutation = useMutation({
    mutationFn: approveRegularizationApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRegularizations"]);
      queryClient.invalidateQueries(["companyAttendanceDaily"]);
      triggerToast("Regularization request approved");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Approve failed", "error"),
  });

  const rejectRegularizationMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectRegularizationApi(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRegularizations"]);
      triggerToast("Regularization request rejected");
      setRejectModalId(null);
      setRejectionReason("");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Reject failed", "error"),
  });

  // ── Merge Daily Records & Active Employees ─────────────────────────────
  const fullAttendanceData = useMemo(() => {
    const dailyRecords = attendanceRes?.data?.attendance || attendanceRes?.data || [];
    const employees = employeesRes?.data?.employees || employeesRes?.data || [];
    const activeEmployees = employees.filter(emp => emp.status === "active");

    return activeEmployees.map(emp => {
      const punchRecord = dailyRecords.find(rec => {
        const recEmpId = typeof rec.employeeId === 'object' && rec.employeeId !== null ? rec.employeeId._id : rec.employeeId;
        const empId = typeof emp === 'object' && emp !== null ? emp._id : emp;
        return String(recEmpId) === String(empId);
      });
      
      if (punchRecord) {
        return {
          ...punchRecord,
          employeeId: emp,
          hasRecord: true,
        };
      }

      const currentDateObj = new Date(date);
      const dayName = currentDateObj.toLocaleDateString("en-US", { weekday: "long" });
      const isWeekend = !companyWorkingDays.includes(dayName);

      return {
        _id: `no-record-${emp._id}`,
        employeeId: emp,
        date,
        punchInTime: null,
        punchOutTime: null,
        totalHours: 0,
        status: isWeekend ? "weekly_off" : "absent",
        source: "system",
        hasRecord: false,
      };
    });
  }, [attendanceRes, employeesRes, date]);

  // ── Filters & Search ────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return fullAttendanceData.filter((rec) => {
      const name = `${rec.employeeId?.firstName || ""} ${rec.employeeId?.lastName || ""}`.toLowerCase();
      const code = (rec.employeeId?.employeeCode || "").toLowerCase();
      const s = search.toLowerCase();
      
      const matchSearch = name.includes(s) || code.includes(s);
      const matchDept = !deptFilter || rec.employeeId?.departmentId === deptFilter || rec.employeeId?.departmentId?._id === deptFilter;
      const matchBranch = !branchFilter || rec.employeeId?.branchId === branchFilter || rec.employeeId?.branchId?._id === branchFilter;
      const matchStatus = !statusFilter || rec.status === statusFilter;
      const matchShift = !shiftFilter || (shiftFilter === "general" && !rec.employeeId?.shift);

      return matchSearch && matchDept && matchBranch && matchStatus && matchShift;
    });
  }, [fullAttendanceData, search, deptFilter, branchFilter, statusFilter, shiftFilter]);

  // ── Stat calculations ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const data = fullAttendanceData;
    const total = data.length;
    const present = data.filter(r => r.status === "present" || r.status === "late").length;
    const absent = data.filter(r => r.status === "absent").length;
    const late = data.filter(r => r.status === "late").length;
    const halfDay = data.filter(r => r.status === "half_day").length;
    const leaves = data.filter(r => r.status === "paid_leave" || r.status === "unpaid_leave").length;
    const pendingRegularizations = regularizationRes?.data?.requests?.length || 0;

    return { total, present, absent, late, halfDay, leaves, pendingRegularizations };
  }, [fullAttendanceData, regularizationRes]);

  // ── Export CSV Handler ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      triggerToast("No data to export", "error");
      return;
    }
    if (selectedExportFields.length === 0) {
      triggerToast("Select at least one field for export", "error");
      return;
    }

    const headers = selectedExportFields.map((field) => exportFieldOptions.find((item) => item.key === field)?.label || field);
    const rows = filteredData.map((rec) => selectedExportFields.map((field) => getExportFieldValue(field, rec, "daily")));

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((row) => row.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Export completed successfully");
  };

  const handleExportTotalMonthlySummary = async () => {
    try {
      const d = new Date(date);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      
      triggerToast("Generating monthly report...", "success");
      
      const { default: api } = await import("../../api/api");
      const res = await api.get(`/payroll/company/attendance-summary?month=${m}&year=${y}`);
      const summaries = res.data.data || [];
      
      if (!summaries.length) {
        triggerToast("No attendance data for this month", "error");
        return;
      }
      
      const headers = [
        "Employee Code", "Employee Name", "Department", "Designation", 
        "Working Days", "Present (Full)", "Half Days", "Total Present (Full+Half)", "Absent", "Late", 
        "Paid Leave", "LOP Leave", "Weekly Off", "Holiday", 
        "Payable Days", "Total LOP Days"
      ];
      
      const rows = summaries.map(s => {
        const fullPresent = (s.presentDays || 0) + (s.lateDays || 0);
        const halfDays = s.halfDays || 0;
        const totalPresent = fullPresent + (halfDays * 0.5);

        return [
          s.employeeCode || "—",
          s.employeeName || "—",
          s.department || "—",
          s.designation || "—",
          s.workingDays || 0,
          fullPresent,
          halfDays,
          totalPresent,
          s.absentDays || 0,
          s.lateDays || 0,
          s.paidLeaveDays || 0,
          s.unpaidLeaveDays || 0,
          s.weeklyOffDays || 0,
          s.holidayDays || 0,
          s.payableDays || 0,
          s.lossOfPayDays || 0,
        ];
      });
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(row => row.map(val => `"${val}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Monthly_Attendance_Summary_${y}-${String(m).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("Monthly summary export completed");
    } catch (err) {
      triggerToast("Failed to generate monthly summary", "error");
    }
  };

  // ── Manual Update Save Handler ─────────────────────────────────────────────
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

      const res = await manualUpdateAttendanceApi(recordId, payload);
      if (res.data?.success) {
        queryClient.invalidateQueries(["companyAttendanceDaily"]);
        queryClient.invalidateQueries(["employeeMonthlyGrid"]);
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

  // ── Monthly Calendar Navigation ───────────────────────────────────────────
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Monthly stats helper
  const monthlyStats = useMemo(() => {
    const present = monthlyGrid.filter(d => d.status === "present" || d.status === "late").length;
    const absent = monthlyGrid.filter(d => d.status === "absent").length;
    const halfDays = monthlyGrid.filter(d => d.status === "half_day").length;
    const leaves = monthlyGrid.filter(d => d.status === "paid_leave" || d.status === "unpaid_leave").length;
    return { present, absent, halfDays, leaves };
  }, [monthlyGrid]);

  if (selectedEmployee) {
    const selectedEmpPhoto = selectedEmployee?.photo || selectedEmployee?.documents?.photo || selectedEmployee?.userId?.profileImage;
    const selectedEmpPhotoUrl = getSafeUrl(selectedEmpPhoto);
    const selectedEmpName = `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim();

    return (
      <div className="space-y-4 animate-fadeIn pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">
        {/* Premium Profile Header */}
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
              >
                <ArrowLeft size={16} />
              </button>

              {selectedEmpPhotoUrl ? (
                <img
                  src={selectedEmpPhotoUrl}
                  alt={selectedEmpName}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                />
              ) : (
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 shadow-2xs shrink-0`}>
                  {selectedEmpName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div>
                <div className="flex items-center space-x-2 text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">
                  <span>Employee Attendance Profile</span>
                </div>
                <h1 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight leading-tight">
                  {selectedEmpName}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-black tracking-widest">
                {selectedEmployee.employeeCode}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            
            {/* Daily timeline */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" />
                  Log Timeline — {formatDate(selectedModalDate || date)}
                </h4>
              </div>
              {activeRecord ? (
                <div className="space-y-4">
                  <div className="relative pl-8 border-l-2 border-amber-500 dark:border-amber-500 space-y-3 text-base ml-3">
                    {/* Check-in */}
                    <div className="relative">
                      <div className="absolute -left-[41px] top-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center ring-4 ring-white dark:ring-[#111C24]">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Punch In</p>
                            <p className="text-slate-900 dark:text-white font-extrabold text-base">Check-in Recorded</p>
                          </div>
                          <span className="text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 px-3 py-1 rounded-lg shadow-2xs">{formatTime(activeRecord.punchInTime)}</span>
                        </div>
                        {activeRecord.punchInLocation?.latitude && (
                          <div className="mt-3 inline-flex items-center px-2.5 py-1 bg-white dark:bg-[#111C24] rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <MapPin size={12} className="mr-1.5 text-amber-500" />
                            {activeRecord.punchInLocation.address || "Location Validated"}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Check-out */}
                    <div className="relative">
                      <div className={`absolute -left-[41px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#111C24] ${
                        activeRecord.punchOutTime ? "bg-emerald-500/20" : "bg-slate-100 dark:bg-slate-800"
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          activeRecord.punchOutTime ? "bg-emerald-500" : "bg-slate-400"
                        }`} />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Punch Out</p>
                            <p className="text-slate-900 dark:text-white font-extrabold text-base">Check-out Recorded</p>
                          </div>
                          {activeRecord.punchOutTime ? (
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 px-3 py-1 rounded-lg shadow-2xs">{formatTime(activeRecord.punchOutTime)}</span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-2 py-1 rounded-lg flex items-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" /> Active Session
                            </span>
                          )}
                        </div>
                        {activeRecord.punchOutLocation?.latitude && (
                          <div className="mt-3 inline-flex items-center px-2.5 py-1 bg-white dark:bg-[#111C24] rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <MapPin size={12} className="mr-1.5 text-emerald-500" />
                            {activeRecord.punchOutLocation.address || "Location Validated"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                  <MapPinOff className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={28} />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No punch activity recorded today</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    System status: <span className="font-bold capitalize">{activeCalculatedStatus.replace("_", " ")}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Monthly Calendar Preview */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} className="text-amber-500" />
                  Monthly Attendance
                </h4>
                
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 min-w-[90px] text-center capitalize">
                    {new Date(calendarYear, calendarMonth - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                  <button 
                    onClick={handleNextMonth}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {isFetchingMonthly ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
                  Refreshing grid stats...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">{d}</div>
                    ))}
                    
                    {Array.from({ length: new Date(calendarYear, calendarMonth - 1, 1).getDay() }).map((_, i) => (
                      <div key={`blank-${i}`} className="w-full aspect-square" />
                    ))}

                    {monthlyGrid.map((dayItem) => {
                      let statusColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                      if (dayItem.status === "present" || dayItem.status === "late") statusColor = "bg-emerald-500 text-white font-black";
                      else if (dayItem.status === "absent") statusColor = "bg-rose-500 text-white font-black";
                      else if (dayItem.status === "half_day") statusColor = "bg-amber-500 text-slate-950 font-black";
                      else if (dayItem.status === "paid_leave" || dayItem.status === "unpaid_leave") statusColor = "bg-indigo-500 text-white font-black";
                      else if (dayItem.status === "weekly_off") statusColor = "bg-slate-100 dark:bg-slate-800/40 text-slate-400 opacity-60";

                      return (
                        <div 
                          key={dayItem.day} 
                          title={`${dayItem.date}: ${dayItem.status || "no log"}`}
                          onClick={() => setSelectedModalDate(dayItem.date)}
                          className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-xs border border-transparent transition-all cursor-pointer shadow-2xs ${statusColor} ${selectedModalDate === dayItem.date ? 'ring-2 ring-amber-400 scale-105 z-10' : 'hover:scale-105 z-0'}`}
                        >
                          {dayItem.day}
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly grid stats */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <div className="space-y-0.5">
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{monthlyStats.present}</p>
                      <p className="text-[9.5px] font-black text-slate-400 uppercase">Present</p>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800/80">
                      <p className="text-xl font-black text-rose-500 dark:text-rose-400">{monthlyStats.absent}</p>
                      <p className="text-[9.5px] font-black text-slate-400 uppercase">Absent</p>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800/80">
                      <p className="text-xl font-black text-amber-500">{monthlyStats.halfDays}</p>
                      <p className="text-[9.5px] font-black text-slate-400 uppercase">Half Day</p>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800/80">
                      <p className="text-xl font-black text-indigo-500">{monthlyStats.leaves}</p>
                      <p className="text-[9.5px] font-black text-slate-400 uppercase">Leave</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* GPS validation details */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-2xs">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Map size={14} className="text-amber-500" />
                Live Radar Validation
              </h4>
              
              <div className="h-36 flex items-center justify-center relative z-10">
                <div className="absolute w-28 h-28 rounded-full border border-amber-500/20 animate-ping opacity-60 pointer-events-none" />
                <div className="absolute w-20 h-20 rounded-full border border-amber-500/30 animate-pulse pointer-events-none" />
                <div className="absolute w-10 h-10 rounded-full bg-amber-500/20 backdrop-blur-sm pointer-events-none" />
                
                <div className="relative text-center flex flex-col items-center">
                  <MapPin className="text-amber-500 animate-bounce mb-2" size={22} />
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg shadow-2xs">
                    <p className="text-[9.5px] text-slate-400 uppercase tracking-widest font-black">Fence Active</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-black mt-0.5">{settingsForm.allowedRadiusMeters}m Radius</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Manual Override Form */}
            <form onSubmit={handleSaveManualUpdate} className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center border-b border-slate-100 dark:border-slate-800/80 pb-2.5 gap-2">
                <Settings2 size={14} className="text-amber-500" />
                Manual Override
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Punch In</label>
                  <input
                    type="time"
                    value={manualInTime}
                    onChange={(e) => setManualInTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Punch Out</label>
                  <input
                    type="time"
                    value={manualOutTime}
                    onChange={(e) => setManualOutTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Correction Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="late">Late Arrival</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Reason / Note</label>
                <textarea
                  value={manualReasonText}
                  onChange={(e) => setManualReasonText(e.target.value)}
                  placeholder="e.g. Forgot to punch in..."
                  className="w-full px-3 py-2 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 transition-all min-h-[70px]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingManual}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white py-2.5 rounded-xl font-extrabold transition-all flex items-center justify-center disabled:opacity-50 shadow-xs cursor-pointer text-xs"
              >
                {isSavingManual ? <RefreshCw size={16} className="animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4 max-w-[1440px] mx-auto pb-24 font-sans text-slate-900 dark:text-slate-100">
      {/* ── Seamless Page Header (Matching Dashboard layout) ──────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Attendance Overview
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Daily attendance logs, GPS fencing, and monthly reports</p>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 relative z-30 w-full sm:w-auto">
          <CustomDatePicker value={date} onChange={setDate} />

          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Download size={13} className="text-slate-400" /> Export CSV
          </button>

          {/* Clean Executive Button with Crisp White Text */}
          <button 
            onClick={handleExportTotalMonthlySummary}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 h-8 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all shrink-0 cursor-pointer"
          >
            <FileSpreadsheet size={13} strokeWidth={2.5} /> Monthly Report
          </button>
        </div>
      </div>

      {/* ── Top Stat KPI Cards (Matching Task Board KPI Card Style with Recharts Sparklines) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <KPICard label="Present" value={stats.present} trend="12.4%" isUp period="last week" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Absent" value={stats.absent} trend="2.1%" isUp={false} period="yesterday" strokeColor="#F43F5E" Icon={XCircle} iconBg="bg-rose-500/10" iconColor="#E11D48" />
        <KPICard label="Late" value={stats.late} trend="5.2%" isUp period="last week" strokeColor="#EAB308" Icon={Clock} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="Half Day" value={stats.halfDay} trend="1.1%" isUp period="last week" strokeColor="#8B5CF6" Icon={Coffee} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="On Leave" value={stats.leaves} trend="4.0%" isUp period="last month" strokeColor="#3B82F6" Icon={Plane} iconBg="bg-blue-500/10" iconColor="#2563EB" />
        <KPICard label="Pending" value={stats.pendingRegularizations} trend="0.0%" isUp period="today" strokeColor="#64748B" Icon={FileSpreadsheet} iconBg="bg-slate-500/10" iconColor="#475569" />
      </div>

      {/* ── 1. Attendance Daily Logs (Full Width) ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        {/* Filters Row Toolbar */}
        <div className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] w-full md:w-auto group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by team member name or employee code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-9 bg-white dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 focus:border-amber-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <CustomSelect
              value={deptFilter}
              onChange={setDeptFilter}
              options={deptsRes?.data?.departments?.map(d => ({ value: d._id, label: d.name })) || []}
              defaultLabel="All Departments"
            />

            <CustomSelect
              value={branchFilter}
              onChange={setBranchFilter}
              options={branchesRes?.data?.branches?.map(b => ({ value: b._id, label: b.name })) || []}
              defaultLabel="All Branches"
            />

            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                {value: "present", label: "Present"},
                {value: "late", label: "Late Arrival"},
                {value: "half_day", label: "Half Day"},
                {value: "absent", label: "Absent"},
                {value: "paid_leave", label: "Leave"},
                {value: "weekly_off", label: "Weekly Off"},
                {value: "holiday", label: "Holiday"}
              ]}
              defaultLabel="All Statuses"
            />

            <CustomSelect
              value={shiftFilter}
              onChange={setShiftFilter}
              options={[{value: "general", label: "General Shift"}]}
              defaultLabel="All Shifts"
            />
          </div>
        </div>

        {/* List Table */}
        <div className="overflow-x-auto">
          {isAttendanceLoading || isEmployeesLoading ? (
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
                {filteredData.map((rec) => {
                  const empName = `${rec.employeeId?.firstName || ""} ${rec.employeeId?.lastName || ""}`;
                  const empCode = rec.employeeId?.employeeCode || "—";
                  const deptName = rec.employeeId?.departmentId?.name || "—";
                  const desgName = rec.employeeId?.designationId?.name || "—";
                  const statusInfo = STATUS_CFG[rec.status] || STATUS_CFG.absent;

                  let geoBadge = <span className="text-[10px] text-slate-400 font-medium">—</span>;
                  if (rec.gpsValidated) {
                    geoBadge = (
                      <span className="inline-flex items-center text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300">
                        <CheckCircle size={10} className="mr-1 text-emerald-500" /> Validated
                      </span>
                    );
                  } else if (rec.punchInLocation?.latitude && settingsForm.latitude) {
                    const dist = calculateDistance(
                      rec.punchInLocation.latitude,
                      rec.punchInLocation.longitude,
                      settingsForm.latitude,
                      settingsForm.longitude
                    );
                    if (dist !== null) {
                      const isInside = dist <= settingsForm.allowedRadiusMeters;
                      geoBadge = (
                        <span className={`inline-flex items-center text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          isInside ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300"
                        }`}>
                          <MapPin size={10} className={`mr-1 ${isInside ? "text-amber-500" : "text-rose-500"}`} />
                          {isInside ? "Inside Office" : `Out (${Math.round(dist)}m)`}
                        </span>
                      );
                    }
                  }

                  return (
                    <tr 
                      key={rec._id} 
                      onClick={() => {
                        setSelectedEmployee(rec.employeeId);
                        setSelectedModalDate(date);
                      }}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/80 ${
                        selectedEmployee?._id === rec.employeeId?._id ? "bg-slate-50 dark:bg-slate-800/50" : ""
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center space-x-3">
                          <MiniAvatar
                            name={empName}
                            photo={rec.employeeId?.photo || rec.employeeId?.documents?.photo || rec.employeeId?.userId?.profileImage}
                            size="w-8 h-8"
                            textSize="text-[11px]"
                          />
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
                      <td className="px-4 sm:px-6 py-3.5 text-center">
                        {geoBadge}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-slate-500 dark:text-slate-400 capitalize text-xs">
                        {rec.source}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(rec.employeeId);
                            setSelectedModalDate(date);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A2632] dark:hover:bg-[#223344] border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
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

      {/* ── 2. Premium Pending Requests (Regularization Queue) Below Table ────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="bg-slate-50/60 dark:bg-slate-900/40 px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck size={18} strokeWidth={2.3} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Pending Regularization Requests
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${
                  (regularizationRes?.data?.requests?.length || 0) > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }`}>
                  {(regularizationRes?.data?.requests?.length || 0) > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {regularizationRes?.data?.requests?.length} Action Required
                    </>
                  ) : (
                    <>
                      <Check size={12} strokeWidth={3} />
                      0 Pending
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Review employee punch corrections, missed punches, and attendance regularizations awaiting admin approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchRegularizations()}
              title="Refresh queue"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw size={13} className="text-slate-400" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Requests Content Body */}
        <div className="p-4 sm:p-6">
          {regularizationRes?.data?.requests?.length === 0 || !regularizationRes?.data?.requests ? (
            /* Premium Empty State */
            <div className="py-12 sm:py-16 text-center max-w-lg mx-auto space-y-3.5">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                  <CheckCircle2 size={32} strokeWidth={2.2} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-xs">
                  <Sparkles size={12} className="text-amber-500" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  All Attendance Caught Up!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 max-w-md mx-auto">
                  There are no pending attendance regularization requests awaiting administrator review. Any new punch adjustment requests submitted by employees will appear here instantly.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  <Zap size={12} className="text-amber-500" />
                  Real-time sync active
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  Zero backlog
                </span>
              </div>
            </div>
          ) : (
            /* Responsive Grid Cards Layout for Pending Requests */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {regularizationRes?.data?.requests?.map((req) => {
                const name = `${req.employeeId?.firstName || ""} ${req.employeeId?.lastName || ""}`;
                const code = req.employeeId?.employeeCode || "—";
                const dept = req.employeeId?.departmentId?.name || "General";
                const targetStatus = STATUS_CFG[req.status] || STATUS_CFG.present;

                return (
                  <div
                    key={req._id}
                    className="bg-slate-50/70 dark:bg-[#0D1321] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3.5 hover:border-amber-500/50 hover:shadow-md transition-all group"
                  >
                    {/* Header: Employee info + Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <MiniAvatar name={name} size="w-9 h-9" textSize="text-xs" />
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{code}</span>
                            <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">{dept}</span>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
                        <Calendar size={11} className="text-amber-500" />
                        {formatDate(req.date)}
                      </span>
                    </div>

                    {/* Punch Time Details */}
                    <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Clock size={11} className="text-amber-500" />
                          Requested Shift Punch
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${targetStatus.bg} ${targetStatus.text} ${targetStatus.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${targetStatus.dot}`} />
                          {targetStatus.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">In</span>
                          <span className="text-slate-800 dark:text-slate-200">{formatTime(req.punchInTime || req.requestedPunchIn)}</span>
                        </div>
                        <div className="text-slate-400 text-sm font-light">→</div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Out</span>
                          <span className="text-slate-800 dark:text-slate-200">{formatTime(req.punchOutTime || req.requestedPunchOut)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason Callout */}
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-xl p-2.5 border border-amber-500/15 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                        <MessageSquareQuote size={12} />
                        <span>Employee Note</span>
                      </div>
                      <p className="italic text-[11.5px] leading-relaxed line-clamp-2">
                        "{req.regularizationReason || req.reason || "No specific note provided"}"
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                      <button
                        onClick={() => setRejectModalId(req._id)}
                        className="flex-1 flex justify-center items-center gap-1 py-2 bg-white dark:bg-[#111C24] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <X size={13} strokeWidth={2.5} />
                        Reject
                      </button>
                      <button
                        onClick={() => approveRegularizationMutation.mutate(req._id)}
                        disabled={approveRegularizationMutation.isPending}
                        className="flex-1 flex justify-center items-center gap-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {approveRegularizationMutation.isPending ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── REJECTION MODAL FOR REGULARIZATION ───────────────────────────────── */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-slideUp">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" />
                Reject Regularization Request
              </h2>
              <button 
                onClick={() => setRejectModalId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Rejection Feedback / Justification</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain the reason for rejection to notify the employee..."
                  required
                  rows={3}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1321] rounded-xl p-3 text-xs text-slate-900 dark:text-white resize-none focus:outline-none focus:border-amber-500 placeholder-slate-400 shadow-2xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectModalId(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!rejectionReason.trim() || rejectRegularizationMutation.isPending}
                  onClick={() => rejectRegularizationMutation.mutate({ id: rejectModalId, reason: rejectionReason })}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {rejectRegularizationMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAttendance;