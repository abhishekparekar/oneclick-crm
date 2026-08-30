import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, Magnet, Phone, MessageSquare, Calendar, Building,
  DollarSign, Tag, CheckCircle2, AlertCircle, Clock, Send,
  Paperclip, ExternalLink, X, Plus, Sparkles, User, ShieldCheck,
  CheckCircle, ChevronRight, Layers, FileText, Smartphone, Mail,
  CheckCheck, Users, Briefcase, Trash2, RefreshCw
} from "lucide-react";

const formatLeadId = (lead) => {
  if (!lead) return "LD-01";
  if (lead.leadId && String(lead.leadId).startsWith("LD-")) return lead.leadId;
  const idStr = String(lead._id || lead.id || "").trim();
  if (idStr.length >= 4) return `LD-${idStr.slice(-3).toUpperCase()}`;
  return `LD-01`;
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

export default function HRLeadDetails() {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [statusRemark, setStatusRemark] = useState("");
  const [statusAttachedFile, setStatusAttachedFile] = useState(null);

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
    queryKey: ["hrLeadDetails", leadId],
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
    staleTime: 60000,
  });
  const statuses = Array.isArray(statusesData) ? statusesData : [];

  // Fetch employees / recruiters list
  const { data: employeesData } = useQuery({
    queryKey: ["hrEmployeesListForLeadDetails"],
    queryFn: async () => {
      try {
        const res = await api.get("/company/employees?limit=1000");
        const list = res.data?.employees || res.data?.data || res.data || [];
        return list.map((e) => ({
          id: e.userId?._id || e._id,
          name: e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || "Employee",
          department: e.departmentId?.name || e.department || "",
          role: e.role || "Staff",
        }));
      } catch (_) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  const employees = Array.isArray(employeesData) ? employeesData : [];

  // Fetch approved WhatsApp templates
  const { data: templatesData } = useQuery({
    queryKey: ["leadsEngineTemplates"],
    queryFn: async () => {
      const res = await api.get("/leads-engine/templates");
      return res?.data?.data || res?.data || [];
    },
    staleTime: 60000,
  });
  const templates = Array.isArray(templatesData) ? templatesData : [];

  useEffect(() => {
    if (leadData) {
      setSelectedStatusId(leadData.statusId || leadData.status?._id || leadData.status?.id || "");
      if (leadData.nextFollowUpDate) {
        setNextFollowUpDate(toDateTimeLocal(leadData.nextFollowUpDate));
      }
    }
  }, [leadData]);

  // Update Status Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ statusId, followUpDate, remark, file }) => {
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
            name: file.name,
            url: uData.fileUrl || uData.url,
            fileType: file.type || "application/octet-stream",
          };
        }
      }

      return api.put(`/leads-engine/leads/${leadId}`, {
        statusId: statusId || selectedStatusId,
        nextFollowUpDate: followUpDate || nextFollowUpDate || null,
        remark: remark || null,
        attachment: docObj,
      });
    },
    onSuccess: () => {
      toast.success("Lead status & follow-up updated successfully!");
      setShowStatusModal(false);
      setStatusRemark("");
      setStatusAttachedFile(null);
      queryClient.invalidateQueries(["hrLeadDetails", leadId]);
      queryClient.invalidateQueries(["hrMyLeads"]);
      queryClient.invalidateQueries(["hrDashboardLeads"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update lead status");
    },
  });

  // Assign Recruiter Mutation
  const assignMut = useMutation({
    mutationFn: async (assignedToId) => {
      return api.put(`/leads-engine/leads/${leadId}`, {
        assignedTo: assignedToId || null,
      });
    },
    onSuccess: () => {
      toast.success("Recruiter / Staff assigned successfully!");
      queryClient.invalidateQueries(["hrLeadDetails", leadId]);
      queryClient.invalidateQueries(["hrMyLeads"]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to assign lead");
    },
  });

  // Send WhatsApp Template Mutation
  const sendTemplateMut = useMutation({
    mutationFn: async ({ templateName, variables, headerMediaUrl }) => {
      return api.post(`/leads-engine/leads/${leadId}/send-template`, {
        templateName,
        variables,
        headerMediaUrl,
      });
    },
    onSuccess: () => {
      toast.success("WhatsApp template broadcasted!");
      setSelectedTemplate(null);
      setVarValues({});
      setAttachedFile(null);
      queryClient.invalidateQueries(["hrLeadDetails", leadId]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send WhatsApp template");
    },
  });

  // Send Direct Message Mutation
  const sendDirectMsgMut = useMutation({
    mutationFn: async ({ message, mediaUrl }) => {
      return api.post(`/leads-engine/leads/${leadId}/send-message`, {
        message,
        mediaUrl,
      });
    },
    onSuccess: () => {
      toast.success("Message dispatched to WhatsApp!");
      setCustomMsg("");
      setAttachedFile(null);
      queryClient.invalidateQueries(["hrLeadDetails", leadId]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send message");
    },
  });

  const handleFileUpload = async (e, isDirect = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setter = isDirect ? setDirectUploadingDoc : setUploadingDoc;
    setter(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/tasks/upload-media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data || {};
      const fileUrl = data.fileUrl || data.url;

      if (fileUrl) {
        setAttachedFile({ name: file.name, url: fileUrl });
        toast.success("Document uploaded!");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload file");
    } finally {
      setter(false);
    }
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedStatusId) {
      toast.error("Please select a status");
      return;
    }
    updateStatusMut.mutate({
      statusId: selectedStatusId,
      followUpDate: nextFollowUpDate,
      remark: statusRemark,
      file: statusAttachedFile,
    });
  };

  const currentStatusObj = statuses.find(
    (s) => String(s._id || s.id) === String(lead.statusId || lead.status?._id || lead.status?.id)
  ) || lead.status;

  const rawPhone = lead.whatsappPhone || lead.phone || "";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Loading Lead Details...</p>
      </div>
    );
  }

  return (
    <div className="w-full font-sans pb-12 space-y-4 text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto text-xs">
      
      {/* ── Top Breadcrumbs & Back Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/hr/leads")}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
            title="Back to Leads List"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {formatLeadId(lead)}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {lead.name || "Candidate / Lead Profile"}
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  backgroundColor: `${currentStatusObj?.color || "#f59e0b"}15`,
                  color: currentStatusObj?.color || "#f59e0b",
                  borderColor: `${currentStatusObj?.color || "#f59e0b"}30`,
                }}
              >
                ● {currentStatusObj?.name || "New"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              HR Recruitment Pipeline • Registered on {new Date(lead.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
            >
              <Smartphone size={13} strokeWidth={2.2} />
              <span>WhatsApp</span>
            </a>
          )}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all"
            >
              <Phone size={13} strokeWidth={2.2} />
              <span>Call</span>
            </a>
          )}
          <button
            onClick={() => setShowStatusModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-extrabold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Sparkles size={13} strokeWidth={2.2} />
            <span>Update Status</span>
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Grid Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT COLUMN (1/3): Client Profile & Assignment Card */}
        <div className="space-y-4">
          
          {/* Card 1: Contact & Company Profile */}
          <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
              <User size={14} className="text-amber-500" />
              Candidate / Contact Details
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{lead.name || "—"}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">WhatsApp</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{lead.whatsappPhone || lead.phone || "—"}</span>
              </div>

              {lead.phone && lead.phone !== lead.whatsappPhone && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium text-[11px]">Alternate Phone</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{lead.phone}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Email Address</span>
                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[170px]">{lead.email || "—"}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Current Company</span>
                <span className="font-bold text-slate-900 dark:text-white">{lead.company || "—"}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Position / Product</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{lead.productService || "General"}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Lead Source</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{lead.source || "Walk-in"}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium text-[11px]">Expected CTC / Deal</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Assignment & Next Follow-Up Schedule */}
          <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Users size={14} className="text-amber-500" />
              Recruiter &amp; Follow-up Schedule
            </h3>

            {/* Recruiter Selector */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Assigned Recruiter / Staff</label>
              <select
                value={lead.assignedTo?._id || lead.assignedTo?.id || lead.assignedTo || ""}
                onChange={(e) => assignMut.mutate(e.target.value)}
                disabled={assignMut.isLoading}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">-- Unassigned (General Pool) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department || emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Next Follow-up banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Next Follow-Up Scheduled
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                <Clock size={13} className="text-amber-600" />
                <span>{formatFollowUpDateTime(lead.nextFollowUpDate)}</span>
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (2/3): WhatsApp Messenger & Interaction Timeline */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Card 3: Interactive WhatsApp Outreach Engine */}
          <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  WhatsApp Candidate Communication
                </h3>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMessengerTab("templates")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMessengerTab === "templates"
                      ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Meta Templates
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMessengerTab("direct")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMessengerTab === "direct"
                      ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Direct Message
                </button>
              </div>
            </div>

            {/* TAB 1: Meta Verified Templates */}
            {activeMessengerTab === "templates" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Select Meta Verified Template
                  </label>
                  <select
                    value={selectedTemplate?.name || ""}
                    onChange={(e) => {
                      const tpl = templates.find((t) => t.name === e.target.value);
                      setSelectedTemplate(tpl || null);
                      setVarValues({});
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Choose WhatsApp Template --</option>
                    {templates.map((tpl) => (
                      <option key={tpl._id || tpl.name} value={tpl.name}>
                        {tpl.name} ({tpl.language || "en"})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Template Body Preview
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-white dark:bg-[#0A0F18] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selectedTemplate.bodyText || selectedTemplate.content || "Template content"}
                      </p>
                    </div>

                    {/* Dynamic Variable Inputs */}
                    {selectedTemplate.variables?.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block">
                          Fill Template Dynamic Variables
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTemplate.variables.map((v, i) => (
                            <div key={i}>
                              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                                Variable {`{{${i + 1}}}`} ({v})
                              </label>
                              <input
                                type="text"
                                placeholder={`Enter ${v}...`}
                                value={varValues[v] || ""}
                                onChange={(e) => setVarValues({ ...varValues, [v]: e.target.value })}
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dispatch Action */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={sendTemplateMut.isLoading}
                        onClick={() =>
                          sendTemplateMut.mutate({
                            templateName: selectedTemplate.name,
                            variables: varValues,
                            headerMediaUrl: attachedFile?.url || null,
                          })
                        }
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send size={13} strokeWidth={2.4} />
                        <span>{sendTemplateMut.isLoading ? "Broadcasting..." : "Dispatch Template"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: Direct Custom Message */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Direct WhatsApp Message
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Type candidate outreach message, interview details or custom note..."
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Paperclip size={13} />
                      <span>{directUploadingDoc ? "Uploading..." : attachedFile ? attachedFile.name : "Attach Doc / Image"}</span>
                      <input type="file" onChange={(e) => handleFileUpload(e, true)} className="hidden" disabled={directUploadingDoc} />
                    </label>
                    {attachedFile && (
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer text-xs"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={sendDirectMsgMut.isLoading || !customMsg.trim()}
                    onClick={() =>
                      sendDirectMsgMut.mutate({
                        message: customMsg.trim(),
                        mediaUrl: attachedFile?.url || null,
                      })
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} strokeWidth={2.4} />
                    <span>{sendDirectMsgMut.isLoading ? "Sending..." : "Send Message"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Timeline, History & Activity Logs */}
          <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              Recruitment Activity &amp; Status Logs ({lead.activityLogs?.length || 0})
            </h3>

            {(!lead.activityLogs || lead.activityLogs.length === 0) ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No past activity logged for this candidate yet. Updates and notes will appear here in chronological order.
              </div>
            ) : (
              <div className="space-y-2.5">
                {lead.activityLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {log.action || log.title || "Status Updated"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {log.remark && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {log.remark}
                        </p>
                      )}
                      {log.attachment?.url && (
                        <div className="mt-1.5">
                          <a
                            href={log.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <Paperclip size={11} />
                            <span>{log.attachment.name || "View Attachment"}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Status Update Modal ────────────────────────────────────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scaleUp text-xs flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md">
                  <Sparkles size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    Update Recruitment Status
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Transition candidate stage &amp; schedule next follow-up
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleStatusSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Pipeline Stage / Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
                >
                  <option value="">-- Select Status --</option>
                  {statuses.map((st) => (
                    <option key={st._id || st.id} value={st._id || st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Next Follow-up Date &amp; Time
                </label>
                <div className="relative">
                  <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Discussion Notes &amp; Remarks
                </label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={3}
                    placeholder="Enter interview feedback, salary expectation notes or discussion summary..."
                    value={statusRemark}
                    onChange={(e) => setStatusRemark(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Attach Document / Resume (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setStatusAttachedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 dark:file:bg-amber-950/40 file:text-amber-700 dark:file:text-amber-300 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMut.isLoading}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {updateStatusMut.isLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Save Status Update</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
