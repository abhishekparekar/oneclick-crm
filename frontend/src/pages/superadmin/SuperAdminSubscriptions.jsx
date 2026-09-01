import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionsApi, getPlansApi, getCompaniesApi,
  assignSubscriptionApi, renewSubscriptionApi, cancelSubscriptionApi,
  extendTrialApi, deleteSubscriptionApi, getSuperAdminSubscriptionRequestsApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import SuperAdminSubscriptionRequestsModal from "../../components/subscription/SuperAdminSubscriptionRequestsModal";
import {
  Search, Plus, MoreVertical, ExternalLink, RefreshCw, Ban,
  Calendar, AlertCircle, CheckCircle, XCircle, CreditCard,
  Building2, Briefcase, DollarSign, Clock, Sparkles, Check,
  ArrowUpRight, ChevronDown, Shield, Trash2
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

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  
  const [assignData, setAssignData] = useState({ companyId: "", planId: "", billingCycle: "monthly" });
  const [extendDays, setExtendDays] = useState(7);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["superAdminSubscriptions"], queryFn: () => getSubscriptionsApi() });
  const { data: plansData } = useQuery({ queryKey: ["superAdminPlans"], queryFn: () => getPlansApi() });
  const { data: companiesData } = useQuery({ queryKey: ["superAdminCompanies"], queryFn: () => getCompaniesApi() });
  const { data: reqsData } = useQuery({ queryKey: ["superAdminSubscriptionRequestsCount"], queryFn: () => getSuperAdminSubscriptionRequestsApi() });

  const pendingRequestsCount = reqsData?.data?.stats?.pending || reqsData?.data?.filter?.(r => r.status === "pending")?.length || 0;

  const rawSubscriptions = Array.isArray(data?.data) ? data?.data : (data?.data?.subscriptions || []);
  const subscriptions = rawSubscriptions;
  const plans = plansData?.data?.plans || [];
  const companies = companiesData?.data?.companies || [];

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const companyName = sub.companyId?.companyName || "";
    const planName = sub.planName || sub.planId?.planName || "";
    const matchesSearch = companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    mutationFn: ({ id, days }) => extendTrialApi(id, days),
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

  const handleRenew = (id) => {
    if (window.confirm("Are you sure you want to activate/renew this subscription for another billing cycle?")) {
      renewMutation.mutate(id);
    }
  };

  const handleCancel = (id) => {
    if (window.confirm("CRITICAL: Are you sure you want to cancel this subscription? The company will lose access depending on active cycle rules.")) {
      cancelMutation.mutate(id);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("DANGER: Are you sure you want to completely REMOVE this subscription? This will delete the subscription record and revert/clear the company's assigned plan tier!")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenExtend = (sub) => {
    setSelectedSub(sub);
    setExtendDays(7);
    setIsExtendModalOpen(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    assignMutation.mutate(assignData);
  };

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    extendTrialMutation.mutate({ id: selectedSub._id, days: extendDays });
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
      render: (row) => (
        <div className="text-xs space-y-0.5 py-1">
          <div className="flex items-center space-x-1.5 text-sa-text-secondary font-medium">
            <span className="text-[10px] uppercase font-bold text-sa-text-secondary/70 w-10">Start:</span>
            <span className="font-extrabold text-sa-text">{row.startDate ? new Date(row.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-sa-text-secondary font-medium">
            <span className="text-[10px] uppercase font-bold text-sa-text-secondary/70 w-10">End:</span>
            <span className="font-extrabold text-sa-text">{row.endDate ? new Date(row.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
          </div>
          {row.status === 'trial' && row.trialEndsAt && (
            <div className="inline-flex items-center space-x-1 text-[10px] font-black text-[#06B6D4] bg-[#06B6D4]/15 px-1.5 py-0.5 rounded border border-[#06B6D4]/30 mt-1">
              <Clock size={10} />
              <span>Trial Ends: {new Date(row.trialEndsAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )
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
            { id: "active", label: "Active" },
            { id: "trial", label: "Trial" },
            { id: "expired", label: "Expired" },
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
                <select required value={assignData.billingCycle} onChange={e => setAssignData({...assignData, billingCycle: e.target.value})}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                  <option value="monthly">Monthly Cycle</option>
                  <option value="yearly">Annual / Yearly Cycle</option>
                  <option value="trial">Evaluation Free Trial</option>
                </select>
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
                <h2 className="text-base font-black text-sa-text tracking-tight">Extend Free Trial</h2>
              </div>
              <button onClick={() => setIsExtendModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleExtendSubmit} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/10 text-xs font-bold text-sa-text">
                Extending evaluation period for <span className="text-[#f59e0b]">{selectedSub?.companyId?.companyName}</span>.
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Extension Duration (Days)</label>
                <input type="number" required min="1" max="90" value={extendDays} onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
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
