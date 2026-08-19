import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getManagerTaskReportApi,
  getManagerAttendanceReportApi,
  getManagerLeaveReportApi,
  getManagerTeamApi
} from "../../api/managerApi";
import { 
  BarChart2, RefreshCw, CalendarCheck, Sparkles, 
  TrendingUp, Scale, AlertTriangle, Briefcase, Trophy, Search
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

import ManagerExecutiveReport from "./reports/ManagerExecutiveReport";
import ManagerAttendanceReport from "./reports/ManagerAttendanceReport";
import ManagerDelayedTaskReport from "./reports/ManagerDelayedTaskReport";
import ManagerDepartmentReport from "./reports/ManagerDepartmentReport";
import ManagerMemberPerformanceReport from "./reports/ManagerMemberPerformanceReport";
import ManagerProductivityReport from "./reports/ManagerProductivityReport";
import ManagerRankingsReport from "./reports/ManagerRankingsReport";
import ManagerWorkloadReport from "./reports/ManagerWorkloadReport";

const REPORT_TABS = [
  { label: "Executive Summary", icon: Sparkles, color: "#8b5cf6" },
  { label: "Performance", icon: BarChart2, color: "#3b82f6" },
  { label: "Productivity", icon: TrendingUp, color: "#10b981" },
  { label: "Attendance", icon: CalendarCheck, color: "#06b6d4" },
  { label: "Workload", icon: Scale, color: "#f59e0b" },
  { label: "Delayed Tasks", icon: AlertTriangle, color: "#ef4444" },
  { label: "Department", icon: Briefcase, color: "#ec4899" },
  { label: "Rankings", icon: Trophy, color: "#f97316" },
];

const ManagerReports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: teamRes } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: taskData, isLoading: taskLoading, isFetching: taskFetching } = useQuery({
    queryKey: ["managerTaskReport", month, year],
    queryFn: () => getManagerTaskReportApi({ month, year }).then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: attData, isLoading: attLoading, isFetching: attFetching } = useQuery({
    queryKey: ["managerAttendanceReport", month, year],
    queryFn: () => getManagerAttendanceReportApi({ month, year }).then((r) => r.data),
    refetchInterval: 5000,
  });

  const { data: leaveData } = useQuery({
    queryKey: ["managerLeaveReport", month, year],
    queryFn: () => getManagerLeaveReportApi({ month, year }).then((r) => r.data),
    refetchInterval: 5000,
  });

  const isLoading = taskLoading || attLoading;
  const isFetching = taskFetching || attFetching;

  const teamList = teamRes?.data?.teamMembers || [];
  const taskRows = Array.isArray(taskData?.tasks) ? taskData.tasks : Array.isArray(taskData?.details) ? taskData.details : [];
  const attRows = Array.isArray(attData?.attendance) ? attData.attendance : Array.isArray(attData?.details) ? attData.details : [];
  const leaveRows = Array.isArray(leaveData?.leaves) ? leaveData.leaves : Array.isArray(leaveData?.details) ? leaveData.details : [];

  const taskStats = taskData?.stats || taskData?.data || {};
  const attStats = attData?.stats || attData?.data || {};
  const leaveStats = leaveData?.stats || leaveData?.data || {};

  const memberPerformanceList = useMemo(() => {
    return teamList.map((member, i) => {
      const task = taskRows.find(t => (t.name || t.employee) === member.fullName) || {};
      const att = attRows.find(a => (a.name || a.employee) === member.fullName) || {};
      return {
        _id: String(member._id) + '-' + i,
        name: member.fullName,
        code: member.employeeCode,
        dept: member.departmentId?.name || "Unassigned",
        completionRate: task.completionRate || 0,
        attendanceRate: att.attendanceRate || 0,
        efficiencyScore: Math.round(((task.completionRate || 0) + (att.attendanceRate || 0)) / 2),
        workloadStatus: (task.assigned || 0) > 10 ? "Heavy" : (task.assigned || 0) > 5 ? "Moderate" : "Light",
        activeTasks: task.assigned || 0,
        delayedTasks: task.overdue || 0,
        tasksCompleted: task.completed || 0
      };
    });
  }, [teamList, taskRows, attRows]);

  const attendanceMemberSummary = useMemo(() => {
    return attRows.map((a, i) => ({
      _id: String(a.employee || 'emp') + '-' + i,
      name: a.name || a.employee,
      empCode: a.code || "-",
      present: a.present || 0,
      absent: a.absent || 0,
      late: a.late || 0,
      halfDays: a.half_day || 0,
      percentage: a.attendanceRate || 0
    }));
  }, [attRows]);

  const delayedTasksList = useMemo(() => {
    return taskRows.filter(t => (t.overdue || 0) > 0).map((t, i) => ({
      _id: String(t.employee || 'task') + '-' + i,
      name: t.name || t.employee,
      code: t.code || "-",
      dept: "Unassigned",
      delayedCount: t.overdue || 0,
      impact: (t.overdue || 0) > 3 ? "High" : "Medium",
      delayReason: "Pending Review"
    }));
  }, [taskRows]);

  const deptPerformanceList = useMemo(() => {
    const depts = {};
    memberPerformanceList.forEach(m => {
      if (!depts[m.dept]) depts[m.dept] = { id: m.dept, name: m.dept, members: 0, comp: 0, pres: 0, total: 0, completed: 0, pending: 0, overdue: 0 };
      depts[m.dept].members++;
      depts[m.dept].comp += m.completionRate;
      depts[m.dept].pres += m.attendanceRate;
      depts[m.dept].total += m.activeTasks || 0;
      depts[m.dept].completed += m.tasksCompleted || 0;
      depts[m.dept].pending += Math.max(0, (m.activeTasks || 0) - (m.tasksCompleted || 0));
      depts[m.dept].overdue += m.delayedTasks || 0;
    });
    return Object.values(depts).map(d => ({
      id: d.id,
      name: d.name,
      head: "Department Head",
      members: d.members,
      completionRate: Math.round(d.comp / d.members) || 0,
      presenceRate: Math.round(d.pres / d.members) || 0,
      score: Math.round((d.comp + d.pres) / (2 * d.members)) || 0,
      total: d.total,
      completed: d.completed,
      pending: d.pending,
      overdue: d.overdue
    }));
  }, [memberPerformanceList]);

  const overallHealth = Math.round((memberPerformanceList.reduce((acc, curr) => acc + curr.efficiencyScore, 0) / (memberPerformanceList.length || 1)));
  const overallComp = Math.round((memberPerformanceList.reduce((acc, curr) => acc + curr.completionRate, 0) / (memberPerformanceList.length || 1)));
  const overallPres = Math.round((memberPerformanceList.reduce((acc, curr) => acc + curr.attendanceRate, 0) / (memberPerformanceList.length || 1)));

  const renderContent = () => {
    if (isLoading) return (
      <div className="p-12 text-center bg-white dark:bg-[#111C24] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-sm text-slate-400">Loading reports...</p>
      </div>
    );
    
    switch (activeTab) {
      case 0:
        return <ManagerExecutiveReport 
          summary={{ totalMembers: teamList.length, activeProjects: 0 }}
          completionRate={overallComp}
          presenceRate={overallPres}
          healthScore={overallHealth}
          taskStats={taskStats}
          attStats={attStats}
          leaveStats={leaveStats}
          workStats={{}}
        />;
      case 1: return <ManagerMemberPerformanceReport memberPerformanceList={memberPerformanceList} searchQ={searchQ} />;
      case 2: return <ManagerProductivityReport memberPerformanceList={memberPerformanceList} searchQ={searchQ} />;
      case 3: return <ManagerAttendanceReport attendanceMemberSummary={attendanceMemberSummary} searchQ={searchQ} isAttLoading={attLoading} />;
      case 4: return <ManagerWorkloadReport memberPerformanceList={memberPerformanceList} searchQ={searchQ} />;
      case 5: return <ManagerDelayedTaskReport delayedTasksList={delayedTasksList} tasksData={taskRows} searchQ={searchQ} />;
      case 6: return <ManagerDepartmentReport deptPerformanceList={deptPerformanceList} />;
      case 7: return <ManagerRankingsReport memberPerformanceList={memberPerformanceList} searchQ={searchQ} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-8 font-sans">
      <PageHeader title="Advanced Manager Reports" icon={BarChart2}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-8 pr-4 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#111C24] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none focus:border-orange-500 w-48 shadow-sm"
            />
          </div>
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m] = e.target.value.split('-');
                if (y && m) { setYear(Number(y)); setMonth(Number(m)); }
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold outline-none bg-white dark:bg-[#111C24] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
          />
        </div>
      </PageHeader>

      <div className="flex gap-2 overflow-x-auto py-3 px-1 -mx-1 scrollbar-hide">
        {REPORT_TABS.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                activeTab === i
                  ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md transform -translate-y-0.5"
                  : "bg-white dark:bg-[#111C24] border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={14} style={{ color: activeTab === i ? 'inherit' : tab.color }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default ManagerReports;

