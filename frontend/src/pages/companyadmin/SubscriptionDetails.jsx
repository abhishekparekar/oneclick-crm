import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveSubscriptionApi } from "../../api/companyAdminApi";
import {
  Sparkles, Calendar, CreditCard, Users, ShieldCheck,
  AlertOctagon, CheckCircle2, ShieldAlert, BadgeInfo, Layers,
  Mail, Clock, ArrowUpRight, HelpCircle
} from "lucide-react";

const SubscriptionDetails = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["activeSubscription"],
    queryFn: () => getActiveSubscriptionApi().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400 animate-pulse">Loading subscription details...</p>
      </div>
    );
  }

  const subscription = data?.subscription;

  if (error || !subscription) {
    return (
      <div className="max-w-3xl mx-auto my-6 p-6 sm:p-8 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">No Active Subscription</h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          We couldn't detect an active subscription package for your organization. Everything remains visible, but write actions may be restricted.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left text-xs text-slate-800 dark:text-slate-200 space-y-1.5 max-w-lg mx-auto">
          <p className="font-bold flex items-center text-amber-600 dark:text-amber-400">
            <BadgeInfo size={15} className="mr-1.5 shrink-0" /> How to activate or extend?
          </p>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Please contact the system Super Administrator to assign a SaaS package or extend your organization trial period.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const calculateDaysRemaining = () => {
    if (!subscription.endDate) return 0;
    const diffTime = new Date(subscription.endDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = calculateDaysRemaining();
  const isExpired = new Date(subscription.endDate) < new Date() || subscription.status === "expired";
  const isTrial = subscription.billingCycle === "trial" || subscription.status === "trial";

  return (
    <div className="w-full space-y-3.5 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── Alert Banners ── */}
      {isExpired && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-3 shadow-2xs">
          <AlertOctagon className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">Subscription Package Expired</h4>
            <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
              Your organization's subscription ended on {formatDate(subscription.endDate)}. Restricted write features require package renewal. Please contact Super Admin immediately.
            </p>
          </div>
        </div>
      )}

      {!isExpired && daysRemaining <= 1 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-3 shadow-2xs animate-pulse">
          <AlertOctagon className="text-rose-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">🔴 Final Notice: Subscription Expires Tomorrow!</h4>
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              Urgent: Your plan ({subscription.planName}) expires tomorrow on {formatDate(subscription.endDate)}. Renew now to prevent service suspension.
            </p>
          </div>
        </div>
      )}

      {!isExpired && daysRemaining > 1 && daysRemaining <= 7 && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-3 shadow-2xs">
          <AlertOctagon className="text-orange-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase tracking-wider">🚨 Subscription Expiring in {daysRemaining} Days (Action Required)</h4>
            <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-0.5">
              Your plan ({subscription.planName}) expires on {formatDate(subscription.endDate)}. Renew in advance to keep all employee seats and CRM modules active.
            </p>
          </div>
        </div>
      )}

      {!isExpired && daysRemaining > 7 && daysRemaining <= 15 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-3 shadow-2xs">
          <Clock className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">⚠️ Subscription Renewal Notice ({daysRemaining} Days Left)</h4>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              Your organization's subscription plan ({subscription.planName}) will expire on {formatDate(subscription.endDate)}.
            </p>
          </div>
        </div>
      )}

      {isTrial && !isExpired && daysRemaining > 15 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 sm:p-4 flex items-start space-x-3 shadow-2xs">
          <Sparkles className="text-amber-500 shrink-0 mt-0.5 animate-pulse" size={18} />
          <div>
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">Free Trial Active</h4>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              Your organization is currently evaluating on a Free Trial package. You have <span className="font-extrabold">{daysRemaining} days remaining</span>.
            </p>
          </div>
        </div>
      )}

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            SaaS Subscription & Licensing <Sparkles size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your company license tier, active modules, employee limit, and renewal schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-xl border ${
            isExpired
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
              : isTrial
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          }`}>
            Status: {subscription.status}
          </span>
          <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            Cycle: {subscription.billingCycle}
          </span>
        </div>
      </div>

      {/* ── Stat KPI Cards Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Renewal Date</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{formatDate(subscription.endDate)}</h3>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5 block">Started: {formatDate(subscription.startDate)}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Calendar size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Time Remaining</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{daysRemaining} Days</h3>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block">{isExpired ? "Package expired" : "Active License"}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
            <Sparkles size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Employee Limit</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{subscription.planId?.employeeLimit || 50} Staff</h3>
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5 block">Licensed Account Seats</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold shrink-0">
            <Users size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Plan Amount</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">₹{(subscription.amount || 0).toLocaleString("en-IN")}</h3>
            <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-0.5 block">Payment: {subscription.paymentStatus || "Paid"}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold shrink-0">
            <CreditCard size={16} />
          </div>
        </div>
      </div>

      {/* ── Plan Entitlements & Support ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Left 2 Cols: Plan entitlements */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="text-amber-500" size={18} />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider m-0">
                Plan Entitlements & Features
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Assigned Plan Code", value: subscription.planId?.planCode || subscription.planId?.name || "Standard Enterprise" },
                { label: "Cloud Storage Limit", value: `${subscription.planId?.storageLimit || 5} GB Dedicated Storage` },
              ].map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 m-0">{item.label}</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white m-0">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 m-0">Active Entitled Modules</p>
              <div className="flex flex-wrap gap-2">
                {subscription.planId?.modules && subscription.planId.modules.length > 0 ? (
                  subscription.planId.modules.map((mod) => (
                    <span key={mod} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl">
                      {mod}
                    </span>
                  ))
                ) : (
                  ["Leads Engine", "WhatsApp Automation", "Attendance & Leaves", "Workforce Tasks", "Payroll & Reports"].map((mod) => (
                    <span key={mod} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl">
                      {mod}
                    </span>
                  ))
                )}
              </div>
            </div>

            {subscription.planId?.features && subscription.planId.features.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 m-0">Included Premium Features</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subscription.planId.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-slate-800 dark:text-slate-200">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span className="font-semibold">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Super Admin Support & License Desk */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck className="text-amber-500" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider m-0">
                  License & Upgrade Support
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-3">
                To upgrade your SaaS tier, increase employee seat limits, or extend billing cycles, contact the Super Admin platform desk.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5 mt-4 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Mail size={12} /> Super Admin Support Desk
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white m-0">Email: superadmin@icoded.com</p>
                <p className="text-[11px] font-medium text-slate-400 m-0 flex items-center gap-1">
                  <Clock size={12} /> SLA Response: Within 24 Hours
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="mailto:superadmin@icoded.com?subject=SaaS%20Subscription%20Upgrade%20Request"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span>Request Tier Upgrade</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetails;
