import React from "react";
import { CalendarCheck, Users, Clock } from "lucide-react";

const AVATAR_BG = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

export default function ManagerAttendanceReport({ attendanceMemberSummary = [], searchQ = "", isAttLoading }) {
  const filtered = attendanceMemberSummary.filter(m =>
    (m.empName || m.name || "").toLowerCase().includes(searchQ.toLowerCase()) ||
    (m.empCode || m.code || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <h2 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarCheck size={14} />
            </div>
            <span>Team Attendance Summary Report</span>
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated attendance metrics per employee: Present, Late, Absent, Half Day, Leaves & Hours
          </p>
        </div>
        <span className="self-start sm:self-auto text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-950/40 px-2.5 py-1 rounded-xl border border-teal-500/20">
          {filtered.length} Team Members
        </span>
      </div>

      {isAttLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-bold animate-pulse flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading attendance records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-14 text-center text-xs text-slate-400 dark:text-slate-500 font-bold">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          No attendance records found for the team.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400">Present</th>
                <th className="py-3 px-3 text-center text-amber-600 dark:text-amber-400">Late</th>
                <th className="py-3 px-3 text-center text-orange-600 dark:text-orange-400">Half Day</th>
                <th className="py-3 px-3 text-center text-rose-600 dark:text-rose-400">Absent</th>
                <th className="py-3 px-3 text-center text-purple-600 dark:text-purple-400">Leaves</th>
                <th className="py-3 px-4 text-center">Total Hours</th>
                <th className="py-3 px-4 text-center">Presence Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((m, idx) => {
                const name = m.empName || m.name || "Employee";
                const code = m.empCode || m.code || "—";
                const totalDays = (m.present || 0) + (m.late || 0) + (m.halfDay || m.halfDays || 0) + (m.absent || 0) + (m.leaves || 0);
                const rate = m.percentage !== undefined ? m.percentage : (totalDays > 0 ? Math.round((((m.present || 0) + (m.late || 0)) / totalDays) * 100) : 95);

                return (
                  <tr key={m._id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarClass(name)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{name}</div>
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{m.dept || "General"}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {m.present || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${(m.late || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                        {m.late || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${(m.halfDay || m.halfDays || 0) > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-400"}`}>
                        {m.halfDay || m.halfDays || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${(m.absent || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                        {m.absent || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${(m.leaves || 0) > 0 ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`}>
                        {m.leaves || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                      {m.totalHours ? `${m.totalHours.toFixed(1)} hrs` : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black font-mono border ${
                        rate >= 90
                          ? "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                          : rate >= 75
                          ? "bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-500/25"
                          : "bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/25"
                      }`}>
                        {rate}%
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
  );
}
