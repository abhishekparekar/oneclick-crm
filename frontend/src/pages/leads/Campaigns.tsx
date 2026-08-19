import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import TemplatePreview from '../../components/leads/TemplatePreview';
import MediaUrlUploader from '../../components/leads/MediaUrlUploader';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Megaphone, Calendar, Trash2, Send, Plus, Loader2,
  RefreshCw, Users, FileText, X, CheckCircle, Clock,
  XCircle, AlertCircle, Sparkles, ArrowUp, ArrowDown, Zap,
  Layers, Check
} from 'lucide-react';

type TabId = 'campaigns' | 'templates';

// ── Top KPI Stat Card (Matching Dashboard KPI Style) ──────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }: {
  label: string; value: string | number; trend: string; isUp: boolean; period: string; strokeColor: string; Icon: any; iconBg: string; iconColor: string;
}) => {
  const sparkData = useMemo(() => [
    { v: 14 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 24 }, { v: 36 }, { v: 30 }, { v: 42 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`inline-flex items-center font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={2.5}/> : <ArrowDown size={10} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-camp-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-camp-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Completed' },
    SCHEDULED: { bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', label: 'Scheduled' },
    PROCESSING: { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Processing' },
    DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', label: 'Draft' },
    CANCELLED: { bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800', label: 'Cancelled' },
  };
  const s = map[status] || map['DRAFT'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const parseVariables = (vJson: any): string[] => {
  if (!vJson) return [];
  if (Array.isArray(vJson)) return vJson;
  if (typeof vJson === 'string') {
    try {
      const parsed = JSON.parse(vJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
};

export default function Campaigns() {
  const { success, error, warning, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [activeTab, setActiveTab] = useState<TabId>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [optInCounts, setOptInCounts] = useState<{ total: number; byStatus: Record<string, number> }>({ total: 0, byStatus: {} });

  const [loading, setLoading] = useState(true);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [audienceType, setAudienceType] = useState<'ALL' | 'STATUS' | 'DATE_RANGE'>('ALL');
  const [statusFilterId, setStatusFilterId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [varMapping, setVarMapping] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState('');

  const fetchData = async () => {
    try {
      const [campsRes, templatesRes, statusesRes, optInRes] = await Promise.allSettled([
        api.get('/api/campaigns'),
        api.get('/api/templates'),
        api.get('/api/statuses'),
        api.get('/api/leads/opt-in-counts'),
      ]);
      const extractArray = (res: any, key: string) => {
        if (res.status !== 'fulfilled') return [];
        const val = res.value;
        return Array.isArray(val) ? val : (val?.[key] || val?.data || []);
      };

      setCampaigns(extractArray(campsRes, 'campaigns'));
      setTemplates(extractArray(templatesRes, 'templates'));
      setStatuses(extractArray(statusesRes, 'statuses'));
      setOptInCounts(optInRes.status === 'fulfilled' ? optInRes.value || { total: 0, byStatus: {} } : { total: 0, byStatus: {} });
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, []);

  const handleSyncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await api.post('/api/whatsapp/sync-templates');
      success('Templates synchronized', res?.message || 'Templates synced successfully');
      fetchData();
    } catch (err: any) {
      error('Sync failed', err.message);
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleVariableChange = (varName: string, value: string) => {
    setVarMapping({ ...varMapping, [varName]: value });
  };

  const handleScheduleCampaign = async (id: string) => {
    const ok = await confirm({ title: 'Schedule Campaign', message: 'Schedule this campaign? Messages will queue for delivery.', confirmLabel: 'Schedule' });
    if (!ok) return;
    await run(`schedule-${id}`, async () => {
      const res = await api.post(`/api/campaigns/${id}/schedule`);
      success('Campaign scheduled', res?.message);
      await fetchData();
    });
  };

  const handleCancelCampaign = async (id: string) => {
    const ok = await confirm({ title: 'Cancel Campaign', message: 'Cancel this scheduled campaign? Pending messages will be cancelled.', confirmLabel: 'Cancel Campaign', danger: true });
    if (!ok) return;
    await run(`cancel-${id}`, async () => {
      await api.post(`/api/campaigns/${id}/cancel`);
      success('Campaign cancelled');
      await fetchData();
    });
  };

  const handleDeleteCampaign = async (id: string) => {
    const ok = await confirm({ title: 'Delete Campaign', message: 'Delete this campaign? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await run(`del-${id}`, async () => {
      await api.delete(`/api/campaigns/${id}`);
      success('Campaign deleted');
      await fetchData();
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      warning('Template required', 'Please select a template.');
      return;
    }
    if (!scheduledAt) {
      warning('Schedule Required', 'Please choose a date and time.');
      return;
    }
    const scheduledDateObj = new Date(scheduledAt);
    if (isNaN(scheduledDateObj.getTime())) {
      warning('Invalid Date', 'Please enter a valid schedule date.');
      return;
    }
    setSavingCampaign(true);
    try {
      const audienceFilter: any = {};
      if (audienceType === 'STATUS') audienceFilter.statusId = statusFilterId;
      if (audienceType === 'DATE_RANGE') {
        audienceFilter.startDate = startDate;
        audienceFilter.endDate = endDate;
      }
      const payload = {
        name: campName, description: campDesc, templateId: selectedTemplateId,
        audienceType, audienceFilter, variableMapping: varMapping,
        scheduledAt: scheduledDateObj.toISOString(),
      };
      const res = await api.post('/api/campaigns', payload);
      setShowAddModal(false);
      setCampName(''); setCampDesc(''); setSelectedTemplateId('');
      setAudienceType('ALL'); setStatusFilterId('');
      setStartDate(''); setEndDate(''); setVarMapping({}); setScheduledAt('');
      try {
        const schedRes = await api.post(`/api/campaigns/${res.id}/schedule`);
        success('Campaign deployed!', schedRes?.message);
        fetchData();
      } catch (schedErr: any) {
        error('Scheduling failed', schedErr.message);
        fetchData();
      }
    } catch (err: any) {
      error('Failed to create campaign', err.message);
    } finally {
      setSavingCampaign(false);
    }
  };

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeStatuses = Array.isArray(statuses) ? statuses : [];

  const selectedTpl = safeTemplates.find(t => t.id === selectedTemplateId);
  const approvedCount = safeTemplates.filter(t => t.status === 'APPROVED').length;
  const scheduledCount = safeCampaigns.filter(c => c.status === 'SCHEDULED').length;
  const totalSentCount = safeCampaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            WhatsApp Campaigns <Megaphone size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Send targeted bulk WhatsApp messages to lead segments using approved Meta templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'templates' && (
            <button
              onClick={handleSyncTemplates}
              disabled={syncingTemplates}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <RefreshCw size={14} className={syncingTemplates ? 'animate-spin text-amber-500' : ''} />
              <span>{syncingTemplates ? 'Syncing...' : 'Sync Meta Templates'}</span>
            </button>
          )}
          {activeTab === 'campaigns' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Campaign</span>
            </button>
          )}
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-amber-500" : ""} />
          </button>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Total Broadcast Campaigns" value={safeCampaigns.length} trend="14.2%" isUp period="last month" strokeColor="#8B5CF6" Icon={Megaphone} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Scheduled Broadcasts" value={scheduledCount} trend="22.0%" isUp period="last month" strokeColor="#06B6D4" Icon={Clock} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Total Messages Delivered" value={totalSentCount} trend="18.5%" isUp period="last month" strokeColor="#10B981" Icon={Send} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Opt-in Contacts Audience" value={optInCounts.total} trend="9.6%" isUp period="last month" strokeColor="#EAB308" Icon={Users} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'campaigns'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone size={14} />
          <span>Campaigns ({safeCampaigns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'templates'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={14} />
          <span>Meta WhatsApp Templates ({approvedCount} Approved)</span>
        </button>
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Campaigns & Templates...</p>
        </div>
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
              {campaigns.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                    <Megaphone size={28} />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Broadcast Campaigns Yet</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                    Launch a bulk WhatsApp message campaign to reach out to opt-in lead segments.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Create First Campaign</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-5 py-3">Campaign</th>
                        <th className="px-5 py-3">Template</th>
                        <th className="px-5 py-3">Scheduled At</th>
                        <th className="px-5 py-3">Target Audience</th>
                        <th className="px-5 py-3">Delivery Progress</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{camp.name}</p>
                            {camp.description && (
                              <p className="text-[11px] font-medium text-slate-400 truncate max-w-xs mt-0.5">{camp.description}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {camp.template?.name || <span className="text-slate-400 font-normal">Template Removed</span>}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(camp.scheduledAt).toLocaleString('en-IN', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              {camp.audienceType === 'ALL' ? 'All Contacts' : camp.audienceType === 'STATUS' ? 'By Status Stage' : 'Date Range'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            {camp.totalRecipients > 0 ? (
                              <span>{camp.sentCount} <span className="text-slate-400 font-normal">/ {camp.totalRecipients}</span></span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <CampaignStatusBadge status={camp.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {camp.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => handleCancelCampaign(camp.id)}
                                  disabled={isLoading(`cancel-${camp.id}`)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                >
                                  {isLoading(`cancel-${camp.id}`) ? <Loader2 size={13} className="animate-spin text-rose-500" /> : 'Cancel'}
                                </button>
                              )}
                              {camp.status !== 'PROCESSING' && (
                                <button
                                  onClick={() => handleDeleteCampaign(camp.id)}
                                  disabled={isLoading(`del-${camp.id}`)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                  title="Delete Campaign"
                                >
                                  {isLoading(`del-${camp.id}`) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              )}
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

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                    <FileText size={28} />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Meta Templates Synced</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                    Synchronize message templates approved by Meta to start sending broadcast messages.
                  </p>
                  <button
                    onClick={handleSyncTemplates}
                    disabled={syncingTemplates}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
                  >
                    <RefreshCw size={14} className={syncingTemplates ? "animate-spin text-slate-950" : ""} />
                    <span>Sync Meta Templates</span>
                  </button>
                </div>
              ) : (
                templates.map((tpl) => {
                  const isApproved = tpl.status === 'APPROVED';
                  return (
                    <div key={tpl.id} className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{tpl.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isApproved ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"}`}>
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {tpl.category}
                          </span>
                          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {tpl.language}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 line-clamp-3 leading-relaxed font-medium">
                          {tpl.bodyText}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <span>{parseVariables(tpl.variablesJson).length} variables</span>
                        {tpl.headerType && <span>{tpl.headerType} header</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create Campaign Modal ── */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">New Broadcast Campaign</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Configure target audience and dynamic parameters</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCampaign} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Campaign Name *</label>
                    <input
                      type="text" required
                      value={campName} onChange={(e) => setCampName(e.target.value)}
                      placeholder="e.g. Festival Offer Broadcast"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">WhatsApp Template *</label>
                    <select
                      required
                      value={selectedTemplateId}
                      onChange={(e) => { setSelectedTemplateId(e.target.value); setVarMapping({}); }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Approved Meta Template --</option>
                      {safeTemplates.filter(t => t.status === 'APPROVED').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Scheduled Date & Time *</label>
                    <input
                      type="datetime-local" required
                      value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Target Audience Segment</label>
                    <select
                      value={audienceType}
                      onChange={(e) => setAudienceType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="ALL">All Opt-in Contacts ({optInCounts.total})</option>
                      <option value="STATUS">Contacts by Status Stage</option>
                      <option value="DATE_RANGE">Registered in Date Range</option>
                    </select>
                  </div>
                </div>

                {/* Status Segment Filter */}
                {audienceType === 'STATUS' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Select Lead Status Stage</label>
                    <select
                      required
                      value={statusFilterId}
                      onChange={(e) => setStatusFilterId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose Status --</option>
                      {safeStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({optInCounts.byStatus[s.id] || 0} contacts)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Variable Mappings */}
                {parseVariables(selectedTpl?.variablesJson).length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Template Dynamic Variables</p>
                    {parseVariables(selectedTpl.variablesJson).map((vNum: string) => (
                      <div key={vNum} className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-amber-500 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                          {`{{${vNum}}}`}
                        </span>
                        <input
                          type="text" required
                          placeholder={`Enter value for dynamic parameter ${vNum}`}
                          value={varMapping[vNum] || ''}
                          onChange={(e) => handleVariableChange(vNum, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-end space-x-2.5 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCampaign}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {savingCampaign ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-950" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} strokeWidth={2.5} />
                      <span>⚡Run</span>
                    </>
                  )}
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
