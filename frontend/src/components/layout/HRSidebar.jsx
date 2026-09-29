import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMyProfileApi } from "../../api/employeeApi";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  CalendarDays,
  UserPlus,
  FileUp,
  DollarSign,
  Receipt,
  Megaphone,
  BarChart2,
  CheckSquare,
  UserCircle,
  LogOut,
  GitBranch,
  Settings,
  UserCheck,
  Clock,
  Award,
  Magnet,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Navigation,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HR NAV SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const HR_NAV_SECTIONS = [
  {
    title: "DAILY WORKSPACE",
    items: [
      { label: "Dashboard", path: "/hr/dashboard", icon: LayoutDashboard },
      { label: "Lead", path: "/hr/leads", icon: Magnet, module: "leads" },
      { label: "Task Overview", path: "/hr/tasks", icon: CheckSquare, module: "tasks" },
      { label: "Daily Attendance", path: "/hr/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Company Requests", path: "/hr/requests", icon: MessageSquare },
      { label: "Attendance Report", path: "/hr/attendance-report", icon: FileSpreadsheet, module: "attendance" },
      { label: "Live Employee Tracking", path: "/hr/location-tracking", icon: Navigation, module: "attendance", modules: ["attendance", "location_tracking"] },
      // { label: "Tracking Allowance", path: "/hr/tracking-allowance", icon: Wallet, module: "attendance", modules: ["attendance", "location_tracking"] },
      { label: "Leave Requests", path: "/hr/leaves", icon: FileText, module: "leave" },
      { label: "Regularization", path: "/hr/regularization", icon: UserCheck, module: "attendance" },
      { label: "Employee Roster", path: "/hr/employees", icon: Users },
    ],
  },
  {
    title: "PAYROLL & COMPENSATION",
    items: [
      { label: "Generate Payroll", path: "/hr/payroll/generate", icon: Receipt, module: "payroll" },
      { label: "Payroll History", path: "/hr/payroll/history", icon: FileText, module: "payroll" },
      { label: "Salary Structures", path: "/hr/payroll/salary", icon: DollarSign, module: "payroll" },
      { label: "Salary Advances", path: "/hr/payroll/advances", icon: Award, module: "payroll" },
      { label: "My Payslips", path: "/hr/payslips", icon: Receipt, module: "payroll" },
    ],
  },
  {
    title: "PEOPLE & ONBOARDING",
    items: [
      { label: "Add Employee", path: "/hr/employees/add", icon: UserPlus },
      { label: "Document Management", path: "/hr/upload-document", icon: FileUp },
      { label: "Leave Balances", path: "/hr/leave-balance", icon: Clock, module: "leave" },
      { label: "Holidays Calendar", path: "/hr/holidays", icon: CalendarDays, module: "leave" },
      { label: "Departments", path: "/hr/departments", icon: GitBranch },
    ],
  },
  {
    title: "ANALYTICS & ENGAGEMENT",
    items: [
      { label: "HR Analytics", path: "/hr/reports", icon: BarChart2, module: "reports" },
      { label: "Performance", path: "/hr/performance", icon: Award, module: "performance" },
      { label: "Announcements", path: "/hr/announcements", icon: Megaphone },
    ],
  },
  // {
  //   title: "LEAD CRM & AUTOMATION",
  //   items: [
  //     { label: "WhatsApp Campaigns", path: "/hr/leads/campaigns", icon: Megaphone, module: "leads" },
  //     { label: "Service Reminders", path: "/hr/leads/reminders", icon: Clock, module: "leads" },
  //     { label: "Lead Settings", path: "/hr/leads/settings", icon: Settings, module: "leads" },
  //   ],
  // },
  {
    title: "ACCOUNT & SETTINGS",
    items: [
      { label: "My Profile", path: "/hr/profile", icon: UserCircle },
      { label: "Settings", path: "/hr/settings", icon: Settings },
    ],
  },
];

export default function HRSidebar({ logout, onItemClick, isCollapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const { data: profileRes } = useQuery({
    queryKey: ["hrProfile"],
    queryFn: getMyProfileApi,
    staleTime: 30 * 1000,
  });

  const empProfile = profileRes?.data?.employee || profileRes?.data || {};
  const assignedModules = empProfile?.assignedModules || user?.assignedModules || [];

  const companyName =
    empProfile?.companyId?.companyName ||
    empProfile?.companyId?.name ||
    empProfile?.company?.companyName ||
    empProfile?.companyName ||
    "One Click Solutions";

  const userName =
    user?.name ||
    (empProfile?.firstName ? `${empProfile.firstName} ${empProfile.lastName || ""}`.trim() : null) ||
    "HR Manager";

  const isActive = (path) => {
    return location.pathname === path || (path !== "/hr/dashboard" && location.pathname.startsWith(path));
  };

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

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1.5" : "px-3 py-1"} oc-scroll`}>
        {HR_NAV_SECTIONS.map((section, idx) => {
          const liveSubscribed = empProfile?.companyId?.subscribedModules || empProfile?.company?.subscribedModules || user?.company?.subscribedModules || user?.subscribedModules;
          const visibleItems = section.items.filter((item) => {
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
                      className={`${isCollapsed
                          ? `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all ${active
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
}
