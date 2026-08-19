import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import TemplatePreview from '../../components/leads/TemplatePreview';
import MediaUrlUploader from '../../components/leads/MediaUrlUploader';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Play, Pause, Trash2, Copy, Plus, Loader2, Clock,
  ArrowRight, GitCommit, GitPullRequest, Edit2, X,
  CheckCircle, Zap, Tag, Sparkles, Layers3, ArrowUp, ArrowDown, Check,
  CheckSquare, Filter, Layers, SlidersHorizontal, RefreshCw
} from 'lucide-react';

// ── Top KPI Stat Card (Matching Dashboard KPI Style) ──────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }: {
  label: string; value: string | number; trend: string; isUp: boolean; period: string; strokeColor: string; Icon: any; iconBg: string; iconColor: string;
}) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 20 }, { v: 16 }, { v: 26 }, { v: 22 }, { v: 34 }, { v: 28 }, { v: 40 },
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
            {isUp ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-flow-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-flow-${label.replace(/\s+/g, '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function Flows() {
  const { success, error, warning, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [flows, setFlows] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingFlowId, setLoadingFlowId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');
  const [triggerType, setTriggerType] = useState<'STATUS_CHANGE' | 'TAG_ADDED'>('STATUS_CHANGE');
  const [triggerStatusId, setTriggerStatusId] = useState('');
  const [triggerTagId, setTriggerTagId] = useState('');
  const [isLooping, setIsLooping] = useState(false);
  const [steps, setSteps] = useState<any[]>([
    { templateId: '', delayValue: 1, delayUnit: 'DAYS', sendTime: null, variableMapping: {} }
  ]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      const [flowsRes, statusesRes, tagsRes, templatesRes] = await Promise.all([
        api.get('/api/flows'),
        api.get('/api/statuses'),
        api.get('/api/tags'),
        api.get('/api/templates?status=APPROVED'),
      ]);
      setFlows(Array.isArray(flowsRes) ? flowsRes : (flowsRes?.flows || flowsRes?.data || []));
      setStatuses(Array.isArray(statusesRes) ? statusesRes : (statusesRes?.statuses || statusesRes?.data || []));
      setTags(Array.isArray(tagsRes) ? tagsRes : (tagsRes?.tags || tagsRes?.data || []));
      setTemplates(Array.isArray(templatesRes) ? templatesRes : (templatesRes?.templates || templatesRes?.data || []));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const init = async () => { setLoading(true); await fetchData(); setLoading(false); };
    init();
  }, []);

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    setProgressText(currentlyActive ? 'Deactivating flow...' : 'Activating flow...');
    try {
      await run(`toggle-${id}`, async () => {
        const action = currentlyActive ? 'deactivate' : 'activate';
        await api.patch(`/api/flows/${id}/${action}`);
        await fetchData();
        success(currentlyActive ? 'Flow deactivated' : 'Flow activated');
      });
    } finally {
      setProgressText(null);
    }
  };

  const handleDuplicateFlow = async (id: string) => {
    setProgressText('Duplicating flow...');
    try {
      await run(`dup-${id}`, async () => {
        await api.post(`/api/flows/${id}/duplicate`);
        await fetchData();
        success('Flow duplicated');
      });
    } finally {
      setProgressText(null);
    }
  };

  const handleDeleteFlow = async (id: string) => {
    const ok = await confirm({ title: 'Delete Flow', message: 'Delete this flow? This is irreversible.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    setProgressText('Deleting flow...');
    try {
      await run(`del-${id}`, async () => {
        await api.delete(`/api/flows/${id}`);
        await fetchData();
        success('Flow deleted');
      });
    } finally {
      setProgressText(null);
    }
  };

  const handleEditFlowClick = async (id: string) => {
    setProgressText('Loading flow details...');
    setLoadingFlowId(id);
    try {
      const flow = await api.get(`/api/flows/${id}`);
      setEditingFlow(flow); setFlowName(flow.name); setFlowDesc(flow.description || '');
      setTriggerType(flow.triggerType || 'STATUS_CHANGE');
      setTriggerStatusId(flow.triggerStatusId || '');
      setTriggerTagId(flow.triggerTagId || '');
      setIsLooping(flow.isLooping || false);
      setSteps(flow.steps?.map((s: any) => ({
        templateId: s.templateId, delayValue: s.delayValue.toString(),
        delayUnit: s.delayUnit, sendTime: s.sendTime || null,
        variableMapping: s.variableMapping || {},
      })) || []);
      setShowAddModal(true);
    } catch (err: any) { error('Failed to load flow', err.message); }
    finally {
      setLoadingFlowId(null);
      setProgressText(null);
    }
  };

  const handleAddStep = () => {
    setSteps([...steps, { templateId: '', delayValue: 1, delayUnit: 'DAYS', sendTime: null, variableMapping: {} }]);
  };

  const handleRemoveStep = (index: number) => { setSteps(steps.filter((_, idx) => idx !== index)); };

  const handleStepChange = (index: number, field: string, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'templateId') {
      const tpl = (Array.isArray(templates) ? templates : []).find(t => t.id === value);
      const vars = tpl?.variablesJson || [];
      const mapping: Record<string, string> = {};
      vars.forEach((v: string) => { mapping[v] = 'Customer Name'; });
      if (tpl && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(tpl.headerType)) { mapping.headerMediaUrl = ''; }
      updated[index].variableMapping = mapping;
    }
    setSteps(updated);
  };

  const handleVariableChange = (stepIndex: number, varName: string, value: string) => {
    const updated = [...steps];
    updated[stepIndex].variableMapping = { ...updated[stepIndex].variableMapping, [varName]: value };
    setSteps(updated);
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (steps.some(s => !s.templateId)) { warning('Incomplete steps', 'Please select a template for all steps.'); return; }
    if (triggerType === 'STATUS_CHANGE' && !triggerStatusId) { warning('Trigger Required', 'Please select a trigger status.'); return; }
    if (triggerType === 'TAG_ADDED' && !triggerTagId) { warning('Trigger Required', 'Please select a trigger tag.'); return; }

    setProgressText(editingFlow ? 'Updating flow...' : 'Creating flow...');
    setSaving(true);
    try {
      const payload = {
        name: flowName, description: flowDesc, triggerType,
        triggerStatusId: triggerType === 'STATUS_CHANGE' ? triggerStatusId : null,
        triggerTagId: triggerType === 'TAG_ADDED' ? triggerTagId : null,
        isLooping,
        stopStatusIds: [],
        steps: steps.map((s, idx) => ({
          templateId: s.templateId, stepOrder: idx + 1,
          delayValue: parseInt(s.delayValue) || 0, delayUnit: s.delayUnit,
          sendTime: s.sendTime || null, variableMapping: s.variableMapping,
        })),
      };
      if (editingFlow) { await api.put(`/api/flows/${editingFlow.id}`, payload); }
      else { await api.post('/api/flows', payload); }
      setShowAddModal(false); setEditingFlow(null); setFlowName(''); setFlowDesc('');
      setTriggerType('STATUS_CHANGE'); setTriggerStatusId(''); setTriggerTagId(''); setIsLooping(false);
      setSteps([{ templateId: '', delayValue: 1, delayUnit: 'DAYS', sendTime: null, variableMapping: {} }]);
      fetchData();
      success(editingFlow ? 'Flow updated!' : 'Flow created!');
    } catch (err: any) { error('Failed to save flow', err.message); }
    finally {
      setSaving(false);
      setProgressText(null);
    }
  };

  const safeFlows = Array.isArray(flows) ? flows : [];
  const safeStatuses = Array.isArray(statuses) ? statuses : [];
  const safeTags = Array.isArray(tags) ? tags : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];

  const filteredFlows = activeFilter === 'ALL' ? safeFlows : safeFlows.filter(f => f.triggerStatusId === activeFilter);
  const activeFlowsCount = safeFlows.filter(f => f.isActive).length;
  const totalStepsCount = safeFlows.reduce((acc, f) => acc + (f.steps?.length || 0), 0);

  const SYSTEM_FIELDS = ['Customer Name', 'Customer Phone', 'Customer Email', 'Product or Service'];

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            WhatsApp Drips & Automations <Sparkles size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-send multi-step WhatsApp drip campaigns triggered by lead status changes or tag additions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setEditingFlow(null); setFlowName(''); setFlowDesc('');
              setTriggerType('STATUS_CHANGE'); setTriggerStatusId(''); setTriggerTagId(''); setIsLooping(false);
              setSteps([{ templateId: '', delayValue: 1, delayUnit: 'DAYS', sendTime: null, variableMapping: {} }]);
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create Automations</span>
          </button>
          <button
            onClick={fetchData}
            title="Refresh Flows"
            className="p-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-amber-500" : ""} />
          </button>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Total Automation Flows" value={safeFlows.length} trend="12.5%" isUp period="last month" strokeColor="#06B6D4" Icon={GitPullRequest} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Active Drips Running" value={activeFlowsCount} trend="18.2%" isUp period="last month" strokeColor="#10B981" Icon={Zap} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Status & Tag Triggers" value={safeStatuses.length + safeTags.length} trend="8.4%" isUp period="last month" strokeColor="#EAB308" Icon={Tag} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="Configured Drip Steps" value={totalStepsCount} trend="15.0%" isUp period="last month" strokeColor="#8B5CF6" Icon={Layers3} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between gap-3 shadow-2xs flex-wrap">
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap ${activeFilter === 'ALL'
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            All Automations ({safeFlows.length})
          </button>
          {safeStatuses.map(st => {
            const count = safeFlows.filter(f => f.triggerStatusId === st.id).length;
            if (count === 0) return null;
            return (
              <button
                key={st.id}
                onClick={() => setActiveFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeFilter === st.id
                    ? "bg-amber-500 text-slate-950 shadow-xs font-extrabold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                {st.name} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 font-semibold truncate">
          Showing {filteredFlows.length} automation flows
        </p>
      </div>

      {/* ── Drip Flows Grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Automation Flows...</p>
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <GitPullRequest size={28} />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Drip Flows Configured</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            Create multi-step WhatsApp message drip automations to follow up with leads automatically.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Build First Automations</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFlows.map((flow) => {
            const isEditingThis = loadingFlowId === flow.id;
            return (
              <div
                key={flow.id}
                className={`bg-white dark:bg-[#111C24] rounded-2xl border transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between overflow-hidden ${flow.isActive ? "border-slate-200/80 dark:border-slate-800" : "border-slate-200/50 dark:border-slate-800/60 opacity-80"
                  }`}
              >
                {/* Flow Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${flow.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{flow.name}</h3>
                      {flow.triggerStatus ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          ⚡ Status: {flow.triggerStatus.name}
                        </span>
                      ) : flow.triggerTag ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          🏷️ Tag: {flow.triggerTag.name}
                        </span>
                      ) : null}
                    </div>
                    {flow.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{flow.description}</p>
                    )}
                  </div>

                  {/* Active Toggle Switch */}
                  <button
                    onClick={() => handleToggleActive(flow.id, flow.isActive)}
                    disabled={isLoading(`toggle-${flow.id}`)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${flow.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${flow.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Flow Sequence Nodes */}
                <div className="p-4 space-y-2.5 flex-1 bg-white dark:bg-[#111C24]">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    <span>Drip Sequence Pipeline ({flow.steps?.length || 0} Steps)</span>
                    {flow.isLooping && <span className="text-amber-500 font-bold">🔁 Infinite Loop</span>}
                  </div>
                  <div className="space-y-2">
                    {flow.steps?.map((step: any, sIdx: number) => {
                      const tpl = templates.find(t => t.id === step.templateId);
                      return (
                        <div key={sIdx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                            #{sIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 dark:text-slate-200 font-bold truncate">
                              {tpl?.name || `Template ID: ${step.templateId.slice(0, 8)}...`}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                              <Clock size={10} className="text-slate-400" />
                              <span>After {step.delayValue} {step.delayUnit?.toLowerCase()} {step.sendTime ? `at ${step.sendTime}` : ''}</span>
                            </div>
                          </div>
                          <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                            WhatsApp
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Flow Footer Action Toolbar */}
                <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Created {new Date(flow.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditFlowClick(flow.id)}
                      disabled={isEditingThis}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Flow"
                    >
                      {isEditingThis ? <Loader2 size={14} className="animate-spin text-amber-500" /> : <Edit2 size={14} />}
                    </button>
                    <button
                      onClick={() => handleDuplicateFlow(flow.id)}
                      disabled={isLoading(`dup-${flow.id}`)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Duplicate Flow"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteFlow(flow.id)}
                      disabled={isLoading(`del-${flow.id}`)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Flow"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Drip Flow Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <GitPullRequest size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {editingFlow ? 'Edit Drip Flow' : 'Create New Drip Flow'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Automate WhatsApp drip messages</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCreateFlow} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Automation Name</label>
                  <input
                    type="text"
                    required
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="e.g. New Lead Onboarding Sequence"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    value={flowDesc}
                    onChange={(e) => setFlowDesc(e.target.value)}
                    placeholder="e.g. 3-step drip campaign"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Trigger Options */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <p className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Trigger Rule</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriggerType('STATUS_CHANGE')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border text-center ${triggerType === 'STATUS_CHANGE'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    ⚡ Status Change
                  </button>
                </div>

                {triggerType === 'STATUS_CHANGE' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Trigger Status</label>
                    <select
                      value={triggerStatusId}
                      onChange={(e) => setTriggerStatusId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="">-- Choose Status --</option>
                      {safeStatuses.map((st) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Trigger Tag</label>
                    <select
                      value={triggerTagId}
                      onChange={(e) => setTriggerTagId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="">-- Choose Tag --</option>
                      {safeTags.map((tg) => (
                        <option key={tg.id} value={tg.id}>{tg.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Steps Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Sequence Steps ({steps.length})</p>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} strokeWidth={2.5} /> Add Step
                  </button>
                </div>

                {steps.map((step, idx) => {
                  const selectedTpl = safeTemplates.find((t) => t.id === step.templateId);
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <span className="text-xs font-extrabold text-amber-500">Step #{idx + 1}</span>
                        {steps.length > 1 && (
                          <button type="button" onClick={() => handleRemoveStep(idx)} className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1">
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Template</label>
                          <select
                            value={step.templateId}
                            onChange={(e) => handleStepChange(idx, 'templateId', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                          >
                            <option value="">-- Select Template --</option>
                            {safeTemplates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delay</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={step.delayValue}
                              onChange={(e) => handleStepChange(idx, 'delayValue', e.target.value)}
                              className="w-16 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center"
                            />
                            <select
                              value={step.delayUnit}
                              onChange={(e) => handleStepChange(idx, 'delayUnit', e.target.value)}
                              className="flex-1 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                            >
                              <option value="MINUTES">Mins</option>
                              <option value="HOURS">Hours</option>
                              <option value="DAYS">Days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Variable Mapping */}
                      {selectedTpl && (selectedTpl.variablesJson?.length > 0 || ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTpl.headerType)) && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variables Mapping</p>
                          {selectedTpl.variablesJson?.map((v: string) => (
                            <div key={v} className="flex items-center justify-between text-xs gap-2">
                              <span className="font-mono text-[11px] text-amber-500 font-bold flex-shrink-0">{`{{${v}}}`}</span>
                              <select
                                value={step.variableMapping?.[v] || ''}
                                onChange={(e) => handleVariableChange(idx, v, e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex-1"
                              >
                                {SYSTEM_FIELDS.map((f) => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-950" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>{editingFlow ? 'Update Automations' : 'Save Automations'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
