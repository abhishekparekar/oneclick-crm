import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getManagerProfileApi } from "../../api/managerApi";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard,
  MessageSquare,
  Magnet,
  Megaphone,
  Clock,
  Settings,
  ListTodo,
  CalendarCheck,
  FileText,
  Receipt,
  Users,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  BarChart2,
  UserCircle,
  LogOut,
  ChevronDown,
  Hexagon,
  Link as LinkIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER NAV SECTIONS — Matches Reference Design Exactly
// ─────────────────────────────────────────────────────────────────────────────
const MANAGER_SECTIONS = [
  {
    title: "CORE DASHBOARD",
    items: [
      { label: "Dashboard", path: "/manager/dashboard", icon: LayoutDashboard },
      { label: "Company Requests", path: "/manager/requests", icon: MessageSquare },
    ],
  },
  {
    title: "LEAD CRM",
    items: [
      { label: "Leads Pipeline", path: "/manager/leads", icon: Magnet },
      { label: "WhatsApp Campaigns", path: "/manager/leads/campaigns", icon: MessageSquare },
      { label: "Service Reminders", path: "/manager/leads/reminders", icon: Clock },
      { label: "Lead Settings", path: "/manager/leads/settings", icon: Settings },
    ],
  },
  {
    title: "MY WORK",
    items: [
      { label: "My Tasks", path: "/manager/my-tasks", icon: ListTodo },
      { label: "My Attendance", path: "/manager/attendance", icon: CalendarCheck },
      { label: "My Leaves", path: "/manager/my-leave", icon: FileText },
      { label: "My Payslips", path: "/manager/payslips", icon: Receipt },
    ],
  },
  {
    title: "TEAM",
    items: [
      { label: "Team Members", path: "/manager/team", icon: Users },
      { label: "Team Tasks", path: "/manager/team-tasks", icon: CheckSquare },
      { label: "Team Attendance", path: "/manager/team-attendance", icon: CalendarCheck },
      { label: "Team Leaves", path: "/manager/team-leaves", icon: CalendarDays },
    ],
  },
  {
    title: "WORK & INSIGHTS",
    items: [
      { label: "Projects", path: "/manager/projects", icon: FolderKanban },
      { label: "Announcements", path: "/manager/announcements", icon: Megaphone },
      { label: "Reports Hub", path: "/manager/reports", icon: BarChart2 },
    ],
  },
];

const ManagerSidebar = ({ logout, onItemClick }) => {
  const location = useLocation();
  const { user } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["managerProfile"],
    queryFn: () => getManagerProfileApi().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const companyName =
    profileData?.company?.companyName ||
    profileData?.company?.name ||
    "One Click Solutions";

  const userName =
    profileData?.manager?.fullName ||
    profileData?.manager?.firstName ||
    user?.name ||
    "abhishek parekar";

  const isActive = (path) =>
    location.pathname === path || (path !== "/manager/dashboard" && location.pathname.startsWith(path + "/"));

  return (
    <div className="ca-sidebar w-full lg:w-[228px] bg-[#070C14] text-slate-300 border-r border-white/[0.06] h-full flex flex-col flex-shrink-0 transition-colors duration-300 select-none">

      {/* Brand Logo Header */}
      <div className="px-4 py-3.5 flex items-center justify-start border-b border-white/[0.06]">
        <OneClickLogo variant="landscape" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2 custom-scrollbar space-y-3">
        {MANAGER_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && (
              <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 px-2.5 pt-1 pb-1">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[#0D3B43] text-teal-300 font-bold border border-teal-500/30 shadow-xs"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        strokeWidth={2}
                        className={`flex-shrink-0 ${active ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"}`}
                      />
                      <span className="truncate text-[12.5px]">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-2.5 border-t border-white/[0.06] space-y-1.5 bg-[#050910]">
        {/* Company Selector Pill */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] text-xs font-bold text-slate-300 cursor-default hover:bg-white/[0.06] transition-all">
          <div className="flex items-center gap-2 truncate min-w-0">
            <Hexagon size={14} strokeWidth={2} className="text-amber-500 flex-shrink-0" />
            <span className="truncate text-[11.5px]">{companyName}</span>
          </div>
          <ChevronDown size={12} strokeWidth={2} className="text-slate-500 flex-shrink-0" />
        </div>

        {/* User row + Logout */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all group">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              {(() => {
                const mgr = profileData?.manager || profileData?.employee || {};
                const rawAvatar = user?.profileImage || mgr.photo || mgr.profileImage;
                const avatarUrl = rawAvatar ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") ? rawAvatar : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`) : null;

                return avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover shadow-xs border border-slate-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-[10.5px]">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#070C14]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-200 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Manager</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ManagerSidebar;
