import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  Building2, PhoneCall, Loader2, Save, RefreshCw, CheckCircle,
  Shield, Zap, Plus, Trash2, Edit2, X, Check, Users, Sparkles,
  MessageSquare, Send, History, AlertCircle, ExternalLink, Image as ImageIcon,
  CheckCheck
} from 'lucide-react';

const STATUS_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#64748b',
];

function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center space-x-2">
          <div className="text-amber-500 font-bold">{icon}</div>
          <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-3.5">
        {children}
      </div>
    </div>
  );
}

export default function LeadSettings() {
  const { success, error, warning, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Business Profile State
  const [profile, setProfile] = useState({
    name: '', ownerName: '', businessCategory: 'Retail', phone: '', email: '',
    website: '', address: '', city: '', state: '', timezone: 'Asia/Kolkata',
  });

  // WhatsApp Gateway State
  const [whatsapp, setWhatsapp] = useState({
    businessAccountId: '', phoneNumberId: '', displayPhoneNumber: '',
    verifiedName: '', qualityRating: 'GREEN',
    accessToken: '', apiEndpoint: 'https://graph.facebook.com',
    isEnabled: true,
  });
  const [waTesting, setWaTesting] = useState(false);
  const [waStatus, setWaStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_FAILED'>('DISCONNECTED');
  const [waError, setWaError] = useState<string | null>(null);

  // WhatsApp Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [templateHeaderType, setTemplateHeaderType] = useState('NONE');
  const [templateBody, setTemplateBody] = useState('');
  const [templateFooter, setTemplateFooter] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>('ALL');

  // Live Test Bench / Sandbox State
  const [sandboxRecipient, setSandboxRecipient] = useState('');
  const [sandboxTemplate, setSandboxTemplate] = useState('');
  const [sandboxVariables, setSandboxVariables] = useState<Record<string, string>>({});
  const [sandboxMediaUrl, setSandboxMediaUrl] = useState('');
  const [sandboxDirectText, setSandboxDirectText] = useState('Hello from ONE CLICK CRM WhatsApp Business Service!');
  const [sandboxSending, setSandboxSending] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{ type: 'SUCCESS' | 'ERROR'; message: string; wamid?: string } | null>(null);

  // WhatsApp Dispatches Logs State
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Pipeline Stages State
  const [statuses, setStatuses] = useState<any[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#6366f1');
  const [statusIsDefault, setStatusIsDefault] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // Lead Sources State
  const [sources, setSources] = useState<any[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceSaving, setSourceSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [businessRes, waRes, templatesRes, statusesRes, sourcesRes, logsRes] = await Promise.all([
        api.get('/api/business').catch(() => null),
        api.get('/api/whatsapp/account').catch(() => null),
        api.get('/api/templates?status=APPROVED').catch(() => null),
        api.get('/api/statuses').catch(() => null),
        api.get('/api/sources').catch(() => null),
        api.get('/api/whatsapp/logs').catch(() => null),
      ]);

      if (businessRes) {
        setProfile({
          name: businessRes.name || '',
          ownerName: businessRes.ownerName || '',
          businessCategory: businessRes.businessCategory || 'Retail',
          phone: businessRes.phone || '',
          email: businessRes.email || '',
          website: businessRes.website || '',
          address: businessRes.address || '',
          city: businessRes.city || '',
          state: businessRes.state || '',
          timezone: businessRes.timezone || 'Asia/Kolkata',
        });
      }

      if (waRes) {
        setWhatsapp({
          businessAccountId: waRes.businessAccountId || '',
          phoneNumberId: waRes.phoneNumberId || '',
          displayPhoneNumber: waRes.displayPhoneNumber || '',
          verifiedName: waRes.verifiedName || '',
          qualityRating: waRes.qualityRating || 'GREEN',
          accessToken: waRes.accessToken || '',
          apiEndpoint: waRes.apiEndpoint || 'https://graph.facebook.com',
          isEnabled: waRes.isEnabled !== false,
        });
        setWaStatus(waRes.connectionStatus || 'DISCONNECTED');
      }

      const tpls = Array.isArray(templatesRes) ? templatesRes : (templatesRes?.templates || templatesRes?.data || []);
      setTemplates(tpls);
      if (tpls.length > 0 && !sandboxTemplate) {
        setSandboxTemplate(tpls[0].name);
      }

      setStatuses(Array.isArray(statusesRes) ? statusesRes : (statusesRes?.statuses || statusesRes?.data || []));
      setSources(Array.isArray(sourcesRes) ? sourcesRes : (sourcesRes?.sources || sourcesRes?.data || []));
      setWaLogs(Array.isArray(logsRes) ? logsRes : (logsRes?.logs || logsRes?.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/api/whatsapp/logs');
      setWaLogs(Array.isArray(res) ? res : (res?.logs || res?.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get('/api/sources');
      setSources(Array.isArray(res) ? res : (res?.sources || res?.data || []));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update variables when selected template changes
  useEffect(() => {
    if (!sandboxTemplate) return;
    const tmpl = templates.find(t => t.name === sandboxTemplate);
    if (tmpl) {
      const body = tmpl.bodyText || '';
      const extractedVars = [...new Set((body.match(/\{\{(\d+)\}\}/g) || []).map(m => m.replace(/\D/g, '')))].sort((a, b) => Number(a) - Number(b));
      const initialVars: Record<string, string> = {};
      extractedVars.forEach(v => {
        initialVars[v] = sandboxVariables[v] || `Value ${v}`;
      });
      setSandboxVariables(initialVars);
      if (tmpl.headerContent && !sandboxMediaUrl) {
        setSandboxMediaUrl(tmpl.headerContent);
      }
    }
  }, [sandboxTemplate, templates]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    try {
      await api.patch('/api/business', profile);
      setSaveSuccess('Organization profile saved successfully.');
      success('Profile saved', 'Organization settings have been updated.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      error('Failed to save profile', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiProvider === 'OFFICIAL_META' && (!whatsapp.phoneNumberId || !whatsapp.businessAccountId)) {
      warning('Missing fields', 'Phone Number ID and Business Account ID are required.');
      return;
    }
    setWaTesting(true);
    setWaError(null);
    try {
      const metaBase = whatsapp.apiEndpoint?.trim() || 'https://graph.facebook.com';
      const connPayload: any = {
        apiProvider: 'OFFICIAL_META',
        businessAccountId: whatsapp.businessAccountId?.trim(),
        phoneNumberId: whatsapp.phoneNumberId?.trim(),
        displayPhoneNumber: whatsapp.displayPhoneNumber?.trim(),
        accessToken: whatsapp.accessToken?.trim(),
        apiEndpoint: metaBase,
        isEnabled: whatsapp.isEnabled,
      };

      const testPayload = {
        apiProvider: 'OFFICIAL_META',
        phoneNumberId: whatsapp.phoneNumberId?.trim(),
        businessAccountId: whatsapp.businessAccountId?.trim(),
        accessToken: whatsapp.accessToken?.trim(),
        apiEndpoint: metaBase,
      };

      await api.post('/api/whatsapp/connect', connPayload);

      // Verify connection with gateway endpoint
      const testRes = await api.post('/api/whatsapp/test-connection', testPayload);

      if (testRes?.success) {
        setWaStatus('CONNECTED');
        setWaError(null);
        if (testRes.data) {
          setWhatsapp(prev => ({
            ...prev,
            verifiedName: testRes.data.verifiedName || prev.verifiedName,
            displayPhoneNumber: testRes.data.displayPhoneNumber || prev.displayPhoneNumber,
            qualityRating: testRes.data.qualityRating || prev.qualityRating,
          }));
        }
        success('WhatsApp Connected!', testRes?.message || 'Gateway connection verified.');
        if (apiProvider === 'OFFICIAL_META') {
          handleSyncTemplates();
        }
      } else {
        setWaStatus('DISCONNECTED');
        setWhatsapp(prev => ({
          ...prev,
          qualityRating: '',
          verifiedName: '',
        }));
        const msg = testRes?.message || 'Meta verification failed. Please check your token.';
        setWaError(msg);
        error('Verification Failed', msg);
      }
    } catch (err: any) {
      setWaStatus('DISCONNECTED');
      setWhatsapp(prev => ({
        ...prev,
        qualityRating: '',
        verifiedName: '',
      }));
      setWaError(err.message || 'Connection error.');
      error('Connection Failed', err.message);
    } finally {
      setWaTesting(false);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await api.post('/api/whatsapp/sync-templates', {
        businessAccountId: whatsapp.businessAccountId,
        accessToken: whatsapp.accessToken,
        apiEndpoint: whatsapp.apiEndpoint,
      });
      if (res?.success) {
        success('Templates Synchronized', res?.message || 'Meta templates synced successfully');
        const tplRes = await api.get('/api/templates?status=APPROVED');
        const fetched = Array.isArray(tplRes) ? tplRes : (tplRes?.templates || tplRes?.data || []);
        setTemplates(fetched);
        if (fetched.length > 0 && !sandboxTemplate) {
          setSandboxTemplate(fetched[0].name);
        }
      } else {
        warning('Sync Notice', res?.message || 'Please check your Meta credentials.');
      }
    } catch (err: any) {
      error('Sync Failed', err.message || 'Could not connect to WhatsApp API.');
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    const ok = await confirm({
      title: 'Disconnect WhatsApp',
      message: 'Disconnect WhatsApp? Outbound messages will fail until reconnected.',
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!ok) return;
    await run('wa-disconnect', async () => {
      await api.delete('/api/whatsapp/disconnect');
      setWhatsapp(prev => ({
        ...prev,
        businessAccountId: '',
        phoneNumberId: '',
        displayPhoneNumber: '',
        verifiedName: '',
        accessToken: '',
      }));
      setWaStatus('DISCONNECTED');
      setWaError(null);
      success('WhatsApp disconnected');
    });
  };

  const handleSendSandboxTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxRecipient.trim()) {
      warning('Missing Recipient', 'Please enter a recipient mobile number (e.g. 919876543210).');
      return;
    }

    setSandboxSending(true);
    setSandboxResult(null);
    try {
      const tmpl = templates.find(t => t.name === sandboxTemplate);
      const varArray = Object.keys(sandboxVariables || {})
        .sort((a, b) => Number(a) - Number(b))
        .map(k => sandboxVariables[k]);

      const payload: any = {
        recipient: sandboxRecipient.trim(),
        messageType: 'SANDBOX_TEST',
      };

      if (sandboxTemplate && tmpl) {
        payload.templateName = sandboxTemplate;
        payload.language = tmpl.language || 'en_US';
        payload.params = varArray.length > 0 ? varArray : undefined;
        payload.variables = sandboxVariables;
        payload.mediaUrl = sandboxMediaUrl || undefined;
        payload.mediaType = tmpl.headerType !== 'NONE' ? tmpl.headerType : undefined;
      } else {
        payload.text = sandboxDirectText;
      }

      const res = await api.post('/api/whatsapp/send-test', payload);
      if (res?.success) {
        const rawWamid = res.data?.wamid || res.wamid;
        const safeWamid = typeof rawWamid === 'string' ? rawWamid : (rawWamid?.id || null);
        const safeMsg = typeof res.message === 'string' ? res.message : 'Message dispatched successfully!';
        success('Test WhatsApp Message Sent!', `Delivered to +${res.data?.recipient || sandboxRecipient}!`);
        setSandboxResult({
          type: 'SUCCESS',
          message: safeMsg,
          wamid: safeWamid || undefined,
        });
        fetchLogs();
      } else {
        const rawErr = res?.message || res?.error || 'Failed to dispatch test message.';
        const safeErr = typeof rawErr === 'string' ? rawErr : (typeof rawErr === 'object' ? JSON.stringify(rawErr) : String(rawErr));
        error('Dispatch Failed', safeErr);
        setSandboxResult({ type: 'ERROR', message: safeErr });
        fetchLogs();
      }
    } catch (err: any) {
      const safeErr = typeof err.message === 'string' ? err.message : 'Error communicating with WhatsApp API.';
      error('Dispatch Failed', safeErr);
      setSandboxResult({ type: 'ERROR', message: safeErr });
      fetchLogs();
    } finally {
      setSandboxSending(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      warning('Missing fields', 'Template name and body text are required.');
      return;
    }
    setTemplateSaving(true);
    try {
      const payload = {
        name: templateName.trim().toLowerCase().replace(/\s+/g, '_'),
        category: templateCategory,
        headerType: templateHeaderType,
        bodyText: templateBody,
        footerText: templateFooter,
        language: 'en',
      };
      if (editingTemplate) {
        await api.put(`/api/templates/${editingTemplate.id || editingTemplate._id}`, payload);
      } else {
        await api.post('/api/templates', payload);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateBody('');
      setTemplateFooter('');
      setTemplateHeaderType('NONE');
      const tplRes = await api.get('/api/templates?status=APPROVED');
      setTemplates(Array.isArray(tplRes) ? tplRes : (tplRes?.templates || tplRes?.data || []));
      success(editingTemplate ? 'Template updated!' : 'Template created!');
    } catch (err: any) {
      error('Failed to save template', err.message);
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Template',
      message: `Delete template "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await run(`del-tpl-${id}`, async () => {
      try {
        const targetId = id || name;
        await api.delete(`/api/templates/${encodeURIComponent(targetId)}`);
        setTemplates((prev) => prev.filter((t) => (t.id || t._id) !== id && t.name !== name));
        success('Template deleted');
      } catch (err: any) {
        error('Failed to delete', err.message);
      }
    });
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) { warning('Name required', 'Status name is required.'); return; }
    setStatusSaving(true);
    try {
      const payload = { name: statusName, color: statusColor, isDefault: statusIsDefault };
      if (editingStatus) await api.patch(`/api/statuses/${editingStatus.id}`, payload);
      else { const maxOrder = statuses.reduce((max, s) => (s.displayOrder > max ? s.displayOrder : max), 0); await api.post('/api/statuses', { ...payload, displayOrder: maxOrder + 1 }); }
      setShowStatusModal(false); setEditingStatus(null); setStatusName(''); setStatusColor('#6366f1'); setStatusIsDefault(false);
      const updated = await api.get('/api/statuses'); setStatuses(updated || []);
      success(editingStatus ? 'Stage updated!' : 'Stage created!');
    } catch (err: any) { error('Failed to save stage', err.message); }
    finally { setStatusSaving(false); }
  };

  const handleDeleteStatus = async (id: string) => {
    const target = statuses.find(s => s.id === id);
    if (!target) return;
    if (target.isDefault) { warning('Cannot delete', 'Cannot delete the default stage.'); return; }
    const ok = await confirm({ title: 'Delete Stage', message: `Delete stage "${target.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await run(`del-status-${id}`, async () => {
      await api.delete(`/api/statuses/${id}`);
      const u = await api.get('/api/statuses');
      setStatuses(u || []);
      success('Stage deleted');
    });
  };

  const handleReorderStatus = async (index: number, direction: 'UP' | 'DOWN') => {
    const list = [...statuses]; const newIdx = direction === 'UP' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= list.length) return;
    const temp = list[index]; list[index] = list[newIdx]; list[newIdx] = temp;
    const items = list.map((item, idx) => ({ id: item.id, displayOrder: idx + 1 }));
    try { setStatuses(list.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))); await api.patch('/api/statuses/reorder', { items }); }
    catch (err: any) { error('Failed to reorder', err.message); const r = await api.get('/api/statuses'); setStatuses(r || []); }
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) { warning('Name required', 'Source name is required.'); return; }
    setSourceSaving(true);
    try {
      const payload = { name: sourceName };
      if (editingSource) {
        await api.patch(`/api/sources/${editingSource.id}`, payload);
      } else {
        await api.post('/api/sources', payload);
      }
      setShowSourceModal(false); setEditingSource(null); setSourceName('');
      await fetchSources();
      success(editingSource ? 'Lead source updated!' : 'Lead source created!');
    } catch (err: any) {
      error('Failed to save lead source', err.message);
    } finally {
      setSourceSaving(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    const target = sources.find(s => s.id === id);
    if (!target) return;
    const ok = await confirm({
      title: 'Delete Lead Source',
      message: `Delete lead source "${target.name}"? Contacts with this source will remain unchanged.`,
      confirmLabel: 'Delete',
      danger: true
    });
    if (!ok) return;
    await run(`del-source-${id}`, async () => {
      try {
        await api.delete(`/api/sources/${id}`);
        await fetchSources();
        success('Lead source deleted');
      } catch (err: any) {
        error('Failed to delete', err.message);
      }
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Settings & WhatsApp Gateway...</p>
    </div>
  );

  const selectedTmplObj = templates.find(t => t.name === sandboxTemplate);
  const selectedHeaderType = selectedTmplObj?.headerType || 'NONE';

  // Live Bubble Text computation
  let previewBubbleText = selectedTmplObj?.bodyText || sandboxDirectText;
  if (selectedTmplObj) {
    Object.keys(sandboxVariables).forEach(k => {
      const val = sandboxVariables[k] ? `*${sandboxVariables[k]}*` : `{{${k}}}`;
      previewBubbleText = previewBubbleText.replaceAll(`{{${k}}}`, val);
    });
  }

  const cats = ['Real Estate', 'Retail', 'Education', 'Automobile', 'Healthcare', 'Software/SaaS', 'Finance', 'Agency', 'Other'];
  const tzOptions = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

  return (
    <div className="space-y-6 pb-14 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            WhatsApp Business Gateway & CRM Settings <Sparkles size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Connect your official Meta Cloud API, synchronize approved templates, test live message dispatches with realistic chat preview, and configure lead pipelines.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
          <CheckCircle size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* ── Grid 1: Business Profile + WhatsApp API Gateway ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Business Profile */}
        <SectionCard title="Organization Profile" icon={<Building2 size={16} />}>
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Company Name</label>
                <input type="text" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Owner Name</label>
                <input type="text" required value={profile.ownerName} onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
                <select value={profile.businessCategory} onChange={(e) => setProfile({ ...profile, businessCategory: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Timezone</label>
                <select value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none">
                  {tzOptions.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Business Email</label>
                <input type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Business Phone</label>
                <input type="tel" required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white" />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5 mt-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
              <span>Save Profile</span>
            </button>
          </form>
        </SectionCard>

        {/* WhatsApp API Connection */}
        <SectionCard
          title="WhatsApp Business Gateway"
          icon={<PhoneCall size={16} />}
          action={
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${waStatus === 'CONNECTED' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${waStatus === 'CONNECTED' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {waStatus === 'CONNECTED' ? (whatsapp.verifiedName ? `Verified: ${whatsapp.verifiedName}` : 'Connected') : 'Disconnected'}
              </span>
            </div>
          }
        >
          <div className="space-y-3.5">
            {waError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">{waError}</div>
              </div>
            )}

            <form onSubmit={handleConnectWhatsApp} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Phone Number ID *</label>
                  <input type="text" required placeholder="e.g. 474696695717479" value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value.trim() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Business Account ID (WABA ID) *</label>
                  <input type="text" required placeholder="e.g. 415953368265402" value={whatsapp.businessAccountId} onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value.trim() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Display Phone Number</label>
                  <input type="text" placeholder="+91 87936 73378" value={whatsapp.displayPhoneNumber} onChange={(e) => setWhatsapp({ ...whatsapp, displayPhoneNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Meta API Base URL</label>
                  <input type="text" placeholder="https://graph.facebook.com" value={whatsapp.apiEndpoint} onChange={(e) => setWhatsapp({ ...whatsapp, apiEndpoint: e.target.value.trim() })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Meta Permanent Access Token <span className="text-amber-500">*</span>
                  </label>
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                  >
                    Meta Developers Portal <ExternalLink size={11} />
                  </a>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Paste Meta Permanent Token (starts with EAAG... or EAA...)"
                  value={whatsapp.accessToken}
                  onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value.replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button type="submit" disabled={waTesting} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5">
                  {waTesting ? <Loader2 size={14} className="animate-spin text-slate-950" /> : <RefreshCw size={14} strokeWidth={2.5} />}
                  <span>{waTesting ? 'Verifying Gateway...' : 'Save & Verify Connection'}</span>
                </button>
                {waStatus !== 'DISCONNECTED' && (
                  <button type="button" onClick={handleDisconnectWhatsApp} disabled={isLoading('wa-disconnect')} className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold rounded-xl text-xs border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors">
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </div>
        </SectionCard>
      </div>

      {/* ── Grid 2: LIVE TEST BENCH & INTERACTIVE BUBBLE PREVIEW ── */}
      <SectionCard
        title="Live WhatsApp Test Bench & Interactive Sandbox"
        icon={<Send size={16} />}
        action={
          <div className="text-xs text-slate-400 font-bold">
            Test Real Meta Cloud API Delivery & Message Formatting
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Form (7 Cols) */}
          <form onSubmit={handleSendSandboxTest} className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Recipient WhatsApp Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 919876543210 or 9876543210"
                value={sandboxRecipient}
                onChange={(e) => setSandboxRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Include country code (e.g. 91 for India). Non-digit characters will be sanitized automatically.</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Select Approved Meta Template
                </label>
                <button
                  type="button"
                  onClick={handleSyncTemplates}
                  disabled={syncingTemplates}
                  className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                >
                  <RefreshCw size={11} className={syncingTemplates ? "animate-spin" : ""} /> Sync from Meta
                </button>
              </div>
              <select
                value={sandboxTemplate}
                onChange={(e) => setSandboxTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="">-- Direct Text Message (No Template) --</option>
                {templates.map((t: any) => (
                  <option key={t.id || t._id || t.name} value={t.name}>
                    💬 {t.name} ({t.category || 'MARKETING'} - {t.headerType || 'NONE'})
                  </option>
                ))}
              </select>
            </div>

            {/* If Direct Text selected */}
            {!sandboxTemplate && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Direct WhatsApp Message Text
                </label>
                <textarea
                  rows={3}
                  value={sandboxDirectText}
                  onChange={(e) => setSandboxDirectText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed"
                />
              </div>
            )}

            {/* Header Media URL if Template has header */}
            {selectedTmplObj && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedHeaderType) && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Header {selectedHeaderType} Media Public URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/media.jpg"
                  value={sandboxMediaUrl}
                  onChange={(e) => setSandboxMediaUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-lg text-xs font-mono"
                />
              </div>
            )}

            {/* Dynamic Template Body Variables */}
            {selectedTmplObj && Object.keys(sandboxVariables).length > 0 && (
              <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Dynamic Template Parameters (Mapped to {'{{1}}'}, {'{{2}}'})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.keys(sandboxVariables).sort((a, b) => Number(a) - Number(b)).map((varNum) => (
                    <div key={varNum}>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        Variable {'{{'}{varNum}{'}}'}
                      </label>
                      <input
                        type="text"
                        value={sandboxVariables[varNum] || ''}
                        onChange={(e) => setSandboxVariables({ ...sandboxVariables, [varNum]: e.target.value })}
                        placeholder={`Value for {{${varNum}}}`}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sandboxSending}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {sandboxSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>{sandboxSending ? 'Dispatching Live Message...' : 'Send Live Test WhatsApp Message'}</span>
            </button>

            {sandboxResult && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${sandboxResult.type === 'SUCCESS'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}>
                {sandboxResult.type === 'SUCCESS' ? <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-extrabold">{sandboxResult.type === 'SUCCESS' ? 'Message Sent Successfully!' : 'Dispatch Failed'}</div>
                  <div className="text-[11px] mt-0.5 leading-relaxed">
                    {typeof sandboxResult.message === 'string' ? sandboxResult.message : JSON.stringify(sandboxResult.message)}
                  </div>
                  {sandboxResult.wamid && typeof sandboxResult.wamid === 'string' && (
                    <div className="text-[10px] font-mono mt-1 opacity-80">WAMID: {sandboxResult.wamid}</div>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Right Preview (5 Cols): REALISTIC WHATSAPP BUBBLE */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-[#E5DDD5] dark:bg-[#0B141A] rounded-2xl border border-slate-300 dark:border-slate-800">
            <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-3">
              💬 WhatsApp Live Message Preview
            </div>

            {/* Bubble Container */}
            <div className="w-full max-w-sm bg-white dark:bg-[#005C4B] rounded-2xl rounded-tr-none shadow-md overflow-hidden border border-slate-200 dark:border-transparent text-slate-900 dark:text-white p-3.5 space-y-2 relative">

              {/* Media Preview if Header */}
              {selectedHeaderType === 'IMAGE' && (
                <div className="w-full h-36 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-hidden flex items-center justify-center relative">
                  {sandboxMediaUrl ? (
                    <img src={sandboxMediaUrl} alt="Header Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 text-xs font-bold gap-1">
                      <ImageIcon size={24} />
                      <span>Header Image</span>
                    </div>
                  )}
                </div>
              )}

              {/* Message Body */}
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {previewBubbleText}
              </p>

              {/* Footer text if available */}
              {selectedTmplObj?.footerText && (
                <p className="text-[10px] text-slate-400 dark:text-emerald-200/60 italic pt-1 border-t border-slate-100 dark:border-white/10">
                  {selectedTmplObj.footerText}
                </p>
              )}

              {/* Time & Double Checkmark */}
              <div className="flex items-center justify-end gap-1 text-[9.5px] text-slate-400 dark:text-emerald-200/80 pt-1">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <CheckCheck size={13} className="text-blue-500 dark:text-emerald-300" />
              </div>
            </div>

            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-semibold">
              Live interactive preview reflects parameter changes in real-time.
            </span>
          </div>

        </div>
      </SectionCard>

      {/* ── Grid 3: WhatsApp Templates Library ── */}
      <SectionCard
        title={`WhatsApp Message Templates Library (${templates.length})`}
        icon={<MessageSquare size={16} />}
        action={
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSyncTemplates}
              disabled={syncingTemplates}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl text-xs transition-colors"
            >
              <RefreshCw size={13} strokeWidth={2.5} className={syncingTemplates ? "animate-spin text-amber-500" : ""} />
              <span>{syncingTemplates ? 'Syncing...' : 'Sync from Meta'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateName('');
                setTemplateBody('');
                setTemplateFooter('');
                setTemplateCategory('MARKETING');
                setTemplateHeaderType('NONE');
                setShowTemplateModal(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Custom Template</span>
            </button>
          </div>
        }
      >
        {/* Template Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION', 'CUSTOM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setTemplateFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${templateFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
            >
              {cat === 'ALL' ? 'All Templates' : cat}
              <span className="ml-1.5 text-[10px] opacity-70">
                ({cat === 'ALL'
                  ? templates.length
                  : cat === 'CUSTOM'
                    ? templates.filter(t => t.isCustom).length
                    : templates.filter(t => t.category === cat).length})
              </span>
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto custom-scrollbar p-0.5">
          {templates.filter((t: any) => {
            if (templateFilter === 'ALL') return true;
            if (templateFilter === 'CUSTOM') return t.isCustom;
            return t.category === templateFilter;
          }).length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">No message templates found in this category.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Click "Sync from Meta" to import your WhatsApp Cloud API templates.</p>
            </div>
          ) : (
            templates.filter((t: any) => {
              if (templateFilter === 'ALL') return true;
              if (templateFilter === 'CUSTOM') return t.isCustom;
              return t.category === templateFilter;
            }).map((t: any) => (
              <div
                key={t.id || t._id || t.name}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{t.name}</h4>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                        {t.language || 'en'} • {t.headerType && t.headerType !== 'NONE' ? t.headerType : 'Standard'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${t.category === 'MARKETING'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : t.category === 'UTILITY'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                        {t.category || 'MARKETING'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-normal text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-white/70 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    {t.bodyText}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={11} /> Approved
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSandboxTemplate(t.name);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="text-[10px] font-extrabold text-amber-500 hover:underline"
                  >
                    Test in Sandbox &rarr;
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* ── Grid 4: Recent WhatsApp Dispatches / Message Logs ── */}
      <SectionCard
        title={`Recent WhatsApp Dispatches (${waLogs.length})`}
        icon={<History size={16} />}
        action={
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs transition-colors"
          >
            <RefreshCw size={12} className={loadingLogs ? "animate-spin text-amber-500" : ""} />
            <span>Refresh Logs</span>
          </button>
        }
      >
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Target / Recipient</th>
                  <th className="py-2.5 px-3">Action & Provider</th>
                  <th className="py-2.5 px-3">Template / Activity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Diagnostics & Resolution</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {waLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No recent WhatsApp message dispatches or verification events logged yet.
                    </td>
                  </tr>
                ) : (
                  waLogs.slice(0, 20).map((log, idx) => {
                    const safeStatus = typeof log.status === 'string' ? log.status : (log.status?.message_status || log.status?.status || 'SENT');
                    const isSuccess = safeStatus === 'SENT' || safeStatus === 'DELIVERED' || safeStatus === 'VERIFIED';
                    const safeRecipient = typeof log.recipient === 'string' ? log.recipient : (typeof log.recipient === 'object' ? JSON.stringify(log.recipient) : String(log.recipient || ''));
                    const safeWamid = typeof log.wamid === 'string' ? log.wamid : (log.wamid?.id || (typeof log.wamid === 'object' ? JSON.stringify(log.wamid) : ''));
                    const safeTemplate = typeof log.templateUsed === 'string' ? log.templateUsed : (typeof log.payload?.template === 'string' ? log.payload.template : 'Direct Text');
                    const safeError = typeof log.error === 'string' ? log.error : (typeof log.error === 'object' ? JSON.stringify(log.error) : '');

                    return (
                      <tr key={log.id || log._id || `log-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {safeRecipient.startsWith('91') || /^\d{10,12}$/.test(safeRecipient) ? `+${safeRecipient}` : safeRecipient}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[11px]">
                              {typeof log.messageType === 'string' ? log.messageType : 'NOTIFICATION'}
                            </span>
                            <span className="text-[9.5px] font-bold text-amber-500 uppercase">
                              {typeof log.provider === 'string' ? log.provider : 'META_CLOUD_API'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-purple-600 dark:text-purple-400 truncate max-w-[160px]">
                          {safeTemplate}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${isSuccess
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            }`}>
                            {safeStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[280px]">
                          {safeError || log.errorCategory ? (
                            <div className="space-y-0.5">
                              {log.errorCategory && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  {typeof log.errorCategory === 'string' ? log.errorCategory : JSON.stringify(log.errorCategory)}
                                </span>
                              )}
                              <p className="text-[10.5px] text-rose-600 dark:text-rose-400 font-semibold line-clamp-2 leading-tight">
                                {safeError || 'Request failed'}
                              </p>
                              {log.resolutionHint && (
                                <p className="text-[9.5px] text-amber-600 dark:text-amber-400 font-medium">
                                  💡 {typeof log.resolutionHint === 'string' ? log.resolutionHint : JSON.stringify(log.resolutionHint)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {safeStatus === 'VERIFIED' ? 'Handshake verified with Meta' : safeWamid ? `WAMID: ${safeWamid.slice(0, 15)}...` : 'Delivered successfully'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {log.sentAt ? new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '--'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      {/* ── Grid 5: Pipeline Stages + Lead Sources ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Status Stages */}
        <SectionCard
          title="Lead Pipeline Stages"
          icon={<Zap size={16} />}
          action={
            <button
              onClick={() => { setEditingStatus(null); setStatusName(''); setStatusColor('#6366f1'); setStatusIsDefault(false); setShowStatusModal(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold rounded-xl text-xs border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Stage</span>
            </button>
          }
        >
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {statuses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-semibold">No pipeline stages configured.</p>
            ) : (
              statuses.map((status, index) => (
                <div key={status.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{status.name}</span>
                    {status.isDefault && (
                      <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button disabled={index === 0} onClick={() => handleReorderStatus(index, 'UP')} className="p-1 text-slate-400 hover:text-slate-600 text-xs font-bold">▲</button>
                    <button disabled={index === statuses.length - 1} onClick={() => handleReorderStatus(index, 'DOWN')} className="p-1 text-slate-400 hover:text-slate-600 text-xs font-bold">▼</button>
                    <button onClick={() => { setEditingStatus(status); setStatusName(status.name); setStatusColor(status.color); setStatusIsDefault(status.isDefault); setShowStatusModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-500">
                      <Edit2 size={13} />
                    </button>
                    <button disabled={status.isDefault || isLoading(`del-status-${status.id}`)} onClick={() => handleDeleteStatus(status.id)} className="p-1.5 text-slate-400 hover:text-rose-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {/* Lead Sources */}
        <SectionCard
          title="Lead Acquisition Channels"
          icon={<Users size={16} />}
          action={
            <button
              onClick={() => { setEditingSource(null); setSourceName(''); setShowSourceModal(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold rounded-xl text-xs border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Source</span>
            </button>
          }
        >
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {(!Array.isArray(sources) || sources.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-8 font-semibold">No lead acquisition channels configured.</p>
            ) : (
              (Array.isArray(sources) ? sources : []).map((source) => (
                <div key={source.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{source.name}</span>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => { setEditingSource(source); setSourceName(source.name); setShowSourceModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-500">
                      <Edit2 size={13} />
                    </button>
                    <button disabled={isLoading(`del-source-${source.id}`)} onClick={() => handleDeleteSource(source.id)} className="p-1.5 text-slate-400 hover:text-rose-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Template Modal ── */}
      {showTemplateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {editingTemplate ? 'Edit WhatsApp Template' : 'Add Custom WhatsApp Template'}
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Template Name</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. promotional_offer_2026"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={templateCategory}
                    onChange={(e: any) => setTemplateCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Header Type</label>
                  <select
                    value={templateHeaderType}
                    onChange={(e) => setTemplateHeaderType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="NONE">None / Text</option>
                    <option value="IMAGE">Image Header</option>
                    <option value="VIDEO">Video Header</option>
                    <option value="DOCUMENT">Document Header</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Body Message Text</label>
                <textarea
                  rows={4}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Hi {{1}}, thank you for contacting us. Your appointment is scheduled on {{2}}."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Use double braces like {'{{1}}'}, {'{{2}}'} for dynamic custom variables.</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Footer Text (Optional)</label>
                <input
                  type="text"
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.target.value)}
                  placeholder="Reply STOP to unsubscribe"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={templateSaving} className="px-5 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center space-x-1.5">
                  {templateSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                  <span>{editingTemplate ? 'Update Template' : 'Save Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Status Modal ── */}
      {showStatusModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{editingStatus ? 'Edit Pipeline Stage' : 'Add Pipeline Stage'}</h3>
              <button onClick={() => setShowStatusModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Stage Name</label>
                <input type="text" required value={statusName} onChange={(e) => setStatusName(e.target.value)} placeholder="e.g. Qualified Lead" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Stage Color</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {STATUS_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setStatusColor(c)} className={`w-7 h-7 rounded-full transition-all ${statusColor === c ? "ring-2 ring-slate-900 dark:ring-white scale-110" : ""}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="isDef" checked={statusIsDefault} onChange={(e) => setStatusIsDefault(e.target.checked)} className="rounded text-amber-500" />
                <label htmlFor="isDef" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Set as default stage for new leads</label>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={statusSaving} className="px-5 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center space-x-1.5">
                  {statusSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                  <span>{editingStatus ? 'Update Stage' : 'Save Stage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Source Modal ── */}
      {showSourceModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{editingSource ? 'Edit Lead Source' : 'Add Lead Source'}</h3>
              <button onClick={() => setShowSourceModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveSource} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Source Name</label>
                <input type="text" required value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Instagram Ads" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button type="button" onClick={() => setShowSourceModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={sourceSaving} className="px-5 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center space-x-1.5">
                  {sourceSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                  <span>{editingSource ? 'Update Source' : 'Save Source'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
