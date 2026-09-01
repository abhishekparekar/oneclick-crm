import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAvailablePlansApi, createCompanySubscriptionRequestApi } from "../../api/companyAdminApi";
import {
  X, Sparkles, Send, Building2, Layers, Users, Clock,
  CheckCircle2, AlertCircle, HelpCircle, ArrowUpRight
} from "lucide-react";
import toast from "react-hot-toast";

const REQUEST_TYPES = [
  { value: "upgrade_plan", label: "Upgrade SaaS Plan Tier", desc: "Move to a higher plan with more features" },
  { value: "renew_plan", label: "Renew Current Subscription", desc: "Extend validity for another billing cycle" },
  { value: "increase_seats", label: "Increase Employee Seats", desc: "Expand licensed employee capacity" },
  { value: "trial_extension", label: "Extend Free Trial", desc: "Request additional evaluation days" },
  { value: "custom_module", label: "Custom Module Add-on", desc: "Add specialized CRM/HRMS features" },
  { value: "other", label: "Other Licensing Inquiry", desc: "Custom requirements or billing query" },
];

export default function CompanySubscriptionRequestModal({ isOpen, onClose, currentPlan }) {
  const queryClient = useQueryClient();

  const { data: plansData } = useQuery({
    queryKey: ["availablePlans"],
    queryFn: () => getAvailablePlansApi().then((r) => r.data),
    enabled: isOpen,
  });

  const availablePlans = plansData?.data || [];

  const [form, setForm] = useState({
    requestType: "upgrade_plan",
    requestedPlanId: "",
    requestedSeats: 0,
    billingCycle: "yearly",
    priority: "medium",
    message: "",
  });

  const requestMut = useMutation({
    mutationFn: createCompanySubscriptionRequestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySubscriptionRequests"] });
      toast.success("Subscription request sent to Super Admin!");
      setForm({
        requestType: "upgrade_plan",
        requestedPlanId: "",
        requestedSeats: 0,
        billingCycle: "yearly",
        priority: "medium",
        message: "",
      });
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to submit request");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.message.trim() && form.requestType === "other") {
      toast.error("Please provide details in the message box");
      return;
    }
    requestMut.mutate(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-[#0E1726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#111C2D] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Send Request to Super Admin
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                Submit plan upgrades, seat limit expansions, trial extensions, or licensing inquiries.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form Body ────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
          {/* Current Plan Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <div>
              <span className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                Current Active Tier
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {currentPlan?.planName || currentPlan?.name || "Standard Plan"}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider">
              Active Organization
            </span>
          </div>

          {/* Request Type Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Request Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REQUEST_TYPES.map((rt) => {
                const isSelected = form.requestType === rt.value;
                return (
                  <div
                    key={rt.value}
                    onClick={() => setForm({ ...form, requestType: rt.value })}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 font-bold shadow-2xs"
                        : "bg-slate-50 dark:bg-[#152238] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-bold text-[12px]">{rt.label}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">{rt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conditional: Target Plan Selector */}
          {(form.requestType === "upgrade_plan" || form.requestType === "renew_plan") && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Target SaaS Package Tier
              </label>
              <select
                value={form.requestedPlanId}
                onChange={(e) => setForm({ ...form, requestedPlanId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 shadow-xs cursor-pointer"
              >
                <option value="">Select a SaaS Plan...</option>
                {availablePlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.planName} — ₹{plan.priceMonthly?.toLocaleString("en-IN")}/mo or ₹{plan.priceYearly?.toLocaleString("en-IN")}/yr (Limit: {plan.maxEmployees || 50} Employees)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional: Extra Seats & Billing Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Requested Total Employee Seats
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={form.requestedSeats || ""}
                onChange={(e) => setForm({ ...form, requestedSeats: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Preferred Billing Cycle
              </label>
              <select
                value={form.billingCycle}
                onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 shadow-xs cursor-pointer"
              >
                <option value="yearly">Annual / Yearly (Best Value)</option>
                <option value="monthly">Monthly Recurring</option>
                <option value="trial">Free Trial Extension</option>
              </select>
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Urgency / Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "low", label: "Low", color: "text-slate-600 dark:text-slate-300" },
                { value: "medium", label: "Medium", color: "text-amber-600 dark:text-amber-400" },
                { value: "high", label: "High", color: "text-orange-600 dark:text-orange-400" },
                { value: "urgent", label: "Urgent", color: "text-rose-600 dark:text-rose-400" },
              ].map((p) => {
                const isSelected = form.priority === p.value;
                return (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs"
                        : "bg-slate-50 dark:bg-[#152238] border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Message / Requirements */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Message & Custom Requirements
            </label>
            <textarea
              rows={3}
              placeholder="Explain why you need this upgrade, required custom modules, payment mode queries, or timeline requirements..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none shadow-xs"
            />
          </div>

          {/* ── Footer Actions ────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Super Admin receives instant in-app & email notification.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestMut.isPending}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {requestMut.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Send Request to Super Admin
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
