import { Trophy } from "lucide-react";

export default function ManagerRankingsReport({ memberPerformanceList, searchQ }) {
  const sorted = [...memberPerformanceList]
    .filter(m => m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.code.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
      <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" /> Team Leaderboard &amp; Rankings
      </h2>
      <div className="space-y-2">
        {sorted.map((m, idx) => (
          <div key={m._id} className="p-3 bg-ca-bg rounded-xl flex items-center justify-between gap-3 border border-ca-border/40">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                idx === 0 ? "bg-amber-100 text-amber-800" :
                idx === 1 ? "bg-slate-200 text-slate-700" :
                idx === 2 ? "bg-orange-100 text-orange-800" :
                "bg-ca-surface text-ca-text-secondary"
              }`}>
                #{idx + 1}
              </span>
              <div className="font-extrabold text-ca-text text-xs">{m.name}</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-ca-text-secondary">{m.completed} Done</span>
              <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {m.score}% Score
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
