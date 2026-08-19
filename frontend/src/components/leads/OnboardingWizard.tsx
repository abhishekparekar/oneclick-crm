import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/leads/api';
import {
  Building2, PhoneCall, ListTodo, UserPlus, CheckCircle,
  ArrowRight, Loader2, RefreshCw,
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEP_LABELS = ['Business', 'WhatsApp', 'Pipeline', 'First Contact', 'Done'];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { org, setOrg } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: org?.name || '', ownerName: org?.ownerName || '',
    businessCategory: org?.businessCategory || 'Retail',
    phone: org?.phone || '', email: org?.email || '',
    timezone: org?.timezone || 'Asia/Kolkata',
  });

  const [whatsapp, setWhatsapp] = useState({
    businessAccountId: '', phoneNumberId: '', displayPhoneNumber: '', accessToken: '',
  });
  const [waTesting, setWaTesting] = useState(false);
  const [waStatus, setWaStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
  const [waError, setWaError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState([
    { name: 'New Lead', color: '#3b82f6' }, { name: 'Contacted', color: '#eab308' },
    { name: 'Interested', color: '#a855f7' }, { name: 'Demo Scheduled', color: '#06b6d4' },
    { name: 'Closed Won', color: '#22c55e' }, { name: 'Closed Lost', color: '#ef4444' },
  ]);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#3b82f6' });

  const [lead, setLead] = useState({ name: '', whatsappPhone: '', productService: '', source: 'Walk-in' });
  const [sources, setSources] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchOrg = async () => {
      const { token } = useAuthStore.getState();
      // Skip if no token — avoids 401 when auth hasn't initialized yet
      if (!token) return;
      try {
        const data = await api.get('/api/business');
        if (data) {
          setOrg(data);
          setProfile({ name: data.name || '', ownerName: data.ownerName || '', businessCategory: data.businessCategory || 'Retail', phone: data.phone || '', email: data.email || '', timezone: data.timezone || 'Asia/Kolkata' });
        }
      } catch (err) { console.error(err); }
    };
    fetchOrg();
  }, [setOrg]);

  React.useEffect(() => {
    const fetchSources = async () => {
      const { token } = useAuthStore.getState();
      if (!token) return;
      try {
        const data = await api.get('/api/sources');
        if (data) {
          setSources(data || []);
          if (data.length > 0) {
            setLead(prev => ({ ...prev, source: prev.source || data[0].name }));
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchSources();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try { const updatedOrg = await api.patch('/api/business', profile); setOrg(updatedOrg); setStep(2); }
    catch (err: any) { setError(err.message || 'Failed to save profile'); }
    finally { setLoading(false); }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsapp.businessAccountId || !whatsapp.phoneNumberId || !whatsapp.accessToken || !whatsapp.displayPhoneNumber) {
      setWaError('Please fill all credentials.'); setWaStatus('failed'); return;
    }
    setWaTesting(true); setWaError(null); setWaStatus('idle');
    try {
      await api.post('/api/whatsapp/connect', whatsapp);
      const testRes = await api.post('/api/whatsapp/test-connection');
      if (testRes?.status === 'CONNECTED' || testRes?.status === 'OK' || testRes?.success) setWaStatus('connected');
      else { setWaStatus('failed'); setWaError('Connection rejected. Check credentials.'); }
    } catch (err: any) { setWaStatus('failed'); setWaError(err.message || 'Test failed.'); }
    finally { setWaTesting(false); }
  };

  const handleSaveStatuses = async () => {
    setLoading(true); setError(null);
    try {
      const existing = await api.get('/api/statuses');
      for (const st of statuses) {
        if (existing.some((e: any) => e.name.toLowerCase() === st.name.toLowerCase())) continue;
        await api.post('/api/statuses', { name: st.name, color: st.color, displayOrder: statuses.indexOf(st) + 1 });
      }
      setStep(4);
    } catch (err: any) { setError(err.message || 'Failed to save statuses'); }
    finally { setLoading(false); }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const statusList = await api.get('/api/statuses');
      const defaultStatus = statusList.find((s: any) => s.isDefault) || statusList[0];
      if (!defaultStatus) throw new Error('Create at least one status stage first.');
      await api.post('/api/leads', { ...lead, statusId: defaultStatus.id, whatsappOptIn: true });
      const finalOrg = await api.patch('/api/business', { onboardingCompleted: true });
      setOrg(finalOrg); setStep(5);
    } catch (err: any) { setError(err.message || 'Failed to create lead'); }
    finally { setLoading(false); }
  };

  const cats = ['Real Estate', 'Retail', 'Education', 'Automobile', 'Healthcare', 'Software/SaaS', 'Finance', 'Agency', 'Other'];
  const srcOptions = sources.length > 0 ? sources.map(s => s.name) : ['Walk-in', 'Website Form', 'Facebook Ad', 'Google Search', 'Referral', 'Instagram Direct'];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/easyconnect.png"
            alt="Easy Connect"
            style={{
              height: 52, width: 'auto',
              objectFit: 'contain', display: 'inline-block',
              marginBottom: 14,
            }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Set up your workspace</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>Complete these steps to activate Easy Connect CRM</p>
        </div>

        {/* Step Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isDone = step > num;
            const isActive = step === num;
            return (
              <React.Fragment key={num}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                    background: isDone ? '#0E6B50' : isActive ? '#ECFDF5' : '#F3F4F6',
                    color: isDone ? '#FFFFFF' : isActive ? '#0E6B50' : '#9CA3AF',
                    border: isActive ? '2px solid #0E6B50' : '2px solid transparent',
                    transition: 'all 200ms ease',
                  }}>
                    {isDone ? <CheckCircle style={{ width: 14, height: 14 }} /> : num}
                  </div>
                  <span style={{ fontSize: 10, color: isActive ? '#0E6B50' : '#9CA3AF', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{ width: 32, height: 1, background: step > num ? '#0E6B50' : '#E5E7EB', marginBottom: 16, transition: 'background 300ms ease' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="card-elevated" style={{ padding: 28 }}>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Step 1: Business Profile */}
          {step === 1 && (
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 style={{ width: 18, height: 18, color: '#0E6B50' }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Business details</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Tell us about your company</p>
                </div>
              </div>
              <div>
                <label className="form-label">Company Name</label>
                <input type="text" required className="input-base" placeholder="Acme Solutions" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Business Category</label>
                  <select className="select-base" value={profile.businessCategory} onChange={(e) => setProfile({ ...profile, businessCategory: e.target.value })}>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Owner Name</label>
                  <input type="text" required className="input-base" placeholder="John Doe" value={profile.ownerName} onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Business Email</label>
                  <input type="email" required className="input-base" placeholder="hello@company.com" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Business Phone</label>
                  <input type="tel" required className="input-base" placeholder="919XXXXXXXXX" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Timezone</label>
                <select className="select-base" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
                {loading ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <>Continue <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </form>
          )}

          {/* Step 2: WhatsApp */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneCall style={{ width: 18, height: 18, color: '#16A34A' }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Connect WhatsApp</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Meta Cloud API credentials</p>
                </div>
              </div>
              {waError && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>{waError}</div>}
              {waStatus === 'connected' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 13 }}><CheckCircle style={{ width: 15, height: 15 }} /> Connection verified!</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Phone Number ID</label>
                  <input type="text" className="input-base" placeholder="1048293740283" value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Display Number</label>
                  <input type="text" className="input-base" placeholder="+91 93703 29233" value={whatsapp.displayPhoneNumber} onChange={(e) => setWhatsapp({ ...whatsapp, displayPhoneNumber: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Business Account ID</label>
                <input type="text" className="input-base" placeholder="849302847294829" value={whatsapp.businessAccountId} onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Meta Access Token</label>
                <textarea rows={2} className="textarea-base" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="EAAG..." value={whatsapp.accessToken} onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleTestWhatsApp} disabled={waTesting} className="btn btn-primary" style={{ flex: 1, background: '#16A34A', borderColor: '#16A34A' }}>
                  {waTesting ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <RefreshCw style={{ width: 14, height: 14 }} />}
                  {waTesting ? 'Testing...' : 'Test & Connect'}
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn btn-secondary">Skip for now</button>
              </div>
              {waStatus === 'connected' && (
                <button type="button" onClick={() => setStep(3)} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Continue <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          )}

          {/* Step 3: Statuses */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ListTodo style={{ width: 18, height: 18, color: '#0E6B50' }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Pipeline stages</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Customize your lead journey</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="input-base" style={{ flex: 1 }} placeholder="Add custom stage..." value={newStatus.name} onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })} />
                <input type="color" style={{ width: 40, height: 40, padding: 3, borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer' }} value={newStatus.color} onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })} />
                <button type="button" className="btn btn-secondary" onClick={() => { if (!newStatus.name) return; setStatuses([...statuses, newStatus]); setNewStatus({ name: '', color: '#3b82f6' }); }}>Add</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#F9FAFB', borderRadius: 10, padding: 12, border: '1px solid #E5E7EB', maxHeight: 200, overflowY: 'auto' }}>
                {statuses.map((st, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '7px 10px', borderRadius: 7, border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{st.name}</span>
                    </div>
                    <button type="button" onClick={() => setStatuses(statuses.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 700, fontSize: 14, padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleSaveStatuses} disabled={loading || statuses.length === 0} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {loading ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <>Save & Continue <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
          )}

          {/* Step 4: First Lead */}
          {step === 4 && (
            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus style={{ width: 18, height: 18, color: '#0E6B50' }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>First contact</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Add a test customer to try the system</p>
                </div>
              </div>
              <div>
                <label className="form-label">Customer Name</label>
                <input type="text" required className="input-base" placeholder="Rahul Sharma" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">WhatsApp Number</label>
                <input type="tel" required className="input-base" placeholder="919XXXXXXXXX" value={lead.whatsappPhone} onChange={(e) => setLead({ ...lead, whatsappPhone: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Product Interest</label>
                  <input type="text" className="input-base" placeholder="e.g. 2BHK Apartment" value={lead.productService} onChange={(e) => setLead({ ...lead, productService: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Lead Source</label>
                  <select className="select-base" value={lead.source} onChange={(e) => setLead({ ...lead, source: e.target.value })}>
                    {srcOptions.map(src => <option key={src} value={src}>{src}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {loading ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <>Create & Finish Setup <CheckCircle style={{ width: 16, height: 16 }} /></>}
              </button>
            </form>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle style={{ width: 32, height: 32, color: '#0E6B50' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 10 }}>You're all set!</h2>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>
                Your Easy Connect workspace is ready. Start building automation flows, scheduling campaigns, and tracking contacts.
              </p>
              <button type="button" onClick={onComplete} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Go to Dashboard <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

