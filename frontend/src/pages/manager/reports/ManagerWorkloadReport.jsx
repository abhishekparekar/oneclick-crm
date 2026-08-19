import { Scale } from "lucide-react";

const AVATAR_BG = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

export default function ManagerWorkloadReport({ memberPerformanceList, searchQ }) {
  return (
    <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
      <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2">
        <Scale size={16} className="text-amber-600" /> Member Workload Distribution
      </h2>
      <div className="space-y-3">
        {memberPerformanceList
          .filter(m => m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.code.toLowerCase().includes(searchQ.toLowerCase()))
          .map(m => (
            <div key={m._id} className="p-4 bg-ca-bg rounded-xl border border-ca-border/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${avatarClass(m.name)} flex items-center justify-center font-black text-sm shrink-0 border`}>
                  {m.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-ca-text text-sm">{m.name}</h4>
                  <p className="text-xs text-ca-text-secondary font-medium">{m.dept} · Code: {m.code}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="text-right">
                  <span className="text-amber-600 block font-black">{m.pending} Pending</span>
                  <span className="text-ca-text-secondary text-[10px]">Active Workload</span>
                </div>
                <div className="text-right border-l border-ca-border/60 pl-4">
                  <span className="text-ca-text block font-black">{m.totalAssigned} Total</span>
                  <span className="text-ca-text-secondary text-[10px]">Assigned Tasks</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
