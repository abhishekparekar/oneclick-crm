import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMyProfileApi } from "../../api/employeeApi";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Megaphone,
  LogOut,
  User,
  CalendarCheck,
  CheckSquare,
  File,
  Bell,
  Settings,
  ChevronDown,
  Hexagon,
  Magnet,
  MessageSquare,
} from "lucide-react";

// ─── Employee Sidebar ────────────────────────────────────────────────────────
const EmployeeSidebar = ({ logout, onItemClick, isCollapsed = false }) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["employeeProfile"],
    queryFn: () => getMyProfileApi().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const subscribedModules = profileData?.company?.subscribedModules || user?.company?.subscribedModules || [];
  const assignedModules = profileData?.employee?.assignedModules || user?.assignedModules || [];

  const sections = [
    {
      title: null,
      items: [
        { label: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "TASK",
      items: [
        { label: "My Tasks", path: "/employee/my-tasks", icon: CheckSquare, module: "tasks" },
      ],
    },
    {
      title: "LEAD ENGINE",
      items: [
        { label: "Leads Pipeline", path: "/employee/leads", icon: Magnet, module: "leads" },
      ],
    },
    {
      title: "HRMS",
      items: [
        { label: "My Attendance", path: "/employee/attendance", icon: CalendarCheck, module: "attendance" },
        { label: "Leaves", path: "/employee/leaves", icon: File, module: "leave" },
        { label: "Payslips", path: "/employee/payslips", icon: Receipt, module: "payroll" },
      ],
    },
    {
      title: "COMMUNICATION & DOCS",
      items: [
        { label: "My Documents", path: "/employee/documents", icon: FileText },
        { label: "Announcements", path: "/employee/announcements", icon: Megaphone },
        { label: "Notifications", path: "/employee/notifications", icon: Bell },
      ],
    },
    {
      title: "ACCOUNT & SETTINGS",
      items: [
        { label: "My Profile", path: "/employee/profile", icon: User },
        { label: "Settings", path: "/employee/settings", icon: Settings },
      ],
    },
    {
      title: "OTHER",
      items: [
        { label: "Company Requests", path: "/employee/requests", icon: MessageSquare },
      ],
    },
  ];

  const companyName =
    profileData?.company?.companyName ||
    profileData?.company?.name ||
    "One Click Solutions";

  const userName =
    profileData?.employee?.fullName ||
    profileData?.employee?.firstName ||
    user?.name ||
    "Employee";

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div
      className={`ca-sidebar ${
        isCollapsed ? "w-[68px]" : "w-full lg:w-[228px]"
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

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1.5" : "px-3 py-1"} oc-scroll`}>
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            return hasPermission(item.module, "view") || hasPermission(item.module);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className={isCollapsed ? "mb-1" : "mb-1"}>
              {!isCollapsed && section.title && (
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 px-2.5 pt-3 pb-1">
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
                      className={`${
                        isCollapsed
                          ? `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${
                              active
                                ? "bg-[#1268D9] text-white shadow-md shadow-[#1268D9]/30"
                                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                            }`
                          : `oc-nav-item ${active ? "active" : ""}`
                      }`}
                    >
                      {isCollapsed ? (
                        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-white" : "text-slate-400"} />
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={15}
                            strokeWidth={active ? 2 : 1.75}
                            className={`flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`}
                          />
                          <span className="truncate text-[13px]">{item.label}</span>
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

      {/* ── Footer ── */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center gap-2" : "px-3 pb-3 pt-2 space-y-1.5"}`}>
        {!isCollapsed ? (
          <>
            {/* Company pill */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-[#061225] text-[12px] font-semibold text-slate-300 cursor-default hover:bg-white/[0.06] transition-all">
              <div className="flex items-center gap-2 truncate min-w-0">
                <Hexagon size={13} strokeWidth={1.75} className="text-[#1268D9] flex-shrink-0" />
                <span className="truncate">{companyName}</span>
              </div>
              <ChevronDown size={12} strokeWidth={1.75} className="text-slate-500 flex-shrink-0" />
            </div>

            {/* User row + Logout */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] hover:bg-white/[0.04] transition-all cursor-pointer group">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative flex-shrink-0">
                  {(() => {
                    const emp = profileData?.employee || {};
                    const rawAvatar = user?.profileImage || emp.photo || emp.profileImage;
                    const avatarUrl = rawAvatar ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") ? rawAvatar : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`) : null;

                    return avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover shadow-xs border border-slate-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[11px]">
                        {userName.slice(0, 2).toUpperCase()}
                      </div>
                    );
                  })()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-[#1268D9] transition-colors">{userName}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">Employee</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer"
              >
                <LogOut size={13} strokeWidth={1.75} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              title={userName}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[11px] shadow-xs cursor-pointer"
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeSidebar;
