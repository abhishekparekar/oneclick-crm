import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCompanyApi } from "../../api/superAdminApi";
import toast from "react-hot-toast";
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Clock, 
  ShieldAlert, 
  Building2, 
  RotateCcw,
  Info
} from "lucide-react";

const REASON_TEMPLATES = [
  "Client requested account cancellation",
  "Subscription expired / Non-payment",
  "Duplicate or test organization",
  "Violation of terms of service",
  "Migrated to another account"
];

const SuperAdminDeleteCompanyModal = ({ isOpen, onClose, company, onDeleted }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }) => deleteCompanyApi(id, reason),
    onSuccess: () => {
      toast.success(
        `"${company?.companyName || "Company"}" moved to Trash. Retained for 10 days before permanent deletion.`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries(["superAdminCompanies"]);
      queryClient.invalidateQueries(["superAdminDeletedCompanies"]);
      if (onDeleted) onDeleted();
      handleClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to delete company";
      toast.error(msg);
      setError(msg);
    }
  });

  if (!isOpen || !company) return null;

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid reason (at least 5 characters).");
      return;
    }
    setError("");
    deleteMutation.mutate({ id: company._id, reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#111C24] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Move Company to Trash
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                10-Day Retention Grace Period
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Company Info Banner */}
          <div className="flex items-center space-x-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {company.logo ? (
                <img src={company.logo} alt={company.companyName} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 size={18} className="text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {company.companyName}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {company.companyCode && <span>Code: <b>{company.companyCode}</b></span>}
                <span>•</span>
                <span>Owner: <b>{company.ownerName || company.email || "N/A"}</b></span>
              </div>
            </div>
          </div>

          {/* 10-Day Policy Alert */}
          <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 flex items-start gap-3 text-xs">
            <Clock size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-amber-700 dark:text-amber-400">
                What happens when you delete this company?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11.5px] leading-relaxed">
                <li>
                  The company will immediately disappear from the active companies list.
                </li>
                <li>
                  All active user and employee login sessions will be terminated immediately.
                </li>
                <li>
                  It will be moved to the <b>Deleted Companies (Trash)</b> tab and safely stored for <b>10 days</b>.
                </li>
                <li>
                  You can <b>Restore</b> it anytime during these 10 days without losing any data.
                </li>
                <li>
                  After 10 days, all company records and user accounts will be permanently erased.
                </li>
              </ul>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Reason for Deletion <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Explain why this organization is being deleted (e.g. client cancellation, duplicate registration)..."
              className={`w-full p-3 rounded-xl text-xs border bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                error 
                  ? "border-rose-500 focus:ring-rose-500/20" 
                  : "border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:ring-amber-500/20"
              }`}
            />
            {error && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> {error}
              </p>
            )}

            {/* Quick Reason Suggestions */}
            <div className="pt-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick reasons:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REASON_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => {
                      setReason(tmpl);
                      setError("");
                    }}
                    className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteMutation.isPending}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  <span>Moving to Trash...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Move to Trash (10 Days)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminDeleteCompanyModal;
