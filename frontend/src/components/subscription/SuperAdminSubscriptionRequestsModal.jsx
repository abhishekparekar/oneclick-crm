import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSuperAdminSubscriptionRequestsApi,
  updateSubscriptionRequestStatusApi,
} from "../../api/superAdminApi";
import {
  X, Sparkles, Building2, CheckCircle, XCircle, Clock,
  Search, Filter, Check, AlertCircle, ArrowUpRight, MessageSquare,
  ShieldCheck, ExternalLink, RefreshCw, Send, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

const RequestStatusBadge = ({ status }) => {
  const badgeMap = {
    pending: { label: "Pending", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
    in_review: { label: "In Review", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800", dot: "bg-cyan-500" },
    approved: { label: "Approved", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
    provisioned: { label: "Provisioned", bg: "bg-emerald-600 text-white border-emerald-600", dot: "bg-white" },
    rejected: { label: "Rejected", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
  };
  const b = badgeMap[status] || badgeMap.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${b.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
      {b.label}
    </span>
  );
};

export default function SuperAdminSubscriptionRequestsModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionItem, setActionItem] = useState(null); // { request, mode: 'approve' | 'reject' | 'review' }
  const [actionNotes, setActionNotes] = useState("");
  const [autoProvision, setAutoProvision] = useState(true);

  const { data: resData, isLoading, refetch } = useQuery({
    queryKey: ["superAdminSubscriptionRequests", statusFilter, search],
    queryFn: () =>
      getSuperAdminSubscriptionRequestsApi({ status: statusFilter, search }).then((r) => r.data),
    enabled: isOpen,
  });

  const requests = resData?.data || [];
  const stats = resData?.stats || { total: 0, pending: 0, inReview: 0, approved: 0, rejected: 0 };

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSubscriptionRequestStatusApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminSubscriptionRequests"] });
      queryClient.invalidateQueries({ queryKey: ["superAdminSubscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["superAdminCompanies"] });
      toast.success("Request status updated successfully!");
      setActionItem(null);
      setActionNotes("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update request");
    },
  });

  const handleActionSubmit = (e) => {
    e.preventDefault();
    if (!actionItem) return;

    const targetStatus = actionItem.mode === "approve"
      ? (autoProvision ? "provisioned" : "approved")
      : actionItem.mode === "reject"
      ? "rejected"
      : "in_review";

    updateMut.mutate({
      id: actionItem.request._id,
      data: {
        status: targetStatus,
        adminResponseNotes: actionNotes,
        autoProvision: actionItem.mode === "approve" && autoProvision,
      },
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-[#0E1726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#111C2D] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Company Subscription & Licensing Requests
                </h2>
                {stats.pending > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                    {stats.pending} Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                Review, approve, and auto-provision SaaS plan upgrades, renewals, and custom employee quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-amber-500" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── KPI Stats & Search Filters ────────────────────── */}
        <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111C2D]/50 space-y-3 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "all", label: "Total Requests", val: stats.total, color: "border-slate-200 text-slate-700 dark:text-slate-200" },
              { id: "pending", label: "Pending", val: stats.pending, color: "border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-500/10" },
              { id: "in_review", label: "In Review", val: stats.inReview, color: "border-cyan-300 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
              { id: "approved", label: "Approved & Live", val: stats.approved, color: "border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
              { id: "rejected", label: "Declined", val: stats.rejected, color: "border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-500/10" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  statusFilter === st.id
                    ? "ring-2 ring-amber-500 bg-amber-500/10 font-black shadow-xs"
                    : "bg-white dark:bg-[#152238] hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{st.label}</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-none mt-0.5 block">{st.val}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, request code, target plan, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-2xs"
            />
          </div>
        </div>

        {/* ── Table Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:px-6">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-semibold space-y-2">
              <Building2 size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p>No subscription requests found matching the filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="bg-white dark:bg-[#152238] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-amber-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                        {(req.companyName || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {req.companyName}
                          </h4>
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {req.requestCode}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Submitted by {req.requestedBy?.name || req.requestedBy?.email || "Company Admin"} on {formatDate(req.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {req.billingCycle}
                      </span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Request Type</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize block">
                        {req.requestType?.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Plan / Quota</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 block">
                        {req.requestedPlanName || req.requestedPlanId?.planName || "Custom Requirements"}
                      </span>
                      {req.requestedSeats > 0 && (
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Seats Cap: {req.requestedSeats} Employees
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Active Tier</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        {req.currentPlanName || "Standard Plan"}
                      </span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                        Company Admin Note
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 text-[11.5px] mt-0.5 italic">
                        "{req.message}"
                      </p>
                    </div>
                  )}

                  {req.adminResponseNotes && (
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Super Admin Feedback</span>
                      <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5">{req.adminResponseNotes}</p>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {req.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionItem({ request: req, mode: "review" });
                          setActionNotes("");
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Mark In Review
                      </button>
                    )}

                    {req.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionItem({ request: req, mode: "reject" });
                          setActionNotes("");
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                    )}

                    {req.status !== "provisioned" && req.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionItem({ request: req, mode: "approve" });
                          setActionNotes("Approved and provisioned by Super Admin.");
                          setAutoProvision(true);
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 size={13} />
                        Approve & Provision
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sub-modal: Process & Approve / Reject Action ──── */}
        {actionItem && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                  {actionItem.mode === "approve"
                    ? "Approve & Provision Request"
                    : actionItem.mode === "reject"
                    ? "Decline Subscription Request"
                    : "Mark Request In Review"}
                </h3>
                <button
                  type="button"
                  onClick={() => setActionItem(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs space-y-2">
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-bold">Company:</span> {actionItem.request.companyName}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-bold">Requested:</span>{" "}
                  {actionItem.request.requestedPlanName || "Custom Quota"} (
                  {actionItem.request.requestedSeats > 0 ? `${actionItem.request.requestedSeats} seats` : "Plan Tier"})
                </p>

                {actionItem.mode === "approve" && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={autoProvision}
                      onChange={(e) => setAutoProvision(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Automatically activate plan & update company seats immediately</span>
                  </label>
                )}

                <div className="mt-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Response Note / Explanation (Sent to Company Admin)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter approval note, payment confirmation, or decline reason..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionItem(null)}
                  className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  disabled={updateMut.isPending}
                  className={`px-5 py-1.5 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer ${
                    actionItem.mode === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : actionItem.mode === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-cyan-600 hover:bg-cyan-700"
                  }`}
                >
                  {updateMut.isPending ? "Updating..." : "Confirm & Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
