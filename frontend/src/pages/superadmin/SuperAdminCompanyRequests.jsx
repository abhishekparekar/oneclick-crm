import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyRequestsApi, updateCompanyRequestStatusApi,
  convertCompanyRequestApi, deleteCompanyRequestApi, getPlansApi,
  getSuperAdminSubscriptionRequestsApi, updateSubscriptionRequestStatusApi,
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import toast from "react-hot-toast";
import {
  Search, Plus, MoreVertical, Eye, CheckCircle, CheckCircle2, XCircle, Trash2,
  ArrowRightCircle, Clock, Building2, Inbox, User, Briefcase,
  Mail, Phone, Calendar, Sparkles, Shield, Check, Filter,
  ArrowUpRight, ChevronDown, FileText, AlertCircle, MessageSquare,
  RefreshCw, Send, HelpCircle,
} from "lucide-react";

/* ─── Palette-Enforced Status Badge ────────────────────────────────────── */
const RequestStatusBadge = ({ status }) => {
  const badgeStyles = {
    new: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "New Request" },
    contacted: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "Contacted" },
    demo_scheduled: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Demo Scheduled" },
    approved: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/40", label: "Approved" },
    converted: { bg: "bg-[#b45309]/15", text: "text-[#b45309]", border: "border-[#b45309]/40", label: "Converted" },
    rejected: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border/30", label: "Rejected" },
  };
  const current = badgeStyles[status] || badgeStyles.new;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      <span className="w-1 h-1 rounded-full bg-current mr-1.5 opacity-80" />
      {current.label}
    </span>
  );
};

/* ─── Top Summary KPI Card ─────────────────────────────────────────────── */
const RequestKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-sa-surface rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${active ? "border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md" : "border-sa-border hover:border-sa-border/80 hover:bg-sa-bg/30"
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

const SuperAdminCompanyRequests = () => {
  const queryClient = useQueryClient();



  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  // Conversion Form State
  const [convertForm, setConvertForm] = useState({
    planId: "",
    employeeLimit: 10,
    adminName: "",
    adminEmail: "",
    adminPhone: "",
  });

  // ── Company Queries (SubscriptionRequest) state
  const [querySearch, setQuerySearch] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState("all");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryActionMode, setQueryActionMode] = useState(null); // 'resolve' | 'reject' | 'review'
  const [queryActionNotes, setQueryActionNotes] = useState("");

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["superAdminCompanyRequests", statusFilter],
    queryFn: () => getCompanyRequestsApi({ status: statusFilter }),
  });

  const { data: plansData } = useQuery({ queryKey: ["superAdminPlans"], queryFn: () => getPlansApi() });

  // Subscription / Company Queries
  const { data: queriesData, isLoading: queriesLoading, refetch: refetchQueries } = useQuery({
    queryKey: ["superAdminSubscriptionRequests", queryStatusFilter, querySearch],
    queryFn: () => getSuperAdminSubscriptionRequestsApi({ status: queryStatusFilter, search: querySearch }).then(r => r.data),
  });

  const queries = queriesData?.data || [];
  const queryStats = queriesData?.stats || { total: 0, pending: 0, inReview: 0, approved: 0, resolved: 0, rejected: 0 };

  const queryUpdateMut = useMutation({
    mutationFn: ({ id, data }) => updateSubscriptionRequestStatusApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminSubscriptionRequests"] });
      toast.success("Query status updated & company admin notified!");
      setSelectedQuery(null);
      setQueryActionMode(null);
      setQueryActionNotes("");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update query"),
  });

  const handleQueryAction = () => {
    if (!selectedQuery || !queryActionMode) return;
    const statusMap = { resolve: "resolved", reject: "rejected", review: "in_review" };
    queryUpdateMut.mutate({
      id: selectedQuery._id,
      data: { status: statusMap[queryActionMode], adminResponseNotes: queryActionNotes },
    });
  };

  const requests = requestsData?.data?.requests || [];
  const plans = plansData?.data?.plans || [];

  const filteredRequests = requests.filter(req =>
    (req.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.ownerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.requestCode || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQueries = queries.filter(q =>
    (q.companyName || "").toLowerCase().includes(querySearch.toLowerCase()) ||
    (q.requestCode || "").toLowerCase().includes(querySearch.toLowerCase()) ||
    (q.message || "").toLowerCase().includes(querySearch.toLowerCase())
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, data }) => updateCompanyRequestStatusApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminCompanyRequests"]);
      setIsDrawerOpen(false);
    }
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }) => convertCompanyRequestApi(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["superAdminCompanyRequests"]);
      setIsConvertModalOpen(false);
      alert(`Company Created Successfully!\nLogin Email: ${res.data.adminLogin.email}\nTemporary Password: ${res.data.adminLogin.temporaryPassword}\n\nPlease securely save these credentials.`);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to create company from request")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompanyRequestApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminCompanyRequests"])
  });

  const handleStatusChange = (id, newStatus, rejectionReason = "") => {
    statusMutation.mutate({ id, data: { status: newStatus, rejectionReason } });
  };

  const openDrawer = (req) => {
    setSelectedRequest(req);
    setIsDrawerOpen(true);
  };

  const openConvertModal = (req) => {
    setSelectedRequest(req);
    setConvertForm({
      planId: req.requestedPlanId?._id || (plans[0]?._id || ""),
      employeeLimit: req.employeeCount || 10,
      adminName: req.ownerName || "",
      adminEmail: req.ownerEmail || "",
      adminPhone: req.ownerPhone || "",
    });
    setIsConvertModalOpen(true);
    setIsDrawerOpen(false);
  };

  const handleConvertSubmit = (e) => {
    e.preventDefault();
    convertMutation.mutate({ id: selectedRequest._id, data: convertForm });
  };

  /* ─── Table Column Definition ────────────────────────────────────────── */
  const columns = [
    {
      header: "Code",
      accessor: "requestCode",
      render: (row) => (
        <span className="inline-block px-2 py-1 rounded-lg bg-sa-bg border border-sa-border/30 text-[11px] font-mono font-black text-[#f59e0b]">
          {row.requestCode || "#REQ"}
        </span>
      )
    },
    {
      header: "Organization Profile",
      accessor: "company",
      render: (row) => (
        <div className="flex items-center space-x-3 py-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            {(row.companyName || "C").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-black text-sa-text block leading-tight">{row.companyName}</span>
            <span className="text-[10px] font-extrabold text-sa-text-secondary mt-0.5 flex items-center gap-1">
              <Briefcase size={10} className="text-[#f59e0b]" />
              <span>{row.industryType || "General Business"}</span>
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Primary Contact",
      accessor: "owner",
      render: (row) => (
        <div className="py-1">
          <span className="text-xs font-extrabold text-sa-text flex items-center gap-1.5">
            <User size={12} className="text-[#06B6D4]" />
            <span>{row.ownerName}</span>
          </span>
          <span className="text-[11px] font-medium text-sa-text-secondary mt-0.5 block truncate max-w-[190px]">
            {row.ownerEmail}
          </span>
        </div>
      )
    },
    {
      header: "Inbound Source",
      accessor: "source",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-sa-bg text-[10px] font-extrabold text-sa-text-secondary capitalize border border-sa-border/30">
          {row.source || "Direct Inbound"}
        </span>
      )
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <RequestStatusBadge status={row.status} />
    },
    {
      header: "Received Date",
      accessor: "createdAt",
      render: (row) => (
        <span className="text-xs font-bold text-sa-text-secondary flex items-center gap-1.5">
          <Calendar size={12} className="text-sa-text-secondary/70" />
          <span>{new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => openDrawer(row)}
            className="p-1.5 rounded-lg bg-sa-bg hover:bg-[#f59e0b]/10 text-sa-text-secondary hover:text-[#f59e0b] transition-all border border-transparent hover:border-[#f59e0b]/30"
            title="View Request Details"
          >
            <Eye size={14} />
          </button>

          {row.status === 'approved' && (
            <button
              type="button"
              onClick={() => openConvertModal(row)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-xs transition-all hover:opacity-90 flex items-center space-x-1"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              title="Create Company"
            >
              <Sparkles size={11} />
              <span>Convert</span>
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
              className={`p-1.5 rounded-lg border transition-all ${activeMenu?.id === row._id
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
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const QUERY_STATUS_BADGE = {
    pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
    in_review: { label: "In Review", cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700" },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
    provisioned: { label: "Provisioned", cls: "bg-emerald-600 text-white border-emerald-600" },
    resolved: { label: "Resolved ✓", cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700" },
    rejected: { label: "Declined", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700" },
  };

  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-sa-border/30">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight flex items-center gap-2">
            <MessageSquare size={22} className="text-[#f59e0b]" />
            Company Queries &amp; Inquiries
            {queryStats.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-black animate-pulse">
                {queryStats.pending} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">
            Review and respond to subscription requests, plan upgrades, and custom inquiries sent by company admins.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchQueries()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sa-border/30 bg-sa-surface text-xs font-bold text-sa-text-secondary hover:text-sa-text transition-all cursor-pointer self-start"
        >
          <RefreshCw size={13} className={queriesLoading ? "animate-spin text-amber-500" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { id: "all",       label: "Total",     val: queryStats.total,    cls: "border-sa-border" },
          { id: "pending",   label: "Pending",   val: queryStats.pending,  cls: "border-amber-400 bg-amber-500/10" },
          { id: "in_review", label: "In Review", val: queryStats.inReview, cls: "border-cyan-400 bg-cyan-500/10" },
          { id: "resolved",  label: "Resolved",  val: queryStats.resolved, cls: "border-teal-400 bg-teal-500/10" },
          { id: "rejected",  label: "Declined",  val: queryStats.rejected, cls: "border-rose-400 bg-rose-500/10" },
        ].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setQueryStatusFilter(s.id)}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${queryStatusFilter === s.id ? "ring-2 ring-[#f59e0b] shadow-md " + s.cls : "bg-sa-surface " + s.cls}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-sa-text-secondary">{s.label}</p>
            <p className="text-xl font-black text-sa-text leading-none mt-0.5">{s.val}</p>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search by company, request code, or message..."
            value={querySearch}
            onChange={e => setQuerySearch(e.target.value)}
            className="w-full bg-sa-surface border border-sa-border/30 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all"
          />
        </div>
      </div>

      {/* Query Cards */}
      {queriesLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border/30">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading company queries...</p>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border/30 space-y-2">
          <HelpCircle size={32} className="mx-auto text-sa-text-secondary/40" />
          <p className="text-xs font-extrabold text-sa-text-secondary">No queries found for selected filter.</p>
          <p className="text-[11px] text-sa-text-secondary/60">Company admins send queries from their Subscription panel.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredQueries.map(q => {
            const badge = QUERY_STATUS_BADGE[q.status] || QUERY_STATUS_BADGE.pending;
            const isResolved = q.status === "resolved" || q.status === "provisioned";
            return (
              <div key={q._id} className="bg-sa-surface border border-sa-border/30 rounded-2xl p-4 space-y-3 hover:border-[#f59e0b]/40 transition-all shadow-xs">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d97706] to-[#f59e0b] text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                      {(q.companyName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-sa-text">{q.companyName}</span>
                        <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">{q.requestCode}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <p className="text-[10px] text-sa-text-secondary mt-0.5">
                        By {q.requestedBy?.name || q.requestedBy?.email || "Company Admin"} &middot; {formatDate(q.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-sa-bg border border-sa-border/30 text-[10px] font-bold text-sa-text-secondary capitalize">
                      {q.requestType?.replace(/_/g, " ")}
                    </span>
                    {q.priority === "urgent" && <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase">URGENT</span>}
                    {q.priority === "high" && <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-400/40 text-[10px] font-bold uppercase">HIGH</span>}
                  </div>
                </div>

                {/* Message */}
                {q.message && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-xs">
                    <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Company Admin Message</p>
                    <p className="text-sa-text leading-relaxed italic">"{q.message}"</p>
                  </div>
                )}

                {/* Plans */}
                {(q.currentPlanName || q.requestedPlanName) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-sa-bg p-2 rounded-xl border border-sa-border/30">
                      <p className="text-[10px] font-bold uppercase text-sa-text-secondary">Current Plan</p>
                      <p className="font-extrabold text-sa-text">{q.currentPlanName || "—"}</p>
                    </div>
                    <div className="bg-sa-bg p-2 rounded-xl border border-sa-border/30">
                      <p className="text-[10px] font-bold uppercase text-sa-text-secondary">Requested Plan</p>
                      <p className="font-extrabold text-amber-600 dark:text-amber-400">{q.requestedPlanName || "Custom / Not specified"}</p>
                      {q.requestedSeats > 0 && <p className="text-[10px] text-sa-text-secondary">{q.requestedSeats} seats</p>}
                    </div>
                  </div>
                )}

                {/* Admin response */}
                {q.adminResponseNotes && (
                  <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-2.5 text-xs">
                    <p className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-0.5">Super Admin Response</p>
                    <p className="text-sa-text">{q.adminResponseNotes}</p>
                  </div>
                )}

                {/* Actions */}
                {!isResolved ? (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-sa-border/20">
                    {q.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => { setSelectedQuery(q); setQueryActionMode("review"); setQueryActionNotes(""); }}
                        className="px-3 py-1.5 bg-sa-bg hover:bg-sa-border/30 text-sa-text-secondary hover:text-sa-text border border-sa-border/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Clock size={12} /> Mark In Review
                      </button>
                    )}
                    {q.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => { setSelectedQuery(q); setQueryActionMode("reject"); setQueryActionNotes(""); }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <XCircle size={12} /> Decline
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedQuery(q); setQueryActionMode("resolve"); setQueryActionNotes("Your query has been resolved by Super Admin."); }}
                      className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-[11px] font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Resolve &amp; Respond
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-[11px] font-bold pt-1 border-t border-sa-border/20">
                    <CheckCircle2 size={13} /> Query resolved — Company admin notified.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Query Action Modal */}
      {selectedQuery && queryActionMode && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border/30 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-sa-border/30 flex items-center justify-between bg-sa-bg/60">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${queryActionMode === "resolve" ? "bg-teal-500" : queryActionMode === "reject" ? "bg-rose-500" : "bg-cyan-500"}`} />
                <h2 className="text-sm font-extrabold text-sa-text">
                  {queryActionMode === "resolve" ? "Resolve & Respond to Query" : queryActionMode === "reject" ? "Decline Query" : "Mark In Review"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedQuery(null); setQueryActionMode(null); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sa-text-secondary hover:text-sa-text hover:bg-sa-border/30 transition-all font-bold text-base"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-sa-bg border border-sa-border/30 text-xs space-y-1">
                <p className="text-sa-text-secondary font-semibold">Company</p>
                <p className="font-extrabold text-sa-text">
                  {selectedQuery.companyName}
                  <span className="text-amber-600 dark:text-amber-400 font-mono ml-2">{selectedQuery.requestCode}</span>
                </p>
                {selectedQuery.message && (
                  <p className="text-sa-text-secondary italic mt-1">"{selectedQuery.message}"</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-sa-text-secondary mb-1.5">
                  Response / Note to Company Admin <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder={
                    queryActionMode === "resolve"
                      ? "Write your response, resolution details, or instructions..."
                      : queryActionMode === "reject"
                      ? "Explain why this query is declined..."
                      : "Note that this query is being reviewed..."
                  }
                  value={queryActionNotes}
                  onChange={e => setQueryActionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-sa-bg border border-sa-border/30 rounded-xl text-xs font-medium text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] resize-none transition-all"
                />
              </div>
              <p className="text-[10px] text-sa-text-secondary">
                The company admin will receive an in-app notification with your response.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sa-border/30">
                <button
                  type="button"
                  onClick={() => { setSelectedQuery(null); setQueryActionMode(null); }}
                  className="px-4 py-2 border border-sa-border/30 bg-sa-bg text-xs font-extrabold text-sa-text rounded-xl hover:bg-sa-border/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQueryAction}
                  disabled={queryUpdateMut.isPending || !queryActionNotes.trim()}
                  className={`px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all ${
                    queryActionMode === "resolve"
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                      : queryActionMode === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-cyan-600 hover:bg-cyan-700"
                  }`}
                >
                  <Send size={12} />
                  {queryUpdateMut.isPending
                    ? "Sending..."
                    : queryActionMode === "resolve"
                    ? "Send Response & Resolve"
                    : queryActionMode === "reject"
                    ? "Decline & Notify"
                    : "Mark In Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminCompanyRequests;