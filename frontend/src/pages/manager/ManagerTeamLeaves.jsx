import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getManagerTeamLeavesApi,
  approveManagerTeamLeaveApi,
  rejectManagerTeamLeaveApi,
} from "../../api/managerApi";
import {  CalendarDays, RefreshCw, CheckCircle2, XCircle, Search, X , CalendarOff } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"];

const getLeaveStatusStyle = (status) => {
  const s = status?.toLowerCase();
  if (s === "approved") return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (s === "rejected") return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
};

const ManagerTeamLeaves = () => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerTeamLeaves", statusFilter],
    queryFn: () =>
      getManagerTeamLeavesApi(statusFilter !== "All" ? { status: statusFilter } : {}).then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const _rawLeaves = data?.leaves || data?.data;
  const leavesArr = Array.isArray(_rawLeaves) ? _rawLeaves : [];
  const leaves = leavesArr.filter((l) => {
    if (!search) return true;
    const name = l.employeeId?.name || l.employee?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const approveMut = useMutation({
    mutationFn: (id) => approveManagerTeamLeaveApi(id),
    onSuccess: () => {
      toast.success("Leave approved!");
      queryClient.invalidateQueries({ queryKey: ["managerTeamLeaves"] });
    },
    onError: () => toast.error("Failed to approve leave"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectManagerTeamLeaveApi(id, reason),
    onSuccess: () => {
      toast.success("Leave rejected");
      setRejectModal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["managerTeamLeaves"] });
    },
    onError: () => toast.error("Failed to reject leave"),
  });

  return (
    <div className="space-y-4 pb-4 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="Team Leaves" icon={CalendarOff}>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-md transition-all border border-[#CC4800]/50 bg-[#E65100] hover:bg-[#CC4800] disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm font-semibold outline-none bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-150 dark:border-slate-800 text-slate-850 dark:text-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-500/30 text-orange-600 dark:text-orange-400"
                  : "bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading leave requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-[var(--color-ca-card)]/">
                  {["Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave, i) => {
                  const ss = getLeaveStatusStyle(leave.status);
                  const name = leave.employeeId?.name || leave.employee?.name || "Employee";
                  const isPending = leave.status?.toLowerCase() === "pending";
                  return (
                    <tr
                      key={leave._id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                      style={{ borderBottom: i < leaves.length - 1 ? "1px solid rgba(226, 232, 240, 0.5)" : "none" }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-amber-50 text-[#f59e0b] dark:bg-amber-950/30">
                            {name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-350">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-450">{leave.leaveType || "—"}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-450">
                        {leave.startDate ? new Date(leave.startDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-450">
                        {leave.endDate ? new Date(leave.endDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-350">{leave.totalDays || 1}</td>
                      <td className="px-5 py-4 max-w-[150px]">
                        <p className="text-xs text-slate-500 dark:text-slate-450 truncate" title={leave.reason}>{leave.reason || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color }}>
                          {leave.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isPending ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => approveMut.mutate(leave._id)}
                              disabled={approveMut.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border border-emerald-100/30 hover:bg-emerald-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal(leave)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/20 border border-rose-100/30 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-base font-black text-slate-800 dark:text-white">Reject Leave Request</h3>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs font-semibold text-[#f59e0b] mb-4">
              {rejectModal.employeeId?.name || "Employee"} — {rejectModal.leaveType}
            </p>
            <textarea
              rows={3}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-2xl text-sm outline-none resize-none bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-white"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectModal._id, reason: rejectReason })}
                disabled={rejectMut.isPending || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTeamLeaves;

