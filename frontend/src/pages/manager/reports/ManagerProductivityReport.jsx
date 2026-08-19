import { Target } from "lucide-react";

const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return "0h 0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
};

export default function ManagerProductivityReport({ memberPerformanceList, searchQ }) {
  return (
    <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
      <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2">
        <Target size={16} className="text-emerald-600" /> Productivity &amp; Work Efficiency ⭐⭐⭐
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-ca-bg border-b border-ca-border text-[10px] font-black uppercase tracking-wider text-ca-text-secondary">
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Logged Work Time</th>
              <th className="py-3 px-4 text-center">Completed Deliverables</th>
              <th className="py-3 px-4 text-center">Efficiency Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ca-border/40">
            {memberPerformanceList
              .filter(m => m.name.toLowerCase().includes(searchQ.toLowerCase()) || m.code.toLowerCase().includes(searchQ.toLowerCase()))
              .map(m => (
                <tr key={m._id} className="hover:bg-ca-bg/60 transition-colors">
                  <td className="py-3 px-4 font-extrabold text-ca-text">{m.name}</td>
                  <td className="py-3 px-4 font-bold text-violet-700">{formatDuration(m.totalMinutes)}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-emerald-600">{m.completed} tasks</td>
                  <td className="py-3 px-4 text-center font-black text-teal-700">{m.efficiency}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
