import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/leads/api';
import axiosApi from '../../api/api';
import StatusBadge from './StatusBadge';
import TemplatePreview from './TemplatePreview';
import MediaUrlUploader from './MediaUrlUploader';
import { useToast } from './Toast';
import { useActionLoader } from './ActionLoader';
import {
  X, MessageSquare, FileText, History, Save, Trash2, Plus,
  Loader2, Send, User, Calendar, AlertCircle, CheckCircle, Clock, Tag,
  Paperclip, ExternalLink, Download, File, Image, Film, UserCheck,
  DollarSign, Building, Maximize2, RefreshCw, Smartphone, Phone, Mail,
  Users, Check, Search, ChevronDown
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

type TabId = 'details' | 'timeline' | 'notes_files' | 'send' | 'messages';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'details', label: 'Details', icon: User },
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'notes_files', label: 'Notes & Files', icon: FileText },
  { id: 'send', label: 'Send', icon: Send },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

const toDateTimeLocal = (dateVal: any) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function LeadDrawer({
  leadId,
  onClose,
  onUpdate,
  statuses,
  sources,
  allTags,
  employees = [],
}: LeadDrawerProps) {
  const navigate = useNavigate();
  const { success, error, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any>(null);
  const [availableTags, setAvailableTags] = useState<any[]>(allTags || []);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductText, setCustomProductText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [varMapping, setVarMapping] = useState<Record<string, string>>({});
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [notesFilesFilter, setNotesFilesFilter] = useState<'all' | 'notes' | 'files'>('all');

  // Multi-staff assignment state
  const [staffList, setStaffList] = useState<any[]>(employees || []);
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    whatsappPhone: '',
    phone: '',
    email: '',
    company: '',
    productService: '',
    source: 'Walk-in',
    statusId: '',
    assignedTo: '',
    assignedToUserIds: [] as string[],
    estimatedValue: '',
    nextFollowUpDate: '',
    whatsappOptIn: true,
    dateOfBirth: '',
    anniversaryDate: '',
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (employees && employees.length > 0) {
      setStaffList(employees);
    } else {
      api.get('/api/assignable-users').then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.users) ? res.users : Array.isArray(res) ? res : [];
        if (list.length > 0) setStaffList(list);
      }).catch(() => {});
    }
  }, [employees]);

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const [res, prodRes] = await Promise.all([
        api.get(`/api/leads/${leadId}`),
        api.get('/api/products').catch(() => []),
      ]);
      if (Array.isArray(prodRes)) setProducts(prodRes);
      else if (Array.isArray(prodRes?.data)) setProducts(prodRes.data);
      if (res) {
        setLead(res);
        const assignedUserIds: string[] = Array.isArray(res.assignedToUserIds) && res.assignedToUserIds.length > 0
          ? res.assignedToUserIds.map((id: any) => String(id))
          : Array.isArray(res.assignedToUsers) && res.assignedToUsers.length > 0
          ? res.assignedToUsers.map((u: any) => String(typeof u === 'object' ? u._id || u.id : u)).filter(Boolean)
          : (res.assignedToId || res.assignedTo?._id || res.assignedTo?.id || (typeof res.assignedTo === 'string' ? res.assignedTo : ''))
          ? [String(res.assignedToId || res.assignedTo?._id || res.assignedTo?.id || res.assignedTo)]
          : [];

        setFormData({
          name: res.name || '',
          whatsappPhone: res.whatsappPhone || '',
          phone: res.phone || '',
          email: res.email || '',
          company: res.company || '',
          productService: res.productService || '',
          source: res.source || 'Walk-in',
          statusId: res.statusId || res.status?.id || res.status?._id || '',
          assignedTo: assignedUserIds[0] || '',
          assignedToUserIds: assignedUserIds,
          estimatedValue: res.estimatedValue ? String(res.estimatedValue) : '',
          nextFollowUpDate: toDateTimeLocal(res.nextFollowUpDate),
          whatsappOptIn: res.whatsappOptIn ?? true,
          dateOfBirth: res.dateOfBirth ? new Date(res.dateOfBirth).toISOString().split('T')[0] : '',
          anniversaryDate: res.anniversaryDate ? new Date(res.anniversaryDate).toISOString().split('T')[0] : '',
          tagIds: res.tags ? res.tags.map((t: any) => t.id || t._id) : [],
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
      const list = Array.isArray(res?.tags)
        ? res.tags
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setAvailableTags(list);
    } catch (_) {
      setAvailableTags([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/api/leads/${leadId}/activities`);
      const list = Array.isArray(res?.activities)
        ? res.activities
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setActivities(list);
    } catch (_) {
      setActivities([]);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/api/leads/${leadId}/messages`);
      const list = Array.isArray(res?.messages)
        ? res.messages
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setMessages(list);
    } catch (_) {
      setMessages([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/templates?status=APPROVED');
      const list = Array.isArray(res?.templates)
        ? res.templates
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
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
    }
  }, [leadId]);

  useEffect(() => {
    if (lead) {
      setNotes(lead.leadNotes || []);
      fetchActivities();
      fetchMessages();
    }
  }, [lead]);

  const handleToggleStaff = (empId: string) => {
    setFormData((prev) => {
      const exists = prev.assignedToUserIds.includes(empId);
      const updated = exists
        ? prev.assignedToUserIds.filter((id) => id !== empId)
        : [...prev.assignedToUserIds, empId];
      return {
        ...prev,
        assignedToUserIds: updated,
        assignedTo: updated[0] || '',
      };
    });
  };

  const handleRemoveStaff = (empId: string) => {
    setFormData((prev) => {
      const updated = prev.assignedToUserIds.filter((id) => id !== empId);
      return {
        ...prev,
        assignedToUserIds: updated,
        assignedTo: updated[0] || '',
      };
    });
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await run('update', async () => {
      const payload: any = { ...formData };
      if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
      if (payload.anniversaryDate) payload.anniversaryDate = new Date(payload.anniversaryDate).toISOString();
      if (payload.nextFollowUpDate) payload.nextFollowUpDate = new Date(payload.nextFollowUpDate).toISOString();
      if (payload.estimatedValue) payload.estimatedValue = Number(payload.estimatedValue) || null;
      payload.assignedToUsers = formData.assignedToUserIds;
      payload.assignedTo = formData.assignedToUserIds[0] || null;
      const res = await api.patch(`/api/leads/${leadId}`, payload);
      setLead(res);
      onUpdate();
      success('Contact updated successfully');
    });
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNoteAndFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNote = newNote.trim();
    if (!trimmedNote && selectedFiles.length === 0) {
      error('Input Required', 'Please enter a note or choose at least one file to attach.');
      return;
    }

    setUploadingDoc(true);
    try {
      let uploadedDocs: any[] = [];
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const fData = new FormData();
          fData.append('file', file);
          const upRes = await axiosApi.post('/tasks/upload-media', fData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const uData = upRes.data || {};
          const fileUrl = uData.fileUrl || uData.url;
          if (!fileUrl) throw new Error(`Failed to upload ${file.name}`);
          return {
            name: uData.fileName || file.name,
            url: fileUrl,
            type: uData.fileType || file.type || 'document',
            size: `${(file.size / 1024).toFixed(1)} KB`,
          };
        });

        uploadedDocs = await Promise.all(uploadPromises);
      }

      await axiosApi.post(`/leads-engine/leads/${leadId}/documents`, {
        documents: uploadedDocs,
        note: trimmedNote,
      });

      success(
        'Saved Successfully',
        uploadedDocs.length > 0
          ? `${uploadedDocs.length} file(s) ${trimmedNote ? '& note ' : ''}attached successfully!`
          : 'Note added successfully!'
      );

      setNewNote('');
      setSelectedFiles([]);
      await fetchLeadDetails();
      await fetchActivities();
      onUpdate();
    } catch (err: any) {
      error('Failed to Save', err?.response?.data?.message || err?.message || 'Could not save note/files');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    const ok = await confirm({
      title: 'Delete Attachment',
      message: `Are you sure you want to remove "${docName}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await axiosApi.delete(`/leads-engine/leads/${leadId}/documents/${docId}`);
      success('Attachment Removed');
      await fetchLeadDetails();
      await fetchActivities();
      onUpdate();
    } catch (err: any) {
      error('Delete Failed', err?.response?.data?.message || 'Failed to remove document');
    }
  };

  const handleSendTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    await run('send', async () => {
      const res = await api.post(`/api/leads/${leadId}/send-template`, {
        templateId: selectedTemplate.id || selectedTemplate._id,
        variableValues: varMapping,
      });

      if (res?.metaSent) {
        setSendSuccess('WhatsApp message delivered to user via WhatsApp API!');
        success('Message Sent Successfully', 'Template message delivered to user on WhatsApp');
      } else if (res?.metaError) {
        error('WhatsApp API Error', res.metaError);
        setSendSuccess(res.metaError);
      } else {
        setSendSuccess(res?.message || 'Message processed.');
        success('Message Sent', res?.message);
      }

      setSelectedTemplate(null);
      setVarMapping({});
      fetchMessages();
      fetchActivities();
      setTimeout(() => setSendSuccess(null), 6000);
    });
  };

  const handleDeleteLead = async () => {
    const ok = await confirm({
      title: 'Delete Contact',
      message: 'Delete this contact? The record will be soft-deleted.',
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

  // Build unified, deduplicated, chronological timeline stream
  const buildUnifiedTimeline = () => {
    const items: any[] = [];

    // 1. From activities API
    (activities || []).forEach((act: any, idx: number) => {
      items.push({
        id: act.id || act._id || `act-${idx}`,
        title: act.title || 'Activity',
        description: act.description || '',
        type: act.type || 'ACTIVITY',
        attachment: act.attachment || null,
        date: new Date(act.createdAt || act.timestamp || Date.now()),
        rawDate: act.createdAt,
      });
    });

    // 2. From lead.notes string (formatted bullets)
    if (typeof lead?.notes === 'string' && lead.notes.trim()) {
      const lines = lead.notes.split('\n').filter(Boolean);
      lines.forEach((rawLine: string, idx: number) => {
        const line = rawLine.replace(/^[•\-\*]\s*/, '').trim();
        const bracketMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
        const timestampStr = bracketMatch ? bracketMatch[1] : null;
        let text = bracketMatch ? bracketMatch[2] : line;

        let docObj: any = null;
        const docTagMatch = text.match(/\[Doc:\s*(.*?)\s*\|\s*(.*?)\]/);
        if (docTagMatch) {
          docObj = { name: docTagMatch[1], url: docTagMatch[2] };
          text = text.replace(/\[Doc:.*?\]/, '').trim();
        }

        const isDup = items.some(
          (it) => it.description === text || (docObj && it.attachment?.url === docObj.url)
        );
        if (!isDup) {
          let parsedDate = new Date();
          if (timestampStr) {
            const d = new Date(timestampStr);
            if (!isNaN(d.getTime())) parsedDate = d;
          }
          items.push({
            id: `note-line-${idx}`,
            title: text.toLowerCase().includes('status changed')
              ? 'Stage Transition'
              : text.toLowerCase().includes('document attached')
              ? 'Document Attached'
              : 'Note / Follow-Up',
            description: text,
            type: text.toLowerCase().includes('status changed')
              ? 'STATUS_CHANGE'
              : docObj
              ? 'DOCUMENT'
              : 'NOTE',
            attachment: docObj,
            timestampStr: timestampStr,
            date: parsedDate,
            rawDate: timestampStr,
          });
        }
      });
    }

    // 3. From lead.documents
    (lead?.documents || []).forEach((doc: any, idx: number) => {
      const isDup = items.some((it) => it.attachment?.url === doc.url);
      if (!isDup) {
        items.push({
          id: doc._id || `doc-${idx}`,
          title: 'Document Attached',
          description: `${doc.name || 'File'} ${doc.size ? `(${doc.size})` : ''}`,
          type: 'DOCUMENT',
          attachment: { name: doc.name, url: doc.url, type: doc.type, size: doc.size },
          date: new Date(doc.uploadedAt || lead?.createdAt || Date.now()),
          rawDate: doc.uploadedAt,
        });
      }
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  // Extract all documents (from documents array + notes)
  const getAllDocuments = () => {
    const docsMap = new Map<string, any>();
    (lead?.documents || []).forEach((d: any) => {
      if (d.url) docsMap.set(d.url, d);
    });
    if (typeof lead?.notes === 'string') {
      const matches = lead.notes.matchAll(/\[Doc:\s*(.*?)\s*\|\s*(.*?)\]/g);
      for (const m of matches) {
        const name = m[1];
        const url = m[2];
        if (url && !docsMap.has(url)) {
          docsMap.set(url, { name, url, type: 'document', size: '' });
        }
      }
    }
    return Array.from(docsMap.values());
  };

  const allDocumentsList = getAllDocuments();
  const unifiedTimeline = buildUnifiedTimeline();

  const openFullLeadDetails = () => {
    const isCompany = window.location.pathname.startsWith('/company');
    const isManager = window.location.pathname.startsWith('/manager');
    const prefix = isCompany ? '/company/leads' : isManager ? '/manager/leads' : '/hr/leads';
    navigate(`${prefix}/${leadId}`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-xl bg-white dark:bg-[#0A0F18] h-screen flex items-center justify-center border-l border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin w-8 h-8 text-amber-500" />
        </div>
      </div>
    );
  }

  const initials = (name?: string) => {
    if (!name) return 'U';
    const p = name.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  const safeTemplates = Array.isArray(templates)
    ? templates
    : Array.isArray((templates as any)?.templates)
    ? (templates as any).templates
    : [];
  const safeTags = Array.isArray(availableTags)
    ? availableTags
    : Array.isArray((availableTags as any)?.tags)
    ? (availableTags as any).tags
    : [];
  const safeNotes = Array.isArray(notes) ? notes : [];
  const safeMessages = Array.isArray(messages)
    ? messages
    : Array.isArray((messages as any)?.messages)
    ? (messages as any).messages
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-51 w-full max-w-xl bg-white dark:bg-[#0A0F18] h-screen flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slideLeft text-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-extrabold text-sm shadow-md shrink-0">
              {initials(lead?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">{lead?.name || 'Lead Details'}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <StatusBadge name={lead?.status?.name} color={lead?.status?.color} />
                {lead?.company && (
                  <span className="text-[10.5px] font-bold text-slate-300">
                    • {lead.company}
                  </span>
                )}
                {lead?.tags?.map((tag: any, idx: number) => (
                  <span
                    key={tag.id || tag._id || tag.name || `tag-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{
                      backgroundColor: `${tag.color || '#f59e0b'}20`,
                      color: tag.color || '#f59e0b',
                      borderColor: `${tag.color || '#f59e0b'}40`,
                    }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag.name}
                  </span>
                ))}
                {!lead?.whatsappOptIn && (
                  <span className="text-[9.5px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/60">
                    Opted Out
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openFullLeadDetails}
              className="w-8 h-8 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center transition-all cursor-pointer"
              title="Open full page lead details"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteLead}
              disabled={isLoading('delete')}
              className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
              title="Delete contact"
            >
              {isLoading('delete') ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex bg-slate-50 dark:bg-[#0E1522] border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'notes_files'
                ? safeNotes.length + allDocumentsList.length
                : tab.id === 'timeline'
                ? unifiedTimeline.length
                : null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 border-amber-600 dark:border-amber-500 bg-white dark:bg-[#0A0F18]'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {count !== null && count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/60 dark:bg-[#070B11] text-slate-800 dark:text-slate-200 custom-scrollbar">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateLead} className="space-y-4">
              
              {/* Card 1: Contact Information */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <User size={13} className="text-amber-500" /> Contact Profile
                </h4>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Smartphone size={11} className="text-emerald-500" /> WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.whatsappPhone}
                      onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Phone size={11} className="text-blue-500" /> Alternate Phone
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Mail size={11} className="text-purple-500" /> Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Building size={11} className="text-amber-500" /> Company / Organization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Solar Works Ltd"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Deal & Pipeline Setup */}
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <DollarSign size={13} className="text-emerald-500" /> Pipeline &amp; Follow-up
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pipeline Stage *</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      value={formData.statusId}
                      onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                    >
                      {(Array.isArray(statuses) ? statuses : []).map((st) => (
                        <option key={st.id || st._id} value={st.id || st._id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Lead Source</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    >
                      {(Array.isArray(sources) ? sources : []).map((src) => (
                        <option key={src.id || src._id} value={src.name}>{src.name}</option>
                      ))}
                      {formData.source && !(Array.isArray(sources) ? sources : []).some((s) => s.name === formData.source) && (
                        <option value={formData.source}>{formData.source}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Assigned Staff / Team Section */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={12} className="text-amber-500" />
                      Assigned Team Members ({formData.assignedToUserIds.length})
                    </label>
                    {formData.assignedToUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, assignedToUserIds: [], assignedTo: '' }))}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Selected Staff Member Chips */}
                  {formData.assignedToUserIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.assignedToUserIds.map((id, idx) => {
                        const emp = staffList.find((e: any) => {
                          const eId = String(e.userId?._id || e.userId || e._id || e.id);
                          return eId === String(id);
                        });
                        const leadUser = lead?.assignedToUsers?.find((u: any) => String(u._id || u.id) === String(id));
                        const name = emp?.name || emp?.fullName || leadUser?.name || (idx === 0 && lead?.assignedTo?.name ? lead.assignedTo.name : 'Staff');
                        const role = emp?.role || emp?.department || leadUser?.role || '';
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-black flex items-center justify-center shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="max-w-[120px] truncate">{name}</span>
                            {idx === 0 && (
                              <span className="text-[8.5px] font-black uppercase tracking-wider bg-amber-300/40 dark:bg-amber-700/40 text-amber-950 dark:text-amber-100 px-1 py-0.2 rounded shrink-0">
                                Primary
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(id)}
                              className="w-4 h-4 rounded hover:bg-amber-200 dark:hover:bg-amber-800/80 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title={`Remove ${name}`}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-0.5">
                      No staff assigned yet. This lead is in the General Pool.
                    </p>
                  )}

                  {/* Dropdown Menu to Add/Toggle Staff Members */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStaffMenuOpen(!staffMenuOpen)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-500 focus:outline-none flex items-center justify-between cursor-pointer shadow-2xs transition-colors"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <UserCheck size={13} className="text-amber-500 shrink-0" />
                        <span>
                          {formData.assignedToUserIds.length === 0
                            ? '+ Assign Staff Members...'
                            : `+ Add / Manage Staff (${formData.assignedToUserIds.length} selected)`}
                        </span>
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-slate-400 transition-transform ${staffMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {staffMenuOpen && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-1.5 max-h-60 flex flex-col animate-fadeIn">
                        {staffList.length > 5 && (
                          <div className="relative shrink-0">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={staffSearchQuery}
                              onChange={(e) => setStaffSearchQuery(e.target.value)}
                              placeholder="Search employee..."
                              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                            />
                          </div>
                        )}

                        <div className="overflow-y-auto space-y-1 custom-scrollbar flex-1">
                          {staffList
                            .filter((emp: any) => {
                              if (!staffSearchQuery.trim()) return true;
                              const name = emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '';
                              return name.toLowerCase().includes(staffSearchQuery.toLowerCase());
                            })
                            .map((emp: any) => {
                              const empId = String(emp.userId?._id || emp.userId || emp._id || emp.id);
                              const empName = emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Staff';
                              const role = emp.role || emp.department || '';
                              const isSelected = formData.assignedToUserIds.includes(empId);

                              return (
                                <button
                                  key={empId}
                                  type="button"
                                  onClick={() => handleToggleStaff(empId)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      isSelected
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                      {empName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate">{empName}</span>
                                    {role && (
                                      <span className="text-[10px] text-slate-400 truncate">({role})</span>
                                    )}
                                  </div>

                                  <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-500 border-amber-500 text-white'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                  }`}>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                  </div>
                                </button>
                              );
                            })}

                          {staffList.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-2">No employees found.</p>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] shrink-0">
                          <span className="text-slate-400 font-medium">
                            {formData.assignedToUserIds.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setStaffMenuOpen(false)}
                            className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deal Value & Next Follow-Up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <DollarSign size={11} className="text-emerald-500" /> Est. Deal Value (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-amber-500" /> Next Follow-Up Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.nextFollowUpDate}
                      onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Product / Service Interest */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Product / Service Interest</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    value={isCustomProduct ? '__CUSTOM__' : formData.productService}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setIsCustomProduct(true);
                        setFormData({ ...formData, productService: customProductText });
                      } else {
                        setIsCustomProduct(false);
                        setFormData({ ...formData, productService: val });
                      }
                    }}
                  >
                    <option value="">-- Select Product / Service --</option>
                    {products.map((p) => (
                      <option key={p.id || p._id} value={p.name}>
                        {p.name} {p.price ? `(₹${Number(p.price).toLocaleString()})` : ''}
                      </option>
                    ))}
                    <option value="__CUSTOM__" className="text-blue-500 font-bold">
                      ✍️ Custom Requirement (Type manually)...
                    </option>
                  </select>

                  {isCustomProduct && (
                    <div className="mt-2">
                      <input
                        type="text"
                        autoFocus
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-amber-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                        placeholder="Type custom product or service..."
                        value={customProductText}
                        onChange={(e) => {
                          setCustomProductText(e.target.value);
                          setFormData({ ...formData, productService: e.target.value });
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Birthday</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Anniversary</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                      value={formData.anniversaryDate}
                      onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Tag Multi-select */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-500" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {safeTags.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No tags created yet</p>
                    ) : (
                      safeTags.map((tag) => {
                        const isSelected = formData.tagIds.includes(tag.id || tag._id);
                        return (
                          <button
                            key={tag.id || tag._id}
                            type="button"
                            onClick={() => {
                              const tId = tag.id || tag._id;
                              const newTagIds = isSelected
                                ? formData.tagIds.filter((id) => id !== tId)
                                : [...formData.tagIds, tId];
                              setFormData({ ...formData, tagIds: newTagIds });
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: tag.color || '#f59e0b' }}
                            />
                            <span>{tag.name}</span>
                            {isSelected && <span className="text-[10px] ml-0.5">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Opt-in toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">WhatsApp Opt-in</p>
                    <p className="text-[11px] text-slate-400">Required for official Meta Cloud broadcast campaigns</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.whatsappOptIn}
                      onChange={(e) => setFormData({ ...formData, whatsappOptIn: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading('update')}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading('update') ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isLoading('update') ? 'Saving Changes...' : 'Save Lead Changes'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: UNIFIED TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-500" /> Interaction &amp; Activity Stream
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {unifiedTimeline.length} events logged
                </span>
              </div>

              {unifiedTimeline.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#111C24] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
                  <Clock size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-xs">No activity logged yet</p>
                  <p className="text-[11px]">Status changes, notes, and attached documents will appear here.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {unifiedTimeline.map((item, idx) => {
                    const isStatus = item.type === 'STATUS_CHANGE';
                    const isDoc = item.type === 'DOCUMENT' || Boolean(item.attachment);
                    const isMsg = item.type === 'MESSAGE';

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isStatus
                              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500'
                              : isDoc
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500'
                              : isMsg
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500'
                              : 'bg-blue-50 dark:bg-blue-950/60 border-blue-500'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isStatus
                                ? 'bg-amber-500'
                                : isDoc
                                ? 'bg-purple-500'
                                : isMsg
                                ? 'bg-emerald-500'
                                : 'bg-blue-500'
                            }`}
                          />
                        </div>

                        {/* Content Card */}
                        <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-black text-[11px] uppercase tracking-wider ${
                                isStatus
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : isDoc
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : isMsg
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock size={10} />
                              {item.timestampStr
                                ? item.timestampStr
                                : item.date instanceof Date && !isNaN(item.date.getTime())
                                ? item.date.toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })
                                : 'Recent'}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {item.description}
                            </p>
                          )}

                          {/* Attached Document Pill */}
                          {item.attachment?.url && (
                            <div className="pt-1">
                              <a
                                href={item.attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs group"
                              >
                                <Paperclip size={12} className="text-amber-500 shrink-0" />
                                <span className="truncate max-w-[240px]">
                                  {item.attachment.name || 'Attached File'}
                                </span>
                                {item.attachment.size && (
                                  <span className="text-[9.5px] text-slate-400 font-mono">
                                    ({item.attachment.size})
                                  </span>
                                )}
                                <ExternalLink size={11} className="text-slate-400 group-hover:text-amber-500 shrink-0 ml-1" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNIFIED NOTES & ATTACHMENTS */}
          {activeTab === 'notes_files' && (
            <div className="space-y-4">
              {/* Top Composer Card */}
              <form onSubmit={handleSaveNoteAndFiles} className="p-4 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-amber-500" />
                    <span>Add Note &amp; Attach Files</span>
                  </label>
                  {selectedFiles.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-mono">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none transition-colors"
                  placeholder="Write a note, remarks, discussion points, or description for attached files..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />

                {/* Selected Files Queue / Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ready to upload:
                    </p>
                    <div className="space-y-1">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-[#111C24] rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Paperclip size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                            title="Remove file"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs">
                    <Paperclip size={13} className="text-amber-500" />
                    <span>Attach Files (Multiple)</span>
                    <input
                      type="file"
                      multiple
                      disabled={uploadingDoc}
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={uploadingDoc || (!newNote.trim() && selectedFiles.length === 0)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {uploadingDoc ? (
                      <>
                        <Loader2 className="animate-spin w-3.5 h-3.5" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Note &amp; Files</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Sub-filter Tabs */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Records History
                </span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNotesFilesFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      notesFilesFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    All ({safeNotes.length + allDocumentsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesFilesFilter('files')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      notesFilesFilter === 'files'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Files ({allDocumentsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesFilesFilter('notes')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      notesFilesFilter === 'notes'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Notes ({safeNotes.length})
                  </button>
                </div>
              </div>

              {/* Stream List */}
              {safeNotes.length === 0 && allDocumentsList.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#111C24] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-xs">No notes or files attached yet</p>
                  <p className="text-[11px]">Write remarks or attach documents above to record history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Documents Section */}
                  {(notesFilesFilter === 'all' || notesFilesFilter === 'files') && allDocumentsList.length > 0 && (
                    <div className="space-y-2">
                      {notesFilesFilter === 'all' && (
                        <h5 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                          <Paperclip size={12} className="text-amber-500" /> Attached Files ({allDocumentsList.length})
                        </h5>
                      )}
                      <div className="space-y-2">
                        {allDocumentsList.map((doc: any, idx: number) => {
                          const isImg = (doc.name || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
                          const isPdf = (doc.name || '').match(/\.pdf$/i);

                          return (
                            <div
                              key={doc._id || idx}
                              className="p-3 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isImg
                                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600'
                                      : isPdf
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600'
                                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600'
                                  }`}
                                >
                                  {isImg ? <Image size={16} /> : isPdf ? <FileText size={16} /> : <File size={16} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {doc.name || 'Attachment'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {doc.size || 'Attached file'} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'Uploaded'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                                  title="Open in new tab"
                                >
                                  <ExternalLink size={13} />
                                </a>
                                {doc._id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc._id, doc.name)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                    title="Delete file"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {(notesFilesFilter === 'all' || notesFilesFilter === 'notes') && safeNotes.length > 0 && (
                    <div className="space-y-2">
                      {notesFilesFilter === 'all' && (
                        <h5 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 pt-1">
                          <FileText size={12} className="text-amber-500" /> Notes History ({safeNotes.length})
                        </h5>
                      )}
                      <div className="space-y-2">
                        {safeNotes.map((note, idx) => {
                          const noteText = typeof note.note === 'string' ? note.note : JSON.stringify(note.note);
                          const docMatches = Array.from(noteText.matchAll(/\[Doc:\s*(.*?)\s*\|\s*(.*?)\]/g));
                          const cleanText = noteText.replace(/\[Doc:.*?\]/g, '').trim();

                          return (
                            <div
                              key={note.id || note._id || `note-${idx}`}
                              className="p-3.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs space-y-2"
                            >
                              {cleanText && (
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {cleanText}
                                </p>
                              )}

                              {docMatches.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {docMatches.map((dm, dIdx) => (
                                    <a
                                      key={dIdx}
                                      href={dm[2]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-bold hover:underline"
                                    >
                                      <Paperclip size={11} />
                                      <span className="truncate max-w-[200px]">{dm[1]}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                <span>{note.createdBy?.name || 'Staff Member'}</span>
                                <span>{new Date(note.createdAt).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SEND WHATSAPP TEMPLATE */}
          {activeTab === 'send' && (
            <div className="space-y-4">
              {!lead?.whatsappOptIn ? (
                <div className="flex gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This contact has opted out of WhatsApp campaign messages.</span>
                </div>
              ) : safeTemplates.length === 0 ? (
                <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>No approved Meta WhatsApp templates found. Sync templates in the Campaigns module.</span>
                </div>
              ) : (
                <form onSubmit={handleSendTemplate} className="space-y-4">
                  {sendSuccess && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{sendSuccess}</span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Select Meta WhatsApp Template</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        value={selectedTemplate?.id || ''}
                        onChange={(e) => {
                          const tpl = safeTemplates.find((t) => t.id === e.target.value);
                          setSelectedTemplate(tpl || null);
                          setVarMapping({});
                        }}
                      >
                        <option value="">Choose a verified template...</option>
                        {safeTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.language})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedTemplate && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.headerType) && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {selectedTemplate.headerType} Header Media
                        </span>
                        <MediaUrlUploader
                          value={varMapping['headerMediaUrl'] || ''}
                          onChange={(url) => setVarMapping({ ...varMapping, headerMediaUrl: url })}
                          headerType={selectedTemplate.headerType}
                          placeholder="https://example.com/file.jpg"
                        />
                      </div>
                    )}

                    {selectedTemplate?.variablesJson?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fill Variables</label>
                        {(selectedTemplate.variablesJson as string[]).map((vNum: string) => (
                          <div key={vNum} className="flex items-center gap-2">
                            <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shrink-0">
                              {`{{${vNum}}}`}
                            </span>
                            <input
                              type="text"
                              required
                              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                              placeholder={`Value for {{${vNum}}}`}
                              value={varMapping[vNum] || ''}
                              onChange={(e) => setVarMapping({ ...varMapping, [vNum]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedTemplate && (
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block">Preview</span>
                      <TemplatePreview template={selectedTemplate} variableMapping={varMapping} />
                    </div>
                  )}

                  {selectedTemplate && (
                    <button
                      type="submit"
                      disabled={isLoading('send')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading('send') ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <span>{isLoading('send') ? 'Sending via WhatsApp...' : 'Broadcast WhatsApp Message'}</span>
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TAB 6: MESSAGES HISTORY */}
          {activeTab === 'messages' && (
            <div className="space-y-3">
              {safeMessages.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#111C24] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-bold">
                  No WhatsApp messages dispatched yet
                </div>
              ) : (
                safeMessages.map((msg, idx) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const rawStatus =
                    typeof msg.status === 'string'
                      ? msg.status
                      : msg.status?.message_status || msg.status?.status || 'SENT';
                  const content =
                    typeof msg.messageContent === 'string'
                      ? msg.messageContent
                      : typeof msg.messageContent === 'object'
                      ? JSON.stringify(msg.messageContent)
                      : String(msg.messageContent || '');

                  return (
                    <div
                      key={msg.id || msg._id || `msg-${idx}`}
                      className={`max-w-[85%] p-3 rounded-2xl border shadow-2xs space-y-1.5 ${
                        isInbound
                          ? 'bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-800 mr-auto'
                          : 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 ml-auto'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-mono">
                        <span className="font-bold text-slate-500 uppercase">{msg.source || 'WHATSAPP'}</span>
                        <span>{new Date(msg.scheduledAt || msg.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {content}
                      </p>
                      {!isInbound && (
                        <div className="flex justify-end pt-0.5">
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {rawStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
