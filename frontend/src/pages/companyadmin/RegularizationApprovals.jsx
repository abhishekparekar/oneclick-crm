import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRegularizationRequestsApi, approveRegularizationApi, rejectRegularizationApi } from "../../api/companyAdminApi";
import StatusBadge from "../../components/common/StatusBadge";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";

const RegularizationApprovals = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["regularizations", statusFilter],
    queryFn: () => getRegularizationRequestsApi(statusFilter ? { status: statusFilter } : {}),
  });

  const approveMutation = useMutation({
    mutationFn: approveRegularizationApi,
    onSuccess: () => queryClient.invalidateQueries(["regularizations"]),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectRegularizationApi(id, reason),
    onSuccess: () => { queryClient.invalidateQueries(["regularizations"]); setRejectModal(null); setRejectReason(""); },
  });

  const records = res?.data?.requests || res?.data?.regularizations || res?.data || [];
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-ca-text">Regularization Approvals</h1>
        <p className="text-ca-text-secondary mt-1">Review employee attendance correction requests</p>
      </div>

      <div className="flex space-x-2">
        {["pending", "approved", "rejected", ""].map((f) => (
          <button key={f || "all"} onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statusFilter === f ? "bg-primary text-white" : "bg-ca-surface border border-ca-border text-ca-text-secondary hover:border-primary/40"}`}>
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-ca-text-secondary">Loading...</div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12 text-ca-text-secondary">
          <ShieldCheck size={40} className="mx-auto text-slate-200 mb-3" />
          <p>No regularization requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const empName = rec.employeeId?.user?.name || `${rec.employeeId?.firstName || ""} ${rec.employeeId?.lastName || ""}`;
            return (
              <div key={rec._id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{empName.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-ca-text">{empName}</p>
                      <p className="text-xs text-ca-text-secondary">{rec.employeeId?.employeeCode}</p>
                    </div>
                  </div>
                  <StatusBadge status={rec.status} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 border-y border-ca-border mb-3">
                  <div>
                    <p className="text-xs text-ca-text-secondary mb-0.5">Date</p>
                    <p className="text-sm font-semibold text-ca-text-secondary">{fmt(rec.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary mb-0.5">Requested In</p>
                    <p className="text-sm font-semibold text-ca-text-secondary">{fmtTime(rec.requestedPunchIn)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary mb-0.5">Requested Out</p>
                    <p className="text-sm font-semibold text-ca-text-secondary">{fmtTime(rec.requestedPunchOut)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ca-text-secondary mb-0.5">Reason</p>
                    <p className="text-sm font-semibold text-ca-text-secondary capitalize">{rec.reason || "—"}</p>
                  </div>
                </div>

                {rec.status === "pending" && (
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => { setRejectModal(rec._id); setRejectReason(""); }} className="flex items-center px-4 py-2 border border-ca-border text-ca-primary rounded-lg text-sm font-medium hover:bg-ca-primary-light">
                      <XCircle size={13} className="mr-1.5" /> Reject
                    </button>
                    <button onClick={() => approveMutation.mutate(rec._id)} disabled={approveMutation.isPending} className="flex items-center px-4 py-2 border border-ca-border text-emerald-700 rounded-lg text-sm font-medium hover:bg-ca-secondary disabled:opacity-60">
                      <CheckCircle size={13} className="mr-1.5" /> Approve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-ca-surface rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-ca-text mb-4">Reject Regularization</h2>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full border border-ca-border rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4" />
            <div className="flex space-x-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 px-4 py-2 border border-ca-border text-ca-text-secondary rounded-lg font-medium hover:bg-ca-hover">Cancel</button>
              <button onClick={() => rejectMutation.mutate({ id: rejectModal, reason: rejectReason })} disabled={!rejectReason.trim() || rejectMutation.isPending} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-60">
                {rejectMutation.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegularizationApprovals;
