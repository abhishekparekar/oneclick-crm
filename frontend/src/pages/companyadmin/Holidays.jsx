import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getHolidaysApi, createHolidayApi, updateHolidayApi, deleteHolidayApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  CalendarDays, Plus, Edit2, Trash2, Flag, X, Save, AlertCircle, Sun, Moon, TreePine,
  Sparkles, ArrowUp, ArrowDown, ShieldCheck, Loader2
} from "lucide-react";

/* ── Top KPI Stat Card ────────────────────────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-hol-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-hol-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Holidays = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({ name: "", date: "", type: "public", description: "" });
  const [error, setError] = useState("");

  const { data: res, isLoading } = useQuery({ queryKey: ["holidays"], queryFn: getHolidaysApi });

  const createMutation = useMutation({
    mutationFn: createHolidayApi,
    onSuccess: () => { queryClient.invalidateQueries(["holidays"]); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to create holiday")
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHolidayApi(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["holidays"]); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || "Failed to update holiday")
  });
  const deleteMutation = useMutation({
    mutationFn: deleteHolidayApi,
    onSuccess: () => queryClient.invalidateQueries(["holidays"]),
  });

  const openModal = (holiday = null) => {
    setError("");
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date ? holiday.date.slice(0, 10) : "",
        type: holiday.type || "public",
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
      setFormData({ name: "", date: "", type: "public", description: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingHoliday(null);
      setError("");
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingHoliday) updateMutation.mutate({ id: editingHoliday._id, data: formData });
    else createMutation.mutate(formData);
  };

  const holidays = res?.data?.holidays || res?.data || [];

  // Group by month
  const grouped = {};
  holidays.forEach((h) => {
    const month = h.date ? new Date(h.date).toLocaleString("default", { month: "long", year: "numeric" }) : "Unknown";
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(h);
  });

  const publicCount = holidays.filter(h => h.type === "public" || !h.type).length;
  const optionalCount = holidays.filter(h => h.type === "optional" || h.type === "restricted").length;

  const typeStyles = {
    public: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", icon: <Sun size={12} className="mr-1.5" /> },
    optional: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", icon: <Moon size={12} className="mr-1.5" /> },
    restricted: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", icon: <TreePine size={12} className="mr-1.5" /> },
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Company Holiday Calendar <CalendarDays size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage official public holidays, optional leaves, and company shutdown dates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Total Holidays" value={holidays.length} trend="Annual" isUp period="calendar" strokeColor="#06B6D4" Icon={CalendarDays} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Public Holidays" value={publicCount} trend="Mandatory" isUp period="coverage" strokeColor="#10B981" Icon={Sun} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Optional & Restricted" value={optionalCount} trend="Elective" isUp period="options" strokeColor="#8B5CF6" Icon={Moon} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Active Calendar" value="2026 Year" trend="Updated" isUp period="status" strokeColor="#EAB308" Icon={Sparkles} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Calendar...</p>
        </div>
      ) : holidays.length === 0 ? (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={28} />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Holidays Added</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            Add holidays to establish your company schedule for leave planning.
          </p>
          <button
            onClick={() => openModal()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Holiday</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month} className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-amber-500" />
                  <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{month}</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {items.length} {items.length === 1 ? 'Holiday' : 'Holidays'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {items.map((h) => {
                  const tStyle = typeStyles[h.type] || typeStyles.public;
                  return (
                    <div key={h._id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex-shrink-0">
                          <span className="text-[10px] font-bold text-amber-500 uppercase leading-none mb-0.5">
                            {h.date ? new Date(h.date).toLocaleString("default", { month: "short" }) : ""}
                          </span>
                          <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                            {h.date ? new Date(h.date).getDate() : "--"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs">{h.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${tStyle.bg} ${tStyle.text} ${tStyle.border}`}>
                              {tStyle.icon}
                              {h.type || "Public"}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-400">
                            {h.date ? new Date(h.date).toLocaleString("default", { weekday: "long" }) : ""}
                            {h.description && (
                              <span className="ml-2 font-normal text-slate-400">• {h.description}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(h)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors rounded-lg"
                          title="Edit Holiday"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => window.confirm("Are you sure you want to delete this holiday?") && deleteMutation.mutate(h._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors rounded-lg"
                          title="Delete Holiday"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Slide-Over Drawer Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Configure holiday details</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form id="holidayForm" onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Holiday Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Independence Day"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Holiday Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="public">Public Holiday</option>
                  <option value="optional">Optional Holiday</option>
                  <option value="restricted">Restricted Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Brief summary of holiday..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5">
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                  <span>Save Holiday</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Holidays;
