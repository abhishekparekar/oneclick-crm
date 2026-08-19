import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import {
  LayoutDashboard,
  Layers,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  CreditCard,
  Calendar,
  Award,
  User,
} from 'lucide-react';

export default function FranchisePortal() {
  const { confirm, success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'stats') as 'stats' | 'clients' | 'profile';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Data lists
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [clientModal, setClientModal] = useState<{ show: boolean; mode: 'create' | 'edit'; data?: any }>({
    show: false,
    mode: 'create',
  });

  // Modal Form Inputs
  const [clientForm, setClientForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    businessCategory: 'Retail',
    country: 'India',
    timezone: 'Asia/Kolkata',
    planType: 'FREE' as 'FREE' | 'MONTHLY' | 'YEARLY',
    planPrice: 0,
    planExpiresAt: '',
    isActive: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'stats') {
        const statsRes = await api.get('/api/franchise/stats');
        setStats(statsRes);
      } else if (activeTab === 'clients') {
        const clientsRes = await api.get('/api/franchise/organizations');
        setClients(clientsRes);
      } else if (activeTab === 'profile') {
        const profileRes = await api.get('/api/franchise/profile');
        setProfile(profileRes);
      }
    } catch (err: any) {
      error('Failed to load portal data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clientModal.mode === 'create') {
        await api.post('/api/franchise/organizations', clientForm);
        success('Client Workspace created successfully');
      } else {
        const { password, email, phone, ownerName, businessCategory, ...updatePayload } = clientForm;
        await api.put(`/api/franchise/organizations/${clientModal.data.id}`, updatePayload);
        success('Client details updated successfully');
      }
      setClientModal({ show: false, mode: 'create' });
      fetchData();
    } catch (err: any) {
      error('Failed to save client workspace', err.message);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Client Workspace',
      message: `Are you sure you want to delete the workspace "${name}"? This action will permanently delete all associated leads, settings, and campaigns under this workspace.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/franchise/organizations/${id}`);
      success('Workspace deleted successfully');
      fetchData();
    } catch (err: any) {
      error('Failed to delete workspace', err.message);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Lifetime';
    return new Date(dateStr).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Franchise Partner Portal
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            Manage client workspaces, track plan renewals, and view reselling earnings.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn btn-secondary shrink-0"
          style={{ gap: 6, alignSelf: 'flex-start' }}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
          Reload Data
        </button>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-px overflow-x-auto hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        {[
          { id: 'stats', label: 'Earning Analytics', icon: LayoutDashboard },
          { id: 'clients', label: 'Client Workspaces', icon: Layers },
          { id: 'profile', label: 'My Franchise Plan', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 px-4 py-2.5 font-medium text-[13px] border-b-2 transition-all shrink-0"
              style={{
                borderColor: active ? '#0E6B50' : 'transparent',
                color: active ? '#0E6B50' : '#6B7280',
                marginBottom: -1,
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
          <RefreshCw className="animate-spin text-[#0E6B50]" style={{ width: 24, height: 24 }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* STATS TAB */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tablet-2col">
                {[
                  { label: 'Total Client Workspaces', value: stats.totalClients, icon: Layers, color: '#0E6B50', bg: '#ECFDF5' },
                  { label: 'Monthly Plan Clients', value: stats.plans.MONTHLY, icon: CreditCard, color: '#0EA5E9', bg: '#E0F2FE' },
                  { label: 'Yearly Plan Clients', value: stats.plans.YEARLY, icon: Calendar, color: '#16A34A', bg: '#DCFCE7' },
                  { label: 'Monthly Billing Runrate', value: `₹${stats.estimatedMonthlyRevenue}`, icon: Award, color: '#F59E0B', bg: '#FEF3C7' },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={i} className="card-elevated" style={{ padding: '20px 24px' }}>
                      <div className="flex items-start justify-between">
                        <div
                          className="flex items-center justify-center rounded-lg"
                          style={{ width: 36, height: 36, background: kpi.bg }}
                        >
                          <Icon style={{ width: 18, height: 18, color: kpi.color }} />
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                          {kpi.value.toString()}
                        </div>
                        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{kpi.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Information Alert */}
              <div className="p-4 rounded-xl border border-[#ECFDF5] bg-[#F8FAFC]" style={{ borderLeft: '4px solid #0E6B50' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Commission Model Note</h4>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>
                  The monthly billing runrate displays the gross billing amount generated by workspaces resold through your franchise partnership. Your net payouts are processed based on your franchise agreement parameters. Yearly billing values are automatically averaged out to reflect a monthly equivalence.
                </p>
              </div>
            </div>
          )}

          {/* CLIENTS TAB */}
          {activeTab === 'clients' && (
            <div className="card-elevated" style={{ padding: 20 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Your Resold Client Accounts</h3>
                <button
                  onClick={() => {
                    setClientForm({
                      name: '',
                      ownerName: '',
                      email: '',
                      phone: '',
                      password: '',
                      businessCategory: 'Real Estate',
                      country: 'India',
                      timezone: 'Asia/Kolkata',
                      planType: 'FREE',
                      planPrice: 0,
                      planExpiresAt: '',
                      isActive: true,
                    });
                    setClientModal({ show: true, mode: 'create' });
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add Client Workspace
                </button>
              </div>

              {clients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #E5E7EB', borderRadius: 8 }}>
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>You haven't resold any client accounts yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F3F4F6', fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th className="py-3 px-4">User Name</th>
                        <th className="py-3 px-4">Contact Owner</th>
                        <th className="py-3 px-4">Plan Type</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Expires On</th>
                        <th className="py-3 px-4">Database Contacts</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: 13, color: '#374151' }}>
                      {clients.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #F9FAFB' }} className="hover:bg-[#FAFAFA]">
                          <td className="py-3 px-4 font-semibold text-[#111827]">{c.name}</td>
                          <td className="py-3 px-4">
                            <div>{c.ownerName}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{c.email} | {c.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="badge"
                              style={{
                                background: c.planType === 'FREE' ? '#F3F4F6' : c.planType === 'MONTHLY' ? '#ECFDF5' : '#E8F5E9',
                                color: c.planType === 'FREE' ? '#4B5563' : c.planType === 'MONTHLY' ? '#0E6B50' : '#2E7D32',
                                fontWeight: 600,
                              }}
                            >
                              {c.planType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">₹{c.planPrice}</td>
                          <td className="py-3 px-4 text-[#6B7280]">{formatDate(c.planExpiresAt)}</td>
                          <td className="py-3 px-4 text-[#6B7280]">
                            {c._count?.leads || 0} active leads
                          </td>
                          <td className="py-3 px-4">
                            {c.isActive ? (
                              <span className="flex items-center gap-1 text-[#16A34A] font-medium" style={{ fontSize: 12 }}>
                                <CheckCircle style={{ width: 14, height: 14 }} /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[#EF4444] font-medium" style={{ fontSize: 12 }}>
                                <XCircle style={{ width: 14, height: 14 }} /> Suspended
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setClientForm({
                                    name: c.name,
                                    ownerName: c.ownerName,
                                    email: c.email,
                                    phone: c.phone,
                                    password: '',
                                    businessCategory: c.businessCategory || 'Retail',
                                    country: c.country || 'India',
                                    timezone: c.timezone || 'Asia/Kolkata',
                                    planType: c.planType,
                                    planPrice: c.planPrice,
                                    planExpiresAt: c.planExpiresAt ? new Date(c.planExpiresAt).toISOString().split('T')[0] : '',
                                    isActive: c.isActive,
                                  });
                                  setClientModal({ show: true, mode: 'edit', data: c });
                                }}
                                className="btn btn-ghost btn-icon"
                                title="Edit Subscription Details"
                              >
                                <Edit2 style={{ width: 14, height: 14, color: '#4B5563' }} />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(c.id, c.name)}
                                className="btn btn-ghost btn-icon"
                                title="Delete Client"
                              >
                                <Trash2 style={{ width: 14, height: 14, color: '#EF4444' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MY PLAN TAB */}
          {activeTab === 'profile' && profile && (
            <div className="card-elevated" style={{ padding: 24, maxWidth: 600 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }} className="flex items-center gap-2">
                <Award style={{ width: 16, height: 16, color: '#0E6B50' }} />
                Your Reseller Partnership Contract
              </h3>

              <div className="space-y-4" style={{ fontSize: 13, color: '#374151' }}>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Franchise Name</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{profile.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Contract Email</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Contract Phone</span>
                  <span>{profile.phone}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Partnership Tier / Plan</span>
                  <span className="badge badge-light" style={{ background: '#ECFDF5', color: '#0E6B50', fontWeight: 600 }}>
                    {profile.planName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Contract Price</span>
                  <span style={{ fontWeight: 600 }}>₹{profile.planPrice}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Max Client Workspaces</span>
                  <span style={{ fontWeight: 600, color: '#0E6B50' }}>{profile.maxUsers || 10} limit</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                  <span style={{ color: '#6B7280' }}>Partnership Expiry</span>
                  <span className="text-[#EF4444] font-medium">{formatDate(profile.planExpiresAt)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span style={{ color: '#6B7280' }}>Partnership Status</span>
                  {profile.isActive ? (
                    <span className="badge badge-success" style={{ background: '#DCFCE7', color: '#16A34A', fontWeight: 600 }}>
                      Active / Verified
                    </span>
                  ) : (
                    <span className="badge badge-error" style={{ background: '#FEE2E2', color: '#EF4444', fontWeight: 600 }}>
                      Suspended / Hold
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CLIENT MODAL (CREATE / EDIT) ── */}
      {clientModal.show && createPortal(
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card-elevated animate-scale-in" style={{ width: '90%', maxWidth: 500, padding: 24, background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              {clientModal.mode === 'create' ? 'Provision Client Workspace' : 'Update Client Subscription Details'}
            </h3>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Business Name</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="input-base"
                  placeholder="e.g. Karan's Bakery"
                  disabled={clientModal.mode === 'edit'}
                />
              </div>

              {clientModal.mode === 'create' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Owner Full Name</label>
                      <input
                        type="text"
                        required
                        value={clientForm.ownerName}
                        onChange={(e) => setClientForm({ ...clientForm, ownerName: e.target.value })}
                        className="input-base"
                        placeholder="Owner Name"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Business Category</label>
                      <input
                        type="text"
                        required
                        value={clientForm.businessCategory}
                        onChange={(e) => setClientForm({ ...clientForm, businessCategory: e.target.value })}
                        className="input-base"
                        placeholder="e.g. Retail"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Owner Email</label>
                      <input
                        type="email"
                        required
                        value={clientForm.email}
                        onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                        className="input-base"
                        placeholder="owner@bakery.com"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Owner Phone</label>
                      <input
                        type="tel"
                        required
                        value={clientForm.phone}
                        onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                        className="input-base"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Login Password</label>
                    <input
                      type="password"
                      required
                      value={clientForm.password}
                      onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                      className="input-base"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </>
              )}

              <hr style={{ border: 0, borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Plan Type</label>
                  <select
                    value={clientForm.planType}
                    onChange={(e) => {
                      const type = e.target.value as 'FREE' | 'MONTHLY' | 'YEARLY';
                      let expiry = '';
                      if (type === 'MONTHLY') {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        expiry = d.toISOString().split('T')[0];
                      } else if (type === 'YEARLY') {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        expiry = d.toISOString().split('T')[0];
                      }
                      setClientForm({ ...clientForm, planType: type, planExpiresAt: expiry });
                    }}
                    className="select-base"
                  >
                    <option value="FREE">FREE</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Plan Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={clientForm.planPrice}
                    onChange={(e) => setClientForm({ ...clientForm, planPrice: parseFloat(e.target.value) || 0 })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Expires On</label>
                  <input
                    type="date"
                    value={clientForm.planExpiresAt}
                    onChange={(e) => setClientForm({ ...clientForm, planExpiresAt: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>

              {clientModal.mode === 'edit' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="client-active"
                    checked={clientForm.isActive}
                    onChange={(e) => setClientForm({ ...clientForm, isActive: e.target.checked })}
                    style={{ width: 15, height: 15 }}
                  />
                  <label htmlFor="client-active" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                    Workspace is Active & Client Allowed Login
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3" style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setClientModal({ show: false, mode: 'create' })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {clientModal.mode === 'create' ? 'Provision Client' : 'Save Details'}
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

