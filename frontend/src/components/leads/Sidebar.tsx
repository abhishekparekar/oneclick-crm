import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Users,
  RefreshCcw,
  Megaphone,
  Bell,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Share2,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { user, org, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isItemActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/' && (location.search === '' || location.search === '?tab=stats');
    }
    if (to.startsWith('/?')) {
      const search = to.substring(1);
      return location.pathname === '/' && location.search === search;
    }
    return location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  };

  const getNavItems = () => {
    if (user?.role === 'SUPER_ADMIN') {
      return [
        { to: '/', label: 'Overview & Stats', icon: LayoutDashboard },
        { to: '/?tab=earnings', label: 'Earnings Reports', icon: TrendingUp },
        { to: '/?tab=franchises', label: 'Franchise Resellers', icon: Award },
        { to: '/?tab=workspaces', label: 'Client Workspaces', icon: Layers },
        { to: '/?tab=users', label: 'System Users', icon: Users },
      ];
    }
    if (user?.role === 'FRANCHISE') {
      return [
        { to: '/', label: 'Earning Analytics', icon: LayoutDashboard },
        { to: '/?tab=clients', label: 'Client Workspaces', icon: Layers },
        { to: '/?tab=profile', label: 'My Franchise Plan', icon: Award },
      ];
    }
    return [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/leads', label: 'Contacts', icon: Users },
      { to: '/flows', label: 'Automations', icon: RefreshCcw },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/reminders', label: 'Reminders', icon: Bell },
      { to: '/social', label: 'Social Posting', icon: Share2 },
      { to: '/tutorials', label: 'Tutorials', icon: BookOpen },
      { to: '/settings', label: 'Settings', icon: Settings },
    ];
  };

  const currentNavItems = getNavItems();

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#090D16]/60 backdrop-blur-xs z-35 md:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center justify-center px-3 relative"
          style={{ height: 56, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center justify-center overflow-hidden min-w-0 w-full">
            <img
              src="/easyconnect.png"
              alt="Easy Connect"
              className="shrink-0 object-contain transition-all"
              style={{
                height: collapsed ? 28 : 38,
                maxWidth: collapsed ? 36 : 170,
                width: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Collapse toggle — only on md+ */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute items-center justify-center w-5 h-5 rounded-full border border-[#1E293B] bg-[#0F172A] text-[#94A3B8] hover:text-white hover:bg-[#1E293B] shadow-sm transition-all cursor-pointer z-50"
            style={{ right: -10, top: 18 }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight style={{ width: 11, height: 11 }} />
              : <ChevronLeft style={{ width: 11, height: 11 }} />
            }
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {!collapsed && (
            <p
              className="px-3 mb-2 text-[9px] font-semibold text-[#475569] tracking-wider uppercase"
            >
              Menu
            </p>
          )}

          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)} // Auto close drawer on navigation click (mobile)
                className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className="shrink-0"
                  style={{ width: 15, height: 15, strokeWidth: 1.75 }}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div
          className="px-2.5 pb-4 space-y-3"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}
        >
          {/* Workspace chip / Role chip */}
          {!collapsed && (
            user?.role === 'SUPER_ADMIN' ? (
              <div
                className="px-2.5 py-2 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                <p style={{ fontSize: 9, color: '#64748B', marginBottom: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  System Role
                </p>
                <p
                  className="truncate font-semibold text-[12px] text-white"
                  style={{ lineHeight: 1.3 }}
                >
                  Super Admin
                </p>
              </div>
            ) : user?.role === 'FRANCHISE' ? (
              <div
                className="px-2.5 py-2 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                <p style={{ fontSize: 9, color: '#64748B', marginBottom: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  System Role
                </p>
                <p
                  className="truncate font-semibold text-[12px] text-white"
                  style={{ lineHeight: 1.3 }}
                >
                  Franchise Partner
                </p>
              </div>
            ) : org ? (
              <div
                className="px-2.5 py-2 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                <p style={{ fontSize: 9, color: '#64748B', marginBottom: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workspace
                </p>
                <p
                  className="truncate font-semibold text-[12px] text-white"
                  style={{ lineHeight: 1.3 }}
                >
                  {org.name}
                </p>
              </div>
            ) : null
          )}

          {/* User row */}
          <div className={`flex items-center gap-2 ${collapsed ? 'flex-col gap-3 justify-center' : ''}`}>
            {/* Avatar */}
            <div
              className="shrink-0 rounded-full flex items-center justify-center font-semibold text-[11px] text-white uppercase shadow-xs"
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #0E6B50, #059669)',
              }}
              title={user?.name || 'User'}
            >
              {initials(user?.name)}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#F1F5F9] truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-[#64748B] truncate leading-none mt-0.5">
                  {user?.email || ''}
                </p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] transition-all cursor-pointer ${collapsed ? 'mt-1' : ''}`}
              title="Sign out"
            >
              <LogOut style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

