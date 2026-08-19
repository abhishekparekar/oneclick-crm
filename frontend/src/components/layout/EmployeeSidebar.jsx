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
  CalendarDays,
  Layers,
  File,
  Bell,
  Settings,
  ChevronDown,
  Hexagon,
  Magnet,
  MessageSquare,
  Clock,
} from "lucide-react";

// ─── Employee Sidebar — mirrors CompanyAdminSidebar exactly ──────────────────
const EmployeeSidebar = ({ logout, onItemClick }) => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");

  const { data: profileData } = useQuery({
    queryKey: ["employeeProfile"],
    queryFn: () => getMyProfileApi().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const sections = [
    {
      title: "CORE DASHBOARD",
      items: [
        { label: "Dashboard", path: "/employee/dashboard", icon: LayoutDashboard },
        { label: "Company Requests", path: "/employee/requests", icon: MessageSquare },
        { label: "My Profile", path: "/employee/profile", icon: User },
        { label: "My Documents", path: "/employee/documents", icon: FileText },
      ],
    },
    ...(canAccessLeads ? [
      {
        title: "LEAD CRM",
        items: [
          { label: "Leads Pipeline", path: "/employee/leads", icon: Magnet },
        ],
      }
    ] : []),
    {
      title: "STAFF & WORK",
      items: [
        { label: "My Attendance", path: "/employee/attendance", icon: CalendarDays },
        { label: "My Tasks", path: "/employee/my-tasks", icon: Layers },
        { label: "Leave", path: "/employee/leaves", icon: File },
        { label: "Payslips", path: "/employee/payslips", icon: Receipt },
      ],
    },
    {
      title: "COMMUNICATION",
      items: [
        { label: "Notifications", path: "/employee/notifications", icon: Bell },
        { label: "Announcements", path: "/employee/announcements", icon: Megaphone },
      ],
    },
    {
      title: "SYSTEM",
      items: [
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
    <div className="ca-sidebar w-full lg:w-[228px] bg-[#090D16] text-slate-300 border-r border-white/[0.06] h-full flex flex-col flex-shrink-0 transition-colors duration-300">

      {/* Brand Logo Header */}
      <div className="px-3.5 py-3 flex items-center justify-center border-b border-white/[0.06] mb-1">
        <OneClickLogo variant="landscape" />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 oc-scroll">
        {sections.map((section, idx) => (
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
                const emp = profileData?.employee || {};
                const rawAvatar = user?.profileImage || emp.photo || emp.profileImage;
                const avatarUrl = rawAvatar ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") ? rawAvatar : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`) : null;

                return avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover shadow-xs border border-slate-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white font-bold text-[11px]">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#090D16]" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Employee</p>
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

export default EmployeeSidebar;
