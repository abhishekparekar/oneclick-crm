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
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Magnet,
  MessageSquare,
  Navigation,
} from "lucide-react";

// ─── Employee Sidebar ────────────────────────────────────────────────────────
const EmployeeSidebar = ({ logout, onItemClick, isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["employeeProfile"],
    queryFn: () => getMyProfileApi().then((r) => r.data),
    staleTime: 30 * 1000,
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
      title: "LEAD",
      items: [
        { label: "Lead", path: "/employee/leads", icon: Magnet, module: "leads" },
      ],
    },
    {
      title: "HRMS",
      items: [
        { label: "My Attendance", path: "/employee/attendance", icon: CalendarCheck, module: "attendance" },
        { label: "Company Requests", path: "/employee/requests", icon: MessageSquare },
        { label: "Live Location Tracking", path: "/employee/location-tracking", icon: Navigation, module: "location_tracking" },
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
            if (item.module === "location_tracking") {
              return Boolean(
                profileData?.employee?.isLocationTrackingEnabled ||
                user?.isLocationTrackingEnabled ||
                user?.employee?.isLocationTrackingEnabled ||
                (Array.isArray(assignedModules) && assignedModules.some((m) => ["location", "locationtracking", "location_tracking", "tracking"].includes(String(m).toLowerCase()))) ||
                hasPermission("locationTracking") ||
                hasPermission("location")
              );
            }
            if (Array.isArray(subscribedModules)) {
              const norm = String(item.module).toLowerCase().trim();
              const subs = subscribedModules.map(m => String(m).toLowerCase().trim());
              if (!subs.includes(norm)) return false;
            }
            if (Array.isArray(assignedModules) && assignedModules.length > 0) {
              const norm = String(item.module).toLowerCase().trim();
              const assigned = assignedModules.map(m => String(m).toLowerCase().trim());
              if (!assigned.includes(norm)) return false;
            }
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

      {/* ── Sidebar Collapse / Close Button ── */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center" : "p-2.5 bg-[#061225]"}`}>
        {!isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer group"
            title="Collapse Sidebar"
          >
            <span className="text-xs font-bold tracking-wide text-slate-400 group-hover:text-slate-200">Collapse Sidebar</span>
            <div className="w-6 h-6 rounded-lg bg-white/[0.04] group-hover:bg-[#1268D9]/20 group-hover:text-[#1268D9] flex items-center justify-center transition-colors">
              <ChevronLeft size={15} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-[#1268D9] border border-white/[0.06] transition-all cursor-pointer shadow-2xs"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeSidebar;
