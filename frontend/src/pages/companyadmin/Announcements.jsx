import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanyAnnouncementsApi, createCompanyAnnouncementApi, deleteAnnouncementApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Megaphone, Plus, Trash2, Clock, Sparkles, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle2, Info, Bell, X, Check, Loader2,
  Calendar, ShieldAlert, Radio, User
} from "lucide-react";

// ── Top Compact KPI Stat Card ──────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 14 }, { v: 20 }, { v: 16 }, { v: 26 }, { v: 22 }, { v: 32 }, { v: 28 }, { v: 40 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{label}</span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 w-12 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={30}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-ann-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-ann-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Announcements = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [form, setForm] = useState({ title: "", message: "", type: "info" });

    const { data: res, isLoading } = useQuery({ queryKey: ["announcements"], queryFn: getCompanyAnnouncementsApi });

    const createMutation = useMutation({
        mutationFn: createCompanyAnnouncementApi,
        onSuccess: () => { queryClient.invalidateQueries(["announcements"]); setIsModalOpen(false); setForm({ title: "", message: "", type: "info" }); },
        onError: (err) => alert("Failed to create announcement: " + (err.response?.data?.message || err.message))
    });
    const deleteMutation = useMutation({
        mutationFn: deleteAnnouncementApi,
        onSuccess: () => queryClient.invalidateQueries(["announcements"]),
        onError: (err) => alert("Failed to delete announcement: " + (err.response?.data?.message || err.message))
    });

    const announcements = res?.data?.announcements || res?.data || [];

    const typeConfig = {
        info: {
          bg: "bg-blue-50/60 dark:bg-blue-950/20",
          border: "border-blue-200/60 dark:border-blue-900/40",
          badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          icon: Info,
          iconColor: "text-blue-500"
        },
        warning: {
          bg: "bg-amber-50/60 dark:bg-amber-950/20",
          border: "border-amber-200/60 dark:border-amber-900/40",
          badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
          icon: AlertTriangle,
          iconColor: "text-amber-500"
        },
        success: {
          bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
          border: "border-emerald-200/60 dark:border-emerald-900/40",
          badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          icon: CheckCircle2,
          iconColor: "text-emerald-500"
        },
        urgent: {
          bg: "bg-rose-50/60 dark:bg-rose-950/20",
          border: "border-rose-200/60 dark:border-rose-900/40",
          badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
          icon: ShieldAlert,
          iconColor: "text-rose-500"
        },
    };

    const timeAgo = (d) => {
        if (!d) return "";
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    const urgentCount = announcements.filter((a) => a.type === "urgent" || a.type === "warning").length;
    const infoCount = announcements.filter((a) => a.type === "info" || a.type === "success").length;

    const filteredAnnouncements = useMemo(() => {
      if (filterType === "all") return announcements;
      return announcements.filter(a => a.type === filterType);
    }, [announcements, filterType]);

    return (
        <div className="space-y-3 pb-16 font-sans text-slate-900 dark:text-slate-100 max-w-full">

            {/* ── Compact Header Banner ── */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <Megaphone size={16} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                Company Announcements
                            </h1>
                            <p className="text-[11px] text-slate-400 font-medium">
                                Broadcast official news, urgent notices & policy updates
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                        >
                            <Plus size={13} strokeWidth={2.5} />
                            <span>Post Announcement</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Top 4 Compact KPI Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Total Notices" value={announcements.length} trend="12.0%" isUp period="last mo" strokeColor="#8B5CF6" Icon={Megaphone} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
                <KPICard label="Urgent Alerts" value={urgentCount} trend="5.4%" isUp period="last mo" strokeColor="#F43F5E" Icon={ShieldAlert} iconBg="bg-rose-500/10" iconColor="#E11D48" />
                <KPICard label="General Info" value={infoCount} trend="14.2%" isUp period="last mo" strokeColor="#06B6D4" Icon={Info} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
                <KPICard label="Coverage Reach" value="100%" trend="All Staff" isUp period="scope" strokeColor="#10B981" Icon={Bell} iconBg="bg-emerald-500/10" iconColor="#059669" />
            </div>

            {/* ── Filter Tabs Strip ── */}
            <div className="flex items-center justify-between bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 shadow-2xs overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1">
                    {[
                      { id: "all", label: "All Broadcasts", count: announcements.length },
                      { id: "urgent", label: "Urgent", count: announcements.filter(a => a.type === "urgent").length },
                      { id: "warning", label: "Warnings", count: announcements.filter(a => a.type === "warning").length },
                      { id: "info", label: "Info", count: announcements.filter(a => a.type === "info").length },
                      { id: "success", label: "Milestones", count: announcements.filter(a => a.type === "success").length },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterType(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                          filterType === tab.id
                            ? "bg-amber-500 text-slate-950 shadow-2xs"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-1 py-0.2 rounded text-[9.5px] ${filterType === tab.id ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                </div>
            </div>

            {/* ── Announcements Feed List ── */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <Loader2 size={24} className="animate-spin text-amber-500 mb-2" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loading Announcements...</p>
                </div>
            ) : filteredAnnouncements.length === 0 ? (
                <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2.5">
                        <Megaphone size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-0.5">No Announcements Found</h3>
                    <p className="text-[11px] font-medium text-slate-400 max-w-sm mx-auto mb-3">
                        {filterType === "all" ? "No announcements published yet. Post updates to inform all team members." : `No announcements found under the "${filterType}" category.`}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Post Announcement</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredAnnouncements.map((ann) => {
                        const cfg = typeConfig[ann.type] || typeConfig.info;
                        const IconComp = cfg.icon;
                        return (
                            <div key={ann._id} className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${cfg.bg} border ${cfg.border}`}>
                                            <IconComp size={15} className={cfg.iconColor} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight">{ann.title}</h3>
                                                <span className={`px-2 py-0.2 rounded-md text-[9.5px] font-black border uppercase tracking-wider ${cfg.badge}`}>
                                                    {ann.type || "info"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-2 bg-slate-50/80 dark:bg-[#0B101B] p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 whitespace-pre-line">
                                                {ann.message || ann.content}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                <span className="flex items-center gap-1">
                                                  <Clock size={11} className="text-slate-400" />
                                                  <span>{timeAgo(ann.createdAt)}</span>
                                                </span>
                                                {ann.postedBy?.name && (
                                                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                    <User size={10} className="text-amber-500" />
                                                    <span>By {ann.postedBy.name}</span>
                                                  </span>
                                                )}
                                                <span className="text-slate-400">· Target: All Staff</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.confirm("Delete this announcement?") && deleteMutation.mutate(ann._id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                                        title="Delete Announcement"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Compact Post Announcement Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                    <Megaphone size={14} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Post Announcement</h3>
                                    <p className="text-[10px] font-semibold text-slate-400">Broadcast updates to workforce</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                                <X size={14} />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, targetType: "selectedCompany", publishStatus: "published" }); }} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Announcement Title *</label>
                                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500" placeholder="e.g. Office Holiday Notice" />
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Category Type</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-1.5 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer">
                                    <option value="info">Info / General Notice</option>
                                    <option value="success">Success / Milestone</option>
                                    <option value="warning">Warning / Reminder</option>
                                    <option value="urgent">Urgent / Alert</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Message Content *</label>
                                <textarea rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 resize-none" placeholder="Write announcement details..." />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-lg text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer">
                                    {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                                    <span>Post Announcement</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Announcements;
