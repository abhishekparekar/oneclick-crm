import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAnnouncementsApi, createAnnouncementApi, publishAnnouncementApi,
  cancelAnnouncementApi, deleteAnnouncementApi, getCompaniesApi, getGlobalUsersApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import {
  Plus, Megaphone, Trash2, CheckCircle, Ban, Send, Clock, Edit2,
  Search, Building2, Users, Globe, Mail, Bell, Radio, Calendar,
  CheckCircle2, AlertCircle
} from "lucide-react";

/* ─── Palette-Enforced Status Badge ────────────────────────────────────── */
const AnnouncementStatusBadge = ({ status }) => {
  const statusMap = {
    published: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Published & Active" },
    draft: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "Draft Saved" },
    scheduled: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Queued / Scheduled" },
    cancelled: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border", label: "Cancelled / Revoked" }
  };
  const current = statusMap[status] || statusMap.draft;
  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "published" ? "bg-[#fbbf24]" : status === "scheduled" ? "bg-[#f59e0b]" : "bg-current"}`} />
      <span>{current.label}</span>
    </span>
  );
};

/* ─── Top Broadcast KPI Card ───────────────────────────────────────────── */
const BroadcastKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
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

const SuperAdminAnnouncements = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetType: "all_companies",
    targetCompanies: [],
    targetRoles: [],
    channels: ["in_app"],
    scheduledAt: ""
  });

  const { data: announcementsData, isLoading } = useQuery({ queryKey: ["superAdminAnnouncements"], queryFn: () => getAnnouncementsApi() });
  const { data: companiesData } = useQuery({ queryKey: ["superAdminCompanies"], queryFn: () => getCompaniesApi() });
  const { data: usersData } = useQuery({ queryKey: ["superAdminUsers"], queryFn: () => getGlobalUsersApi() });

  const announcements = announcementsData?.data?.announcements || [];
  const companies = companiesData?.data?.companies || [];

  const filteredAnnouncements = announcements.filter(a => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSearch = (a.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.message || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  /* KPI Counts */
  const totalBroadcasts = announcements.length;
  const publishedCount = announcements.filter(a => a.status === "published").length;
  const draftCount = announcements.filter(a => a.status === "draft").length;
  const scheduledCount = announcements.filter(a => a.status === "scheduled").length;

  const createMutation = useMutation({
    mutationFn: createAnnouncementApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminAnnouncements"]);
      setIsModalOpen(false);
      setFormData({ title: "", message: "", targetType: "all_companies", targetCompanies: [], targetRoles: [], channels: ["in_app"], scheduledAt: "" });
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to create announcement")
  });

  const publishMutation = useMutation({
    mutationFn: publishAnnouncementApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminAnnouncements"])
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAnnouncementApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminAnnouncements"])
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncementApi,
    onSuccess: () => queryClient.invalidateQueries(["superAdminAnnouncements"])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.targetType !== 'selected_companies') payload.targetCompanies = [];
    if (payload.targetType !== 'selected_roles') payload.targetRoles = [];
    if (!payload.scheduledAt) delete payload.scheduledAt;
    
    createMutation.mutate(payload);
  };

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const arr = prev[field] || [];
      if (checked) return { ...prev, [field]: [...arr, value] };
      return { ...prev, [field]: arr.filter(v => v !== value) };
    });
  };

  /* ─── Table Columns Definition ───────────────────────────────────────── */
  const columns = [
    {
      header: "Broadcast Subject & Content",
      accessor: "announcement",
      render: (row) => (
        <div className="flex items-start space-x-3 py-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-xs"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            <Radio size={16} />
          </div>
          <div className="min-w-0 max-w-md">
            <span className="text-xs font-black text-sa-text block truncate leading-tight">{row.title || "Untitled Broadcast"}</span>
            <p className="text-[11px] text-sa-text-secondary mt-1 line-clamp-2 leading-relaxed">{row.message || "No message content recorded."}</p>
          </div>
        </div>
      )
    },
    {
      header: "Target Scope & Routing",
      accessor: "target",
      render: (row) => (
        <div className="py-1 space-y-1.5">
          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sa-bg text-sa-text border border-sa-border">
            {row.targetType === "all_companies" && <Globe size={11} className="text-[#f59e0b]" />}
            {row.targetType === "selected_companies" && <Building2 size={11} className="text-[#06B6D4]" />}
            {row.targetType === "selected_roles" && <Users size={11} className="text-[#fbbf24]" />}
            <span>{(row.targetType || "").replace('_', ' ')}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(row.channels || []).map(c => (
              <span key={c} className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-sa-text-secondary bg-sa-surface border border-sa-border px-1.5 py-0.5 rounded">
                {c === "in_app" ? <Bell size={10} className="text-[#f59e0b]" /> : <Mail size={10} className="text-[#06B6D4]" />}
                <span>{c.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
      )
    },
    {
      header: "Dispatch Schedule",
      accessor: "schedule",
      render: (row) => (
        <div className="py-1">
          {row.scheduledAt ? (
            <div className="flex items-center space-x-1.5 text-xs font-bold text-sa-text">
              <Calendar size={13} className="text-[#06B6D4]" />
              <span>{new Date(row.scheduledAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              <span className="text-[10px] font-mono text-sa-text-secondary">{new Date(row.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1 text-xs font-bold text-sa-text">
              <CheckCircle2 size={13} className="text-[#fbbf24]" />
              <span>Immediate / On Publish</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <AnnouncementStatusBadge status={row.status} />
    },
    {
      header: "Broadcast Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center justify-end space-x-1.5 py-1">
          {row.status === 'draft' && (
            <button 
              type="button"
              onClick={() => { if(window.confirm(`Publish and broadcast "${row.title}" across selected channels right now?`)) publishMutation.mutate(row._id) }} 
              className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-white flex items-center space-x-1 shadow-xs transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              title="Publish & Dispatch Now"
            >
              <Send size={12} />
              <span>Publish Now</span>
            </button>
          )}
          {(row.status === 'published' || row.status === 'scheduled') && (
            <button 
              type="button"
              onClick={() => { if(window.confirm('Revoke and cancel this active announcement broadcast?')) cancelMutation.mutate(row._id) }} 
              className="px-2 py-1 bg-amber-500/10 border border-amber-300 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center space-x-1" 
              title="Revoke / Cancel Broadcast"
            >
              <Ban size={12} />
              <span>Cancel</span>
            </button>
          )}
          <button 
            type="button"
            onClick={() => { if(window.confirm('Delete this announcement record permanently?')) deleteMutation.mutate(row._id) }} 
            className="p-1.5 bg-sa-surface border border-sa-border text-sa-text-secondary hover:text-rose-600 hover:border-rose-300 rounded-lg transition-all" 
            title="Delete Record"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 w-full pb-12">
      {/* Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sa-border">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">System Broadcast & Announcements</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Dispatch high-priority notifications across all tenant workspaces, target specific roles, or schedule timed alerts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-4 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center space-x-2 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
        >
          <Plus size={16} />
          <span>New Broadcast Dispatch</span>
        </button>
      </div>

      {/* Broadcast KPI Summary Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BroadcastKpiCard 
          title="Total Broadcasts" 
          count={totalBroadcasts} 
          subtitle="All recorded items" 
          icon={Megaphone} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all"} 
          onClick={() => setStatusFilter("all")} 
        />
        <BroadcastKpiCard 
          title="Published & Active" 
          count={publishedCount} 
          subtitle="Live notifications" 
          icon={CheckCircle} 
          grad={["#f59e0b", "#f59e0b"]} 
          active={statusFilter === "published"} 
          onClick={() => setStatusFilter("published")} 
        />
        <BroadcastKpiCard 
          title="Draft Broadcasts" 
          count={draftCount} 
          subtitle="Pending review" 
          icon={Edit2} 
          grad={["#f59e0b", "#06B6D4"]} 
          active={statusFilter === "draft"} 
          onClick={() => setStatusFilter("draft")} 
        />
        <BroadcastKpiCard 
          title="Scheduled & Queued" 
          count={scheduledCount} 
          subtitle="Future timed release" 
          icon={Clock} 
          grad={["#d97706", "#fbbf24"]} 
          active={statusFilter === "scheduled"} 
          onClick={() => setStatusFilter("scheduled")} 
        />
      </div>

      {/* High-Density Search & Status Pill Toolbar */}
      <div className="bg-sa-surface p-4 rounded-2xl border border-sa-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input 
            type="text" 
            placeholder="Search broadcast titles or message contents..." 
            className="w-full bg-sa-bg/60 border border-sa-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "all", label: "All Broadcasts", count: totalBroadcasts },
            { id: "draft", label: "Drafts", count: draftCount },
            { id: "published", label: "Published", count: publishedCount },
            { id: "scheduled", label: "Scheduled", count: scheduledCount },
            { id: "cancelled", label: "Cancelled", count: announcements.filter(a => a.status === "cancelled").length }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 border ${
                statusFilter === pill.id
                  ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-xs"
                  : "bg-sa-bg/60 text-sa-text-secondary border-sa-border hover:bg-sa-surface hover:text-sa-text"
              }`}
            >
              <span>{pill.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === pill.id ? "bg-white/20 text-white" : "bg-sa-surface text-sa-text-secondary"}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Section */}
      {isLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading system broadcast and announcement records...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredAnnouncements} pagination={{ total: filteredAnnouncements.length }} />
        </div>
      )}

      {/* ─── Glassmorphic New Announcement Configuration Modal ───────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-2xl my-4 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-sa-border flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-sa-text tracking-tight">Configure New Broadcast Announcement</h2>
                  <p className="text-xs text-sa-text-secondary mt-0.5">Prepare system alerts, targeted notifications, or scheduled updates.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border text-sa-text-secondary hover:text-sa-text font-bold text-lg transition-all">&times;</button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-3 overflow-y-auto max-h-[75vh] hide-scrollbar">
              
              {/* Section 1: Broadcast Content */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <Megaphone size={14} className="text-[#f59e0b]" />
                  <span>Section 1: Broadcast Subject & Main Message</span>
                </h3>
                <div>
                  <label className="block text-xs font-bold text-sa-text mb-1">Headline / Subject Title <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full bg-sa-bg/60 border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all" 
                    placeholder="e.g. Mandatory Platform Maintenance & Upgrade Schedule" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sa-text mb-1">Main Broadcast Message Body <span className="text-rose-500">*</span></label>
                  <textarea 
                    required 
                    rows={4} 
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                    className="w-full bg-sa-bg/60 border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all leading-relaxed" 
                    placeholder="Type the full details of your broadcast message or instruction..." 
                  />
                </div>
              </div>

              {/* Section 2: Audience Routing & Scope */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <Globe size={14} className="text-[#06B6D4]" />
                  <span>Section 2: Target Audience Scope</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "all_companies", label: "All Companies", desc: "Global broadcast across all tenant workspaces", icon: Globe },
                    { id: "selected_companies", label: "Selected Companies", desc: "Pick specific tenant organizations to notify", icon: Building2 },
                    { id: "selected_roles", label: "Specific Roles", desc: "Filter target recipients by user permission role", icon: Users }
                  ].map((scope) => (
                    <div
                      key={scope.id}
                      onClick={() => setFormData({ ...formData, targetType: scope.id })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        formData.targetType === scope.id
                          ? "bg-[#f59e0b]/15 border-[#f59e0b] ring-1 ring-[#f59e0b]/30 shadow-xs"
                          : "bg-sa-bg/40 border-sa-border hover:border-sa-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <scope.icon size={16} className={formData.targetType === scope.id ? "text-[#f59e0b]" : "text-sa-text-secondary"} />
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.targetType === scope.id ? "border-[#f59e0b] bg-[#f59e0b] text-white" : "border-sa-border"}`}>
                          {formData.targetType === scope.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-sa-text">{scope.label}</h4>
                        <p className="text-[10px] text-sa-text-secondary mt-0.5 leading-tight">{scope.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Companies Checkbox Grid */}
                {formData.targetType === 'selected_companies' && (
                  <div className="bg-sa-bg/60 p-4 rounded-xl border border-sa-border space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-extrabold text-sa-text">
                      <span>Select Target Workspace Organizations:</span>
                      <span className="text-[#f59e0b] font-mono">{formData.targetCompanies.length} / {companies.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 hide-scrollbar">
                      {companies.map(c => (
                        <label 
                          key={c._id} 
                          className={`flex items-center space-x-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                            formData.targetCompanies.includes(c._id)
                              ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-sa-text font-bold"
                              : "bg-sa-surface border-sa-border text-sa-text-secondary hover:text-sa-text"
                          }`}
                        >
                          <input type="checkbox" value={c._id} checked={formData.targetCompanies.includes(c._id)} onChange={e => handleCheckboxChange(e, 'targetCompanies')} className="rounded text-[#f59e0b] focus:ring-0 cursor-pointer" />
                          <span className="text-xs truncate">{c.companyName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Roles Checkbox Grid */}
                {formData.targetType === 'selected_roles' && (
                  <div className="bg-sa-bg/60 p-4 rounded-xl border border-sa-border space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-extrabold text-sa-text">
                      <span>Select Target User Access Roles:</span>
                      <span className="text-[#f59e0b] font-mono">{formData.targetRoles.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {['CompanyAdmin', 'HR', 'Manager', 'Employee'].map(r => (
                        <label 
                          key={r} 
                          className={`flex items-center space-x-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            formData.targetRoles.includes(r)
                              ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-sa-text font-bold"
                              : "bg-sa-surface border-sa-border text-sa-text-secondary hover:text-sa-text"
                          }`}
                        >
                          <input type="checkbox" value={r} checked={formData.targetRoles.includes(r)} onChange={e => handleCheckboxChange(e, 'targetRoles')} className="rounded text-[#f59e0b] focus:ring-0 cursor-pointer" />
                          <span className="text-xs font-bold">{r === 'CompanyAdmin' ? 'Company Admin' : r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Delivery Channels & Timing */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <Bell size={14} className="text-[#fbbf24]" />
                  <span>Section 3: Delivery Channels & Release Timing</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sa-text mb-2">Notification Dispatch Channels</label>
                    <div className="space-y-2">
                      <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.channels.includes("in_app") ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-sa-text" : "bg-sa-bg/40 border-sa-border text-sa-text-secondary"
                      }`}>
                        <div className="flex items-center space-x-2.5">
                          <Bell size={15} className="text-[#f59e0b]" />
                          <span className="text-xs font-bold">In-App Dashboard Banner</span>
                        </div>
                        <input type="checkbox" value="in_app" checked={formData.channels.includes("in_app")} onChange={e => handleCheckboxChange(e, 'channels')} className="rounded text-[#f59e0b] focus:ring-0 cursor-pointer" />
                      </label>

                      <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.channels.includes("email") ? "bg-[#06B6D4]/10 border-[#06B6D4]/40 text-sa-text" : "bg-sa-bg/40 border-sa-border text-sa-text-secondary"
                      }`}>
                        <div className="flex items-center space-x-2.5">
                          <Mail size={15} className="text-[#06B6D4]" />
                          <span className="text-xs font-bold">Direct Email Notification Blast</span>
                        </div>
                        <input type="checkbox" value="email" checked={formData.channels.includes("email")} onChange={e => handleCheckboxChange(e, 'channels')} className="rounded text-[#f59e0b] focus:ring-0 cursor-pointer" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sa-text mb-2 flex items-center gap-1">
                      <Clock size={13} className="text-[#06B6D4]" />
                      <span>Schedule Delivery Timestamp (Optional)</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      value={formData.scheduledAt} 
                      onChange={e => setFormData({...formData, scheduledAt: e.target.value})} 
                      className="w-full bg-sa-bg/60 border border-sa-border rounded-xl px-3.5 py-3 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer" 
                    />
                    <p className="text-[11px] text-sa-text-secondary mt-1.5 leading-tight">
                      Leave empty to save as a draft or dispatch immediately using the publish action button after creation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer Bar */}
              <div className="flex items-center justify-end space-x-3 pt-5 border-t border-sa-border bg-sa-surface">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 rounded-xl border border-sa-border bg-sa-surface text-xs font-extrabold text-sa-text hover:bg-sa-bg transition-all"
                >
                  Cancel Configuration
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending} 
                  className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center space-x-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Send size={14} />
                  <span>{formData.scheduledAt ? "Save & Schedule Broadcast" : "Save as Broadcast Draft"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAnnouncements;
