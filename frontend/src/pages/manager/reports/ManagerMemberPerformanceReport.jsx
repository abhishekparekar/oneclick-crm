import { useMemo } from "react";
import {
  Users, Award, TrendingUp, CheckCircle2, Clock, AlertCircle,
  Star, ChevronRight, BarChart3, ShieldCheck, UserCheck, Flame
} from "lucide-react";

const AVATAR_BG = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

export default function ManagerMemberPerformanceReport({ memberPerformanceList = [], searchQ = "" }) {
  // Filtered members list based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQ.trim()) return memberPerformanceList;
    const q = searchQ.toLowerCase();
    return memberPerformanceList.filter(
      m => (m.name || "").toLowerCase().includes(q) ||
           (m.code || "").toLowerCase().includes(q) ||
           (m.dept || "").toLowerCase().includes(q)
    );
  }, [memberPerformanceList, searchQ]);

  // Overall Statistics for Analytics Header
  const stats = useMemo(() => {
    const totalAssigned = memberPerformanceList.reduce((acc, m) => acc + (m.totalAssigned || 0), 0);
    const totalCompleted = memberPerformanceList.reduce((acc, m) => acc + (m.completed || 0), 0);
    const totalPending = memberPerformanceList.reduce((acc, m) => acc + (m.pending || 0), 0);
    const totalOverdue = memberPerformanceList.reduce((acc, m) => acc + (m.overdue || 0), 0);

    const avgScore = memberPerformanceList.length > 0
      ? Math.round(memberPerformanceList.reduce((acc, m) => acc + (m.score || 0), 0) / memberPerformanceList.length)
      : 0;

    // Top performer
    const sorted = [...memberPerformanceList].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topPerformer = sorted[0] || null;

    return {
      totalMembers: memberPerformanceList.length,
      totalAssigned,
      totalCompleted,
      totalPending,
      totalOverdue,
      avgScore,
      topPerformer
    };
  }, [memberPerformanceList]);

  // Rating badge helper
  const getRatingBadge = (score) => {
    if (score >= 90) {
      return {
        label: "Top Performer",
        stars: 5,
        badge: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
        barColor: "bg-emerald-500"
      };
    }
    if (score >= 75) {
      return {
        label: "High Performer",
        stars: 4,
        badge: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300",
        barColor: "bg-teal-600"
      };
    }
    if (score >= 50) {
      return {
        label: "On Track",
        stars: 3,
        badge: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
        barColor: "bg-blue-500"
      };
    }
    return {
      label: "Needs Attention",
      stars: 2,
      badge: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
      barColor: "bg-amber-500"
    };
  };

  return (
    <div className="space-y-6 font-sans text-ca-text">
      {/* ── Executive Analytics Overview Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Team Members</p>
            <p className="text-2xl font-black text-ca-text mt-0.5">{stats.totalMembers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Avg Team Score</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.avgScore}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Completed Tasks</p>
            <p className="text-2xl font-black text-teal-700 mt-0.5">{stats.totalCompleted} / {stats.totalAssigned}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-ca-text-secondary uppercase tracking-wider">Top Performer</p>
            <p className="text-sm font-black text-ca-text mt-0.5 truncate max-w-[120px]" title={stats.topPerformer?.name || "N/A"}>
              {stats.topPerformer?.name || "—"}
            </p>
            <p className="text-[10px] font-bold text-amber-600">{stats.topPerformer ? `${stats.topPerformer.score}% Score` : ""}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* ── Team Performance Analysis Table ─────────────────────────────────────── */}
      <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ca-border pb-3">
          <div>
            <h2 className="font-black text-ca-text text-base uppercase tracking-wider flex items-center gap-2">
              <Award size={18} className="text-teal-700" /> Team Member Performance Report ⭐
            </h2>
            <p className="text-xs text-ca-text-secondary mt-0.5 font-medium">Detailed work output, efficiency score, and accomplishment status.</p>
          </div>
          <span className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 shrink-0">
            {filteredMembers.length} Members Tracked
          </span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-ca-text-secondary font-medium">
            No team member performance record matches your filter query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ca-bg border-b border-ca-border text-[10px] font-black uppercase tracking-wider text-ca-text-secondary">
                  <th className="py-3.5 px-4">Team Member</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Task Output</th>
                  <th className="py-3.5 px-4">Completion Progress</th>
                  <th className="py-3.5 px-4 text-center">Performance Rating</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border/40">
                {filteredMembers.map(m => {
                  const rating = getRatingBadge(m.score);
                  return (
                    <tr key={m._id || m.code} className="hover:bg-ca-bg/60 transition-colors">
                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${avatarClass(m.name)} flex items-center justify-center font-black text-xs shrink-0 border shadow-2xs`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-ca-text text-sm">{m.name}</div>
                            <div className="text-[10px] font-mono text-ca-text-secondary">{m.code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 font-bold text-ca-text">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black bg-ca-bg text-ca-text border border-ca-border/60">
                          {m.dept || "Management"}
                        </span>
                      </td>

                      {/* Task Breakdown */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-extrabold">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]" title="Completed Tasks">
                            {m.completed} Done
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px]" title="Pending / In Progress">
                            {m.pending} Pending
                          </span>
                          {m.overdue > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px]" title="Overdue Tasks">
                              {m.overdue} Late
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Completion Progress Bar */}
                      <td className="py-3.5 px-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-ca-text-secondary">
                            <span>{m.completed} of {m.totalAssigned} Tasks</span>
                            <span>{m.efficiency}%</span>
                          </div>
                          <div className="w-full bg-ca-bg h-2 rounded-full overflow-hidden border border-ca-border/40">
                            <div
                              className={`h-full ${rating.barColor} transition-all duration-500 rounded-full`}
                              style={{ width: `${Math.min(100, m.efficiency)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Performance Rating */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${rating.badge}`}>
                            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                            {rating.label}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(rating.stars)].map((_, i) => (
                              <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Score % */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${rating.badge}`}>
                          {m.score}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
