import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  Magnet, Search, Plus, Phone, MessageSquare, Trash2, Edit2,
  Calendar, Building2, Tag, DollarSign, Filter, RefreshCw,
  ChevronRight, CheckCircle2, AlertCircle, LayoutGrid, List,
  Clock, X, ArrowUpDown, UserPlus, Sparkles, Users
} from "lucide-react";

export default function HRLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'list'
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [statusMenuLeadId, setStatusMenuLeadId] = useState(null);

  // Multi-select & Bulk Assign states
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkAssignEmpId, setBulkAssignEmpId] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    assignedTo: "",
    notes: "",
  });

  // Fetch Employees for assignment
  const { data: employeesData } = useQuery({
    queryKey: ["hrEmployeesList"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/assignable-users");
        return res?.data?.data || res?.data?.users || res?.data || [];
      } catch (_) {
        try {
          const res = await api.get("/employees");
          return res?.data?.data || res?.data || [];
        } catch (_) {
          return [];
        }
      }
    },
    staleTime: 60000,
  });
  const employees = Array.isArray(employeesData) ? employeesData : [];

  // Fetch Leads for HR
  const { data: leadsData, isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ["hrMyLeads"],
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
      queryClient.invalidateQueries({ queryKey: ["hrMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["hrDashboardLeads"] });
      setStatusMenuLeadId(null);
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Bulk Assign Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, assignedTo }) => {
      return api.patch("/leads-engine/leads/bulk-assign", { leadIds, assignedTo });
    },
    onSuccess: (_, vars) => {
      const chosenEmp = employees.find((e) => (e.id || e._id) === vars.assignedTo);
      toast.success(`Assigned ${vars.leadIds.length} lead(s) to ${vars.assignedTo ? (chosenEmp?.name || "Employee") : "Unassigned"}!`);
      queryClient.invalidateQueries({ queryKey: ["hrMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["hrDashboardLeads"] });
      setSelectedLeadIds([]);
      setBulkAssignEmpId("");
    },
    onError: () => toast.error("Failed to assign leads"),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadId) => {
      return api.delete(`/leads-engine/leads/${leadId}`);
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      queryClient.invalidateQueries({ queryKey: ["hrMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["hrDashboardLeads"] });
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id || l._id));
    }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter candidate / lead name");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Please enter phone number");
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
        statusId: form.statusId || (statuses[0]?.id || statuses[0]?._id),
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        assignedTo: form.assignedTo || null,
        notes: form.notes.trim() || null,
      };

      await api.post("/leads-engine/leads", payload);
      toast.success("Lead created successfully!");
      queryClient.invalidateQueries({ queryKey: ["hrMyLeads"] });
      queryClient.invalidateQueries({ queryKey: ["hrDashboardLeads"] });
      setShowAddModal(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Walk-in",
        statusId: "",
        estimatedValue: "",
        assignedTo: "",
        notes: "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-16 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Magnet className="text-[#f97316]" size={24} />
            HR Candidate &amp; Leads Pipeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage incoming candidates, sales prospects, assign team members and track deals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw size={14} className={leadsLoading ? "animate-spin text-[#f97316]" : ""} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={3} />
            Add Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Total Leads</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
          </div>
          <div className="text-xl font-black text-[#ea580c]">{totalCount}</div>
        </div>
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Contacted</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
          </div>
          <div className="text-xl font-black text-[#7c3aed]">{contactedCount}</div>
        </div>
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>In Progress</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          </div>
          <div className="text-xl font-black text-[#d97706]">{inProgressCount}</div>
        </div>
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span>Won Deals</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          </div>
          <div className="text-xl font-black text-[#059669]">{wonCount}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 oc-scroll">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStatus === "all" ? "bg-[#f97316] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
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
                  isSelected ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                {st.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "cards" ? "bg-white dark:bg-slate-900 text-[#f97316] shadow-2xs font-bold" : "text-slate-500"}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-slate-900 text-[#f97316] shadow-2xs font-bold" : "text-slate-500"}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

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
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredLeads.map((lead) => {
            const leadId = lead.id || lead._id;
            const isSelected = selectedLeadIds.includes(leadId);
            const sName = lead.status?.name || "New";
            const sColor = lead.status?.color || "#f97316";
            const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

            return (
              <div
                key={leadId}
                className={`bg-white dark:bg-[#111C24] rounded-xl p-3.5 border hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-md transition-all flex flex-col justify-between relative group ${
                  isSelected ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10" : "border-slate-200/80 dark:border-slate-800"
                }`}
                style={{ borderLeftWidth: "4px", borderLeftColor: sColor }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLead(leadId)}
                        className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5 shrink-0"
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border"
                        style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                      >
                        {(lead.name || "LD").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{lead.name}</h4>
                        <span className="text-[10px] text-slate-400 block font-mono">{lead.whatsappPhone || lead.phone || "No phone"}</span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setStatusMenuLeadId(statusMenuLeadId === leadId ? null : leadId)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sColor }} />
                        {sName}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60">
                      <Users size={10} className="text-indigo-500" />
                      {lead.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase">{lead.source || "Walk-in"}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => deleteMutation.mutate(leadId)} className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white flex items-center justify-center cursor-pointer shadow-2xs">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-2.5 px-3 w-10">
                    <input type="checkbox" checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} className="rounded accent-amber-500 cursor-pointer" />
                  </th>
                  <th className="py-2.5 px-3">Candidate / Lead Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Assigned Rep</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeads.map((lead) => {
                  const leadId = lead.id || lead._id;
                  const isSelected = selectedLeadIds.includes(leadId);
                  return (
                    <tr key={leadId} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? "bg-amber-50/30" : ""}`}>
                      <td className="py-2.5 px-3"><input type="checkbox" checked={isSelected} onChange={() => toggleSelectLead(leadId)} className="rounded accent-amber-500 cursor-pointer" /></td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{lead.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{lead.whatsappPhone || lead.phone || "--"}</td>
                      <td className="py-2.5 px-3">{lead.company || "--"}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">{lead.assignedTo?.name || "Unassigned"}</td>
                      <td className="py-2.5 px-3 text-[10px] font-bold">{lead.status?.name || "New"}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">{lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString("en-IN")}` : "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl border border-slate-700 flex items-center justify-between gap-3 min-w-[320px]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-black">{selectedLeadIds.length}</span>
            <span className="text-xs font-bold">Leads Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={bulkAssignEmpId} onChange={(e) => setBulkAssignEmpId(e.target.value)} className="h-8 px-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none">
              <option value="">Assign To…</option>
              <option value="unassigned">-- Unassigned --</option>
              {employees.map((emp) => (
                <option key={emp.id || emp._id} value={emp.id || emp._id}>
                  {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                </option>
              ))}
            </select>
            <button
              onClick={() => bulkAssignMutation.mutate({ leadIds: selectedLeadIds, assignedTo: bulkAssignEmpId === "unassigned" ? null : bulkAssignEmpId })}
              disabled={!bulkAssignEmpId || bulkAssignMutation.isPending}
              className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-xl text-xs cursor-pointer transition-all"
            >
              {bulkAssignMutation.isPending ? "..." : "Assign"}
            </button>
            <button onClick={() => setSelectedLeadIds([])} className="p-1 text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveLead} className="space-y-3">
              <input type="text" placeholder="Full Name *" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
              <input type="tel" placeholder="WhatsApp / Phone *" required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
              <input type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Company" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
                <input type="number" placeholder="Deal Value" value={form.estimatedValue} onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
              </div>
              <div>
                <label className="text-[11px] font-bold">Assign to Team Member</label>
                <select value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900">
                  <option value="">-- Leave Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp._id} value={emp.id || emp._id}>
                      {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                    </option>
                  ))}
                </select>
              </div>
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-1.5 text-xs rounded-lg border dark:bg-slate-900" />
              <button disabled={savingLead} type="submit" className="w-full py-2 text-xs font-bold rounded-lg bg-orange-600 text-white cursor-pointer">
                {savingLead ? "Saving..." : "Save Lead"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
