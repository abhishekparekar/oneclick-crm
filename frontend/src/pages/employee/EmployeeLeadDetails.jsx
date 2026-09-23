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

const toDateTimeLocal = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatFollowUpDateTime = (dateStr) => {
  if (!dateStr) return "Not Scheduled";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not Scheduled";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function EmployeeLeadDetails() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [statusRemark, setStatusRemark] = useState("");
  const [statusAttachedFiles, setStatusAttachedFiles] = useState([]);

  // Messenger / Variables state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [varValues, setVarValues] = useState({});
  const [customMsg, setCustomMsg] = useState("");
  const [activeMessengerTab, setActiveMessengerTab] = useState("templates");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [directUploadingDoc, setDirectUploadingDoc] = useState(false);

  // Fetch single lead details
  const { data: leadData, isLoading, refetch } = useQuery({
    queryKey: ["employeeLeadDetails", leadId],
    queryFn: async () => {
      const res = await api.get(`/leads-engine/leads/${leadId}`);
      return res?.data?.data || res?.data || null;
    },
    enabled: Boolean(leadId),
  });

  const lead = leadData || {};

  // Fetch pipeline statuses
  const { data: statusesData } = useQuery({
    queryKey: ["leadsEngineStatuses"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/statuses");
      return res?.data?.data || res?.data || [];
    },
  });
  const statuses = Array.isArray(statusesData) ? statusesData : [];

  // Fetch approved WhatsApp templates
  const { data: templatesData } = useQuery({
    queryKey: ["leadsEngineTemplates"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/templates");
      return res?.data?.data || res?.data || [];
    },
  });
  const templates = Array.isArray(templatesData) ? templatesData : [];

  useEffect(() => {
    if (leadData) {
      setSelectedStatusId(leadData.statusId || leadData.status?._id || leadData.status?.id || "");
      if (leadData.nextFollowUpDate) {
        setNextFollowUpDate(toDateTimeLocal(leadData.nextFollowUpDate));
      }
      const rawPhone = leadData.whatsappPhone || leadData.phone || "";
      setVarValues({
        1: leadData.name || "Client",
        2: leadData.company || leadData.productService || "Business Services",
        3: rawPhone.startsWith("+") ? rawPhone : `+91 ${rawPhone}`,
        4: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        5: leadData.status?.name || "Active",
        6: "https://oneclick.in",
      });
    }
  }, [leadData]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templatesData]);

  // Update Status Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ statusId, note, nextFollowUp, files, file }) => {
      let docObjs = [];
      const rawFiles = Array.isArray(files) && files.length > 0 ? files : (file ? [file] : []);
      if (rawFiles.length > 0) {
        const uploadPromises = rawFiles.map(async (f) => {
          const formData = new FormData();
          formData.append("file", f);
          const upRes = await api.post("/tasks/upload-media", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const uData = upRes.data || {};
          const fileUrl = uData.fileUrl || uData.url;
          if (fileUrl) {
            return {
              name: uData.fileName || f.name,
              url: fileUrl,
              type: uData.fileType || f.type || "document",
              size: `${(f.size / 1024).toFixed(1)} KB`,
            };
          }
          return null;
        });
        const res = await Promise.all(uploadPromises);
        docObjs = res.filter(Boolean);
      }

      return api.patch(`/leads-engine/leads/${leadId}`, {
        statusId,
        remark: note || undefined,
        note: note || undefined,
        attachments: docObjs,
        attachment: docObjs[0] || undefined,
        nextFollowUpDate: nextFollowUp || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Lead status & documents updated!");
      setShowStatusModal(false);
      setStatusRemark("");
      setStatusAttachedFiles([]);
      queryClient.invalidateQueries(["employeeLeadDetails", leadId]);
      queryClient.invalidateQueries(["employeeMyLeads"]);
      refetch();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status"),
  });

  // Direct Document Upload Handler for Documents Card
  const handleDirectDocUpload = async (e) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;
    setDirectUploadingDoc(true);
    try {
      const uploadPromises = rawFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const upRes = await api.post("/tasks/upload-media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uData = upRes.data || {};
        const fileUrl = uData.fileUrl || uData.url;
        if (!fileUrl) throw new Error(`Failed to upload ${file.name}`);
        return {
          name: uData.fileName || file.name,
          url: fileUrl,
          type: uData.fileType || file.type || "document",
          size: `${(file.size / 1024).toFixed(1)} KB`,
        };
      });

      const docs = await Promise.all(uploadPromises);
      await api.post(`/leads-engine/leads/${leadId}/documents`, {
        documents: docs,
      });
      toast.success(`${docs.length} document(s) attached to lead!`);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to upload document");
    } finally {
      setDirectUploadingDoc(false);
      e.target.value = "";
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

  const rawPhone = lead.whatsappPhone || lead.phone || lead.mobileNumber || "";

  const handleDirectWhatsApp = () => {
    const cleanNumber = String(rawPhone).replace(/[^0-9]/g, "");
    if (!cleanNumber) return;
    const finalNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    window.open(`https://wa.me/${finalNumber}`, "_blank");
  };

  const handleDirectCall = () => {
    if (!rawPhone) return;
    window.location.href = `tel:${rawPhone}`;
  };

  const getStatusColor = (statusName) => {
    const s = String(statusName || "").toLowerCase();
    if (s.includes("won") || s.includes("convert") || s.includes("close") || s.includes("deal"))
      return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700";
    if (s.includes("lost") || s.includes("drop") || s.includes("reject") || s.includes("cancel"))
      return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700";
    if (s.includes("qualif") || s.includes("progress") || s.includes("negotiat") || s.includes("proposal"))
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700";
    if (s.includes("contact") || s.includes("call") || s.includes("follow"))
      return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700";
    return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700";
  };

  const allDocumentsList = (() => {
    const docsMap = new Map();
    (lead.documents || []).forEach((d) => {
      if (d.url) docsMap.set(d.url, d);
    });
    if (typeof lead.notes === "string") {
      const matches = lead.notes.matchAll(/\[Doc:\s*(.*?)\s*\|\s*(.*?)\]/g);
      for (const m of matches) {
        const name = m[1];
        const url = m[2];
        if (url && !docsMap.has(url)) {
          docsMap.set(url, { name, url, type: "document", size: "" });
        }
      }
    }
    return Array.from(docsMap.values());
  })();

  const unifiedTimeline = (() => {
    const list = [];

    // 1. From lead.notes
    if (typeof lead.notes === "string" && lead.notes.trim()) {
      const lines = lead.notes.split("\n").filter(Boolean);
      lines.forEach((rawLine, idx) => {
        const line = rawLine.replace(/^[•\-\*]\s*/, "").trim();
        const bracketMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
        const timestampStr = bracketMatch ? bracketMatch[1] : null;
        let text = bracketMatch ? bracketMatch[2] : line;

        let docObj = null;
        const docTagMatch = text.match(/\[Doc:\s*(.*?)\s*\|\s*(.*?)\]/);
        if (docTagMatch) {
          docObj = { name: docTagMatch[1], url: docTagMatch[2] };
          text = text.replace(/\[Doc:.*?\]/, "").trim();
        }

        const isStatus = text.toLowerCase().includes("status changed") || text.toLowerCase().includes("stage updated");

        list.push({
          id: `note-${idx}`,
          title: isStatus ? "Stage Updated" : docObj ? "Document Attached" : "Note / Activity",
          text: text,
          timestamp: timestampStr || (lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "Recent Activity"),
          attachment: docObj,
          isStatus,
          createdAt: timestampStr ? new Date() : new Date(lead.createdAt || Date.now()),
        });
      });
    }

    // 2. From lead.leadActivities
    (lead.leadActivities || []).forEach((act, idx) => {
      const isDup = list.some((l) => l.text === act.description || l.title === act.title);
      if (!isDup) {
        list.push({
          id: act._id || `act-${idx}`,
          title: act.title || "Status Updated",
          text: act.description || "",
          timestamp: act.createdAt
            ? new Date(act.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "Recent Activity",
          attachment: act.attachment || null,
          isStatus: act.type === "STATUS_CHANGE",
          createdAt: new Date(act.createdAt || Date.now()),
        });
      }
    });

    // 3. From lead.documents
    (lead.documents || []).forEach((doc, idx) => {
      const isDup = list.some((l) => l.attachment?.url === doc.url);
      if (!isDup) {
        list.push({
          id: doc._id || `doc-${idx}`,
          title: "Document Attached",
          text: `${doc.name || "File"} ${doc.size ? `(${doc.size})` : ""}`,
          timestamp: doc.uploadedAt
            ? new Date(doc.uploadedAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "Uploaded",
          attachment: { name: doc.name, url: doc.url, type: doc.type, size: doc.size },
          isStatus: false,
          createdAt: new Date(doc.uploadedAt || Date.now()),
        });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  })();

  const resolvedStatusName =
    lead?.status?.name ||
    statuses.find((st) => String(st._id || st.id) === String(lead?.statusId || lead?.status))?.name ||
    "NEW LEAD";

  if (isLoading || !leadData) {
    return (
      <div className="space-y-4 pb-12 font-sans w-full max-w-[1440px] mx-auto min-h-[500px] flex flex-col items-center justify-center">
        <div className="p-8 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Loading lead details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 font-sans text-ca-text w-full max-w-[1440px] mx-auto">
      
      {/* ── TOP NAVIGATION BAR & ACTION TOOLBAR (CLEAN FLOATING ADMIN STYLE) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/employee/leads")}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-[11px] font-mono font-black shrink-0">
                {formatLeadId(lead)}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {lead.name || "Client Details"}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${getStatusColor(resolvedStatusName)}`}>
                {resolvedStatusName.toUpperCase()}
              </span>
              {lead.company && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  ({lead.company})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {rawPhone && (
            <>
              <button
                onClick={handleDirectWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleDirectCall}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Phone size={13} />
                <span>Call</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Layers size={13} />
            <span>Update Stage</span>
          </button>
        </div>
      </div>

      {/* ── SINGLE UNIFIED CRM CARD (SPECIFICATION + TIMELINE) ──────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          
          {/* ── LEFT SECTION (7 / 12 width): LEAD SPECIFICATION & CONTACT ───────── */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5">
            
            {/* Section 1: Contact & Business Profile */}
            <div className="space-y-3">
              <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <User size={15} className="text-amber-500" /> Contact &amp; Business Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <Phone size={11} className="text-emerald-600" /> Primary Phone
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    {lead.phone || lead.whatsappPhone || "—"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <Smartphone size={11} className="text-emerald-600" /> WhatsApp Number
                  </p>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {lead.whatsappPhone || lead.phone || "—"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <Mail size={11} className="text-blue-600" /> Email Address
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {lead.email || "No email provided"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <Building size={11} className="text-amber-600" /> Company / Organization
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {lead.company || "Individual Client"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Deal & Pipeline Metrics */}
            <div className="space-y-3 pt-1">
              <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <DollarSign size={15} className="text-emerald-600" /> Deal &amp; Pipeline Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Est. Deal Value</p>
                  <p className="text-sm font-black text-emerald-600 truncate">
                    {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString()}` : "Not Set"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Lead Source</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {lead.source || "Website Form"}
                  </p>
                </div>

                <div className="p-3 bg-teal-50/80 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900 space-y-0.5">
                  <p className="text-[10px] text-teal-800 dark:text-teal-300 font-black uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock size={11} /> Next Follow-Up
                  </p>
                  <p className="text-xs font-black text-teal-900 dark:text-teal-200 font-mono truncate" title={formatFollowUpDateTime(lead.nextFollowUpDate)}>
                    {formatFollowUpDateTime(lead.nextFollowUpDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Attached Documents & Files */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Paperclip size={15} className="text-amber-500" /> Attached Proposals &amp; Docs ({allDocumentsList.length})
                </h2>
                <label className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors flex items-center gap-1">
                  <Plus size={11} strokeWidth={2.5} />
                  <span>{directUploadingDoc ? "Uploading..." : "Attach Doc"}</span>
                  <input type="file" multiple disabled={directUploadingDoc} onChange={handleDirectDocUpload} className="hidden" />
                </label>
              </div>

              {allDocumentsList.length === 0 ? (
                <div className="p-4 text-center bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                  No documents attached to this lead yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allDocumentsList.map((doc, idx) => (
                    <div
                      key={doc._id || idx}
                      className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{doc.name || "Document"}</p>
                          {doc.size && <p className="text-[9.5px] text-slate-400 font-mono">{doc.size}</p>}
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 shadow-2xs border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                        title="Open file"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT SECTION (5 / 12 width): TIMELINE & ACTIVITY HISTORY ───────── */}
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock size={15} className="text-amber-500" /> Timeline &amp; Activity History
              </h2>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                {unifiedTimeline.length} logs
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-4 pt-1 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
              {unifiedTimeline.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {unifiedTimeline.map((item, idx) => {
                    const isStatus = item.isStatus;
                    const isDoc = Boolean(item.attachment);

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Dot on connector line */}
                        <div
                          className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isStatus
                              ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500"
                              : isDoc
                              ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500"
                              : "bg-blue-50 dark:bg-blue-950/60 border-blue-500"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isStatus
                                ? "bg-amber-500"
                                : isDoc
                                ? "bg-purple-500"
                                : "bg-blue-500"
                            }`}
                          />
                        </div>

                        {/* Content Card */}
                        <div className="p-3 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                isStatus
                                  ? "text-amber-600 dark:text-amber-400"
                                  : isDoc
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                              <Clock size={10} />
                              <span>{item.timestamp}</span>
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                            {item.text}
                          </p>

                          {/* Inline Attached Document Pill */}
                          {item.attachment?.url && (
                            <a
                              href={item.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs group"
                            >
                              <FileText size={13} className="text-amber-500 shrink-0" />
                              <span className="truncate max-w-[200px]">{item.attachment.name || "Attached Document"}</span>
                              <ExternalLink size={10} className="text-slate-400 group-hover:text-amber-500 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Clock size={24} className="text-slate-300 dark:text-slate-700" />
                  <p>No activity or timeline history recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                    <Calendar size={13} className="text-teal-600" /> Next Follow-Up Date &amp; Time
                  </span>
                  <span className="text-[10px] text-ca-text-secondary lowercase">(when to contact next)</span>
                </label>
                <input
                  type="datetime-local"
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
                <label className="block text-[11px] font-black uppercase tracking-wider text-ca-text-secondary mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Paperclip size={13} className="text-orange-600" /> Attach Proposals / Docs (Multiple Allowed)
                  </span>
                  {statusAttachedFiles.length > 0 && (
                    <span className="text-orange-600 font-mono text-[10px]">{statusAttachedFiles.length} file(s) selected</span>
                  )}
                </label>

                {statusAttachedFiles.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {statusAttachedFiles.map((file, idx) => (
                      <div key={idx} className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={14} className="text-orange-700 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-orange-950 dark:text-orange-200 truncate text-[11px]">{file.name}</p>
                            <p className="text-[9.5px] text-orange-700 dark:text-orange-300 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStatusAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-2.5 bg-ca-bg hover:bg-ca-surface rounded-xl border border-dashed border-ca-border cursor-pointer transition-colors text-ca-text-secondary hover:text-ca-text font-bold text-[11px]">
                  <Paperclip size={14} />
                  <span>Choose Files to Attach</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const newFiles = e.target.files ? Array.from(e.target.files) : [];
                      setStatusAttachedFiles((prev) => [...prev, ...newFiles]);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
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
