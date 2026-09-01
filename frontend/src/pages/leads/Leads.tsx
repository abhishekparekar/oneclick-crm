import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '../../utils/leads/api';
import StatusBadge, { getLeadStatusColorStyle } from '../../components/leads/StatusBadge';
import LeadDrawer from '../../components/leads/LeadDrawer';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  Search, Plus, UserPlus, Loader2,
  ChevronLeft, ChevronRight, X, ChevronDown, Check, Users,
  Upload, Download, AlertCircle, Trash2, Share2, Copy, ExternalLink, Link as LinkIcon, Tag,
  ArrowUp, ArrowDown, UserCheck, Sparkles, Filter, SlidersHorizontal, RefreshCw, CheckCircle,
  Kanban, LayoutGrid, List, MessageSquare, Phone, Mail, MoreVertical, Layers, Calendar, ChevronUp, Clock, Globe,
  Layers3, Flame, CheckSquare, Package, FileText, User,
  Zap, Eye, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import MapPlacesSearch from './MapPlacesSearch';

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
const MiniAvatar = ({ name, idx = 0, size = "w-6 h-6", textSize = "text-[10px]" }: { name: string; idx?: number; size?: string; textSize?: string }) => (
  <div className={`${size} rounded-full ${AVATAR_COLORS[(name?.charCodeAt(0) || idx) % AVATAR_COLORS.length]} flex items-center justify-center font-black ${textSize} flex-shrink-0 shadow-xs ring-1.5 ring-white dark:ring-[#111C24]`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

// ── Top KPI Stat Card (Ultra-Compact, High-Density SaaS Style) ────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }: {
  label: string; value: string | number; trend: string; isUp: boolean; period: string; strokeColor: string; Icon: any; iconBg: string; iconColor: string;
}) => {
  const gradId = `sk-lead-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/90 dark:border-slate-800 p-2 sm:p-2.5 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-4 h-4 rounded flex items-center justify-center ${iconBg} shrink-0`}>
            <Icon size={10} style={{ color: iconColor }} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">{label}</span>
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-0.5 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[9.5px]">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={8} strokeWidth={2.5} /> : <ArrowDown size={8} strokeWidth={2.5} />}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-6 w-10 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0">
        <svg className="w-full h-full" viewBox="0 0 48 32" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d="M0 26 C6 20, 10 24, 16 18 C22 12, 28 22, 34 10 C40 4, 44 8, 48 4 L48 32 L0 32 Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M0 26 C6 20, 10 24, 16 18 C22 12, 28 22, 34 10 C40 4, 44 8, 48 4"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

// ── Custom Select Dropdown (Compact) ──────────────────────────────────────────
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
        className={`flex items-center justify-between gap-1.5 px-2.5 h-7.5 bg-white dark:bg-[#111C24] border rounded-lg text-xs font-semibold transition-all w-full min-w-0 sm:min-w-[110px] shadow-2xs cursor-pointer ${isOpen ? "border-amber-500 ring-2 ring-amber-500/10 text-amber-600 dark:text-amber-400" : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 text-slate-400 shrink-0 ${isOpen ? "rotate-180 text-amber-500" : ""}`} />
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

// ── Contact Card Component (Ultra-Compact, High-Density SaaS CRM Card) ────────────────
const ContactCard = ({ lead, onClick, onDelete, onStatusChange, isSelected, onToggleSelect }: {
  lead: any; onClick: () => void; onDelete: (id: string, name: string) => void; onStatusChange: (lead: any, rect: DOMRect) => void;
  isSelected?: boolean; onToggleSelect?: () => void;
}) => {
  const statusColor = lead.status?.color || "#F97316";
  const displayPhone = lead.whatsappPhone || lead.phone || "";
  const cleanPhone = displayPhone.replace(/[^0-9]/g, "");

  return (
    <div 
      onClick={onClick}
      className={`group relative flex flex-col bg-white dark:bg-[#111C24] rounded-xl border p-2.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden isolate ${
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

      {/* Row 1: Checkbox, Avatar, Name & Status Pill */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 relative z-10">
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
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 border shadow-2xs"
            style={{ 
              backgroundColor: `${statusColor}14`, 
              borderColor: `${statusColor}30`, 
              color: statusColor 
            }}
          >
            {(lead.name || "LD").slice(0, 2).toUpperCase()}
          </div>
          <h4 className="font-extrabold text-[13px] text-slate-900 dark:text-white leading-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {lead.name}
          </h4>
        </div>

        {/* Status Dropdown Trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(lead, (e.currentTarget as HTMLButtonElement).getBoundingClientRect());
          }}
          className="px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[9.5px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
          <span className="text-slate-700 dark:text-slate-200">{lead.status?.name || "New"}</span>
          <ChevronDown size={9} className="text-slate-400" />
        </button>
      </div>

      {/* Row 2: Phone & Deal Value */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[11px]">
        <div className="flex items-center gap-1 min-w-0">
          <Phone size={10} className="text-slate-400 shrink-0" />
          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px] tracking-tight">
            {displayPhone || "No Mobile"}
          </span>
          {lead.whatsappOptIn && (
            <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-200/60 shrink-0">
              OPT-IN
            </span>
          )}
        </div>

        {lead.estimatedValue ? (
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
            ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
          </span>
        ) : null}
      </div>

      {/* Row 3: Requirement / Company & Assigned Agent */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[10.5px]">
        <span className="text-slate-600 dark:text-slate-400 font-medium truncate flex-1">
          {lead.company || lead.productService || "General Lead"}
        </span>

        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60 shrink-0 max-w-[100px] truncate">
          <UserCheck size={9} className="text-indigo-500 shrink-0" />
          <span className="truncate">{lead.assignedTo?.name || "Unassigned"}</span>
        </span>
      </div>

      {/* Tags (if any) */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 z-10 relative">
          {lead.tags.slice(0, 3).map((tag: any) => (
            <span 
              key={tag.id || tag.name} 
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold border"
              style={{
                backgroundColor: `${tag.color || '#D97706'}15`,
                color: tag.color || '#D97706',
                borderColor: `${tag.color || '#D97706'}30`
              }}
            >
              <Tag size={7} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: Footer (Source, Date & Quick 1-Click Action Buttons) */}
      <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Active"}</span>
          <span>•</span>
          <span className="text-slate-400 font-medium truncate max-w-[70px]">{lead.source || "Walk-in"}</span>
        </div>

        <div className="flex items-center gap-1">
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-5.5 h-5.5 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-2xs"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={10} />
            </a>
          )}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-5.5 h-5.5 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-2xs"
              title="Call Contact"
            >
              <Phone size={10} />
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lead.id, lead.name);
            }}
            className="w-5.5 h-5.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all cursor-pointer"
            title="Delete Contact"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

function StatusPopover({
  lead, statuses, onChanged, onOptimisticUpdate, onClose, anchorRect,
}: { lead: any; statuses: any[]; onChanged: () => void; onOptimisticUpdate: (statusId: string, statusObj: any) => void; onClose: () => void; anchorRect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

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
    // ── Optimistic update: reflect new status in UI immediately ──
    const newStatus = statuses.find(s => s.id === statusId);
    onOptimisticUpdate(statusId, newStatus);
    onClose();
    try {
      await api.patch(`/api/leads/${lead.id}/status`, { statusId });
      success('Status updated');
      onChanged();
    } catch (err: any) {
      // Revert to original status on failure
      onOptimisticUpdate(lead.statusId, statuses.find(s => s.id === lead.statusId));
      error('Failed to update status', err.message);
    }
  };

  const dropdownHeight = Math.min(statuses.length * 36 + 40, 320);
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const top = spaceBelow > dropdownHeight + 8
    ? anchorRect.bottom + 4
    : anchorRect.top - dropdownHeight - 4;

  return createPortal(
    <div ref={ref} className="fixed z-[9999] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 min-w-[180px] animate-fadeIn" style={{ top, left: anchorRect.left }}>
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
  const [viewMode, setViewMode] = useState<'cards' | 'kanban' | 'list'>('list');
  const [showStatusCards, setShowStatusCards] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [selectedOptIn, setSelectedOptIn] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusPopoverLeadId, setStatusPopoverLeadId] = useState<string | null>(null);
  const [statusPopoverRect, setStatusPopoverRect] = useState<DOMRect | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapPlacesModal, setShowMapPlacesModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true" || searchParams.get("openCreate") === "true") {
      setShowAddModal(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddLeadError(null);
    if (searchParams.get("create") || searchParams.get("openCreate")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      newParams.delete("openCreate");
      setSearchParams(newParams, { replace: true });
    }
  };

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
  const [showQuickAddSource, setShowQuickAddSource] = useState(false);
  const [quickSourceName, setQuickSourceName] = useState('');
  const [savingQuickSource, setSavingQuickSource] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [showManageProductsModal, setShowManageProductsModal] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [savingQuickProduct, setSavingQuickProduct] = useState(false);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductText, setCustomProductText] = useState('');

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
      const res = await api.get('/api/company/employees?limit=1000&module=leads');
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

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      const list = Array.isArray(res) ? res : (res?.products || res?.data || []);
      setProducts(list);
    } catch (_) { }
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim()) return;
    setSavingQuickProduct(true);
    try {
      const res = await api.post('/api/products', {
        name: quickProductName.trim(),
        price: quickProductPrice ? Number(quickProductPrice) : 0,
      });
      await fetchProducts();
      const createdName = res?.name || quickProductName.trim();
      setNewLead(prev => ({ ...prev, productService: createdName }));
      setQuickProductName('');
      setQuickProductPrice('');
      setShowQuickAddProduct(false);
      success('Product/Service created and selected!');
    } catch (err: any) {
      error('Failed to create product', err.message);
    } finally {
      setSavingQuickProduct(false);
    }
  };

  const handleCreateProductCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim()) return;
    setSavingQuickProduct(true);
    try {
      await api.post('/api/products', {
        name: quickProductName.trim(),
        price: quickProductPrice ? Number(quickProductPrice) : 0,
        description: newProductDesc.trim(),
      });
      await fetchProducts();
      setQuickProductName('');
      setQuickProductPrice('');
      setNewProductDesc('');
      success('Product/Service added to catalog!');
    } catch (err: any) {
      error('Failed to create product', err.message);
    } finally {
      setSavingQuickProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.delete(`/api/products/${id}`);
      await fetchProducts();
      success('Product/Service removed from catalog');
    } catch (err: any) {
      error('Failed to delete product', err.message);
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

  const fetchLeads = async (page = 1, overrideParams?: { search?: string; statusId?: string; optInState?: string; source?: string; tagId?: string; assignedTo?: string; productService?: string; activeTab?: string }) => {
    setLoading(true);
    try {
      const qSearch = overrideParams?.search !== undefined ? overrideParams.search : search;
      const qStatusId = overrideParams?.statusId !== undefined ? overrideParams.statusId : selectedStatusId;
      const qOptIn = overrideParams?.optInState !== undefined ? overrideParams.optInState : selectedOptIn;
      const qSource = overrideParams?.source !== undefined ? overrideParams.source : selectedSource;
      const qTagId = overrideParams?.tagId !== undefined ? overrideParams.tagId : selectedTagId;
      const qAssignee = overrideParams?.assignedTo !== undefined ? overrideParams.assignedTo : selectedAssignee;
      const qProduct = overrideParams?.productService !== undefined ? overrideParams.productService : selectedProduct;
      const qTab = overrideParams?.activeTab !== undefined ? overrideParams.activeTab : activeTab;

      let url = `/api/leads?page=${page}&limit=${pagination.limit}`;
      if (qSearch) url += `&search=${encodeURIComponent(qSearch)}`;
      if (qStatusId) url += `&statusId=${qStatusId}`;
      if (qOptIn) url += `&optInState=${qOptIn}`;
      if (qSource) url += `&source=${qSource}`;
      if (qTagId) url += `&tagId=${qTagId}`;
      if (qAssignee) url += `&assignedTo=${encodeURIComponent(qAssignee)}`;
      if (qProduct) url += `&productService=${encodeURIComponent(qProduct)}`;

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

  useEffect(() => { fetchStatuses(); fetchSources(); fetchTags(); fetchProducts(); fetchEmployees(); fetchStats(); }, []);
  useEffect(() => { fetchLeads(1); }, [search, selectedStatusId, selectedOptIn, selectedSource, selectedTagId, selectedAssignee, selectedProduct, activeTab]);

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
      handleCloseAddModal();
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
    return [selectedStatusId, selectedOptIn, selectedSource, selectedTagId, selectedAssignee, selectedProduct].filter(Boolean).length;
  }, [selectedStatusId, selectedOptIn, selectedSource, selectedTagId, selectedAssignee, selectedProduct]);

  // Stat calculations
  const totalLeadsCount = pagination.total || leads.length;
  const optedInCount = leads.filter(l => l.whatsappOptIn).length;
  const newLeadsCount = leads.filter(l => l.status?.name?.toLowerCase().includes('new')).length;

  const dateTabs: ('All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month')[] = ["All Time", "Today", "Yesterday", "This Week", "This Month"];

  return (
    <div className="animate-fadeIn space-y-2.5 max-w-[1440px] mx-auto pt-0 pb-8 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Page Header (Ultra-Compact SaaS Header) ────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            Contacts & Leads Pipeline
          </h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage customer profiles, lead stages, tags, and automated workflows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 relative z-30">
          <button 
            type="button"
            onClick={() => setShowMapPlacesModal(true)} 
            className="flex items-center gap-1 px-2.5 h-7.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/80 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <MapPin size={12} className="text-blue-600 dark:text-blue-400" /> Map Leads
          </button>

          <button 
            type="button"
            onClick={() => setShowManageProductsModal(true)} 
            className="flex items-center gap-1 px-2.5 h-7.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Package size={12} className="text-amber-500" /> Products & Services ({products.length})
          </button>

          <button 
            type="button"
            onClick={() => { setImportStep(1); setShowImportModal(true); }} 
            className="flex items-center gap-1 px-2.5 h-7.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Upload size={12} className="text-slate-400" /> Import Leads
          </button>

          <button
            type="button"
            onClick={fetchPublicToken}
            className="flex items-center gap-1 px-2.5 h-7.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <Share2 size={12} className="text-amber-500" /> Share Form Link
          </button>
          
          <button 
            type="button"
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-1.5 px-3 h-7.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow-md transition-all shrink-0 cursor-pointer"
          >
            <UserPlus size={13} strokeWidth={2.5} /> Add Contact
          </button>
        </div>
      </div>

      {/* ── Top 5 KPI Stat Cards (Compact Real-Time Database Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <KPICard label="Total Contacts" value={leadStats.totalContacts || pagination.total || leads.length} trend="Live" isUp period="database" strokeColor="#EAB308" Icon={Users} iconBg="bg-amber-500/10" iconColor="#D97706" />
        <KPICard label="WhatsApp Leads" value={leadStats.optedInCount} trend="Verified" isUp period="database" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="New Inquiries" value={leadStats.newLeadsCount} trend="Recent" isUp period="database" strokeColor="#06B6D4" Icon={UserPlus} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Pipeline Stages" value={leadStats.pipelineStagesCount || (Array.isArray(statuses) ? statuses.length : 5)} trend="Active" isUp period="configured" strokeColor="#8B5CF6" Icon={Sparkles} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Active Tags" value={leadStats.activeTagsCount || (Array.isArray(tags) ? tags.length : 0)} trend="Labels" isUp period="registry" strokeColor="#F43F5E" Icon={Tag} iconBg="bg-rose-500/10" iconColor="#E11D48" />
      </div>

      {/* ── UNIFIED FILTER & TIMEFRAME CARD CONTAINER (Compact) ──────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 space-y-2 shadow-2xs">
        
        {/* ── Row 1: Time Boundary Date Pill Tabs + View Switcher ───────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar flex-1 min-w-0">
            {dateTabs.map((tabName) => {
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveTab(tabName);
                    setSelectedStatusId("");
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shrink-0 ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                      : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <span>{tabName}</span>
                </button>
              );
            })}
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1E293B] p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/80 shadow-2xs gap-0.5 h-7 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setViewMode("cards")}
              title="Grid Cards View"
              className={`flex items-center justify-center gap-1 px-2 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid size={12} /> <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`flex items-center justify-center gap-1 px-2 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Kanban size={12} /> <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Table List View"
              className={`flex items-center justify-center gap-1 px-2 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <List size={12} /> <span>List</span>
            </button>
          </div>
        </div>

        {/* ── Row 2: Pipeline Status Filter Pills ───────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSelectedStatusId("")}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shrink-0 ${
              !selectedStatusId
                ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                : "bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <span>All Contacts</span>
            <span className={`px-1 py-0.1 rounded text-[9px] font-black ${
              !selectedStatusId
                ? "bg-white/20 text-white"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}>
              {totalLeadsCount}
            </span>
          </button>

          {statuses.map((st) => {
            const isSelected = selectedStatusId === st.id;
            const count = leadStats.statusCounts?.[st.id] !== undefined
              ? leadStats.statusCounts[st.id]
              : leads.filter(l => l.statusId === st.id || l.status?.id === st.id).length;
            const chipCfg = getLeadStatusColorStyle(st.name, st.color);

            return (
              <button
                key={st.id}
                onClick={() => setSelectedStatusId(prev => prev === st.id ? "" : st.id)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shrink-0 ${
                  isSelected
                    ? chipCfg.pillActive
                    : chipCfg.pillInactive
                }`}
              >
                <span>{st.name}</span>
                <span className={`px-1 py-0.1 rounded text-[9px] font-black ${
                  isSelected
                    ? chipCfg.badgeActive
                    : chipCfg.badgeInactive
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTAINER (UNIFIED SAAS CARD FOR TOOLBAR & CONTENT) ── */}
      <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        
        {/* Table/Cards Integrated Toolbar Row */}
        <div className="bg-slate-50/70 dark:bg-[#0D1321]/60 border-b border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 flex flex-wrap xl:flex-nowrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] group">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search team member or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-7.5 bg-white dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 focus:border-amber-500 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full xl:w-auto">
            {/* Source */}
            <CustomSelect
              value={selectedSource}
              onChange={setSelectedSource}
              options={(Array.isArray(sources) ? sources : []).map(s => ({ value: s.name, label: s.name }))}
              defaultLabel="All Sources"
            />

            {/* Assigned Staff */}
            {employees.length > 0 && (
              <CustomSelect
                value={selectedAssignee}
                onChange={setSelectedAssignee}
                options={[
                  { value: 'unassigned', label: 'Unassigned Pool' },
                  ...employees.map(e => ({ value: e.id || e._id, label: e.name }))
                ]}
                defaultLabel="All Staff"
              />
            )}

            {/* Products & Services */}
            {products.length > 0 && (
              <CustomSelect
                value={selectedProduct}
                onChange={setSelectedProduct}
                options={products.map(p => ({ value: p.name, label: p.name }))}
                defaultLabel="All Products"
              />
            )}

            {/* WhatsApp Consent */}
            <CustomSelect
              value={selectedOptIn}
              onChange={setSelectedOptIn}
              options={[
                { value: 'true', label: 'WhatsApp Opted In' },
                { value: 'false', label: 'Not Opted In' }
              ]}
              defaultLabel="Consent: All"
            />

            {/* Tags */}
            {tags.length > 0 && (
              <CustomSelect
                value={selectedTagId}
                onChange={setSelectedTagId}
                options={tags.map(t => ({ value: t.id || t._id, label: t.name }))}
                defaultLabel="All Tags"
              />
            )}

            {/* Reset Filter Button */}
            {(selectedSource || selectedAssignee || selectedProduct || selectedOptIn || selectedTagId || selectedStatusId) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSource('');
                  setSelectedAssignee('');
                  setSelectedProduct('');
                  setSelectedOptIn('');
                  setSelectedTagId('');
                  setSelectedStatusId('');
                }}
                className="px-2 h-7.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <X size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Bulk Action Bar ────────────────────────────────────────────────── */}
        {someChecked && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="font-extrabold text-slate-900 dark:text-white">{checkedIds.size} contacts selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Bulk Assign Employee */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold text-[10.5px]">Assign:</span>
                <select
                  className="h-7 px-2 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none max-w-[180px]"
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
                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isLoading('bulk-assign') ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  Assign
                </button>
              </div>

              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold text-[10.5px]">Status:</span>
                <select
                  className="h-7 px-2 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
                  value={bulkStatusId}
                  onChange={e => setBulkStatusId(e.target.value)}
                >
                  <option value="">Pick status…</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  onClick={handleBulkStatus}
                  disabled={!bulkStatusId || isLoading('bulk-status')}
                  className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white font-extrabold rounded-lg transition-all cursor-pointer"
                >
                  {isLoading('bulk-status') ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                </button>
              </div>

              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold text-[10.5px]">Tag:</span>
                <select
                  className="h-7 px-2 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
                  value={bulkTagId}
                  onChange={e => setBulkTagId(e.target.value)}
                >
                  <option value="">Select Tag…</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => handleBulkTag('add')}
                  disabled={!bulkTagId || isLoading('bulk-tag')}
                  className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 text-white font-extrabold rounded-lg transition-all cursor-pointer"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleBulkDelete}
                disabled={isLoading('bulk-delete')}
                className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg transition-all flex items-center gap-1 ml-1 cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </button>

              <button
                onClick={() => setCheckedIds(new Set())}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Main View Content Area (Cards vs Kanban vs List) ──────────────── */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-36 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5 border border-amber-500/20">
                <UserPlus size={22} strokeWidth={2} />
              </div>
              <p className="text-slate-900 dark:text-white font-extrabold text-sm">No contacts found</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">{activeCustomFiltersCount > 0 ? 'Try adjusting your status filter or search' : 'Add your first contact to get started'}</p>
            </div>
          ) : viewMode === "cards" ? (
            /* ── GRID CARDS VIEW ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 p-2.5">
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
            <div className="flex overflow-x-auto gap-3 p-3 custom-scrollbar snap-x">
              {(Array.isArray(statuses) ? statuses : []).map(status => {
                const stageLeads = (Array.isArray(leads) ? leads : []).filter(l => 
                  (l.statusId && (String(l.statusId) === String(status.id) || String(l.statusId) === String(status._id))) ||
                  (l.status?.id && String(l.status.id) === String(status.id)) ||
                  (l.status?._id && String(l.status._id) === String(status.id)) ||
                  (l.status?.name && status.name && String(l.status.name).toLowerCase() === String(status.name).toLowerCase())
                );
                return (
                  <div key={status.id} className="w-[260px] sm:w-[290px] shrink-0 snap-center flex flex-col bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 min-h-[460px]">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800 mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color || '#EAB308' }} />
                        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">{status.name}</h3>
                      </div>
                      <span className="text-[9.5px] font-black text-slate-500 bg-white dark:bg-[#111C24] px-1.5 py-0.2 rounded border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[700px] hide-scrollbar pr-0.5">
                      {stageLeads.length === 0 ? (
                        <div className="h-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-[10.5px] font-medium text-slate-400">
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
            /* ── ENTERPRISE COMPACT TABLE LIST VIEW ── */
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                    <th className="px-2.5 py-2 w-8">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded accent-amber-500 cursor-pointer" />
                    </th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Contact Name</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">WhatsApp Number</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Assigned Rep</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Pipeline Stage</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Product Interest</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Source</th>
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">Date Added</th>
                    <th className="px-3 py-2 font-bold text-right whitespace-nowrap w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {leads.map(lead => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLeadId(lead.id)} 
                      className={`hover:bg-amber-500/[0.03] dark:hover:bg-amber-500/[0.04] transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/60 ${
                        checkedIds.has(lead.id) ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="px-2.5 py-1.5" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={checkedIds.has(lead.id)} 
                          onChange={() => toggleOne(lead.id)} 
                          className="rounded accent-amber-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <MiniAvatar name={lead.name} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                              {lead.name}
                            </p>
                            {lead.email && <p className="text-[10px] text-slate-400 font-normal truncate">{lead.email}</p>}
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-0.5">
                                {lead.tags.map((tag: any) => (
                                  <span 
                                    key={tag.id} 
                                    className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8.5px] font-bold border"
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
                          </div>
                        </div>
                      </td>

                      <td className="px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.whatsappPhone || lead.phone || "—"}
                      </td>

                      <td className="px-2.5 py-1.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                          <UserCheck size={10} className="text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[100px]">{lead.assignedTo?.name || "Unassigned"}</span>
                        </span>
                      </td>

                      <td className="px-2.5 py-1.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            <StatusBadge name={lead.status?.name} color={lead.status?.color} />
                            <ChevronDown size={10} className="text-slate-400" />
                          </button>
                          {statusPopoverLeadId === lead.id && statusPopoverRect && (
                            <StatusPopover
                              lead={lead}
                              statuses={statuses}
                              anchorRect={statusPopoverRect}
                              onOptimisticUpdate={(statusId, statusObj) => {
                                setLeads(prev => prev.map(l =>
                                  l.id === lead.id
                                    ? { ...l, statusId, status: statusObj }
                                    : l
                                ));
                              }}
                              onChanged={() => fetchLeads(pagination.page)}
                              onClose={() => { setStatusPopoverLeadId(null); setStatusPopoverRect(null); }}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[130px] truncate">
                        {lead.productService || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>

                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 max-w-[120px] truncate">
                          {lead.source || "Direct"}
                        </span>
                      </td>

                      <td className="px-2.5 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                      </td>

                      <td className="px-3 py-1.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedLeadId(lead.id)} 
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye size={11} /> Open
                          </button>
                          <button
                            onClick={() => handleDeleteOne(lead.id, lead.name)}
                            disabled={isLoading(`delete-${lead.id}`)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Contact"
                          >
                            {isLoading(`delete-${lead.id}`) ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
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
          <div className="bg-slate-50/70 dark:bg-[#0D1321]/60 px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Showing <span className="font-bold text-slate-900 dark:text-white">{leads.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> contacts</span>
            
            <div className="flex items-center gap-1.5">
              <button 
                disabled={pagination.page === 1} 
                onClick={() => fetchLeads(pagination.page - 1)} 
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{pagination.page} / {pagination.totalPages}</span>
              <button 
                disabled={pagination.page === pagination.totalPages} 
                onClick={() => fetchLeads(pagination.page + 1)} 
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C24] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={13} />
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

      {/* ── ADD CONTACT MODAL (EXECUTIVE REDESIGN) ─────────────────────────── */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0A0F18] rounded-3xl border border-slate-200 dark:border-slate-800/90 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleUp max-h-[92vh] flex flex-col text-xs">
            {/* Modal Luxury Header */}
            <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md">
                  <UserPlus size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                    Add New Contact / Lead
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Register customer profile, product requirement & assign sales rep
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleCloseAddModal} 
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {addLeadError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
                  <span>{addLeadError}</span>
                  <button type="button" onClick={() => setAddLeadError(null)} className="cursor-pointer"><X size={14} /></button>
                </div>
              )}

              {/* Section 1: Customer Contact Details */}
              <div className="p-4 bg-slate-50 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl space-y-3 shadow-2xs">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User size={13} className="text-amber-500" />
                  Customer Contact Information
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        required 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30" 
                        placeholder="e.g. Rameshwar Shinde" 
                        value={newLead.name} 
                        onChange={e => setNewLead({ ...newLead, name: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="tel" 
                        required 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono" 
                        placeholder="e.g. 9689119006" 
                        value={newLead.whatsappPhone} 
                        onChange={e => setNewLead({ ...newLead, whatsappPhone: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Secondary Phone (Optional)
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="tel" 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono" 
                        placeholder="e.g. 9822001122" 
                        value={newLead.phone} 
                        onChange={e => setNewLead({ ...newLead, phone: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30" 
                        placeholder="client@gmail.com" 
                        value={newLead.email} 
                        onChange={e => setNewLead({ ...newLead, email: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Requirement & Product Interest */}
              <div className="p-4 bg-slate-50 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl space-y-3 shadow-2xs">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Package size={13} className="text-amber-500" />
                  Product Requirement & Lead Source
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Product / Service Required
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddProduct(true)}
                        className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={11} strokeWidth={2.5} /> Add New
                      </button>
                    </div>
                    <div className="relative">
                      <Package size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
                        value={isCustomProduct ? '__CUSTOM__' : newLead.productService}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '__ADD_NEW__') {
                            setShowQuickAddProduct(true);
                          } else if (val === '__CUSTOM__') {
                            setIsCustomProduct(true);
                            setNewLead({ ...newLead, productService: customProductText });
                          } else {
                            setIsCustomProduct(false);
                            setNewLead({ ...newLead, productService: val });
                          }
                        }}
                      >
                        <option value="">-- Select Product / Service --</option>
                        {(Array.isArray(products) ? products : []).map(prod => (
                          <option key={prod.id || prod._id} value={prod.name}>
                            {prod.name} {prod.price ? `(₹${Number(prod.price).toLocaleString()})` : ''}
                          </option>
                        ))}
                        <option value="__CUSTOM__" className="text-blue-600 font-bold">
                          ✍️ Other / Custom Requirement (Type manually)...
                        </option>
                        <option value="__ADD_NEW__" className="text-amber-600 font-bold">
                          + Add New to Catalog...
                        </option>
                      </select>
                    </div>

                    {isCustomProduct && (
                      <div className="mt-2 animate-fadeIn">
                        <input
                          type="text"
                          autoFocus
                          required
                          placeholder="Type custom product or service requirement..."
                          value={customProductText}
                          onChange={e => {
                            setCustomProductText(e.target.value);
                            setNewLead({ ...newLead, productService: e.target.value });
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-400 dark:border-amber-600 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ring-1 ring-amber-500/30"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Lead Source
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddSource(true)}
                        className="text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        <Plus size={11} strokeWidth={3} /> Add Source
                      </button>
                    </div>
                    <div className="relative">
                      <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer" 
                        value={newLead.source} 
                        onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                      >
                        {(Array.isArray(sources) ? sources : []).map(src => <option key={src.name} value={src.name}>{src.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Stage, Assign & Notes */}
              <div className="p-4 bg-slate-50 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl space-y-3 shadow-2xs">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-500" />
                  Pipeline Stage & Assignment
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Pipeline Status
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddStatus(true)}
                        className="text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        <Plus size={11} strokeWidth={3} /> Add Status
                      </button>
                    </div>
                    <div className="relative">
                      <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer" 
                        value={newLead.statusId} 
                        onChange={e => setNewLead({ ...newLead, statusId: e.target.value })}
                      >
                        {(Array.isArray(statuses) ? statuses : []).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Assign to Sales Rep / Employee
                    </label>
                    <div className="relative">
                      <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
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
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Initial Inquiry Notes (Optional)
                  </label>
                  <div className="relative">
                    <FileText size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <textarea
                      rows={2}
                      value={newLead.notes}
                      onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                      placeholder="Enter client background, specific expectations or requirement notes..."
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleCloseAddModal} 
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingLead} 
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {savingLead ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{savingLead ? 'Saving...' : 'Save & Add Contact'}</span>
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

      {/* Quick Add Product Modal */}
      {showQuickAddProduct && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={16} className="text-amber-500" /> Add Product / Service
              </h3>
              <button onClick={() => setShowQuickAddProduct(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickCreateProduct} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Product / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile App, ERP Solution"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  value={quickProductName}
                  onChange={e => setQuickProductName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Default Price / Value (₹) (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  value={quickProductPrice}
                  onChange={e => setQuickProductPrice(e.target.value)}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddProduct(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickProduct || !quickProductName.trim()}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingQuickProduct ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                  <span>{savingQuickProduct ? 'Saving...' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MANAGE PRODUCTS & SERVICES CATALOG MODAL (ULTRA-PROFESSIONAL REDESIGN) ── */}
      {showManageProductsModal && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0A0F18] rounded-3xl border border-slate-200 dark:border-slate-800/90 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleUp max-h-[92vh] flex flex-col text-xs">
            {/* Executive Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md">
                  <Package size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                    Products & Services Catalog
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Configure company catalog, valuations & dynamic lead offerings
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowManageProductsModal(false)} 
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Add New Product Card */}
              <div className="p-4 bg-slate-50 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Plus size={13} strokeWidth={3} /> Add Product or Service
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Real-time sync to all lead forms</span>
                </div>

                <form onSubmit={handleCreateProductCatalog} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Product / Service Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Package size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. ERP Automation Solution"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#080D14] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                          value={quickProductName}
                          onChange={e => setQuickProductName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Default Valuation / Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 50000"
                          className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-[#080D14] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-mono"
                          value={quickProductPrice}
                          onChange={e => setQuickProductPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Deliverables / Short Description (Optional)
                    </label>
                    <div className="relative">
                      <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Custom corporate portal with WhatsApp automated workflow"
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-[#080D14] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                        value={newProductDesc}
                        onChange={e => setNewProductDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingQuickProduct || !quickProductName.trim()}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {savingQuickProduct ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
                      <span>{savingQuickProduct ? 'Adding...' : 'Save to Catalog'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Products Catalog List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span className="uppercase tracking-wider text-[10px] text-slate-400 font-extrabold">
                    Active Catalog Items ({products.length})
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">● Available Live</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {products.length > 0 ? (
                    products.map((prod) => (
                      <div
                        key={prod.id || prod._id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-[#111927] transition-all text-xs group"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                              {prod.name}
                            </span>
                            {prod.price ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-[11px] border border-emerald-200/80 dark:border-emerald-800 shrink-0">
                                ₹{Number(prod.price).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono italic">Custom Quote</span>
                            )}
                          </div>
                          {prod.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {prod.description}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id || prod._id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer shrink-0 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60"
                          title="Delete from catalog"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
                      <Package size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="font-bold">No products or services in catalog yet.</p>
                      <p className="text-[11px] text-slate-400">Add your first offering above to enable dynamic selection.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070B12] flex items-center justify-between shrink-0">
              <span className="text-[10.5px] text-slate-400 font-medium">
                Changes take effect across all employee & HR forms instantly
              </span>
              <button
                type="button"
                onClick={() => setShowManageProductsModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MAP PLACES LEAD FINDER MODAL ── */}
      {showMapPlacesModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#111C24] rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-4">
            <MapPlacesSearch
              isModal={true}
              onClose={() => setShowMapPlacesModal(false)}
              onImportSuccess={() => {
                fetchLeads(1);
                fetchStats();
              }}
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

