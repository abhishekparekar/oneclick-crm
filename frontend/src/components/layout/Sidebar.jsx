import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCompanyProfileApi, getActiveSubscriptionApi } from "../../api/companyAdminApi";
import EmployeeSidebar from "./EmployeeSidebar";
import ManagerSidebar from "./ManagerSidebar";
import HRSidebar from "./HRSidebar";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  CalendarCheck,
  FileText,
  CalendarDays,
  GitBranch,
  Tags,
  MapPin,
  UserPlus,
  ShieldCheck,
  FileUp,
  DollarSign,
  Receipt,
  Megaphone,
  BarChart2,
  ClipboardList,
  Activity,
  CheckSquare,
  Hexagon,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FolderKanban,
  Magnet,
  Bell,
  Clock,
  MessageSquare,
  BrainCircuit,
} from "lucide-react";

// ─── Company Admin nav sections — ordered by usage frequency ────────────────
const COMPANY_SECTIONS = [
  {
    title: null,
    items: [
      { label: "Dashboard", path: "/company/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "TASK",
    items: [
      { label: "Tasks", path: "/company/tasks", icon: CheckSquare, module: "tasks" },
    ],
  },
  {
    title: "LEAD ENGINE & WHATSAPP",
    items: [
      { label: "Leads", path: "/company/leads", icon: Magnet, module: "leads" },
      { label: "WhatsApp Automation", path: "/company/leads/automation", icon: Sparkles, module: "leads" },
      { label: "WhatsApp Campaigns", path: "/company/leads/campaigns", icon: Megaphone, module: "leads" },
      { label: "Reminders", path: "/company/leads/reminders", icon: Bell, module: "leads" },
      { label: "Lead Settings", path: "/company/leads/settings", icon: Settings, module: "leads" },
    ],
  },
  {
    title: "PROJECTS",
    items: [
      { label: "Projects", path: "/company/projects", icon: FolderKanban, module: "projects" },
    ],
  },
  {
    title: "HRMS",
    items: [
      { label: "Employees", path: "/company/employees", icon: Users },
      { label: "Attendance", path: "/company/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Leaves", path: "/company/leaves", icon: FileText, module: "leave" },
      { label: "Holidays", path: "/company/holidays", icon: CalendarDays, module: "leave" },
      { label: "Shift & Rosters", path: "/company/attendance-settings", icon: Clock, module: "attendance" },
      { label: "Payroll", path: "/company/payroll/history", icon: DollarSign, module: "payroll" },
      { label: "Salary Advances", path: "/company/payroll/advances", icon: Receipt, module: "payroll" },
      { label: "Departments", path: "/company/departments", icon: GitBranch },
      { label: "Branches", path: "/company/branches", icon: MapPin },
    ],
  },
  {
    title: "ORGANIZATION",
    items: [
      { label: "Company Profile", path: "/company/profile", icon: Building2 },
      { label: "Upload Document", path: "/company/upload-document", icon: FileUp },
      { label: "Announcements", path: "/company/announcements", icon: Megaphone },
    ],
  },
  {
    title: "AI INTELLIGENCE",
    items: [
      { label: "AI Business Dashboard", path: "/company/ai-intelligence", icon: BrainCircuit },
    ],
  },
  {
    title: "REPORTS",
    items: [
      { label: "Reports & Analytics", path: "/company/reports/attendance", icon: BarChart2, module: "reports" },
      { label: "Performance", path: "/company/reports/performance", icon: Activity, module: "performance" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Settings", path: "/company/settings", icon: Settings },
      { label: "Access & Control", path: "/company/access-control", icon: ShieldCheck },
      { label: "Payroll Settings", path: "/company/payroll/settings", icon: Receipt, module: "payroll" },
      { label: "Subscription", path: "/company/subscription", icon: Sparkles },
    ],
  },
  {
    title: "OTHER",
    items: [
      { label: "Company Requests", path: "/company/requests", icon: MessageSquare },
    ],
  },
];

// ─── Super Admin Sidebar ──────────────────────────────────────────────────
const SuperAdminSidebar = ({ logout, onItemClick, isCollapsed = false }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const SUPERADMIN_NAV = [
    {
      title: null,
      items: [
        { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        { label: "Companies", path: "/superadmin/companies", icon: Building2 },
        { label: "Company Requests", path: "/superadmin/company-requests", icon: UserPlus },
        { label: "Company Admins", path: "/superadmin/company-admins", icon: ShieldCheck },
      ],
    },
    {
      title: "BILLING",
      items: [
        { label: "Subscriptions", path: "/superadmin/subscriptions", icon: Receipt },
        { label: "Plans", path: "/superadmin/plans", icon: Tags },
        { label: "Payments", path: "/superadmin/payments", icon: DollarSign },
      ],
    },
    {
      title: "USERS & CONTENT",
      items: [
        { label: "Announcements", path: "/superadmin/announcements", icon: Megaphone },
        { label: "Support Tickets", path: "/superadmin/support-tickets", icon: MessageSquare },
      ],
    },
    {
      title: "INSIGHTS",
      items: [
        { label: "Reports & Analytics", path: "/superadmin/reports", icon: BarChart2 },
        { label: "Activity Logs", path: "/superadmin/activity-logs", icon: ClipboardList },
        { label: "System Settings", path: "/superadmin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div
      className={`ca-sidebar ${
        isCollapsed ? "w-[68px]" : "w-full lg:w-[228px]"
      } bg-[#050F1F] text-slate-300 border-r border-[#1C3554]/60 h-full flex flex-col flex-shrink-0 transition-all duration-300 select-none`}
    >
      {/* Centered Brand Logo Header */}
      <div className={`px-2.5 py-3 flex flex-col items-center justify-center border-b border-white/[0.06] mb-1 ${isCollapsed ? "h-[60px]" : "gap-1"}`}>
        {isCollapsed ? (
          <OneClickLogo variant="square" />
        ) : (
          <>
            <OneClickLogo variant="landscape" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#1268D9] mt-0.5">Super Admin</span>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1.5" : "px-3 py-1"} oc-scroll`}>
        {SUPERADMIN_NAV.map((section, idx) => (
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
              {section.items.map((item) => {
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
                        <Icon size={15} strokeWidth={active ? 2 : 1.75} className={`flex-shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                        <span className="truncate text-[13px]">{item.label}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center gap-2" : "px-3 pb-3 pt-2 space-y-1.5"}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-[#061225] text-[12px] font-semibold text-slate-300 cursor-pointer hover:bg-white/[0.06] transition-all">
              <div className="flex items-center gap-2 truncate min-w-0">
                <Hexagon size={13} strokeWidth={1.75} className="text-[#1268D9] flex-shrink-0" />
                <span className="truncate">One Click Platform</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] hover:bg-white/[0.04] transition-all group">
              <Link
                to="/superadmin/profile"
                onClick={onItemClick}
                className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                title="View Super Admin Profile"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[11px] shadow-xs">
                    SA
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-[#1268D9] transition-colors">Super Admin</p>
                  <p className="text-[10px] text-slate-500 leading-tight">Platform Root</p>
                </div>
              </Link>
              <button onClick={logout} title="Log Out" className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer">
                <LogOut size={13} strokeWidth={1.75} />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link
              to="/superadmin/profile"
              onClick={onItemClick}
              title="Super Admin Profile"
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-bold text-[11px] shadow-xs"
            >
              SA
            </Link>
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

// ─── Company Admin Sidebar ────────────────────────────────────────────────
const CompanyAdminSidebar = ({ logout, onItemClick, isCollapsed = false }) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ["companyProfile"],
    queryFn: () => getCompanyProfileApi().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: subData } = useQuery({
    queryKey: ["activeSubscription"],
    queryFn: () => getActiveSubscriptionApi().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const companyName = profileData?.company?.companyName || profileData?.company?.name || "One Click Solutions";
  const userName = user?.name || "Company Admin";

  const isActive = (path) => {
    if (path === "/company/leads") return location.pathname === "/company/leads";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div
      className={`ca-sidebar ${
        isCollapsed ? "w-[68px]" : "w-full lg:w-[228px]"
      } bg-[#050F1F] text-slate-300 border-r border-[#1C3554]/60 h-full flex flex-col flex-shrink-0 transition-all duration-300 select-none`}
    >
      {/* Centered Brand Logo Header */}
      <div className={`px-2.5 py-3 flex items-center justify-center border-b border-white/[0.06] mb-1 ${isCollapsed ? "h-[60px]" : ""}`}>
        {isCollapsed ? (
          <OneClickLogo variant="square" />
        ) : (
          <OneClickLogo variant="landscape" />
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1.5" : "px-3 py-1"} oc-scroll`}>
        {COMPANY_SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            return hasPermission(item.module, "view") || hasPermission(item.module);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className={isCollapsed ? "mb-1" : "mb-1"}>
              {!isCollapsed && section.title && (
                <p className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2.5 pt-3 pb-1 ${
                  section.title === "AI INTELLIGENCE"
                    ? "text-violet-400"
                    : "text-slate-500"
                }`}>
                  {section.title === "AI INTELLIGENCE" ? "✦ " : ""}{section.title}
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

      {/* Footer */}
      <div className={`border-t border-white/[0.06] ${isCollapsed ? "p-2 flex flex-col items-center gap-2" : "px-3 pb-3 pt-2 space-y-1.5"}`}>
        {!isCollapsed ? (
          <>
            {/* Company */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-[#061225] text-[12px] font-semibold text-slate-300 cursor-pointer hover:bg-white/[0.06] transition-all">
              <div className="flex items-center gap-2 truncate min-w-0">
                <Hexagon size={13} strokeWidth={1.75} className="text-[#1268D9] flex-shrink-0" />
                <span className="truncate">{companyName}</span>
              </div>
              <ChevronDown size={12} strokeWidth={1.75} className="text-slate-500 flex-shrink-0" />
            </div>

            {/* User Profile Card */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] hover:bg-white/[0.04] transition-all group">
              <Link
                to="/company/profile"
                onClick={onItemClick}
                className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-90 transition-opacity"
                title="View Company Admin Profile"
              >
                <div className="relative flex-shrink-0">
                  {(() => {
                    const rawAvatar = user?.profileImage || user?.photo || user?.avatar || user?.profilePicture;
                    let avatarUrl = null;
                    if (rawAvatar && typeof rawAvatar === "string") {
                      const trimmed = rawAvatar.trim();
                      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
                        avatarUrl = trimmed;
                      } else {
                        const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
                        const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
                        avatarUrl = `${base}/${cleanPath}`;
                      }
                    }

                    return avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover shadow-2xs border border-slate-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-black text-[11px] shadow-2xs">
                        {(userName || "A").slice(0, 2).toUpperCase()}
                      </div>
                    );
                  })()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-[#1268D9] transition-colors">{userName}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">Company Admin</p>
                </div>
              </Link>
              <button onClick={logout} title="Log Out" className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer">
                <LogOut size={13} strokeWidth={1.75} />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link
              to="/company/profile"
              onClick={onItemClick}
              title={userName}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1268D9] to-[#082B52] flex items-center justify-center text-white font-black text-[11px] shadow-xs"
            >
              {(userName || "A").slice(0, 2).toUpperCase()}
            </Link>
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

// ─── Main Sidebar (role router) ─────────────────────────────────────────────
const Sidebar = ({ onItemClick, isCollapsed = false }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (user?.role === "SuperAdmin" || location.pathname.startsWith("/superadmin")) {
    return <SuperAdminSidebar logout={logout} onItemClick={onItemClick} isCollapsed={isCollapsed} />;
  }

  if (user?.role === "Manager" || location.pathname.startsWith("/manager")) {
    return <ManagerSidebar logout={logout} onItemClick={onItemClick} isCollapsed={isCollapsed} />;
  }

  if (user?.role === "Employee" || location.pathname.startsWith("/employee")) {
    return <EmployeeSidebar logout={logout} onItemClick={onItemClick} isCollapsed={isCollapsed} />;
  }

  if (user?.role === "HR" || location.pathname.startsWith("/hr")) {
    return <HRSidebar logout={logout} onItemClick={onItemClick} isCollapsed={isCollapsed} />;
  }

  return <CompanyAdminSidebar logout={logout} onItemClick={onItemClick} isCollapsed={isCollapsed} />;
};

export default Sidebar;
