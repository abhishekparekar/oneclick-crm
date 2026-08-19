import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/leads/api';
import { Link } from 'react-router-dom';
import {
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Menu,
} from 'lucide-react';

interface TopbarProps {
  title: string;
  breadcrumb?: string;
  onMenuClick?: () => void;
}

export default function Topbar({ title, breadcrumb, onMenuClick }: TopbarProps) {
  const { org, user } = useAuthStore();
  const navigate = useNavigate();
  const [waState, setWaState] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_FAILED' | 'LOADING'>('LOADING');
  const [phone, setPhone] = useState<string | null>(null);

  const fetchWaStatus = async () => {
    try {
      const res = await api.get('/api/whatsapp/account');
      setWaState(res.connectionStatus || 'DISCONNECTED');
      setPhone(res.displayPhoneNumber || null);
    } catch (_) {
      setWaState('DISCONNECTED');
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'FRANCHISE') {
      setWaState('DISCONNECTED');
      return;
    }
    fetchWaStatus();
  }, [user]);

  const initials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between"
      style={{
        height: 56,
        background: '#0F172A',
        borderBottom: '1px solid #1E293B',
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Left: Hamburger + Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-md transition-all cursor-pointer shrink-0"
          style={{ color: '#94A3B8' }}
          title="Open menu"
        >
          <Menu style={{ width: 18, height: 18 }} />
        </button>
        <h1
          className="font-semibold truncate"
          style={{ fontSize: 15, letterSpacing: '-0.01em', color: '#F1F5F9' }}
        >
          {title}
        </h1>
      </div>

      {/* Right: Status + Actions — hidden on mobile except WA status dot */}
      <div className="flex items-center gap-2 shrink-0">

        {/* WhatsApp Connection Status */}
        {user?.role !== 'SUPER_ADMIN' && user?.role !== 'FRANCHISE' && (
          <Link
            to="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#94A3B8',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              textDecoration: 'none',
            }}
          >
            {waState === 'CONNECTED' ? (
              <>
                <span className="relative flex shrink-0" style={{ width: 7, height: 7 }}>
                  <span className="animate-ping absolute inline-flex rounded-full opacity-75" style={{ width: '100%', height: '100%', background: '#22C55E' }} />
                  <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: '#22C55E' }} />
                </span>
                {/* Show full text only on desktop */}
                <span className="hidden sm:inline" style={{ color: '#94A3B8' }}>
                  WhatsApp
                  <span style={{ color: '#22C55E', fontWeight: 600, marginLeft: 4 }}>{phone || 'Connected'}</span>
                </span>
                {/* Mobile: show phone number compactly */}
                <span className="sm:hidden" style={{ color: '#22C55E', fontWeight: 600, fontSize: 12 }}>
                  {phone || 'Connected'}
                </span>
              </>
            ) : waState === 'LOADING' ? (
              <>
                <RefreshCw className="animate-spin" style={{ width: 12, height: 12, color: '#64748B' }} />
                <span className="hidden sm:inline" style={{ color: '#64748B' }}>Checking...</span>
              </>
            ) : (
              <>
                <WifiOff style={{ width: 12, height: 12, color: '#F87171' }} />
                <span className="hidden sm:inline" style={{ color: '#94A3B8' }}>
                  WhatsApp
                  <span style={{ color: '#F87171', fontWeight: 600, marginLeft: 4 }}>Disconnected</span>
                </span>
                <span className="sm:hidden" style={{ color: '#F87171', fontWeight: 600, fontSize: 11 }}>WA</span>
              </>
            )}
          </Link>
        )}

        {/* Settings icon — desktop only */}
        {user?.role !== 'SUPER_ADMIN' && user?.role !== 'FRANCHISE' && (
          <>
            <div className="hidden sm:block" style={{ width: 1, height: 20, background: '#1E293B' }} />
            <button
              onClick={() => navigate('/settings')}
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-md transition-all"
              style={{ color: '#64748B' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F1F5F9'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              title="Settings"
            >
              <Settings style={{ width: 15, height: 15 }} />
            </button>
          </>
        )}

        {/* Avatar — desktop only */}
        <div
          className="hidden sm:flex items-center justify-center rounded-full font-medium text-white uppercase cursor-default"
          style={{ width: 30, height: 30, fontSize: 12, background: 'linear-gradient(135deg, #0E6B50, #059669)', flexShrink: 0 }}
          title={user?.name || 'User'}
        >
          {initials(user?.name)}
        </div>
      </div>
    </header>
  );
}

