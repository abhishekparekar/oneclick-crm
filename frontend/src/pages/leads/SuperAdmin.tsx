import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Award,
  CheckCircle,
  XCircle,
  CreditCard,
  Calendar,
  Layers,
  Settings,
  Eye,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  BarChart2,
  Building2,
} from 'lucide-react';

export default function SuperAdmin() {
  const { confirm, success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'stats') as 'stats' | 'earnings' | 'franchises' | 'workspaces' | 'users' | 'tutorials';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Data lists
  const [stats, setStats] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [franchiseModal, setFranchiseModal] = useState<{ show: boolean; mode: 'create' | 'edit'; data?: any }>({
    show: false,
    mode: 'create',
  });
  const [workspacePlanModal, setWorkspacePlanModal] = useState<{ show: boolean; workspace?: any }>({
    show: false,
  });
  const [userRoleModal, setUserRoleModal] = useState<{ show: boolean; user?: any }>({
    show: false,
  });
  const [selectedFranchiseDetails, setSelectedFranchiseDetails] = useState<any | null>(null);

  // Modal Form Inputs
  const [franchiseForm, setFranchiseForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    planName: 'Basic Reseller',
    planType: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    planPrice: 0,
    planExpiresAt: '',
    maxUsers: 10,
    isActive: true,
  });

  const [workspacePlanForm, setWorkspacePlanForm] = useState({
    planType: 'FREE' as 'FREE' | 'MONTHLY' | 'YEARLY',
    planPrice: 0,
    planExpiresAt: '',
  });

  const [userRoleForm, setUserRoleForm] = useState({
    role: 'USER' as 'SUPER_ADMIN' | 'FRANCHISE' | 'USER',
    isActive: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'stats') {
        const statsRes = await api.get('/api/admin/stats');
        setStats(statsRes);
      } else if (activeTab === 'earnings') {
        const earningsRes = await api.get('/api/admin/earnings');
        setEarnings(earningsRes);
      } else if (activeTab === 'franchises') {
        const franchisesRes = await api.get('/api/admin/franchises');
        setFranchises(franchisesRes);
      } else if (activeTab === 'workspaces') {
        const workspacesRes = await api.get('/api/admin/organizations');
        setWorkspaces(workspacesRes);
      } else if (activeTab === 'users') {
        const usersRes = await api.get('/api/admin/users');
        setSystemUsers(usersRes);
      }
    } catch (err: any) {
      error('Failed to load system data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSaveFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (franchiseModal.mode === 'create') {
        await api.post('/api/admin/franchises', franchiseForm);
        success('Franchise created successfully');
      } else {
        const { password, ...updatePayload } = franchiseForm;
        await api.put(`/api/admin/franchises/${franchiseModal.data.id}`, updatePayload);
        success('Franchise updated successfully');
      }
      setFranchiseModal({ show: false, mode: 'create' });
      fetchData();
    } catch (err: any) {
      error('Failed to save franchise', err.message);
    }
  };

  const handleDeleteFranchise = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Franchise',
      message: `Are you sure you want to delete the franchise "${name}"? This will detach all associated clients.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/admin/franchises/${id}`);
      success('Franchise deleted successfully');
      fetchData();
    } catch (err: any) {
      error('Failed to delete franchise', err.message);
    }
  };

  const handleSaveWorkspacePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspacePlanModal.workspace) return;
    try {
      await api.put(`/api/admin/organizations/${workspacePlanModal.workspace.id}/plan`, workspacePlanForm);
      success('Workspace plan updated successfully');
      setWorkspacePlanModal({ show: false });
      fetchData();
    } catch (err: any) {
      error('Failed to update plan', err.message);
    }
  };

  const handleSaveUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRoleModal.user) return;
    try {
      await api.put(`/api/admin/users/${userRoleModal.user.id}`, userRoleForm);
      success('User details updated successfully');
      setUserRoleModal({ show: false });
      fetchData();
    } catch (err: any) {
      error('Failed to update user', err.message);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    const ok = await confirm({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${email}" from the system?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/api/admin/users/${id}`);
      success('User deleted successfully');
      fetchData();
    } catch (err: any) {
      error('Failed to delete user', err.message);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Lifetime / Never';
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
            Super Admin Control Center
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            System-wide administration, franchise monitoring, plan assignments, and user management.
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
          { id: 'stats', label: 'Overview & Stats', icon: LayoutDashboard },
          { id: 'earnings', label: 'Earnings Reports', icon: TrendingUp },
          { id: 'franchises', label: 'Franchise Resellers', icon: Award },
          { id: 'workspaces', label: 'Client Workspaces', icon: Layers },
          { id: 'users', label: 'System Users', icon: Users },
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
                  { label: 'Reseller Franchises', value: stats.totalFranchises, icon: Award, color: '#F59E0B', bg: '#FEF3C7' },
                  { label: 'Client Workspaces', value: stats.totalWorkspaces, icon: Layers, color: '#0E6B50', bg: '#ECFDF5' },
                  { label: 'Active Contacts', value: stats.totalLeads, icon: Users, color: '#16A34A', bg: '#DCFCE7' },
                  { label: 'System User Logins', value: stats.totalUsers, icon: Settings, color: '#0EA5E9', bg: '#E0F2FE' },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={i}
                      className="card-elevated hover:-translate-y-1 transition-all duration-300"
                      style={{
                        padding: '24px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 16,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.02), 0 4px 6px -2px rgba(0, 0, 0, 0.01)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center justify-center rounded-xl"
                          style={{ width: 42, height: 42, background: kpi.bg }}
                        >
                          <Icon style={{ width: 20, height: 20, color: kpi.color }} />
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {kpi.value.toLocaleString()}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginTop: 8 }}>{kpi.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subscriptions Card */}
              <div className="card-elevated" style={{ padding: 24, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 20 }} className="flex items-center gap-2">
                  <CreditCard style={{ width: 18, height: 18, color: '#0E6B50' }} />
                  Workspace Subscriptions Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Free Tier', value: stats.plans.FREE, color: '#9CA3AF', desc: 'No monthly billing overhead' },
                    { label: 'Monthly Subscriptions', value: stats.plans.MONTHLY, color: '#0E6B50', desc: 'Active month-to-month contracts' },
                    { label: 'Yearly Plan Subscriptions', value: stats.plans.YEARLY, color: '#16A34A', desc: 'Annualized recurring revenue plans' },
                  ].map((plan, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between hover:bg-[#F1F5F9] transition-all duration-200">
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>{plan.label}</p>
                        <p style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>{plan.value}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{plan.desc}</p>
                      </div>
                      <div style={{ width: 10, height: 50, borderRadius: 5, background: plan.color }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EARNINGS REPORTS TAB */}
          {activeTab === 'earnings' && earnings && (
            <div className="space-y-6">

              {/* ── Summary Revenue Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tablet-2col">
                {[
                  {
                    label: 'Total Monthly Revenue',
                    value: `₹${earnings.summary.totalMonthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                    sub: 'All sources combined',
                    icon: IndianRupee,
                    color: '#0E6B50',
                    bg: '#ECFDF5',
                  },
                  {
                    label: 'Projected Annual Revenue',
                    value: `₹${earnings.summary.totalAnnualRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                    sub: 'At current rates',
                    icon: TrendingUp,
                    color: '#16A34A',
                    bg: '#F0FDF4',
                  },
                  {
                    label: 'Direct Client Revenue',
                    value: `₹${earnings.summary.directMonthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo`,
                    sub: `${earnings.summary.directClients} direct workspaces`,
                    icon: Building2,
                    color: '#0EA5E9',
                    bg: '#F0F9FF',
                  },
                  {
                    label: 'Franchise Revenue',
                    value: `₹${earnings.summary.franchiseMonthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo`,
                    sub: `${earnings.summary.totalActiveFranchises} active franchises`,
                    icon: Award,
                    color: '#F59E0B',
                    bg: '#FEF3C7',
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className="card-elevated hover:-translate-y-1 transition-all duration-300"
                      style={{
                        padding: '24px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 16,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.02), 0 4px 6px -2px rgba(0, 0, 0, 0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon style={{ width: 20, height: 20, color: card.color }} />
                        </div>
                        <ArrowUpRight style={{ width: 16, height: 16, color: '#94A3B8' }} />
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <p style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{card.value}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 8 }}>{card.label}</p>
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{card.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 tablet-1col">

                {/* ── Plan Type Breakdown ── */}
                <div className="card-elevated" style={{ padding: 24, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <BarChart2 style={{ width: 18, height: 18, color: '#0E6B50' }} />
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Revenue by Plan Type</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { key: 'FREE', label: 'Free Tier', color: '#9CA3AF', bg: '#F9FAFB' },
                      { key: 'MONTHLY', label: 'Monthly Plans', color: '#0E6B50', bg: '#ECFDF5' },
                      { key: 'YEARLY', label: 'Yearly Plans', color: '#16A34A', bg: '#F0FDF4' },
                    ].map(p => {
                      const data = earnings.planBreakdown[p.key];
                      const maxMonthly = Math.max(
                        earnings.planBreakdown.MONTHLY.monthlyRevenue,
                        earnings.planBreakdown.YEARLY.monthlyRevenue,
                        1
                      );
                      const pct = p.key === 'FREE' ? 0 : Math.round((data.monthlyRevenue / maxMonthly) * 100);
                      return (
                        <div key={p.key}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.label}</span>
                              <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>{data.count} workspaces</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                                ₹{data.monthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                              </p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>
                                ₹{data.annualRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/yr
                              </p>
                            </div>
                          </div>
                          <div style={{ height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Monthly Growth Trend ── */}
                <div className="card-elevated" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <TrendingUp style={{ width: 16, height: 16, color: '#0E6B50' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>New Workspace Signups (Last 12 Months)</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {earnings.monthlyGrowth.slice(-6).map((m: any) => {
                      const total = m.direct + m.franchise;
                      const maxTotal = Math.max(...earnings.monthlyGrowth.map((x: any) => x.direct + x.franchise), 1);
                      const pct = Math.round((total / maxTotal) * 100);
                      const [year, month] = m.month.split('-');
                      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                      return (
                        <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#6B7280', width: 52, flexShrink: 0 }}>{label}</span>
                          <div style={{ flex: 1, height: 22, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                              <div style={{ width: `${Math.round((m.direct / maxTotal) * 100)}%`, background: '#0E6B50', opacity: 0.85 }} />
                              <div style={{ width: `${Math.round((m.franchise / maxTotal) * 100)}%`, background: '#F59E0B', opacity: 0.85 }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, width: 80, flexShrink: 0, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 11, color: '#0E6B50', fontWeight: 600 }}>{m.direct}D</span>
                            <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>{m.franchise}F</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', width: 70, textAlign: 'right', flexShrink: 0 }}>
                            ₹{m.revenue.toFixed(0)}/mo
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0E6B50', display: 'inline-block' }} />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>D = Direct clients</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F59E0B', display: 'inline-block' }} />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>F = Franchise clients</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Per-Franchise Revenue Breakdown ── */}
              <div className="card-elevated" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <Award style={{ width: 16, height: 16, color: '#F59E0B' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Revenue by Franchise</h3>
                </div>
                {earnings.franchiseBreakdown.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No franchises registered yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: 12 }}>Franchise</th>
                          <th>Plan</th>
                          <th>Franchise Fee/mo</th>
                          <th>Client Workspaces</th>
                          <th>Client Revenue/mo</th>
                          <th>Total from Franchise</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.franchiseBreakdown.map((f: any) => (
                          <tr key={f.id}>
                            <td style={{ paddingLeft: 12, fontWeight: 600, color: '#111827', fontSize: 13 }}>{f.name}</td>
                            <td>
                              <span style={{ fontSize: 12, fontWeight: 500, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 5 }}>
                                {f.planType}
                              </span>
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 600, color: '#0E6B50' }}>
                              ₹{f.franchiseMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ fontSize: 13, color: '#374151' }}>{f.clientCount}</td>
                            <td style={{ fontSize: 13, color: '#374151' }}>
                              ₹{f.clientMonthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>
                              ₹{(f.franchiseMonthly + f.clientMonthlyRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                            </td>
                            <td>
                              {f.isActive
                                ? <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle style={{ width: 12, height: 12 }} />Active</span>
                                : <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><XCircle style={{ width: 12, height: 12 }} />Inactive</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Top Revenue Workspaces ── */}
              <div className="card-elevated" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <CreditCard style={{ width: 16, height: 16, color: '#16A34A' }} />
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Top 10 Revenue Workspaces</h3>
                </div>
                {earnings.topWorkspaces.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No paid workspaces yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: 12 }}>#</th>
                          <th>Workspace</th>
                          <th>Franchise</th>
                          <th>Plan</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.topWorkspaces.map((w: any, i: number) => (
                          <tr key={i}>
                            <td style={{ paddingLeft: 12, fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>#{i + 1}</td>
                            <td style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{w.name}</td>
                            <td style={{ fontSize: 13, color: '#6B7280' }}>{w.franchiseName || <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>Direct</span>}</td>
                            <td>
                              <span style={{
                                fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 5,
                                background: w.planType === 'MONTHLY' ? '#ECFDF5' : '#F0FDF4',
                                color: w.planType === 'MONTHLY' ? '#0E6B50' : '#16A34A',
                              }}>
                                {w.planType}
                              </span>
                            </td>
                            <td style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                              ₹{w.planPrice.toLocaleString('en-IN')}/
                              {w.planType === 'MONTHLY' ? 'mo' : 'yr'}
                            </td>
                            <td>
                              {w.isActive
                                ? <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>Active</span>
                                : <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>Inactive</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FRANCHISES TAB */}
          {activeTab === 'franchises' && (
            <div className="card-elevated" style={{ padding: 20 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>All Franchise Resellers</h3>
                <button
                  onClick={() => {
                    setFranchiseForm({
                      name: '',
                      email: '',
                      phone: '',
                      password: '',
                      planName: 'Standard Reseller',
                      planType: 'MONTHLY',
                      planPrice: 99,
                      planExpiresAt: '',
                      maxUsers: 10,
                      isActive: true,
                    });
                    setFranchiseModal({ show: true, mode: 'create' });
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Create Franchise
                </button>
              </div>

              {franchises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #E5E7EB', borderRadius: 8 }}>
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>No reseller franchises registered yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F3F4F6', fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th className="py-3 px-4">Franchise Name</th>
                        <th className="py-3 px-4">Account Login</th>
                        <th className="py-3 px-4">Subscription Plan</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Expires At</th>
                        <th className="py-3 px-4">Stats</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: 13, color: '#374151' }}>
                      {franchises.map((f) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #F9FAFB' }} className="hover:bg-[#FAFAFA]">
                          <td className="py-3 px-4 font-semibold text-[#111827]">
                            <span
                              onClick={() => setSelectedFranchiseDetails(f)}
                              className="text-[#0E6B50] cursor-pointer hover:underline"
                            >
                              {f.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div>{f.email}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{f.phone}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0E6B50]">
                            {f.planName}
                          </td>
                          <td className="py-3 px-4 font-medium">₹{f.planPrice}</td>
                          <td className="py-3 px-4 text-[#6B7280]">{formatDate(f.planExpiresAt)}</td>
                          <td className="py-3 px-4 text-[#6B7280]">
                            <span className="font-semibold text-[#111827]">
                              {f._count?.organizations || 0}
                            </span>
                            <span className="text-[#9CA3AF] mx-1">/</span>
                            <span>{f.maxUsers || 10}</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>workspaces</span>
                          </td>
                          <td className="py-3 px-4">
                            {f.isActive ? (
                              <span className="flex items-center gap-1 text-[#16A34A] font-medium" style={{ fontSize: 12 }}>
                                <CheckCircle style={{ width: 14, height: 14 }} /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[#EF4444] font-medium" style={{ fontSize: 12 }}>
                                <XCircle style={{ width: 14, height: 14 }} /> Blocked
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedFranchiseDetails(f)}
                                className="btn btn-ghost btn-icon"
                                title="View Provisioned Workspaces"
                              >
                                <Eye style={{ width: 14, height: 14, color: '#0E6B50' }} />
                              </button>
                              <button
                                onClick={() => {
                                  setFranchiseForm({
                                    name: f.name,
                                    email: f.email,
                                    phone: f.phone,
                                    password: '',
                                    planName: f.planName,
                                    planType: f.planType,
                                    planPrice: f.planPrice,
                                    planExpiresAt: f.planExpiresAt ? new Date(f.planExpiresAt).toISOString().split('T')[0] : '',
                                    maxUsers: f.maxUsers || 10,
                                    isActive: f.isActive,
                                  });
                                  setFranchiseModal({ show: true, mode: 'edit', data: f });
                                }}
                                className="btn btn-ghost btn-icon"
                                title="Edit Franchise"
                              >
                                <Edit2 style={{ width: 14, height: 14, color: '#4B5563' }} />
                              </button>
                              <button
                                onClick={() => handleDeleteFranchise(f.id, f.name)}
                                className="btn btn-ghost btn-icon"
                                title="Delete Franchise"
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

          {/* WORKSPACES TAB */}
          {activeTab === 'workspaces' && (
            <div className="card-elevated" style={{ padding: 20 }}>
              <div className="mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>System Workspaces / Client Accounts</h3>
              </div>

              {workspaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #E5E7EB', borderRadius: 8 }}>
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>No organizations registered in system.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F3F4F6', fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th className="py-3 px-4">User Name</th>
                        <th className="py-3 px-4">Business Owner</th>
                        <th className="py-3 px-4">Partner Franchise</th>
                        <th className="py-3 px-4">Plan Type</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Expires At</th>
                        <th className="py-3 px-4">Records</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: 13, color: '#374151' }}>
                      {workspaces.map((w) => (
                        <tr key={w.id} style={{ borderBottom: '1px solid #F9FAFB' }} className="hover:bg-[#FAFAFA]">
                          <td className="py-3 px-4 font-semibold text-[#111827]">{w.name}</td>
                          <td className="py-3 px-4">
                            <div>{w.ownerName}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{w.email} | {w.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            {w.franchise?.name ? (
                              <span className="badge badge-light" style={{ background: '#FEF3C7', color: '#B45309' }}>
                                {w.franchise.name}
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF] italic">Direct Registration</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="badge"
                              style={{
                                background: w.planType === 'FREE' ? '#F3F4F6' : w.planType === 'MONTHLY' ? '#ECFDF5' : '#E8F5E9',
                                color: w.planType === 'FREE' ? '#4B5563' : w.planType === 'MONTHLY' ? '#0E6B50' : '#2E7D32',
                                fontWeight: 600,
                              }}
                            >
                              {w.planType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">₹{w.planPrice}</td>
                          <td className="py-3 px-4 text-[#6B7280]">{formatDate(w.planExpiresAt)}</td>
                          <td className="py-3 px-4 text-[#6B7280]">
                            {w._count?.leads || 0} leads | {w._count?.users || 0} users
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setWorkspacePlanForm({
                                  planType: w.planType,
                                  planPrice: w.planPrice,
                                  planExpiresAt: w.planExpiresAt ? new Date(w.planExpiresAt).toISOString().split('T')[0] : '',
                                });
                                setWorkspacePlanModal({ show: true, workspace: w });
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ gap: 4 }}
                            >
                              <CreditCard style={{ width: 12, height: 12 }} />
                              Plan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SYSTEM USERS TAB */}
          {activeTab === 'users' && (
            <div className="card-elevated" style={{ padding: 20 }}>
              <div className="mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>System User Accounts</h3>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6', fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Associated Business</th>
                      <th className="py-3 px-4">Linked Franchise</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: 13, color: '#374151' }}>
                    {systemUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F9FAFB' }} className="hover:bg-[#FAFAFA]">
                        <td className="py-3 px-4 font-semibold text-[#111827]">{u.name}</td>
                        <td className="py-3 px-4">
                          <div>{u.email}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{u.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="badge"
                            style={{
                              background: u.role === 'SUPER_ADMIN' ? '#FEE2E2' : u.role === 'FRANCHISE' ? '#FEF3C7' : '#E0F2FE',
                              color: u.role === 'SUPER_ADMIN' ? '#EF4444' : u.role === 'FRANCHISE' ? '#D97706' : '#0284C7',
                              fontWeight: 600,
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {u.organization?.name || <span className="text-[#9CA3AF] italic">None (Admin Level)</span>}
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {u.franchise?.name || u.organization?.franchise?.name || <span className="text-[#9CA3AF] italic">-</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <span className="text-[#16A34A] font-medium flex items-center gap-1">
                              <CheckCircle style={{ width: 13, height: 13 }} /> Enabled
                            </span>
                          ) : (
                            <span className="text-[#EF4444] font-medium flex items-center gap-1">
                              <XCircle style={{ width: 13, height: 13 }} /> Disabled
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setUserRoleForm({
                                  role: u.role,
                                  isActive: u.isActive,
                                });
                                setUserRoleModal({ show: true, user: u });
                              }}
                              className="btn btn-ghost btn-icon"
                              title="Edit User"
                            >
                              <Edit2 style={{ width: 13, height: 13 }} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="btn btn-ghost btn-icon text-[#EF4444]"
                              title="Delete User"
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FRANCHISE MODAL (CREATE / EDIT) ── */}
      {franchiseModal.show && createPortal(
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card-elevated animate-scale-in" style={{ width: '90%', maxWidth: 500, padding: 24, background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              {franchiseModal.mode === 'create' ? 'Add New Franchise Reseller' : 'Update Franchise Details'}
            </h3>
            <form onSubmit={handleSaveFranchise} className="space-y-4">
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Franchise Name</label>
                <input
                  type="text"
                  required
                  value={franchiseForm.name}
                  onChange={(e) => setFranchiseForm({ ...franchiseForm, name: e.target.value })}
                  className="input-base"
                  placeholder="e.g. Acme Resellers"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email ID</label>
                  <input
                    type="email"
                    required
                    value={franchiseForm.email}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, email: e.target.value })}
                    className="input-base"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={franchiseForm.phone}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, phone: e.target.value })}
                    className="input-base"
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              {franchiseModal.mode === 'create' && (
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Owner Account Password</label>
                  <input
                    type="password"
                    required
                    value={franchiseForm.password}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, password: e.target.value })}
                    className="input-base"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              <hr style={{ border: 0, borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Plan Name</label>
                  <input
                    type="text"
                    required
                    value={franchiseForm.planName}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, planName: e.target.value })}
                    className="input-base"
                    placeholder="Standard Reseller"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Max Client Workspaces</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={franchiseForm.maxUsers}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, maxUsers: parseInt(e.target.value) || 0 })}
                    className="input-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Subscription Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={franchiseForm.planPrice}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, planPrice: parseFloat(e.target.value) || 0 })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Expires On</label>
                  <input
                    type="date"
                    value={franchiseForm.planExpiresAt}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, planExpiresAt: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>

              {franchiseModal.mode === 'edit' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="franchise-active"
                    checked={franchiseForm.isActive}
                    onChange={(e) => setFranchiseForm({ ...franchiseForm, isActive: e.target.checked })}
                    style={{ width: 15, height: 15 }}
                  />
                  <label htmlFor="franchise-active" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                    Reseller Account is Active & Allowed Logins
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3" style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setFranchiseModal({ show: false, mode: 'create' })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {franchiseModal.mode === 'create' ? 'Create Reseller' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── WORKSPACE PLAN MODAL ── */}
      {workspacePlanModal.show && workspacePlanModal.workspace && createPortal(
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card-elevated animate-scale-in" style={{ width: '90%', maxWidth: 420, padding: 24, background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              Update Workspace Subscription
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              Workspace: <strong style={{ color: '#111827' }}>{workspacePlanModal.workspace.name}</strong>
            </p>
            <form onSubmit={handleSaveWorkspacePlan} className="space-y-4">
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Plan Duration / Type</label>
                <select
                  value={workspacePlanForm.planType}
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
                    setWorkspacePlanForm({ ...workspacePlanForm, planType: type, planExpiresAt: expiry });
                  }}
                  className="select-base"
                >
                  <option value="FREE">FREE</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="YEARLY">YEARLY</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Pricing / Cost (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={workspacePlanForm.planPrice}
                  onChange={(e) => setWorkspacePlanForm({ ...workspacePlanForm, planPrice: parseFloat(e.target.value) || 0 })}
                  className="input-base"
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Expiration Date</label>
                <input
                  type="date"
                  value={workspacePlanForm.planExpiresAt}
                  onChange={(e) => setWorkspacePlanForm({ ...workspacePlanForm, planExpiresAt: e.target.value })}
                  className="input-base"
                />
              </div>

              <div className="flex items-center justify-end gap-3" style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setWorkspacePlanModal({ show: false })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Subscription Plan
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── USER ROLE / STATUS MODAL ── */}
      {userRoleModal.show && userRoleModal.user && createPortal(
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card-elevated animate-scale-in" style={{ width: '90%', maxWidth: 400, padding: 24, background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              Modify User Authorization
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              User Account: <strong style={{ color: '#111827' }}>{userRoleModal.user.email}</strong>
            </p>
            <form onSubmit={handleSaveUserRole} className="space-y-4">
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>System Role</label>
                <select
                  value={userRoleForm.role}
                  onChange={(e) => setUserRoleForm({ ...userRoleForm, role: e.target.value as any })}
                  className="select-base"
                >
                  <option value="USER">USER (Client Workspace User)</option>
                  <option value="FRANCHISE">FRANCHISE (Reseller Partner)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Admin)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={userRoleForm.isActive}
                  onChange={(e) => setUserRoleForm({ ...userRoleForm, isActive: e.target.checked })}
                  style={{ width: 15, height: 15 }}
                />
                <label htmlFor="user-active" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                  Account Enabled
                </label>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setUserRoleModal({ show: false })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── FRANCHISE DETAILS MODAL ── */}
      {selectedFranchiseDetails && createPortal(
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="card-elevated animate-scale-in" style={{ width: '95%', maxWidth: 800, padding: 24, background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-[#F3F4F6]">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  Franchise: {selectedFranchiseDetails.name}
                </h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {selectedFranchiseDetails.email} • {selectedFranchiseDetails.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedFranchiseDetails(null)}
                className="btn btn-secondary btn-sm align-self-start"
              >
                Close Details
              </button>
            </div>

            {/* Franchise Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-[#FAFAFA]" style={{ fontSize: 13 }}>
              <div>
                <div style={{ color: '#6B7280', marginBottom: 2 }}>Plan Name</div>
                <div style={{ fontWeight: 600, color: '#0E6B50' }}>{selectedFranchiseDetails.planName}</div>
              </div>
              <div>
                <div style={{ color: '#6B7280', marginBottom: 2 }}>Plan Value</div>
                <div style={{ fontWeight: 600 }}>₹{selectedFranchiseDetails.planPrice}</div>
              </div>
              <div>
                <div style={{ color: '#6B7280', marginBottom: 2 }}>Users Limit</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedFranchiseDetails.organizations?.length || 0} / {selectedFranchiseDetails.maxUsers || 10}
                </div>
              </div>
              <div>
                <div style={{ color: '#6B7280', marginBottom: 2 }}>Expires On</div>
                <div style={{ fontWeight: 600 }}>{formatDate(selectedFranchiseDetails.planExpiresAt)}</div>
              </div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
              Users Added By Franchise
            </h4>

            {(!selectedFranchiseDetails.organizations || selectedFranchiseDetails.organizations.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed #E5E7EB', borderRadius: 8 }}>
                <p style={{ color: '#9CA3AF', fontSize: 13 }}>This franchise has not provisioned any client workspaces yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">User Contact</th>
                      <th className="py-3 px-4">Plan Type</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Expires On</th>
                      <th className="py-3 px-4">Stats</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: 13 }}>
                    {selectedFranchiseDetails.organizations.map((org: any) => (
                      <tr key={org.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td className="py-3 px-4" style={{ fontWeight: 600, color: '#111827' }}>{org.name}</td>
                        <td className="py-3 px-4">
                          <div>{org.ownerName}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                            {org.email} • {org.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="badge"
                            style={{
                              background: org.planType === 'FREE' ? '#F3F4F6' : org.planType === 'MONTHLY' ? '#ECFDF5' : '#E8F5E9',
                              color: org.planType === 'FREE' ? '#4B5563' : org.planType === 'MONTHLY' ? '#0E6B50' : '#2E7D32',
                              fontWeight: 600,
                            }}
                          >
                            {org.planType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">₹{org.planPrice}</td>
                        <td className="py-3 px-4 text-[#6B7280]">{formatDate(org.planExpiresAt)}</td>
                        <td className="py-3 px-4 text-[#6B7280]">
                          {org._count?.leads || 0} leads | {org._count?.users || 0} users
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

