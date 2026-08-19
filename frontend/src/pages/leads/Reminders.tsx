import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import MediaUrlUploader from '../../components/leads/MediaUrlUploader';
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Bell, Plus, Trash2, Edit2, X, Loader2, Search,
  Calendar, Clock, ToggleLeft, ToggleRight, ChevronDown,
  ChevronUp, AlertCircle, CheckCircle, RefreshCw, ArrowRight, Zap,
  Sparkles, ArrowUp, ArrowDown, Check, User
} from 'lucide-react';

const REPEAT_LABELS: Record<string, string> = { NONE: 'One-time', MONTHLY: 'Monthly', YEARLY: 'Yearly' };

// ── Top KPI Stat Card (Matching Dashboard KPI Style) ──────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }: {
  label: string; value: string | number; trend: string; isUp: boolean; period: string; strokeColor: string; Icon: any; iconBg: string; iconColor: string;
}) => {
  const sparkData = useMemo(() => [
    { v: 10 }, { v: 18 }, { v: 14 }, { v: 24 }, { v: 20 }, { v: 32 }, { v: 26 }, { v: 38 },
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
              <linearGradient id={`sk-rem-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-rem-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function Reminders() {
  const { success, error, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [reminders, setReminders] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);

  // Form state
  const [statuses, setStatuses] = useState<any[]>([]);
  const [reminderType, setReminderType] = useState<'SINGLE' | 'STATUS'>('SINGLE');
  const [targetStatusId, setTargetStatusId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [repeatType, setRepeatType] = useState<'NONE' | 'MONTHLY' | 'YEARLY'>('NONE');
  const [notes, setNotes] = useState('');
  const [rules, setRules] = useState<any[]>([
    { templateId: '', offsetDays: 3, offsetDirection: 'BEFORE', sendTime: '10:00 AM', variableMapping: {} },
  ]);

  const fetchData = async () => {
    try {
      const [remRes, leadsRes, tplRes, statusRes] = await Promise.all([
        api.get('/api/reminders'),
        api.get('/api/leads?limit=500'),
        api.get('/api/templates?status=APPROVED'),
        api.get('/api/statuses'),
      ]);
      setReminders(Array.isArray(remRes) ? remRes : (remRes?.reminders || remRes?.data || []));
      setLeads(Array.isArray(leadsRes?.data) ? leadsRes.data : (Array.isArray(leadsRes) ? leadsRes : []));
      setTemplates(Array.isArray(tplRes) ? tplRes : (tplRes?.templates || tplRes?.data || []));
      setStatuses(Array.isArray(statusRes) ? statusRes : (statusRes?.statuses || statusRes?.data || []));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => { setLoading(true); await fetchData(); setLoading(false); };
    init();
  }, []);

  const resetForm = () => {
    setLeadId(''); setServiceName(''); setServiceDate('');
    setRepeatType('NONE'); setNotes('');
    const todayStr = new Date().toISOString().split('T')[0];
    setRules([{ templateId: '', offsetDays: 3, offsetDirection: 'BEFORE', sendTime: '10:00 AM', ruleDate: todayStr, variableMapping: {} }]);
    setEditingReminder(null);
    setReminderType('SINGLE'); setTargetStatusId('');
  };

  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    try {
      const res = await api.post('/api/reminders/run-scheduler');
      success('Scheduler executed!', res.message);
      fetchData();
    } catch (err: any) { error('Scheduler failed', err.message); }
    finally { setRunningScheduler(false); }
  };

  const openEdit = (r: any) => {
    setEditingReminder(r);
    setLeadId(r.leadId || '');
    setTargetStatusId(r.targetStatusId || '');
    const isStatus = !!r.targetStatusId;
    setReminderType(isStatus ? 'STATUS' : 'SINGLE');
    setServiceName(r.serviceName);
    setServiceDate(r.serviceDate ? new Date(r.serviceDate).toISOString().split('T')[0] : '');
    setRepeatType(r.repeatType);
    setNotes(r.notes || '');
    setRules((Array.isArray(r.rules) ? r.rules : []).map((ru: any) => {
      let ruleDate = '';
      if (isStatus && r.serviceDate) {
        const base = new Date(r.serviceDate);
        if (ru.offsetDirection === 'AFTER') {
          base.setDate(base.getDate() + ru.offsetDays);
        } else {
          base.setDate(base.getDate() - ru.offsetDays);
        }
        ruleDate = base.toISOString().split('T')[0];
      } else {
        ruleDate = new Date().toISOString().split('T')[0];
      }
      return {
        templateId: ru.templateId,
        offsetDays: ru.offsetDays,
        offsetDirection: ru.offsetDirection,
        sendTime: ru.sendTime,
        ruleDate,
        variableMapping: ru.variableMapping || {},
      };
    }));
    setShowDrawer(true);
  };

  const addRule = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setRules([...rules, { templateId: '', offsetDays: 1, offsetDirection: 'BEFORE', sendTime: '10:00 AM', ruleDate: todayStr, variableMapping: {} }]);
  };
  const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: string, value: any) => {
    const updated = [...rules];
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'templateId') {
      const tpl = (Array.isArray(templates) ? templates : []).find((t: any) => t.id === value);
      const vars = tpl?.variablesJson || [];
      const mapping: Record<string, string> = {};
      vars.forEach((v: string) => { mapping[v] = 'Customer Name'; });
      if (tpl && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(tpl.headerType)) {
        mapping.headerMediaUrl = '';
      }
      updated[i].variableMapping = mapping;
    }
    setRules(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reminderType === 'SINGLE' && !leadId) { error('Contact required', 'Please select a contact.'); return; }
    if (reminderType === 'STATUS' && !targetStatusId) { error('Status stage required', 'Please select a status stage.'); return; }
    if (rules.some(r => !r.templateId)) { error('Template required', 'Please select a template for every rule.'); return; }
    setSaving(true);
    try {
      let baseDateStr = '';
      let formattedRules = [];

      if (reminderType === 'STATUS') {
        const dates = rules.map(r => new Date(r.ruleDate).getTime());
        const minTime = Math.min(...dates);
        const baseDate = new Date(minTime);
        baseDateStr = baseDate.toISOString();

        formattedRules = rules.map(r => {
          const rDate = new Date(r.ruleDate);
          const diffDays = Math.round((rDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            templateId: r.templateId,
            offsetDays: Math.abs(diffDays),
            offsetDirection: diffDays >= 0 ? 'AFTER' : 'BEFORE',
            sendTime: r.sendTime,
            variableMapping: r.variableMapping,
          };
        });
      } else {
        baseDateStr = new Date(serviceDate).toISOString();
        formattedRules = rules.map(r => ({
          templateId: r.templateId,
          offsetDays: Number(r.offsetDays),
          offsetDirection: r.offsetDirection,
          sendTime: r.sendTime,
          variableMapping: r.variableMapping,
        }));
      }

      const payload = {
        leadId: reminderType === 'SINGLE' ? leadId : null,
        targetStatusId: reminderType === 'STATUS' ? targetStatusId : null,
        serviceName,
        serviceDate: baseDateStr,
        repeatType,
        notes: (reminderType === 'SINGLE' && notes) ? notes : undefined,
        rules: formattedRules,
      };

      if (editingReminder) {
        await api.put(`/api/reminders/${editingReminder.id}`, payload);
        success('Reminder updated!');
      } else {
        await api.post('/api/reminders', payload);
        success('Reminder created!');
      }
      setShowDrawer(false); resetForm(); fetchData();
    } catch (err: any) { error('Failed to save', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({ title: 'Delete Reminder', message: `Delete "${name}"? Pending reminder messages will not be cancelled.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await run(`del-${id}`, async () => {
      await api.delete(`/api/reminders/${id}`);
      success('Reminder deleted');
      await fetchData();
    });
  };

  const handleToggle = async (id: string) => {
    await run(`toggle-${id}`, async () => {
      const res = await api.patch(`/api/reminders/${id}/toggle`);
      success(res.isActive ? 'Reminder activated' : 'Reminder deactivated');
      await fetchData();
    });
  };

  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeStatuses = Array.isArray(statuses) ? statuses : [];

  const filtered = safeReminders.filter(r => {
    const term = search.toLowerCase();
    const matchesLead = r.lead?.name?.toLowerCase().includes(term) || false;
    const matchesStatus = r.targetStatus?.name?.toLowerCase().includes(term) || false;
    const matchesService = r.serviceName?.toLowerCase().includes(term) || false;
    return matchesLead || matchesStatus || matchesService;
  });

  const activeCount = safeReminders.filter(r => r.isActive).length;
  const totalRulesCount = safeReminders.reduce((acc, r) => acc + (r.rules?.length || 0), 0);

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Service Reminders <Bell size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Automated WhatsApp reminders triggered before or after service, warranty, or renewal dates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            title="Run Reminder Scheduler"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-xs shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <RefreshCw size={14} className={runningScheduler ? "animate-spin text-amber-500" : ""} />
            <span>{runningScheduler ? 'Executing...' : 'Run Scheduler Now'}</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowDrawer(true); }}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Reminder Rule</span>
          </button>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Total Reminders" value={safeReminders.length} trend="10.5%" isUp period="last month" strokeColor="#EAB308" Icon={Bell} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="Active Schedulers" value={activeCount} trend="14.8%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Configured Rules" value={totalRulesCount} trend="19.2%" isUp period="last month" strokeColor="#06B6D4" Icon={Zap} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Reminders Sent" value={safeReminders.length * 3} trend="8.4%" isUp period="last month" strokeColor="#8B5CF6" Icon={Clock} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between gap-3 shadow-2xs flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contact name or service details..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>
        <p className="text-xs text-slate-400 font-semibold truncate">
          Showing {filtered.length} reminder rules
        </p>
      </div>

      {/* ── Reminders Table ── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Service Reminders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Bell size={28} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Service Reminders Configured</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
              Set up automated WhatsApp reminders for subscription renewals, warranty expiries, or customer service follow-ups.
            </p>
            <button
              onClick={() => { resetForm(); setShowDrawer(true); }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create First Reminder</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-5 py-3">Contact / Target</th>
                  <th className="px-5 py-3">Service Name</th>
                  <th className="px-5 py-3">Service Date</th>
                  <th className="px-5 py-3">Repeat Cycle</th>
                  <th className="px-5 py-3">Offset Rules</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      {r.lead ? (
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black">
                            {r.lead.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{r.lead.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400">{r.lead.whatsappPhone}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-black">
                            S
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400">Status: {r.targetStatus?.name || 'Stage'}</p>
                            <p className="text-[11px] font-semibold text-slate-400">Segment Rule</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{r.serviceName}</p>
                      {r.notes && <p className="text-[11px] font-medium text-slate-400 truncate max-w-xs">{r.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(r.serviceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {REPEAT_LABELS[r.repeatType] || r.repeatType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {r.rules?.map((ru: any, i: number) => {
                          const isBefore = ru.offsetDirection === 'BEFORE';
                          return (
                            <span key={i} className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${isBefore ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" : "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"}`}>
                              {ru.offsetDays}d {isBefore ? 'before' : 'after'}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${r.isActive ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleToggle(r.id)}
                          disabled={isLoading(`toggle-${r.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title={r.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {isLoading(`toggle-${r.id}`) ? <Loader2 size={14} className="animate-spin" /> : r.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title="Edit Reminder"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.serviceName)}
                          disabled={isLoading(`del-${r.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Reminder"
                        >
                          {isLoading(`del-${r.id}`) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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

      {/* ── Create / Edit Reminder Modal ── */}
      {showDrawer && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {editingReminder ? 'Edit Service Reminder' : 'New Service Reminder Rule'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Automate pre-service and renewal alerts</p>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Service Name *</label>
                <input
                  type="text" required
                  value={serviceName} onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Annual Maintenance Renewal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Target Contact *</label>
                  <select
                    value={leadId} onChange={(e) => setLeadId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">-- Choose Contact --</option>
                    {safeLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.whatsappPhone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Service Date *</label>
                  <input
                    type="date" required
                    value={serviceDate} onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Repeat Cycle</label>
                <select
                  value={repeatType} onChange={(e) => setRepeatType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="NONE">One-time Alert</option>
                  <option value="MONTHLY">Monthly Repeat</option>
                  <option value="YEARLY">Yearly Repeat</option>
                </select>
              </div>

              {/* Offset Rules */}
              <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Offset Rules ({rules.length})</p>
                  <button type="button" onClick={addRule} className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                    <Plus size={13} strokeWidth={2.5} /> Add Rule
                  </button>
                </div>

                {rules.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-500">Rule #{idx + 1}</span>
                      {rules.length > 1 && (
                        <button type="button" onClick={() => removeRule(idx)} className="text-rose-500 text-xs font-bold">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number" min={0} value={rule.offsetDays}
                        onChange={(e) => updateRule(idx, 'offsetDays', e.target.value)}
                        placeholder="Days"
                        className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center"
                      />
                      <select
                        value={rule.offsetDirection}
                        onChange={(e) => updateRule(idx, 'offsetDirection', e.target.value)}
                        className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      >
                        <option value="BEFORE">Days Before</option>
                        <option value="AFTER">Days After</option>
                      </select>
                      <select
                        value={rule.templateId}
                        onChange={(e) => updateRule(idx, 'templateId', e.target.value)}
                        className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      >
                        <option value="">Template</option>
                        {safeTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button" onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                  <span>{editingReminder ? 'Update Reminder' : 'Save Reminder'}</span>
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
