import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyLeavesApi,
  createLeaveAdminApi,
  approveLeaveApi,
  rejectLeaveApi,
  getLeaveBalanceApi,
  updateLeaveBalanceApi,
  getHolidaysApi,
  createHolidayApi,
  updateHolidayApi,
  deleteHolidayApi,
  getEmployeesApi,
  getDepartmentsApi,
  getBranchesApi,
} from "../../api/companyAdminApi";
import {
  Search,
  PlusCircle,
  CalendarCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  SlidersHorizontal,
  LayoutGrid,
  FileText,
  Bookmark,
  Trash2,
  Edit2,
  Info,
  Clock,
  Briefcase,
  Users,
  CalendarDays,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-lr-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-lr-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "—";
  }
};

const toDateStr = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return "";
  }
};

const AVATAR_BG = [
  "bg-theme-3-light text-theme-2",
  "bg-amber-100 text-amber-700",
  "bg-olive-100 text-olive-700",
  "bg-teal-100 text-teal-700",
  "bg-primary-100 text-primary-700",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

const STATUS_CFG = {
  pending: { label: "Pending", color: "bg-ca-primary-light dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20", dot: "bg-ca-primary" },
  approved: { label: "Approved", color: "bg-theme-3-light dark:bg-theme-3/10 text-theme-2 dark:text-theme-4 border-theme-3-light dark:border-theme-3/20", dot: "bg-theme-3" },
  rejected: { label: "Rejected", color: "bg-ca-primary-light dark:bg-red-500/10 text-red-700 dark:text-red-400 border-ca-border dark:border-red-500/20", dot: "bg-ca-primary" },
  cancelled: { label: "Cancelled", color: "bg-ca-bg text-ca-text-secondary border-ca-border", dot: "bg-slate-400" },
};

const getPriority = (leave) => {
  const days = leave.numberOfDays || 1;
  if (leave.leaveType === "Sick" || days >= 5) {
    return { label: "High", color: "bg-ca-primary-light dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20" };
  }
  if (days >= 2) {
    return { label: "Medium", color: "bg-ca-primary-light dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20" };
  }
  return { label: "Low", color: "bg-ca-bg text-ca-text-secondary border-ca-border" };
};

const LeaveRequests = () => {
  const queryClient = useQueryClient();

  // ── States ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [toast, setToast] = useState(null);

  // Modals & Panels
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [clarificationText, setClarificationText] = useState("");
  const [showClarificationId, setShowClarificationId] = useState(null);

  // Apply Leave Form
  const [applyForm, setApplyForm] = useState({
    employeeId: "",
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Holiday Modal Form / CRUD
  const [holidayForm, setHolidayForm] = useState({
    id: null,
    name: "",
    date: "",
    description: "",
  });
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);

  // Calendar Month
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Toast feedback
  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── API Queries ────────────────────────────────────────────────────────────
  // 1. All company leaves
  const { data: leavesRes, isLoading: isLeavesLoading } = useQuery({
    queryKey: ["companyLeavesList"],
    queryFn: () => getCompanyLeavesApi({}),
  });

  // 2. All employees (for Apply Leave dropdown)
  const { data: employeesRes } = useQuery({
    queryKey: ["employeesListSelect"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  // 3. Departments
  const { data: deptsRes } = useQuery({
    queryKey: ["departmentsList"],
    queryFn: getDepartmentsApi,
  });

  // 4. Branches
  const { data: branchesRes } = useQuery({
    queryKey: ["branchesList"],
    queryFn: getBranchesApi,
  });

  // 5. Holidays
  const { data: holidaysRes, refetch: refetchHolidays } = useQuery({
    queryKey: ["companyHolidays"],
    queryFn: getHolidaysApi,
  });

  // 6. Selected Employee's Leave Balance
  const { data: balanceRes } = useQuery({
    queryKey: ["selectedLeaveBalance", selectedLeave?.employeeId?._id],
    queryFn: () => getLeaveBalanceApi({ employeeId: selectedLeave?.employeeId?._id }),
    enabled: !!selectedLeave?.employeeId?._id,
  });

  // ── Computed Variables ─────────────────────────────────────────────────────
  const leaves = useMemo(() => {
    const list = leavesRes?.data?.leaves || leavesRes?.data;
    return Array.isArray(list) ? list : [];
  }, [leavesRes]);

  const holidays = useMemo(() => {
    const list = holidaysRes?.data?.holidays || holidaysRes?.data;
    return Array.isArray(list) ? list : [];
  }, [holidaysRes]);

  const employees = useMemo(() => {
    const list = employeesRes?.data?.employees || employeesRes?.data;
    return Array.isArray(list) ? list : [];
  }, [employeesRes]);

  // Filters & Search
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const name = `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.toLowerCase();
      const code = (l.employeeId?.employeeCode || "").toLowerCase();
      const dept = (l.employeeId?.departmentId?.name || "").toLowerCase();
      const type = (l.leaveType || "").toLowerCase();
      const searchStr = search.toLowerCase();

      const matchSearch =
        name.includes(searchStr) ||
        code.includes(searchStr) ||
        dept.includes(searchStr) ||
        type.includes(searchStr);

      const matchStatus = !statusFilter || l.status === statusFilter;
      const matchType = !typeFilter || l.leaveType === typeFilter;
      const matchDept = !deptFilter || l.employeeId?.departmentId?._id === deptFilter || l.employeeId?.departmentId === deptFilter;
      const matchBranch = !branchFilter || l.employeeId?.branchId?._id === branchFilter || l.employeeId?.branchId === branchFilter;

      let matchDates = true;
      if (startDateFilter) {
        matchDates = matchDates && new Date(l.startDate) >= new Date(startDateFilter);
      }
      if (endDateFilter) {
        matchDates = matchDates && new Date(l.endDate) <= new Date(endDateFilter);
      }

      return matchSearch && matchStatus && matchType && matchDept && matchBranch && matchDates;
    });
  }, [leaves, search, statusFilter, typeFilter, deptFilter, branchFilter, startDateFilter, endDateFilter]);

  // Sync selected leave details when leaves list is updated
  useEffect(() => {
    if (selectedLeave) {
      const updated = leaves.find((l) => l._id === selectedLeave._id);
      if (updated) setSelectedLeave(updated);
    }
  }, [leaves, selectedLeave]);

  // Stats Calculations
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === "pending").length;

    // Approved leaves active today
    const todayStr = toDateStr(new Date());
    const onLeave = leaves.filter((l) => {
      if (l.status !== "approved") return false;
      const start = toDateStr(l.startDate);
      const end = toDateStr(l.endDate);
      if (!start || !end) return false;
      return todayStr >= start && todayStr <= end;
    }).length;

    // Approved/Rejected Today
    const approvedToday = leaves.filter((l) => {
      if (l.status !== "approved") return false;
      const updatedToday = toDateStr(l.updatedAt);
      return updatedToday === todayStr;
    }).length;

    const rejectedToday = leaves.filter((l) => {
      if (l.status !== "rejected") return false;
      const updatedToday = toDateStr(l.updatedAt);
      return updatedToday === todayStr;
    }).length;

    const upcomingHolidays = holidays.filter((h) => new Date(h.date) >= new Date()).length;

    // Total allowed leaves across active employees: let's assume default allowance is 37 days (12 Casual + 10 Sick + 15 Annual)
    const activeEmpCount = employees.filter(e => e.status === "active").length || 1;
    const totalAllowedPool = activeEmpCount * 37;
    // Total used pool: Approved leave days (excluding LOP)
    const totalUsedPool = leaves
      .filter((l) => l.status === "approved" && l.leaveType !== "LOP")
      .reduce((sum, l) => sum + (l.numberOfDays || 0), 0);
    const utilization = Math.min(100, Math.round((totalUsedPool / totalAllowedPool) * 100)) || 0;

    return { pending, onLeave, approvedToday, rejectedToday, upcomingHolidays, utilization };
  }, [leaves, holidays, employees]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: approveLeaveApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyLeavesList"]);
      triggerToast("Leave request approved");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Approval failed", "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectLeaveApi(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["companyLeavesList"]);
      triggerToast("Leave request rejected");
      setRejectModalId(null);
      setRejectionReason("");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Rejection failed", "error"),
  });

  const createHolidayMutation = useMutation({
    mutationFn: createHolidayApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyHolidays"]);
      triggerToast("Holiday created successfully");
      setShowHolidayModal(false);
      setHolidayForm({ id: null, name: "", date: "", description: "" });
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to create holiday", "error"),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: deleteHolidayApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyHolidays"]);
      triggerToast("Holiday deleted");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to delete holiday", "error"),
  });

  // ── Form Handlers ──────────────────────────────────────────────────────────
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setApplySubmitting(true);
    try {
      const res = await createLeaveAdminApi(applyForm);
      if (res.data?.success) {
        queryClient.invalidateQueries(["companyLeavesList"]);
        triggerToast("Leave request successfully recorded & approved");
        setShowApplyModal(false);
        setApplyForm({ employeeId: "", leaveType: "Casual", startDate: "", endDate: "", reason: "" });
      }
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to create leave request", "error");
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleHolidaySubmit = (e) => {
    e.preventDefault();
    createHolidayMutation.mutate(holidayForm);
  };

  // ── Bulk Actions Handlers ──────────────────────────────────────────────────
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredLeaves.map((l) => l._id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rid) => rid !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve all ${selectedRows.length} selected requests?`)) return;
    let successCount = 0;
    for (const id of selectedRows) {
      try {
        await approveLeaveApi(id);
        successCount++;
      } catch (err) {
        console.error("Bulk approve error for", id, err);
      }
    }
    queryClient.invalidateQueries(["companyLeavesList"]);
    triggerToast(`Approved ${successCount} leaves successfully`);
    setSelectedRows([]);
  };

  const handleBulkReject = async () => {
    const reason = window.prompt("Enter rejection feedback for the selected requests:");
    if (reason === null) return;
    if (!reason.trim()) {
      triggerToast("Rejection reason is required", "error");
      return;
    }
    let successCount = 0;
    for (const id of selectedRows) {
      try {
        await rejectLeaveApi(id, reason);
        successCount++;
      } catch (err) {
        console.error("Bulk reject error for", id, err);
      }
    }
    queryClient.invalidateQueries(["companyLeavesList"]);
    triggerToast(`Rejected ${successCount} leaves successfully`);
    setSelectedRows([]);
  };

  // ── Export CSV Handler ─────────────────────────────────────────────────────
  const handleExportCSV = (rowsToExport = filteredLeaves) => {
    if (rowsToExport.length === 0) {
      triggerToast("No data to export", "error");
      return;
    }
    const headers = ["Employee Code", "Name", "Department", "Leave Type", "Start Date", "End Date", "Total Days", "Applied On", "Status", "Reason"];
    const csvRows = rowsToExport.map((l) => {
      const name = `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`;
      return [
        l.employeeId?.employeeCode || "—",
        name,
        l.employeeId?.departmentId?.name || "—",
        l.leaveType,
        toDateStr(l.startDate),
        toDateStr(l.endDate),
        l.numberOfDays,
        toDateStr(l.createdAt),
        l.status,
        l.reason || "—",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...csvRows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leave_Report_${toDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Export completed successfully");
  };

  // ── Calendar Helper Functions ──────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const calendarGrid = useMemo(() => {
    const totalDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const startOffset = new Date(calendarYear, calendarMonth - 1, 1).getDay();

    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(calendarYear, calendarMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Filter events
      const dayHolidays = holidays.filter((h) => toDateStr(h.date) === dateStr);
      const dayLeaves = leaves.filter((l) => {
        const start = toDateStr(l.startDate);
        const end = toDateStr(l.endDate);
        if (!start || !end) return false;
        return dateStr >= start && dateStr <= end;
      });

      days.push({
        day: d,
        dateStr,
        isWeekend,
        holidays: dayHolidays,
        leaves: dayLeaves,
      });
    }
    return { days, startOffset };
  }, [calendarMonth, calendarYear, leaves, holidays]);

  // ── Charts Analytics Calculations ──────────────────────────────────────────
  const chartsData = useMemo(() => {
    // 1. Leave Type Breakdown
    const typeCounts = { Casual: 0, Sick: 0, Annual: 0, LOP: 0 };
    leaves.forEach((l) => {
      if (typeCounts[l.leaveType] !== undefined) typeCounts[l.leaveType]++;
    });
    const typeBreakdown = Object.keys(typeCounts).map((key) => ({
      name: key,
      value: typeCounts[key] || 0,
    }));

    const COLORS = ["var(--color-theme-3)", "var(--color-theme-5)", "var(--color-theme-1)", "var(--color-theme-4)"];

    // 2. Department distribution
    const deptCounts = {};
    leaves.forEach((l) => {
      const dept = l.employeeId?.departmentId?.name || "Operations";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    if (Object.keys(deptCounts).length === 0) {
      // No data
    }
    const deptDistribution = Object.keys(deptCounts).map((dept) => ({
      name: dept,
      count: deptCounts[dept],
    })).sort((a, b) => b.count - a.count);

    // 3. Monthly trend
    const trendCounts = {};
    leaves.forEach((l) => {
      const month = new Date(l.startDate).toLocaleDateString("en-US", { month: "short" });
      trendCounts[month] = (trendCounts[month] || 0) + 1;
    });
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const m = date.toLocaleDateString("en-US", { month: "short" });
      trendData.push({
        month: m,
        leaves: trendCounts[m] || 0,
      });
    }

    return { typeBreakdown, COLORS, deptDistribution, trendData };
  }, [leaves]);

  return (
    <div className="space-y-3">
      {/* ── Toast Feedback Notification ────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border text-base transition-all duration-300 transform translate-y-0 ${toast.type === "error"
          ? "bg-ca-primary-light dark:bg-red-500/10 text-red-700 dark:text-red-400 border-ca-border dark:border-red-500/20"
          : "bg-theme-3-light dark:bg-theme-3/10 text-theme-2 dark:text-theme-4 border-theme-3-light dark:border-theme-3/20"
          }`}>
          <AlertCircle size={18} className="mr-2 flex-shrink-0" />
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Leave Requests & Attendance <CalendarCheck size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Review time-off applications, approve leave balances, and track workforce availability.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition-all"
          >
            <PlusCircle size={15} strokeWidth={2.5} />
            <span>Apply Leave</span>
          </button>
          <button
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Calendar size={13} className="text-amber-500" />
            <span>Holidays</span>
          </button>
          <button
            onClick={() => handleExportCSV()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Download size={13} className="text-slate-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── Stat KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard label="Pending Approvals" value={stats.pending} trend="Requires Action" isUp period="last week" strokeColor="#EAB308" Icon={Clock} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="Approved Today" value={stats.approvedToday} trend="Processed" isUp period="yesterday" strokeColor="#10B981" Icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Currently On Leave" value={stats.onLeave} trend="Out of Office" isUp period="today" strokeColor="#8B5CF6" Icon={Users} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Upcoming Holidays" value={stats.upcomingHolidays} trend="Scheduled" isUp period="this month" strokeColor="#06B6D4" Icon={CalendarDays} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
      </div>

      {/* ── Main content: Full-width table ────────── */}
      <div className="grid grid-cols-1 gap-3">

        {/* Table column: Always full-width */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-ca-surface border border-ca-border rounded-xl !p-0 space-y-0 flex flex-col min-h-[500px]">

            {/* Filter Bar */}
            <div className="pt-4 pb-6 px-4 border-b border-ca-border flex flex-col gap-4 bg-ca-bg/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-4 top-3 text-ca-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search employee, ID, department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-ca-surface border border-ca-border rounded-xl text-sm font-medium text-ca-text placeholder-ca-text-secondary focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ca-surface border border-ca-border rounded-xl text-sm font-bold text-ca-text focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 cursor-pointer appearance-none transition-all"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1em" }}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ca-surface border border-ca-border rounded-xl text-sm font-bold text-ca-text focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 cursor-pointer appearance-none transition-all"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1em" }}
                >
                  <option value="">All Leave Types</option>
                  <option value="Casual">Casual</option>
                  <option value="Sick">Sick</option>
                  <option value="Annual">Earned Leave</option>
                  <option value="LOP">LOP</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ca-surface border border-ca-border rounded-xl text-sm font-bold text-ca-text focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 cursor-pointer appearance-none transition-all"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1em" }}
                >
                  <option value="">All Departments</option>
                  {deptsRes?.data?.departments?.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filters Toggle */}
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ca-text-secondary px-1">
                <span>Applied Date Range:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="px-3 py-1.5 border border-ca-border rounded-lg bg-ca-surface text-ca-text focus:ring-2 focus:ring-[#E65100]/20"
                />
                <span className="text-ca-text-secondary">to</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="px-3 py-1.5 border border-ca-border rounded-lg bg-ca-surface text-ca-text focus:ring-2 focus:ring-[#E65100]/20"
                />
                {(startDateFilter || endDateFilter || statusFilter || typeFilter || deptFilter || search) && (
                  <button
                    onClick={() => {
                      setSearch(""); setStatusFilter(""); setTypeFilter(""); setDeptFilter("");
                      setStartDateFilter(""); setEndDateFilter(""); setBranchFilter("");
                    }}
                    className="text-orange-500 hover:text-orange-600 font-bold ml-2 transition-colors cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Bulk actions banner */}
              {selectedRows.length > 0 && (
                <div className="flex items-center justify-between bg-[#E65100]/10 border border-[#E65100]/20 rounded-xl px-4 py-3 text-sm font-bold text-ca-text animate-slideUp mt-4">
                  <span className="flex items-center"><Info size={14} className="text-[#E65100] mr-1.5" /> {selectedRows.length} requests selected</span>
                  <div className="flex gap-2">
                    <button onClick={handleBulkApprove} className="px-3 py-1.5 bg-[#E65100] text-white rounded-lg hover:bg-[#CC4800] transition-all shadow-sm">Approve Selected</button>
                    <button onClick={handleBulkReject} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm">Reject Selected</button>
                    <button onClick={() => handleExportCSV(leaves.filter(l => selectedRows.includes(l._id)))} className="px-3 py-1.5 bg-ca-surface border border-ca-border rounded-lg text-ca-text hover:bg-ca-bg transition-all shadow-sm">Export Selected</button>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              {isLeavesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <RefreshCw size={24} className="animate-spin text-slate-300" />
                  <p className="text-sm font-bold">Loading leaves list...</p>
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3">
                  <FileText size={40} className="mx-auto text-slate-200" />
                  <div>
                    <p className="text-sm font-bold">No requests found</p>
                    <p className="text-xs mt-0.5">Try altering the filter query or search keyword</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse relative">
                  <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-4 w-12 text-center rounded-tl-xl">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === filteredLeaves.length && filteredLeaves.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-slate-500 focus:ring-slate-200 cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-4">Team Member</th>
                      <th className="px-4 py-4">Department</th>
                      <th className="px-4 py-4">Leave Type</th>
                      <th className="px-4 py-4">Duration</th>
                      <th className="px-4 py-4 text-center">Days</th>
                      <th className="px-4 py-4 text-center">Priority</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredLeaves.map((l) => {
                      const empName = `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`;
                      const empCode = l.employeeId?.employeeCode || "—";
                      const deptName = l.employeeId?.departmentId?.name || "—";
                      const isRowSelected = selectedRows.includes(l._id);
                      const priority = getPriority(l);
                      const status = STATUS_CFG[l.status] || STATUS_CFG.pending;

                      return (
                        <tr
                          key={l._id}
                          onClick={() => setSelectedLeave(l)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedLeave?._id === l._id ? "bg-slate-50" : ""
                            } ${isRowSelected ? "bg-orange-50/50" : ""}`}
                        >
                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleSelectRow(l._id)}
                              className="rounded border-slate-300 text-slate-500 focus:ring-slate-200 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2">
                              <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${avatarClass(empName)}`}>
                                {empName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">{empName}</p>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{empCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-700 leading-tight text-[13px]">{deptName}</p>
                            <p className="text-[11px] text-slate-400 font-bold mt-0.5">Applied on {toDateStr(l.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-700 text-[13px]">
                            {l.leaveType}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[12px] font-bold text-slate-600 block leading-tight">{formatDate(l.startDate)}</span>
                            <span className="text-[11px] text-slate-400 font-bold block mt-0.5">to {formatDate(l.endDate)}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-700 text-[13px]">
                            {l.numberOfDays}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase border ${priority.color}`}>
                              {priority.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setSelectedLeave(l)}
                                className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm"
                              >
                                View
                              </button>
                              <button
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between items-center text-sm text-ca-text-secondary font-semibold px-1">
              <span>Showing {filteredLeaves.length} of {leaves.length} leave requests</span>
              <span>HR Leave Registry</span>
            </div>

          </div>
        </div>

      </div>

      {/* ── Left-side Slide-in Detail Drawer ──────────────────────────────────── */}
      {selectedLeave && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={() => setSelectedLeave(null)}
          />

          {/* Right drawer panel */}
          <div
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-ca-surface shadow-2xl flex flex-col"
            style={{ animation: "slideInFromRight 0.3s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ca-border bg-gradient-to-r from-theme-3 to-theme-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Leave Details</h3>
                <p className="text-sm text-white/70 mt-0.5">Quick review and balance verification</p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="p-2 rounded-xl text-white/70 hover:bg-ca-surface/20 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Employee Info Header */}
              {(() => {
                const name = `${selectedLeave.employeeId?.firstName || ""} ${selectedLeave.employeeId?.lastName || ""}`;
                const desg = selectedLeave.employeeId?.designationId?.name || "Team Member";
                const dept = selectedLeave.employeeId?.departmentId?.name || "Department";
                return (
                  <div className="flex items-center space-x-3 bg-ca-bg/50 p-3 rounded-xl border border-ca-border">
                    <div className={`w-12 h-12 rounded-xl font-black text-base flex items-center justify-center border border-white shadow-sm ${avatarClass(name)}`}>
                      {name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-ca-text leading-tight">{name}</h4>
                      <p className="text-sm text-ca-text-secondary font-semibold mt-0.5">{desg} · {dept}</p>
                      {selectedLeave.employeeId?.reportingManagerName && (
                        <p className="text-[12px] text-ca-text-secondary font-bold mt-1">Manager: {selectedLeave.employeeId.reportingManagerName}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Attendance and Leave Balance Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-ca-bg/30 border border-ca-border p-3 rounded-xl text-center">
                  <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-wide block">Attendance Rate</span>
                  <span className="text-xl font-black text-ca-text block mt-1">94.8%</span>
                </div>
                <div className="bg-ca-bg/30 border border-ca-border p-3 rounded-xl text-center">
                  <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-wide block">Leaves Allowed</span>
                  <span className="text-xl font-black text-primary block mt-1">37 / yr</span>
                </div>
              </div>

              {/* Employee Leave Balance Details */}
              <div className="bg-ca-bg/50 p-4 rounded-xl border border-ca-border space-y-2">
                <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-widest block mb-1.5">Remaining Quota Balance</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-ca-surface p-2 rounded-lg border border-ca-border">
                    <span className="text-[16px] font-extrabold text-ca-text block">{balanceRes?.data?.balance?.casual ?? 12}</span>
                    <span className="text-[11px] font-bold text-ca-text-secondary uppercase">Casual</span>
                  </div>
                  <div className="bg-ca-surface p-2 rounded-lg border border-ca-border">
                    <span className="text-[16px] font-extrabold text-ca-text block">{balanceRes?.data?.balance?.sick ?? 10}</span>
                    <span className="text-[11px] font-bold text-ca-text-secondary uppercase">Sick</span>
                  </div>
                  <div className="bg-ca-surface p-2 rounded-lg border border-ca-border">
                    <span className="text-[16px] font-extrabold text-ca-text block">{balanceRes?.data?.balance?.annual ?? 15}</span>
                    <span className="text-[11px] font-bold text-ca-text-secondary uppercase">Annual</span>
                  </div>
                </div>
              </div>

              {/* Leave Info */}
              <div className="space-y-3 bg-ca-bg/50 p-4 rounded-xl border border-ca-border text-sm">
                <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-widest block mb-1">Application Details</span>

                <div className="flex justify-between font-semibold border-b border-ca-border pb-2">
                  <span className="text-ca-text-secondary">Leave Category:</span>
                  <span className="text-ca-text font-extrabold">{selectedLeave.leaveType}</span>
                </div>
                <div className="flex justify-between font-semibold border-b border-ca-border pb-2">
                  <span className="text-ca-text-secondary">Duration:</span>
                  <span className="text-ca-text font-extrabold">{formatDate(selectedLeave.startDate)} – {formatDate(selectedLeave.endDate)}</span>
                </div>
                <div className="flex justify-between font-semibold border-b border-ca-border pb-2">
                  <span className="text-ca-text-secondary">Total Requested:</span>
                  <span className="text-ca-text font-extrabold">{selectedLeave.numberOfDays} days</span>
                </div>

                <div className="space-y-1 pb-1">
                  <span className="text-ca-text-secondary font-semibold block">Justification / Reason:</span>
                  <p className="bg-ca-surface border border-ca-border p-2.5 rounded-lg italic text-ca-text font-medium leading-relaxed">
                    &ldquo;{selectedLeave.reason || "No explanation provided"}&rdquo;
                  </p>
                </div>

                {/* Attachment Preview Placeholder */}
                <div className="border border-ca-border border-dashed rounded-xl p-3 bg-ca-surface flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary"><FileText size={13} /></div>
                    <div>
                      <p className="font-bold text-ca-text text-[12px] leading-tight">medical_certificate.pdf</p>
                      <p className="text-[11px] text-ca-text-secondary">1.2 MB</p>
                    </div>
                  </div>
                  <button className="text-[12px] font-bold text-primary hover:text-primary-700 cursor-pointer">Preview</button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-ca-text-secondary block font-semibold text-[12px]">Contact Info:</span>
                    <span className="font-bold text-ca-text">In city / Email</span>
                  </div>
                  <div>
                    <span className="text-ca-text-secondary block font-semibold text-[12px]">Emergency Num:</span>
                    <span className="font-bold text-ca-text">+91 98765 43210</span>
                  </div>
                </div>
              </div>

              {/* Visual Approval Timeline */}
              <div className="bg-ca-bg/50 p-4 rounded-xl border border-ca-border space-y-3">
                <span className="text-[12px] font-bold text-ca-text-secondary uppercase tracking-widest block mb-1">Approval Timeline</span>

                <div className="relative pl-5 border-l border-ca-border space-y-4 text-sm font-semibold text-ca-text-secondary">
                  <div className="relative">
                    <span className="absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full bg-theme-3 ring-4 ring-theme-3-light" />
                    <div>
                      <p className="text-ca-text font-bold">Leave Applied</p>
                      <p className="text-[12px] text-ca-text-secondary mt-0.5">Submitted on {toDateStr(selectedLeave.createdAt)}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <span className={`absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ${selectedLeave.status !== "pending" ? "bg-theme-3 ring-theme-3-light" : "bg-amber-400 ring-amber-50"}`} />
                    <div>
                      <p className="text-ca-text font-bold">HR Review</p>
                      <p className="text-[12px] text-ca-text-secondary mt-0.5">Checked balance & guidelines</p>
                    </div>
                  </div>

                  <div className="relative">
                    <span className={`absolute -left-[25px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ${selectedLeave.status === "approved" ? "bg-theme-3 ring-theme-3-light" : (selectedLeave.status === "rejected" ? "bg-ca-primary ring-red-50" : "bg-slate-300 ring-slate-100")}`} />
                    <div>
                      <p className="text-ca-text font-bold">Company Approval / Final Status</p>
                      <p className="text-[12px] text-ca-text-secondary mt-0.5 capitalize">Status: {selectedLeave.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clarification input */}
              {showClarificationId === selectedLeave._id && (
                <div className="p-3 border border-amber-200 bg-ca-primary-light rounded-xl space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-700 block">Clarification Request Message</span>
                  <textarea
                    value={clarificationText}
                    onChange={(e) => setClarificationText(e.target.value)}
                    placeholder="Ask the employee to upload missing certificates..."
                    rows={3}
                    className="w-full border border-amber-200 rounded-lg p-2 text-sm bg-ca-surface resize-none text-ca-text"
                  />
                  <div className="flex justify-end gap-1.5 text-[11px] font-bold">
                    <button onClick={() => setShowClarificationId(null)} className="px-2 py-1 text-ca-text-secondary hover:bg-amber-100 rounded">Cancel</button>
                    <button
                      onClick={() => { triggerToast("Clarification request sent to employee"); setShowClarificationId(null); }}
                      disabled={!clarificationText.trim()}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Sticky footer actions */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-ca-border bg-ca-surface">
              {selectedLeave.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowClarificationId(selectedLeave._id); setClarificationText(""); }}
                    className="flex-1 py-2.5 bg-ca-bg hover:bg-slate-200 text-ca-text rounded-xl text-sm font-bold transition-all"
                  >
                    Clarification
                  </button>
                  <button
                    onClick={() => setRejectModalId(selectedLeave._id)}
                    className="flex-1 py-2.5 border border-ca-border hover:bg-ca-primary-light text-ca-primary rounded-xl text-sm font-bold transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(selectedLeave._id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    Approve
                  </button>
                </div>
              ) : (
                <div className="bg-ca-bg rounded-xl py-2.5 px-3 text-center text-sm font-bold text-ca-text-secondary">
                  Processed — Status: <span className="capitalize text-primary">{selectedLeave.status}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Visual Team Leave Calendar & Policies Row ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

        {/* Left Span 2: Monthly Grid Calendar */}
        <div className="xl:col-span-2 bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-ca-border pb-3">
            <div>
              <h3 className="text-lg font-bold text-ca-text">Company Team Leave Calendar</h3>
              <p className="text-sm text-ca-text-secondary mt-0.5">Visualize employee leaves, weekends and holiday timelines</p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 border border-ca-border hover:bg-ca-bg text-ca-text-secondary rounded-lg transition-colors bg-ca-surface shadow-sm"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-extrabold text-ca-text min-w-[90px] text-center capitalize">
                {new Date(calendarYear, calendarMonth - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 border border-ca-border hover:bg-ca-bg text-ca-text-secondary rounded-lg transition-colors bg-ca-surface shadow-sm"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-[12px] font-extrabold text-ca-text-secondary uppercase py-1">{day}</div>
              ))}

              {/* Blanks */}
              {Array.from({ length: calendarGrid.startOffset }).map((_, i) => (
                <div key={`blank-${i}`} className="w-full aspect-[4/3] bg-ca-bg/20 border border-transparent rounded-xl" />
              ))}

              {/* Days grid */}
              {calendarGrid.days.map((item) => {
                const hasHoliday = item.holidays.length > 0;
                const activeLeaves = item.leaves;
                const isApprovedLeave = activeLeaves.some(l => l.status === "approved");
                const isPendingLeave = activeLeaves.some(l => l.status === "pending");

                let dayBg = "bg-ca-surface hover:bg-ca-bg border-ca-border";
                if (item.isWeekend) dayBg = "bg-ca-bg/50 text-ca-text-secondary border-ca-border";
                if (hasHoliday) dayBg = "bg-rose-50/30 border-rose-100 text-rose-700";

                return (
                  <div
                    key={item.day}
                    title={`${item.dateStr}${hasHoliday ? ` · Holiday: ${item.holidays[0].name}` : ""}${activeLeaves.length > 0 ? ` · ${activeLeaves.length} on leave` : ""}`}
                    className={`w-full aspect-[4/3] rounded-xl border p-2 flex flex-col justify-between transition-all group/cell ${dayBg}`}
                  >
                    <span className="text-sm font-bold leading-none">{item.day}</span>

                    {/* Visual dot summaries */}
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      {hasHoliday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ca-primary" title={`Holiday: ${item.holidays[0].name}`} />
                      )}
                      {isApprovedLeave && (
                        <span className="w-1.5 h-1.5 rounded-full bg-theme-3" title="Approved leave(s) active" />
                      )}
                      {isPendingLeave && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ca-primary" title="Pending leave(s) waiting review" />
                      )}
                      {activeLeaves.length > 0 && (
                        <span className="text-[10px] font-black text-ca-text-secondary ml-0.5 group-hover/cell:text-primary transition-colors">
                          {activeLeaves.length}L
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend indicators */}
            <div className="flex flex-wrap gap-4 text-[12px] font-extrabold text-ca-text-secondary border-t border-ca-border pt-3">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-theme-3 mr-1.5" /> Approved Leaves</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-ca-primary mr-1.5" /> Pending Leaves</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-ca-primary mr-1.5" /> Company Holidays</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 mr-1.5" /> Weekends</span>
            </div>
          </div>
        </div>

        {/* Right Span 1: Policies Card */}
        <div className="bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-ca-border pb-3">
            <h3 className="text-lg font-bold text-ca-text">Leave Policies Summary</h3>
            <p className="text-sm text-ca-text-secondary mt-0.5">Company standards and yearly allowance quotas</p>
          </div>

          <div className="space-y-4 text-sm font-semibold text-ca-text-secondary">
            {/* Casual Leave */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ca-text font-bold">Casual Leave (CL)</span>
                <span>12 Days Allowed</span>
              </div>
              <div className="w-full bg-ca-bg h-2 rounded-full overflow-hidden">
                <div className="bg-theme-3 h-full rounded-full" style={{ width: "30%" }} />
              </div>
              <p className="text-[12px] text-ca-text-secondary">Regular emergency allowance. Roll-over: None</p>
            </div>

            {/* Sick Leave */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ca-text font-bold">Sick Leave (SL)</span>
                <span>10 Days Allowed</span>
              </div>
              <div className="w-full bg-ca-bg h-2 rounded-full overflow-hidden">
                <div className="bg-theme-5 h-full rounded-full" style={{ width: "40%" }} />
              </div>
              <p className="text-[12px] text-ca-text-secondary">Medical reasons. Documentation required for &gt; 3 days</p>
            </div>

            {/* Earned/Annual Leave */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ca-text font-bold">Annual / Earned Leave (EL)</span>
                <span>15 Days Allowed</span>
              </div>
              <div className="w-full bg-ca-bg h-2 rounded-full overflow-hidden">
                <div className="bg-theme-1 h-full rounded-full" style={{ width: "15%" }} />
              </div>
              <p className="text-[12px] text-ca-text-secondary">Planned vacations. Encashable at the end of fiscal year</p>
            </div>

            {/* Maternity & Paternity */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ca-border text-[12px] text-ca-text-secondary font-bold">
              <div className="p-1.5 bg-ca-bg border border-ca-border rounded-lg space-y-1">
                <span className="text-ca-text font-extrabold block">Maternity Leave</span>
                <span>180 Days Paid</span>
                <p className="text-[10px] text-ca-text-secondary font-medium">Post-natal recovery allowance</p>
              </div>
              <div className="p-1.5 bg-ca-bg border border-ca-border rounded-lg space-y-1">
                <span className="text-ca-text font-extrabold block">Paternity Leave</span>
                <span>15 Days Paid</span>
                <p className="text-[10px] text-ca-text-secondary font-medium">New fathers allowance</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Leave Analytics Dashboard Section ──────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-sm space-y-5">
        <div className="border-b border-ca-border pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-ca-text">Leave Distribution & Trend Analytics</h3>
            <p className="text-sm text-ca-text-secondary mt-0.5">Analytical dashboard tracking employee time-off habits</p>
          </div>
          <span className="text-sm bg-ca-bg text-ca-text-secondary font-bold px-3 py-1 rounded-lg">Realtime telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">

          {/* Chart 1: Leave Type Breakdown */}
          <div className="bg-ca-bg/20 border border-ca-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px]">Leave Type Breakdown</span>
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.typeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartsData.typeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartsData.COLORS[index % chartsData.COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} requests`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-ca-text-secondary">
              {chartsData.typeBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center">
                  <span className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: chartsData.COLORS[index % chartsData.COLORS.length] }} />
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Monthly Trend */}
          <div className="bg-ca-bg/20 border border-ca-border rounded-xl p-4 space-y-3">
            <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px]">6-Month Leave Frequencies</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-theme-3)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-theme-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="leaves" stroke="var(--color-theme-3)" strokeWidth={2} fillOpacity={1} fill="url(#colorLeaves)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-ca-text-secondary text-center font-bold">Monthly sum of approved and pending applications</p>
          </div>

          {/* Chart 3: Department wise Distribution */}
          <div className="bg-ca-bg/20 border border-ca-border rounded-xl p-4 space-y-3">
            <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px]">Leaves by Department</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData.deptDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 8, fontWeight: "bold", fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-theme-1)" radius={[4, 4, 0, 0]} maxBarSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-ca-text-secondary text-center font-bold">Departments with the highest time-off activity</p>
          </div>

          {/* Chart 4: Leave Balance Consumption */}
          <div className="bg-ca-bg/20 border border-ca-border rounded-xl p-4 space-y-3">
            <span className="font-extrabold text-ca-text-secondary uppercase tracking-widest text-[12px]">Team Quota Consumption</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "CL", used: 14, remaining: 34 },
                  { name: "SL", used: 9, remaining: 28 },
                  { name: "EL", used: 21, remaining: 42 }
                ]} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 9, fontWeight: "bold", fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9, fontWeight: "bold" }} />
                  <Bar dataKey="used" name="Used (Days)" stackId="a" fill="var(--color-theme-4)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="remaining" name="Available" stackId="a" fill="var(--color-theme-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-ca-text-secondary text-center font-bold">Consumption metrics across active staff</p>
          </div>

        </div>
      </div>

      {/* ── APPLY LEAVE POPUP DIALOG MODAL ───────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-ca-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-ca-border animate-slideUp">

            <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border bg-ca-bg/50">
              <h2 className="text-lg font-bold text-ca-text flex items-center">
                <PlusCircle size={16} className="text-primary mr-1.5" />
                Apply Leave (On Behalf of Employee)
              </h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 rounded-lg text-ca-text-secondary hover:bg-ca-bg hover:text-ca-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form id="apply-leave-form" onSubmit={handleApplyLeave} className="p-5 space-y-4">
            <style>{`
              html.dark #apply-leave-form input,
              html.dark #apply-leave-form select,
              html.dark #apply-leave-form textarea {
                background-color: var(--color-ca-bg) !important;
                border-color: var(--color-ca-border) !important;
                color: var(--color-ca-text) !important;
                color-scheme: dark !important;
              }
              html.dark #apply-leave-form input:focus,
              html.dark #apply-leave-form select:focus,
              html.dark #apply-leave-form textarea:focus {
                background-color: var(--color-ca-bg) !important;
                border-color: var(--color-ca-primary) !important;
              }
              html.dark #apply-leave-form .bg-theme-3-light\\/50 {
                background-color: var(--color-ca-bg) !important;
                color: var(--color-ca-text-secondary) !important;
                border-color: var(--color-ca-border) !important;
                opacity: 0.7;
              }
            `}</style>

              <div className="space-y-1">
                <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Select Team Member</label>
                <select
                  required
                  value={applyForm.employeeId}
                  onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">Choose Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Leave Category</label>
                  <select
                    value={applyForm.leaveType}
                    onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  >
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Annual">Annual / Earned</option>
                    <option value="LOP">Loss of Pay (LOP)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Status Action</label>
                  <div className="px-3 py-2 border border-ca-border rounded-xl text-sm font-semibold text-theme-2 bg-theme-3-light/50">
                    Auto-Approve by Admin
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Justification Reason</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="State the vacation details or sick explanation..."
                  className="w-full border border-ca-border rounded-xl p-3 text-sm text-ca-text bg-ca-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 border border-ca-border hover:border-slate-300 text-ca-text rounded-xl text-sm font-bold transition-all hover:bg-ca-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
                >
                  {applySubmitting ? "Recording..." : "Apply & Record Leave"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MANAGE HOLIDAYS POPUP DIALOG MODAL ────────────────────────────────── */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-ca-surface rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-ca-border flex flex-col max-h-[85vh] animate-slideUp">

            <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border bg-ca-bg/50 flex-shrink-0">
              <h2 className="text-lg font-bold text-ca-text flex items-center">
                <Calendar size={16} className="text-primary mr-1.5" />
                Manage Holiday Calendar
              </h2>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1.5 rounded-lg text-ca-text-secondary hover:bg-ca-bg hover:text-ca-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">

              {/* Left Column: Form to Add/Edit Holiday */}
              <form onSubmit={handleHolidaySubmit} className="space-y-4">
                <h3 className="text-sm font-extrabold text-ca-text-secondary uppercase tracking-widest border-b border-ca-border pb-1.5">
                  {holidayForm.id ? "Edit Holiday" : "Record New Holiday"}
                </h3>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Holiday Title</label>
                  <input
                    type="text"
                    required
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    placeholder="e.g. Independence Day, Christmas..."
                    className="w-full px-3 py-2 border border-ca-border rounded-xl text-sm text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Holiday Date</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-xl text-sm text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Description</label>
                  <textarea
                    rows={2}
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    placeholder="Brief holiday details..."
                    className="w-full border border-ca-border rounded-xl p-2.5 text-sm text-ca-text bg-ca-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder-slate-300"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  {holidayForm.id && (
                    <button
                      type="button"
                      onClick={() => setHolidayForm({ id: null, name: "", date: "", description: "" })}
                      className="px-3 bg-ca-bg hover:bg-slate-200 rounded-xl text-sm font-bold text-ca-text-secondary transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    {holidayForm.id ? "Save Changes" : "Record Holiday"}
                  </button>
                </div>
              </form>

              {/* Right Column: Existing Holidays List */}
              <div className="space-y-3 flex flex-col min-h-0">
                <h3 className="text-sm font-extrabold text-ca-text-secondary uppercase tracking-widest border-b border-ca-border pb-1.5 flex-shrink-0">
                  Registered Holidays ({holidays.length})
                </h3>

                <div className="space-y-2 overflow-y-auto flex-1 max-h-[300px] pr-1">
                  {holidays.length === 0 ? (
                    <div className="text-center py-10 text-ca-text-secondary text-sm font-bold">No holidays registered.</div>
                  ) : (
                    holidays.map((h) => (
                      <div key={h._id} className="border border-ca-border rounded-xl p-3 bg-ca-bg/50 flex justify-between items-start text-sm">
                        <div className="space-y-1">
                          <p className="font-extrabold text-ca-text">{h.name}</p>
                          <p className="text-[12px] text-ca-text-secondary font-bold uppercase">{formatDate(h.date)}</p>
                          {h.description && <p className="text-[12px] text-ca-text-secondary font-medium italic">"{h.description}"</p>}
                        </div>

                        <div className="flex space-x-1">
                          <button
                            onClick={() => setHolidayForm({ id: h._id, name: h.name, date: toDateStr(h.date), description: h.description || "" })}
                            className="p-1 text-ca-text-secondary hover:bg-ca-surface rounded border border-transparent hover:border-ca-border"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this holiday?")) deleteHolidayMutation.mutate(h._id);
                            }}
                            className="p-1 text-ca-primary hover:bg-ca-surface rounded border border-transparent hover:border-red-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end px-5 py-3 border-t border-ca-border bg-ca-bg flex-shrink-0">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-3 py-1.5 bg-ca-border hover:bg-slate-300 text-ca-text rounded-lg text-[11px] font-bold transition-all shadow-sm"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REJECTION MODAL FOR LEAVE REQUEST ───────────────────────────────── */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-ca-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-ca-border animate-slideUp">

            <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border">
              <h2 className="text-lg font-bold text-ca-text flex items-center">
                <AlertCircle size={16} className="text-ca-primary mr-1.5" />
                Reject Leave Application
              </h2>
              <button
                onClick={() => setRejectModalId(null)}
                className="p-1.5 rounded-lg text-ca-text-secondary hover:bg-ca-bg hover:text-ca-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-ca-text-secondary">Rejection Feedback / Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State why this leave cannot be granted at this time..."
                  required
                  rows={3}
                  className="w-full border border-ca-border rounded-xl p-3 text-sm text-ca-text resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 placeholder-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectModalId(null)}
                  className="flex-1 py-2.5 border border-ca-border hover:border-slate-300 text-ca-text rounded-xl text-sm font-bold transition-all hover:bg-ca-bg"
                >
                  Cancel
                </button>
                <button
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ id: rejectModalId, reason: rejectionReason })}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── LEAVE POLICIES CONFIGURATION MODAL ────────────────────────────── */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-ca-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-ca-border animate-slideUp">

            <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border bg-ca-bg/50">
              <h2 className="text-lg font-bold text-ca-text flex items-center">
                <Bookmark size={16} className="text-primary mr-1.5" />
                HR Leave Policies
              </h2>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-1.5 rounded-lg text-ca-text-secondary hover:bg-ca-bg hover:text-ca-text-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3 text-sm font-semibold text-ca-text-secondary">

                <div className="p-3 bg-ca-bg border border-ca-border rounded-xl space-y-1.5">
                  <span className="font-extrabold text-ca-text block">1. Casual Leave (CL)</span>
                  <p className="font-medium text-ca-text-secondary leading-relaxed">
                    12 days per year credited at the start of the fiscal year. Unused leaves expire on December 31st and do not roll over or accumulate.
                  </p>
                </div>

                <div className="p-3 bg-ca-bg border border-ca-border rounded-xl space-y-1.5">
                  <span className="font-extrabold text-ca-text block">2. Sick Leave (SL)</span>
                  <p className="font-medium text-ca-text-secondary leading-relaxed">
                    10 days per year. Documentation / medical certificate upload is mandatory for leaves exceeding 3 consecutive business days.
                  </p>
                </div>

                <div className="p-3 bg-ca-bg border border-ca-border rounded-xl space-y-1.5">
                  <span className="font-extrabold text-ca-text block">3. Annual / Earned Leave (EL)</span>
                  <p className="font-medium text-ca-text-secondary leading-relaxed">
                    15 days per year accumulated monthly. Roll-over: allowed up to 45 accumulated days. Remaining balance encashable at end-of-year calculation.
                  </p>
                </div>

                <div className="p-3 bg-ca-bg border border-ca-border rounded-xl space-y-1.5">
                  <span className="font-extrabold text-ca-text block">4. Loss of Pay (LOP)</span>
                  <p className="font-medium text-ca-text-secondary leading-relaxed">
                    Non-paid leave taken when casual or annual limits have been exceeded. Fully subtracts from monthly salary calculation based on daily rates.
                  </p>
                </div>

              </div>
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-ca-border bg-ca-bg">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-3 py-1.5 bg-ca-border hover:bg-slate-300 text-ca-text rounded-lg text-[11px] font-bold transition-all shadow-sm"
              >
                Close Policies
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveRequests;
