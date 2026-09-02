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
  Hexagon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HR NAV SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const HR_NAV_SECTIONS = [
  {
    title: "DAILY WORKSPACE",
    items: [
      { label: "Dashboard", path: "/hr/dashboard", icon: LayoutDashboard },
      { label: "Leads Pipeline", path: "/hr/leads", icon: Magnet, module: "leads" },
      { label: "Task Overview", path: "/hr/tasks", icon: CheckSquare, module: "tasks" },
      { label: "Daily Attendance", path: "/hr/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Leave Requests", path: "/hr/leaves", icon: FileText, module: "leave" },
      { label: "Regularization", path: "/hr/regularization", icon: UserCheck, module: "attendance" },
      { label: "Company Requests", path: "/hr/requests", icon: MessageSquare },
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
  {
    title: "ACCOUNT & SETTINGS",
    items: [
      { label: "My Profile", path: "/hr/profile", icon: UserCircle },
      { label: "Settings", path: "/hr/settings", icon: Settings },
    ],
  },
];

export default function HRSidebar({ logout, onItemClick, isCollapsed = false }) {
  const location = useLocation();
  const { user } = useAuth();

  const { data: profileRes } = useQuery({
    queryKey: ["hrProfile"],
    queryFn: getMyProfileApi,
    staleTime: 5 * 60 * 1000,
  });

  const empProfile = profileRes?.data?.employee || profileRes?.data || {};
  const subscribedModules = empProfile?.companyId?.subscribedModules || user?.company?.subscribedModules || [];
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
        {HR_NAV_SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            if (subscribedModules.length > 0 && !subscribedModules.includes(item.module)) return false;
            // Also check employee's own assignedModules
            if (assignedModules.length > 0 && !assignedModules.includes(item.module)) return false;
            return true;
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[11px] shadow-xs">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-[#1268D9] transition-colors">{userName}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">HR Manager</p>
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
}
