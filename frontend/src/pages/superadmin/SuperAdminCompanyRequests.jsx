import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompanyRequestsApi, updateCompanyRequestStatusApi,
  convertCompanyRequestApi, deleteCompanyRequestApi, getPlansApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import {
  Search, Plus, MoreVertical, Eye, CheckCircle, CheckCircle2, XCircle, Trash2,
  ArrowRightCircle, Clock, Building2, Inbox, User, Briefcase,
  Mail, Phone, Calendar, Sparkles, Shield, Check, Filter,
  ArrowUpRight, ChevronDown, FileText, AlertCircle
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

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["superAdminCompanyRequests", statusFilter],
    queryFn: () => getCompanyRequestsApi({ status: statusFilter }),
  });

  const { data: plansData } = useQuery({ queryKey: ["superAdminPlans"], queryFn: () => getPlansApi() });

  const requests = requestsData?.data?.requests || [];
  const plans = plansData?.data?.plans || [];

  const filteredRequests = requests.filter(req => 
    (req.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.ownerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.requestCode || "").toLowerCase().includes(searchTerm.toLowerCase())
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
      alert(`Company Tenant Provisioned!\nLogin Email: ${res.data.adminLogin.email}\nTemporary Password: ${res.data.adminLogin.temporaryPassword}\n\nPlease securely save these credentials.`);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to convert request to tenant")
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
              title="Convert to Live Tenant"
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
          <h1 className="text-2xl font-black text-sa-text tracking-tight">Tenant Inbound Requests</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Review onboarding inquiries, demo leads, and provision approved enterprises into live tenants.</p>
        </div>
      </div>

      {/* Analytics KPI Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <RequestKpiCard 
          title="All Inquiries" 
          count={requests.length} 
          subtitle="Total recorded" 
          icon={Inbox} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all"} 
          onClick={() => setStatusFilter("all")} 
        />
        <RequestKpiCard 
          title="New / Pending" 
          count={requests.filter(r => r.status === 'new' || r.status === 'contacted').length} 
          subtitle="Awaiting action" 
          icon={Clock} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "new"} 
          onClick={() => setStatusFilter("new")} 
        />
        <RequestKpiCard 
          title="Approved Leads" 
          count={requests.filter(r => r.status === 'approved').length} 
          subtitle="Ready for provision" 
          icon={CheckCircle2} 
          grad={["#059669", "#10b981"]} 
          active={statusFilter === "approved"} 
          onClick={() => setStatusFilter("approved")} 
        />
        <RequestKpiCard 
          title="Live Provisioned" 
          count={requests.filter(r => r.status === 'converted').length} 
          subtitle="Active tenant orgs" 
          icon={Building2} 
          grad={["#2563eb", "#3b82f6"]} 
          active={statusFilter === "converted"} 
          onClick={() => setStatusFilter("converted")} 
        />
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-sa-surface p-4 rounded-2xl border border-sa-border/30 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search company name, email address, or request code..."
            className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "new", label: "New" },
            { id: "contacted", label: "Contacted" },
            { id: "approved", label: "Approved" },
            { id: "converted", label: "Converted" },
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
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border/30 p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading company requests...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredRequests} pagination={{ total: filteredRequests.length }} />
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
            <button onClick={() => { const row = activeMenu.row; setActiveMenu(null); openDrawer(row); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-sa-text hover:bg-sa-bg transition-colors">
              <Eye size={13} className="text-[#f59e0b]" /> <span>View Full Details</span>
            </button>
          </div>
          <div className="py-1 border-t border-sa-border/30">
            {activeMenu.row.status === 'new' && (
              <button onClick={() => { const id = activeMenu.row._id; setActiveMenu(null); handleStatusChange(id, 'contacted'); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-colors">
                <Clock size={13} /> <span>Mark Contacted</span>
              </button>
            )}
            {activeMenu.row.status !== 'converted' && activeMenu.row.status !== 'rejected' && (
              <button onClick={() => { const row = activeMenu.row; setActiveMenu(null); openConvertModal(row); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors">
                <ArrowRightCircle size={13} /> <span>Convert to Tenant</span>
              </button>
            )}
            <button onClick={() => {
              const id = activeMenu.row._id;
              setActiveMenu(null);
              const reason = window.prompt("Enter reason for rejecting request:");
              if (reason !== null) handleStatusChange(id, 'rejected', reason);
            }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-sa-text-secondary hover:bg-sa-bg transition-colors">
              <XCircle size={13} className="text-rose-500" /> <span>Reject Request</span>
            </button>
          </div>
          <div className="py-1 border-t border-sa-border/30">
            <button onClick={() => { const row = activeMenu.row; setActiveMenu(null); if(window.confirm(`Permanently delete request from ${row.companyName}?`)) deleteMutation.mutate(row._id); }} className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
              <Trash2 size={13} /> <span>Delete Permanently</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Request Details Glassmorphic Drawer ─────────────────────────── */}
      {isDrawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-sa-border/30 overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/80 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <h2 className="text-lg font-black text-sa-text tracking-tight">Request Review Details</h2>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4 hide-scrollbar">
              {/* Top Title Banner */}
              <div className="bg-sa-bg/50 p-5 rounded-2xl border border-sa-border/30 flex items-start justify-between gap-4">
                <div>
                  <RequestStatusBadge status={selectedRequest.status} />
                  <h3 className="text-2xl font-black text-sa-text tracking-tight mt-2">{selectedRequest.companyName}</h3>
                  <p className="text-xs font-mono font-bold text-[#f59e0b] mt-0.5">Tracking Code: {selectedRequest.requestCode}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-black flex-shrink-0 shadow-sm"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                  {(selectedRequest.companyName || "C").substring(0, 2).toUpperCase()}
                </div>
              </div>

              {/* Contact Profile */}
              <div className="bg-sa-surface p-5 rounded-2xl border border-sa-border/30 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2.5 flex items-center gap-1.5">
                  <User size={14} className="text-[#f59e0b]" />
                  <span>Primary Contact Person</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Full Name</span>
                    <span className="font-extrabold text-sa-text">{selectedRequest.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Email Address</span>
                    <span className="font-extrabold text-sa-text truncate block">{selectedRequest.ownerEmail}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Phone Number</span>
                    <span className="font-extrabold text-sa-text">{selectedRequest.ownerPhone || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Organization Requirements */}
              <div className="bg-sa-surface p-5 rounded-2xl border border-sa-border/30 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2.5 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-[#06B6D4]" />
                  <span>Organization Profile & Requirements</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Industry Sector</span>
                    <span className="font-extrabold text-sa-text">{selectedRequest.industryType || 'General Business'}</span>
                  </div>
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Estimated Seats</span>
                    <span className="font-extrabold text-[#f59e0b]">{selectedRequest.employeeCount || '10'} Employees</span>
                  </div>
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Headquarters</span>
                    <span className="font-extrabold text-sa-text">{selectedRequest.city ? `${selectedRequest.city}, ${selectedRequest.state}` : 'Remote / Unspecified'}</span>
                  </div>
                  <div>
                    <span className="text-sa-text-secondary font-semibold block text-[10px] uppercase">Inbound Source</span>
                    <span className="font-extrabold text-sa-text capitalize">{selectedRequest.source}</span>
                  </div>
                </div>
              </div>

              {/* Message / Notes */}
              {selectedRequest.message && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-sa-text uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-[#f59e0b]" />
                    <span>Inquiry Notes & Requirements</span>
                  </h4>
                  <div className="bg-sa-bg/60 p-4 rounded-xl text-xs font-medium text-sa-text leading-relaxed whitespace-pre-wrap border border-sa-border/30">
                    {selectedRequest.message}
                  </div>
                </div>
              )}

              {/* Rejection Reason Box */}
              {selectedRequest.rejectionReason && (
                <div className="bg-sa-bg p-4 rounded-xl border border-[#d97706]/30 text-xs">
                  <span className="font-extrabold text-sa-text-secondary uppercase tracking-wider block mb-1">Rejection Reason</span>
                  <p className="text-sa-text font-bold leading-relaxed">{selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-5 border-t border-sa-border/30 bg-sa-bg/60 flex gap-3 sticky bottom-0">
              {selectedRequest.status === 'approved' ? (
                <button
                  type="button"
                  onClick={() => openConvertModal(selectedRequest)}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Sparkles size={15} />
                  <span>Convert Request to Tenant Workspace</span>
                </button>
              ) : selectedRequest.status !== 'converted' && selectedRequest.status !== 'rejected' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedRequest._id, 'approved')}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                  >
                    <CheckCircle size={15} />
                    <span>Approve Inquiry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Enter rejection reason:");
                      if (reason !== null) handleStatusChange(selectedRequest._id, 'rejected', reason);
                    }}
                    className="px-4 py-3 rounded-xl border border-sa-border/30 bg-sa-surface text-xs font-extrabold text-sa-text-secondary hover:text-sa-text hover:bg-sa-border/30 transition-all"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-sa-border/30 bg-sa-surface text-xs font-extrabold text-sa-text transition-all"
                >
                  Close Drawer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Convert to Company Modal ────────────────────────────────────── */}
      {isConvertModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border/30 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                <h2 className="text-base font-black text-sa-text tracking-tight">Provision Tenant from Inquiry</h2>
              </div>
              <button onClick={() => setIsConvertModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleConvertSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 hide-scrollbar">
              <div className="p-3.5 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-xs font-semibold text-sa-text flex items-start space-x-2.5">
                <Sparkles size={16} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <span>
                  Converting <strong>{selectedRequest.companyName}</strong> into an active enterprise workspace. This creates the primary CompanyAdmin login account instantly.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Select Subscription Tier</label>
                <select required value={convertForm.planId} onChange={e => setConvertForm({...convertForm, planId: e.target.value})}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                  <option value="" disabled>Choose assigned plan...</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.planName} Tier (Max {p.employeeLimit} Seats)</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Employee Seat Quota Override</label>
                <input type="number" min="1" value={convertForm.employeeLimit} onChange={e => setConvertForm({...convertForm, employeeLimit: Number(e.target.value) || 1})}
                  className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
              </div>

              <div className="border-t border-sa-border/30 pt-4 mt-2">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={13} className="text-[#f59e0b]" />
                  <span>Primary Administrator Credentials</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">Admin Full Name</label>
                    <input type="text" required value={convertForm.adminName} onChange={e => setConvertForm({...convertForm, adminName: e.target.value})}
                      className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl px-3.5 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">Admin Login Email</label>
                    <input type="email" required value={convertForm.adminEmail} onChange={e => setConvertForm({...convertForm, adminEmail: e.target.value})}
                      className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl px-3.5 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">Admin Phone Number</label>
                    <input type="text" value={convertForm.adminPhone} onChange={e => setConvertForm({...convertForm, adminPhone: e.target.value})}
                      className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl px-3.5 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-sa-border/30 mt-3">
                <button type="button" onClick={() => setIsConvertModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-sa-border/30 bg-sa-bg text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Sparkles size={14} />
                  <span>{convertMutation.isPending ? "Provisioning..." : "Confirm & Provision Tenant"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCompanyRequests;
