import React, { useState, useEffect } from 'react';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import { useActionLoader } from '../../components/leads/ActionLoader';
import {
  MapPin, Search, Download, Check, Sparkles, Filter, Building2, Phone,
  Mail, Globe, Star, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight,
  ChevronRight, Layers, UserCheck, CheckSquare, Square, ExternalLink, HelpCircle
} from 'lucide-react';

const POPULAR_CATEGORIES = [
  { label: 'Hospitals & Clinics', keyword: 'Hospitals', icon: '🏥' },
  { label: 'IT Companies', keyword: 'IT Companies', icon: '💻' },
  { label: 'Restaurants & Cafes', keyword: 'Restaurants', icon: '🍽️' },
  { label: 'Real Estate & Builders', keyword: 'Real Estate', icon: '🏢' },
  { label: 'Schools & Colleges', keyword: 'Schools', icon: '🎓' },
  { label: 'Gyms & Fitness', keyword: 'Gyms', icon: '🏋️' },
  { label: 'Automobile & Garages', keyword: 'Automobile', icon: '🚗' },
  { label: 'CA & Legal Firms', keyword: 'Accountants', icon: '⚖️' },
];

const POPULAR_CITIES = ['Mumbai', 'Pune', 'Nashik', 'Bengaluru', 'Delhi', 'Hyderabad', 'Ahmedabad', 'Nagpur'];

interface MapPlace {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsappPhone: string;
  email: string | null;
  website: string | null;
  address: string;
  city: string;
  state?: string;
  category: string;
  rating: number;
  reviewsCount: number;
  lat?: number;
  lng?: number;
  source?: string;
  isAlreadyLead?: boolean;
}

interface MapPlacesSearchProps {
  onClose?: () => void;
  onImportSuccess?: () => void;
  isModal?: boolean;
}

export default function MapPlacesSearch({ onClose, onImportSuccess, isModal = false }: MapPlacesSearchProps) {
  const { success, error } = useToast();
  const { isLoading, run } = useActionLoader();

  const [keyword, setKeyword] = useState('Hospitals');
  const [city, setCity] = useState('Pune');
  const [limit, setLimit] = useState(25);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // CRM Configuration for Import
  const [statuses, setStatuses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [stRes, empRes] = await Promise.all([
        api.get('/api/statuses').catch(() => api.get('/api/leads/statuses').catch(() => [])),
        api.get('/api/assignable-users').catch(() => api.get('/api/leads/assignable-users').catch(() => [])),
      ]);

      const safeStatuses = Array.isArray(stRes?.data) ? stRes.data : Array.isArray(stRes) ? stRes : [];
      setStatuses(safeStatuses);
      if (safeStatuses.length > 0) {
        const def = safeStatuses.find((s: any) => s.isDefault) || safeStatuses[0];
        setSelectedStatusId(def.id || def._id);
      }

      const safeEmps = Array.isArray(empRes?.users)
        ? empRes.users
        : Array.isArray(empRes?.data)
        ? empRes.data
        : Array.isArray(empRes)
        ? empRes
        : [];
      setEmployees(safeEmps);
    } catch (_) {}
  };

  const handleSearch = async (overrideKeyword?: string, overrideCity?: string) => {
    const k = (overrideKeyword !== undefined ? overrideKeyword : keyword).trim();
    const c = (overrideCity !== undefined ? overrideCity : city).trim();

    if (!k && !c) {
      error('Please enter a business category or location to search.');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const res = await api.post('/api/leads/map-search', {
        keyword: k || 'Businesses',
        city: c || 'Mumbai',
        limit,
      });

      const results = Array.isArray(res?.places) ? res.places : [];
      setPlaces(results);

      // Pre-select non-duplicate leads
      const newIds = new Set<string>();
      results.forEach((p: MapPlace) => {
        if (!p.isAlreadyLead) newIds.add(p.id);
      });
      setSelectedIds(newIds);

      if (results.length === 0) {
        error(`No places found for "${k}" in "${c}". Try another category or city.`);
      } else {
        success(`Discovered ${results.length} places on Maps!`);
      }
    } catch (err: any) {
      error(err.message || 'Failed to search places on Maps');
    } finally {
      setSearching(false);
    }
  };

  const [hideDuplicates, setHideDuplicates] = useState(false);

  const displayedPlaces = hideDuplicates ? places.filter((p) => !p.isAlreadyLead) : places;
  const nonDuplicatePlaces = places.filter((p) => !p.isAlreadyLead);

  const toggleSelectAll = () => {
    if (selectedIds.size >= nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nonDuplicatePlaces.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string, isAlreadyLead?: boolean) => {
    if (isAlreadyLead) return; // Prevent selecting already existing leads
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    const selectedPlaces = places.filter((p) => selectedIds.has(p.id));
    if (selectedPlaces.length === 0) {
      error('Please select at least one place to import.');
      return;
    }

    await run('import-map-leads', async () => {
      try {
        const res = await api.post('/api/leads/map-import', {
          places: selectedPlaces,
          statusId: selectedStatusId || undefined,
          assignedTo: selectedAssignee || undefined,
          source: 'Google Maps / Map Search',
        });

        success(res.message || `Successfully imported ${res.createdCount || selectedPlaces.length} leads into CRM!`);

        if (onImportSuccess) {
          onImportSuccess();
        }

        // Re-mark imported places as isAlreadyLead
        setPlaces((prev) =>
          prev.map((p) => (selectedIds.has(p.id) ? { ...p, isAlreadyLead: true } : p))
        );
        setSelectedIds(new Set());
      } catch (err: any) {
        error(err.message || 'Failed to import map leads');
      }
    });
  };

  return (
    <div className={`space-y-4 ${isModal ? 'p-1' : 'p-4 max-w-7xl mx-auto'}`}>
      {/* ── HEADER BANNER ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles size={12} /> Live Map Lead Scraping & Finder
              </span>
              <span className="text-xs text-blue-200/70 font-mono">Google Maps & OSM Scraping</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Map Lead Scraping & Place Finder
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-2xl font-medium">
              Search any business category, city, or locality. Extract verified contact details, addresses, ratings, and save them directly into your OneClick CRM Leads pipeline.
            </p>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all self-start md:self-auto cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH CONTROL CARD ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Keyword / Category Input */}
          <div className="sm:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-600" /> Business Category / Keyword
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Hospitals, IT Companies, Hotels, Schools..."
                className="w-full h-11 pl-3.5 pr-4 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* City / Location Input */}
          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin size={14} className="text-rose-500" /> City / Locality
            </label>
            <div className="relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Mumbai, Pune, Baner, Andheri..."
                className="w-full h-11 pl-3.5 pr-4 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Limit Selector */}
          <div className="sm:col-span-1 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-11 px-2 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="sm:col-span-2">
            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {searching ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search size={16} /> Search Maps
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Category Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Popular:</span>
          {POPULAR_CATEGORIES.map((cat) => {
            const isSel = keyword.toLowerCase() === cat.keyword.toLowerCase();
            return (
              <button
                key={cat.keyword}
                onClick={() => {
                  setKeyword(cat.keyword);
                  handleSearch(cat.keyword, city);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSel
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick City Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Cities:</span>
          {POPULAR_CITIES.map((c) => {
            const isSel = city.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => {
                  setCity(c);
                  handleSearch(keyword, c);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSel
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0B101B] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SEARCH RESULTS & IMPORT BAR ─────────────────────────────── */}
      {hasSearched && (
        <div className="space-y-3">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                {selectedIds.size === nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0 ? (
                  <CheckSquare size={16} className="text-blue-600" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>
                  {selectedIds.size === nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0 ? 'Deselect All' : 'Select All'} ({selectedIds.size}/{nonDuplicatePlaces.length} new)
                </span>
              </button>

              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideDuplicates}
                  onChange={(e) => setHideDuplicates(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Hide CRM Duplicates</span>
              </label>

              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing <strong>{displayedPlaces.length}</strong> leads
              </span>
            </div>

            {/* Target CRM Status & Staff Assignment + Import CTA */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-500">Stage:</span>
                <select
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {statuses.map((st) => (
                    <option key={st.id || st._id} value={st.id || st._id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {employees.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-slate-500">Assign:</span>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id || emp._id} value={emp.id || emp._id}>
                        {emp.name || emp.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0 || isLoading('import-map-leads')}
                className="px-4 h-9 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-40"
              >
                {isLoading('import-map-leads') ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Import Selected ({selectedIds.size}) to CRM
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Place Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedPlaces.map((place, idx) => {
              const isSelected = selectedIds.has(place.id);
              return (
                <div
                  key={place.id || idx}
                  onClick={() => toggleSelect(place.id, place.isAlreadyLead)}
                  className={`bg-white dark:bg-[#111C24] border rounded-2xl p-4 transition-all relative flex flex-col justify-between cursor-pointer ${
                    place.isAlreadyLead
                      ? 'opacity-60 bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/10 dark:bg-blue-900/10'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  {/* Top row: Checkbox, Name, Dup Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          disabled={place.isAlreadyLead}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(place.id, place.isAlreadyLead);
                          }}
                          className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                            {place.name}
                          </h3>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {place.category}
                          </span>
                        </div>
                      </div>

                      {place.isAlreadyLead ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                          In CRM
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                          New Lead
                        </span>
                      )}
                    </div>

                    {/* Rating & Reviews */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold text-[11px]">
                        <Star size={11} className="fill-amber-500 text-amber-500" />
                        <span>{place.rating || 4.2}</span>
                      </div>
                      <span className="text-[11px] font-medium">({place.reviewsCount || 24} reviews)</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{place.city}</span>
                    </div>

                    {/* Details: Phone, Address, Email */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                      {place.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            +91 {place.phone}
                          </span>
                        </div>
                      )}

                      {place.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-blue-500 shrink-0" />
                          <span className="truncate text-slate-600 dark:text-slate-400">{place.email}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-slate-500 dark:text-slate-400 text-[11px]">
                          {place.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                    {place.phone ? (
                      <a
                        href={`https://wa.me/91${place.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>WhatsApp Chat</span> <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Map Verified</span>
                    )}

                    <span className="text-[10px] text-slate-400 font-medium">Source: Maps</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
