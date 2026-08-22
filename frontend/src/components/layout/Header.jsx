import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import OneClickLogo from "../common/OneClickLogo";
import {
  Search, Bell, ChevronDown, Menu, Settings, LogOut,
  User, Moon, Sun, Megaphone, X, Users, LayoutDashboard,
  CalendarOff, Folder, BarChart2, CheckSquare, Building2,
  Calendar, DollarSign, Clock, Magnet, MessageSquare,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "../../api/notificationApi";

// ── Quick-nav links shown in search results ────────────────────────────────────
const COMPANY_PAGES = [
  { label: "Dashboard",           path: "/company/dashboard",         icon: LayoutDashboard },
  { label: "Employees",           path: "/company/employees",         icon: Users },
  { label: "Add Employee",        path: "/company/employees/add",     icon: Users },
  { label: "Departments",         path: "/company/departments",       icon: Building2 },
  { label: "Designations",        path: "/company/designations",      icon: Building2 },
  { label: "Branches",            path: "/company/branches",          icon: Building2 },
  { label: "Attendance",          path: "/company/attendance",        icon: Clock },
  { label: "Leave Requests",      path: "/company/leaves",            icon: CalendarOff },
  { label: "Leave Balance",       path: "/company/leave-balance",     icon: CalendarOff },
  { label: "Holidays",            path: "/company/holidays",          icon: Calendar },
  { label: "Task Board",          path: "/company/tasks",             icon: CheckSquare },
  { label: "Projects",            path: "/company/projects",          icon: Folder },
  { label: "Announcements",       path: "/company/announcements",     icon: Megaphone },
  { label: "Generate Payroll",    path: "/company/payroll/generate",  icon: DollarSign },
  { label: "Payroll History",     path: "/company/payroll/history",   icon: DollarSign },
  { label: "Salary Structures",   path: "/company/payroll/salary",    icon: DollarSign },
  { label: "Reports",             path: "/company/reports/attendance",icon: BarChart2 },
  { label: "Audit Logs",          path: "/company/audit-logs",        icon: BarChart2 },
  { label: "Access Control",      path: "/company/access-control",    icon: Settings },
  { label: "Company Profile",     path: "/company/profile",           icon: Building2 },
  { label: "Settings",            path: "/company/settings",          icon: Settings },
];

const SUPERADMIN_PAGES = [
  { label: "Dashboard",           path: "/superadmin/dashboard",      icon: LayoutDashboard },
  { label: "Companies",           path: "/superadmin/companies",      icon: Building2 },
  { label: "Company Requests",    path: "/superadmin/company-requests", icon: Building2 },
  { label: "Company Admins",      path: "/superadmin/company-admins", icon: Users },
  { label: "Users",               path: "/superadmin/users",          icon: Users },
  { label: "Plans",               path: "/superadmin/plans",          icon: DollarSign },
  { label: "Subscriptions",       path: "/superadmin/subscriptions",  icon: DollarSign },
  { label: "Payments",            path: "/superadmin/payments",       icon: DollarSign },
  { label: "Announcements",       path: "/superadmin/announcements",  icon: Megaphone },
  { label: "Support Tickets",     path: "/superadmin/support-tickets",icon: CheckSquare },
  { label: "Reports",             path: "/superadmin/reports",        icon: BarChart2 },
  { label: "Activity Logs",       path: "/superadmin/activity-logs",  icon: BarChart2 },
  { label: "Settings",            path: "/superadmin/settings",       icon: Settings },
  { label: "Profile",             path: "/superadmin/profile",        icon: User },
];

const EMPLOYEE_PAGES = [
  { label: "Dashboard",           path: "/employee/dashboard",        icon: LayoutDashboard },
  { label: "My Tasks",            path: "/employee/my-tasks",         icon: CheckSquare },
  { label: "Attendance",          path: "/employee/attendance",       icon: Clock },
  { label: "Leaves & Holidays",   path: "/employee/leaves",           icon: CalendarOff },
  { label: "My Projects",         path: "/employee/projects",         icon: Folder },
  { label: "Payslips",            path: "/employee/payslips",         icon: DollarSign },
  { label: "Announcements",       path: "/employee/announcements",    icon: Megaphone },
  { label: "My Profile",          path: "/employee/profile",          icon: User },
];

// ─────────────────────────────────────────────────────────────────────────────
const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [profileOpen, setProfileOpen]   = useState(false);
  const [notifOpen,   setNotifOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchOpen,  setSearchOpen]    = useState(false);
  const [darkMode,    setDarkMode]      = useState(() => localStorage.getItem("darkMode") === "true");

  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);
  const searchRef   = useRef(null);

  // ── Dark mode effect ──────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))     setNotifOpen(false);
      if (searchRef.current  && !searchRef.current.contains(e.target))    setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard shortcut ⌘K / Ctrl+K ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        searchRef.current?.querySelector("input")?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Search filtering ──────────────────────────────────────────────────────
  const isSuperAdmin = user?.role === "SuperAdmin" || location.pathname.startsWith("/superadmin");
  const isManager = user?.role === "Manager" || location.pathname.startsWith("/manager");
  const isEmployee = user?.role === "Employee" || location.pathname.startsWith("/employee");
  const pages = isSuperAdmin ? SUPERADMIN_PAGES : isEmployee ? EMPLOYEE_PAGES : COMPANY_PAGES;

  const searchResults = searchQuery.trim().length > 0
    ? pages.filter((p) =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 7)
    : [];

  const handleSearchSelect = (path) => {
    navigate(path);
    setSearchQuery("");
    setSearchOpen(false);
  };

  // ── Getters ───────────────────────────────────────────────────────────────
  const getPhotoUrl = (rawPhoto) => {
    if (!rawPhoto || typeof rawPhoto !== "string") return null;
    const trimmed = rawPhoto.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
    const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
    return `${base}/${cleanPath}`;
  };

  const getInitials = (name) => {
    if (!name) return "A";
    const parts = name.trim().split(" ");
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const { data: notifRes } = useQuery({
    queryKey: ["headerNotifications"],
    queryFn: () => getMyNotificationsApi(),
    refetchInterval: 5000,
  });

  const notifications = notifRes?.data?.notifications || [];
  const unreadCount   = notifRes?.data?.unreadCount   || 0;

  const markReadMutation = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => queryClient.invalidateQueries(["headerNotifications"]),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => queryClient.invalidateQueries(["headerNotifications"]),
  });

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markReadMutation.mutate(n._id);
    }
    setNotifOpen(false);

    const type = n.type;
    const data = n.data || {};

    if (isSuperAdmin) {
      if (type === "announcement") navigate("/superadmin/announcements");
      return;
    }

    if (isEmployee) {
      if (type === "task") navigate("/employee/my-tasks");
      else if (type === "leave") navigate("/employee/leaves");
      else if (type === "attendance") navigate("/employee/attendance");
      else if (type === "announcement") navigate("/employee/announcements");
      else if (type === "lead" || type === "lead_assigned" || type === "lead_status") navigate("/employee/leads");
      else if (type === "request" || type === "company_request") navigate("/employee/requests");
      return;
    }

    if (isHR) {
      if (type === "lead" || type === "lead_assigned" || type === "lead_status") {
        navigate("/hr/leads");
        return;
      }
      if (type === "request" || type === "company_request") {
        navigate("/hr/requests");
        return;
      }
    }

    if (isManager) {
      if (type === "lead" || type === "lead_assigned" || type === "lead_status") {
        navigate("/manager/leads");
        return;
      }
      if (type === "request" || type === "company_request") {
        navigate("/manager/requests");
        return;
      }
    }

    switch (type) {
      case "lead":
      case "lead_assigned":
      case "lead_status":
        navigate("/company/leads");
        break;
      case "request":
      case "company_request":
        navigate("/company/requests");
        break;
      case "task":
      case "task_update":
      case "task_template":
        if (data.taskId) {
          navigate(`/company/tasks/${data.taskId}`);
        } else {
          navigate("/company/tasks");
        }
        break;
      case "project":
        navigate("/company/projects");
        break;
      case "leave":
        navigate("/company/leaves");
        break;
      case "attendance":
        navigate("/company/attendance");
        break;
      case "announcement":
        navigate("/company/announcements");
        break;
      default:
        break;
    }
  };

  const isHR = user?.role === "HR" || location.pathname.startsWith("/hr");
  const profileRoute  = isSuperAdmin ? "/superadmin/profile"  : isHR ? "/hr/profile"  : isManager ? "/manager/profile"  : isEmployee ? "/employee/profile" : "/company/profile";
  const settingsRoute = isSuperAdmin ? "/superadmin/settings" : isHR ? "/hr/settings" : isManager ? "/manager/settings" : isEmployee ? "/employee/profile" : "/company/settings";
  const announcementsRoute = isSuperAdmin ? "/superadmin/announcements" : isHR ? "/hr/announcements" : isManager ? "/manager/announcements" : isEmployee ? "/employee/announcements" : "/company/announcements";

  return (
    <header className="h-14 bg-[#F0F5FA]/90 dark:bg-[#090D16]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-40 transition-colors">
      <div className="flex items-center space-x-2.5 sm:space-x-4 flex-1 min-w-0">
        {/* Sidebar toggle */}
        <button
          onClick={onMenuClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        {/* Mobile Brand Logo */}
        <div className="lg:hidden flex items-center shrink-0">
          <OneClickLogo variant="landscape" className="scale-85 origin-left" />
        </div>

        {/* Breadcrumb */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-medium">
          <span className="text-slate-900 dark:text-white font-semibold">Dashboard</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-500 dark:text-slate-400">Overview</span>
        </div>

        {/* ── Search Bar ────────────────────────────────────────────────────── */}
        <div className="flex-1 max-w-sm relative hidden md:block" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search anything..."
            className="w-full pl-9 pr-14 py-1.5 bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500/40 shadow-2xs transition-all font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono border rounded px-1.5 py-0.5 text-slate-400 bg-white dark:bg-[#090D16] border-slate-200 dark:border-slate-800">
              ⌘K
            </kbd>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className={`absolute top-full left-0 right-0 mt-1.5 border rounded-xl shadow-lg overflow-hidden z-50 ${
              isSuperAdmin ? "bg-sa-surface border-sa-border" : "bg-ca-surface border-ca-border"
            }`}>
              <div className={`px-3 py-2 border-b ${isSuperAdmin ? "border-sa-border bg-sa-bg/60" : "border-ca-border bg-ca-bg/60"}`}>
                <p className={`text-[12px] font-bold uppercase tracking-wider ${isSuperAdmin ? "text-sa-text-secondary" : "text-ca-text-secondary"}`}>Pages & Modules</p>
              </div>
              {searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.path}
                    onClick={() => handleSearchSelect(result.path)}
                    className={`flex items-center space-x-3 w-full px-4 py-2.5 text-base transition-colors text-left ${
                      isSuperAdmin ? "text-sa-text hover:bg-sa-hover hover:text-sa-primary" : "text-ca-text hover:bg-ca-hover hover:text-orange-700"
                    }`}
                  >
                    <Icon size={15} className={`flex-shrink-0 ${isSuperAdmin ? "text-sa-text-secondary" : "text-ca-text-secondary"}`} />
                    <span className="font-medium">{result.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {searchOpen && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <div className={`absolute top-full left-0 right-0 mt-1.5 border rounded-xl shadow-lg z-50 ${
              isSuperAdmin ? "bg-sa-surface border-sa-border" : "bg-ca-surface border-ca-border"
            }`}>
              <div className="px-4 py-6 text-center">
                <Search size={20} className={`mx-auto mb-2 ${isSuperAdmin ? "text-sa-text-secondary" : "text-ca-text-secondary"}`} />
                <p className={`text-base font-medium ${isSuperAdmin ? "text-sa-text" : "text-ca-text"}`}>No results for "{searchQuery}"</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">

      {/* ── Dark Mode Toggle ──────────────────────────────────────────────── */}
      <button
        onClick={() => setDarkMode((d) => !d)}
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
          isSuperAdmin ? "hover:bg-sa-hover text-sa-text-secondary hover:text-sa-text" : "hover:bg-slate-800 text-slate-400 hover:text-white"
        }`}
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Notification Bell ─────────────────────────────────────────────── */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setNotifOpen((prev) => !prev);
            setProfileOpen(false);
          }}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
            notifOpen
              ? isSuperAdmin
                ? "bg-sa-primary/10 text-sa-primary"
                : "bg-orange-500/10 text-orange-500"
              : isSuperAdmin
              ? "hover:bg-sa-hover text-sa-text-secondary hover:text-sa-text"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-orange-600 rounded-full border-2 border-white dark:border-[#090D16] flex items-center justify-center text-[10px] font-bold text-white shadow-sm pointer-events-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 top-full mt-2 w-84 sm:w-96 rounded-2xl shadow-2xl overflow-hidden border z-50 transition-all ${
              isSuperAdmin
                ? "bg-sa-surface border-sa-border text-sa-text"
                : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
            }`}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              isSuperAdmin
                ? "border-sa-border bg-sa-bg/60"
                : "border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-[#162632]"
            }`}>
              <div className="flex items-center space-x-2">
                <Bell size={16} className="text-orange-500" />
                <h3 className="font-bold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Bell size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">You're all caught up with alerts!</p>
                </div>
              ) : (
                notifications.slice(0, 15).map((n) => {
                  const isLead = n.type === "lead" || n.type === "lead_assigned" || n.type === "lead_status";
                  const isReq = n.type === "request" || n.type === "company_request";
                  const isAnn = n.type === "announcement";
                  const isTsk = n.type === "task" || n.type === "task_update" || n.type === "task_template";

                  return (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                        n.isRead ? "opacity-70 bg-transparent" : "bg-orange-50/40 dark:bg-orange-500/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isLead
                            ? "bg-orange-100 dark:bg-orange-950/50 text-orange-600"
                            : isReq
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600"
                            : isAnn
                            ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600"
                            : isTsk
                            ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}>
                          {isLead ? (
                            <Magnet size={15} />
                          ) : isReq ? (
                            <MessageSquare size={15} />
                          ) : isAnn ? (
                            <Megaphone size={15} />
                          ) : isTsk ? (
                            <CheckSquare size={15} />
                          ) : (
                            <Bell size={15} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              isLead
                                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                : isReq
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : isAnn
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                : isTsk
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}>
                              {isLead ? "Lead CRM" : isReq ? "Company Request" : isAnn ? "Announcement" : isTsk ? "Task" : "Alert"}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <p className={`text-xs ${n.isRead ? "font-medium text-slate-700 dark:text-slate-300" : "font-bold text-slate-900 dark:text-white"}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        </div>

                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Announcements ─────────────────────────────────────────────────── */}
      <Link
        to={announcementsRoute}
        title="Announcements"
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
          isSuperAdmin
            ? "hover:bg-sa-hover text-sa-text-secondary hover:text-sa-text"
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <Megaphone size={18} />
      </Link>

      {/* ── User Profile Menu & Dropdown ─────────────────────────────── */}
      <div className="relative" ref={dropdownRef}>
        {(() => {
          const rawAvatar = user?.profileImage || user?.photo || user?.avatar || user?.profilePicture;
          const avatarUrl = getPhotoUrl(rawAvatar);
          const userName = user?.fullName || user?.name || "User";
          const userEmail = user?.email || "";
          const roleLabel =
            user?.role === "SuperAdmin"
              ? "Super Admin"
              : user?.role === "HR"
              ? "HR Manager"
              : user?.role === "Manager"
              ? "Manager"
              : user?.role === "Employee"
              ? "Employee"
              : user?.role === "CompanyAdmin"
              ? "Company Admin"
              : user?.role || "User";

          return (
            <>
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center space-x-2 pl-1.5 pr-2 py-1 rounded-xl transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 group"
                title="Account & User Profile"
              >
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200 dark:border-slate-700 group-hover:border-amber-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-950 font-extrabold text-xs bg-amber-500 shadow-2xs">
                      {getInitials(userName)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#090D16]" />
                </div>

                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate max-w-[130px] group-hover:text-amber-500 transition-colors">
                    {userName}
                  </p>
                  <p className="text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400 mt-0.5">
                    {roleLabel}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-200" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Profile Header Header */}
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={userName}
                          className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-950 font-black text-sm bg-amber-500 shadow-sm">
                          {getInitials(userName)}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">{userName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{userEmail}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1">
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to={profileRoute}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                    >
                      <User size={15} className="text-amber-500" />
                      <span>User Profile</span>
                    </Link>
                    <Link
                      to={settingsRoute}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                    >
                      <Settings size={15} className="text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                    {!isSuperAdmin && (
                      <Link
                        to="/company/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                      >
                        <Building2 size={15} className="text-slate-400" />
                        <span>Organization Profile</span>
                      </Link>
                    )}
                  </div>

                  {/* Logout Button */}
                  <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                    <button
                      onClick={logout}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
      </div>
    </header>
  );
};

export default Header;
