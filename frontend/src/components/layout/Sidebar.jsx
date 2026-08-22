import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCompanyProfileApi, getActiveSubscriptionApi } from "../../api/companyAdminApi";
import { getManagerProfileApi } from "../../api/managerApi";
import { getMyProfileApi } from "../../api/employeeApi";
import EmployeeSidebar from "./EmployeeSidebar";
import ManagerSidebar from "./ManagerSidebar";
import HRSidebar from "./HRSidebar";
import OneClickLogo from "../common/OneClickLogo";
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Search,
  CalendarCheck, FileText, CalendarDays, GitBranch, Tags, MapPin, UserPlus, ShieldCheck, FileUp,
  DollarSign, Receipt, Megaphone, ShieldAlert, BarChart2, ClipboardList, Activity,
  Briefcase, CheckSquare, UserCircle, Hexagon, HelpCircle, ChevronDown, Leaf, Sparkles,
  ListTodo, UsersRound, FolderKanban, UserCog, Bell, MessageSquare
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
      { label: "Leads", path: "/company/leads", icon: UsersRound },
      { label: "WhatsApp Automation", path: "/company/leads/automation", icon: Sparkles },
      { label: "WhatsApp Campaigns", path: "/company/leads/campaigns", icon: Megaphone },
      { label: "Reminders", path: "/company/leads/reminders", icon: CalendarDays },
      { label: "Lead Settings", path: "/company/leads/settings", icon: Settings },
    ],
  },
  {
    title: "PROJECTS",
    items: [
      { label: "Projects", path: "/company/projects", icon: Briefcase, module: "projects" },
    ],
  },
  {
    title: "HRMS",
    items: [
      { label: "Employees", path: "/company/employees", icon: Users },
      { label: "Attendance", path: "/company/attendance", icon: CalendarCheck, module: "attendance" },
      { label: "Leaves", path: "/company/leaves", icon: FileText, module: "leave" },
      { label: "Holidays", path: "/company/holidays", icon: CalendarDays, module: "leave" },
      { label: "Shift & Rosters", path: "/company/attendance-settings", icon: CalendarDays, module: "attendance" },
      { label: "Payroll", path: "/company/payroll/history", icon: DollarSign, module: "payroll" },
      { label: "Salary Advances", path: "/company/payroll/advances", icon: Receipt, module: "payroll" },
      { label: "Departments", path: "/company/departments", icon: GitBranch },
      { label: "Branches", path: "/company/branches", icon: MapPin },
    ],
  },
  {
    title: "ORGANIZATION",
    items: [
      { label: "Company Profile", path: "/company/profile", icon: UserCircle },
      { label: "Upload Document", path: "/company/upload-document", icon: FileUp },
      { label: "Announcements", path: "/company/announcements", icon: Megaphone },
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
      { label: "Access & Control", path: "/company/access-control", icon: ShieldAlert },
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

// ─── Super Admin nav sections ───────────────────────────────────────────────
const SUPERADMIN_SECTIONS = [
  {
    title: null,
    items: [
      { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: null,
    items: [
      { label: "Companies", path: "/superadmin/companies", icon: Building2 },
      { label: "Company Requests", path: "/superadmin/company-requests", icon: UserPlus },
      { label: "Company Admins", path: "/superadmin/company-admins", icon: ShieldCheck },
    ],
  },
  {
    title: null,
    items: [
      { label: "Subscriptions", path: "/superadmin/subscriptions", icon: Receipt },
      { label: "Plans", path: "/superadmin/plans", icon: Tags },
      { label: "Payments", path: "/superadmin/payments", icon: DollarSign },
    ],
  },
  {
    title: null,
    items: [
      { label: "Global Users", path: "/superadmin/users", icon: Users },
      { label: "Announcements", path: "/superadmin/announcements", icon: Megaphone },
      { label: "Support Tickets", path: "/superadmin/support-tickets", icon: ShieldAlert },
    ],
  },
  {
    title: null,
    items: [
      { label: "Reports & Analytics", path: "/superadmin/reports", icon: BarChart2 },
      { label: "Activity Logs", path: "/superadmin/activity-logs", icon: ClipboardList },
      { label: "System Settings", path: "/superadmin/settings", icon: Settings },
    ],
  },
  {
    title: null,
    items: [
      { label: "Profile", path: "/superadmin/profile", icon: UserCircle },
      { label: "Logout", path: "/login", icon: LogOut, action: "logout" },
    ],
  },
];

// ─── Super Admin Sidebar (Company Admin Dark Obsidian + Amber theme) ─────────
const SuperAdminSidebar = ({ logout, onItemClick }) => {
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
        { label: "Global Users", path: "/superadmin/users", icon: Users },
        { label: "Announcements", path: "/superadmin/announcements", icon: Megaphone },
        { label: "Support Tickets", path: "/superadmin/support-tickets", icon: ShieldAlert },
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
    <div className="ca-sidebar w-full lg:w-[228px] bg-[#090D16] text-slate-300 border-r border-white/[0.06] h-full flex flex-col flex-shrink-0 transition-colors duration-300">
      {/* Logo — identical to Company Admin */}
      <div className="px-3.5 py-3 flex flex-col items-center border-b border-white/[0.06] mb-1 gap-1">
        <OneClickLogo variant="landscape" />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-500/80 mt-0.5">Super Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 oc-scroll">
        {SUPERADMIN_NAV.map((section, idx) => (
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
                      <Icon size={15} strokeWidth={1.75} className={`flex-shrink-0 ${active ? "text-amber-400" : "text-slate-500"}`} />
                      <span className="truncate text-[13px]">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-white/[0.04] text-[12px] font-semibold text-slate-300 cursor-pointer hover:bg-white/[0.06] transition-all">
          <div className="flex items-center gap-2 truncate min-w-0">
            <Hexagon size={13} strokeWidth={1.75} className="text-amber-400 flex-shrink-0" />
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-[11px] shadow-xs">
                SA
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-amber-400 transition-colors">Super Admin</p>
              <p className="text-[10px] text-slate-500 leading-tight">Platform Root</p>
            </div>
          </Link>
          <button onClick={logout} title="Log Out" className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer">
            <LogOut size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};



// ─── Company Admin Sidebar (ONE CLICK obsidian theme) ────────────────────
const CompanyAdminSidebar = ({ logout, onItemClick }) => {
  const location = useLocation();
  const { user } = useAuth();

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

  const subscription = subData?.subscription;
  const planModules = subscription?.planId?.modules || [];
  const companyName = profileData?.company?.companyName || profileData?.company?.name || "One Click Solutions";
  const userName = user?.name || "Rameshwar Shinde";

  const isActive = (path) => {
    if (path === "/company/leads") return location.pathname === "/company/leads";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="ca-sidebar w-full lg:w-[228px] bg-[#090D16] text-slate-300 border-r border-white/[0.06] h-full flex flex-col flex-shrink-0 transition-colors duration-300">
      {/* Centered Brand Logo Header */}
      <div className="px-3.5 py-3 flex items-center justify-center border-b border-white/[0.06] mb-1">
        <OneClickLogo variant="landscape" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 oc-scroll">
        {COMPANY_SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            if (!subscription) return true;
            return planModules.includes(item.module);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="mb-1">
              {section.title && (
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 px-2.5 pt-3 pb-1">
                  {section.title}
                </p>
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
                      className={`oc-nav-item ${active ? "active" : ""}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} strokeWidth={1.75} className={`flex-shrink-0 ${active ? "text-amber-400" : "text-slate-500"}`} />
                        <span className="truncate text-[13px]">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        {/* Company */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-[8px] bg-white/[0.04] text-[12px] font-semibold text-slate-300 cursor-pointer hover:bg-white/[0.06] transition-all">
          <div className="flex items-center gap-2 truncate min-w-0">
            <Hexagon size={13} strokeWidth={1.75} className="text-amber-400 flex-shrink-0" />
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-2xs">
                    {(userName || "A").slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight group-hover:text-amber-400 transition-colors">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Company Admin</p>
            </div>
          </Link>
          <button onClick={logout} title="Log Out" className="text-slate-600 hover:text-rose-400 transition-colors p-1 cursor-pointer">
            <LogOut size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Sidebar (role router) ─────────────────────────────────────────────
const Sidebar = ({ onItemClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (user?.role === "SuperAdmin" || location.pathname.startsWith("/superadmin")) {
    return <SuperAdminSidebar logout={logout} onItemClick={onItemClick} />;
  }

  if (user?.role === "Manager" || location.pathname.startsWith("/manager")) {
    return <ManagerSidebar logout={logout} onItemClick={onItemClick} />;
  }

  if (user?.role === "Employee" || location.pathname.startsWith("/employee")) {
    return <EmployeeSidebar logout={logout} onItemClick={onItemClick} />;
  }

  if (user?.role === "HR" || location.pathname.startsWith("/hr")) {
    return <HRSidebar logout={logout} onItemClick={onItemClick} />;
  }

  return <CompanyAdminSidebar logout={logout} onItemClick={onItemClick} />;
};

export default Sidebar;
