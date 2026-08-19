  import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import StatusBadge from '../../components/leads/StatusBadge';
import LeadDrawer from '../../components/leads/LeadDrawer';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  AreaChart, Area, ResponsiveContainer
} from "recharts";
import {
  Search, Plus, UserPlus, Loader2,
  ChevronLeft, ChevronRight, X, ChevronDown, Check, Users,
  Upload, Download, AlertCircle, Trash2, Share2, Copy, ExternalLink, Link as LinkIcon, Tag,
  ArrowUp, ArrowDown, UserCheck, Sparkles, Filter, SlidersHorizontal, RefreshCw, CheckCircle,
  Kanban, LayoutGrid, List, MessageSquare, Phone, Mail, MoreVertical, Layers, Calendar, ChevronUp, Clock, Globe,
  Layers3, Flame, CheckSquare,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Status Colors ─────────────────────────────────────────────────────────────
const STATUS_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#64748b',
];

// ── Mini Avatar ───────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
  "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
  "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
  "bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900",
];
const MiniAvatar = ({ name, idx = 0, size = "w-8 h-8", textSize = "text-[11px]" }: { name: string; idx?: number; size?: string; textSize?: string }) => (
  <div className={`${size} rounded-full ${AVATAR_COLORS[(name?.charCodeAt(0) || idx) % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-xs ring-2 ring-white dark:ring-[#111C24]`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

// ── Top KPI Stat Card (Ultra-Compact, Professional SaaS Style) ────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }: {
  label: string; value: string | number; trend: string; isUp: boolean; period: string; strokeColor: string; Icon: any; iconBg: string; iconColor: string;
}) => {
  const sparkData = useMemo(() => [
    { v: 14 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 24 }, { v: 36 }, { v: 30 }, { v: 42 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.5} />
          </div>
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 truncate">{label}</span>
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5} /> : <ArrowDown size={9} strokeWidth={2.5} />}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 w-12 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-lead-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-lead-${label.replace(/\s+/g, '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Custom Select Dropdown ───────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, defaultLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; defaultLabel: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  const label = selectedOption ? selectedOption.label : defaultLabel;
  
  return (
    <div className="relative shrink-0 flex-1 sm:flex-initial min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 h-8 bg-white dark:bg-[#111C24] border rounded-xl text-xs font-bold transition-all w-full min-w-0 sm:min-w-[120px] shadow-2xs ${isOpen ? "border-amber-500 ring-2 ring-amber-500/10 text-amber-600 dark:text-amber-400" : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 text-slate-400 shrink-0 ${isOpen ? "rotate-180 text-amber-500" : ""}`} />
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 min-w-[160px] max-h-56 overflow-y-auto bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-fadeIn hide-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === "" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {defaultLabel}
            </button>
            {options.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs font-bold transition-colors ${value === opt.value ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Contact Card Component (Ultra-Sleek, Compact SaaS CRM Card) ────────────────
const ContactCard = ({ lead, onClick, onDelete, onStatusChange, isSelected, onToggleSelect }: {
  lead: any; onClick: () => void; onDelete: (id: string, name: string) => void; onStatusChange: (lead: any, rect: DOMRect) => void;
  isSelected?: boolean; onToggleSelect?: () => void;
}) => {
  const statusColor = lead.status?.color || "#F97316";
  const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

  return (
    <div 
      onClick={onClick}
      className={`group relative flex flex-col bg-white dark:bg-[#111C24] rounded-xl border p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden isolate ${
        isSelected
          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5"
          : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Left Colored Accent Strip */}
      <div 
        className="absolute top-0 left-0 bottom-0 w-[3px] group-hover:w-[4px] transition-all duration-200 z-20"
        style={{ backgroundColor: statusColor }}
      />

      {/* Header: Checkbox, Avatar, Name, Phone & Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onToggleSelect && (
            <input 
              type="checkbox" 
              checked={!!isSelected} 
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5 shrink-0" 
            />
          )}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border"
            style={{ 
              backgroundColor: `${statusColor}14`, 
              borderColor: `${statusColor}30`, 
              color: statusColor 
            }}
          >
            {(lead.name || "LD").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-[13px] text-slate-800 dark:text-white leading-tight truncate group-hover:text-[#f97316] transition-colors">
              {lead.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10.5px] font-mono font-bold text-slate-400 truncate">
                {lead.whatsappPhone || lead.phone || "No Phone"}
              </span>
              {lead.whatsappOptIn && (
                <span className="inline-flex items-center text-[8.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                  Opt-In
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Pill with Dropdown Trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(lead, (e.currentTarget as HTMLButtonElement).getBoundingClientRect());
          }}
          className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10.5px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
          <span className="text-slate-700 dark:text-slate-200 text-[10.5px] font-semibold">{lead.status?.name || "New"}</span>
          <ChevronDown size={10} className="text-slate-400" />
        </button>
      </div>

      {/* Middle Row: Company / Product Interest & Deal Value */}
      {(lead.company || lead.productService || lead.estimatedValue) && (
        <div className="flex items-center justify-between gap-1.5 py-1 px-2 mb-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 text-[11px] min-w-0">
          <span className="text-slate-600 dark:text-slate-300 font-medium truncate flex-1">
            {lead.company || lead.productService || "Sales Prospect"}
          </span>
          {lead.estimatedValue ? (
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800 shrink-0">
              ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
      )}

      {/* Assigned Employee Tag */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800 truncate">
          <UserCheck size={10} className="text-indigo-500 shrink-0" />
          <span className="truncate">{lead.assignedTo?.name ? `${lead.assignedTo.name}` : "Unassigned"}</span>
        </span>
      </div>

      {/* Tags Row */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 z-10 relative">
          {lead.tags.map((tag: any) => (
            <span 
              key={tag.id || tag.name} 
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border"
              style={{
                backgroundColor: `${tag.color || '#D97706'}15`,
                color: tag.color || '#D97706',
                borderColor: `${tag.color || '#D97706'}30`
              }}
            >
              <Tag size={8} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Source on Left & Direct 1-Click Action Buttons on Right */}
      <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400">
        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
          <Globe size={10} className="text-slate-400" /> {lead.source || "Walk-in"}
        </span>

        <div className="flex items-center gap-1">
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={11} />
            </a>
          )}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all"
              title="Call Contact"
            >
              <Phone size={11} />
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lead.id, lead.name);
            }}
            className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all"
            title="Delete Contact"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

function StatusPopover({
  lead, statuses, onChanged, onClose, anchorRect,
}: { lead: any; statuses: any[]; onChanged: () => void; onClose: () => void; anchorRect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const scrollHandler = () => onClose();
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', scrollHandler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [onClose]);

  const handleSelect = async (statusId: string) => {
    if (statusId === lead.statusId) { onClose(); return; }
    setUpdating(true);
    try {
      await api.patch(`/api/leads/${lead.id}/status`, { statusId });
      success('Status updated');
      onChanged();
    } catch (err: any) { error('Failed to update status', err.message); }
    finally {
      setUpdating(false);
      onClose();
    }
  };

  const dropdownHeight = updating ? 80 : Math.min(statuses.length * 36 + 40, 320);
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const top = spaceBelow > dropdownHeight + 8
    ? anchorRect.bottom + 4
    : anchorRect.top - dropdownHeight - 4;

  return createPortal(
    <div ref={ref} className="fixed z-[9999] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 min-w-[180px] animate-fadeIn" style={{ top, left: anchorRect.left }}>
      {updating ? (
        <div className="flex flex-col items-center justify-center py-4 space-y-1.5">
          <Loader2 className="animate-spin text-amber-500" size={16} />
          <span className="text-[11px] text-slate-400 font-bold">Updating stage...</span>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-black text-slate-400 px-3 py-1.5 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
            Change Pipeline Status
          </p>
          {statuses.map(s => (
            <button key={s.id} onClick={() => handleSelect(s.id)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left font-bold transition-colors cursor-pointer ${
                s.id === lead.statusId ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#EAB308' }} />
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === lead.statusId && <Check className="text-amber-500" size={13} />}
            </button>
          ))}
        </>
      )}
    </div>,
    document.body
  );
}

export default function Leads() {
  const { success, error, confirm } = useToast();
  const { isLoading, run } = useActionLoader();
  const [leads, setLeads] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statuses, setStatuses] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Timeframe & View State
  const [activeTab, setActiveTab] = useState<'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month'>('All Time');
  const [viewMode, setViewMode] = useState<'cards' | 'kanban' | 'list'>('cards');
  const [showStatusCards, setShowStatusCards] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [selectedOptIn, setSelectedOptIn] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // Tags State
  const [tags, setTags] = useState<any[]>([]);
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#D97706');
  const [creatingTag, setCreatingTag] = useState(false);

  // Multi-select
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkStatusId, setBulkStatusId] = useState('');
  const [bulkTagId, setBulkTagId] = useState('');
  const [bulkAssignEmpId, setBulkAssignEmpId] = useState('');

  // Employees for Lead Assignment
  const [employees, setEmployees] = useState<any[]>([]);

  // Inline status popover
  const [statusPopoverLeadId, setStatusPopoverLeadId] = useState<string | null>(null);
  const [statusPopoverRect, setStatusPopoverRect] = useState<DOMRect | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '', whatsappPhone: '', phone: '', email: '',
    statusId: '', source: '', productService: '',
    dateOfBirth: '', anniversaryDate: '', notes: '', whatsappOptIn: true,
    assignedTo: '',
    tagIds: [] as string[],
  });

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Quick Add Status & Source from within Add Lead Modal
  const [showQuickAddStatus, setShowQuickAddStatus] = useState(false);
  const [quickStatusName, setQuickStatusName] = useState('');
  const [quickStatusColor, setQuickStatusColor] = useState('#6366f1');
  const [savingQuickStatus, setSavingQuickStatus] = useState(false);

  const [showQuickAddSource, setShowQuickAddSource] = useState(false);
  const [quickSourceName, setQuickSourceName] = useState('');
  const [savingQuickSource, setSavingQuickSource] = useState(false);

  // Public Form Share states
  const [showShareModal, setShowShareModal] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/assignable-users');
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.users)
        ? res.users
        : Array.isArray(res)
        ? res
        : [];
      if (list.length > 0) {
        setEmployees(list);
        return;
      }
    } catch (_) {}

    try {
      const res = await api.get('/api/company/employees?limit=1000');
      const rawList = Array.isArray(res?.employees) ? res.employees : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const mapped = rawList
        .filter((e: any) => {
          const r = (e.userId?.role || e.role || '').toLowerCase();
          return r !== 'superadmin' && r !== 'companyadmin';
        })
        .map((e: any) => {
          const deptName = e.departmentId?.name || '';
          const name = e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.userId?.name || 'Employee';
          return {
            id: e.userId?._id || e._id,
            _id: e.userId?._id || e._id,
            name,
            department: deptName,
            role: e.role || 'Employee',
            label: deptName ? `${name} (${deptName})` : `${name} (${e.role || 'Staff'})`,
          };
        });
      setEmployees(mapped);
    } catch (_) {}
  };

  const fetchPublicToken = async () => {
    setShowShareModal(true);
    if (!publicToken) {
      setLoadingToken(true);
      try {
        const res = await api.get('/api/organization/public-token');
        if (res?.publicFormToken) {
          setPublicToken(res.publicFormToken);
        }
      } catch (err: any) {
        error('Failed to load public form link', err.message);
      } finally {
        setLoadingToken(false);
      }
    }
  };

  const publicFormUrl = publicToken ? `${window.location.origin}/p/${publicToken}` : '';

  const handleCopyLink = () => {
    if (!publicFormUrl) return;
    navigator.clipboard.writeText(publicFormUrl);
    setCopiedToken(true);
    success('Public lead capture form link copied to clipboard!');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importLeads, setImportLeads] = useState<any[]>([]);
  const [duplicateBehavior, setDuplicateBehavior] = useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = useState(false);

  const [leadStats, setLeadStats] = useState<{
    totalContacts: number;
    optedInCount: number;
    newLeadsCount: number;
    pipelineStagesCount: number;
    activeTagsCount: number;
    statusCounts: Record<string, number>;
  }>({
    totalContacts: 0,
    optedInCount: 0,
    newLeadsCount: 0,
    pipelineStagesCount: 0,
    activeTagsCount: 0,
    statusCounts: {},
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/leads/stats');
      if (res?.success || res?.totalContacts !== undefined) {
        setLeadStats({
          totalContacts: res.totalContacts || 0,
          optedInCount: res.optedInCount || 0,
          newLeadsCount: res.newLeadsCount || 0,
          pipelineStagesCount: res.pipelineStagesCount || 0,
          activeTagsCount: res.activeTagsCount || 0,
          statusCounts: res.statusCounts || {},
        });
      }
    } catch (_) {}
  };

  const fetchStatuses = async () => {
    try {
      const res = await api.get('/api/statuses');
      const list = Array.isArray(res) ? res : (res?.statuses || res?.data || []);
      setStatuses(list);
      if (list.length > 0 && !newLead.statusId) {
        const def = list.find((s: any) => s.isDefault) || list[0];
        setNewLead(prev => ({ ...prev, statusId: def.id }));
      }
    } catch (_) { }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get('/api/sources');
      const list = Array.isArray(res) ? res : (res?.sources || res?.data || []);
      setSources(list);
      if (list.length > 0) {
        setNewLead(prev => ({ ...prev, source: prev.source || list[0].name }));
      }
    } catch (_) { }
  };

  const handleQuickCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStatusName.trim()) return;
    setSavingQuickStatus(true);
    try {
      const maxOrder = (Array.isArray(statuses) ? statuses : []).reduce((max: number, s: any) => (s.displayOrder > max ? s.displayOrder : max), 0);
      const res = await api.post('/api/statuses', {
        name: quickStatusName.trim(),
        color: quickStatusColor,
        isDefault: false,
        displayOrder: maxOrder + 1,
      });
      await fetchStatuses();
      if (res?.id) {
        setNewLead(prev => ({ ...prev, statusId: res.id }));
      }
      setQuickStatusName('');
      setQuickStatusColor('#6366f1');
      setShowQuickAddStatus(false);
      success('Status created and selected!');
    } catch (err: any) {
      error('Failed to create status', err.message);
    } finally {
      setSavingQuickStatus(false);
    }
  };

  const handleQuickCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSourceName.trim()) return;
    setSavingQuickSource(true);
    try {
      const res = await api.post('/api/sources', {
        name: quickSourceName.trim(),
      });
      await fetchSources();
      const createdName = res?.name || quickSourceName.trim();
      setNewLead(prev => ({ ...prev, source: createdName }));
      setQuickSourceName('');
      setShowQuickAddSource(false);
      success('Lead source created and selected!');
    } catch (err: any) {
      error('Failed to create source', err.message);
    } finally {
      setSavingQuickSource(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/api/tags');
      const list = Array.isArray(res) ? res : (res?.tags || res?.data || []);
      setTags(list);
    } catch (_) { }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      await api.post('/api/tags', { name: newTagName.trim(), color: newTagColor });
      setNewTagName('');
      setNewTagColor('#D97706');
      await fetchTags();
      success('Tag created successfully!');
    } catch (err: any) {
      error('Failed to create tag', err.message);
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await api.delete(`/api/tags/${id}`);
      await fetchTags();
      await fetchLeads(pagination.page);
      success('Tag deleted');
    } catch (err: any) {
      error('Cannot delete tag', err.message);
    }
  };

  const fetchLeads = async (page = 1, overrideParams?: { search?: string; statusId?: string; optInState?: string; source?: string; tagId?: string; activeTab?: string }) => {
    setLoading(true);
    try {
      const qSearch = overrideParams?.search !== undefined ? overrideParams.search : search;
      const qStatusId = overrideParams?.statusId !== undefined ? overrideParams.statusId : selectedStatusId;
      const qOptIn = overrideParams?.optInState !== undefined ? overrideParams.optInState : selectedOptIn;
      const qSource = overrideParams?.source !== undefined ? overrideParams.source : selectedSource;
      const qTagId = overrideParams?.tagId !== undefined ? overrideParams.tagId : selectedTagId;
      const qTab = overrideParams?.activeTab !== undefined ? overrideParams.activeTab : activeTab;

      let url = `/api/leads?page=${page}&limit=${pagination.limit}`;
      if (qSearch) url += `&search=${encodeURIComponent(qSearch)}`;
      if (qStatusId) url += `&statusId=${qStatusId}`;
      if (qOptIn) url += `&optInState=${qOptIn}`;
      if (qSource) url += `&source=${qSource}`;
      if (qTagId) url += `&tagId=${qTagId}`;

      let computedStart = '';
      let computedEnd = '';

      if (qTab === 'Today') {
        const d = new Date(); d.setHours(0, 0, 0, 0); computedStart = d.toISOString();
        const de = new Date(); de.setHours(23, 59, 59, 999); computedEnd = de.toISOString();
      } else if (qTab === 'Yesterday') {
        const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); computedStart = d.toISOString();
        const de = new Date(); de.setDate(de.getDate() - 1); de.setHours(23, 59, 59, 999); computedEnd = de.toISOString();
      } else if (qTab === 'This Week') {
        const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); computedStart = d.toISOString();
      } else if (qTab === 'This Month') {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); computedStart = d.toISOString();
      }

      if (computedStart) url += `&startDate=${encodeURIComponent(computedStart)}`;
      if (computedEnd) url += `&endDate=${encodeURIComponent(computedEnd)}`;

      const res = await api.get(url);
      const safeLeads = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.leads)
        ? res.leads
        : Array.isArray(res?.data?.leads)
        ? res.data.leads
        : [];

      setLeads(safeLeads);
      setPagination(res?.pagination || res?.data?.pagination || { page, limit: 20, total: safeLeads.length, totalPages: 1 });
      setCheckedIds(new Set());
      fetchStats();
    } catch (_) { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatuses(); fetchSources(); fetchTags(); fetchEmployees(); fetchStats(); }, []);
  useEffect(() => { fetchLeads(1); }, [search, selectedStatusId, selectedOptIn, selectedSource, selectedTagId, activeTab]);

  // Checkbox helpers
  const allChecked = leads.length > 0 && leads.every(l => checkedIds.has(l.id));
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(leads.map(l => l.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(checkedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedIds(next);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignEmpId || checkedIds.size === 0) return;
    await run('bulk-assign', async () => {
      const leadIds = Array.from(checkedIds);
      const targetEmp = bulkAssignEmpId === 'unassigned' ? null : bulkAssignEmpId;
      await api.patch('/api/leads/bulk-assign', {
        leadIds,
        assignedTo: targetEmp,
      });
      const chosenEmp = employees.find(e => (e.id || e._id) === bulkAssignEmpId);
      success(`Assigned ${leadIds.length} contact${leadIds.length !== 1 ? 's' : ''} to ${targetEmp ? (chosenEmp?.name || 'Employee') : 'Unassigned'}`);
      setCheckedIds(new Set());
      setBulkAssignEmpId('');
      await fetchLeads(pagination.page);
    });
  };

  const handleBulkStatus = async () => {
    if (!bulkStatusId || checkedIds.size === 0) return;
    await run('bulk-status', async () => {
      const res = await api.patch('/api/leads/bulk-status', {
        leadIds: Array.from(checkedIds),
        statusId: bulkStatusId,
      });
      success(`${res.updated} contact${res.updated !== 1 ? 's' : ''} moved to "${res.statusName}"`);
      setCheckedIds(new Set());
      setBulkStatusId('');
      await fetchLeads(pagination.page);
    });
  };

  const handleBulkTag = async (action: 'add' | 'remove') => {
    if (!bulkTagId || checkedIds.size === 0) return;
    await run('bulk-tag', async () => {
      await api.patch('/api/leads/bulk-tags', {
        leadIds: Array.from(checkedIds),
        tagId: bulkTagId,
        action,
      });
      const selectedTag = tags.find(t => t.id === bulkTagId);
      success(`${action === 'add' ? 'Added' : 'Removed'} tag "${selectedTag?.name || 'Tag'}" for ${checkedIds.size} contact(s)`);
      setCheckedIds(new Set());
      setBulkTagId('');
      await fetchLeads(pagination.page);
    });
  };

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    const ok = await confirm({
      title: 'Delete Contacts',
      message: `Are you sure you want to delete ${checkedIds.size} selected contacts? This action is irreversible.`,
      confirmLabel: 'Delete Contacts',
      danger: true,
    });
    if (!ok) return;

    await run('bulk-delete', async () => {
      await api.post('/api/leads/bulk-delete', {
        leadIds: Array.from(checkedIds),
      });
      success(`${checkedIds.size} contacts deleted successfully`);
      setCheckedIds(new Set());
      await fetchLeads(pagination.page);
    });
  };

  const handleDeleteOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Contact',
      message: `Are you sure you want to delete contact "${name}"? This action is irreversible.`,
      confirmLabel: 'Delete Contact',
      danger: true,
    });
    if (!ok) return;

    await run(`delete-${id}`, async () => {
      await api.delete(`/api/leads/${id}`);
      success(`Contact "${name}" deleted`);
      await fetchLeads(pagination.page);
    });
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLead(true); setAddLeadError(null);
    try {
      const payload: any = { ...newLead };
      if (!payload.phone) delete payload.phone;
      if (!payload.email) delete payload.email;
      if (!payload.productService) delete payload.productService;
      if (!payload.notes) delete payload.notes;
      if (!payload.assignedTo) delete payload.assignedTo;
      if (payload.dateOfBirth) payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
      if (payload.anniversaryDate) payload.anniversaryDate = new Date(payload.anniversaryDate).toISOString();
      await api.post('/api/leads', payload);
      setShowAddModal(false); setAddLeadError(null);
      const def = statuses.find((s: any) => s.isDefault) || statuses[0];
      const defSource = sources[0]?.name || 'Walk-in';
      setNewLead({ name: '', whatsappPhone: '', phone: '', email: '', statusId: def?.id || '', source: defSource, productService: '', dateOfBirth: '', anniversaryDate: '', notes: '', whatsappOptIn: true, assignedTo: '', tagIds: [] });
      
      // Auto-reset active search & filters so newly created lead is immediately displayed!
      setSearch('');
      setSelectedStatusId('');
      setSelectedOptIn('');
      setSelectedSource('');
      setSelectedTagId('');
      setActiveTab('All Time');

      success('Contact added');
      fetchLeads(1, { search: '', statusId: '', optInState: '', source: '', tagId: '', activeTab: 'All Time' });
    } catch (err: any) { setAddLeadError(err.message || 'Failed to create contact'); }
    finally { setSavingLead(false); }
  };

  const handleDownloadSample = () => {
    const headers = [
      'Full Name *', 'WhatsApp Number *', 'Secondary Phone', 'Email Address',
      'Status', 'Lead Source', 'Product Service Interest', 'Birthday (YYYY-MM-DD)',
      'Anniversary (YYYY-MM-DD)', 'Notes', 'WhatsApp Opt In (TRUE/FALSE)'
    ];

    const sampleStatus1 = statuses[0]?.name || 'New';

    const sampleRows = [
      ['Ram Shinde', '919898989898', '', 'ram@gmail.com', sampleStatus1, 'Walk-in', 'Web Development', '1995-08-20', '', 'Initial lead from walk-in', 'TRUE'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 15 },
      { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 28 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample Leads');
    XLSX.writeFile(wb, 'LeadEngine_Import_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Could not read file data');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length < 2) throw new Error('The uploaded file does not contain any data rows.');

        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());

        const findColumnIndex = (patterns: RegExp[]) => {
          return headers.findIndex(h => patterns.some(p => p.test(h)));
        };

        const colIndices = {
          name: findColumnIndex([/full\s*name/i, /^name/i, /customer\s*name/i]),
          whatsappPhone: findColumnIndex([/whatsapp/i, /wa\s*phone/i, /whatsapp\s*number/i]),
          phone: findColumnIndex([/secondary\s*phone/i, /secondary\s*mobile/i, /^phone/i, /^mobile/i]),
          email: findColumnIndex([/email/i, /mail/i]),
          statusName: findColumnIndex([/status/i]),
          source: findColumnIndex([/source/i, /lead\s*source/i]),
          productService: findColumnIndex([/product/i, /service/i, /interest/i]),
          dateOfBirth: findColumnIndex([/birthday/i, /birth/i, /dob/i]),
          anniversaryDate: findColumnIndex([/anniversary/i, /marriage/i]),
          notes: findColumnIndex([/note/i, /notes/i, /comment/i]),
          whatsappOptIn: findColumnIndex([/opt\s*in/i, /whatsapp\s*opt\s*in/i, /opt-in/i])
        };

        if (colIndices.name === -1) throw new Error('Could not find "Full Name" or "Name" column in headers.');
        if (colIndices.whatsappPhone === -1) throw new Error('Could not find "WhatsApp Number" or "WhatsApp" column in headers.');

        const parsedLeads: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(val => val === null || val === undefined || val === '')) continue;

          const getVal = (idx: number) => {
            if (idx === -1 || idx >= row.length) return '';
            const val = row[idx];
            return val !== null && val !== undefined ? String(val).trim() : '';
          };

          const name = getVal(colIndices.name);
          const whatsappPhone = getVal(colIndices.whatsappPhone);
          const phone = getVal(colIndices.phone);
          const email = getVal(colIndices.email);
          const statusName = getVal(colIndices.statusName);
          const source = getVal(colIndices.source);
          const productService = getVal(colIndices.productService);
          const dateOfBirth = getVal(colIndices.dateOfBirth);
          const anniversaryDate = getVal(colIndices.anniversaryDate);
          const notes = getVal(colIndices.notes);
          const optInStr = getVal(colIndices.whatsappOptIn).toLowerCase();

          let whatsappOptIn = true;
          if (optInStr === 'false' || optInStr === 'no' || optInStr === '0') whatsappOptIn = false;

          const errors: string[] = [];
          if (!name) errors.push('Name is required');
          else if (name.length < 2) errors.push('Name must be at least 2 characters');

          if (!whatsappPhone) errors.push('WhatsApp number is required');
          else {
            const digits = whatsappPhone.replace(/\D/g, '');
            if (digits.length < 10) errors.push('WhatsApp number must have at least 10 digits');
          }

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

          const parseDateString = (str: string) => {
            if (!str) return null;
            if (/^\d+(\.\d+)?$/.test(str)) {
              return new Date(Date.UTC(1899, 11, 30) + parseFloat(str) * 24 * 60 * 60 * 1000);
            }
            const parsed = new Date(str);
            return isNaN(parsed.getTime()) ? null : parsed;
          };

          const dobDate = parseDateString(dateOfBirth);
          const anniversaryDateObj = parseDateString(anniversaryDate);

          parsedLeads.push({
            name, whatsappPhone, phone: phone || null, email: email || null,
            statusName: statusName || null, source: source || 'Walk-in', productService: productService || null,
            dateOfBirth: dobDate ? dobDate.toISOString() : '', anniversaryDate: anniversaryDateObj ? anniversaryDateObj.toISOString() : '',
            notes: notes || null, whatsappOptIn, errors, isValid: errors.length === 0
          });
        }

        setImportLeads(parsedLeads);
        setImportStep(2);
      } catch (err: any) {
        error(err.message || 'Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    const validLeads = importLeads.filter(l => l.isValid).map(({ errors, isValid, ...rest }) => rest);
    if (validLeads.length === 0) {
      error('No valid contacts to import.');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/api/leads/import', { leads: validLeads, duplicateBehavior });
      if (res.success || res.summary) {
        const { created, restored, updated, skipped, failed } = res.summary || {};
        success(`Import Completed! Created: ${created || 0}, Restored: ${restored || 0}, Updated: ${updated || 0}, Skipped: ${skipped || 0}, Failed: ${failed || 0}`);
        setShowImportModal(false);
        setImportLeads([]);
        setImportStep(1);

        setSearch('');
        setSelectedStatusId('');
        setSelectedOptIn('');
        setSelectedSource('');
        setSelectedTagId('');
        setActiveTab('All Time');

        fetchLeads(1, { search: '', statusId: '', optInState: '', source: '', tagId: '', activeTab: 'All Time' });
      } else {
        error(res.message || 'Import failed.');
      }
    } catch (err: any) {
      error(err.message || 'Failed to import contacts.');
    } finally {
      setImporting(false);
    }
  };

  const activeCustomFiltersCount = useMemo(() => {
    return [selectedStatusId, selectedOptIn, selectedSource, selectedTagId].filter(Boolean).length;
  }, [selectedStatusId, selectedOptIn, selectedSource, selectedTagId]);

  // Stat calculations
  const totalLeadsCount = pagination.total || leads.length;
  const optedInCount = leads.filter(l => l.whatsappOptIn).length;
  const newLeadsCount = leads.filter(l => l.status?.name?.toLowerCase().includes('new')).length;

  const dateTabs: ('All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month')[] = ["All Time", "Today", "Yesterday", "This Week", "This Month"];

  return (
    <div className="animate-fadeIn space-y-4 max-w-[1440px] mx-auto pb-24 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Page Header (Matching Dashboard & Task Management Header Exactly) ────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Contacts & Leads Pipeline
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage customer profiles, lead stages, tags, and automated workflows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-30">
          <button 
            onClick={() => { setImportStep(1); setShowImportModal(true); }} 
            className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Upload size={13} className="text-slate-400" /> Import Leads
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-1.5 px-3.5 h-8 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all shrink-0 cursor-pointer"
          >
            <UserPlus size={14} strokeWidth={2.5} /> Add Contact
          </button>
        </div>
      </div>

      {/* ── Top 5 KPI Stat Cards (100% Real-Time Database Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 pt-1">
        <KPICard label="Total Contacts" value={leadStats.totalContacts || pagination.total || leads.length} trend="Live" isUp period="database" strokeColor="#EAB308" Icon={Users} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="WhatsApp Leads" value={leadStats.optedInCount} trend="Verified" isUp period="database" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="New Inquiries" value={leadStats.newLeadsCount} trend="Recent" isUp period="database" strokeColor="#06B6D4" Icon={UserPlus} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Pipeline Stages" value={leadStats.pipelineStagesCount || (Array.isArray(statuses) ? statuses.length : 5)} trend="Active" isUp period="configured" strokeColor="#8B5CF6" Icon={Sparkles} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Active Tags" value={leadStats.activeTagsCount || (Array.isArray(tags) ? tags.length : 0)} trend="Labels" isUp period="registry" strokeColor="#F43F5E" Icon={Tag} iconBg="bg-rose-500/10" iconColor="#E11D48" />
      </div>

      {/* ── PERFECT SINGLE-LINE BASELINE ALIGNED TIMEFRAME TAB BAR + VIEW SWITCHER + STATUS FILTER ── */}
      <div className="bg-white dark:bg-[#111C24] p-2 sm:px-3 sm:py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 min-h-[44px]">
        {/* Clean Date Filter Chips Container */}
        <div className="flex items-center overflow-x-auto gap-1 hide-scrollbar flex-1 min-w-0">
          {dateTabs.map((tabName) => {
            const isActive = activeTab === tabName;
            return (
              <button
                key={tabName}
                onClick={() => setActiveTab(tabName)}
                className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tabName}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher Pills & Status Drawer Toggle Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
          {/* View Switcher Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1E293B] p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/80 shadow-2xs gap-0.5 h-8 flex-1 sm:flex-initial">
            <button
              onClick={() => setViewMode("cards")}
              title="Grid Cards View"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold transition-all ${
                viewMode === "cards"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid size={13} /> <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Kanban size={13} /> <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Table List View"
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <List size={13} /> <span>List</span>
            </button>
          </div>

          {/* Status Drawer Toggle Button */}
          <button
            onClick={() => setShowStatusCards(!showStatusCards)}
            className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border text-xs font-extrabold transition-colors shadow-2xs cursor-pointer shrink-0 ${
              showStatusCards || selectedStatusId
                ? "bg-slate-900 text-white dark:bg-amber-500/20 dark:text-amber-300 border-slate-800 shadow-xs"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            <Filter size={13} className="text-amber-500" />
            <span>Filter</span>
            {selectedStatusId && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            )}
            {showStatusCards ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── PREMIUM COLLAPSIBLE STATUS FILTER DRAWER (HIDDEN BY DEFAULT) ───────── */}
      {showStatusCards && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#0F172A] text-white p-4 rounded-2xl border border-slate-800 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Layers3 size={14} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">Status Quick Filters</h4>
                <p className="text-[10px] text-slate-400">Select a status chip to filter the contact pipeline</p>
              </div>
            </div>
            {selectedStatusId ? (
              <button
                onClick={() => setSelectedStatusId("")}
                className="text-xs font-extrabold text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Reset Filter
              </button>
            ) : (
              <button onClick={() => setShowStatusCards(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {/* All Contacts Card */}
            <button
              onClick={() => setSelectedStatusId("")}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                !selectedStatusId
                  ? "bg-slate-800 border-2 border-amber-400 text-amber-300 font-extrabold shadow-[0_0_16px_rgba(245,158,11,0.25)] scale-[1.02]"
                  : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-200 font-bold"
              }`}
            >
              <div className="text-[9px] uppercase tracking-wider opacity-80">Show All</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-extrabold">All Contacts</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${!selectedStatusId ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" : "bg-slate-700 text-slate-300"}`}>
                  {totalLeadsCount}
                </span>
              </div>
            </button>

            {/* Status Chips */}
            {statuses.map(st => {
              const isSelected = selectedStatusId === st.id;
              const count = leadStats.statusCounts?.[st.id] !== undefined
                ? leadStats.statusCounts[st.id]
                : leads.filter(l => l.statusId === st.id || l.status?.id === st.id).length;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatusId(prev => prev === st.id ? "" : st.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-slate-800 border-2 border-amber-400 text-amber-300 font-extrabold shadow-[0_0_16px_rgba(245,158,11,0.25)] scale-[1.02]"
                      : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color || '#EAB308' }} />
                    <span className={`text-[9px] uppercase tracking-wider truncate ${isSelected ? "text-amber-400 font-bold" : "text-slate-400"}`}>{st.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${isSelected ? "font-black text-amber-300" : "font-bold text-slate-200"}`}>{st.name}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${isSelected ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" : "bg-slate-700/80 text-slate-300"}`}>
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER (UNIFIED SAAS CARD FOR TOOLBAR & CONTENT) ── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        
        {/* Table/Cards Integrated Toolbar Row */}
        <div className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 p-3 flex flex-wrap xl:flex-nowrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px] group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search team member or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-8 bg-white dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 focus:border-amber-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            <CustomSelect
              value={selectedSource}
              onChange={setSelectedSource}
              options={(Array.isArray(sources) ? sources : []).map(s => ({ value: s.name, label: s.name }))}
              defaultLabel="All Sources"
            />
          </div>
        </div>

        {/* ── Bulk Action Bar ────────────────────────────────────────────────── */}
        {someChecked && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="font-extrabold text-slate-900 dark:text-white">{checkedIds.size} contacts selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Assign Employee */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold text-[11px]">Assign To:</span>
                <select
                  className="h-8 px-2.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none max-w-[210px]"
                  value={bulkAssignEmpId}
                  onChange={e => setBulkAssignEmpId(e.target.value)}
                >
                  <option value="">Select Employee…</option>
                  <option value="unassigned">-- Unassign --</option>
                  {employees.map(emp => (
                    <option key={emp.id || emp._id} value={emp.id || emp._id}>
                      {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignEmpId || isLoading('bulk-assign')}
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isLoading('bulk-assign') ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                  Assign
                </button>
              </div>

              <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold text-[11px]">Move Status:</span>
                <select
                  className="h-8 px-2.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  value={bulkStatusId}
                  onChange={e => setBulkStatusId(e.target.value)}
                >
                  <option value="">Pick status…</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  onClick={handleBulkStatus}
                  disabled={!bulkStatusId || isLoading('bulk-status')}
                  className="h-8 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  {isLoading('bulk-status') ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                </button>
              </div>

              <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold text-[11px]">Tag:</span>
                <select
                  className="h-8 px-2.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  value={bulkTagId}
                  onChange={e => setBulkTagId(e.target.value)}
                >
                  <option value="">Select Tag…</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => handleBulkTag('add')}
                  disabled={!bulkTagId || isLoading('bulk-tag')}
                  className="h-8 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleBulkDelete}
                disabled={isLoading('bulk-delete')}
                className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all flex items-center gap-1 ml-2 cursor-pointer"
              >
                <Trash2 size={13} /> Delete
              </button>

              <button
                onClick={() => setCheckedIds(new Set())}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Main View Content Area (Cards vs Kanban vs List) ──────────────── */}
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 border border-amber-500/20">
                <UserPlus size={26} strokeWidth={2} />
              </div>
              <p className="text-slate-900 dark:text-white font-extrabold text-base">No contacts found</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">{activeCustomFiltersCount > 0 ? 'Try adjusting your status filter or search' : 'Add your first contact to get started'}</p>
            </div>
          ) : viewMode === "cards" ? (
            /* ── GRID CARDS VIEW ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {leads.map(lead => (
                <ContactCard 
                  key={lead.id} 
                  lead={lead} 
                  isSelected={checkedIds.has(lead.id)}
                  onToggleSelect={() => toggleOne(lead.id)}
                  onClick={() => setSelectedLeadId(lead.id)}
                  onDelete={handleDeleteOne}
                  onStatusChange={(targetLead, rect) => {
                    setStatusPopoverRect(rect);
                    setStatusPopoverLeadId(targetLead.id);
                  }}
                />
              ))}
            </div>
          ) : viewMode === "kanban" ? (
            /* ── KANBAN PIPELINE BOARD VIEW ── */
            <div className="flex overflow-x-auto gap-3.5 pb-4 custom-scrollbar snap-x">
              {(Array.isArray(statuses) ? statuses : []).map(status => {
                const stageLeads = (Array.isArray(leads) ? leads : []).filter(l => 
                  (l.statusId && (String(l.statusId) === String(status.id) || String(l.statusId) === String(status._id))) ||
                  (l.status?.id && String(l.status.id) === String(status.id)) ||
                  (l.status?._id && String(l.status._id) === String(status.id)) ||
                  (l.status?.name && status.name && String(l.status.name).toLowerCase() === String(status.name).toLowerCase())
                );
                return (
                  <div key={status.id} className="w-[280px] sm:w-[310px] shrink-0 snap-center flex flex-col bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 min-h-[480px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color || '#EAB308' }} />
                        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">{status.name}</h3>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] hide-scrollbar pr-0.5">
                      {stageLeads.length === 0 ? (
                        <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] font-medium text-slate-400">
                          No contacts in {status.name}
                        </div>
                      ) : (
                        stageLeads.map(lead => (
                          <ContactCard 
                            key={lead.id} 
                            lead={lead} 
                            isSelected={checkedIds.has(lead.id)}
                            onToggleSelect={() => toggleOne(lead.id)}
                            onClick={() => setSelectedLeadId(lead.id)}
                            onDelete={handleDeleteOne}
                            onStatusChange={(targetLead, rect) => {
                              setStatusPopoverRect(rect);
                              setStatusPopoverLeadId(targetLead.id);
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── ENTERPRISE TABLE LIST VIEW ── */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded accent-amber-500 cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 font-semibold">Contact Name</th>
                    <th className="px-4 py-3 font-semibold">WhatsApp Number</th>
                    <th className="px-4 py-3 font-semibold">Assigned Rep</th>
                    <th className="px-4 py-3 font-semibold">Pipeline Stage</th>
                    <th className="px-4 py-3 font-semibold">Product Interest</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Date Added</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {leads.map(lead => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/80 ${
                        checkedIds.has(lead.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={checkedIds.has(lead.id)} 
                          onChange={() => toggleOne(lead.id)} 
                          className="rounded accent-amber-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <MiniAvatar name={lead.name} />
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white text-[13px] leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{lead.name}</p>
                            {lead.email && <p className="text-[11px] text-slate-400 font-medium">{lead.email}</p>}
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lead.tags.map((tag: any) => (
                                  <span 
                                    key={tag.id} 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9.5px] font-extrabold border"
                                    style={{
                                      backgroundColor: `${tag.color || '#D97706'}15`,
                                      color: tag.color || '#D97706',
                                      borderColor: `${tag.color || '#D97706'}30`
                                    }}
                                  >
                                    <Tag size={9} />
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {lead.whatsappPhone}
                      </td>

                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800">
                          <UserCheck size={11} className="text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[110px]">{lead.assignedTo?.name || "Unassigned"}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="inline-block">
                          <button
                            onClick={(e) => {
                              if (statusPopoverLeadId === lead.id) {
                                setStatusPopoverLeadId(null);
                                setStatusPopoverRect(null);
                              } else {
                                setStatusPopoverRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                                setStatusPopoverLeadId(lead.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            <StatusBadge name={lead.status?.name} color={lead.status?.color} />
                            <ChevronDown size={11} className="text-slate-400" />
                          </button>
                          {statusPopoverLeadId === lead.id && statusPopoverRect && (
                            <StatusPopover
                              lead={lead}
                              statuses={statuses}
                              anchorRect={statusPopoverRect}
                              onChanged={() => fetchLeads(pagination.page)}
                              onClose={() => { setStatusPopoverLeadId(null); setStatusPopoverRect(null); }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {lead.productService || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {lead.source}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedLeadId(lead.id)} 
                            className="px-2.5 py-1 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteOne(lead.id, lead.name)}
                            disabled={isLoading(`delete-${lead.id}`)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            {isLoading(`delete-${lead.id}`) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="bg-slate-50/50 dark:bg-slate-900/40 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Showing <span className="font-bold text-slate-900 dark:text-white">{leads.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> contacts</span>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={pagination.page === 1} 
                onClick={() => fetchLeads(pagination.page - 1)} 
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.page} / {pagination.totalPages}</span>
              <button 
                disabled={pagination.page === pagination.totalPages} 
                onClick={() => fetchLeads(pagination.page + 1)} 
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Drawer */}
      {selectedLeadId && createPortal(
        <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} onUpdate={() => fetchLeads(pagination.page)} statuses={statuses} sources={sources} employees={employees} />,
        document.body
      )}

      {/* Add Contact Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Add New Contact</h3>
                  <p className="text-[11px] text-slate-400">Create a customer profile in lead database</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddLeadError(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {addLeadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                  <span>{addLeadError}</span>
                  <button type="button" onClick={() => setAddLeadError(null)}><X size={14} /></button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Full Name *</label>
                  <input type="text" required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" placeholder="Enter Your Name" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">WhatsApp Number *</label>
                  <input type="tel" required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" placeholder="Enter Your WhatsApp Number" value={newLead.whatsappPhone} onChange={e => setNewLead({ ...newLead, whatsappPhone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Secondary Phone</label>
                  <input type="tel" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" placeholder="Optional" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email Address</label>
                  <input type="email" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" placeholder="email@example.com" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Pipeline Status</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddStatus(true)}
                      className="text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus size={11} strokeWidth={3} /> Add Status
                    </button>
                  </div>
                  <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" value={newLead.statusId} onChange={e => setNewLead({ ...newLead, statusId: e.target.value })}>
                    {(Array.isArray(statuses) ? statuses : []).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Lead Source</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddSource(true)}
                      className="text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus size={11} strokeWidth={3} /> Add Source
                    </button>
                  </div>
                  <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                    {(Array.isArray(sources) ? sources : []).map(src => <option key={src.name} value={src.name}>{src.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Assign to Employee / Sales Rep */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assign to Employee / Sales Rep</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500"
                  value={newLead.assignedTo}
                  onChange={e => setNewLead({ ...newLead, assignedTo: e.target.value })}
                >
                  <option value="">-- Leave Unassigned (Or Auto) --</option>
                  {employees.map(emp => (
                    <option key={emp.id || emp._id} value={emp.id || emp._id}>
                      {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Product / Service Interest</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500" placeholder="e.g. Enterprise License" value={newLead.productService} onChange={e => setNewLead({ ...newLead, productService: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setAddLeadError(null); }} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingLead} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                  {savingLead ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {savingLead ? 'Saving...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal */}
      {showShareModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 space-y-4 animate-slideUp">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 size={16} className="text-amber-500" /> Public Lead Capture Form
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Anyone with this link can submit new leads directly into your database.
            </p>

            {loadingToken ? (
              <div className="py-6 text-center text-xs text-slate-400 font-bold animate-pulse">Generating public URL...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input type="text" readOnly value={publicFormUrl} className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none" />
                  <button onClick={handleCopyLink} className="px-3 py-1.5 bg-slate-900 dark:bg-amber-600 text-white rounded-lg text-xs font-extrabold shrink-0 cursor-pointer">
                    {copiedToken ? "Copied!" : "Copy"}
                  </button>
                </div>
                {publicFormUrl && (
                  <a href={publicFormUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                    <ExternalLink size={12} /> Preview Form in New Tab
                  </a>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Manage Tags Modal */}
      {showManageTagsModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 space-y-4 animate-slideUp">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={16} className="text-amber-500" /> Manage Workspace Tags
              </h3>
              <button onClick={() => setShowManageTagsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateTag} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Tag Name (e.g. VIP, Hot Lead)"
                className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />
              <button type="submit" disabled={creatingTag || !newTagName.trim()} className="px-3 py-1.5 bg-slate-900 dark:bg-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer">
                Add Tag
              </button>
            </form>

            <div className="max-h-48 overflow-y-auto space-y-2 pt-2">
              {tags.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white">{t.name}</span>
                  <button onClick={() => handleDeleteTag(t.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-5 space-y-4 animate-slideUp">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={16} className="text-amber-500" /> Import Contacts
              </h3>
              <button onClick={() => { setShowImportModal(false); setImportLeads([]); setImportStep(1); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>

            {importStep === 1 ? (
              <div className="space-y-4 text-center py-4">
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 block cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">Upload Excel File (.xlsx)</p>
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" />
                </label>
                <button onClick={handleDownloadSample} className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer">
                  <Download size={12} /> Download Sample Template
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ready to import {importLeads.filter(l => l.isValid).length} contacts</p>
                <button onClick={handleConfirmImport} disabled={importing} className="w-full py-2.5 bg-slate-900 dark:bg-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer">
                  {importing ? "Importing..." : "Confirm Import"}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Quick Add Status Modal */}
      {showQuickAddStatus && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Add Pipeline Status
              </h3>
              <button onClick={() => setShowQuickAddStatus(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateStatus} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Status Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. In Negotiation, Follow-up"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  value={quickStatusName}
                  onChange={e => setQuickStatusName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Color Tag</label>
                <div className="grid grid-cols-6 gap-2">
                  {STATUS_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setQuickStatusColor(c)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer ${quickStatusColor === c ? "ring-2 ring-slate-900 dark:ring-white scale-110 shadow-xs" : "opacity-80 hover:opacity-100"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddStatus(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickStatus || !quickStatusName.trim()}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingQuickStatus ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                  <span>{savingQuickStatus ? 'Saving...' : 'Create Status'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Add Source Modal */}
      {showQuickAddSource && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-amber-500" /> Add Lead Source
              </h3>
              <button onClick={() => setShowQuickAddSource(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateSource} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Source / Channel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram, Referral, Google Ads"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  value={quickSourceName}
                  onChange={e => setQuickSourceName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddSource(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickSource || !quickSourceName.trim()}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingQuickSource ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                  <span>{savingQuickSource ? 'Saving...' : 'Create Source'}</span>
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

