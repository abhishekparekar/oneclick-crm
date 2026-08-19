import { CalendarCheck } from "lucide-react";

const AVATAR_BG = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

export default function ManagerAttendanceReport({ attendanceMemberSummary, searchQ, isAttLoading }) {
  return (
    <div className="bg-ca-surface rounded-2xl border border-ca-border overflow-hidden shadow-2xs p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-ca-border/60 pb-3">
        <div>
          <h2 className="font-black text-ca-text text-sm uppercase tracking-wider flex items-center gap-2">
            <CalendarCheck size={16} className="text-blue-600" /> Team Attendance Summary Report
          </h2>
          <p className="text-xs text-ca-text-secondary mt-0.5">Aggregated attendance metrics per employee: Total Present, Absent, Half Day, Leaves, and Logged Hours</p>
        </div>
        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
          {attendanceMemberSummary.length} Team Members
        </span>
      </div>

      {isAttLoading ? (
        <div className="p-8 text-center text-xs text-ca-text-secondary font-medium animate-pulse">Loading attendance records...</div>
      ) : attendanceMemberSummary.length === 0 ? (
        <div className="p-12 text-center text-xs text-ca-text-secondary font-medium">No attendance records found for the team.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ca-bg border-b border-ca-border text-[10px] font-black uppercase tracking-wider text-ca-text-secondary">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-center">Late</th>
                <th className="py-3 px-4 text-center">Half Day</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Leaves</th>
                <th className="py-3 px-4 text-center">Total Hours</th>
                <th className="py-3 px-4 text-center">Presence Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ca-border/40">
              {attendanceMemberSummary
                .filter(m => m.empName.toLowerCase().includes(searchQ.toLowerCase()) || m.empCode.toLowerCase().includes(searchQ.toLowerCase()))
                .map((m, idx) => {
                  const totalDays = m.present + m.late + m.halfDay + m.absent + m.leaves;
                  const rate = totalDays > 0 ? Math.round(((m.present + m.late) / totalDays) * 100) : 95;

                  return (
                    <tr key={idx} className="hover:bg-ca-bg/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${avatarClass(m.empName)} flex items-center justify-center font-black text-xs shrink-0 border`}>
                            {m.empName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-ca-text text-xs">{m.empName}</div>
                            <div className="text-[10px] font-mono text-ca-text-secondary">{m.empCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ca-text">{m.dept}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.present}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                          {m.late}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-200">
                          {m.halfDay}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                          {m.absent}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                          {m.leaves}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-ca-text">
                        {m.totalHours ? `${m.totalHours.toFixed(1)} hrs` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                          rate >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          rate >= 75 ? "bg-teal-50 text-teal-700 border-teal-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
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
