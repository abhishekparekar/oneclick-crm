import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerMyLeavesApi, applyManagerLeaveApi, getManagerLeaveBalanceApi } from "../../api/managerApi";
import { FileText, RefreshCw, Plus, X, CalendarDays, CalendarOff } from "lucide-react";
import toast from "react-hot-toast";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Annual Leave", "Emergency Leave", "Maternity Leave", "Paternity Leave", "Other"];

const getStatusBadge = (status) => {
  const s = (status || "pending").toLowerCase();
  if (s === "approved") return { label: "Approved", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (s === "rejected") return { label: "Rejected", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
  return { label: "Pending", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
};

export default function ManagerMyLeave() {
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ leaveType: "Sick Leave", startDate: "", endDate: "", reason: "" });
  const queryClient = useQueryClient();

  const { data: leavesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerMyLeaves"],
    queryFn: () => getManagerMyLeavesApi().then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const { data: balanceData } = useQuery({
    queryKey: ["managerLeaveBalance"],
    queryFn: () => getManagerLeaveBalanceApi().then((r) => r.data),
    refetchInterval: 5000,
    retry: 1,
  });

  const _rawLeaves = leavesData?.leaves || leavesData?.data;
  const leaves = Array.isArray(_rawLeaves) ? _rawLeaves : [];
  const balance = balanceData?.balance || balanceData?.data || {};

  const applyMut = useMutation({
    mutationFn: (data) => applyManagerLeaveApi(data),
    onSuccess: () => {
      toast.success("Leave application submitted!");
      setShowApply(false);
      setForm({ leaveType: "Sick Leave", startDate: "", endDate: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["managerMyLeaves"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to apply for leave"),
  });

  const handleApply = (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    applyMut.mutate(form);
  };

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
                My Leaves
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                View your leave balances and request time-off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Leaves"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-amber-500" : ""} />
            </button>

            <button
              onClick={() => setShowApply(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={13} strokeWidth={3} />
              <span>Apply Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. LEAVE BALANCE CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Casual Leave", val: balance.casual ?? 0, bg: "bg-blue-500/10", text: "text-blue-600" },
          { label: "Sick Leave", val: balance.sick ?? 0, bg: "bg-rose-500/10", text: "text-rose-600" },
          { label: "Annual Leave", val: balance.annual ?? balance.paid ?? 0, bg: "bg-emerald-500/10", text: "text-emerald-600" },
          { label: "Unpaid / LOP", val: balance.lop ?? balance.unpaid ?? 0, bg: "bg-amber-500/10", text: "text-amber-600" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{item.val}</h3>
              <p className="text-[9.5px] text-slate-400 font-medium">Days remaining</p>
            </div>
            <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.text} flex items-center justify-center font-bold text-xs`}>
              {item.val}d
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. MY LEAVE APPLICATIONS TABLE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0B101B] border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Leave Type</th>
                <th className="px-3 py-2.5">Start Date</th>
                <th className="px-3 py-2.5">End Date</th>
                <th className="px-3 py-2.5">Total Days</th>
                <th className="px-3 py-2.5">Reason</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-1 text-amber-500" size={18} />
                    Loading leave history...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No leave applications recorded.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => {
                  const badge = getStatusBadge(l.status);
                  return (
                    <tr key={l._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{l.leaveType || l.type || "Casual Leave"}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{formatDate(l.startDate)}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{formatDate(l.endDate)}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">{l.totalDays || 1}d</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[220px] truncate font-medium">{l.reason || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApply && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#111C24] rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Apply For Leave</h3>
              <button onClick={() => setShowApply(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Leave Type *</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Reason / Details *</label>
                <textarea
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg p-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 min-h-[60px] resize-none font-semibold"
                  placeholder="State reason for absence..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowApply(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
                <button
                  type="submit"
                  disabled={applyMut.isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {applyMut.isLoading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
