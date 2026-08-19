import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSupportTicketsApi, getSupportTicketByIdApi, updateSupportTicketStatusApi,
  replyToSupportTicketApi, addInternalNoteSupportTicketApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import {
  Search, MessageSquare, AlertCircle, Clock, CheckCircle, FileText, Send,
  User, Lock, Eye, Building2, ExternalLink, Calendar, Shield, HelpCircle,
  CheckCircle2, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Palette-Enforced Priority Badge ──────────────────────────────────── */
const SupportPriorityBadge = ({ priority }) => {
  const map = {
    urgent: { bg: "bg-[#f59e0b]/20", text: "text-[#f59e0b]", border: "border-[#f59e0b]/40", label: "Urgent Priority" },
    high: { bg: "bg-[#06B6D4]/20", text: "text-[#06B6D4]", border: "border-[#06B6D4]/40", label: "High Priority" },
    medium: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Medium" },
    low: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border", label: "Low Priority" }
  };
  const current = map[priority] || map.medium;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      {current.label}
    </span>
  );
};

/* ─── Palette-Enforced Status Badge ────────────────────────────────────── */
const SupportStatusBadge = ({ status }) => {
  const map = {
    open: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "Open Incident", dot: "bg-[#06B6D4]" },
    inProgress: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "In Progress", dot: "bg-[#f59e0b]" },
    resolved: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Resolved", dot: "bg-[#fbbf24]" },
    closed: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border", label: "Closed Archive", dot: "bg-sa-text-secondary" }
  };
  const current = map[status] || map.open;
  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};

/* ─── Top Support KPI Card ─────────────────────────────────────────────── */
const SupportKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
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

const SuperAdminSupport = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [activeTab, setActiveTab] = useState("reply"); // reply, notes

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({ queryKey: ["superAdminTickets"], queryFn: () => getSupportTicketsApi() });
  
  const { data: ticketDetailData, isLoading: ticketLoading } = useQuery({
    queryKey: ["superAdminTicketDetail", selectedTicketId],
    queryFn: () => getSupportTicketByIdApi(selectedTicketId),
    enabled: !!selectedTicketId
  });

  const tickets = ticketsData?.data?.tickets || [];
  const ticketDetail = ticketDetailData?.data?.ticket;

  const filteredTickets = tickets.filter((ticket) => {
    const subject = ticket.subject || "";
    const compName = ticket.companyId?.companyName || "";
    const reporter = ticket.userId?.name || "";
    const matchesSearch = subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          compName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          reporter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  /* KPI Counts */
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "inProgress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;
  const closedCount = tickets.filter(t => t.status === "closed").length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateSupportTicketStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminTickets"]);
      if (selectedTicketId) queryClient.invalidateQueries(["superAdminTicketDetail", selectedTicketId]);
    }
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }) => replyToSupportTicketApi(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminTicketDetail", selectedTicketId]);
      queryClient.invalidateQueries(["superAdminTickets"]);
      setReplyMessage("");
    }
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }) => addInternalNoteSupportTicketApi(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminTicketDetail", selectedTicketId]);
      setInternalNote("");
    }
  });

  const handleStatusChange = (id, newStatus) => {
    statusMutation.mutate({ id, status: newStatus });
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (replyMessage.trim()) {
      replyMutation.mutate({ id: selectedTicketId, message: replyMessage });
    }
  };

  const handleSendNote = (e) => {
    e.preventDefault();
    if (internalNote.trim()) {
      noteMutation.mutate({ id: selectedTicketId, note: internalNote });
    }
  };

  /* ─── Table Columns Definition ───────────────────────────────────────── */
  const columns = [
    {
      header: "Ticket Subject & ID",
      accessor: "ticket",
      render: (row) => (
        <div className="py-1">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-black bg-sa-bg text-sa-text-secondary border border-sa-border">
              #{(row._id || "").slice(-6).toUpperCase()}
            </span>
            <span 
              onClick={() => setSelectedTicketId(row._id)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer leading-tight truncate max-w-xs"
            >
              {row.subject || "Untitled Incident"}
            </span>
          </div>
          <p className="text-[11px] text-sa-text-secondary mt-1 line-clamp-1 leading-relaxed pl-1">
            {row.message || "No initial message recorded."}
          </p>
        </div>
      )
    },
    {
      header: "Reporter & Workspace",
      accessor: "company",
      render: (row) => (
        <div className="py-1 space-y-0.5">
          {row.companyId ? (
            <span 
              onClick={() => navigate(`/superadmin/companies/${row.companyId?._id || row.companyId}`)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer inline-flex items-center gap-1 leading-tight"
            >
              <Building2 size={11} className="text-[#f59e0b]" />
              <span>{row.companyId?.companyName || "Assigned Workspace"}</span>
            </span>
          ) : (
            <span className="text-xs font-bold text-sa-text-secondary italic">System / Unassigned</span>
          )}
          <div className="flex items-center space-x-1.5 text-[11px] text-sa-text-secondary">
            <User size={10} className="text-[#06B6D4]" />
            <span className="font-semibold text-sa-text">{row.userId?.name || "Unknown User"}</span>
            {row.userId?.role && (
              <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-sa-bg text-sa-text-secondary border border-sa-border">
                {row.userId?.role}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: "Priority Level",
      accessor: "priority",
      render: (row) => <SupportPriorityBadge priority={row.priority} />
    },
    {
      header: "Current Status",
      accessor: "status",
      render: (row) => (
        <div className="py-1">
          <SupportStatusBadge status={row.status} />
        </div>
      )
    },
    {
      header: "Last Activity",
      accessor: "updatedAt",
      render: (row) => (
        <div className="py-1 text-xs font-bold text-sa-text flex items-center space-x-1.5">
          <Clock size={12} className="text-sa-text-secondary" />
          <span>{new Date(row.updatedAt || row.createdAt).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
          <span className="text-[10px] font-mono text-sa-text-secondary">{new Date(row.updatedAt || row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    {
      header: "Resolution Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2 py-1 select-none">
          {/* Quick Status Dropdown */}
          <select
            className="bg-sa-bg/80 border border-sa-border rounded-lg px-2 py-1 text-[11px] font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] cursor-pointer"
            value={row.status}
            onChange={(e) => handleStatusChange(row._id, e.target.value)}
          >
            <option value="open">Open</option>
            <option value="inProgress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button 
            type="button"
            onClick={() => setSelectedTicketId(row._id)} 
            className="px-3 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-xs hover:opacity-90 transition-all flex items-center space-x-1"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
            title="Inspect Ticket Investigation Feed"
          >
            <MessageSquare size={13} />
            <span>Inspect</span>
          </button>
        </div>
      )
    }
  ];

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 w-full pb-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sa-border">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">Customer Support & Incident Desk</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Investigate bug reports, resolve customer support queries, and coordinate multi-tenant communications.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-sa-surface border border-sa-border text-xs font-extrabold text-sa-text flex items-center gap-1.5">
            <HelpCircle size={13} className="text-[#f59e0b]" />
            <span>SaaS Incident Feed</span>
          </span>
        </div>
      </div>

      {/* Support KPI Summary Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SupportKpiCard 
          title="Total Support Tickets" 
          count={totalTickets} 
          subtitle="All recorded inquiries" 
          icon={MessageSquare} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all" && priorityFilter === "all"} 
          onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }} 
        />
        <SupportKpiCard 
          title="Open Incidents" 
          count={openCount} 
          subtitle="Awaiting dispatch" 
          icon={AlertCircle} 
          grad={["#f59e0b", "#f59e0b"]} 
          active={statusFilter === "open"} 
          onClick={() => setStatusFilter("open")} 
        />
        <SupportKpiCard 
          title="In Progress" 
          count={inProgressCount} 
          subtitle="Under investigation" 
          icon={Clock} 
          grad={["#f59e0b", "#06B6D4"]} 
          active={statusFilter === "inProgress"} 
          onClick={() => setStatusFilter("inProgress")} 
        />
        <SupportKpiCard 
          title="Resolved Tickets" 
          count={resolvedCount} 
          subtitle="Fix deployed" 
          icon={CheckCircle} 
          grad={["#d97706", "#fbbf24"]} 
          active={statusFilter === "resolved"} 
          onClick={() => setStatusFilter("resolved")} 
        />
        <SupportKpiCard 
          title="Closed Archives" 
          count={closedCount} 
          subtitle="Archived history" 
          icon={FileText} 
          grad={["#b45309", "#06B6D4"]} 
          active={statusFilter === "closed"} 
          onClick={() => setStatusFilter("closed")} 
        />
      </div>

      {/* Search & Status/Priority Filter Toolbar */}
      <div className="bg-sa-surface p-4 rounded-2xl border border-sa-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input 
            type="text" 
            placeholder="Search ticket subject, ID, tenant company, or reporter..." 
            className="w-full bg-sa-bg/60 border border-sa-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select 
            className="bg-sa-bg/60 border border-sa-border rounded-xl px-3 py-2 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer" 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "all", label: "All Tickets", count: totalTickets },
              { id: "open", label: "Open", count: openCount },
              { id: "inProgress", label: "In Progress", count: inProgressCount },
              { id: "resolved", label: "Resolved", count: resolvedCount },
              { id: "closed", label: "Closed", count: closedCount }
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
      </div>

      {/* Data Table Section */}
      {ticketsLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading customer support queries and incident records...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredTickets} pagination={{ total: filteredTickets.length }} />
        </div>
      )}

      {/* ─── Glassmorphic Incident Resolution Investigation Drawer ───────── */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface border-l border-sa-border w-full max-w-3xl h-full shadow-2xl flex flex-col overflow-hidden">
            {ticketLoading || !ticketDetail ? (
              <div className="flex-1 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Header Section */}
                <div className="px-6 py-5 border-b border-sa-border bg-sa-bg/60 flex justify-between items-start flex-shrink-0">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-black bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                        #{(ticketDetail._id || "").slice(-6).toUpperCase()}
                      </span>
                      <SupportPriorityBadge priority={ticketDetail.priority} />
                      <SupportStatusBadge status={ticketDetail.status} />
                    </div>
                    <h2 className="text-lg font-black text-sa-text tracking-tight leading-snug">{ticketDetail.subject}</h2>
                    <div className="flex items-center space-x-3 text-xs text-sa-text-secondary font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-[#06B6D4]" />
                        <span>Created: {new Date(ticketDetail.createdAt).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTicketId(null)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
                </div>

                {/* Reporter Info & Quick Status Toolbar */}
                <div className="px-6 py-3.5 border-b border-sa-border bg-sa-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs"
                      style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                      {(ticketDetail.userId?.name || "U").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-black text-sa-text block leading-tight">{ticketDetail.userId?.name || "Reporter"}</span>
                      <span className="text-[11px] font-semibold text-sa-text-secondary inline-flex items-center gap-1">
                        <span>{ticketDetail.companyId?.companyName || "Assigned Workspace"}</span>
                        {ticketDetail.userId?.role && <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-sa-bg text-sa-text-secondary border border-sa-border">{ticketDetail.userId?.role}</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-sa-text-secondary">Change Status:</span>
                    <select 
                      className="text-xs font-extrabold border border-sa-border rounded-xl px-3 py-1.5 bg-sa-bg text-sa-text focus:outline-none focus:border-[#f59e0b] cursor-pointer shadow-xs"
                      value={ticketDetail.status}
                      onChange={(e) => handleStatusChange(ticketDetail._id, e.target.value)}
                    >
                      <option value="open">Open Incident</option>
                      <option value="inProgress">In Progress</option>
                      <option value="resolved">Resolved & Verified</option>
                      <option value="closed">Closed Archive</option>
                    </select>
                  </div>
                </div>

                {/* Conversation Investigation Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-sa-bg/40 hide-scrollbar">
                  {/* Initial Customer Message Card */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-black text-sa-text">{ticketDetail.userId?.name || "Customer Reporter"}</span>
                      <span className="text-[10px] font-mono text-sa-text-secondary">• {new Date(ticketDetail.createdAt).toLocaleString()}</span>
                      <span className="px-2 py-0.2 rounded text-[9px] font-extrabold uppercase bg-sa-surface border border-sa-border text-sa-text-secondary">Initial Report</span>
                    </div>
                    <div className="bg-sa-surface p-4 rounded-2xl rounded-tl-sm border border-sa-border shadow-xs text-xs text-sa-text whitespace-pre-wrap leading-relaxed font-medium">
                      {ticketDetail.message}
                    </div>
                  </div>

                  {/* Timeline Replies & Notes */}
                  {[...(ticketDetail.replies || []), ...(ticketDetail.internalNotes || [])]
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                    .map((item, idx) => {
                      const isNote = !!item.note;
                      if (isNote) {
                        return (
                          <div key={`note-${idx}`} className="flex flex-col space-y-1.5 items-end pl-8 sm:pl-16">
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 flex items-center gap-1">
                                <Lock size={10} />
                                <span>Internal Engineering Note</span>
                              </span>
                              <span className="text-[10px] font-mono text-sa-text-secondary">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="bg-[#06B6D4]/10 p-4 rounded-2xl rounded-tr-sm border border-[#06B6D4]/30 text-xs text-sa-text whitespace-pre-wrap leading-relaxed font-semibold shadow-xs">
                              {item.note}
                            </div>
                          </div>
                        );
                      } else {
                        const isStaff = item.userId?.role === 'SuperAdmin';
                        return (
                          <div key={`reply-${idx}`} className={`flex flex-col space-y-1.5 ${isStaff ? 'items-end pl-8 sm:pl-16' : 'items-start pr-8 sm:pr-16'}`}>
                            <div className="flex items-center space-x-2 text-xs">
                              {isStaff ? (
                                <>
                                  <span className="text-[10px] font-mono text-sa-text-secondary">{new Date(item.createdAt).toLocaleString()}</span>
                                  <span className="font-black text-[#f59e0b] inline-flex items-center gap-1">
                                    <Shield size={12} className="text-[#f59e0b]" />
                                    <span>SuperAdmin Support Engineering</span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="font-black text-sa-text">{item.userId?.name || "Customer Reply"}</span>
                                  <span className="text-[10px] font-mono text-sa-text-secondary">• {new Date(item.createdAt).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                            <div className={`p-4 rounded-2xl border text-xs whitespace-pre-wrap leading-relaxed shadow-xs font-medium ${
                              isStaff 
                                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-sa-text rounded-tr-sm' 
                                : 'bg-sa-surface border-sa-border text-sa-text rounded-tl-sm'
                            }`}>
                              {item.message}
                            </div>
                          </div>
                        );
                      }
                  })}
                </div>

                {/* Interactive Composer Footer */}
                <div className="border-t border-sa-border bg-sa-surface p-5 flex-shrink-0">
                  <div className="flex space-x-4 mb-3 border-b border-sa-border pb-2">
                    <button 
                      onClick={() => setActiveTab('reply')} 
                      className={`text-xs font-extrabold pb-1.5 transition-colors flex items-center space-x-1.5 ${activeTab === 'reply' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b]' : 'text-sa-text-secondary hover:text-sa-text'}`}
                    >
                      <MessageSquare size={14} />
                      <span>Public Reply to Customer</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('notes')} 
                      className={`text-xs font-extrabold pb-1.5 transition-colors flex items-center space-x-1.5 ${activeTab === 'notes' ? 'text-[#06B6D4] border-b-2 border-[#06B6D4]' : 'text-sa-text-secondary hover:text-sa-text'}`}
                    >
                      <Lock size={14} />
                      <span>Internal Engineering Note</span>
                    </button>
                  </div>
                  
                  {activeTab === 'reply' ? (
                    <form onSubmit={handleSendReply} className="space-y-3">
                      <textarea 
                        className="w-full bg-sa-bg/60 border border-sa-border rounded-xl p-3 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all min-h-[90px] leading-relaxed" 
                        placeholder="Type your official reply to the customer (they will be notified via email and in-app banner)..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        required
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-sa-text-secondary flex items-center gap-1">
                          <CheckCircle2 size={13} className="text-[#fbbf24]" />
                          <span>Visible to customer contact & tenant workspace admins.</span>
                        </span>
                        <button 
                          type="submit" 
                          disabled={replyMutation.isPending} 
                          className="px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center space-x-2 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                        >
                          <Send size={14} />
                          <span>Send Official Reply</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSendNote} className="space-y-3">
                      <textarea 
                        className="w-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-xl p-3 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/60 focus:outline-none focus:border-[#06B6D4] transition-all min-h-[90px] leading-relaxed" 
                        placeholder="Record internal root-cause analysis, staff investigation steps, or debugging notes..."
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        required
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#06B6D4] flex items-center gap-1">
                          <Lock size={13} />
                          <span>Strictly private — visible ONLY to SuperAdmin engineering staff.</span>
                        </span>
                        <button 
                          type="submit" 
                          disabled={noteMutation.isPending} 
                          className="bg-[#06B6D4] text-white hover:opacity-90 px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
                        >
                          <Lock size={14} />
                          <span>Save Internal Note</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSupport;
