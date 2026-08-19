import React, { useEffect, useState } from 'react';
import { api } from '../../utils/leads/api';
import { useToast } from '../../components/leads/Toast';
import {
  Users,
  Send,
  Play,
  AlertCircle,
  TrendingUp,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Megaphone,
  Bell,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '../../store/authStore';

const CHART_COLORS = ['#0E6B50', '#FE6D04', '#0EA5E9', '#A855F7', '#06B6D4', '#16A34A', '#EF4444'];

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points || points.length === 0) return null;
  const width = 68;
  const height = 24;
  const padding = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const glowId = `glow-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor={color} floodOpacity="0.25" />
        </filter>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { confirm, success, error } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Hover states for premium dashboard visuals
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      let computedStart = '';
      let computedEnd = '';

      if (dateFilter === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        computedStart = d.toISOString();
        const de = new Date();
        de.setHours(23, 59, 59, 999);
        computedEnd = de.toISOString();
      } else if (dateFilter === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        d.setHours(0, 0, 0, 0);
        computedStart = d.toISOString();
        const de = new Date();
        de.setDate(de.getDate() - 1);
        de.setHours(23, 59, 59, 999);
        computedEnd = de.toISOString();
      } else if (dateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        computedStart = d.toISOString();
      } else if (dateFilter === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        computedStart = d.toISOString();
      } else if (dateFilter === 'custom') {
        if (customStartDate) {
          const d = new Date(customStartDate);
          d.setHours(0, 0, 0, 0);
          computedStart = d.toISOString();
        }
        if (customEndDate) {
          const d = new Date(customEndDate);
          d.setHours(23, 59, 59, 999);
          computedEnd = d.toISOString();
        }
      }

      let dateQuery = '';
      if (computedStart) dateQuery += `?startDate=${encodeURIComponent(computedStart)}`;
      if (computedEnd) dateQuery += `${dateQuery ? '&' : '?'}endDate=${encodeURIComponent(computedEnd)}`;

      const [summaryRes, upcomingRes, activitiesRes, statusCountsRes] = await Promise.all([
        api.get(`/api/dashboard/summary${dateQuery}`),
        api.get('/api/dashboard/upcoming-messages'),
        api.get(`/api/dashboard/recent-activity${dateQuery}`),
        api.get(`/api/dashboard/lead-status-counts${dateQuery}`),
      ]);
      setSummary(summaryRes);
      setUpcoming(Array.isArray(upcomingRes) ? upcomingRes : (upcomingRes?.upcoming || upcomingRes?.data || []));
      setActivities(Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes?.activities || activitiesRes?.data || []));
      setStatusCounts(Array.isArray(statusCountsRes) ? statusCountsRes : (statusCountsRes?.statusCounts || statusCountsRes?.data || []));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    init();
  }, [dateFilter, customStartDate, customEndDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleCancelMessage = async (msgId: string) => {
    const ok = await confirm({ title: 'Cancel Message', message: 'Cancel this scheduled message?', confirmLabel: 'Yes, cancel', danger: true });
    if (!ok) return;
    try {
      await api.patch(`/api/messages/${msgId}/cancel`);
      setUpcoming(upcoming.filter(u => u.id !== msgId));
      success('Message cancelled');
      fetchDashboardData();
    } catch (err: any) { error('Failed to cancel message', err.message); }
  };

  const getSourceColor = (source: string) => {
    const s = source.toLowerCase();
    if (s === 'whatsapp') return '#16A34A';
    if (s === 'campaign' || s === 'campaigns') return '#5B5CEB';
    if (s === 'flow' || s === 'automation') return '#0EA5E9';
    return '#94A3B8';
  };

  const getActivityStyle = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('lead') || t.includes('contact') || t.includes('customer')) {
      return { icon: Users, color: '#5B5CEB', bg: 'rgba(91, 92, 235, 0.08)' };
    }
    if (t.includes('sent') || t.includes('message') || t.includes('dispatch') || t.includes('deliver')) {
      return { icon: Send, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.08)' };
    }
    if (t.includes('flow') || t.includes('automation')) {
      return { icon: Play, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.08)' };
    }
    if (t.includes('campaign') || t.includes('broadcast') || t.includes('megaphone')) {
      return { icon: Megaphone, color: '#A855F7', bg: 'rgba(168, 85, 247, 0.08)' };
    }
    if (t.includes('reminder') || t.includes('alert') || t.includes('bell')) {
      return { icon: Bell, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' };
    }
    if (t.includes('status') || t.includes('sync') || t.includes('refresh') || t.includes('connect')) {
      return { icon: RefreshCw, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)' };
    }
    return { icon: Clock, color: '#64748B', bg: 'rgba(100, 116, 139, 0.08)' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <RefreshCw className="animate-spin text-[#5B5CEB]" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  const chartData = [
    { name: 'Mon', Sent: 4, Delivered: 3, Read: 2 },
    { name: 'Tue', Sent: 10, Delivered: 8, Read: 6 },
    { name: 'Wed', Sent: 15, Delivered: 14, Read: 12 },
    { name: 'Thu', Sent: 8, Delivered: 7, Read: 5 },
    { name: 'Fri', Sent: 22, Delivered: 20, Read: 16 },
    { name: 'Sat', Sent: summary?.sentToday || 0, Delivered: Math.floor((summary?.sentToday || 0) * 0.9), Read: Math.floor((summary?.sentToday || 0) * 0.7) },
  ];

  const pieData = statusCounts.map((sc: any) => ({ name: sc.name, value: sc.count }));

  const kpiCards = [
    {
      label: 'Total Leads',
      value: summary?.totalLeads ?? 0,
      icon: Users,
      color: '#0E6B50',
      bgGlowStart: 'rgba(14, 107, 80, 0.08)',
      bgGlowEnd: 'rgba(14, 107, 80, 0.02)',
      trend: '+12%',
      trendUp: true,
      sparkline: [12, 14, 13, 16, 18, 17, 22],
    },
    {
      label: 'Messages Sent',
      value: summary?.sentToday ?? 0,
      icon: Send,
      color: '#16A34A',
      bgGlowStart: 'rgba(22, 163, 74, 0.08)',
      bgGlowEnd: 'rgba(22, 163, 74, 0.02)',
      trend: 'Today',
      trendUp: null,
      sparkline: [0, 5, 2, 8, 12, 6, 10],
    },
    {
      label: 'Active Flows',
      value: summary?.activeFlows ?? 0,
      icon: Play,
      color: '#0EA5E9',
      bgGlowStart: 'rgba(14, 165, 233, 0.08)',
      bgGlowEnd: 'rgba(14, 165, 233, 0.02)',
      trend: 'Running',
      trendUp: null,
      sparkline: [1, 2, 2, 3, 3, 4, 4],
    },
    {
      label: 'Failed Deliveries',
      value: summary?.failedMessages ?? 0,
      icon: AlertCircle,
      color: '#EF4444',
      bgGlowStart: 'rgba(239, 68, 68, 0.08)',
      bgGlowEnd: 'rgba(239, 68, 68, 0.02)',
      trend: 'Errors',
      trendUp: false,
      sparkline: [2, 0, 1, 0, 3, 1, 0],
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-lg text-[12px] min-w-[130px]"
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
        >
          <p className="font-semibold text-[#0F172A] mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any) => (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                  <span className="text-[#64748B] font-medium">{p.dataKey}</span>
                </div>
                <span className="font-semibold text-[#0F172A]">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight leading-tight">
            {user?.name ? `Good ${getGreeting()}, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="relative flex shrink-0" style={{ width: 6, height: 6 }}>
              <span className="animate-ping absolute inline-flex rounded-full bg-[#16A34A] opacity-75" style={{ width: '100%', height: '100%' }} />
              <span className="relative inline-flex rounded-full bg-[#16A34A]" style={{ width: 6, height: 6 }} />
            </div>
            <span className="text-[10px] font-semibold text-[#16A34A] tracking-wider uppercase">CRM Hub Active</span>
            <span className="text-[#94A3B8] text-[12px] hidden sm:inline">•</span>
            <p className="text-[13px] text-[#64748B] hidden sm:block">
              Here's what's happening with your workspace today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="select-base shadow-xs" style={{ fontSize: 13, height: 34, width: 140, borderRadius: 8 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range...</option>
          </select>
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <input type="date" className="input-base" style={{ fontSize: 12, height: 34, width: 120, padding: '0 8px', borderRadius: 8 }} value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} title="Start Date" />
              <span style={{ fontSize: 12, color: '#94A3B8' }}>to</span>
              <input type="date" className="input-base" style={{ fontSize: 12, height: 34, width: 120, padding: '0 8px', borderRadius: 8 }} value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} title="End Date" />
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary shadow-xs hover:shadow-sm"
            style={{ gap: 6, height: 34, borderRadius: 8, fontSize: 13 }}
          >
            <RefreshCw
              className={refreshing ? 'animate-spin' : ''}
              style={{ width: 13, height: 13 }}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tablet-2col">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          const isHovered = hoveredCard === i;
          return (
            <div
              key={i}
              className="kpi-card transition-all duration-300"
              style={{
                background: `radial-gradient(circle at top right, ${card.color}0D, transparent 55%), #FFFFFF`,
                borderColor: isHovered ? `${card.color}40` : '#F1F5F9',
                boxShadow: isHovered
                  ? `0 12px 28px -4px ${card.color}18, 0 8px 16px -8px ${card.color}10`
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
                transform: isHovered ? 'translateY(-2px)' : 'none'
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center justify-center rounded-xl shrink-0 border shadow-xs transition-colors duration-300"
                  style={{
                    width: 36,
                    height: 36,
                    background: `linear-gradient(135deg, ${card.bgGlowStart}, ${card.bgGlowEnd})`,
                    borderColor: isHovered ? `${card.color}25` : '#F1F5F9'
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: card.color }} strokeWidth={2} />
                </div>
                {card.trendUp !== null && (
                  <div
                    className="flex items-center gap-0.5"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: card.trendUp ? '#16A34A' : '#EF4444',
                      background: card.trendUp ? '#F0FDF4' : '#FEF2F2',
                      padding: '2.5px 6px',
                      borderRadius: 6,
                    }}
                  >
                    <ArrowUpRight style={{ width: 10, height: 10 }} />
                    {card.trend}
                  </div>
                )}
                {card.trendUp === null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '2.5px 6px',
                      borderRadius: 6,
                    }}
                  >
                    {card.trend}
                  </span>
                )}
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 750,
                      color: '#0F172A',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {card.value.toLocaleString()}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                    {card.label}
                  </p>
                </div>
                <div className="pb-0.5 opacity-90">
                  <Sparkline points={card.sparkline} color={card.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart */}
        <div
          className="card-elevated lg:col-span-2 transition-all duration-300"
          style={{
            padding: 22,
            background: hoveredPanel === 'activity'
              ? 'radial-gradient(circle at top right, rgba(91, 92, 235, 0.02), transparent 50%), #FFFFFF'
              : '#FFFFFF',
            borderColor: hoveredPanel === 'activity' ? '#E2E8F0' : '#F1F5F9',
            transform: hoveredPanel === 'activity' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredPanel === 'activity'
              ? '0 12px 28px -4px rgba(91, 92, 235, 0.04), 0 8px 20px -8px rgba(91, 92, 235, 0.04)'
              : '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(0, 0, 0, 0.02)'
          }}
          onMouseEnter={() => setHoveredPanel('activity')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div style={{ marginBottom: 18 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[#0F172A]">Message Activity</p>
                <p className="text-[12px] text-[#64748B] mt-0.5">WhatsApp dispatches over the last 7 days</p>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Sent', color: '#0E6B50' },
                  { label: 'Delivered', color: '#0EA5E9' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: l.color }} />
                    <span className="text-[11px] text-[#64748B] font-semibold">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E6B50" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0E6B50" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Sent"
                  stroke="#0E6B50"
                  strokeWidth={2.5}
                  fill="url(#gSent)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="Delivered"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  fill="url(#gDelivered)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div
          className="card-elevated transition-all duration-300"
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            background: hoveredPanel === 'status'
              ? 'radial-gradient(circle at top right, rgba(14, 165, 233, 0.02), transparent 50%), #FFFFFF'
              : '#FFFFFF',
            borderColor: hoveredPanel === 'status' ? '#E2E8F0' : '#F1F5F9',
            transform: hoveredPanel === 'status' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredPanel === 'status'
              ? '0 12px 28px -4px rgba(14, 165, 233, 0.04), 0 8px 20px -8px rgba(14, 165, 233, 0.04)'
              : '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(0, 0, 0, 0.02)'
          }}
          onMouseEnter={() => setHoveredPanel('status')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div style={{ marginBottom: 12 }}>
            <p className="text-[13px] font-semibold text-[#0F172A]">Leads by Status</p>
            <p className="text-[12px] text-[#64748B] mt-0.5 font-normal font-sans">Pipeline distribution</p>
          </div>

          {pieData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-[13px] text-[#94A3B8]">No data available</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div style={{ height: 140, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        fontSize: 11,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Central donut metrics text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -2 }}>
                  <span className="text-[19px] font-bold text-[#0F172A] tracking-tight leading-none">
                    {pieData.reduce((acc: number, curr: any) => acc + curr.value, 0)}
                  </span>
                  <span className="text-[9px] font-bold text-[#94A3B8] tracking-wider uppercase mt-1">
                    Leads
                  </span>
                </div>
              </div>

              {/* Grid Legend */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#F1F5F9]">
                {pieData.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center justify-between p-1 rounded-md hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-[11.5px] font-medium text-[#64748B] truncate">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-[11.5px] font-semibold text-[#0F172A] ml-1">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Lower Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 tablet-1col">

        {/* Upcoming Queue */}
        <div
          className="card-elevated transition-all duration-300"
          style={{
            padding: 22,
            background: hoveredPanel === 'outbox'
              ? 'radial-gradient(circle at top right, rgba(91, 92, 235, 0.01), transparent 50%), #FFFFFF'
              : '#FFFFFF',
            borderColor: hoveredPanel === 'outbox' ? '#E2E8F0' : '#F1F5F9',
            transform: hoveredPanel === 'outbox' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredPanel === 'outbox'
              ? '0 12px 28px -4px rgba(0, 0, 0, 0.04), 0 8px 20px -8px rgba(0, 0, 0, 0.04)'
              : '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(0, 0, 0, 0.02)'
          }}
          onMouseEnter={() => setHoveredPanel('outbox')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
            <div>
              <p className="text-[13px] font-semibold text-[#0F172A]">Scheduled Outbox</p>
              <p className="text-[12px] text-[#64748B] mt-0.5">Upcoming automation dispatches</p>
            </div>
            {upcoming.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 650,
                  color: '#5B5CEB',
                  background: 'rgba(91, 92, 235, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                {upcoming.length} pending
              </span>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div
              style={{
                minHeight: 180,
                border: '1px dashed #E2E8F0',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#FAFAFA',
              }}
            >
              <Clock style={{ width: 22, height: 22, color: '#94A3B8' }} />
              <p className="text-[12.5px] text-[#64748B] font-semibold">Queue is empty</p>
              <p className="text-[11px] text-[#94A3B8] text-center max-w-[220px]">
                Enroll contacts in flows or schedule campaigns to see items here
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
              {upcoming.map((msg) => {
                const sColor = getSourceColor(msg.source);
                return (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between border border-[#F1F5F9] rounded-xl hover:shadow-xs hover:border-[#E2E8F0] transition-all"
                    style={{
                      padding: '10px 14px',
                      background: '#FFFFFF',
                      borderLeft: `3.5px solid ${sColor}`,
                    }}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#0F172A] truncate">
                          {msg.customerName}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: sColor,
                            background: `${sColor}12`,
                            padding: '1.5px 5px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {msg.source}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#64748B] mt-1 truncate">
                        {msg.templateName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 650,
                          color: '#0F172A',
                          background: '#F1F5F9',
                          padding: '3.5px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {new Date(msg.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleCancelMessage(msg.id)}
                        className="text-[#94A3B8] hover:text-[#EF4444] font-semibold text-[12px] bg-transparent hover:bg-[#FEF2F2] px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div
          className="card-elevated transition-all duration-300"
          style={{
            padding: 22,
            background: hoveredPanel === 'activity-list'
              ? 'radial-gradient(circle at top right, rgba(91, 92, 235, 0.01), transparent 50%), #FFFFFF'
              : '#FFFFFF',
            borderColor: hoveredPanel === 'activity-list' ? '#E2E8F0' : '#F1F5F9',
            transform: hoveredPanel === 'activity-list' ? 'translateY(-2px)' : 'none',
            boxShadow: hoveredPanel === 'activity-list'
              ? '0 12px 28px -4px rgba(0, 0, 0, 0.04), 0 8px 20px -8px rgba(0, 0, 0, 0.04)'
              : '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(0, 0, 0, 0.02)'
          }}
          onMouseEnter={() => setHoveredPanel('activity-list')}
          onMouseLeave={() => setHoveredPanel(null)}
        >
          <div style={{ marginBottom: 18 }}>
            <p className="text-[13px] font-semibold text-[#0F172A]">Recent Activity</p>
            <p className="text-[12px] text-[#64748B] mt-0.5 font-normal">Latest workspace events</p>
          </div>

          <div
            style={{
              borderLeft: '1.5px dashed #E2E8F0',
              paddingLeft: 20,
              marginLeft: 10,
              maxHeight: 220,
              overflowY: 'auto',
            }}
            className="pr-1"
          >
            {activities.length === 0 ? (
              <p className="text-[12.5px] text-[#94A3B8] py-8 text-center">
                No activity recorded yet.
              </p>
            ) : (
              activities.map((act) => {
                const { icon: ActIcon, color: actColor, bg: actBg } = getActivityStyle(act.title);
                return (
                  <div
                    key={act.id}
                    className="relative animate-fade-in"
                    style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F8FAFC' }}
                  >
                    <span
                      className="absolute flex items-center justify-center bg-white rounded-lg shadow-xs"
                      style={{
                        left: -30.5,
                        top: 2,
                        width: 20,
                        height: 20,
                        background: actBg,
                        border: `1px solid ${actColor}18`,
                      }}
                    >
                      <ActIcon style={{ width: 10, height: 10, color: actColor }} strokeWidth={2.5} />
                    </span>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[12.5px] font-semibold text-[#0F172A]">{act.title}</span>
                      <span className="text-[10px] text-[#94A3B8] font-medium flex-shrink-0">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#64748B] mt-1.5 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

