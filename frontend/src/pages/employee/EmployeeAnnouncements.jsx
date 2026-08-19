import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Megaphone, ChevronRight, Calendar, X } from "lucide-react";
import { getEmployeeAnnouncementsApi, markAnnouncementReadApi } from "../../api/employeeApi";

export default function EmployeeAnnouncements() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Fetch Announcements
  const { data: res, isLoading } = useQuery({
    queryKey: ["employeeAnnouncements"],
    queryFn: () => getEmployeeAnnouncementsApi().then(r => r.data),
  });

  const announcements = res?.announcements || [];
  
  const allCount = announcements.length;
  const unreadCount = announcements.filter(n => !n.isRead).length;
  const readCount = announcements.filter(n => n.isRead).length;

  const filteredAnnouncements = announcements.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "read") return n.isRead;
    return true;
  });

  // Mutation
  const markReadMutation = useMutation({
    mutationFn: (id) => markAnnouncementReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeAnnouncements"] });
    },
    onError: () => toast.error("Failed to mark as read")
  });

  const handleOpenAnnouncement = (ann) => {
    setSelectedAnnouncement(ann);
    if (!ann.isRead) {
      markReadMutation.mutate(ann._id);
    }
  };

  return (
    <div className="space-y-4 w-full pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            Announcements & News
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Company updates, official notices, and organizational news
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="bg-white dark:bg-[#111C24] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 w-fit">
        <TabButton 
          active={activeTab === "all"} 
          onClick={() => setActiveTab("all")} 
          label="All News" 
          count={allCount}
        />
        <TabButton 
          active={activeTab === "unread"} 
          onClick={() => setActiveTab("unread")} 
          label="Unread" 
          count={unreadCount}
        />
        <TabButton 
          active={activeTab === "read"} 
          onClick={() => setActiveTab("read")} 
          label="Read" 
          count={readCount}
        />
      </div>

      {/* Announcements List Container */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">Loading announcements...</div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
              <Megaphone size={22} strokeWidth={2} />
            </div>
            <p className="text-slate-900 dark:text-white font-extrabold text-sm">No announcements found</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">Check back later for company updates!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredAnnouncements.map(ann => (
              <AnnouncementItem
                key={ann._id}
                ann={ann}
                onSelect={() => handleOpenAnnouncement(ann)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                <Megaphone size={16} /> Official Announcement
              </div>
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedAnnouncement.title}
              </h3>
              
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Calendar size={13} />
                {format(new Date(selectedAnnouncement.createdAt || selectedAnnouncement.date || Date.now()), "MMMM d, yyyy · h:mm a")}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0C1520] rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.content || selectedAnnouncement.message || selectedAnnouncement.description}
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40">
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="px-4 py-2 text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
        active 
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs" 
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <span>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
        active 
          ? "bg-white/20 text-white dark:bg-[#0C1520]/20 dark:text-slate-900" 
          : "bg-slate-100 dark:bg-[#111C24] text-slate-500 dark:text-slate-400"
      }`}>
        {count}
      </span>
    </button>
  );
}

function AnnouncementItem({ ann, onSelect }) {
  const isUnread = !ann.isRead;

  return (
    <div 
      onClick={onSelect}
      className={`group relative flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors gap-3 cursor-pointer ${isUnread ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.04]' : ''}`}
    >
      {/* Left Active Indicator Bar */}
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-md"></div>
      )}

      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
        {/* Compact Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
          isUnread 
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/60 dark:border-slate-700/60'
        }`}>
          <Megaphone size={16} strokeWidth={2.2} />
        </div>

        {/* Content Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-[13.5px] leading-snug truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
              {ann.title}
            </h3>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            )}
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-auto sm:ml-0">
              {format(new Date(ann.createdAt || ann.date || Date.now()), "MMM d, yyyy")}
            </span>
          </div>
          {(ann.content || ann.message || ann.description) && (
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 leading-normal line-clamp-1 mt-0.5">
              {ann.content || ann.message || ann.description}
            </p>
          )}
        </div>
      </div>

      {/* Right Chevron View Action */}
      <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-amber-500 transition-colors">
        <span className="text-xs font-bold hidden sm:inline">View</span>
        <ChevronRight size={15} strokeWidth={2.5} />
      </div>
    </div>
  );
}
