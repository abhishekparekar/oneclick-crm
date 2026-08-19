import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getManagerProfileApi } from "../../api/managerApi";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard,
  ListTodo,
  CalendarCheck,
  FileText,
  UsersRound,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  Megaphone,
  BarChart2,
  UserCircle,
  Settings,
  LogOut,
  ChevronDown,
  Hexagon,
  Magnet,
  MessageSquare,
  Clock,
  Sparkles,
  Receipt,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER NAV SECTIONS
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
      { label: "Team Members", path: "/manager/team", icon: UsersRound },
      { label: "Team Tasks", path: "/manager/team-tasks", icon: CheckSquare },
      { label: "Team Attendance", path: "/manager/team-attendance", icon: CalendarCheck },
      { label: "Team Leaves", path: "/manager/team-leaves", icon: CalendarDays },
    ],
  },
  {
    title: "WORK",
    items: [
      { label: "Projects", path: "/manager/projects", icon: FolderKanban },
      { label: "Announcements", path: "/manager/announcements", icon: Megaphone },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Reports", path: "/manager/reports", icon: BarChart2 },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Profile", path: "/manager/profile", icon: UserCircle },
      { label: "Settings", path: "/manager/settings", icon: Settings },
    ],
  },
];

// ─── Manager Sidebar — mirrors CompanyAdminSidebar exactly ───────────────────
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
    "Manager";

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="ca-sidebar w-full lg:w-[228px] bg-[#090D16] text-slate-300 border-r border-white/[0.06] h-full flex flex-col flex-shrink-0 transition-colors duration-300">

      {/* Brand Logo Header */}
      <div className="px-3.5 py-3 flex items-center justify-center border-b border-white/[0.06] mb-1">
        <OneClickLogo variant="landscape" />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 oc-scroll">
        {MANAGER_SECTIONS.map((section, idx) => (
          <div key={idx} className="mb-1">
            {section.title && (
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 px-2.5 pt-3 pb-1">
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
                    className={`oc-nav-item ${active ? "active" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        strokeWidth={1.75}
                        className={`flex-shrink-0 ${active ? "text-amber-400" : "text-slate-500"}`}
                      />
                      <span className="truncate text-[13px]">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer — identical to CompanyAdminSidebar ── */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        {/* Company pill */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-white/[0.04] text-[12px] font-semibold text-slate-300 cursor-default hover:bg-white/[0.06] transition-all">
          <div className="flex items-center gap-2 truncate min-w-0">
            <Hexagon size={13} strokeWidth={1.75} className="text-amber-400 flex-shrink-0" />
            <span className="truncate">{companyName}</span>
          </div>
          <ChevronDown size={12} strokeWidth={1.75} className="text-slate-500 flex-shrink-0" />
        </div>

        {/* User row + Logout */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] hover:bg-white/[0.04] transition-all cursor-pointer group">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              {(() => {
                const mgr = profileData?.manager || profileData?.employee || {};
                const rawAvatar = user?.profileImage || mgr.photo || mgr.profileImage;
                const avatarUrl = rawAvatar ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") ? rawAvatar : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`) : null;

                return avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover shadow-xs border border-slate-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-[11px]">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Manager</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="text-slate-600 hover:text-rose-400 transition-colors p-1"
          >
            <LogOut size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default ManagerSidebar;
