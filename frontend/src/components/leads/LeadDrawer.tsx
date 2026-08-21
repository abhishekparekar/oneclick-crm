import React, { useState, useEffect } from 'react';
import { api } from '../../utils/leads/api';
import StatusBadge from './StatusBadge';
import TemplatePreview from './TemplatePreview';
import MediaUrlUploader from './MediaUrlUploader';
import { useToast } from './Toast';
import { useActionLoader } from './ActionLoader';
import {
  X, MessageSquare, FileText, History, Save, Trash2, Plus,
  Loader2, Send, User, Calendar, AlertCircle, CheckCircle, Clock, Tag
} from 'lucide-react';

interface LeadDrawerProps {
  leadId: string;
  onClose: () => void;
  onUpdate: () => void;
  statuses: any[];
  sources: any[];
  allTags?: any[];
}

type TabId = 'details' | 'notes' | 'send' | 'messages' | 'timeline';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'details', label: 'Details', icon: User },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'send', label: 'Send', icon: Send },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'timeline', label: 'Timeline', icon: History },
];

export default function LeadDrawer({ leadId, onClose, onUpdate, statuses, sources, allTags }: LeadDrawerProps) {
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

  const [formData, setFormData] = useState({
    name: '', whatsappPhone: '', phone: '', email: '',
    productService: '', source: 'Walk-in', statusId: '',
    whatsappOptIn: true, dateOfBirth: '', anniversaryDate: '',
    tagIds: [] as string[],
  });

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
        setFormData({
          name: res.name || '', whatsappPhone: res.whatsappPhone || '',
          phone: res.phone || '', email: res.email || '',
          productService: res.productService || '', source: res.source || 'Walk-in',
          statusId: res.statusId || '', whatsappOptIn: res.whatsappOptIn ?? true,
          dateOfBirth: res.dateOfBirth ? new Date(res.dateOfBirth).toISOString().split('T')[0] : '',
          anniversaryDate: res.anniversaryDate ? new Date(res.anniversaryDate).toISOString().split('T')[0] : '',
          tagIds: res.tags ? res.tags.map((t: any) => t.id) : [],
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await run('update', async () => {
      const payload: any = { ...formData };
      if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
      if (payload.anniversaryDate) payload.anniversaryDate = new Date(payload.anniversaryDate).toISOString();
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
    const ok = await confirm({ title: 'Delete Contact', message: 'Delete this contact? The record will be soft-deleted and can be restored by re-adding the same number.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await run('delete', async () => {
      await api.delete(`/api/leads/${leadId}`);
      success('Contact deleted');
      onUpdate();
      onClose();
    });
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #E5E7EB' }}>
          <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#0E6B50' }} />
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
  const safeActivities = Array.isArray(activities)
    ? activities
    : Array.isArray((activities as any)?.activities)
    ? (activities as any).activities
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-md animate-fadeIn font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-51 w-full max-w-xl bg-white dark:bg-[#0A0F18] h-screen flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slideLeft text-xs"
      >
        {/* Luxury Obsidian Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-extrabold text-sm shadow-md shrink-0">
              {initials(lead?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">{lead?.name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <StatusBadge name={lead?.status?.name} color={lead?.status?.color} />
                {lead?.tags?.map((tag: any, idx: number) => (
                  <span 
                    key={tag.id || tag._id || tag.name || `tag-${idx}`} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border"
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
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/60">
                    Opted Out
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
        <div className="flex bg-slate-50 dark:bg-[#0E1522] border-b border-slate-200 dark:border-slate-800 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  isActive
                    ? "text-amber-700 dark:text-amber-400 border-amber-600 dark:border-amber-500 bg-white dark:bg-[#0A0F18]"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#FAFAFA' }}>

          {/* TAB: Details */}
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateLead} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card-elevated" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="form-label">Full Name</label>
                    <input type="text" required className="input-base" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">WhatsApp Number</label>
                      <input type="tel" required className="input-base" value={formData.whatsappPhone}
                        onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Secondary Phone</label>
                      <input type="tel" className="input-base" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Email Address</label>
                    <input type="email" className="input-base" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="card-elevated" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="select-base" value={formData.statusId}
                        onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}>
                        {(Array.isArray(statuses) ? statuses : []).map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Source</label>
                      <select className="select-base" value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                        {(Array.isArray(sources) ? sources : []).map((src) => <option key={src.id} value={src.name}>{src.name}</option>)}
                        {formData.source && !(Array.isArray(sources) ? sources : []).some(s => s.name === formData.source) && (
                          <option value={formData.source}>{formData.source}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Product / Service Interest</label>
                    <select
                      className="select-base"
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
                      <option value="">-- Select Product / Service (Admin Added) --</option>
                      {products.map((p) => (
                        <option key={p.id || p._id} value={p.name}>
                          {p.name} {p.price ? `(₹${Number(p.price).toLocaleString()})` : ''}
                        </option>
                      ))}
                      <option value="__CUSTOM__" style={{ color: '#3B82F6', fontWeight: 'bold' }}>
                        ✍️ Other / Custom Requirement (Type manually)...
                      </option>
                    </select>

                    {isCustomProduct && (
                      <div style={{ marginTop: 6 }}>
                        <input
                          type="text"
                          autoFocus
                          required
                          className="input-base"
                          placeholder="Type custom product or service requirement..."
                          value={customProductText}
                          onChange={(e) => {
                            setCustomProductText(e.target.value);
                            setFormData({ ...formData, productService: e.target.value });
                          }}
                          style={{ borderColor: '#F59E0B' }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">Birthday</label>
                      <input type="date" className="input-base" value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Anniversary</label>
                      <input type="date" className="input-base" value={formData.anniversaryDate}
                        onChange={(e) => setFormData({ ...formData, anniversaryDate: e.target.value })} />
                    </div>
                  </div>

                  {/* Tag Multi-select */}
                  <div>
                    <label className="form-label" style={{ marginBottom: 6 }}>
                      <Tag style={{ width: 11, height: 11, display: 'inline', marginRight: 4, color: '#6366F1' }} />
                      Tags
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {safeTags.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>No tags created yet</p>
                      ) : (
                        safeTags.map(tag => {
                          const isSelected = formData.tagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                const newTagIds = isSelected
                                  ? formData.tagIds.filter(id => id !== tag.id)
                                  : [...formData.tagIds, tag.id];
                                setFormData({ ...formData, tagIds: newTagIds });
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', border: '1px solid',
                                borderColor: isSelected ? (tag.color || '#6366F1') : '#E2E8F0',
                                background: isSelected ? `${tag.color || '#6366F1'}20` : '#FFFFFF',
                                color: isSelected ? (tag.color || '#6366F1') : '#64748B',
                                transition: 'all 150ms ease',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color || '#6366F1' }} />
                              {tag.name}
                              {isSelected && <span style={{ marginLeft: 2, fontSize: 11 }}>✓</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Opt-in toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>WhatsApp Opt-in</p>
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Required for campaign messages</p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" className="toggle-input" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        checked={formData.whatsappOptIn} onChange={(e) => setFormData({ ...formData, whatsappOptIn: e.target.checked })} />
                      <div className="toggle-track" />
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isLoading('update')} className="btn btn-primary" style={{ width: '100%' }}>
                {isLoading('update') ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
                {isLoading('update') ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* TAB: Notes */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <form onSubmit={handleAddNote} className="card-elevated" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea rows={3} required className="textarea-base" style={{ background: '#F9FAFB' }}
                  placeholder="Write a note about this contact..."
                  value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isLoading('note') || !newNote.trim()} className="btn btn-primary btn-sm">
                    {isLoading('note') ? <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> : <Plus style={{ width: 12, height: 12 }} />}
                    Add Note
                  </button>
                </div>
              </form>
              {safeNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>No notes yet</div>
              ) : (
                safeNotes.map((note, idx) => (
                  <div key={note.id || note._id || `note-${idx}`} className="card-elevated animate-fade-in" style={{ padding: 14 }}>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {typeof note.note === 'string' ? note.note : JSON.stringify(note.note)}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, textAlign: 'right' }}>
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Send WhatsApp */}
          {activeTab === 'send' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!lead?.whatsappOptIn ? (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  This contact has opted out of WhatsApp messages.
                </div>
              ) : safeTemplates.length === 0 ? (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309', fontSize: 13 }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  No approved templates found. Sync templates in the Campaigns module.
                </div>
              ) : (
                <form onSubmit={handleSendTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {sendSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 13 }}>
                      <CheckCircle style={{ width: 15, height: 15 }} /> {sendSuccess}
                    </div>
                  )}

                  <div className="card-elevated" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="form-label">Select Template</label>
                      <select className="select-base"
                        value={selectedTemplate?.id || ''}
                        onChange={(e) => { const tpl = safeTemplates.find(t => t.id === e.target.value); setSelectedTemplate(tpl || null); setVarMapping({}); }}>
                        <option value="">Choose a template...</option>
                        {safeTemplates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.language})</option>)}
                      </select>
                    </div>

                    {selectedTemplate && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.headerType) && (() => {
                      const mediaIcon = selectedTemplate.headerType === 'IMAGE' ? '🖼️' : selectedTemplate.headerType === 'VIDEO' ? '🎥' : '📄';
                      const mediaBg = selectedTemplate.headerType === 'IMAGE' ? { bg: '#EFF6FF', border: '#BFDBFE', label: '#1D4ED8' } : selectedTemplate.headerType === 'VIDEO' ? { bg: '#FFF7ED', border: '#FED7AA', label: '#C2410C' } : { bg: '#F0FDF4', border: '#BBF7D0', label: '#15803D' };
                      return (
                        <div style={{
                          background: mediaBg.bg, border: `1px solid ${mediaBg.border}`,
                          borderRadius: 10, padding: '12px 14px', marginTop: 4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>{mediaIcon}</span>
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 700, color: mediaBg.label, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                {selectedTemplate.headerType} MEDIA
                              </p>
                              <p style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>Upload files directly or paste a public URL</p>
                            </div>
                          </div>
                          <MediaUrlUploader
                            value={varMapping['headerMediaUrl'] || ''}
                            onChange={(url) => setVarMapping({ ...varMapping, headerMediaUrl: url })}
                            headerType={selectedTemplate.headerType}
                            borderColor={mediaBg.border}
                            labelColor={mediaBg.label}
                            placeholder="https://example.com/file.jpg"
                          />
                        </div>
                      );
                    })()}

                    {selectedTemplate?.variablesJson?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="form-label">Variables</label>
                        {(selectedTemplate.variablesJson as string[]).map((vNum: string) => (
                          <div key={vNum} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#0E6B50', background: '#ECFDF5', padding: '3px 7px', borderRadius: 5, fontFamily: 'monospace', flexShrink: 0 }}>
                              {`{{${vNum}}}`}
                            </span>
                            <input type="text" required className="input-base" style={{ flex: 1 }}
                              placeholder={`Value for {{${vNum}}}`}
                              value={varMapping[vNum] || ''}
                              onChange={(e) => setVarMapping({ ...varMapping, [vNum]: e.target.value })} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedTemplate && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Preview</p>
                      <TemplatePreview template={selectedTemplate} variableMapping={varMapping} />
                    </div>
                  )}

                  {selectedTemplate && (
                    <button type="submit" disabled={isLoading('send')} className="btn btn-primary" style={{ width: '100%', background: '#16A34A', borderColor: '#16A34A' }}>
                      {isLoading('send') ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Send style={{ width: 14, height: 14 }} />}
                      {isLoading('send') ? 'Sending...' : 'Send WhatsApp Message'}
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TAB: Messages */}
          {activeTab === 'messages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {safeMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>No messages yet</div>
              ) : (
                safeMessages.map((msg, idx) => {
                  const isInbound = msg.direction === 'INBOUND';
                  const rawStatus = typeof msg.status === 'string' ? msg.status : (msg.status?.message_status || msg.status?.status || 'SENT');
                  const statusColor = rawStatus === 'READ' ? '#2563EB' : rawStatus === 'DELIVERED' ? '#16A34A' : rawStatus === 'SENT' ? '#6B7280' : rawStatus === 'FAILED' ? '#EF4444' : '#9CA3AF';
                  const content = typeof msg.messageContent === 'string' ? msg.messageContent : (typeof msg.messageContent === 'object' ? JSON.stringify(msg.messageContent) : String(msg.messageContent || ''));
                  const source = typeof msg.source === 'string' ? msg.source : 'WHATSAPP';
                  const errMsg = typeof msg.errorMessage === 'string' ? msg.errorMessage : (typeof msg.errorMessage === 'object' ? JSON.stringify(msg.errorMessage) : '');
                  const errCode = typeof msg.errorCode === 'string' ? msg.errorCode : '';

                  return (
                    <div key={msg.id || msg._id || `msg-${idx}`}
                      style={{
                        maxWidth: '85%', padding: '10px 12px', borderRadius: 10,
                        background: isInbound ? '#FFFFFF' : '#F0F0FF',
                        border: `1px solid ${isInbound ? '#E5E7EB' : '#DDDEFE'}`,
                        marginLeft: isInbound ? 0 : 'auto',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{source}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>
                          {new Date(msg.scheduledAt || msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{content}</p>
                      {!isInbound && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{rawStatus}</span>
                          {rawStatus === 'FAILED' && errMsg && (
                            <span style={{ fontSize: 10, color: '#EF4444', marginLeft: 4 }} title={errMsg}>({errCode || 'Error'})</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: Timeline */}
          {activeTab === 'timeline' && (
            <div style={{ position: 'relative', paddingLeft: 20, borderLeft: '2px solid #E5E7EB', marginLeft: 8 }}>
              {safeActivities.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', padding: '32px 0' }}>No activity recorded yet</p>
              ) : (
                safeActivities.map((act, idx) => {
                  const title = typeof act.title === 'string' ? act.title : (typeof act.title === 'object' ? JSON.stringify(act.title) : 'Activity');
                  const desc = typeof act.description === 'string' ? act.description : (typeof act.description === 'object' ? JSON.stringify(act.description) : '');

                  return (
                    <div key={act.id || act._id || `act-${idx}`} className="relative animate-fade-in" style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F9FAFB' }}>
                      <span style={{
                        position: 'absolute', left: -27, top: 4, width: 10, height: 10,
                        borderRadius: '50%', background: '#0E6B50', border: '2px solid #FAFAFA', display: 'block',
                      }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{title}</p>
                        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{desc}</p>
                      <p style={{ fontSize: 11, color: '#D1D5DB', marginTop: 4 }}>
                        {new Date(act.createdAt).toLocaleDateString()}
                      </p>
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

