import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyLeavesApi,
  createLeaveAdminApi,
  approveLeaveApi,
  rejectLeaveApi,
  getLeaveBalanceApi,
  getHolidaysApi,
  createHolidayApi,
  deleteHolidayApi,
  getEmployeesApi,
  getDepartmentsApi,
  getBranchesApi,
} from "../../api/companyAdminApi";
import {
  Search,
  Plus,
  CalendarCheck2,
  Download,
  Check,
  X,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  Briefcase,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Sparkles,
  ArrowUpRight,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;
  const trimmed = rawPhoto.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .replace(/\/+api$/, "")
    .replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-600 text-white",
  "from-emerald-600 to-teal-600 text-white",
  "from-purple-600 to-pink-600 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-cyan-600 to-blue-600 text-white",
];

const getAvatarGradient = (name) => {
  const code = (name?.charCodeAt(0) || 0) + (name?.charCodeAt(1) || 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

const formatDate = (isoString) => {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const toDateStr = (isoString) => {
  if (!isoString) return "";
  try {
    return new Date(isoString).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const STATUS_CONFIG = {
  approved: {
    label: "Approved",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending Review",
    pill: "bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] border-[#1268D9]/25",
    dot: "bg-[#1268D9] animate-pulse",
    icon: Clock,
  },
  rejected: {
    label: "Rejected",
    pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
    icon: AlertCircle,
  },
};

const TYPE_CONFIG = {
  Casual: {
    label: "Casual Leave",
    style: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
  },
  Sick: {
    label: "Sick Leave",
    style: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  },
  Annual: {
    label: "Annual Leave",
    style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  },
  LOP: {
    label: "Loss of Pay",
    style: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
  },
};

const ROWS_PER_PAGE = 10;

const LeaveRequests = () => {
  const queryClient = useQueryClient();

  // ── States ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [rejectModalLeave, setRejectModalLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [toast, setToast] = useState(null);

  // Apply Form
  const [applyForm, setApplyForm] = useState({
    employeeId: "",
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Holiday Form
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: "",
    description: "",
  });

  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: leavesRes, isLoading: isLeavesLoading } = useQuery({
    queryKey: ["companyLeavesList"],
    queryFn: () => getCompanyLeavesApi({}),
  });

  const { data: employeesRes } = useQuery({
    queryKey: ["employeesListSelect"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  const { data: deptsRes } = useQuery({
    queryKey: ["departmentsList"],
    queryFn: getDepartmentsApi,
  });

  const { data: branchesRes } = useQuery({
    queryKey: ["branchesList"],
    queryFn: getBranchesApi,
  });

  const { data: holidaysRes } = useQuery({
    queryKey: ["companyHolidays"],
    queryFn: getHolidaysApi,
  });

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

  const departments = useMemo(() => {
    const list = deptsRes?.data?.departments || deptsRes?.data;
    return Array.isArray(list) ? list : [];
  }, [deptsRes]);

  const branches = useMemo(() => {
    const list = branchesRes?.data?.branches || branchesRes?.data;
    return Array.isArray(list) ? list : [];
  }, [branchesRes]);

  // Top Metrics
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === "pending").length;
    const approved = leaves.filter((l) => l.status === "approved").length;
    const rejected = leaves.filter((l) => l.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  // Filtering
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const name = `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.toLowerCase();
      const code = (l.employeeId?.employeeCode || "").toLowerCase();
      const dept = (l.employeeId?.departmentId?.name || "").toLowerCase();
      const reason = (l.reason || "").toLowerCase();
      const searchStr = search.toLowerCase();

      const matchSearch =
        !searchStr ||
        name.includes(searchStr) ||
        code.includes(searchStr) ||
        dept.includes(searchStr) ||
        reason.includes(searchStr);

      const matchStatus = statusTab === "all" || l.status === statusTab;
      const matchType = !typeFilter || l.leaveType === typeFilter;
      const matchDept = !deptFilter || l.employeeId?.departmentId?._id === deptFilter || l.employeeId?.departmentId === deptFilter;
      const matchBranch = !branchFilter || l.employeeId?.branchId?._id === branchFilter || l.employeeId?.branchId === branchFilter;

      return matchSearch && matchStatus && matchType && matchDept && matchBranch;
    });
  }, [leaves, search, statusTab, typeFilter, deptFilter, branchFilter]);

  const totalPages = Math.ceil(filteredLeaves.length / ROWS_PER_PAGE) || 1;
  const paginatedLeaves = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredLeaves.slice(start, start + ROWS_PER_PAGE);
  }, [filteredLeaves, page]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: approveLeaveApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyLeavesList"]);
      triggerToast("Leave application approved");
      setSelectedLeave(null);
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Approve failed", "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectLeaveApi(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["companyLeavesList"]);
      triggerToast("Leave application rejected");
      setRejectModalLeave(null);
      setRejectionReason("");
      setSelectedLeave(null);
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Reject failed", "error"),
  });

  const createHolidayMutation = useMutation({
    mutationFn: createHolidayApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyHolidays"]);
      triggerToast("Holiday added to calendar");
      setHolidayForm({ name: "", date: "", description: "" });
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to add holiday", "error"),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: deleteHolidayApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["companyHolidays"]);
      triggerToast("Holiday removed");
    },
    onError: (err) => triggerToast(err?.response?.data?.message || "Failed to delete holiday", "error"),
  });

  // Handle Apply Leave
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!applyForm.employeeId || !applyForm.startDate || !applyForm.endDate) {
      triggerToast("Please fill all required dates & fields", "error");
      return;
    }
    setApplySubmitting(true);
    try {
      await createLeaveAdminApi(applyForm);
      queryClient.invalidateQueries(["companyLeavesList"]);
      triggerToast("Leave recorded successfully");
      setShowApplyModal(false);
      setApplyForm({
        employeeId: "",
        leaveType: "Casual",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Failed to submit leave", "error");
    } finally {
      setApplySubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leaves.length === 0) {
      triggerToast("No records available to export", "error");
      return;
    }
    const headers = ["Employee Code", "Name", "Department", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason", "Applied Date"];
    const rows = filteredLeaves.map((l) => [
      l.employeeId?.employeeCode || "—",
      `"${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}"`,
      `"${l.employeeId?.departmentId?.name || "—"}"`,
      l.leaveType,
      toDateStr(l.startDate),
      toDateStr(l.endDate),
      l.numberOfDays || 1,
      l.status,
      `"${(l.reason || "").replace(/"/g, '""')}"`,
      toDateStr(l.createdAt),
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Leaves_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("CSV exported successfully");
  };

  const hasActiveFilters = search || statusTab !== "all" || typeFilter || deptFilter || branchFilter;

  return (
    <div className="space-y-4 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto pb-12 animate-fadeIn">
      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold transition-all animate-slideDown backdrop-blur-md ${
            toast.type === "error"
              ? "bg-rose-500/90 text-white border-rose-400/50 shadow-rose-500/20"
              : "bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-600/20"
          }`}
        >
          <AlertCircle size={16} className="mr-2 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Executive Banner ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Leave Requests & Attendance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] border border-[#1268D9]/20 shadow-xs">
              {filteredLeaves.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time workforce time-off approvals, quota balances, and holiday registry.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#1268D9] to-[#0D50B8] hover:from-[#0D50B8] hover:to-[#093D8E] text-white font-extrabold rounded-xl text-xs shadow-md shadow-[#1268D9]/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Apply Leave</span>
          </button>
          <button
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-[#11243D] hover:border-[#1268D9]/40 transition-all cursor-pointer shadow-2xs"
          >
            <Calendar size={13} className="text-[#1268D9]" />
            <span>Holidays ({holidays.length})</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#0D1B2E] border border-slate-200/80 dark:border-[#1C3554] text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-[#11243D] hover:border-[#1268D9]/40 transition-all cursor-pointer shadow-2xs"
          >
            <Download size={13} className="text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Modern Executive KPI Cards Grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Requests */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#0D1B2E] dark:to-[#071A2F] rounded-2xl border border-slate-200/80 dark:border-[#1C3554] p-4 shadow-2xs hover:border-[#1268D9]/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Applications</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.total}</h3>
            <span className="text-[11px] font-bold text-slate-400">All-time</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-slate-400/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Pending Approvals */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#0D1B2E] dark:to-[#071A2F] rounded-2xl border border-slate-200/80 dark:border-[#1C3554] p-4 shadow-2xs hover:border-[#1268D9]/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1268D9] dark:text-[#2F8BFF]">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-[#1268D9] dark:text-[#2F8BFF] tracking-tight leading-none">{stats.pending}</h3>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              Action Required
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[#1268D9]/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Approved */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#0D1B2E] dark:to-[#071A2F] rounded-2xl border border-slate-200/80 dark:border-[#1C3554] p-4 shadow-2xs hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved Leaves</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{stats.approved}</h3>
            <span className="text-[11px] font-bold text-slate-400">Granted</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Rejected */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#0D1B2E] dark:to-[#071A2F] rounded-2xl border border-slate-200/80 dark:border-[#1C3554] p-4 shadow-2xs hover:border-rose-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejected / Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">{stats.rejected}</h3>
            <span className="text-[11px] font-bold text-slate-400">Declined</span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ── Main Data Card & Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0D1B2E] rounded-2xl border border-slate-200/80 dark:border-[#1C3554] shadow-sm overflow-hidden">
        {/* Modern Segmented Status Tabs & Reset Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200/80 dark:border-[#1C3554] bg-slate-50/60 dark:bg-[#071A2F]/40 flex items-center justify-between gap-3 flex-wrap">
          {/* Segmented Control */}
          <div className="inline-flex p-1 rounded-xl bg-slate-200/60 dark:bg-[#050F1F] border border-slate-300/40 dark:border-[#1C3554]/80">
            {[
              { id: "all", label: "All Requests", count: stats.total },
              { id: "pending", label: "Pending", count: stats.pending },
              { id: "approved", label: "Approved", count: stats.approved },
              { id: "rejected", label: "Rejected", count: stats.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusTab(tab.id);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  statusTab === tab.id
                    ? "bg-[#1268D9] text-white shadow-sm shadow-[#1268D9]/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    statusTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-300/50 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setStatusTab("all");
                setTypeFilter("");
                setDeptFilter("");
                setBranchFilter("");
                setPage(1);
              }}
              className="text-xs font-bold text-[#1268D9] hover:underline cursor-pointer flex items-center gap-1"
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Input Controls */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-[#1C3554] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50/20 dark:bg-[#071A2F]/10">
          {/* Search Box */}
          <div className="relative group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1268D9] transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, ID, reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200/80 dark:border-[#1C3554] focus:border-[#1268D9] focus:ring-2 focus:ring-[#1268D9]/20 focus:outline-none rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all shadow-2xs"
            />
          </div>

          {/* Leave Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200/80 dark:border-[#1C3554] focus:border-[#1268D9] focus:ring-2 focus:ring-[#1268D9]/20 focus:outline-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
          >
            <option value="">All Leave Types</option>
            <option value="Casual">Casual Leave (CL)</option>
            <option value="Sick">Sick Leave (SL)</option>
            <option value="Annual">Annual Leave (EL)</option>
            <option value="LOP">Loss of Pay (LOP)</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200/80 dark:border-[#1C3554] focus:border-[#1268D9] focus:ring-2 focus:ring-[#1268D9]/20 focus:outline-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200/80 dark:border-[#1C3554] focus:border-[#1268D9] focus:ring-2 focus:ring-[#1268D9]/20 focus:outline-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Table Content ───────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          {isLeavesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-[#1268D9] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400">Loading leave applications...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center mx-auto border border-[#1268D9]/20">
                <CalendarCheck2 size={24} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">No applications found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try altering your search keywords or filter criteria.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-[#071A2F] border-b border-slate-200/80 dark:border-[#1C3554] text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Team Member</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Duration Period</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3">Reason / Note</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1C3554]/60">
                {paginatedLeaves.map((l) => {
                  const empName = `${l.employeeId?.firstName || ""} ${l.employeeId?.lastName || ""}`.trim() || "Employee";
                  const empCode = l.employeeId?.employeeCode || "—";
                  const deptName = l.employeeId?.departmentId?.name || "—";
                  const statusInfo = STATUS_CONFIG[l.status] || STATUS_CONFIG.pending;
                  const typeInfo = TYPE_CONFIG[l.leaveType] || { label: l.leaveType, style: "bg-slate-100 text-slate-700 border-slate-200" };
                  const rawPhoto = l.employeeId?.photo || l.employeeId?.documents?.photo || l.employeeId?.userId?.profileImage;
                  const photoUrl = getPhotoUrl(rawPhoto);

                  return (
                    <tr
                      key={l._id}
                      onClick={() => setSelectedLeave(l)}
                      className="hover:bg-[#1268D9]/[0.03] dark:hover:bg-[#1268D9]/[0.06] transition-colors cursor-pointer group"
                    >
                      {/* Team Member */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {photoUrl ? (
                            <img src={photoUrl} alt={empName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-[#1C3554] shadow-2xs shrink-0" />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(empName)} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                              {empName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight group-hover:text-[#1268D9] transition-colors truncate">
                              {empName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{empCode}</span>
                              <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                              <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate">{deptName}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${typeInfo.style}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span>{formatDate(l.startDate)}</span>
                          <span className="text-slate-400 font-normal">➔</span>
                          <span>{formatDate(l.endDate)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Applied {formatDate(l.createdAt)}</span>
                      </td>

                      {/* Days Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#050F1F] text-slate-800 dark:text-slate-200 font-mono font-black text-xs border border-slate-200/80 dark:border-[#1C3554]">
                          {l.numberOfDays || 1}d
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate" title={l.reason}>
                          {l.reason || "—"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {l.status === "pending" && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(l._id)}
                                disabled={approveMutation.isPending}
                                title="Quick Approve"
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center transition-all cursor-pointer"
                              >
                                <Check size={13} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalLeave(l);
                                  setRejectionReason("");
                                }}
                                title="Reject with Reason"
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center justify-center transition-all cursor-pointer"
                              >
                                <X size={13} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedLeave(l)}
                            title="View Full Application & Balance"
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#050F1F] hover:bg-slate-100 dark:hover:bg-[#11243D] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1C3554] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Eye size={12} className="text-[#1268D9]" />
                            <span>Details</span>
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

        {/* Pagination Bar */}
        {filteredLeaves.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 dark:border-[#1C3554] bg-slate-50/60 dark:bg-[#071A2F]/40 text-xs text-slate-500 font-bold">
            <span>
              Showing {(page - 1) * ROWS_PER_PAGE + 1} to{" "}
              {Math.min(page * ROWS_PER_PAGE, filteredLeaves.length)} of {filteredLeaves.length} requests
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1C3554] hover:bg-white dark:hover:bg-[#050F1F] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] font-mono">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1C3554] hover:bg-white dark:hover:bg-[#050F1F] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: LEAVE DETAILS & QUOTA VERIFICATION ────────────────────── */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedLeave(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10 animate-scaleUp max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center">
                  <CalendarCheck2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Leave Application Review</h3>
                  <p className="text-[11px] text-slate-400">Employee details & available quota balance</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
              {/* Employee Info Header */}
              {(() => {
                const name = `${selectedLeave.employeeId?.firstName || ""} ${selectedLeave.employeeId?.lastName || ""}`.trim() || "Employee";
                const desg = selectedLeave.employeeId?.designationId?.name || selectedLeave.employeeId?.designation || "Team Member";
                const dept = selectedLeave.employeeId?.departmentId?.name || "General";
                const code = selectedLeave.employeeId?.employeeCode || "—";
                const rawPhoto = selectedLeave.employeeId?.photo || selectedLeave.employeeId?.documents?.photo || selectedLeave.employeeId?.userId?.profileImage;
                const photoUrl = getPhotoUrl(rawPhoto);
                const statusInfo = STATUS_CONFIG[selectedLeave.status] || STATUS_CONFIG.pending;

                return (
                  <div className="flex items-center space-x-3 bg-slate-50 dark:bg-[#071A2F]/60 p-3 rounded-xl border border-slate-200/80 dark:border-[#1C3554]">
                    {photoUrl ? (
                      <img src={photoUrl} alt={name} className="w-11 h-11 rounded-xl object-cover border border-white dark:border-slate-700 shadow-sm shrink-0" />
                    ) : (
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(name)} font-black text-sm flex items-center justify-center shrink-0 shadow-sm`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desg} • {dept}</p>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-white dark:bg-[#050F1F] text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-200 dark:border-[#1C3554] mt-1">
                        {code}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })()}

              {/* Leave Quota Cards */}
              <div className="bg-slate-50 dark:bg-[#071A2F]/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554] space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Leave Quota</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-[#050F1F] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554] shadow-2xs">
                    <span className="text-base font-black text-[#1268D9] dark:text-[#2F8BFF] block">{balanceRes?.data?.balance?.casual ?? 12}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Casual (CL)</span>
                  </div>
                  <div className="bg-white dark:bg-[#050F1F] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554] shadow-2xs">
                    <span className="text-base font-black text-[#1268D9] dark:text-[#2F8BFF] block">{balanceRes?.data?.balance?.sick ?? 10}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sick (SL)</span>
                  </div>
                  <div className="bg-white dark:bg-[#050F1F] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554] shadow-2xs">
                    <span className="text-base font-black text-[#1268D9] dark:text-[#2F8BFF] block">{balanceRes?.data?.balance?.annual ?? 15}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Annual (EL)</span>
                  </div>
                </div>
              </div>

              {/* Application Details Summary */}
              <div className="bg-slate-50 dark:bg-[#071A2F]/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554] text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200/60 dark:border-[#1C3554] pb-1.5">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{selectedLeave.leaveType} Leave</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-[#1C3554] pb-1.5">
                  <span className="text-slate-400">Date Duration:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">
                    {formatDate(selectedLeave.startDate)} – {formatDate(selectedLeave.endDate)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-[#1C3554] pb-1.5">
                  <span className="text-slate-400">Total Requested:</span>
                  <span className="font-extrabold text-[#1268D9] dark:text-[#2F8BFF]">
                    {selectedLeave.numberOfDays} {selectedLeave.numberOfDays === 1 ? "Day" : "Days"}
                  </span>
                </div>
                <div className="pt-1 space-y-1">
                  <span className="text-slate-400 block font-bold">Reason Provided:</span>
                  <p className="p-2.5 rounded-xl bg-white dark:bg-[#050F1F] border border-slate-200/80 dark:border-[#1C3554] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    &ldquo;{selectedLeave.reason || "No explanation provided"}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3.5 border-t border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F]">
              {selectedLeave.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRejectModalLeave(selectedLeave);
                      setRejectionReason("");
                    }}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => approveMutation.mutate(selectedLeave._id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 py-2 bg-gradient-to-r from-[#1268D9] to-[#0D50B8] hover:from-[#0D50B8] hover:to-[#093D8E] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#1268D9]/25 cursor-pointer"
                  >
                    {approveMutation.isPending ? "Approving..." : "Approve Leave"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="w-full py-2 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Close Dialog
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: APPLY LEAVE ON BEHALF ────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setShowApplyModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F]">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={16} className="text-[#1268D9]" />
                Record Employee Leave
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleApplyLeave} className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Team Member</label>
                <select
                  required
                  value={applyForm.employeeId}
                  onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1268D9]"
                >
                  <option value="">Choose Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leave Category</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1268D9]"
                >
                  <option value="Casual">Casual Leave (CL)</option>
                  <option value="Sick">Sick Leave (SL)</option>
                  <option value="Annual">Annual / Earned (EL)</option>
                  <option value="LOP">Loss of Pay (LOP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1268D9]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1268D9]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reason / Description</label>
                <textarea
                  rows={3}
                  required
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="State the vacation details or sick explanation..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1268D9] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting}
                  className="flex-1 py-2 bg-gradient-to-r from-[#1268D9] to-[#0D50B8] hover:from-[#0D50B8] hover:to-[#093D8E] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1268D9]/25 transition-all cursor-pointer"
                >
                  {applySubmitting ? "Recording..." : "Apply & Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MANAGE HOLIDAYS ──────────────────────────────────────── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setShowHolidayModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10 animate-scaleUp max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F]">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={16} className="text-[#1268D9]" />
                Company Holiday Registry
              </h3>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
              {/* Add Holiday Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!holidayForm.name || !holidayForm.date) return;
                  createHolidayMutation.mutate(holidayForm);
                }}
                className="space-y-3 bg-slate-50 dark:bg-[#071A2F]/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554]"
              >
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Add New Holiday</span>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400">Title / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day, Diwali"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold focus:outline-none focus:border-[#1268D9]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400">Holiday Date</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-bold focus:outline-none focus:border-[#1268D9]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400">Description</label>
                  <input
                    type="text"
                    placeholder="Optional description note"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs focus:outline-none focus:border-[#1268D9]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createHolidayMutation.isPending}
                  className="w-full py-2 bg-gradient-to-r from-[#1268D9] to-[#0D50B8] hover:from-[#0D50B8] hover:to-[#093D8E] text-white rounded-xl text-xs font-bold shadow-md shadow-[#1268D9]/25 transition-all cursor-pointer"
                >
                  {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
                </button>
              </form>

              {/* Holiday List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Scheduled Holidays ({holidays.length})
                </span>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No holidays registered.</p>
                  ) : (
                    holidays.map((h) => (
                      <div
                        key={h._id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#071A2F]/40 border border-slate-200/80 dark:border-[#1C3554]"
                      >
                        <div>
                          <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{h.name}</p>
                          <p className="text-[10.5px] text-slate-400 font-medium">{formatDate(h.date)}</p>
                        </div>
                        <button
                          onClick={() => deleteHolidayMutation.mutate(h._id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F] flex justify-end">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-1.5 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REJECT LEAVE REASON ──────────────────────────────────── */}
      {rejectModalLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setRejectModalLeave(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F]">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" />
                Reject Leave Application
              </h3>
              <button
                onClick={() => setRejectModalLeave(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reason for Rejection</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide brief feedback explaining why this leave cannot be approved..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalLeave(null)}
                  className="flex-1 py-2 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ id: rejectModalLeave._id, reason: rejectionReason })}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
