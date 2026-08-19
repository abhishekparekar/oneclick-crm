import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  Building2, PhoneCall, Loader2, Save, RefreshCw, CheckCircle,
  Clock, Gift, Shield, Zap, Plus, Trash2, Edit2, X, Check, Users, Sparkles
} from 'lucide-react';

const STATUS_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#64748b',
];

function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center space-x-2.5">
          <div className="text-amber-500 font-bold">{icon}</div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">
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

  const [profile, setProfile] = useState({
    name: '', ownerName: '', businessCategory: 'Retail', phone: '', email: '',
    website: '', address: '', city: '', state: '', timezone: 'Asia/Kolkata',
  });

  const [apiProvider, setApiProvider] = useState<'OFFICIAL_META' | 'THIRD_PARTY_CLICK2API'>('OFFICIAL_META');
  const [whatsapp, setWhatsapp] = useState({
    businessAccountId: '', phoneNumberId: '', displayPhoneNumber: '',
    accessToken: '', metaApiBaseUrl: '',
    thirdPartyEndpoint: 'https://app.click2api.in',
    thirdPartyInstanceId: '', thirdPartyToken: '',
  });
  const [waTesting, setWaTesting] = useState(false);
  const [waStatus, setWaStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_FAILED'>('DISCONNECTED');
  const [waError, setWaError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<any[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#6366f1');
  const [statusIsDefault, setStatusIsDefault] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [sources, setSources] = useState<any[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceSaving, setSourceSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [businessRes, waRes, wishesRes, templatesRes, statusesRes, sourcesRes] = await Promise.all([
        api.get('/api/business'),
        api.get('/api/whatsapp/account'),
        api.get('/api/engagement-settings'),
        api.get('/api/templates?status=APPROVED'),
        api.get('/api/statuses'),
        api.get('/api/sources'),
      ]);
      if (businessRes) {
        setProfile({ name: businessRes.name || '', ownerName: businessRes.ownerName || '', businessCategory: businessRes.businessCategory || 'Retail', phone: businessRes.phone || '', email: businessRes.email || '', website: businessRes.website || '', address: businessRes.address || '', city: businessRes.city || '', state: businessRes.state || '', timezone: businessRes.timezone || 'Asia/Kolkata' });
      }
      if (waRes && waRes.connectionStatus !== 'DISCONNECTED') {
        const provider = waRes.apiProvider || 'OFFICIAL_META';
        setApiProvider(provider);
        setWhatsapp({ businessAccountId: waRes.businessAccountId || '', phoneNumberId: waRes.phoneNumberId || '', displayPhoneNumber: waRes.displayPhoneNumber || '', accessToken: provider === 'OFFICIAL_META' ? '••••••••••••••••••••' : '', metaApiBaseUrl: waRes.metaApiBaseUrl || '', thirdPartyEndpoint: waRes.thirdPartyEndpoint || 'https://app.click2api.in', thirdPartyInstanceId: waRes.thirdPartyInstanceId || '', thirdPartyToken: provider === 'THIRD_PARTY_CLICK2API' ? '••••••••••••' : '' });
        setWaStatus(waRes.connectionStatus);
      }
      setStatuses(Array.isArray(statusesRes) ? statusesRes : (statusesRes?.statuses || statusesRes?.data || []));
      setSources(Array.isArray(sourcesRes) ? sourcesRes : (sourcesRes?.sources || sourcesRes?.data || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get('/api/sources');
      setSources(res || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveSuccess(null);
    try {
      await api.patch('/api/business', profile);
      setSaveSuccess('Business profile saved.');
      success('Profile saved');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) { error('Failed to save profile', err.message); }
    finally { setSaving(false); }
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiProvider === 'OFFICIAL_META' && (!whatsapp.businessAccountId || !whatsapp.phoneNumberId || !whatsapp.displayPhoneNumber)) { warning('Missing fields', 'Please fill all Meta credentials.'); return; }
    if (apiProvider === 'THIRD_PARTY_CLICK2API' && (!whatsapp.thirdPartyEndpoint || !whatsapp.thirdPartyInstanceId)) { warning('Missing fields', 'Please fill all Click2API credentials.'); return; }
    setWaTesting(true); setWaError(null);
    try {
      const connPayload: any = { apiProvider, displayPhoneNumber: whatsapp.displayPhoneNumber };
      if (apiProvider === 'OFFICIAL_META') {
        connPayload.businessAccountId = whatsapp.businessAccountId;
        connPayload.phoneNumberId = whatsapp.phoneNumberId;
        connPayload.metaApiBaseUrl = whatsapp.metaApiBaseUrl || '';
        if (!whatsapp.accessToken.startsWith('•••')) connPayload.accessToken = whatsapp.accessToken;
      } else {
        connPayload.thirdPartyEndpoint = whatsapp.thirdPartyEndpoint;
        connPayload.thirdPartyInstanceId = whatsapp.thirdPartyInstanceId;
        if (!whatsapp.thirdPartyToken.startsWith('•••')) connPayload.thirdPartyToken = whatsapp.thirdPartyToken;
      }
      await api.post('/api/whatsapp/connect', connPayload);
      const testRes = await api.post('/api/whatsapp/test-connection');
      setWaStatus(testRes.status);
      if (testRes.status === 'CONNECTED') success('WhatsApp connected!', 'Your account is active and ready to send messages.');
      else { setWaError('Connection test failed. Check credentials.'); error('Connection failed', 'Connection test failed. Check credentials.'); }
    } catch (err: any) { setWaStatus('CONNECTION_FAILED'); setWaError(err.message || 'Failed to connect.'); error('Connection failed', err.message); }
    finally { setWaTesting(false); }
  };

  const handleDisconnectWhatsApp = async () => {
    const ok = await confirm({ title: 'Disconnect WhatsApp', message: 'Disconnect WhatsApp? Outbound messages will fail until reconnected.', confirmLabel: 'Disconnect', danger: true });
    if (!ok) return;
    await run('wa-disconnect', async () => {
      await api.delete('/api/whatsapp/disconnect');
      setWhatsapp({ businessAccountId: '', phoneNumberId: '', displayPhoneNumber: '', accessToken: '', metaApiBaseUrl: '', thirdPartyEndpoint: 'https://app.click2api.in', thirdPartyInstanceId: '', thirdPartyToken: '' });
      setWaStatus('DISCONNECTED'); setWaError(null);
      success('WhatsApp disconnected');
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
      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Lead Settings...</p>
    </div>
  );

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/whatsapp`;
  const verifyToken = 'leadflow-verify-token-1234';
  const cats = ['Real Estate', 'Retail', 'Education', 'Automobile', 'Healthcare', 'Software/SaaS', 'Finance', 'Agency', 'Other'];
  const tzOptions = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

  return (
    <div className="space-y-5 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Lead Engine & WhatsApp Settings <Sparkles size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Configure Meta Cloud API credentials, lead pipeline stages, acquisition channels, and business metadata.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
          <CheckCircle size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* ── Grid 1: Business Profile + WhatsApp API Connection ── */}
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
          title="WhatsApp API Connection"
          icon={<PhoneCall size={16} />}
          action={
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${waStatus === 'CONNECTED' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${waStatus === 'CONNECTED' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {waStatus === 'CONNECTED' ? 'Connected' : 'Disconnected'}
            </span>
          }
        >
          <div className="space-y-3">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApiProvider('OFFICIAL_META')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${apiProvider === 'OFFICIAL_META' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-2xs' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <Shield size={13} /> Meta Cloud API
              </button>
            </div>

            {waError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {waError}
              </div>
            )}

            <form onSubmit={handleConnectWhatsApp} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number ID</label>
                  <input type="text" required placeholder="1048293740283" value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Display Number</label>
                  <input type="text" required placeholder="+91 98765 43210" value={whatsapp.displayPhoneNumber} onChange={(e) => setWhatsapp({ ...whatsapp, displayPhoneNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Account ID</label>
                <input type="text" required placeholder="849302847294829" value={whatsapp.businessAccountId} onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Meta Access Token</label>
                <textarea rows={2} required placeholder="Paste Meta permanent access token" value={whatsapp.accessToken} onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button type="submit" disabled={waTesting} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5">
                  {waTesting ? <Loader2 size={14} className="animate-spin text-slate-950" /> : <RefreshCw size={14} strokeWidth={2.5} />}
                  <span>{waTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>
                {waStatus !== 'DISCONNECTED' && (
                  <button type="button" onClick={handleDisconnectWhatsApp} disabled={isLoading('wa-disconnect')} className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold rounded-xl text-xs border border-rose-200 dark:border-rose-800">
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </div>
        </SectionCard>
      </div>

      {/* ── Grid 2: Pipeline Stages + Lead Sources ── */}
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
