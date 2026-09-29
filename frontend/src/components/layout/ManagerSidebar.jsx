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
  Wallet,
  FileUp,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER NAV SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const MANAGER_SECTIONS = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/manager/dashboard", icon: LayoutDashboard },
      { label: "Leads", path: "/manager/leads", icon: Magnet, module: "leads" },
      { label: "My Tasks", path: "/manager/my-tasks", icon: ListTodo, module: "tasks" },
      { label: "Team Tasks", path: "/manager/team-tasks", icon: CheckSquare, module: "tasks" },
      { label: "Team Attendance", path: "/manager/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Company Requests", path: "/manager/requests", icon: MessageSquare },
      { label: "My Leaves", path: "/manager/my-leave", icon: FileText, module: "leave" },
      { label: "Payslips", path: "/manager/payslips", icon: Receipt, module: "payroll" },
    ],
  },
  {
    title: "TEAM MANAGEMENT",
    items: [
      { label: "Team Members", path: "/manager/team", icon: Users },
      { label: "Upload Documents", path: "/manager/upload-document", icon: FileUp, permission: ["teamMembers", "uploadDocs"] },
      { label: "My Attendance", path: "/manager/my-attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Live Tracking", path: "/manager/location-tracking", icon: Navigation, module: "attendance", modules: ["attendance", "location_tracking"] },
      // { label: "Tracking Allowance", path: "/manager/tracking-allowance", icon: Wallet, module: "attendance", modules: ["attendance", "location_tracking"] },
      { label: "Team Leaves", path: "/manager/team-leaves", icon: CalendarDays, module: "leave" },
      { label: "Generate Payroll", path: "/manager/payroll/generate", icon: Receipt, module: "payroll", permission: ["payroll", "generate"] },
      { label: "Payroll History", path: "/manager/payroll/history", icon: FileText, module: "payroll", permission: ["payroll", "generate"] },
    ],
  },
  {
    title: "CRM & PROJECTS",
    items: [
      { label: "Campaigns", path: "/manager/leads/campaigns", icon: Megaphone, module: "leads" },
      { label: "Reminders", path: "/manager/leads/reminders", icon: Clock, module: "leads" },
      { label: "Projects", path: "/manager/projects", icon: FolderKanban, module: "projects" },
    ],
  },
  {
    title: "REPORTS & UPDATES",
    items: [
      { label: "Reports", path: "/manager/reports", icon: BarChart2, module: "reports" },
      { label: "Attendance Report", path: "/manager/attendance-report", icon: FileSpreadsheet, modules: ["attendance", "reports"] },
      { label: "Announcements", path: "/manager/announcements", icon: Megaphone },
    ],
  },
];

const ManagerSidebar = ({ logout, onItemClick, isCollapsed = false, onToggleCollapse }) => {
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
            if (item.permission) {
              const [cat, act] = Array.isArray(item.permission) ? item.permission : [item.permission, "view"];
              if (!hasPermission(cat, act)) return false;
            }
            if (!item.module && !item.modules) return true;
            if (Array.isArray(liveSubscribed)) {
              const subs = liveSubscribed.map(m => String(m).toLowerCase().trim());
              if (item.modules) {
                const hasMatch = item.modules.some(m => subs.includes(String(m).toLowerCase().trim()));
                if (!hasMatch) return false;
              } else {
                const norm = String(item.module).toLowerCase().trim();
                if (!subs.includes(norm)) return false;
              }
            }
            if (Array.isArray(assignedModules) && assignedModules.length > 0) {
              const assigned = assignedModules.map(m => String(m).toLowerCase().trim());
              if (item.modules) {
                const hasMatch = item.modules.some(m => assigned.includes(String(m).toLowerCase().trim()));
                if (!hasMatch) return false;
              } else {
                const norm = String(item.module).toLowerCase().trim();
                if (!assigned.includes(norm)) return false;
              }
            }
            if (item.modules) {
              return item.modules.some(m => hasPermission(m, "view") || hasPermission(m));
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

      {/* ── Sidebar Collapse / Close Button ── */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center" : "p-2.5 bg-[#061225]"}`}>
        {!isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-all cursor-pointer group"
            title="Collapse Sidebar"
          >
            <span className="text-xs font-bold tracking-wide text-slate-400 group-hover:text-slate-200">Collapse Sidebar</span>
            <div className="w-6 h-6 rounded-lg bg-white/[0.04] group-hover:bg-amber-500/20 group-hover:text-amber-400 flex items-center justify-center transition-colors">
              <ChevronLeft size={15} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-amber-400 border border-white/[0.06] transition-all cursor-pointer shadow-2xs"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ManagerSidebar;
