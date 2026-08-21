import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getManagerTeamLeavesApi,
  approveManagerTeamLeaveApi,
  rejectManagerTeamLeaveApi,
} from "../../api/managerApi";
import { CalendarDays, RefreshCw, CheckCircle2, XCircle, Search, X, CalendarOff, User, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"];

const getLeaveStatusBadge = (status) => {
  const s = (status || "pending").toLowerCase();
  if (s === "approved") return { label: "Approved", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (s === "rejected") return { label: "Rejected", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
  return { label: "Pending", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
};

export default function ManagerTeamLeaves() {
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

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-3 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">
      {/* ── 1. SLIM EXECUTIVE HEADER ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CalendarOff size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Team Leaves
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {leaves.length} Requests
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Review, approve or reject leave applications from team members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-44 sm:w-56">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === s ? "bg-white dark:bg-[#111C24] text-amber-600 dark:text-amber-400 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Leaves"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TEAM LEAVES TABLE ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0B101B] border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Staff Member</th>
                <th className="px-3 py-2.5">Leave Type</th>
                <th className="px-3 py-2.5">Duration</th>
                <th className="px-3 py-2.5">Days</th>
                <th className="px-3 py-2.5">Reason</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-1 text-amber-500" size={18} />
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => {
                  const empName = l.employeeId?.name || l.employee?.name || "Staff Member";
                  const badge = getLeaveStatusBadge(l.status);
                  const isPending = (l.status || "pending").toLowerCase() === "pending";

                  return (
                    <tr key={l._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                            {empName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{empName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {l.leaveType || l.type || "Casual Leave"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {l.totalDays || 1}d
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate font-medium">
                        {l.reason || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => approveMut.mutate(l._id)}
                              disabled={approveMut.isLoading}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Approve"
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectModal(l._id)}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Reject"
                            >
                              <X size={11} strokeWidth={3} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#111C24] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Reject Leave Request</h3>
            <p className="text-xs text-slate-500">Provide a reason for rejecting this leave application:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 min-h-[60px] resize-none font-semibold"
              placeholder="Reason for rejection..."
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setRejectModal(null)} className="px-3 py-1 text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
              <button
                onClick={() => rejectMut.mutate({ id: rejectModal, reason: rejectReason })}
                disabled={rejectMut.isLoading}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs cursor-pointer"
              >
                {rejectMut.isLoading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
