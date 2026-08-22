import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  Magnet, Search, Plus, Phone, MessageSquare, Trash2, Edit2,
  Calendar, Building2, Tag, DollarSign, Filter, RefreshCw,
  ChevronRight, CheckCircle2, AlertCircle, LayoutGrid, List,
  Clock, X, ArrowUpDown, UserPlus, Sparkles, Smartphone, Mail,
  ExternalLink, Eye, ChevronDown, ChevronUp, Layers, CheckCheck, Send,
  Paperclip, FileText, User
} from "lucide-react";

const formatLeadId = (lead) => {
  if (!lead) return "L-01";
  if (lead.leadId && String(lead.leadId).startsWith("L-")) return lead.leadId;
  const idStr = String(lead._id || lead.id || "").trim();
  if (idStr.length >= 4) return `L-${idStr.slice(-3).toUpperCase()}`;
  return `L-01`;
};

const getLeadDueDate = (lead) => {
  const d = lead.nextFollowUpDate || lead.createdAt || lead.date;
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
};

const getLeadAccentColors = (statusName, customColor) => {
  const s = String(statusName || "new").toLowerCase().trim();

  if (s.includes("won") || s.includes("convert") || s.includes("close") || s.includes("deal") || s.includes("success")) {
    return {
      borderAccent: "border-l-emerald-500",
      statusStyle: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
      statusLabel: statusName ? statusName.toUpperCase() : "WON",
      dot: "bg-emerald-500",
      chipBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    };
  }
  if (s.includes("lost") || s.includes("drop") || s.includes("reject") || s.includes("cancel") || s.includes("fail")) {
    return {
      borderAccent: "border-l-rose-500",
      statusStyle: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
      statusLabel: statusName ? statusName.toUpperCase() : "LOST",
      dot: "bg-rose-500",
      chipBg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
    };
  }
  if (s.includes("qualif") || s.includes("proposal") || s.includes("negotiat") || s.includes("progress") || s.includes("process") || s.includes("follow")) {
    return {
      borderAccent: "border-l-amber-500",
      statusStyle: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
      statusLabel: statusName ? statusName.toUpperCase() : "IN PROGRESS",
      dot: "bg-amber-500",
      chipBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
    };
  }
  if (s.includes("contact") || s.includes("call") || s.includes("reach") || s.includes("touch")) {
    return {
      borderAccent: "border-l-teal-500",
      statusStyle: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700",
      statusLabel: statusName ? statusName.toUpperCase() : "CONTACTED",
      dot: "bg-teal-500",
      chipBg: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
    };
  }
  return {
    borderAccent: "border-l-blue-500",
    statusStyle: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
    statusLabel: statusName ? statusName.toUpperCase() : "NEW LEAD",
    dot: "bg-blue-500",
    chipBg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
  };
};

const resolveLeadStatusName = (lead, statusesList = []) => {
  if (lead.status?.name) return lead.status.name;
  if (typeof lead.status === "string" && !lead.status.match(/^[0-9a-fA-F]{24}$/)) return lead.status;
  const sId = lead.statusId || lead.status?._id || lead.status?.id || lead.status;
  const found = statusesList.find((s) => String(s._id || s.id) === String(sId));
  if (found?.name) return found.name;
  return "New";
};

export default function EmployeeLeads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dateTab, setDateTab] = useState("All Time");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'grid' | 'list'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModalLead, setShowStatusModalLead] = useState(null);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [statusFollowUpDate, setStatusFollowUpDate] = useState("");
  const [statusRemark, setStatusRemark] = useState("");
  const [statusAttachedFile, setStatusAttachedFile] = useState(null);

  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductText, setCustomProductText] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Direct",
    statusId: "",
    estimatedValue: "",
    notes: "",
    nextFollowUpDate: "",
  });

  // Date Formatting & Range Helpers
  const formatDate = (d) =>
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  const getDates = (tabName) => {
    const now = new Date();
    let start = "", end = "";
    if (tabName === "Today") { start = end = formatDate(now); }
    else if (tabName === "Yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); start = end = formatDate(y); }
    else if (tabName === "This Week") {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay());
      const e = new Date(now); e.setDate(s.getDate() + 6);
      start = formatDate(s); end = formatDate(e);
    } else if (tabName === "Last Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (tabName === "This Month") {
      start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
    return { start, end };
  };

  const isLeadInDateRange = (lead, startStr, endStr) => {
    if (!startStr || !endStr) return true;
    const startD = new Date(`${startStr}T00:00:00`);
    const endD = new Date(`${endStr}T23:59:59.999`);

    const checkBetween = (dateVal) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= startD && d <= endD;
    };

    return checkBetween(lead.createdAt) || checkBetween(lead.nextFollowUpDate) || checkBetween(lead.date);
  };

  // Fetch Leads
  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ["employeeMyLeads"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/leads");
      return res?.data?.data || res?.data || [];
    },
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

  // Fetch Products & Services
  const { data: productsData } = useQuery({
    queryKey: ["leadsEngineProducts"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/products");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  const productsList = useMemo(() => {
    if (Array.isArray(productsData)) return productsData;
    return [];
  }, [productsData]);

  const addProductMut = useMutation({
    mutationFn: async ({ name, price }) => {
      return api.post("/leads-engine/products", { name, price });
    },
    onSuccess: (res) => {
      toast.success("Product/Service added successfully!");
      const createdName = res.data?.name || newProductName;
      setForm((p) => ({ ...p, productService: createdName }));
      setNewProductName("");
      setNewProductPrice("");
      setShowAddProductModal(false);
      queryClient.invalidateQueries(["leadsEngineProducts"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to add product"),
  });

  const leadsList = Array.isArray(leadsData) ? leadsData : [];
  const statuses = (Array.isArray(statusesData) ? statusesData : []).filter(
    (s) => s?.name && s.name.trim().toLowerCase() !== "aa"
  );

  // Date Categories Count
  const dateCategories = ["Today", "Yesterday", "This Week", "Last Month", "This Month", "All Time", "Follow-ups Due"];
  const categoryCounts = useMemo(() => {
    return dateCategories.map(cat => {
      let count = 0;
      if (cat === "Follow-ups Due") {
        count = leadsList.filter(l => Boolean(l.nextFollowUpDate) && new Date(l.nextFollowUpDate) <= new Date()).length;
      } else {
        const { start, end } = getDates(cat);
        count = leadsList.filter(l => isLeadInDateRange(l, start, end)).length;
      }
      return { name: cat, count };
    });
  }, [leadsList]);

  // Base Leads for selected date tab
  const baseTabLeads = useMemo(() => {
    return leadsList.filter(lead => {
      if (dateTab === "Follow-ups Due") {
        return Boolean(lead.nextFollowUpDate) && new Date(lead.nextFollowUpDate) <= new Date();
      }
      const { start, end } = getDates(dateTab);
      return isLeadInDateRange(lead, start, end);
    });
  }, [leadsList, dateTab]);

  // Status counts map
  const statusCounts = useMemo(() => {
    const map = { all: baseTabLeads.length };
    statuses.forEach(s => {
      const sId = s._id || s.id;
      map[sId] = baseTabLeads.filter(l => {
        const lStatId = l.statusId || l.status?._id || l.status?.id;
        return lStatId === sId || (l.status?.name || "").toLowerCase() === (s.name || "").toLowerCase();
      }).length;
    });
    return map;
  }, [baseTabLeads, statuses]);

  // Filtered Leads (Search + Status)
  const filteredLeads = useMemo(() => {
    return baseTabLeads.filter(lead => {
      // Status Filter
      if (statusFilter !== "all") {
        const leadStatId = lead.statusId || lead.status?._id || lead.status?.id;
        const matchesStat = leadStatId === statusFilter || (lead.status?.name || "").toLowerCase() === statusFilter.toLowerCase();
        if (!matchesStat) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (lead.name || "").toLowerCase();
        const phone = (lead.whatsappPhone || lead.phone || "").toLowerCase();
        const comp = (lead.company || lead.productService || "").toLowerCase();
        const idStr = formatLeadId(lead).toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !comp.includes(q) && !idStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [baseTabLeads, statusFilter, searchTerm]);

  // Create Lead Mutation
  const createLeadMut = useMutation({
    mutationFn: async (payload) => {
      return api.post("/leads-engine/leads", payload);
    },
    onSuccess: () => {
      toast.success("Lead created successfully!");
      setShowCreateModal(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Direct",
        statusId: "",
        estimatedValue: "",
        notes: "",
        nextFollowUpDate: "",
      });
      queryClient.invalidateQueries(["employeeMyLeads"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create lead"),
  });

  // Update Status Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ leadId, statusId, nextFollowUpDate, remark, file }) => {
      let docObj = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const upRes = await api.post("/tasks/upload-media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uData = upRes.data || {};
        if (uData.fileUrl || uData.url) {
          docObj = {
            name: uData.fileName || file.name,
            url: uData.fileUrl || uData.url,
            type: uData.fileType || file.type || "document",
            size: `${(file.size / 1024).toFixed(1)} KB`,
          };
          await api.post(`/leads-engine/leads/${leadId}/documents`, docObj).catch(() => {});
        }
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
      let noteWithDoc = remark;
      if (docObj) {
        noteWithDoc = remark ? `• [${timeStr}] (Stage Updated & Doc Attached: ${docObj.name}) ${remark}` : `• [${timeStr}] Attached document: ${docObj.name}`;
      } else if (remark) {
        noteWithDoc = `• [${timeStr}] (Stage Updated) ${remark}`;
      }

      return api.patch(`/leads-engine/leads/${leadId}`, {
        statusId,
        nextFollowUpDate: nextFollowUpDate || undefined,
        notes: noteWithDoc ? `${noteWithDoc}\n${showStatusModalLead?.notes || ""}` : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Lead stage, follow-up date & document updated!");
      setShowStatusModalLead(null);
      setStatusRemark("");
      setStatusFollowUpDate("");
      setStatusAttachedFile(null);
      queryClient.invalidateQueries(["employeeMyLeads"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status"),
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Lead name is required");
    if (!form.phone.trim()) return toast.error("Lead phone number is required");

    let cleanPhone = form.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    createLeadMut.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsappPhone: cleanPhone,
      email: form.email.trim(),
      company: form.company.trim(),
      productService: form.productService.trim(),
      source: form.source,
      statusId: form.statusId || (statuses[0]?._id || statuses[0]?.id),
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      notes: form.notes.trim(),
      nextFollowUpDate: form.nextFollowUpDate || undefined,
    });
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-ca-text w-full max-w-[1440px] mx-auto">
      
      {/* ── TOP HEADER BANNER (MATCHING TASKS TOP BANNER) ────────────────────── */}
      <div className="bg-gradient-to-r from-[#171115] via-[#241c22] to-[#171115] rounded-2xl p-4 text-white shadow-md border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-xl shrink-0">
            <Magnet size={22} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide">My Leads &amp; Sales Pipeline</h1>
            <p className="text-[11px] text-orange-200/80 font-medium mt-0.5">
              Manage prospective clients, schedule follow-ups, and send direct WhatsApp messages.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus size={16} /> Create Lead
        </button>
      </div>

      {/* ── Time Boundary Date Pill Tabs (MATCHING TASKS DATE TABS) ─────────── */}
      <div className="bg-ca-surface p-2 rounded-2xl border border-ca-border shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {categoryCounts.map(tab => {
            const active = dateTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => {
                  setDateTab(tab.name);
                  setStatusFilter("all");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  active ? "bg-ca-text text-ca-surface shadow-sm" : "bg-ca-bg hover:bg-ca-border/40 text-ca-text-secondary"
                }`}
              >
                <span>{tab.name}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${active ? "bg-ca-surface text-ca-text" : "bg-ca-surface border border-ca-border/60 text-ca-text"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Status Dropdown, Search Bar & View Mode Toggle ───────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        
        {/* Status Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setIsStatusDropdownOpen(prev => !prev)}
            className="inline-flex items-center gap-2.5 px-4 py-2 bg-ca-surface border border-ca-border rounded-xl text-xs font-extrabold text-ca-text shadow-2xs hover:border-orange-500 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-ca-text-secondary uppercase tracking-wider font-bold text-[10.5px]">STATUS:</span>
              {statusFilter === "all" ? (
                <span className="font-black text-ca-text uppercase">
                  All Leads ({baseTabLeads.length})
                </span>
              ) : (
                (() => {
                  const selName = statuses.find(s => String(s._id || s.id) === String(statusFilter))?.name || statusFilter;
                  const selCfg = getLeadAccentColors(selName);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-black ${selCfg.statusStyle}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selCfg.dot}`} />
                      <span>{selName.toUpperCase()} ({statusCounts[statusFilter] || 0})</span>
                    </span>
                  );
                })()
              )}
            </div>
            {isStatusDropdownOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {/* Status Chips Popup Dropdown */}
          {isStatusDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsStatusDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 z-30 w-[600px] max-w-[90vw] bg-ca-surface rounded-2xl border border-ca-border shadow-xl p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setIsStatusDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-teal-800 text-white border-teal-900 shadow-md ring-2 ring-teal-500/30"
                      : "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800 hover:opacity-90 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>All Leads</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusFilter === "all" ? "bg-white/20 text-white" : "bg-white/80 dark:bg-black/30 text-orange-950 dark:text-orange-200"}`}>
                    {baseTabLeads.length}
                  </span>
                </button>

                {statuses.map(st => {
                  const sId = st._id || st.id;
                  const active = statusFilter === sId;
                  const count = statusCounts[sId] || 0;
                  const chipCfg = getLeadAccentColors(st.name, st.color);
                  return (
                    <button
                      key={sId}
                      onClick={() => {
                        setStatusFilter(sId);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? "bg-teal-800 text-white border-teal-900 shadow-md ring-2 ring-teal-500/30"
                          : `${chipCfg.chipBg} hover:opacity-90 shadow-2xs`
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-1">
                        <span className={`w-2 h-2 rounded-full ${chipCfg.dot}`} />
                        <span className="truncate">{st.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${active ? "bg-white/20 text-white" : "bg-white/80 dark:bg-black/30 text-slate-800 dark:text-slate-100"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right side: Search & View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ca-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads, phone, company..."
              className="pl-9 pr-4 py-2 bg-ca-surface border border-ca-border rounded-xl text-xs font-semibold text-ca-text placeholder-ca-text-secondary focus:outline-none focus:ring-2 focus:ring-teal-500/30 w-56 shadow-2xs"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-ca-surface border border-ca-border rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "grid" ? "bg-ca-bg text-teal-700 font-bold shadow-2xs" : "text-ca-text-secondary"}`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${viewMode === "list" ? "bg-ca-bg text-teal-700 font-bold shadow-2xs" : "text-ca-text-secondary"}`}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

      </div>

      {/* ── LEADS CONTENT: GRID (CARDS) VIEW ─────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const resolvedStatusName = resolveLeadStatusName(lead, statuses);
            const statusConfig = getLeadAccentColors(resolvedStatusName, lead.status?.color);
            const leadIdFormatted = formatLeadId(lead);
            const rawPhone = lead.whatsappPhone || lead.phone || "";

            return (
              <div
                key={lead._id || lead.id}
                onClick={() => navigate(`/employee/leads/${lead._id || lead.id}`)}
                className={`bg-white dark:bg-ca-surface rounded-2xl border border-slate-200 dark:border-ca-border border-l-3 ${statusConfig.borderAccent} p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-orange-500 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative group`}
              >
                <div className="space-y-2">
                  {/* Top Header Row: Lead ID, Source/Value, Due Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 text-[10px] font-mono font-extrabold">
                        {leadIdFormatted}
                      </span>
                      {lead.source && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 border border-orange-200/80 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          {lead.source}
                        </span>
                      )}
                      {lead.estimatedValue && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-black shadow-2xs">
                          ₹{Number(lead.estimatedValue).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium shrink-0">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Due: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{getLeadDueDate(lead)}</strong></span>
                    </div>
                  </div>

                  {/* Lead Title & Name */}
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {lead.name}
                  </h3>

                  {/* Company / Product / Phone subtitle */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal line-clamp-1 leading-relaxed flex items-center gap-1.5">
                    <Building2 size={12} className="text-orange-600 shrink-0" />
                    <span>{lead.company || lead.productService || "Personal Inquiry"}</span>
                    {rawPhone && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{rawPhone}</span>
                      </>
                    )}
                  </p>

                  {/* Next Follow-Up Date Pill (if exists) */}
                  {lead.nextFollowUpDate && (
                    <div className="py-1 px-2 bg-orange-50/80 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800 flex items-center gap-1.5 text-[10px] font-mono font-bold text-orange-900 dark:text-orange-200">
                      <Clock size={11} className="text-orange-600 shrink-0" />
                      <span>Next Follow-Up: <strong>{new Date(lead.nextFollowUpDate).toLocaleDateString("en-GB")}</strong></span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                  {/* Status Pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConfig.statusStyle}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} inline-block mr-1`} />
                    {resolvedStatusName.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {rawPhone && (
                      <a
                        href={`https://wa.me/${rawPhone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Open WhatsApp"
                      >
                        <Smartphone size={11} /> WhatsApp
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStatusModalLead(lead);
                        setSelectedStatusId(lead.statusId || lead.status?._id || lead.status?.id || "");
                        setStatusFollowUpDate(lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().split("T")[0] : "");
                      }}
                      className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Update Stage & Follow-Up Date"
                    >
                      <Layers size={11} /> Stage
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── LEADS CONTENT: TABLE (LIST) VIEW ─────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Lead ID</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Customer / Company</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Contact Number</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Pipeline Status</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Est. Value</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">Follow-Up Date</th>
                  <th className="py-3 px-4 font-bold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border">
                {filteredLeads.map((lead) => {
                  const resolvedStatusName = resolveLeadStatusName(lead, statuses);
                  const statusConfig = getLeadAccentColors(resolvedStatusName, lead.status?.color);
                  const rawPhone = lead.whatsappPhone || lead.phone || "";
                  return (
                    <tr
                      key={lead._id || lead.id}
                      onClick={() => navigate(`/employee/leads/${lead._id || lead.id}`)}
                      className="hover:bg-ca-bg/60 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-black text-ca-text">
                        {formatLeadId(lead)}
                      </td>
                      <td className="p-3.5">
                        <p className="font-black text-ca-text">{lead.name}</p>
                        <p className="text-[10px] text-ca-text-secondary">{lead.company || lead.productService || "General"}</p>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-ca-text">
                        {rawPhone || "—"}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${statusConfig.statusStyle}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          <span>{resolvedStatusName.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-emerald-600">
                        {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3.5 text-ca-text-secondary font-mono">
                        {getLeadDueDate(lead)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/${rawPhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="WhatsApp"
                          >
                            <Smartphone size={14} />
                          </a>
                          <button
                            onClick={() => navigate(`/employee/leads/${lead._id || lead.id}`)}
                            className="p-1.5 bg-ca-bg text-ca-text rounded-lg border border-ca-border hover:bg-ca-surface transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
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

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="bg-ca-surface rounded-3xl border border-ca-border p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <Magnet size={24} />
          </div>
          <h3 className="font-black text-sm text-ca-text">No Leads Found</h3>
          <p className="text-xs text-ca-text-secondary max-w-sm mx-auto">
            There are no leads matching your selected date or status filter. Click "Create Lead" to add a new prospective client.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
          >
            + Create New Lead
          </button>
        </div>
      )}

      {/* ── CREATE LEAD MODAL (PREMIUM REDESIGN) ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0E1520] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp text-xs max-h-[92vh] flex flex-col">
            {/* Modal Luxury Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#080D16] dark:via-[#0E1520] dark:to-[#080D16] px-6 py-4 flex items-center justify-between border-b border-slate-700/60 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md">
                  <Magnet size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide uppercase flex items-center gap-2">
                    New Prospective Client / Lead
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Record client inquiry, assigned product and next follow-up date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
              {/* Section 1: Client & Contact Info */}
              <div className="p-4 bg-slate-50 dark:bg-[#111927]/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User size={13} className="text-orange-600 dark:text-orange-400" />
                  Client & Contact Information
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Client Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Rameshwar Shinde"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Phone / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="e.g. 9689119006"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="client@gmail.com"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Company / Organization
                    </label>
                    <div className="relative">
                      <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={form.company}
                        onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                        placeholder="Easy Business Ltd / Freelance"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Requirement & Valuation */}
              <div className="p-4 bg-slate-50 dark:bg-[#111927]/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Tag size={13} className="text-orange-600 dark:text-orange-400" />
                  Product Requirement & Valuation
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Product / Service Required
                    </label>
                    <div className="relative">
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={isCustomProduct ? "__CUSTOM__" : form.productService}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__CUSTOM__") {
                            setIsCustomProduct(true);
                            setForm((p) => ({ ...p, productService: customProductText }));
                          } else {
                            setIsCustomProduct(false);
                            const chosen = productsList.find((p) => p.name === val);
                            setForm((p) => ({
                              ...p,
                              productService: val,
                              estimatedValue: chosen?.price ? String(chosen.price) : p.estimatedValue,
                            }));
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 cursor-pointer"
                      >
                        <option value="">-- Select Product / Service --</option>
                        {productsList.map((prod) => (
                          <option key={prod._id || prod.id} value={prod.name}>
                            {prod.name} {prod.price ? `(₹${Number(prod.price).toLocaleString()})` : ""}
                          </option>
                        ))}
                        <option value="__CUSTOM__" className="text-blue-600 font-bold">
                          ✍️ Other / Custom Requirement (Type manually)...
                        </option>
                      </select>
                    </div>

                    {/* Custom Product Text Input */}
                    {isCustomProduct && (
                      <div className="mt-2 animate-fadeIn">
                        <input
                          type="text"
                          autoFocus
                          required
                          placeholder="Type custom product or service requirement..."
                          value={customProductText}
                          onChange={(e) => {
                            setCustomProductText(e.target.value);
                            setForm((p) => ({ ...p, productService: e.target.value }));
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-400 dark:border-orange-600 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ring-1 ring-orange-500/30"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Est. Deal Value (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        value={form.estimatedValue}
                        onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                        placeholder="e.g. 50000"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Stage, Follow-Up & Notes */}
              <div className="p-4 bg-slate-50 dark:bg-[#111927]/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl space-y-3">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-orange-600 dark:text-orange-400" />
                  Pipeline Stage & Next Follow-Up
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      value={form.statusId}
                      onChange={(e) => setForm((p) => ({ ...p, statusId: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 cursor-pointer"
                    >
                      {statuses.map((st) => (
                        <option key={st._id || st.id} value={st._id || st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Next Follow-up Date
                    </label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={form.nextFollowUpDate}
                        onChange={(e) => setForm((p) => ({ ...p, nextFollowUpDate: e.target.value }))}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Initial Notes / Inquiry Details
                  </label>
                  <div className="relative">
                    <FileText size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Enter client background, specific expectations or requirement notes..."
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMut.isPending}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-600/20 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{createLeadMut.isPending ? "Saving Lead..." : "Save & Create Lead"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STATUS MODAL FOR GRID CARDS ──────────────────────────────────────── */}
      {showStatusModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-ca-surface border border-ca-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-scaleUp text-xs">
            <div className="flex items-center justify-between border-b border-ca-border pb-3">
              <h3 className="font-black text-sm text-ca-text uppercase tracking-wider flex items-center gap-2">
                <Layers size={18} className="text-orange-600" /> Update Lead Stage
              </h3>
              <button onClick={() => setShowStatusModalLead(null)} className="p-1 hover:bg-black/5 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                  Select Pipeline Status
                </label>
                <select
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-ca-text font-bold text-xs focus:outline-hidden focus:border-teal-500"
                >
                  {statuses.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-teal-600" /> Next Follow-Up Date
                  </span>
                  <span className="text-[10px] text-ca-text-secondary lowercase">(when to contact next)</span>
                </label>
                <input
                  type="date"
                  value={statusFollowUpDate}
                  onChange={(e) => setStatusFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-ca-text font-bold text-xs focus:outline-hidden focus:border-teal-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                  Transition Remark / Call Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  placeholder="Summary of why stage is updated or discussion points..."
                  className="w-full p-3 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-medium focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Document / Proposal Attachment Field */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center gap-1">
                  <Paperclip size={13} className="text-orange-600" /> Attach Proposal / Document (Optional)
                </label>
                {statusAttachedFile ? (
                  <div className="p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={15} className="text-orange-700 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-orange-950 dark:text-orange-200 truncate text-[11px]">{statusAttachedFile.name}</p>
                        <p className="text-[9.5px] text-orange-700 dark:text-orange-300 font-mono">{(statusAttachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusAttachedFile(null)}
                      className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-2.5 bg-ca-bg hover:bg-ca-surface rounded-xl border border-dashed border-ca-border cursor-pointer transition-colors text-ca-text-secondary hover:text-ca-text font-bold text-[11px]">
                    <Paperclip size={14} />
                    <span>Upload Proposal / Quotation / Doc</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setStatusAttachedFile(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ca-border">
                <button
                  onClick={() => setShowStatusModalLead(null)}
                  className="px-4 py-2 rounded-xl border border-ca-border font-bold text-xs hover:bg-ca-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateStatusMut.mutate({
                    leadId: showStatusModalLead._id || showStatusModalLead.id,
                    statusId: selectedStatusId,
                    nextFollowUpDate: statusFollowUpDate,
                    remark: statusRemark,
                    file: statusAttachedFile
                  })}
                  disabled={updateStatusMut.isPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {updateStatusMut.isPending ? "Saving..." : "Save Stage & Follow-Up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NEW PRODUCT / SERVICE MODAL ───────────────────────────────────── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-ca-surface border border-ca-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 animate-scaleUp text-xs">
            <div className="flex items-center justify-between border-b border-ca-border pb-3">
              <h3 className="font-black text-sm text-ca-text uppercase tracking-wider flex items-center gap-2">
                <Tag size={18} className="text-orange-600" /> Add Product / Service
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                  Product / Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. ERP Automation System"
                  className="w-full px-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                  Default Price / Value (₹) (Optional)
                </label>
                <input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-ca-border">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-ca-border font-bold text-xs hover:bg-ca-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addProductMut.isPending || !newProductName.trim()}
                  onClick={() => addProductMut.mutate({ name: newProductName.trim(), price: newProductPrice ? Number(newProductPrice) : 0 })}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {addProductMut.isPending ? "Saving..." : "Save Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
