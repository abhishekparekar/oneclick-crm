import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getSubscriptionsApi, getPlansApi, getCompaniesApi,
  assignSubscriptionApi, renewSubscriptionApi, cancelSubscriptionApi,
  extendTrialApi, deleteSubscriptionApi, getSuperAdminSubscriptionRequestsApi,
  syncSubscriptionExpiryNotificationsApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import SuperAdminSubscriptionRequestsModal from "../../components/subscription/SuperAdminSubscriptionRequestsModal";
import {
  Search, Plus, MoreVertical, ExternalLink, RefreshCw, Ban,
  Calendar, AlertCircle, CheckCircle, XCircle, CreditCard,
  Building2, Briefcase, DollarSign, Clock, Sparkles, Check,
  ArrowUpRight, ChevronDown, Shield, Trash2, Download, Bell,
  FileSpreadsheet, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Palette-Enforced Status Badges ───────────────────────────────────── */
const SubscriptionStatusBadge = ({ status }) => {
  const badgeStyles = {
    active: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Active Plan" },
    trial: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Trial Tier" },
    expired: { bg: "bg-[#d97706]/20", text: "text-sa-text-secondary", border: "border-sa-border", label: "Expired" },
    cancelled: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border", label: "Cancelled" },
  };
  const current = badgeStyles[status] || badgeStyles.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      <span className="w-1 h-1 rounded-full bg-current mr-1.5 opacity-80" />
      {current.label}
    </span>
  );
};

const PaymentStatusBadge = ({ status }) => {
  const badgeStyles = {
    paid: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Paid" },
    pending: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "Pending" },
    failed: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border", label: "Failed" },
  };
  const current = badgeStyles[status] || badgeStyles.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      {current.label}
    </span>
  );
};

/* ─── Top Summary KPI Card ─────────────────────────────────────────────── */
const SubscriptionKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-sa-surface rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
      active ? "border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md" : "border-sa-border hover:border-sa-border/80 hover:bg-sa-bg/30"
    }`}
  >
    <div>
      <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h4 className="text-2xl font-black text-sa-text tracking-tight leading-none">{count}</h4>
        {subtitle && <span className="text-[10px] font-bold text-sa-text-secondary">{subtitle}</span>}
      </div>
    </div>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
      <Icon size={18} className="text-white" />
    </div>
  </div>
);

const MOCK_SUBSCRIPTIONS = [
  {
    _id: "sub_01",
    companyId: { _id: "comp_101", companyName: "Acme Corporation Global", logo: null },
    planName: "Enterprise",
    planId: { planName: "Enterprise", priceMonthly: 15000, priceYearly: 150000 },
    billingCycle: "yearly",
    price: 150000,
    status: "active",
    startDate: "2025-11-15T00:00:00Z",
    endDate: "2026-11-15T00:00:00Z",
    paymentStatus: "paid",
  },
  {
    _id: "sub_02",
    companyId: { _id: "comp_102", companyName: "TechSphere Solutions Pvt Ltd", logo: null },
    planName: "Pro",
    planId: { planName: "Pro", priceMonthly: 5000, priceYearly: 50000 },
    billingCycle: "monthly",
    price: 5000,
    status: "active",
    startDate: "2026-06-01T00:00:00Z",
    endDate: "2026-07-01T00:00:00Z",
    paymentStatus: "paid",
  },
  {
    _id: "sub_03",
    companyId: { _id: "comp_103", companyName: "Nexus Innovation Labs", logo: null },
    planName: "Basic",
    planId: { planName: "Basic", priceMonthly: 2000, priceYearly: 20000 },
    billingCycle: "monthly",
    price: 2000,
    status: "active",
    startDate: "2026-06-10T00:00:00Z",
    endDate: "2026-07-10T00:00:00Z",
    paymentStatus: "paid",
  },
  {
    _id: "sub_04",
    companyId: { _id: "comp_104", companyName: "Starlight Retail Ventures", logo: null },
    planName: "Enterprise",
    planId: { planName: "Enterprise", priceMonthly: 15000, priceYearly: 150000 },
    billingCycle: "yearly",
    price: 150000,
    status: "active",
    startDate: "2026-02-18T00:00:00Z",
    endDate: "2027-02-18T00:00:00Z",
    paymentStatus: "paid",
  },
  {
    _id: "sub_05",
    companyId: { _id: "comp_105", companyName: "CloudScale AI Systems", logo: null },
    planName: "Trial",
    planId: { planName: "Trial", priceMonthly: 0, priceYearly: 0 },
    billingCycle: "monthly",
    price: 0,
    status: "trial",
    startDate: "2026-06-20T00:00:00Z",
    endDate: "2026-07-04T00:00:00Z",
    paymentStatus: "paid",
  },
  {
    _id: "sub_06",
    companyId: { _id: "comp_106", companyName: "Apex Logistics India", logo: null },
    planName: "Basic",
    planId: { planName: "Basic", priceMonthly: 2000, priceYearly: 20000 },
    billingCycle: "monthly",
    price: 2000,
    status: "expired",
    startDate: "2026-03-05T00:00:00Z",
    endDate: "2026-06-05T00:00:00Z",
    paymentStatus: "unpaid",
  }
];

const getTodayStr = () => new Date().toISOString().split("T")[0];
const getFutureDateStr = (days = 30, fromDateStr) => {
  const base = fromDateStr ? new Date(fromDateStr) : new Date();
  base.setDate(base.getDate() + (Number(days) || 30));
  return base.toISOString().split("T")[0];
};
const calculateDaysDiff = (fromStr, toStr) => {
  if (!fromStr || !toStr) return 1;
  const ms = new Date(toStr).getTime() - new Date(fromStr).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};

const getExpiryInfo = (sub) => {
  if (!sub?.endDate) return { daysLeft: null, isExpired: false, isExpiring7: false, isExpiring30: false };
  const end = new Date(sub.endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0 || sub.status === "expired";
  const isExpiring7 = !isExpired && daysLeft <= 7 && daysLeft >= 0;
  const isExpiring30 = !isExpired && daysLeft <= 30 && daysLeft >= 0;
  return { daysLeft, isExpired, isExpiring7, isExpiring30 };
};

const exportToCSV = (subsToExport, filenamePrefix = "subscriptions") => {
  if (!subsToExport || subsToExport.length === 0) {
    toast.error("No subscription records available to export.");
    return;
  }

  const headers = [
    "Tenant Workspace",
    "Tenant ID",
    "Plan Name",
    "Billing Cycle",
    "Price / Amount",
    "Subscription Status",
    "Payment Status",
    "Start Date",
    "End Date",
    "Days Remaining",
    "Expiry Urgency",
    "Company Email",
    "Company Phone",
    "Owner Name"
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = subsToExport.map((sub) => {
    const comp = sub.companyId || {};
    const plan = sub.planId || {};
    const info = getExpiryInfo(sub);
    const planName = sub.planName || plan.planName || "Standard";
    const amount = sub.amount || sub.price || 0;
    const startDate = sub.startDate ? new Date(sub.startDate).toISOString().split("T")[0] : "";
    const endDate = sub.endDate ? new Date(sub.endDate).toISOString().split("T")[0] : "";
    
    let urgency = "Active / Stable";
    if (info.isExpired) urgency = "Expired";
    else if (info.isExpiring7) urgency = "CRITICAL (<= 7 Days)";
    else if (info.isExpiring30) urgency = "Upcoming (<= 1 Month)";

    const daysRemaining = info.isExpired 
      ? `Expired (${Math.abs(info.daysLeft)}d ago)` 
      : `${info.daysLeft ?? "N/A"} days`;

    return [
      escapeCSV(comp.companyName || "Unknown Tenant"),
      escapeCSV(comp._id || comp || "N/A"),
      escapeCSV(planName),
      escapeCSV(sub.billingCycle || "monthly"),
      escapeCSV(amount),
      escapeCSV(sub.status || "active"),
      escapeCSV(sub.paymentStatus || "unpaid"),
      escapeCSV(startDate),
      escapeCSV(endDate),
      escapeCSV(daysRemaining),
      escapeCSV(urgency),
      escapeCSV(comp.email || comp.ownerEmail || "N/A"),
      escapeCSV(comp.phone || comp.ownerPhone || "N/A"),
      escapeCSV(comp.ownerName || "N/A")
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${subsToExport.length} subscription records successfully!`);
};

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [syncingNotifs, setSyncingNotifs] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  
  const [assignData, setAssignData] = useState({
    companyId: "",
    planId: "",
    billingCycle: "monthly",
    startDate: getTodayStr(),
    endDate: getFutureDateStr(30),
    subscriptionDays: 30,
  });
  const [assignDurationMode, setAssignDurationMode] = useState("calendar"); // "calendar" | "days"
  const [extendDays, setExtendDays] = useState(7);
  const [extendToDate, setExtendToDate] = useState("");

  const { data, isLoading, refetch } = useQuery({ queryKey: ["superAdminSubscriptions"], queryFn: () => getSubscriptionsApi() });
  const { data: plansData } = useQuery({ queryKey: ["superAdminPlans"], queryFn: () => getPlansApi() });
  const { data: companiesData } = useQuery({ queryKey: ["superAdminCompanies"], queryFn: () => getCompaniesApi() });
  const { data: reqsData } = useQuery({ queryKey: ["superAdminSubscriptionRequestsCount"], queryFn: () => getSuperAdminSubscriptionRequestsApi() });

  const pendingRequestsCount = reqsData?.data?.stats?.pending || reqsData?.data?.filter?.(r => r.status === "pending")?.length || 0;

  const rawSubscriptions = Array.isArray(data?.data) ? data?.data : (data?.data?.subscriptions || []);
  const subscriptions = rawSubscriptions;
  const plans = plansData?.data?.plans || [];
  const companies = companiesData?.data?.companies || [];

  // Expiry categorized groups
  const expiring7Subs = subscriptions.filter(s => getExpiryInfo(s).isExpiring7);
  const expiring30Subs = subscriptions.filter(s => getExpiryInfo(s).isExpiring30);
  const expiredSubs = subscriptions.filter(s => getExpiryInfo(s).isExpired);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const companyName = sub.companyId?.companyName || "";
    const planName = sub.planName || sub.planId?.planName || "";
    const matchesSearch = companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          planName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const info = getExpiryInfo(sub);
    if (statusFilter === "all") return true;
    if (statusFilter === "expiring7") return info.isExpiring7;
    if (statusFilter === "expiring30") return info.isExpiring30;
    if (statusFilter === "expired") return info.isExpired || sub.status === "expired";
    return sub.status === statusFilter;
  });

  const handleSyncNotifications = async () => {
    try {
      setSyncingNotifs(true);
      const res = await syncSubscriptionExpiryNotificationsApi();
      toast.success(res?.message || "Expiry notifications synced to bell icon!");
      queryClient.invalidateQueries(["notifications"]);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync notifications");
    } finally {
      setSyncingNotifs(false);
    }
  };

  const handleRenew = (id) => {
    const sub = subscriptions.find(s => s._id === id);
    const companyName = sub?.companyId?.companyName || "this company";
    const cycle = sub?.billingCycle || "monthly";
    if (!window.confirm(`Activate / Renew subscription for ${companyName}?\n\nThis will extend the subscription by 1 ${cycle === "yearly" ? "year" : "month"} and set status to Active.`)) return;
    renewMutation.mutate(id, {
      onSuccess: () => toast.success(`Subscription activated/renewed for ${companyName}!`),
      onError: (err) => toast.error(err?.response?.data?.message || "Failed to activate/renew subscription"),
    });
  };

  const handleCancel = (id) => {
    const sub = subscriptions.find(s => s._id === id);
    const companyName = sub?.companyId?.companyName || "this company";
    if (!window.confirm(`Cancel subscription for ${companyName}?\n\nThe subscription will be marked as cancelled.`)) return;
    cancelMutation.mutate(id, {
      onSuccess: () => toast.success(`Subscription cancelled for ${companyName}.`),
      onError: (err) => toast.error(err?.response?.data?.message || "Failed to cancel subscription"),
    });
  };

  const handleDelete = (id) => {
    const sub = subscriptions.find(s => s._id === id);
    const companyName = sub?.companyId?.companyName || "this company";
    if (!window.confirm(`PERMANENTLY DELETE subscription for ${companyName}?\n\nThis cannot be undone. The company's plan will be reverted.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Subscription deleted for ${companyName}.`),
      onError: (err) => toast.error(err?.response?.data?.message || "Failed to delete subscription"),
    });
  };

  // Calculate MRR (Monthly Recurring Revenue approximate)
  const totalMrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const assignMutation = useMutation({
    mutationFn: assignSubscriptionApi,
    onSuccess: () => { queryClient.invalidateQueries(["superAdminSubscriptions"]); setIsAssignModalOpen(false); },
    onError: (err) => alert(err.response?.data?.message || "Failed to assign subscription")
  });

  const renewMutation = useMutation({
    mutationFn: renewSubscriptionApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminSubscriptions"]),
    onError: (err) => alert(err.response?.data?.message || "Failed to activate/renew subscription")
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscriptionApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminSubscriptions"]),
    onError: (err) => alert(err.response?.data?.message || "Failed to cancel subscription")
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ id, days, toDate }) => extendTrialApi(id, days, toDate),
    onSuccess: () => { queryClient.invalidateQueries(["superAdminSubscriptions"]); setIsExtendModalOpen(false); },
    onError: (err) => alert(err.response?.data?.message || "Failed to extend trial")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminSubscriptions"]);
      alert("Subscription completely deleted and plan reverted successfully.");
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to delete subscription")
  });

  const handleCycleChange = (cycle) => {
    let days = 30;
    if (cycle === "yearly") days = 365;
    else if (cycle === "trial") {
      const selectedPlan = plans.find(p => p._id === assignData.planId);
      days = selectedPlan?.trialDays || 14;
    }
    setAssignData(prev => ({
      ...prev,
      billingCycle: cycle,
      subscriptionDays: days,
      endDate: getFutureDateStr(days, prev.startDate || getTodayStr()),
    }));
  };

  const handleAssignDateChange = (field, val) => {
    setAssignData(prev => {
      const nextStart = field === "startDate" ? val : prev.startDate;
      const nextEnd = field === "endDate" ? val : prev.endDate;
      const diff = calculateDaysDiff(nextStart, nextEnd);
      return {
        ...prev,
        startDate: nextStart,
        endDate: nextEnd,
        subscriptionDays: diff,
      };
    });
  };

  const handleAssignDaysChange = (val) => {
    const days = Math.max(1, parseInt(val, 10) || 1);
    setAssignData(prev => {
      const start = prev.startDate || getTodayStr();
      const end = getFutureDateStr(days, start);
      return {
        ...prev,
        subscriptionDays: days,
        endDate: end,
      };
    });
  };

  const handleOpenExtend = (sub) => {
    setSelectedSub(sub);
    setExtendDays(7);
    const base = sub?.endDate ? new Date(sub.endDate).toISOString().split("T")[0] : getTodayStr();
    setExtendToDate(getFutureDateStr(7, base));
    setIsExtendModalOpen(true);
  };

  const handleExtendDaysChange = (val) => {
    const days = Math.max(1, parseInt(val, 10) || 1);
    setExtendDays(days);
    const base = selectedSub?.endDate ? new Date(selectedSub.endDate).toISOString().split("T")[0] : getTodayStr();
    setExtendToDate(getFutureDateStr(days, base));
  };

  const handleExtendToDateChange = (toVal) => {
    setExtendToDate(toVal);
    const base = selectedSub?.endDate ? new Date(selectedSub.endDate).toISOString().split("T")[0] : getTodayStr();
    const diff = calculateDaysDiff(base, toVal);
    setExtendDays(diff);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    assignMutation.mutate(assignData);
  };

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    extendTrialMutation.mutate({ id: selectedSub._id, days: extendDays, toDate: extendToDate });
  };

  /* ─── Table Column Definition ────────────────────────────────────────── */
  const columns = [
    {
      header: "Tenant Workspace",
      accessor: "company",
      render: (row) => (
        <div className="flex items-center space-x-3 py-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            {(row.companyId?.companyName || "C").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span 
              onClick={() => navigate(`/superadmin/companies/${row.companyId?._id || row.companyId}`)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer flex items-center gap-1 block leading-tight"
            >
              <span>{row.companyId?.companyName || "Unknown Tenant"}</span>
              <ExternalLink size={11} className="text-[#f59e0b] opacity-70" />
            </span>
            <span className="text-[10px] font-extrabold text-sa-text-secondary mt-0.5 block">
              ID: {(row.companyId?._id || row.companyId || "N/A").toString().substring(0, 8)}...
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Assigned Tier & Pricing",
      accessor: "plan",
      render: (row) => (
        <div className="py-1">
          <span className="inline-block px-2 py-0.5 rounded-md bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 text-[10px] font-black uppercase tracking-wider">
            {row.planName || row.planId?.planName || "Standard Plan"}
          </span>
          <p className="text-xs font-extrabold text-sa-text mt-1 flex items-center gap-1">
            <span className="text-[#f59e0b]">${row.amount || 0}</span>
            <span className="text-[10px] font-bold text-sa-text-secondary capitalize">/ {row.billingCycle || "monthly"}</span>
          </p>
        </div>
      )
    },
    {
      header: "Timeline & Validity",
      accessor: "timeline",
      render: (row) => {
        const info = getExpiryInfo(row);
        return (
          <div className="text-xs space-y-1 py-1">
            <div className="flex items-center space-x-1.5 text-sa-text-secondary font-medium">
              <span className="text-[10px] uppercase font-bold text-sa-text-secondary/70 w-10">Start:</span>
              <span className="font-extrabold text-sa-text">{row.startDate ? new Date(row.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-sa-text-secondary font-medium">
              <span className="text-[10px] uppercase font-bold text-sa-text-secondary/70 w-10">End:</span>
              <span className="font-extrabold text-sa-text">{row.endDate ? new Date(row.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
            </div>
            {/* Expiry & Validity Countdown Badges */}
            {info.isExpired ? (
              <div className="inline-flex items-center space-x-1 text-[10px] font-black text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                <AlertTriangle size={11} />
                <span>Expired ({Math.abs(info.daysLeft)}d ago)</span>
              </div>
            ) : info.isExpiring7 ? (
              <div className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                <AlertTriangle size={11} />
                <span>Expires in {info.daysLeft} {info.daysLeft === 1 ? 'day' : 'days'}!</span>
              </div>
            ) : info.isExpiring30 ? (
              <div className="inline-flex items-center space-x-1 text-[10px] font-black text-sky-400 bg-sky-400/15 px-2 py-0.5 rounded border border-sky-400/30">
                <Clock size={11} />
                <span>Expires in {info.daysLeft} days</span>
              </div>
            ) : null}

            {row.status === 'trial' && row.trialEndsAt && (
              <div className="inline-flex items-center space-x-1 text-[10px] font-black text-[#06B6D4] bg-[#06B6D4]/15 px-1.5 py-0.5 rounded border border-[#06B6D4]/30 mt-0.5">
                <Clock size={10} />
                <span>Trial Ends: {new Date(row.trialEndsAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Payment Status",
      accessor: "paymentStatus",
      render: (row) => <PaymentStatusBadge status={row.paymentStatus} />
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <SubscriptionStatusBadge status={row.status} />
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => navigate(`/superadmin/companies/${row.companyId?._id || row.companyId}`)}
            className="p-1.5 rounded-lg bg-sa-bg hover:bg-[#f59e0b]/10 text-sa-text-secondary hover:text-[#f59e0b] transition-all border border-transparent hover:border-[#f59e0b]/30"
            title="View Tenant Workspace"
          >
            <ExternalLink size={14} />
          </button>

          {row.status === 'trial' && (
            <button
              type="button"
              onClick={() => handleOpenExtend(row)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black text-[#f59e0b] bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 border border-[#f59e0b]/30 transition-all flex items-center space-x-1"
              title="Extend Free Trial Period"
            >
              <Calendar size={11} />
              <span>Extend</span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activeMenu?.id === row._id) {
                  setActiveMenu(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const openUpward = window.innerHeight - rect.bottom < 260;
                  setActiveMenu({
                    id: row._id,
                    x: window.innerWidth - rect.right,
                    y: openUpward ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
                    openUpward,
                    row
                  });
                }
              }}
              className={`p-1.5 rounded-lg border transition-all ${
                activeMenu?.id === row._id
                  ? "bg-sa-primary text-white border-sa-primary shadow-sm"
                  : "hover:bg-sa-bg text-sa-text-secondary border-transparent hover:border-sa-border/30"
              }`}
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
      )
    }
  ];

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-sa-border/30">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">Enterprise Subscriptions & Licensing</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Monitor active tenant tiers, free trials, recurring renewals, and incoming company upgrade requests.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
              className="px-4 py-2.5 rounded-xl text-xs font-black text-sa-text bg-sa-surface hover:bg-sa-bg border border-sa-border transition-all flex items-center space-x-2 cursor-pointer shadow-xs active:scale-95"
            >
              <Download size={15} className="text-[#f59e0b]" />
              <span>Export</span>
              <ChevronDown size={13} className={`text-sa-text-secondary transition-transform duration-200 ${isExportMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-sa-surface border border-sa-border rounded-xl shadow-xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sa-text-secondary border-b border-sa-border/40">
                    Export Options (.CSV)
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); exportToCSV(filteredSubscriptions, "subscriptions-filtered"); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-sa-text hover:bg-[#f59e0b]/10 hover:text-[#f59e0b] flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={14} /> Current View ({filteredSubscriptions.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); exportToCSV(expiring7Subs, "subscriptions-expiring-7-days"); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={14} /> Expiring in 7 Days ({expiring7Subs.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); exportToCSV(expiring30Subs, "subscriptions-expiring-1-month"); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-sky-400 hover:bg-sky-400/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={14} /> Expiring in 1 Month ({expiring30Subs.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); exportToCSV(expiredSubs, "subscriptions-expired"); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-400/10 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Ban size={14} /> Expired Plans ({expiredSubs.length})
                    </span>
                  </button>
                  <div className="border-t border-sa-border/40 my-1" />
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); exportToCSV(subscriptions, "all-subscriptions"); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-sa-text hover:bg-sa-bg flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase size={14} /> All Subscriptions ({subscriptions.length})
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            type="button"
            onClick={() => setIsRequestsModalOpen(true)} 
            className="px-4 py-2.5 rounded-xl text-xs font-black text-amber-950 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center space-x-2 cursor-pointer shadow-xs active:scale-95"
          >
            <Sparkles size={15} className="text-amber-500" />
            <span>Company Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={() => setIsAssignModalOpen(true)} 
            className="px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 flex items-center space-x-2 cursor-pointer active:scale-95"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
          >
            <Plus size={15} />
            <span>Assign New Plan</span>
          </button>
        </div>
      </div>

      {/* Expiry Tracking & Notification Alert Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-sa-surface to-sky-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Bell size={16} className={expiring7Subs.length > 0 ? "animate-bounce" : ""} />
              </div>
              <h3 className="text-sm font-black text-sa-text tracking-tight flex items-center gap-2">
                Plan Expiry Notification & Lifecycle Radar
              </h3>
              {expiring7Subs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  Urgent Action Needed
                </span>
              )}
            </div>
            <p className="text-xs text-sa-text-secondary font-medium pl-9">
              Track tenants approaching plan deadlines to prevent service downtime and trigger timely renewal outreach.
            </p>
          </div>

          {/* Quick Metrics & 1-Click Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "expiring7" ? "all" : "expiring7")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                statusFilter === "expiring7"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/20"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
              }`}
              title="Filter by plans expiring within 7 days"
            >
              <AlertTriangle size={14} />
              <span>7 Days Expiry</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/30 dark:bg-amber-400/20">
                {expiring7Subs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "expiring30" ? "all" : "expiring30")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                statusFilter === "expiring30"
                  ? "bg-sky-500 text-white border-sky-500 shadow-sm ring-2 ring-sky-500/20"
                  : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/25"
              }`}
              title="Filter by plans expiring within 1 month (30 days)"
            >
              <Clock size={14} />
              <span>1 Month Expiry</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-sky-500/30 dark:bg-sky-400/20">
                {expiring30Subs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer ${
                statusFilter === "expired"
                  ? "bg-rose-500 text-white border-rose-500 shadow-sm ring-2 ring-rose-500/20"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/25 hover:bg-rose-500/20"
              }`}
              title="Filter by expired plans"
            >
              <Ban size={14} />
              <span>Expired</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20">
                {expiredSubs.length}
              </span>
            </button>

            {/* Sync Notifications Bell Button */}
            <button
              type="button"
              onClick={handleSyncNotifications}
              disabled={syncingNotifs}
              className="px-3 py-2 rounded-xl text-xs font-black text-sa-text bg-sa-surface hover:bg-sa-bg border border-sa-border transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Sync unread alert notifications to the top header bell for upcoming expiries"
            >
              <RefreshCw size={13} className={syncingNotifs ? "animate-spin text-[#f59e0b]" : "text-sa-text-secondary"} />
              <span>{syncingNotifs ? "Syncing..." : "Sync Bell Alerts"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics KPI Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <SubscriptionKpiCard 
          title="Total Subscriptions" 
          count={subscriptions.length} 
          subtitle="All recorded tiers" 
          icon={Briefcase} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all"} 
          onClick={() => setStatusFilter("all")} 
        />
        <SubscriptionKpiCard 
          title="Active Workspaces" 
          count={subscriptions.filter(s => s.status === 'active').length} 
          subtitle="Fully provisioned" 
          icon={CheckCircle} 
          grad={["#f59e0b", "#f59e0b"]} 
          active={statusFilter === "active"} 
          onClick={() => setStatusFilter("active")} 
        />
        <SubscriptionKpiCard 
          title="Trial Evaluation" 
          count={subscriptions.filter(s => s.status === 'trial').length} 
          subtitle="On trial access" 
          icon={Clock} 
          grad={["#b45309", "#06B6D4"]} 
          active={statusFilter === "trial"} 
          onClick={() => setStatusFilter("trial")} 
        />
        <SubscriptionKpiCard 
          title="Active MRR Volume" 
          count={`$${totalMrr.toLocaleString()}`} 
          subtitle="Monthly active value" 
          icon={DollarSign} 
          grad={["#d97706", "#fbbf24"]} 
          active={false} 
          onClick={() => {}} 
        />
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-sa-surface p-4 rounded-2xl border border-sa-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search by tenant workspace name or assigned subscription plan..."
            className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Statuses" },
            { id: "expiring7", label: `⚡ Expiring in 7 Days (${expiring7Subs.length})` },
            { id: "expiring30", label: `📅 Expiring in 1 Month (${expiring30Subs.length})` },
            { id: "active", label: "Active" },
            { id: "trial", label: "Trial" },
            { id: "expired", label: `Expired (${expiredSubs.length})` },
            { id: "cancelled", label: "Cancelled" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all border ${
                statusFilter === item.id 
                  ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 shadow-2xs" 
                  : "bg-sa-bg/60 text-sa-text-secondary border-sa-border/30 hover:text-sa-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Section */}
      {isLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading enterprise subscriptions...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredSubscriptions} pagination={{ total: filteredSubscriptions.length }} />
        </div>
      )}

      {/* Fixed z-[9999] Action Dropdown Portal escaping all table clipping */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setActiveMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveMenu(null); }}
        />
      )}
      {activeMenu && (
        <div 
          style={{ 
            right: `${activeMenu.x}px`,
            ...(activeMenu.openUpward ? { bottom: `${activeMenu.y}px` } : { top: `${activeMenu.y}px` })
          }}
          className="fixed z-[9999] w-48 bg-sa-surface rounded-xl shadow-2xl border border-sa-border overflow-hidden animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button onClick={() => { const id = activeMenu.row.companyId?._id || activeMenu.row.companyId; setActiveMenu(null); navigate(`/superadmin/companies/${id}`); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-sa-text hover:bg-sa-bg transition-colors">
              <ExternalLink size={13} className="text-[#f59e0b]" /> <span>View Tenant Workspace</span>
            </button>
          </div>
          <div className="py-1 border-t border-sa-border">
            {activeMenu.row.status === 'active' ? (
              <button onClick={() => { const id = activeMenu.row._id; setActiveMenu(null); handleCancel(id); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-sa-text-secondary hover:bg-sa-bg transition-colors">
                <XCircle size={13} className="text-rose-500" /> <span>Cancel Subscription</span>
              </button>
            ) : (
              <button onClick={() => { const id = activeMenu.row._id; setActiveMenu(null); handleRenew(id); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors">
                <CheckCircle size={13} /> <span>Activate / Renew Tier</span>
              </button>
            )}
            {activeMenu.row.status === 'trial' && (
              <button onClick={() => { const row = activeMenu.row; setActiveMenu(null); handleOpenExtend(row); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-colors">
                <Calendar size={13} /> <span>Extend Free Trial</span>
              </button>
            )}
            <button onClick={() => { const id = activeMenu.row._id; setActiveMenu(null); handleDelete(id); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors border-t border-sa-border/60">
              <Trash2 size={13} className="text-rose-500" /> <span>Delete Subscription</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Assign Plan Glassmorphic Modal ──────────────────────────────── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-md overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <h2 className="text-base font-black text-sa-text tracking-tight">Assign Subscription Plan</h2>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Select Target Tenant</label>
                <select required value={assignData.companyId} onChange={e => setAssignData({...assignData, companyId: e.target.value})}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                  <option value="">-- Choose Tenant Company --</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Select Plan Tier</label>
                <select required value={assignData.planId} onChange={e => setAssignData({...assignData, planId: e.target.value})}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                  <option value="">-- Choose Subscription Tier --</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.planName} (${p.priceMonthly}/mo)</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Billing Frequency</label>
                <select required value={assignData.billingCycle} onChange={e => handleCycleChange(e.target.value)}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                  <option value="monthly">Monthly Cycle (30 Days)</option>
                  <option value="yearly">Annual / Yearly Cycle (365 Days)</option>
                  <option value="trial">Evaluation Free Trial</option>
                </select>
              </div>

              {/* Subscription Days & Date Range */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#f59e0b]" />
                    <span>Subscription Duration</span>
                  </label>
                  <div className="flex items-center bg-sa-surface p-0.5 rounded-lg border border-sa-border/40 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setAssignDurationMode("calendar")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        assignDurationMode === "calendar"
                          ? "bg-[#f59e0b] text-black shadow-2xs font-black"
                          : "text-sa-text-secondary hover:text-sa-text"
                      }`}
                    >
                      <span>Date-wise</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignDurationMode("days")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        assignDurationMode === "days"
                          ? "bg-[#f59e0b] text-black shadow-2xs font-black"
                          : "text-sa-text-secondary hover:text-sa-text"
                      }`}
                    >
                      <span>Days</span>
                    </button>
                  </div>
                </div>

                {assignDurationMode === "calendar" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9.5px] font-bold uppercase text-sa-text-secondary block mb-0.5">From Date</span>
                      <input 
                        type="date" 
                        value={assignData.startDate} 
                        onChange={(e) => handleAssignDateChange("startDate", e.target.value)}
                        className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-2.5 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9.5px] font-bold uppercase text-sa-text-secondary">Next Date</span>
                        <span className="text-[9.5px] font-black text-[#f59e0b]">{assignData.subscriptionDays || 1} Days</span>
                      </div>
                      <input 
                        type="date" 
                        min={assignData.startDate}
                        value={assignData.endDate} 
                        onChange={(e) => handleAssignDateChange("endDate", e.target.value)}
                        className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-2.5 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" 
                      value={assignData.subscriptionDays} 
                      onChange={(e) => handleAssignDaysChange(e.target.value)}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-md border border-[#f59e0b]/20 pointer-events-none">
                      {assignData.subscriptionDays} Days Active
                    </span>
                  </div>
                )}

                {/* Below: Display Start Date & End Date ONLY */}
                <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-sa-bg/60 border border-sa-border/30 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-sa-text-secondary font-medium">
                    <Calendar size={12} className="text-[#f59e0b] flex-shrink-0" />
                    <span>Start: <strong className="text-sa-text font-bold">{assignData.startDate}</strong></span>
                    <span className="text-sa-text-secondary">•</span>
                    <span>End: <strong className="text-sa-text font-bold">{assignData.endDate}</strong></span>
                  </div>
                  <span className="font-extrabold text-[#f59e0b] text-[10px] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/20 flex-shrink-0 ml-1">
                    {assignData.subscriptionDays} Days
                  </span>
                </div>
              </div>
              
              <div className="flex items-start space-x-2.5 bg-[#f59e0b]/5 p-3.5 rounded-xl border border-[#f59e0b]/20 mt-4 text-xs">
                <AlertCircle size={15} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <p className="font-semibold text-sa-text leading-relaxed">
                  Assigning a new subscription tier will immediately override any active plan or trial for this workspace.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-sa-border mt-4">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-sa-border/30 bg-sa-bg text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Check size={14} />
                  <span>{assignMutation.isPending ? 'Assigning...' : 'Confirm Plan Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Extend Trial Glassmorphic Modal ─────────────────────────────── */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-sm overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                <h2 className="text-base font-black text-sa-text tracking-tight">Extend Subscription / Trial</h2>
              </div>
              <button onClick={() => setIsExtendModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleExtendSubmit} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/10 text-xs font-bold text-sa-text">
                Extending subscription for <span className="text-[#f59e0b]">{selectedSub?.companyId?.companyName}</span>.
                <div className="text-[10.5px] text-sa-text-secondary mt-1 font-semibold">
                  Current Expiry: <span className="text-sa-text font-bold">{selectedSub?.endDate ? new Date(selectedSub.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Extension Subscription Days</label>
                  <span className="text-[10px] font-bold text-[#06B6D4]">+{extendDays} Days</span>
                </div>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  max="365" 
                  value={extendDays} 
                  onChange={e => handleExtendDaysChange(e.target.value)}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" 
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">New Expiry (To Date)</label>
                <input 
                  type="date" 
                  required 
                  value={extendToDate} 
                  onChange={e => handleExtendToDateChange(e.target.value)}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer" 
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-sa-border mt-4">
                <button type="button" onClick={() => setIsExtendModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-sa-border/30 bg-sa-bg text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extendTrialMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Calendar size={14} />
                  <span>{extendTrialMutation.isPending ? 'Extending...' : 'Apply Extension'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Company Subscription Requests Review Drawer / Modal ── */}
      <SuperAdminSubscriptionRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => {
          setIsRequestsModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
};

export default SuperAdminSubscriptions;
