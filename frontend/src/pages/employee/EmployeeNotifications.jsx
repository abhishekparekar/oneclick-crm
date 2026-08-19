import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Check, CheckCheck, Trash2, Clock, Bell } from "lucide-react";
import {
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi
} from "../../api/employeeApi";

export default function EmployeeNotifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch Notifications
  const { data: res, isLoading } = useQuery({
    queryKey: ["myNotifications"],
    queryFn: () => getMyNotificationsApi().then(r => r.data),
  });

  const notifications = res?.notifications || [];
  
  const allCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "read") return n.isRead;
    return true;
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
    onError: () => toast.error("Failed to mark as read")
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsReadApi(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
    onError: () => toast.error("Failed to mark all as read")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotificationApi(id),
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
    onError: () => toast.error("Failed to delete notification")
  });

  return (
    <div className="space-y-4 w-full pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Stay updated with tasks, announcements, and portal alerts
          </p>
        </div>

        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllReadMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <CheckCheck size={14} strokeWidth={2.5} />
          {markAllReadMutation.isPending ? "Marking..." : "Mark All Read"}
        </button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="bg-white dark:bg-[#111C24] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 w-fit">
        <TabButton 
          active={activeTab === "all"} 
          onClick={() => setActiveTab("all")} 
          label="All Alerts" 
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

      {/* Notifications List Container */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
              <Bell size={22} strokeWidth={2} />
            </div>
            <p className="text-slate-900 dark:text-white font-extrabold text-sm">No notifications found</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">You are all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={() => markReadMutation.mutate(notification._id)}
                onDelete={() => deleteMutation.mutate(notification._id)}
                isMarkingRead={markReadMutation.isPending && markReadMutation.variables === notification._id}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === notification._id}
              />
            ))}
          </div>
        )}
      </div>
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

function NotificationItem({ notification, onMarkRead, onDelete, isMarkingRead, isDeleting }) {
  const isUnread = !notification.isRead;
  
  return (
    <div className={`group relative flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors gap-3 ${isUnread ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.04]' : ''}`}>
      
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
          <Clock size={16} strokeWidth={2.2} />
        </div>

        {/* Content Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-[13.5px] leading-snug truncate ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
              {notification.title}
            </h3>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            )}
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-auto sm:ml-0">
              {format(new Date(notification.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
          {notification.message && (
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 leading-normal line-clamp-1 mt-0.5">
              {notification.message}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions Toolbar */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isUnread && (
          <button
            onClick={onMarkRead}
            disabled={isMarkingRead}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 rounded-lg text-xs font-extrabold transition-all shadow-2xs"
            title="Mark as Read"
          >
            <Check size={12} strokeWidth={3} />
            <span className="hidden sm:inline">{isMarkingRead ? "Saving..." : "Mark Read"}</span>
          </button>
        )}
        
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
          title="Delete Notification"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
