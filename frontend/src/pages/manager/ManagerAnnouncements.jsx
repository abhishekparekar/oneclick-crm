import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerAnnouncementsApi, markManagerAnnouncementReadApi } from "../../api/managerApi";
import {
  Megaphone,
  RefreshCw,
  Calendar,
  User,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ChevronRight,
  X,
  Paperclip,
  Eye,
  Bell,
  Download
} from "lucide-react";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";
import PageHeader from "../../components/common/PageHeader";

const CATEGORIES = ["All", "Urgent", "Info", "Event", "Policy", "Unread"];

const getCategoryBadge = (type = "", priority = "") => {
  const t = (type || priority || "").toLowerCase();
  if (t.includes("urgent") || t.includes("critical") || t.includes("high")) {
    return { label: "Urgent", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: AlertTriangle };
  }
  if (t.includes("event") || t.includes("holiday")) {
    return { label: type || "Event", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: Calendar };
  }
  if (t.includes("policy") || t.includes("rule")) {
    return { label: type || "Policy", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", icon: CheckCircle2 };
  }
  return { label: type || "Info", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Info };
};

const ManagerAnnouncements = () => {
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

  // Handle opening announcement modal & mark as read
  const handleOpenDetail = (ann) => {
    setActiveAnnouncement(ann);
    if (!ann.isRead && ann._id) {
      markReadMut.mutate(ann._id);
    }
  };

  // KPI Metrics
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

  // Filtered Announcements List
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
      
      const typeStr = (ann.type || ann.priority || "").toLowerCase();
      return typeStr.includes(selectedCategory.toLowerCase());
    });
  }, [announcements, searchQuery, selectedCategory]);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-8 font-sans">
      <PageHeader title="Announcements & Broadcasts" icon={Megaphone}>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh Announcements"
          className="flex items-center justify-center p-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 font-bold shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} strokeWidth={2.2} />
        </button>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { label: "Total Broadcasts", value: stats.total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Megaphone },
          { label: "Unread Messages", value: stats.unread, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Bell },
          { label: "Urgent Alerts", value: stats.urgent, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertTriangle },
          { label: "Posted This Week", value: stats.recent, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Clock },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white dark:bg-[#111C24] border ${s.border} rounded-2xl p-4 shadow-2xs relative overflow-hidden transition-all hover:shadow-md flex items-center justify-between`}>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcement title, message, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter size={13} className="text-slate-400 shrink-0 mr-1 hidden md:inline" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-amber-500 text-slate-950 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl h-44 animate-pulse bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
          <Megaphone size={48} className="mx-auto mb-3 opacity-30 text-amber-500" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No announcements match your search</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting your search filter or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredAnnouncements.map((ann, i) => {
            const badge = getCategoryBadge(ann.type, ann.priority);
            const BadgeIcon = badge.icon;
            const authorName = ann.createdBy?.name || ann.author?.name || "Company Admin";
            const dateStr = ann.createdAt
              ? new Date(ann.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "Recent";

            return (
              <div
                key={ann._id || i}
                onClick={() => handleOpenDetail(ann)}
                className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                {/* Unread Pill Indicator */}
                {!ann.isRead && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                )}

                <div>
                  {/* Top Category Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                      <BadgeIcon size={11} strokeWidth={2.2} />
                      {badge.label}
                    </span>
                    {!ann.isRead && (
                      <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Title & Preview Text */}
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {ann.title || "Company Announcement"}
                  </h3>

                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                    {ann.message || ann.content || ann.description || "No description provided."}
                  </p>
                </div>

                {/* Footer Meta Details */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                      {authorName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 shrink-0">
                    <Calendar size={12} />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {activeAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-[#1E293B]/50">
              <div className="pr-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  {(() => {
                    const badge = getCategoryBadge(activeAnnouncement.type, activeAnnouncement.priority);
                    const BadgeIcon = badge.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                        <BadgeIcon size={11} strokeWidth={2.2} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {activeAnnouncement.title || "Announcement Detail"}
                </h2>
              </div>

              <button
                onClick={() => setActiveAnnouncement(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Message Content */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-normal leading-relaxed whitespace-pre-line">
                {activeAnnouncement.message || activeAnnouncement.content || activeAnnouncement.description || "No message body provided."}
              </p>

              {/* Attachments if any */}
              {activeAnnouncement.attachments && activeAnnouncement.attachments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Paperclip size={13} /> Attachments ({activeAnnouncement.attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeAnnouncement.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <Paperclip size={12} className="text-amber-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{att.fileName || att.name || "Attachment"}</span>
                        <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedFile(att)}
                            className="p-1 hover:text-amber-600 hover:bg-amber-500/10 rounded transition-colors cursor-pointer"
                            title="Preview Attachment"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="p-1 hover:text-amber-600 hover:bg-amber-500/10 rounded transition-colors cursor-pointer"
                            title="Download Attachment"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/80 dark:bg-[#1E293B]/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeAnnouncement.createdBy?.name || activeAnnouncement.author?.name || "Company Admin"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={13} />
                <span>
                  {activeAnnouncement.createdAt
                    ? new Date(activeAnnouncement.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <AttachmentViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
};

export default ManagerAnnouncements;


