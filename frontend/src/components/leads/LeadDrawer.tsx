import React, { useState, useEffect } from 'react';
import { api } from '../../utils/leads/api';
import StatusBadge from './StatusBadge';
import TemplatePreview from './TemplatePreview';
import MediaUrlUploader from './MediaUrlUploader';
import { useToast } from './Toast';
import { useActionLoader } from './ActionLoader';
import {
  X, MessageSquare, FileText, History, Save, Trash2, Plus,
  Loader2, Send, User, Calendar, AlertCircle, CheckCircle, Clock, Tag,
  Phone, Mail, Building2, UserCheck, Sparkles, MessageCircle, DollarSign,
  Share2, ShieldCheck, Check, ChevronDown, Activity
} from 'lucide-react';

interface LeadDrawerProps {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
  statuses: any[];
  sources: any[];
  allTags?: any[];
  employees?: any[];
}

export default function LeadDrawer({
  leadId,
  onClose,
  onUpdate,
  statuses,
  sources,
  allTags,
  employees,
}: LeadDrawerProps) {
  const { success, error, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any>(null);
  const [availableTags, setAvailableTags] = useState<any[]>(allTags || []);
  const [employeeList, setEmployeeList] = useState<any[]>(employees || []);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    whatsappPhone: '',
    phone: '',
    email: '',
    company: '',
    productService: '',
    source: 'Walk-in',
    statusId: '',
    estimatedValue: '',
    whatsappOptIn: true,
    dateOfBirth: '',
    anniversaryDate: '',
    assignedTo: '',
    notes: '',
    tagIds: [] as string[],
  });

  const fetchEmployees = async () => {
    if (employees && employees.length > 0) {
      setEmployeeList(employees);
      return;
    }
    try {
      const res = await api.get('/api/assignable-users');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
      if (list.length > 0) {
        setEmployeeList(list);
      }
    } catch (_) {}
  };

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/leads/${leadId}`);
      if (res) {
        setLead(res);
        setFormData({
          name: res.name || '',
          whatsappPhone: res.whatsappPhone || '',
          phone: res.phone || '',
          email: res.email || '',
          company: res.company || res.productService || '',
          productService: res.productService || '',
          source: res.source || 'Walk-in',
          statusId: res.statusId || '',
          estimatedValue: res.estimatedValue ? String(res.estimatedValue) : '',
          whatsappOptIn: res.whatsappOptIn ?? true,
          dateOfBirth: res.dateOfBirth ? new Date(res.dateOfBirth).toISOString().split('T')[0] : '',
          anniversaryDate: res.anniversaryDate ? new Date(res.anniversaryDate).toISOString().split('T')[0] : '',
          assignedTo: res.assignedTo?._id || res.assignedTo?.id || res.assignedToId || (typeof res.assignedTo === 'string' ? res.assignedTo : ''),
          notes: res.notes || '',
          tagIds: res.tags ? res.tags.map((t: any) => t.id) : [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    if (allTags && allTags.length > 0) return;
    try {
      const res = await api.get('/api/tags');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.tags) ? res.tags : Array.isArray(res) ? res : [];
      setAvailableTags(list);
    } catch (_) {
      setAvailableTags([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/api/leads/${leadId}/activities`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.activities) ? res.activities : Array.isArray(res) ? res : [];
      setActivities(list);
    } catch (_) {
      setActivities([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/templates?status=APPROVED');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.templates) ? res.templates : Array.isArray(res) ? res : [];
      setTemplates(list);
    } catch (_) {
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadDetails();
      fetchTemplates();
      fetchTags();
      fetchEmployees();
    }
  }, [leadId]);

  useEffect(() => {
    if (lead) {
      setNotes(lead.leadNotes || []);
      fetchActivities();
    }
  }, [lead]);

  const handleUpdateLead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await run('update', async () => {
      const payload: any = { ...formData };
      if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
      if (payload.anniversaryDate) payload.anniversaryDate = new Date(payload.anniversaryDate).toISOString();
      if (!payload.assignedTo) payload.assignedTo = null;
      if (payload.estimatedValue) payload.estimatedValue = Number(payload.estimatedValue);

      const res = await api.patch(`/api/leads/${leadId}`, payload);
      setLead(res);
      onUpdate();
      success('Contact updated');
    });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await run('note', async () => {
      const res = await api.post(`/api/leads/${leadId}/notes`, { note: newNote });
      setNotes([res, ...notes]);
      setNewNote('');
      fetchActivities();
      success('Note added');
    });
  };

  const handleSendQuickWhatsApp = async () => {
    if (!selectedTemplateId) return;
    await run('send', async () => {
      await api.post(`/api/leads/${leadId}/send-template`, {
        templateId: selectedTemplateId,
        variableValues: {},
      });
      setSendSuccess('Template sent');
      setSelectedTemplateId('');
      fetchActivities();
      setTimeout(() => setSendSuccess(null), 3000);
      success('WhatsApp message queued');
    });
  };

  const handleDeleteLead = async () => {
    const ok = await confirm({
      title: 'Delete Contact',
      message: 'Delete this contact profile?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await run('delete', async () => {
      await api.delete(`/api/leads/${leadId}`);
      success('Contact deleted');
      onUpdate();
      onClose();
    });
  };

  const openWhatsAppDirect = () => {
    const cleanPhone = (formData.whatsappPhone || '').replace(/\D/g, '');
    if (!cleanPhone) return;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openCallDirect = () => {
    const phone = formData.phone || formData.whatsappPhone;
    if (!phone) return;
    window.open(`tel:${phone}`, '_self');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-fadeIn">
        <div className="w-full max-w-[720px] bg-white dark:bg-[#111C24] h-full flex items-center justify-center border-l border-slate-200 dark:border-slate-800 shadow-2xl">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      </div>
    );
  }

  const initials = (name?: string) => {
    if (!name) return 'U';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-fadeIn">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Unified Spacious Drawer Panel */}
      <div className="relative z-51 w-full max-w-[720px] bg-white dark:bg-[#111C24] h-full flex flex-col shadow-2xl border-l border-slate-200/90 dark:border-slate-800 animate-slideLeft">
        
        {/* ── UNIFIED COMPACT HEADER ── */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 shadow-2xs">
              {initials(lead?.name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {lead?.name || 'Contact Profile'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                  {lead?.company || lead?.source || 'Lead'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                  {lead?.assignedTo?.name ? `👤 ${lead.assignedTo.name}` : 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={openWhatsAppDirect}
              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={openCallDirect}
              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center cursor-pointer transition-colors"
              title="Call"
            >
              <Phone className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleUpdateLead()}
              disabled={isLoading('update')}
              className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ml-1 disabled:opacity-50"
              title="Save Changes"
            >
              {isLoading('update') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteLead}
              disabled={isLoading('delete')}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer transition-colors ml-0.5"
              title="Delete Contact"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── ALL-IN-ONE SCROLLABLE DRAWER BODY ── */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/40 dark:bg-[#0B1118]/40">

          {/* ═════════ 1. LEAD PROFILE & ASSIGNMENT DETAILS ═════════ */}
          <form onSubmit={handleUpdateLead} className="space-y-3">
            <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
              
              {/* Full Name */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Contact Name *</label>
                <input
                  type="text"
                  required
                  className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* WhatsApp & Secondary Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.whatsappPhone}
                    onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Secondary Phone</label>
                  <input
                    type="tel"
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Email & Company */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Email Address</label>
                  <input
                    type="email"
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Company Name</label>
                  <input
                    type="text"
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company / Org"
                  />
                </div>
              </div>

              {/* Assigned Representative (with Dept) */}
              <div>
                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-0.5">
                  👤 Assign to Employee / Sales Rep (with Dept)
                </label>
                <select
                  className="w-full h-7.5 px-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                >
                  <option value="">-- Unassigned --</option>
                  {(Array.isArray(employeeList) ? employeeList : []).map((emp) => (
                    <option key={emp.id || emp._id} value={emp.id || emp._id}>
                      {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Source */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Pipeline Stage</label>
                  <select
                    className="w-full h-7.5 px-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.statusId}
                    onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                  >
                    {(Array.isArray(statuses) ? statuses : []).map((st) => (
                      <option key={st.id || st._id} value={st.id || st._id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Lead Source</label>
                  <select
                    className="w-full h-7.5 px-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    {(Array.isArray(sources) ? sources : []).map((src) => (
                      <option key={src.id || src.name} value={src.name}>
                        {src.name}
                      </option>
                    ))}
                    {formData.source && !(Array.isArray(sources) ? sources : []).some((s) => s.name === formData.source) && (
                      <option value={formData.source}>{formData.source}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Product Interest & Deal Value */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Product Interest</label>
                  <input
                    type="text"
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.productService}
                    onChange={(e) => setFormData({ ...formData, productService: e.target.value })}
                    placeholder="e.g. CRM Software"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Deal Value (₹)</label>
                  <input
                    type="number"
                    className="w-full h-7.5 px-2.5 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              {/* Birthday & Anniversary */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Birthday</label>
                  <input
                    type="date"
                    className="w-full h-7.5 px-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Anniversary</label>
                  <input
                    type="date"
                    className="w-full h-7.5 px-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.anniversaryDate}
                    onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Tags & WhatsApp Opt-In */}
              <div className="pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Category Tags</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.whatsappOptIn}
                      onChange={(e) => setFormData({ ...formData, whatsappOptIn: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">WhatsApp Opt-in</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(availableTags) ? availableTags : []).map((tag) => {
                    const isSelected = formData.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          const newTagIds = isSelected
                            ? formData.tagIds.filter((id) => id !== tag.id)
                            : [...formData.tagIds, tag.id];
                          setFormData({ ...formData, tagIds: newTagIds });
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color || '#F59E0B' }} />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading('update')}
              className="w-full h-8.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading('update') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Lead Profile</span>
            </button>
          </form>

          {/* ═════════ 2. QUICK NOTES & INTERACTION HISTORY ═════════ */}
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                  Notes & Interaction Log
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {notes.length} note(s)
              </span>
            </div>

            {/* Quick Note Add Form */}
            <form onSubmit={handleAddNote} className="space-y-1.5">
              <textarea
                rows={2}
                required
                className="w-full p-2 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                placeholder="Write a quick call or follow-up note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading('note') || !newNote.trim()}
                  className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-lg text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isLoading('note') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add Note
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {notes.length === 0 ? (
                <p className="text-center py-3 text-[11px] text-slate-400 font-medium italic">
                  No notes recorded yet
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id || note._id} className="bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{note.note}</p>
                    <p className="text-[9.5px] text-slate-400 text-right">
                      {new Date(note.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═════════ 3. QUICK WHATSAPP & ACTIVITY TIMELINE ═════════ */}
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                  Quick WhatsApp & Activity Timeline
                </h3>
              </div>
            </div>

            {/* Direct Quick WhatsApp Sender */}
            {templates.length > 0 && formData.whatsappOptIn && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50">
                <select
                  className="flex-1 h-7.5 px-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Select WhatsApp Template to Send...</option>
                  {(Array.isArray(templates) ? templates : []).map((tpl) => (
                    <option key={tpl.id || tpl._id} value={tpl.id || tpl._id}>
                      {tpl.name} ({tpl.language})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSendQuickWhatsApp}
                  disabled={!selectedTemplateId || isLoading('send')}
                  className="h-7.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isLoading('send') ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Send
                </button>
              </div>
            )}

            {/* Activity Stream */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {activities.length === 0 ? (
                <p className="text-center py-3 text-[11px] text-slate-400 font-medium italic">
                  No activity recorded yet
                </p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      <span>{act.title}</span>
                      <span className="text-[9.5px] text-slate-400 font-normal">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-slate-500 dark:text-slate-400 text-[10.5px] mt-0.5">{act.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
