import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  Magnet, Search, Plus, Phone, MessageSquare, Trash2, Edit2,
  Calendar, Building2, Tag, DollarSign, Filter, RefreshCw,
  ChevronRight, CheckCircle2, AlertCircle, LayoutGrid, List,
  Clock, X, ArrowUpDown, UserPlus, Sparkles
} from "lucide-react";

export default function EmployeeLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [statusMenuLeadId, setStatusMenuLeadId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    notes: "",
  });

  // Fetch Leads (Filtered automatically by backend for employee)
  const { data: leadsData, isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ["employeeMyLeads"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/leads?limit=500");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 15000,
  });

  // Fetch Statuses
  const { data: statusesData } = useQuery({
    queryKey: ["leadsEngineStatuses"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/statuses");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const leadsList = Array.isArray(leadsData) ? leadsData : [];
  const statuses = (Array.isArray(statusesData) ? statusesData : []).filter(
    (s) => s?.name && s.name.trim().toLowerCase() !== "aa"
  );

  // Filtered Leads
  const filteredLeads = leadsList.filter((lead) => {
    const name = (lead.name || "").toLowerCase();
    const phone = (lead.whatsappPhone || lead.phone || "").toLowerCase();
    const email = (lead.email || "").toLowerCase();
    const comp = (lead.company || lead.productService || "").toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = name.includes(q) || phone.includes(q) || email.includes(q) || comp.includes(q);
    const leadStatId = lead.statusId || lead.status?.id || lead.status?._id;
    const matchesStatus =
      selectedStatus === "all" ||
      leadStatId === selectedStatus ||
      (lead.status?.name || "").toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalCount = leadsList.length;
  const contactedCount = leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("contact")).length;
  const inProgressCount = leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("progress") || (l.status?.name || "").toLowerCase().includes("qualif")).length;
  const wonCount = leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("won")).length;

  // Change Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, statusId }) => {
      return api.patch(`/leads-engine/leads/${leadId}`, { statusId });
    },
    onSuccess: () => {
      toast.success("Status updated!");
      queryClient.invalidateQueries({ queryKey: ["employeeMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardLeads"] });
      setStatusMenuLeadId(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadId) => {
      return api.delete(`/leads-engine/leads/${leadId}`);
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      queryClient.invalidateQueries({ queryKey: ["employeeMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardLeads"] });
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter prospect name");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Please enter WhatsApp / phone number");
      return;
    }

    setSavingLead(true);
    try {
      const activeStatusId = form.statusId || (statuses[0] ? (statuses[0].id || statuses[0]._id) : undefined);
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsappPhone: form.phone.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        productService: form.productService.trim(),
        source: form.source || "Walk-in",
        statusId: activeStatusId,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        notes: form.notes.trim(),
        whatsappOptIn: true,
      };

      await api.post("/leads-engine/leads", payload);
      toast.success("Lead captured successfully!");
      setShowAddModal(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Walk-in",
        statusId: statuses[0] ? (statuses[0].id || statuses[0]._id) : "",
        estimatedValue: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["employeeMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["employeeDashboardLeads"] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save lead");
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-3.5 max-w-[1440px] mx-auto pb-16 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#f97316] flex items-center justify-center">
              <Magnet size={18} />
            </span>
            My Leads &amp; Sales Pipeline
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Your personal assigned prospects and captured customer pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* ── 4 KPI Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Total Leads</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
          </div>
          <div className="text-xl font-black text-[#ea580c]">{totalCount}</div>
          <span className="text-[10px] text-slate-400 font-medium">All Assigned</span>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Contacted</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
          </div>
          <div className="text-xl font-black text-[#7c3aed]">{contactedCount}</div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Follow-up Phase</span>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>In Progress</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          </div>
          <div className="text-xl font-black text-[#d97706]">{inProgressCount}</div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Active Pipeline</span>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Won Deals</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          </div>
          <div className="text-xl font-black text-[#059669]">{wonCount}</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Closed Deals</span>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 oc-scroll">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStatus === "all"
                ? "bg-[#f97316] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All ({leadsList.length})
          </button>
          {statuses.map((st) => {
            const stId = st.id || st._id;
            const isSelected = selectedStatus === stId || selectedStatus.toLowerCase() === st.name.toLowerCase();
            return (
              <button
                key={stId}
                onClick={() => setSelectedStatus(stId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                {st.name}
              </button>
            );
          })}
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "cards" ? "bg-white dark:bg-slate-900 text-[#f97316] shadow-2xs font-bold" : "text-slate-500"}`}
            title="Grid Cards View"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-slate-900 text-[#f97316] shadow-2xs font-bold" : "text-slate-500"}`}
            title="List Table View"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Main View Content (Cards Grid vs List Table) ────────────────────── */}
      {leadsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 dark:bg-slate-900/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Magnet size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No leads found</h3>
          <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or add a new prospect.</p>
        </div>
      ) : viewMode === "cards" ? (
        /* ── Compact Cards Grid ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredLeads.map((lead) => {
            const sName = lead.status?.name || "New";
            const sColor = lead.status?.color || (sName.toLowerCase().includes("won") ? "#10b981" : sName.toLowerCase().includes("contact") ? "#8b5cf6" : "#06b6d4");
            const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

            return (
              <div
                key={lead.id || lead._id}
                className="bg-white dark:bg-[#111C24] rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-md transition-all flex flex-col justify-between relative group"
                style={{ borderLeftWidth: "4px", borderLeftColor: sColor }}
              >
                <div>
                  {/* Top Row: Name, Avatar & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border"
                        style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                      >
                        {(lead.name || "LD").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#f97316] transition-colors">
                          {lead.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {lead.whatsappPhone || lead.phone || "No phone"}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setStatusMenuLeadId(statusMenuLeadId === (lead.id || lead._id) ? null : (lead.id || lead._id))}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sColor }} />
                        {sName}
                      </button>

                      {/* Status Selector Dropdown Menu */}
                      {statusMenuLeadId === (lead.id || lead._id) && (
                        <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 p-1 space-y-0.5 animate-fadeIn">
                          {statuses.map((st) => (
                            <button
                              key={st.id || st._id}
                              onClick={() => updateStatusMutation.mutate({ leadId: lead.id || lead._id, statusId: st.id || st._id })}
                              className="w-full text-left px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                              {st.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Info: Company, Requirement & Deal Value */}
                  <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 mb-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-400 font-medium truncate flex-1">
                        {lead.company || lead.productService || "General Prospect"}
                      </span>
                      {lead.estimatedValue && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1">
                          ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    {lead.notes && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Source & 1-Click Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">
                    {lead.source || "Walk-in"}
                  </span>

                  <div className="flex items-center gap-1">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-2xs"
                        title="Chat on WhatsApp"
                      >
                        <MessageSquare size={11} />
                      </a>
                    )}
                    {cleanPhone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-2xs"
                        title="Call Prospect"
                      >
                        <Phone size={11} />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Delete lead "${lead.name}"?`)) {
                          deleteMutation.mutate(lead.id || lead._id);
                        }
                      }}
                      className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List Table View ── */
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Phone / WhatsApp</th>
                  <th className="py-2.5 px-3">Company / Service</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Deal Value</th>
                  <th className="py-2.5 px-3 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeads.map((lead) => {
                  const sName = lead.status?.name || "New";
                  const sColor = lead.status?.color || "#f97316";
                  const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <tr key={lead.id || lead._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                        {lead.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {lead.whatsappPhone || lead.phone || "--"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {lead.company || lead.productService || "General"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${sColor}15`, color: sColor }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sColor }} />
                          {sName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">
                        {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString("en-IN")}` : "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all"
                            >
                              <MessageSquare size={11} />
                            </a>
                          )}
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all"
                            >
                              <Phone size={11} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Lead Modal Dialog ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                  <Magnet size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Add New Lead</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Capture Prospect into Your Pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    WhatsApp / Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Tech"
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Requirement / Product
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HRMS Software"
                    value={form.productService}
                    onChange={(e) => setForm((p) => ({ ...p, productService: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Website Form">Website Form</option>
                    <option value="WhatsApp Chat">WhatsApp Chat</option>
                    <option value="Client Referral">Client Referral</option>
                    <option value="Facebook Ad">Facebook Ad</option>
                    <option value="Google Search">Google Search</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Estimated Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={form.estimatedValue}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Pipeline Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((st) => {
                    const stId = st.id || st._id;
                    const isSelected = form.statusId === stId || (!form.statusId && st === statuses[0]);
                    return (
                      <button
                        type="button"
                        key={stId}
                        onClick={() => setForm((p) => ({ ...p, statusId: stId }))}
                        className={`px-2 py-0.5 text-[10.5px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#f97316] text-white border-[#f97316]"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Notes / Requirement
                </label>
                <textarea
                  rows={2}
                  placeholder="Meeting notes or requirement..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingLead ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
