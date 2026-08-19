import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerMyLeavesApi, applyManagerLeaveApi, getManagerLeaveBalanceApi } from "../../api/managerApi";
import {  FileText, RefreshCw, Plus, X, CalendarDays , CalendarOff } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Annual Leave", "Emergency Leave", "Maternity Leave", "Paternity Leave", "Other"];

const getStatusStyle = (status) => {
  const s = status?.toLowerCase();
  if (s === "approved") return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (s === "rejected") return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
};

const ManagerMyLeave = () => {
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

  return (
    <div className="space-y-4 pb-4 max-w-[1400px] mx-auto font-sans">
      <PageHeader title="My Leaves" icon={CalendarOff}>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-md transition-all border border-[#CC4800]/50 bg-[#E65100] hover:bg-[#CC4800] disabled:opacity-50"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowApply(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity bg-orange-500 hover:bg-orange-600"
        >
          <Plus size={13} /> Apply Leave
        </button>
      </PageHeader>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Casual Leave", val: balance.casual ?? 0, color: "from-blue-500 to-indigo-600" },
          { label: "Sick Leave", val: balance.sick ?? 0, color: "from-rose-500 to-pink-600" },
          { label: "Annual Leave", val: balance.annual ?? balance.paid ?? 0, color: "from-emerald-500 to-teal-600" },
          { label: "Unpaid / LOP", val: balance.lop ?? balance.unpaid ?? 0, color: "from-amber-500 to-orange-600" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{item.val}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">Days remaining</p>
            <div className={`absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b ${item.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
          </div>
        ))}
      </div>

      {/* Leaves Table */}
      <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full mx-auto" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No leave records. Apply for a leave above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-[var(--color-ca-card)]/">
                  {["Leave Type", "From", "To", "Days", "Reason", "Applied On", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave, i) => {
                  const ss = getStatusStyle(leave.status);
                  return (
                    <tr
                      key={leave._id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/10"
                      style={{ borderBottom: i < leaves.length - 1 ? "1px solid rgba(226, 232, 240, 0.5)" : "none" }}
                    >
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">{leave.leaveType || "—"}</td>
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
                      <td className="px-5 py-4 text-xs font-medium text-slate-500 dark:text-slate-450">
                        {leave.createdAt ? new Date(leave.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: ss.bg, color: ss.color }}>
                          {leave.status || "Pending"}
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

      {/* Apply Leave Modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5 border-b border-slate-50 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white">Apply for Leave</h3>
              <button onClick={() => setShowApply(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-white cursor-pointer"
                >
                  {LEAVE_TYPES.map((t) => <option key={t} value={t} style={{ background: "#1e2329" }}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">From</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold outline-none bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">To</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold outline-none bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-white cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Reason for leave..."
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full p-3 rounded-2xl text-sm outline-none resize-none bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-855 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[var(--color-ca-card)] border border-slate-150 dark:border-slate-850 text-slate-650 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMut.isPending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  {applyMut.isPending ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerMyLeave;

