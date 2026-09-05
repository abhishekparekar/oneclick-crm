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
  LogOut,
  ChevronDown,
  Hexagon,
  Navigation,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER NAV SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const MANAGER_SECTIONS = [
  {
    title: "DAILY WORKSPACE",
    items: [
      { label: "Dashboard", path: "/manager/dashboard", icon: LayoutDashboard },
      { label: "Leads Pipeline", path: "/manager/leads", icon: Magnet, module: "leads" },
      { label: "My Tasks", path: "/manager/my-tasks", icon: ListTodo, module: "tasks" },
      { label: "Team Tasks", path: "/manager/team-tasks", icon: CheckSquare, module: "tasks" },
      { label: "My Attendance", path: "/manager/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "My Leaves", path: "/manager/my-leave", icon: FileText, module: "leave" },
      { label: "Company Requests", path: "/manager/requests", icon: MessageSquare },
      { label: "My Payslips", path: "/manager/payslips", icon: Receipt, module: "payroll" },
    ],
  },
  {
    title: "TEAM MANAGEMENT",
    items: [
      { label: "Team Members", path: "/manager/team", icon: Users },
      { label: "Team Attendance", path: "/manager/team-attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Live Location Radar", path: "/manager/location-tracking", icon: Navigation, module: "attendance" },
      { label: "Team Leaves", path: "/manager/team-leaves", icon: CalendarDays, module: "leave" },
    ],
  },
  {
    title: "LEAD CRM & PROJECTS",
    items: [
      { label: "WhatsApp Campaigns", path: "/manager/leads/campaigns", icon: Megaphone, module: "leads" },
      { label: "Service Reminders", path: "/manager/leads/reminders", icon: Clock, module: "leads" },
      { label: "Projects", path: "/manager/projects", icon: FolderKanban, module: "projects" },
    ],
  },
  {
    title: "INSIGHTS & SETTINGS",
    items: [
      { label: "Reports Hub", path: "/manager/reports", icon: BarChart2, module: "reports" },
      { label: "Announcements", path: "/manager/announcements", icon: Megaphone },
      { label: "Lead Settings", path: "/manager/leads/settings", icon: Settings, module: "leads" },
    ],
  },
];

const ManagerSidebar = ({ logout, onItemClick, isCollapsed = false }) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["managerProfile"],
    queryFn: () => getManagerProfileApi().then((r) => r.data),
    staleTime: 30 * 1000,
  });

  const assignedModules = profileData?.manager?.assignedModules || profileData?.employee?.assignedModules || user?.assignedModules || [];

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
    location.pathname === path || (path !== "/manager/dashboard" && location.pathname.startsWith(path + "/"));

  return (
    <div
      className={`ca-sidebar ${isCollapsed ? "w-[68px]" : "w-full lg:w-[228px]"
        } bg-[#050F1F] text-slate-300 border-r border-[#1C3554]/60 h-full flex flex-col flex-shrink-0 transition-all duration-300 select-none`}
    >
      {/* Brand Logo Header */}
      <div className={`px-2.5 py-3 flex items-center justify-center border-b border-white/[0.06] mb-1 ${isCollapsed ? "h-[60px]" : ""}`}>
        {isCollapsed ? (
          <OneClickLogo variant="square" />
        ) : (
          <OneClickLogo variant="landscape" />
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1.5" : "px-2.5 py-2 space-y-2"} oc-scroll`}>
        {MANAGER_SECTIONS.map((section, idx) => {
          const liveSubscribed = profileData?.company?.subscribedModules || user?.company?.subscribedModules || user?.subscribedModules;
          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            const norm = String(item.module).toLowerCase().trim();
            if (Array.isArray(liveSubscribed)) {
              const subs = liveSubscribed.map(m => String(m).toLowerCase().trim());
              if (!subs.includes(norm)) return false;
            }
            if (Array.isArray(assignedModules) && assignedModules.length > 0) {
              const assigned = assignedModules.map(m => String(m).toLowerCase().trim());
              if (!assigned.includes(norm)) return false;
            }
            return hasPermission(item.module, "view") || hasPermission(item.module);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className={isCollapsed ? "mb-1" : "space-y-0.5"}>
              {!isCollapsed && section.title && (
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 px-2.5 pt-1 pb-1">
                  {section.title}
                </p>
              )}
              {isCollapsed && section.title && idx > 0 && (
                <div className="h-[1px] bg-white/[0.06] my-1 mx-2" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onItemClick}
                      title={item.label}
                      className={`${isCollapsed
                        ? `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${active
                          ? "bg-[#1268D9] text-white shadow-md shadow-[#1268D9]/30"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                        }`
                        : `flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${active
                          ? "bg-[#1268D9] text-white font-bold shadow-md shadow-[#1268D9]/25"
                          : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                        }`
                        }`}
                    >
                      {isCollapsed ? (
                        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-white" : "text-slate-400"} />
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={15}
                            strokeWidth={2}
                            className={`flex-shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}
                          />
                          <span className="truncate text-[12.5px]">{item.label}</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center gap-2" : "p-2.5 space-y-1.5 bg-[#061225]"}`}>
        {!isCollapsed ? (
          <>
            {/* Company Selector Pill */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] text-xs font-bold text-slate-300 cursor-default hover:bg-white/[0.06] transition-all">
              <div className="flex items-center gap-2 truncate min-w-0">
                <Hexagon size={14} strokeWidth={2} className="text-[#1268D9] flex-shrink-0" />
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
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[10.5px]">
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
          </>
        ) : (
          <>
            <div
              title={userName}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[10.5px] shadow-xs cursor-pointer"
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <LogOut size={16} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerSidebar;
