import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompanyAuditLogsApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { ShieldAlert, Activity, CheckCircle2, UserCheck, Clock, ArrowUp, ArrowDown, Sparkles, Loader2 } from "lucide-react";

/* ── Top KPI Stat Card ────────────────────────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-8 sm:h-9 w-10 sm:w-12 opacity-65 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-aud-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-aud-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const { data: res, isLoading } = useQuery({ queryKey: ["auditLogs"], queryFn: getCompanyAuditLogsApi });

  const logs = res?.data?.logs || res?.data || [];

  const timeAgo = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const actionColor = (action = "") => {
    if (action.includes("delete") || action.includes("remove")) return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    if (action.includes("create") || action.includes("add")) return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    if (action.includes("update") || action.includes("edit")) return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    if (action.includes("approve")) return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    if (action.includes("reject")) return "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            System Performance & Audit Logs <Activity size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time system activities, user action trails, and administrative security events.
          </p>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard label="Total Audit Logs" value={logs.length} trend="Tracked" isUp period="all time" strokeColor="#06B6D4" Icon={Activity} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Admin Actions" value={logs.filter(l => (l.action || "").includes("create") || (l.action || "").includes("update")).length} trend="Modifications" isUp period="system" strokeColor="#10B981" Icon={UserCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Security Checkpoints" value="100% Active" trend="Shielded" isUp period="audit" strokeColor="#8B5CF6" Icon={ShieldAlert} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="System Status" value="Healthy" trend="Operational" isUp period="uptime" strokeColor="#EAB308" Icon={Sparkles} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {/* ── Main Activity Stream ── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Activity Log Stream
          </h3>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Real-time Feed
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Audit Trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShieldAlert size={36} className="mx-auto text-amber-500 mb-3 opacity-60" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">No Audit Logs Found</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">System activity will be logged here as actions occur.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {logs.map((log) => {
              const name = log.performedBy?.name || "System";
              const action = (log.action || "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              return (
                <div key={log._id} className="py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors px-2 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">{name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${actionColor(log.action)}`}>
                          {action}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs font-semibold text-slate-400 truncate max-w-xl">
                          {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0 mt-1">
                    {timeAgo(log.timestamp || log.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default AuditLogs;
