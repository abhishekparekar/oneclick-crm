import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanyAnnouncementsApi, createCompanyAnnouncementApi, deleteAnnouncementApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Megaphone, Plus, Trash2, Clock, Sparkles, ArrowUp, ArrowDown,
  AlertTriangle, CheckCircle2, Info, Bell, X, Check, Loader2
} from "lucide-react";

// ── Top KPI Stat Card ──────────────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 14 }, { v: 20 }, { v: 16 }, { v: 26 }, { v: 22 }, { v: 32 }, { v: 28 }, { v: 40 },
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
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-ann-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-ann-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Announcements = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        info: { bg: "bg-[#111C24]", border: "border-blue-500/20", badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800", icon: Info },
        warning: { bg: "bg-[#111C24]", border: "border-amber-500/20", badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800", icon: AlertTriangle },
        success: { bg: "bg-[#111C24]", border: "border-emerald-500/20", badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
        urgent: { bg: "bg-[#111C24]", border: "border-rose-500/20", badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800", icon: Bell },
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

    return (
        <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* ── Page Header Banner ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
                <div>
                    <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        Company Announcements <Megaphone size={20} className="text-amber-500" />
                    </h1>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Broadcast official company news, policy updates, and urgent notices to all team members.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
                    >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>Post Announcement</span>
                    </button>
                </div>
            </div>

            {/* ── Top 4 Compact KPI Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
                <KPICard label="Total Announcements" value={announcements.length} trend="12.0%" isUp period="last month" strokeColor="#8B5CF6" Icon={Megaphone} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
                <KPICard label="Urgent & Warnings" value={urgentCount} trend="5.4%" isUp period="last month" strokeColor="#F43F5E" Icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="#E11D48" />
                <KPICard label="Info & General News" value={infoCount} trend="14.2%" isUp period="last month" strokeColor="#06B6D4" Icon={Info} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
                <KPICard label="Audience Reach" value="All Workforce" trend="100%" isUp period="coverage" strokeColor="#10B981" Icon={Bell} iconBg="bg-emerald-500/10" iconColor="#059669" />
            </div>

            {/* ── Announcements Feed List ── */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Announcements...</p>
                </div>
            ) : announcements.length === 0 ? (
                <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                        <Megaphone size={28} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Announcements Posted</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                        Post an announcement to notify all employees about important company updates.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Post First Announcement</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {announcements.map((ann) => {
                        const cfg = typeConfig[ann.type] || typeConfig.info;
                        const IconComp = cfg.icon;
                        return (
                            <div key={ann._id} className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold">
                                            <IconComp size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{ann.title}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${cfg.badge}`}>
                                                    {ann.type || "info"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                                {ann.message || ann.content}
                                            </p>
                                            <div className="flex items-center text-[11px] font-semibold text-slate-400">
                                                <Clock size={12} className="mr-1.5" />
                                                <span>Posted {timeAgo(ann.createdAt)} {ann.postedBy?.name ? `by ${ann.postedBy.name}` : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.confirm("Delete this announcement?") && deleteMutation.mutate(ann._id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex-shrink-0"
                                        title="Delete Announcement"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Post Announcement Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                    <Megaphone size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Post Announcement</h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Broadcast news to all company staff</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, targetType: "selectedCompany", publishStatus: "published" }); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Announcement Title *</label>
                                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" placeholder="e.g. Office Holiday Notice" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Category Type</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none">
                                    <option value="info">Info / Notice</option>
                                    <option value="success">Success / Milestone</option>
                                    <option value="warning">Warning / Reminder</option>
                                    <option value="urgent">Urgent / Alert</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Message Content *</label>
                                <textarea rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none" placeholder="Write full announcement details..." />
                            </div>
                            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5">
                                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
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
