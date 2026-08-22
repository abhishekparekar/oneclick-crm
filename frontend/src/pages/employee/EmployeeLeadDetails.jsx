import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, Magnet, Phone, MessageSquare, Calendar, Building,
  DollarSign, Tag, CheckCircle2, AlertCircle, Clock, Send,
  Paperclip, ExternalLink, X, Plus, Sparkles, User, ShieldCheck,
  CheckCircle, ChevronRight, Layers, FileText, Smartphone, Mail, CheckCheck
} from "lucide-react";

const formatLeadId = (lead) => {
  if (!lead) return "L-01";
  if (lead.leadId && String(lead.leadId).startsWith("L-")) return lead.leadId;
  const idStr = String(lead._id || lead.id || "").trim();
  if (idStr.length >= 4) return `L-${idStr.slice(-3).toUpperCase()}`;
  return `L-01`;
};

export default function EmployeeLeadDetails() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'whatsapp' | 'timeline'
  const [newNote, setNewNote] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [statusRemark, setStatusRemark] = useState("");

  // WhatsApp composer state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [varValues, setVarValues] = useState({ 1: "", 2: "", 3: "" });
  const [mediaUrl, setMediaUrl] = useState("");
  const [sendingCloudMsg, setSendingCloudMsg] = useState(false);

  // Fetch Lead Details
  const { data: leadData, isLoading, refetch } = useQuery({
    queryKey: ["employeeLeadDetails", leadId],
    queryFn: async () => {
      const res = await api.get(`/leads-engine/leads/${leadId}`);
      return res?.data?.data || res?.data || null;
    },
    enabled: Boolean(leadId),
  });

  // Fetch Statuses
  const { data: statusesData } = useQuery({
    queryKey: ["leadsEngineStatuses"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/statuses");
      return res?.data?.data || res?.data || [];
    },
  });

  // Fetch WhatsApp Templates
  const { data: templatesData } = useQuery({
    queryKey: ["leadsWhatsAppTemplates"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/mobile/whatsapp/templates").catch(() => ({ data: { templates: [] } }));
      return res?.data?.templates || [];
    },
  });

  const lead = leadData || {};
  const statuses = Array.isArray(statusesData) ? statusesData : [];
  const templates = Array.isArray(templatesData) ? templatesData : [];

  useEffect(() => {
    if (lead) {
      setSelectedStatusId(lead.statusId || lead.status?._id || lead.status?.id || "");
      if (lead.nextFollowUpDate) {
        setNextFollowUpDate(new Date(lead.nextFollowUpDate).toISOString().split("T")[0]);
      }
      const rawPhone = lead.whatsappPhone || lead.phone || "";
      setVarValues({
        1: lead.name || "Client",
        2: lead.company || lead.productService || "Business Services",
        3: rawPhone.startsWith("+") ? rawPhone : `+91 ${rawPhone}`,
        4: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        5: lead.status?.name || "Active",
        6: "https://oneclick.in",
      });
    }
  }, [lead]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  const [statusAttachedFile, setStatusAttachedFile] = useState(null);
  const [directUploadingDoc, setDirectUploadingDoc] = useState(false);

  // Update Status Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ statusId, note, nextFollowUp, file }) => {
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
      let noteWithDoc = note;
      if (docObj) {
        noteWithDoc = note ? `• [${timeStr}] (Stage Updated & Doc Attached: ${docObj.name}) ${note}` : `• [${timeStr}] Attached document: ${docObj.name}`;
      } else if (note) {
        noteWithDoc = `• [${timeStr}] (Stage Updated) ${note}`;
      }

      return api.patch(`/leads-engine/leads/${leadId}`, {
        statusId,
        notes: noteWithDoc ? `${noteWithDoc}\n${lead.notes || ""}` : undefined,
        nextFollowUpDate: nextFollowUp || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Lead status & documents updated!");
      setShowStatusModal(false);
      setStatusRemark("");
      setStatusAttachedFile(null);
      queryClient.invalidateQueries(["employeeLeadDetails", leadId]);
      queryClient.invalidateQueries(["employeeMyLeads"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status"),
  });

  // Direct Document Upload Handler for Documents Card
  const handleDirectDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDirectUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const upRes = await api.post("/tasks/upload-media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uData = upRes.data || {};
      if (uData.fileUrl || uData.url) {
        const docObj = {
          name: uData.fileName || file.name,
          url: uData.fileUrl || uData.url,
          type: uData.fileType || file.type || "document",
          size: `${(file.size / 1024).toFixed(1)} KB`,
        };
        await api.post(`/leads-engine/leads/${leadId}/documents`, docObj);
        toast.success("Document attached to lead!");
        refetch();
      }
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setDirectUploadingDoc(false);
    }
  };

  // Add Note Mutation
  const addNoteMut = useMutation({
    mutationFn: async ({ noteText, followUp }) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
      const noteEntry = `• [${timeStr}] ${noteText}`;
      const updatedNotes = lead?.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;
      return api.patch(`/leads-engine/leads/${leadId}`, {
        notes: updatedNotes,
        nextFollowUpDate: followUp || lead.nextFollowUpDate,
      });
    },
    onSuccess: () => {
      toast.success("Note added to timeline!");
      setNewNote("");
      queryClient.invalidateQueries(["employeeLeadDetails", leadId]);
    },
    onError: () => toast.error("Failed to add note"),
  });

  // Send WhatsApp Cloud API
  const handleSendCloudWhatsApp = async (tpl) => {
    const rawPhone = lead.whatsappPhone || lead.phone;
    if (!rawPhone) return toast.error("Lead phone number is missing!");
    const targetTpl = tpl || selectedTemplate;
    if (!targetTpl) return toast.error("Please select a template");

    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    setSendingCloudMsg(true);
    try {
      const res = await api.post("/leads-engine/mobile/whatsapp/send", {
        leadId,
        recipient: cleanPhone,
        templateName: targetTpl.name,
        params: [varValues[1] || lead.name, varValues[2] || "CRM Services", varValues[3] || cleanPhone],
        variables: varValues,
        variableValues: varValues,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: targetTpl.headerType || "NONE",
      });

      if (res.data?.success) {
        toast.success("WhatsApp message dispatched successfully via Meta Cloud API! ⚡");
        refetch();
      }
    } catch (err) {
      toast.error(err.response?.data?.metaError || err.response?.data?.message || "Failed to send WhatsApp message");
    } finally {
      setSendingCloudMsg(false);
    }
  };

  const getStatusColor = (statusName) => {
    const s = String(statusName || "").toLowerCase();
    if (s.includes("won") || s.includes("convert") || s.includes("close") || s.includes("deal"))
      return "bg-emerald-500/30 text-emerald-200 border-emerald-400/50";
    if (s.includes("lost") || s.includes("drop") || s.includes("reject") || s.includes("cancel"))
      return "bg-rose-500/30 text-rose-200 border-rose-400/50";
    if (s.includes("qualif") || s.includes("progress") || s.includes("negotiat") || s.includes("proposal"))
      return "bg-amber-500/30 text-amber-200 border-amber-400/50";
    if (s.includes("contact") || s.includes("call") || s.includes("follow"))
      return "bg-teal-500/30 text-teal-200 border-teal-400/50";
    return "bg-blue-500/30 text-blue-200 border-blue-400/50";
  };

  const resolvedStatusName =
    lead?.status?.name ||
    statuses.find((st) => String(st._id || st.id) === String(lead?.statusId || lead?.status))?.name ||
    "NEW LEAD";

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 font-sans text-ca-text w-full max-w-[1440px] mx-auto">
      
      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/employee/leads")}
          className="px-3.5 py-1.5 bg-ca-surface hover:bg-ca-bg text-ca-text border border-ca-border rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          <ArrowLeft size={15} /> Back to My Leads
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-ca-text-secondary uppercase tracking-wider">
            LEAD ID:
          </span>
          <span className="px-2.5 py-1 bg-ca-surface border border-ca-border rounded-lg text-xs font-mono font-black text-ca-text shadow-2xs">
            {formatLeadId(lead)}
          </span>
        </div>
      </div>

      {/* ── HERO LUXURY BANNER ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#171115] via-[#241c22] to-[#171115] rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-orange-500/30">
        
        {/* Left Side: Icon, Name & Status */}
        <div className="flex items-start md:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-orange-500/20 text-orange-400 backdrop-blur-md flex items-center justify-center font-black text-xl border border-orange-500/30 shadow-md shrink-0 mt-0.5 md:mt-0">
            <Magnet size={22} />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white truncate max-w-xl">
                {lead.name || "Prospective Client"}
              </h1>

              {/* Status Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${getStatusColor(resolvedStatusName)}`}>
                {resolvedStatusName.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-orange-200/80 font-medium flex-wrap">
              <span>Company / Service:</span>
              <span className="font-black text-white">{lead.company || lead.productService || "General Services"}</span>
              {lead.estimatedValue && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-black">₹{Number(lead.estimatedValue).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Actions */}
        <div className="shrink-0 self-stretch md:self-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition-all cursor-pointer border border-orange-400/40"
          >
            <Layers size={14} />
            <span>Update Stage / Status</span>
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer border border-emerald-400/40"
          >
            <Smartphone size={14} />
            <span>Send WhatsApp ⚡</span>
          </button>
        </div>

      </div>

      {/* ── TABS NAVIGATION BAR ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-ca-border pb-2">
        {[
          { id: "overview", label: "Lead Specification & Contact", icon: FileText },
          { id: "whatsapp", label: "WhatsApp Cloud Messenger", icon: Smartphone },
          { id: "timeline", label: "Notes & Timeline History", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                active
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-ca-surface text-ca-text-secondary hover:text-ca-text hover:bg-ca-bg"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & LEAD SPECIFICATION ──────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (6/12): Contact Info & Documents */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Contact Details Card */}
            <div className="bg-ca-surface rounded-2xl border border-ca-border p-4 sm:p-5 shadow-2xs space-y-3">
              <h2 className="font-black text-ca-text text-xs uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-2.5">
                <User size={16} className="text-orange-600" /> Contact &amp; Business Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-1">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider flex items-center gap-1">
                    <Phone size={11} className="text-emerald-600" /> Primary Phone
                  </p>
                  <p className="text-xs font-black text-ca-text font-mono">
                    {lead.phone || lead.whatsappPhone || "—"}
                  </p>
                </div>

                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-1">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider flex items-center gap-1">
                    <Smartphone size={11} className="text-emerald-600" /> WhatsApp Number
                  </p>
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    {lead.whatsappPhone || lead.phone || "—"}
                  </p>
                </div>

                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-1">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider flex items-center gap-1">
                    <Mail size={11} className="text-blue-600" /> Email Address
                  </p>
                  <p className="text-xs font-bold text-ca-text truncate">
                    {lead.email || "No email provided"}
                  </p>
                </div>

                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-1">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider flex items-center gap-1">
                    <Building size={11} className="text-orange-600" /> Company / Organization
                  </p>
                  <p className="text-xs font-bold text-ca-text truncate">
                    {lead.company || "Individual"}
                  </p>
                </div>
              </div>
            </div>

            {/* Attached Documents & Quotations Card */}
            <div className="bg-ca-surface rounded-2xl border border-ca-border p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="border-b border-ca-border pb-2.5 flex items-center justify-between">
                <h2 className="font-black text-ca-text text-xs uppercase tracking-wider flex items-center gap-2">
                  <Paperclip size={16} className="text-orange-600" /> Documents &amp; Files ({lead.documents?.length || 0})
                </h2>

                <label className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs">
                  <Plus size={13} />
                  <span>{directUploadingDoc ? "Uploading..." : "+ Attach File"}</span>
                  <input
                    type="file"
                    disabled={directUploadingDoc}
                    onChange={handleDirectDocUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {Array.isArray(lead.documents) && lead.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {lead.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 bg-ca-bg hover:bg-orange-50/50 dark:hover:bg-orange-950/20 border border-ca-border hover:border-orange-500 rounded-xl transition-all group shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ca-text truncate group-hover:text-orange-800 transition-colors">
                          {doc.name || "Attachment"}
                        </p>
                        <p className="text-[10px] text-ca-text-secondary font-mono flex items-center gap-1">
                          <span>Open File</span>
                          <ExternalLink size={9} />
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-ca-text-secondary text-xs bg-ca-bg rounded-xl border border-dashed border-ca-border">
                  No documents attached yet. Click "+ Attach File" above to upload.
                </div>
              )}
            </div>

          </div>

          {/* Right Column (6/12): Deal Details & Follow-up Note */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Pipeline Stage & Deal Value Card */}
            <div className="bg-ca-surface rounded-2xl border border-ca-border p-4 sm:p-5 shadow-2xs space-y-3">
              <h2 className="font-black text-ca-text text-xs uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-2.5">
                <DollarSign size={16} className="text-emerald-600" /> Deal &amp; Pipeline Details
              </h2>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-0.5">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider">Est. Deal Value</p>
                  <p className="text-sm font-black text-emerald-600 truncate">
                    {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString()}` : "Not Set"}
                  </p>
                </div>

                <div className="p-3 bg-ca-bg rounded-xl border border-ca-border space-y-0.5">
                  <p className="text-[10px] text-ca-text-secondary font-black uppercase tracking-wider">Lead Source</p>
                  <p className="text-xs font-black text-ca-text truncate">
                    {lead.source || "Direct"}
                  </p>
                </div>

                <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900 space-y-0.5">
                  <p className="text-[10px] text-teal-800 dark:text-teal-300 font-black uppercase tracking-wider">Next Follow-Up</p>
                  <p className="text-xs font-black text-teal-900 dark:text-teal-200 font-mono truncate">
                    {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString("en-GB") : "Not Scheduled"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Follow-up Note Card */}
            <div className="bg-ca-surface rounded-2xl border border-ca-border p-4 sm:p-5 shadow-2xs space-y-3">
              <h2 className="font-black text-ca-text text-xs uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-2.5">
                <Clock size={16} className="text-orange-600" /> Log Call / Follow-up Note
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-ca-text font-bold text-xs focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                    Discussion Summary / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter key conversation points, requirements, or objections discussed with the client..."
                    className="w-full p-2.5 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-medium focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <button
                  onClick={() => addNoteMut.mutate({ noteText: newNote, followUp: nextFollowUpDate })}
                  disabled={!newNote.trim() || addNoteMut.isPending}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={13} />
                  <span>{addNoteMut.isPending ? "Saving..." : "Save Note to Timeline"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB 2: WHATSAPP CLOUD MESSENGER ───────────────────────────────────── */}
      {activeTab === "whatsapp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (5/12): Template Selector & Dynamic Variables */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-ca-surface rounded-3xl border border-ca-border p-6 shadow-2xs space-y-4">
              <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-3">
                <Sparkles size={18} className="text-emerald-600" /> Meta Approved Templates
              </h2>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isSel = selectedTemplate?.name === tpl.name;
                  return (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setMediaUrl(tpl.headerContent || "");
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between text-xs cursor-pointer ${
                        isSel
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs"
                          : "bg-ca-bg border-ca-border text-ca-text hover:bg-ca-surface"
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs">{tpl.name}</p>
                        <p className="text-[10px] text-ca-text-secondary mt-0.5">
                          {tpl.language === "mr" ? "Marathi (mr)" : tpl.language || "English"} • {tpl.category || "UTILITY"}
                        </p>
                      </div>
                      {isSel && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Variables Box */}
              {selectedTemplate && (
                <div className="space-y-3 pt-3 border-t border-ca-border text-xs">
                  <p className="font-black text-ca-text text-[11px] uppercase tracking-wider">
                    Customize Template Variables
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-ca-text-secondary mb-1">{"{{1}}"} Customer Name</label>
                      <input
                        value={varValues[1] || ""}
                        onChange={(e) => setVarValues((p) => ({ ...p, 1: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ca-text-secondary mb-1">{"{{2}}"} Service / Offer</label>
                      <input
                        value={varValues[2] || ""}
                        onChange={(e) => setVarValues((p) => ({ ...p, 2: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ca-text-secondary mb-1">{"{{3}}"} Contact Phone</label>
                      <input
                        value={varValues[3] || ""}
                        onChange={(e) => setVarValues((p) => ({ ...p, 3: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text"
                      />
                    </div>
                  </div>

                  {/* Header Media URL if applicable */}
                  {selectedTemplate.headerType === "IMAGE" && (
                    <div>
                      <label className="block text-[10px] font-bold text-ca-text-secondary mb-1">📸 Header Image URL (Optional)</label>
                      <input
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="https://yourdomain.com/banner.jpg"
                        className="w-full px-3 py-1.5 rounded-xl bg-ca-bg border border-ca-border text-xs font-semibold text-ca-text"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7/12): Authentic WhatsApp Bubble Preview & Cloud Send */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-ca-surface rounded-3xl border border-ca-border p-6 shadow-2xs space-y-4">
              <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-3">
                <MessageSquare size={18} className="text-emerald-600" /> WhatsApp Live Chat Preview
              </h2>

              {/* Realistic WhatsApp Chat Wallpaper */}
              <div className="bg-[#EFEAE2] dark:bg-[#111C24] p-6 rounded-3xl border border-[#E2D9CE] dark:border-slate-800 space-y-3">
                <div className="bg-[#E7FFDB] dark:bg-emerald-950/60 p-4 rounded-2xl rounded-tl-xs shadow-sm border border-[#D2F4BE] dark:border-emerald-800/50 max-w-lg space-y-2">
                  {/* Header Image Preview */}
                  {selectedTemplate?.headerType === "IMAGE" && mediaUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 max-h-48">
                      <img src={mediaUrl} alt="Header" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-medium">
                    {(() => {
                      let text = selectedTemplate?.bodyText || selectedTemplate?.message || "Hello {{1}}, thank you for contacting us regarding {{2}}!";
                      text = text.replace(/\{\{1\}\}/g, varValues[1] || lead.name || "Client");
                      text = text.replace(/\{\{2\}\}/g, varValues[2] || "Services");
                      text = text.replace(/\{\{3\}\}/g, varValues[3] || "+91 96891 19006");
                      return text;
                    })()}
                  </p>

                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <CheckCheck size={14} className="text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Dispatch Action */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSendCloudWhatsApp(selectedTemplate)}
                  disabled={sendingCloudMsg}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  <span>{sendingCloudMsg ? "Sending Cloud API..." : "Send Cloud API WhatsApp ⚡"}</span>
                </button>

                <a
                  href={`https://wa.me/${(lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    (selectedTemplate?.bodyText || "").replace(/\{\{1\}\}/g, varValues[1] || lead.name || "Client")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 bg-ca-bg hover:bg-ca-surface border border-ca-border text-ca-text font-black text-xs rounded-2xl transition-colors flex items-center gap-2"
                >
                  <ExternalLink size={15} />
                  <span>Open WhatsApp App</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 3: TIMELINE & NOTES ───────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="bg-ca-surface rounded-3xl border border-ca-border p-6 shadow-2xs space-y-4">
          <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2 border-b border-ca-border pb-3">
            <Clock size={18} className="text-orange-600" /> Lead History &amp; Timeline Remarks
          </h2>

          {lead.notes ? (
            <div className="p-4 bg-ca-bg rounded-2xl border border-ca-border text-xs text-ca-text whitespace-pre-wrap leading-relaxed font-mono">
              {lead.notes}
            </div>
          ) : (
            <div className="p-8 text-center text-ca-text-secondary text-xs">
              No notes logged on this lead yet. Use the note logger to record follow-up calls.
            </div>
          )}
        </div>
      )}

      {/* ── STATUS CHANGE MODAL ──────────────────────────────────────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-ca-surface border border-ca-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-scaleUp text-xs">
            <div className="flex items-center justify-between border-b border-ca-border pb-3">
              <h3 className="font-black text-sm text-ca-text uppercase tracking-wider flex items-center gap-2">
                <Layers size={18} className="text-orange-600" /> Update Lead Stage / Status
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-black/5 rounded-lg">
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
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-ca-text font-bold text-xs focus:outline-hidden focus:border-teal-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1">
                  Stage Transition Remark / Call Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  placeholder="Why is this stage being updated? (e.g. Sent quotation, client interested in demo...)"
                  className="w-full p-3 rounded-xl bg-ca-bg border border-ca-border text-xs text-ca-text font-medium focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Document / Proposal Attachment Field */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center gap-1">
                  <Paperclip size={13} className="text-orange-600" /> Attach Proposal / Quotation / Doc (Optional)
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
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl border border-ca-border font-bold text-xs hover:bg-ca-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateStatusMut.mutate({
                    statusId: selectedStatusId,
                    note: statusRemark,
                    nextFollowUp: nextFollowUpDate,
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

    </div>
  );
}
