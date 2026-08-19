import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  Building2, PhoneCall, Loader2, Save, RefreshCw, CheckCircle,
  Clock, Gift, Shield, Zap, Plus, Trash2, Edit2, X, Check, Users,
} from 'lucide-react';

const STATUS_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#64748b',
];

function SectionCard({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card-elevated" style={{ padding: 0 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#0E6B50' }}>{icon}</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</p>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const { org, setOrg } = useAuthStore();
  const { success, error, warning, confirm, info } = useToast();
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

  const [showCustomTemplateModal, setShowCustomTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplateBody, setCustomTemplateBody] = useState('');
  const [customTemplateFooter, setCustomTemplateFooter] = useState('');

  const [templates, setTemplates] = useState<any[]>([]);
  const [wishes, setWishes] = useState<{
    birthdayEnabled: boolean;
    birthdayTemplateId: string;
    birthdaySendTime: string;
    birthdayVariables: Record<string, string>;
    birthdayVarModes: Record<string, 'field' | 'custom'>;
    anniversaryEnabled: boolean;
    anniversaryTemplateId: string;
    anniversarySendTime: string;
    anniversaryVariables: Record<string, string>;
    anniversaryVarModes: Record<string, 'field' | 'custom'>;
  }>({
    birthdayEnabled: false, birthdayTemplateId: '', birthdaySendTime: '10:00 AM',
    birthdayVariables: {}, birthdayVarModes: {},
    anniversaryEnabled: false, anniversaryTemplateId: '', anniversarySendTime: '10:00 AM',
    anniversaryVariables: {}, anniversaryVarModes: {},
  });

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
        setOrg(businessRes);
      }
      if (waRes && waRes.connectionStatus !== 'DISCONNECTED') {
        const provider = waRes.apiProvider || 'OFFICIAL_META';
        setApiProvider(provider);
        setWhatsapp({ businessAccountId: waRes.businessAccountId || '', phoneNumberId: waRes.phoneNumberId || '', displayPhoneNumber: waRes.displayPhoneNumber || '', accessToken: provider === 'OFFICIAL_META' ? '••••••••••••••••••••' : '', metaApiBaseUrl: waRes.metaApiBaseUrl || '', thirdPartyEndpoint: waRes.thirdPartyEndpoint || 'https://app.click2api.in', thirdPartyInstanceId: waRes.thirdPartyInstanceId || '', thirdPartyToken: provider === 'THIRD_PARTY_CLICK2API' ? '••••••••••••' : '' });
        setWaStatus(waRes.connectionStatus);
      }
      if (wishesRes) {
        const SYS_OPTS = ['Customer Name', 'Customer Phone', 'Customer Email', 'Product or Service'];
        const bdayVars: Record<string, string> = (wishesRes.birthdayVariables as Record<string, string>) || {};
        const annivVars: Record<string, string> = (wishesRes.anniversaryVariables as Record<string, string>) || {};
        const bdayModes: Record<string, 'field' | 'custom'> = {};
        const annivModes: Record<string, 'field' | 'custom'> = {};
        Object.entries(bdayVars).forEach(([k, v]) => { bdayModes[k] = SYS_OPTS.includes(v) ? 'field' : 'custom'; });
        Object.entries(annivVars).forEach(([k, v]) => { annivModes[k] = SYS_OPTS.includes(v) ? 'field' : 'custom'; });
        setWishes({
          birthdayEnabled: wishesRes.birthdayEnabled ?? false,
          birthdayTemplateId: wishesRes.birthdayTemplateId || '',
          birthdaySendTime: wishesRes.birthdaySendTime || '10:00 AM',
          birthdayVariables: bdayVars,
          birthdayVarModes: bdayModes,
          anniversaryEnabled: wishesRes.anniversaryEnabled ?? false,
          anniversaryTemplateId: wishesRes.anniversaryTemplateId || '',
          anniversarySendTime: wishesRes.anniversarySendTime || '10:00 AM',
          anniversaryVariables: annivVars,
          anniversaryVarModes: annivModes,
        });
      }
      setTemplates(templatesRes || []);
      setStatuses(statusesRes || []);
      setSources(sourcesRes || []);
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
      const updated = await api.patch('/api/business', profile);
      setOrg(updated);
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
      message: `Delete lead source "${target.name}"? Contacts with this source will remain unchanged but you won't be able to select this source for new contacts.`,
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

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTemplateName || !customTemplateBody) { warning('Missing fields', 'Name and body are required.'); return; }
    try {
      const payload = { name: customTemplateName, bodyText: customTemplateBody, footerText: customTemplateFooter, category: 'MARKETING', language: 'en' };
      if (editingTemplate) await api.put(`/api/templates/${editingTemplate.id}`, payload);
      else await api.post('/api/templates', payload);
      setShowCustomTemplateModal(false); setEditingTemplate(null); setCustomTemplateName(''); setCustomTemplateBody(''); setCustomTemplateFooter('');
      fetchSettings();
      success(editingTemplate ? 'Template updated' : 'Template created');
    } catch (err: any) { error('Failed to save template', err.message); }
  };

  const handleDeleteCustomTemplate = async (id: string) => {
    const ok = await confirm({ title: 'Delete Template', message: 'Delete this template? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await run(`del-tpl-${id}`, async () => {
      await api.delete(`/api/templates/${id}`);
      fetchSettings();
      success('Template deleted');
    });
  };

  const handleSaveWishes = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaveSuccess(null);
    try {
      await api.patch('/api/engagement-settings', {
        birthdayEnabled: wishes.birthdayEnabled,
        birthdayTemplateId: wishes.birthdayTemplateId || null,
        birthdaySendTime: wishes.birthdaySendTime,
        birthdayVariables: wishes.birthdayVariables,
        anniversaryEnabled: wishes.anniversaryEnabled,
        anniversaryTemplateId: wishes.anniversaryTemplateId || null,
        anniversarySendTime: wishes.anniversarySendTime,
        anniversaryVariables: wishes.anniversaryVariables,
      });
      setSaveSuccess('Wishes settings saved.');
      success('Wishes settings saved');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) { error('Failed to save', err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#0E6B50' }} />
    </div>
  );

  const webhookUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/whatsapp`;
  const verifyToken = 'leadflow-verify-token-1234';
  const cats = ['Real Estate', 'Retail', 'Education', 'Automobile', 'Healthcare', 'Software/SaaS', 'Finance', 'Agency', 'Other'];
  const tzOptions = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

  return (
    <div className="animate-fade-in space-y-6" style={{ paddingBottom: 48 }}>

      {/* Page Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight leading-tight">
          Settings
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="relative flex shrink-0" style={{ width: 6, height: 6 }}>
            <span className="animate-ping absolute inline-flex rounded-full bg-[#64748B] opacity-75" style={{ width: '100%', height: '100%' }} />
            <span className="relative inline-flex rounded-full bg-[#64748B]" style={{ width: 6, height: 6 }} />
          </div>
          <span className="text-[10px] font-semibold text-[#64748B] tracking-wider uppercase">System Config</span>
          <span className="text-[#94A3B8] text-[12px]">•</span>
          <p className="text-[13px] text-[#64748B]">
            Configure your workspace, WhatsApp connection, and automation rules
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 13 }}>
          <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
          {saveSuccess}
        </div>
      )}

      {/* Row 1: Business Profile + WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 tablet-1col">

        {/* Business Profile */}
        <SectionCard title="Business Profile" icon={<Building2 style={{ width: 16, height: 16 }} />}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Company Name</label>
                <input type="text" required className="input-base" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Owner Name</label>
                <input type="text" required className="input-base" value={profile.ownerName} onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Business Category</label>
                <select className="select-base" value={profile.businessCategory} onChange={(e) => setProfile({ ...profile, businessCategory: e.target.value })}>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Timezone</label>
                <select className="select-base" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
                  {tzOptions.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Business Email</label>
                <input type="email" required className="input-base" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Business Phone</label>
                <input type="tel" required className="input-base" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">City</label>
                <input type="text" className="input-base" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Website</label>
                <input type="text" className="input-base" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
              Save Profile
            </button>
          </form>
        </SectionCard>

        {/* WhatsApp Connection */}
        <SectionCard
          title="WhatsApp Connection"
          icon={<PhoneCall style={{ width: 16, height: 16 }} />}
          action={
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: waStatus === 'CONNECTED' ? '#F0FDF4' : '#FEF2F2',
              color: waStatus === 'CONNECTED' ? '#16A34A' : '#EF4444',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: waStatus === 'CONNECTED' ? '#16A34A' : '#EF4444', display: 'inline-block' }} />
              {waStatus === 'CONNECTED' ? 'Connected' : 'Disconnected'}
            </span>
          }
        >
          {/* Provider Toggle */}
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 3, marginBottom: 16 }}>
            {([
              { id: 'OFFICIAL_META', label: 'Meta Cloud API', icon: <Shield style={{ width: 13, height: 13 }} /> },
              // { id: 'THIRD_PARTY_CLICK2API', label: 'Click2API', icon: <Zap style={{ width: 13, height: 13 }} /> },
            ] as { id: 'OFFICIAL_META' | 'THIRD_PARTY_CLICK2API'; label: string; icon: React.ReactNode }[]).map(p => (
              <button key={p.id} type="button"
                onClick={() => setApiProvider(p.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: 'none', transition: 'all 150ms ease',
                  background: apiProvider === p.id ? '#FFFFFF' : 'transparent',
                  color: apiProvider === p.id ? '#111827' : '#6B7280',
                  boxShadow: apiProvider === p.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {waError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
              {waError}
            </div>
          )}

          <form onSubmit={handleConnectWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {apiProvider === 'OFFICIAL_META' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Phone Number ID</label>
                    <input type="text" required className="input-base" placeholder="1048293740283"
                      value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Display Number</label>
                    <input type="text" required className="input-base" placeholder="+91 93703 29233"
                      value={whatsapp.displayPhoneNumber} onChange={(e) => setWhatsapp({ ...whatsapp, displayPhoneNumber: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Business Account ID</label>
                  <input type="text" required className="input-base" placeholder="849302847294829"
                    value={whatsapp.businessAccountId} onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Meta Access Token</label>
                  <textarea rows={2} required className="textarea-base" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="Paste access token"
                    value={whatsapp.accessToken} onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Custom API Base URL <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
                  <input type="url" className="input-base" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="https://crm.click2api.in/api/meta"
                    value={whatsapp.metaApiBaseUrl} onChange={(e) => setWhatsapp({ ...whatsapp, metaApiBaseUrl: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="form-label">Click2API Endpoint</label>
                  <input type="url" required className="input-base" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="https://app.click2api.in"
                    value={whatsapp.thirdPartyEndpoint} onChange={(e) => setWhatsapp({ ...whatsapp, thirdPartyEndpoint: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Instance / Channel ID</label>
                    <input type="text" required className="input-base" placeholder="6a1fbb0083139ab..."
                      value={whatsapp.thirdPartyInstanceId} onChange={(e) => setWhatsapp({ ...whatsapp, thirdPartyInstanceId: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Display Number</label>
                    <input type="text" required className="input-base" placeholder="+919186911900"
                      value={whatsapp.displayPhoneNumber} onChange={(e) => setWhatsapp({ ...whatsapp, displayPhoneNumber: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Access Token</label>
                  <textarea rows={2} required className="textarea-base" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="Paste Click2API token"
                    value={whatsapp.thirdPartyToken} onChange={(e) => setWhatsapp({ ...whatsapp, thirdPartyToken: e.target.value })} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={waTesting} className="btn btn-primary" style={{ flex: 1 }}>
                {waTesting ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <RefreshCw style={{ width: 14, height: 14 }} />}
                {waTesting ? 'Testing...' : 'Connect & Test'}
              </button>
              {waStatus !== 'DISCONNECTED' && (
                <button type="button" onClick={handleDisconnectWhatsApp} disabled={isLoading('wa-disconnect')} className="btn btn-secondary" style={{ color: '#EF4444', borderColor: '#FECACA' }}>
                  {isLoading('wa-disconnect') ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : 'Disconnect'}
                </button>
              )}
            </div>
          </form>

          {/* Webhook info */}
          {apiProvider === 'OFFICIAL_META' && (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Meta Webhook Config
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  Callback URL: <code style={{ color: '#0E6B50', fontWeight: 600, fontSize: 11 }}>{webhookUrl}</code>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  Verify Token: <code style={{ color: '#0E6B50', fontWeight: 600, fontSize: 11 }}>{verifyToken}</code>
                </div>
              </div>
            </div>
          )}

          {/* Click2API custom templates */}
          {apiProvider === 'THIRD_PARTY_CLICK2API' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Custom Templates</p>
                <button type="button" onClick={() => { setEditingTemplate(null); setCustomTemplateName(''); setCustomTemplateBody(''); setCustomTemplateFooter(''); setShowCustomTemplateModal(true); }} className="btn btn-secondary btn-sm">
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {templates.filter((t: any) => t.isCustom).length === 0 && (
                  <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>No custom templates yet</p>
                )}
                {templates.filter((t: any) => t.isCustom).map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }} className="truncate">{t.name}</p>
                      <p style={{ fontSize: 12, color: '#9CA3AF' }} className="truncate">{t.bodyText}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                      <button type="button" onClick={() => { setEditingTemplate(t); setCustomTemplateName(t.name); setCustomTemplateBody(t.bodyText); setCustomTemplateFooter(t.footerText || ''); setShowCustomTemplateModal(true); }} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#0E6B50' }}>
                        <Edit2 style={{ width: 13, height: 13 }} />
                      </button>
                      <button type="button" onClick={() => handleDeleteCustomTemplate(t.id)} disabled={isLoading(`del-tpl-${t.id}`)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#EF4444' }}>
                        {isLoading(`del-tpl-${t.id}`) ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 2: Wishes + Status Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Wishes */}
        <SectionCard title="Automated Wishes" icon={<Gift style={{ width: 16, height: 16 }} />}>
          <form onSubmit={handleSaveWishes} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Birthday Block ── */}
            {(() => {
              const bdayTpl = templates.find(t => t.id === wishes.birthdayTemplateId);
              const bdayVars: string[] = (bdayTpl?.variablesJson as string[]) || [];
              const SYS_OPTS = ['Customer Name', 'Customer Phone', 'Customer Email', 'Product or Service'];
              return (
                <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  {/* Header toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: wishes.birthdayEnabled ? 'linear-gradient(135deg, #FFF7ED, #FFFBEB)' : '#FAFAFA', borderBottom: wishes.birthdayEnabled ? '1px solid #FDE68A' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🎂</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Birthday Wishes</p>
                        <p style={{ fontSize: 12, color: '#6B7280' }}>Auto-send on customer birthdays</p>
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" className="toggle-input" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        checked={wishes.birthdayEnabled} onChange={(e) => setWishes({ ...wishes, birthdayEnabled: e.target.checked })} />
                      <div className="toggle-track" />
                    </label>
                  </div>

                  {/* Expanded config */}
                  {wishes.birthdayEnabled && (
                    <div style={{ display: 'flex', minHeight: 200 }}>

                      {/* WhatsApp Preview Panel */}
                      <div style={{
                        width: 200, flexShrink: 0, background: '#EBE5D9',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23EBE5D9'/%3E%3Ccircle cx='10' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3Ccircle cx='30' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3Ccircle cx='50' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3C/svg%3E")`,
                        borderRight: '1px solid #CEC8C0', padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <div style={{ background: '#25D366', borderRadius: '6px 6px 0 0', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, margin: '-12px -12px 0' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>💬 Preview</span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {bdayTpl ? (
                            <div style={{ background: '#fff', borderRadius: '10px 10px 10px 3px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: 11.5, lineHeight: 1.5, color: '#374151' }}>
                              {(() => {
                                let preview = bdayTpl.bodyText;
                                bdayVars.forEach((v: string) => {
                                  const mapped = wishes.birthdayVariables[v];
                                  const isCustom = wishes.birthdayVarModes[v] === 'custom';
                                  const sample = isCustom
                                    ? (mapped || `{{${v}}}`)
                                    : mapped === 'Customer Name' ? 'Rahul Sharma'
                                    : mapped === 'Customer Phone' ? '+919876543210'
                                    : mapped === 'Customer Email' ? 'rahul@email.com'
                                    : mapped === 'Product or Service' ? 'Premium Plan'
                                    : `{{${v}}}`;
                                  preview = preview.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), sample);
                                });
                                if (bdayVars.length === 0) preview = preview.replace(/\{\{\d+\}\}/g, 'Rahul Sharma');
                                return preview.split('\n').map((line: string, i: number) => <span key={i}>{line}<br /></span>);
                              })()}
                              <p style={{ fontSize: 9.5, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>10:00 AM ✓✓</p>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 11, padding: '20px 4px' }}>Select a template to preview</div>
                          )}
                        </div>
                      </div>

                      {/* Right Form */}
                      <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#F9FAFB', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>WhatsApp Template *</label>
                            <select required className="select-base" style={{ height: 34, fontSize: 12 }}
                              value={wishes.birthdayTemplateId}
                              onChange={(e) => setWishes({ ...wishes, birthdayTemplateId: e.target.value, birthdayVariables: {} })}>
                              <option value="">Select template</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Send Time *</label>
                            <input type="text" required className="input-base" style={{ height: 34, fontSize: 12 }} placeholder="10:00 AM"
                              value={wishes.birthdaySendTime} onChange={(e) => setWishes({ ...wishes, birthdaySendTime: e.target.value })} />
                          </div>
                        </div>

                        {/* Variable Mapping */}
                        {bdayVars.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Variable Mapping</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {bdayVars.map((v: string) => {
                                const isCustomMode = wishes.birthdayVarModes[v] === 'custom';
                                return (
                                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #EDE9FE', padding: '3px 7px', borderRadius: 5, flexShrink: 0, fontFamily: 'monospace' }}>{`{{${v}}}`}</span>
                                    {isCustomMode ? (
                                      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                                        <input
                                          type="text"
                                          className="input-base"
                                          style={{ flex: 1, height: 30, fontSize: 11 }}
                                          placeholder="Type custom text..."
                                          value={wishes.birthdayVariables[v] || ''}
                                          onChange={(e) => setWishes({ ...wishes, birthdayVariables: { ...wishes.birthdayVariables, [v]: e.target.value } })}
                                        />
                                        <button
                                          type="button"
                                          title="Switch back to field"
                                          onClick={() => setWishes({ ...wishes, birthdayVarModes: { ...wishes.birthdayVarModes, [v]: 'field' }, birthdayVariables: { ...wishes.birthdayVariables, [v]: '' } })}
                                          style={{ width: 28, height: 30, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0, fontSize: 14 }}
                                        >×</button>
                                      </div>
                                    ) : (
                                      <select
                                        className="select-base"
                                        style={{ flex: 1, height: 30, fontSize: 11 }}
                                        value={wishes.birthdayVariables[v] || ''}
                                        onChange={(e) => {
                                          if (e.target.value === '__custom__') {
                                            setWishes({ ...wishes, birthdayVarModes: { ...wishes.birthdayVarModes, [v]: 'custom' }, birthdayVariables: { ...wishes.birthdayVariables, [v]: '' } });
                                          } else {
                                            setWishes({ ...wishes, birthdayVariables: { ...wishes.birthdayVariables, [v]: e.target.value } });
                                          }
                                        }}
                                      >
                                        <option value="">Select field…</option>
                                        {SYS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        <option disabled>──────────</option>
                                        <option value="__custom__">✏️ Custom Text…</option>
                                      </select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Anniversary Block ── */}
            {(() => {
              const annivTpl = templates.find(t => t.id === wishes.anniversaryTemplateId);
              const annivVars: string[] = (annivTpl?.variablesJson as string[]) || [];
              const SYS_OPTS = ['Customer Name', 'Customer Phone', 'Customer Email', 'Product or Service'];
              return (
                <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  {/* Header toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: wishes.anniversaryEnabled ? 'linear-gradient(135deg, #FDF4FF, #FAF5FF)' : '#FAFAFA', borderBottom: wishes.anniversaryEnabled ? '1px solid #E9D5FF' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>💍</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Anniversary Wishes</p>
                        <p style={{ fontSize: 12, color: '#6B7280' }}>Auto-send on customer anniversaries</p>
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" className="toggle-input" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        checked={wishes.anniversaryEnabled} onChange={(e) => setWishes({ ...wishes, anniversaryEnabled: e.target.checked })} />
                      <div className="toggle-track" />
                    </label>
                  </div>

                  {/* Expanded config */}
                  {wishes.anniversaryEnabled && (
                    <div style={{ display: 'flex', minHeight: 200 }}>

                      {/* WhatsApp Preview Panel */}
                      <div style={{
                        width: 200, flexShrink: 0, background: '#EBE5D9',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23EBE5D9'/%3E%3Ccircle cx='10' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3Ccircle cx='30' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3Ccircle cx='50' cy='10' r='0.8' fill='%23D4CECC' opacity='0.5'/%3E%3C/svg%3E")`,
                        borderRight: '1px solid #CEC8C0', padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <div style={{ background: '#25D366', borderRadius: '6px 6px 0 0', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, margin: '-12px -12px 0' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>💬 Preview</span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {annivTpl ? (
                            <div style={{ background: '#fff', borderRadius: '10px 10px 10px 3px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: 11.5, lineHeight: 1.5, color: '#374151' }}>
                              {(() => {
                                let preview = annivTpl.bodyText;
                                annivVars.forEach((v: string) => {
                                  const mapped = wishes.anniversaryVariables[v];
                                  const isCustom = wishes.anniversaryVarModes[v] === 'custom';
                                  const sample = isCustom
                                    ? (mapped || `{{${v}}}`)
                                    : mapped === 'Customer Name' ? 'Rahul Sharma'
                                    : mapped === 'Customer Phone' ? '+919876543210'
                                    : mapped === 'Customer Email' ? 'rahul@email.com'
                                    : mapped === 'Product or Service' ? 'Premium Plan'
                                    : `{{${v}}}`;
                                  preview = preview.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), sample);
                                });
                                if (annivVars.length === 0) preview = preview.replace(/\{\{\d+\}\}/g, 'Rahul Sharma');
                                return preview.split('\n').map((line: string, i: number) => <span key={i}>{line}<br /></span>);
                              })()}
                              <p style={{ fontSize: 9.5, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>10:00 AM ✓✓</p>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 11, padding: '20px 4px' }}>Select a template to preview</div>
                          )}
                        </div>
                      </div>

                      {/* Right Form */}
                      <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#F9FAFB', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>WhatsApp Template *</label>
                            <select required className="select-base" style={{ height: 34, fontSize: 12 }}
                              value={wishes.anniversaryTemplateId}
                              onChange={(e) => setWishes({ ...wishes, anniversaryTemplateId: e.target.value, anniversaryVariables: {} })}>
                              <option value="">Select template</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>Send Time *</label>
                            <input type="text" required className="input-base" style={{ height: 34, fontSize: 12 }} placeholder="10:00 AM"
                              value={wishes.anniversarySendTime} onChange={(e) => setWishes({ ...wishes, anniversarySendTime: e.target.value })} />
                          </div>
                        </div>

                        {/* Variable Mapping */}
                        {annivVars.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Variable Mapping</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {annivVars.map((v: string) => {
                                const isCustomMode = wishes.anniversaryVarModes[v] === 'custom';
                                return (
                                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #EDE9FE', padding: '3px 7px', borderRadius: 5, flexShrink: 0, fontFamily: 'monospace' }}>{`{{${v}}}`}</span>
                                    {isCustomMode ? (
                                      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                                        <input
                                          type="text"
                                          className="input-base"
                                          style={{ flex: 1, height: 30, fontSize: 11 }}
                                          placeholder="Type custom text..."
                                          value={wishes.anniversaryVariables[v] || ''}
                                          onChange={(e) => setWishes({ ...wishes, anniversaryVariables: { ...wishes.anniversaryVariables, [v]: e.target.value } })}
                                        />
                                        <button
                                          type="button"
                                          title="Switch back to field"
                                          onClick={() => setWishes({ ...wishes, anniversaryVarModes: { ...wishes.anniversaryVarModes, [v]: 'field' }, anniversaryVariables: { ...wishes.anniversaryVariables, [v]: '' } })}
                                          style={{ width: 28, height: 30, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0, fontSize: 14 }}
                                        >×</button>
                                      </div>
                                    ) : (
                                      <select
                                        className="select-base"
                                        style={{ flex: 1, height: 30, fontSize: 11 }}
                                        value={wishes.anniversaryVariables[v] || ''}
                                        onChange={(e) => {
                                          if (e.target.value === '__custom__') {
                                            setWishes({ ...wishes, anniversaryVarModes: { ...wishes.anniversaryVarModes, [v]: 'custom' }, anniversaryVariables: { ...wishes.anniversaryVariables, [v]: '' } });
                                          } else {
                                            setWishes({ ...wishes, anniversaryVariables: { ...wishes.anniversaryVariables, [v]: e.target.value } });
                                          }
                                        }}
                                      >
                                        <option value="">Select field…</option>
                                        {SYS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                        <option disabled>──────────</option>
                                        <option value="__custom__">✏️ Custom Text…</option>
                                      </select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
              Save Wishes
            </button>
          </form>
        </SectionCard>

        {/* Status Stages */}
        <SectionCard
          title="Lead Status Stages"
          icon={<Zap style={{ width: 16, height: 16 }} />}
          action={
            <button
              onClick={() => { setEditingStatus(null); setStatusName(''); setStatusColor('#6366f1'); setStatusIsDefault(false); setShowStatusModal(true); }}
              className="btn btn-secondary btn-sm"
            >
              <Plus style={{ width: 12, height: 12 }} /> Add Stage
            </button>
          }
        >
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Define your CRM pipeline stages. Reorder with the arrows. The default stage is assigned to new contacts.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {statuses.length === 0 && (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No stages yet. Add your first one.</p>
            )}
            {statuses.map((status, index) => (
              <div key={status.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12.5px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0',
                  transition: 'background 100ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.color, flexShrink: 0, display: 'inline-block' }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{status.name}</p>
                    {status.isDefault && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button disabled={index === 0} onClick={() => handleReorderStatus(index, 'UP')} className="btn btn-ghost btn-sm" style={{ padding: '0 5px', fontSize: 11, color: '#9CA3AF' }}>▲</button>
                  <button disabled={index === statuses.length - 1} onClick={() => handleReorderStatus(index, 'DOWN')} className="btn btn-ghost btn-sm" style={{ padding: '0 5px', fontSize: 11, color: '#9CA3AF' }}>▼</button>
                  <button onClick={() => { setEditingStatus(status); setStatusName(status.name); setStatusColor(status.color); setStatusIsDefault(status.isDefault); setShowStatusModal(true); }} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#0E6B50' }}>
                    <Edit2 style={{ width: 13, height: 13 }} />
                  </button>
                  <button disabled={status.isDefault || isLoading(`del-status-${status.id}`)} onClick={() => handleDeleteStatus(status.id)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#EF4444' }}>
                    {isLoading(`del-status-${status.id}`) ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Lead Sources & Import/Export Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lead Sources */}
        <SectionCard
          title="Lead Acquisition Channels"
          icon={<Users style={{ width: 16, height: 16 }} />}
          action={
            <button
              onClick={() => { setEditingSource(null); setSourceName(''); setShowSourceModal(true); }}
              className="btn btn-secondary btn-sm"
            >
              <Plus style={{ width: 12, height: 12 }} /> Add Source
            </button>
          }
        >
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Define your business acquisition channels (e.g. Website, Instagram, Ads). These populate your filters, lead creation modals, and drawers.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {(!Array.isArray(sources) || sources.length === 0) && (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No lead sources yet. Add your first one.</p>
            )}
            {(Array.isArray(sources) ? sources : []).map((source) => (
              <div key={source.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12.5px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0',
                  transition: 'background 100ms ease',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{source.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={() => { setEditingSource(source); setSourceName(source.name); setShowSourceModal(true); }} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#0E6B50' }}>
                    <Edit2 style={{ width: 13, height: 13 }} />
                  </button>
                  <button disabled={isLoading(`del-source-${source.id}`)} onClick={() => handleDeleteSource(source.id)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px', color: '#EF4444' }}>
                    {isLoading(`del-source-${source.id}`) ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Import Specs */}
        <SectionCard
          title="Data Import Specifications"
          icon={<Shield style={{ width: 16, height: 16 }} />}
        >
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Ensure your contact data spreadsheet maps correctly to the dynamic attributes before importing your Excel sheet.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFAFA', padding: 14, borderRadius: 8, border: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                <strong>Name & WhatsApp Phone:</strong> Always required. Format numbers with country code (e.g., 919876543210).
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                <strong>Dynamic Source Matching:</strong> Values in your spreadsheet's source column will automatically create contacts. Make sure they match active channels to maintain clean filters.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check style={{ width: 14, height: 14, color: '#10B981', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                <strong>Custom Status Mapping:</strong> Contacts will default to the primary pipeline stage if their status column doesn't match active CRM stages.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Status Modal */}
      {showStatusModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="animate-scale-up" style={{ background: '#FFFFFF', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E5E7EB' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{editingStatus ? 'Edit Stage' : 'Add Stage'}</p>
              <button onClick={() => setShowStatusModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }}><X style={{ width: 15, height: 15 }} /></button>
            </div>
            <form onSubmit={handleSaveStatus} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Stage Name</label>
                <input type="text" required className="input-base" placeholder="e.g. Lead Contacted"
                  value={statusName} onChange={(e) => setStatusName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Color</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 10 }}>
                  {STATUS_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setStatusColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c,
                        border: statusColor === c ? `3px solid #111827` : '2px solid transparent',
                        cursor: 'pointer', outline: statusColor === c ? '2px solid rgba(255,255,255,0.8)' : 'none',
                        outlineOffset: -4, transition: 'all 100ms ease',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                  <input type="color" style={{ width: 28, height: 28, padding: 2, borderRadius: 6, border: '1px solid #E5E7EB', cursor: 'pointer' }}
                    value={statusColor} onChange={(e) => setStatusColor(e.target.value)} />
                  <code style={{ fontSize: 12, color: '#6B7280' }}>{statusColor}</code>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isDefault" checked={statusIsDefault}
                  onChange={(e) => setStatusIsDefault(e.target.checked)} />
                <label htmlFor="isDefault" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>Set as default stage for new leads</label>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowStatusModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={statusSaving} className="btn btn-primary" style={{ flex: 1 }}>
                  {statusSaving && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                  {editingStatus ? 'Save Changes' : 'Create Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Source Modal */}
      {showSourceModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="animate-scale-up" style={{ background: '#FFFFFF', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E5E7EB' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{editingSource ? 'Edit Lead Source' : 'Add Lead Source'}</p>
              <button onClick={() => setShowSourceModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }}><X style={{ width: 15, height: 15 }} /></button>
            </div>
            <form onSubmit={handleSaveSource} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Source Name</label>
                <input type="text" required className="input-base" placeholder="e.g. Instagram DM"
                  value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowSourceModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={sourceSaving} className="btn btn-primary" style={{ flex: 1 }}>
                  {sourceSaving && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
                  {editingSource ? 'Save Changes' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Template Modal */}
      {showCustomTemplateModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="animate-scale-up" style={{ background: '#FFFFFF', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E5E7EB' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{editingTemplate ? 'Edit Template' : 'Create Template'}</p>
              <button onClick={() => setShowCustomTemplateModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }}><X style={{ width: 15, height: 15 }} /></button>
            </div>
            <form onSubmit={handleSaveCustomTemplate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Template Name</label>
                <input type="text" required className="input-base" placeholder="e.g. Welcome Message"
                  value={customTemplateName} onChange={(e) => setCustomTemplateName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Message Body</label>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Use {`{{1}}`} for Customer Name, {`{{2}}`} for Product, etc.</p>
                <textarea rows={5} required className="textarea-base"
                  placeholder={`Hi {{1}}, welcome to our store!`}
                  value={customTemplateBody} onChange={(e) => setCustomTemplateBody(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Footer Text <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" className="input-base" placeholder="Reply STOP to unsubscribe"
                  value={customTemplateFooter} onChange={(e) => setCustomTemplateFooter(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCustomTemplateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
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

