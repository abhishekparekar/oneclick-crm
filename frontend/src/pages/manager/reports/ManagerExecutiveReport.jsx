import { Sparkles, CheckSquare, CalendarCheck, Clock, AlertTriangle, Calendar, TrendingUp } from "lucide-react";

export default function ManagerExecutiveReport({ summary, completionRate, presenceRate, healthScore, taskStats, attStats, leaveStats, workStats }) {
  return (
    <div className="space-y-5">
      {/* Top Health Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Health Score</span>
            <Sparkles size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{healthScore}%</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">Overall Rating / 100</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Task Delivery</span>
            <CheckSquare size={14} className="text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-700">{completionRate}%</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">{taskStats.completedTasks || 0} Delivered</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Attendance %</span>
            <CalendarCheck size={14} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600">{presenceRate}%</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">{attStats.presentCount || 0} Logs Recorded</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Work Hours</span>
            <Clock size={14} className="text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-700">{workStats.totalWorkHours || "0"} <span className="text-xs font-bold text-slate-400">hrs</span></p>
          <p className="text-[10px] text-ca-text-secondary font-bold">Timesheets Tracked</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Overdue Tasks</span>
            <AlertTriangle size={14} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{taskStats.overdueTasks || 0}</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">Action Required</p>
        </div>

        <div className="bg-ca-surface p-4 rounded-2xl border border-ca-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-ca-text-secondary tracking-wider">Pending Leaves</span>
            <Calendar size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{leaveStats.pendingLeaves || 0}</p>
          <p className="text-[10px] text-ca-text-secondary font-bold">Requests Pending</p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-ca-surface p-6 rounded-2xl border border-ca-border shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-ca-border/60 pb-3">
            <h3 className="font-black text-ca-text text-base">Task Delivery SLA &amp; Velocity</h3>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              {taskStats.completedTasks || 0} Completed
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-extrabold mb-1">
                <span className="text-ca-text">Completion Rate</span>
                <span className="text-teal-700">{completionRate}%</span>
              </div>
              <div className="w-full bg-ca-bg h-2.5 rounded-full overflow-hidden border border-ca-border/40">
                <div className="bg-teal-700 h-full rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700">
                <p className="text-lg font-black">{taskStats.completedTasks || 0}</p>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-ca-text-secondary">Done</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
                <p className="text-lg font-black">{taskStats.openTasks || 0}</p>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-ca-text-secondary">Open</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700">
                <p className="text-lg font-black">{taskStats.overdueTasks || 0}</p>
                <p className="text-[9px] uppercase tracking-wider font-extrabold text-ca-text-secondary">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-ca-surface p-6 rounded-2xl border border-ca-border shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-ca-border/60 pb-3">
            <h3 className="font-black text-ca-text text-base">Team Presence &amp; Leave Health</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {presenceRate}% Presence
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-extrabold mb-1">
                <span className="text-ca-text">Monthly Presence Rate</span>
                <span className="text-emerald-600">{presenceRate}%</span>
              </div>
              <div className="w-full bg-ca-bg h-2.5 rounded-full overflow-hidden border border-ca-border/40">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${presenceRate}%` }} />
              </div>
            </div>

            <div className="p-4 bg-ca-bg rounded-xl border border-ca-border/60 text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-ca-text-secondary">Present Members Today</span>
                <span className="text-emerald-600 font-extrabold">{attStats.presentCount || 0}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-ca-text-secondary">Pending Leave Requests</span>
                <span className="text-amber-600 font-extrabold">{leaveStats.pendingLeaves || 0}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-ca-text-secondary">Approved Leaves This Month</span>
                <span className="text-teal-700 font-extrabold">{leaveStats.approvedLeaves || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
