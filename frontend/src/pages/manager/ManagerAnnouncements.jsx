import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerAnnouncementsApi, markManagerAnnouncementReadApi } from "../../api/managerApi";
import {
  Megaphone, RefreshCw, Calendar, User, Search, CheckCircle2, AlertTriangle,
  Info, Clock, ChevronRight, X, Paperclip, Eye, Bell, Download
} from "lucide-react";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

const CATEGORIES = ["All", "Urgent", "Info", "Event", "Policy", "Unread"];

const getCategoryBadge = (type = "", priority = "") => {
  const t = (type || priority || "").toLowerCase();
  if (t.includes("urgent") || t.includes("critical") || t.includes("high")) {
    return { label: "Urgent", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
  }
  if (t.includes("event") || t.includes("holiday")) {
    return { label: type || "Event", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
  }
  if (t.includes("policy") || t.includes("rule")) {
    return { label: type || "Policy", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
  }
  return { label: type || "Info", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
};

export default function ManagerAnnouncements() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerAnnouncements"],
    queryFn: () => getManagerAnnouncementsApi().then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const markReadMut = useMutation({
    mutationFn: (id) => markManagerAnnouncementReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["managerAnnouncements"]);
    },
  });

  const _raw = data?.announcements || data?.data;
  const announcements = useMemo(() => (Array.isArray(_raw) ? _raw : []), [_raw]);

  const handleOpenDetail = (ann) => {
    setActiveAnnouncement(ann);
    if (!ann.isRead && ann._id) {
      markReadMut.mutate(ann._id);
    }
  };

  const stats = useMemo(() => {
    const total = announcements.length;
    const unread = announcements.filter((a) => !a.isRead).length;
    const urgent = announcements.filter((a) => {
      const t = (a.type || a.priority || "").toLowerCase();
      return t.includes("urgent") || t.includes("critical") || t.includes("high");
    }).length;
    const recent = announcements.filter((a) => {
      if (!a.createdAt) return false;
      const diffDays = (new Date() - new Date(a.createdAt)) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }).length;

    return { total, unread, urgent, recent };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const title = ann.title || "";
      const msg = ann.message || ann.content || ann.description || "";
      const author = ann.createdBy?.name || ann.author?.name || "";
      const matchesSearch =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === "All") return true;
      if (selectedCategory === "Unread") return !ann.isRead;
      if (selectedCategory === "Urgent") {
        const t = (ann.type || ann.priority || "").toLowerCase();
        return t.includes("urgent") || t.includes("critical") || t.includes("high");
      }
      return (ann.type || "").toLowerCase().includes(selectedCategory.toLowerCase());
    });
  }, [announcements, searchQuery, selectedCategory]);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-3 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Megaphone size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Company Announcements
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {filteredAnnouncements.length} Bulletins
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Official notices, corporate events, and policy broadcasts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-44 sm:w-56">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search bulletin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold"
              />
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Bulletins"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. MICRO-KPI CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Bulletins</p>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Megaphone size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unread</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-0.5">{stats.unread}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Bell size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Urgent & Alerts</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-0.5">{stats.urgent}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">This Week</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-0.5">{stats.recent}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Calendar size={15} />
          </div>
        </div>
      </div>

      {/* ── 3. CATEGORY PILLS STRIP ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 4. ANNOUNCEMENTS LIST FEED ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="animate-spin mx-auto mb-2 text-amber-500" size={24} />
          Loading announcements...
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-14 text-center rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <Megaphone size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-white">No Announcements</h3>
          <p className="text-[10.5px] text-slate-400 mt-0.5">There are no bulletins matching your category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredAnnouncements.map((ann) => {
            const badge = getCategoryBadge(ann.type, ann.priority);
            const isUnread = !ann.isRead;

            return (
              <div
                key={ann._id}
                onClick={() => handleOpenDetail(ann)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs ${
                  isUnread
                    ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-500/30"
                    : "bg-white dark:bg-[#111C24] border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${badge.bg} ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{formatDate(ann.createdAt)}</span>
                  </div>

                  <h3 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-1">
                    {ann.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed">
                    {ann.message || ann.content || ann.description || "No preview available."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <User size={10} />
                    <span>{ann.createdBy?.name || ann.author?.name || "HR Admin"}</span>
                  </span>
                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                    Read Bulletin <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {activeAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#111C24] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getCategoryBadge(activeAnnouncement.type, activeAnnouncement.priority).bg} ${getCategoryBadge(activeAnnouncement.type, activeAnnouncement.priority).color}`}>
                {getCategoryBadge(activeAnnouncement.type, activeAnnouncement.priority).label}
              </span>
              <button onClick={() => setActiveAnnouncement(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">{activeAnnouncement.title}</h2>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Published on {formatDate(activeAnnouncement.createdAt)} by {activeAnnouncement.createdBy?.name || "HR Admin"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#0B101B] p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                {activeAnnouncement.message || activeAnnouncement.content || activeAnnouncement.description}
              </div>

              {activeAnnouncement.attachments && activeAnnouncement.attachments.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Attached Documents</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAnnouncement.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-600">
                        <Paperclip size={11} />
                        <span className="truncate max-w-[120px]">{att.fileName || "File"}</span>
                        <button onClick={() => setSelectedFile(att)} className="text-slate-400 hover:text-amber-600 p-0.5 cursor-pointer">
                          <Eye size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setActiveAnnouncement(null)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <AttachmentViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
}
