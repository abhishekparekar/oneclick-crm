import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getManagerMyAttendanceApi, getManagerTeamAttendanceApi } from "../../api/managerApi";
import {
  CalendarCheck,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Search,
  Users,
  UserCheck,
  UserX,
  Filter
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const TABS = ["My Attendance", "Team Attendance"];

const getAttStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "present") return { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (s === "absent") return { color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
  if (s.includes("late")) return { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  if (s.includes("half")) return { color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" };
  if (s.includes("leave")) return { color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" };
  return { color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" };
};

const ManagerAttendance = () => {
  const [activeTab, setActiveTab] = useState(0);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: myData, isLoading: myLoading, refetch: myRefetch, isFetching: myFetching } = useQuery({
    queryKey: ["managerMyAttendance", month, year],
    queryFn: () => getManagerMyAttendanceApi({ month, year }).then((r) => r.data),
    refetchInterval: 5000,
    enabled: activeTab === 0,
  });

  const { data: teamData, isLoading: teamLoading, refetch: teamRefetch, isFetching: teamFetching } = useQuery({
    queryKey: ["managerTeamAttendance", month, year],
    queryFn: () => getManagerTeamAttendanceApi({ month, year }).then((r) => r.data),
    refetchInterval: 5000,
    enabled: activeTab === 1,
  });

  const _rawMy = myData?.data?.days || myData?.attendance || myData?.data;
  const myRecords = useMemo(() => (Array.isArray(_rawMy) ? _rawMy : []), [_rawMy]);
  
  const _rawTeam = teamData?.data?.days || teamData?.attendance || teamData?.data;
  const teamRecords = useMemo(() => (Array.isArray(_rawTeam) ? _rawTeam : []), [_rawTeam]);

  const isLoading = activeTab === 0 ? myLoading : teamLoading;
  const isFetching = activeTab === 0 ? myFetching : teamFetching;
  const refetch = activeTab === 0 ? myRefetch : teamRefetch;

  // Filtered Records for Team View
  const filteredTeamRecords = useMemo(() => {
    return teamRecords.filter((rec) => {
      const empName = rec.employeeId?.name || rec.employee?.name || rec.employeeName || "";
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (rec.date && new Date(rec.date).toLocaleDateString().includes(searchQuery));
      const matchesStatus = statusFilter === "all" || (rec.status || "").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [teamRecords, searchQuery, statusFilter]);

  // My Summary Stats
  const myStats = useMemo(() => {
    const present = myRecords.filter((r) => r.status?.toLowerCase() === "present").length;
    const absent = myRecords.filter((r) => r.status?.toLowerCase() === "absent").length;
    const late = myRecords.filter((r) => r.status?.toLowerCase().includes("late")).length;
    const leave = myRecords.filter((r) => r.status?.toLowerCase().includes("leave") || r.status?.toLowerCase().includes("half")).length;
    return { present, absent, late, leave };
  }, [myRecords]);

  // Team Summary Stats
  const teamStats = useMemo(() => {
    const total = teamRecords.length;
    const present = teamRecords.filter((r) => r.status?.toLowerCase() === "present").length;
    const late = teamRecords.filter((r) => r.status?.toLowerCase().includes("late")).length;
    const absentOrLeave = teamRecords.filter((r) => r.status?.toLowerCase() === "absent" || r.status?.toLowerCase().includes("leave")).length;
    return { total, present, late, absentOrLeave };
  }, [teamRecords]);

  const renderMyAttendance = () => (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { label: "Present Days", value: myStats.present, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
          { label: "Absent Days", value: myStats.absent, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle },
          { label: "Late Arrivals", value: myStats.late, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "Leaves / Half-Day", value: myStats.leave, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: CalendarOff },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white dark:bg-[#111C24] border ${s.border} rounded-2xl p-4 shadow-2xs relative overflow-hidden transition-all hover:shadow-md flex items-center justify-between`}>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table & Mobile Cards */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {myRecords.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-400">
            <CalendarCheck size={44} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No attendance records found</p>
            <p className="text-xs text-slate-400 mt-1">There are no logged attendance entries for the selected month.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#1A2633]">
                    {["Date", "Check In", "Check Out", "Total Hours", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {myRecords.map((rec, i) => {
                    const badge = getAttStatusBadge(rec.status);
                    return (
                      <tr key={rec._id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {rec.date ? new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" }) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{rec.checkIn || rec.punchIn || "—"}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{rec.checkOut || rec.punchOut || "—"}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{rec.totalHours || rec.workingHours || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.color}`}>
                            {rec.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid View */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {myRecords.map((rec, i) => {
                const badge = getAttStatusBadge(rec.status);
                return (
                  <div key={rec._id || i} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rec.date ? new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" }) : "—"}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                        {rec.status || "—"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">In</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.checkIn || rec.punchIn || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Out</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.checkOut || rec.punchOut || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Hours</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.totalHours || rec.workingHours || "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderTeamAttendance = () => (
    <div className="space-y-5">
      {/* Team Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { label: "Total Logs", value: teamStats.total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Users },
          { label: "Present", value: teamStats.present, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: UserCheck },
          { label: "Late Arrivals", value: teamStats.late, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "Absent / Leave", value: teamStats.absentOrLeave, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: UserX },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white dark:bg-[#111C24] border ${s.border} rounded-2xl p-4 shadow-2xs relative overflow-hidden transition-all hover:shadow-md flex items-center justify-between`}>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
          </select>
        </div>
      </div>

      {/* Desktop Table & Mobile Cards */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {filteredTeamRecords.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-400">
            <Users size={44} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No team attendance entries found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#1A2633]">
                    {["Team Member", "Date", "Check In", "Check Out", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTeamRecords.map((rec, i) => {
                    const badge = getAttStatusBadge(rec.status);
                    const empName = rec.employeeId?.name || rec.employee?.name || rec.employeeName || "Employee";
                    return (
                      <tr key={rec._id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/20">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{empName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {rec.date ? new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" }) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{rec.checkIn || rec.punchIn || "—"}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{rec.checkOut || rec.punchOut || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.color}`}>
                            {rec.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTeamRecords.map((rec, i) => {
                const badge = getAttStatusBadge(rec.status);
                const empName = rec.employeeId?.name || rec.employee?.name || rec.employeeName || "Employee";
                return (
                  <div key={rec._id || i} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-500/20">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{empName}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                        {rec.status || "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/40">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {rec.date ? new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Check In</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.checkIn || rec.punchIn || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Check Out</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.checkOut || rec.punchOut || "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-6 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Attendance Tracking" icon={Calendar}>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh Attendance Data"
          className="flex items-center justify-center p-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 font-bold shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} strokeWidth={2.2} />
        </button>
      </PageHeader>

      {/* Tabs & Month Selector Bar */}
      <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === i
                  ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Period:</span>
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m] = e.target.value.split('-');
                if (y && m) {
                  setYear(Number(y));
                  setMonth(Number(m));
                }
              }
            }}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold outline-none bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Loading or Tab Content */}
      {isLoading ? (
        <div className="py-20 text-center bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading attendance data...</p>
        </div>
      ) : activeTab === 0 ? (
        renderMyAttendance()
      ) : (
        renderTeamAttendance()
      )}
    </div>
  );
};

export default ManagerAttendance;


