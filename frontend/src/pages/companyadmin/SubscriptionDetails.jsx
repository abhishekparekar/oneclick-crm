import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getActiveSubscriptionApi,
  getCompanySubscriptionRequestsApi,
  getModuleUsageApi,
} from "../../api/companyAdminApi";
import CompanySubscriptionRequestModal from "../../components/subscription/CompanySubscriptionRequestModal";
import {
  Sparkles, Calendar, CreditCard, Users, ShieldCheck,
  AlertOctagon, CheckCircle2, ShieldAlert, BadgeInfo, Layers,
  Mail, Clock, ArrowUpRight, HelpCircle, Send, Plus, RefreshCw,
  CalendarCheck, DollarSign, CheckSquare, FolderKanban, BarChart3,
  Magnet, Smartphone, Globe, ChevronDown, ChevronUp, UserCheck,
  AlertTriangle, ExternalLink, Filter, Check
} from "lucide-react";

const RequestStatusBadge = ({ status }) => {
  const badgeMap = {
    pending: { label: "Pending Review", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
    in_review: { label: "In Review", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800" },
    approved: { label: "Approved", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
    provisioned: { label: "Provisioned & Active", bg: "bg-emerald-600 text-white border-emerald-600" },
    rejected: { label: "Declined", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800" },
  };
  const b = badgeMap[status] || badgeMap.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${b.bg}`}>
      {b.label}
    </span>
  );
};

const MODULE_ICONS = {
  attendance: CalendarCheck,
  leave: Calendar,
  payroll: DollarSign,
  tasks: CheckSquare,
  projects: FolderKanban,
  reports: BarChart3,
  leads: Magnet,
  mobileapp: Smartphone,
  webadmin: Globe,
};

const MODULE_COLORS = {
  attendance: { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", progress: "from-blue-500 to-indigo-600" },
  leave: { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", progress: "from-amber-500 to-orange-500" },
  payroll: { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", progress: "from-emerald-500 to-teal-600" },
  tasks: { bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20", progress: "from-violet-500 to-purple-600" },
  projects: { bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", progress: "from-cyan-500 to-blue-500" },
  reports: { bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", progress: "from-rose-500 to-pink-600" },
  leads: { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", progress: "from-amber-500 to-yellow-600" },
  mobileapp: { bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20", progress: "from-teal-500 to-emerald-600" },
  webadmin: { bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", progress: "from-indigo-500 to-blue-600" },
};

const SubscriptionDetails = () => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [expandedModule, setExpandedModule] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["activeSubscription"],
    queryFn: () => getActiveSubscriptionApi().then(res => res.data),
  });

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ["companySubscriptionRequests"],
    queryFn: () => getCompanySubscriptionRequestsApi().then(res => res.data),
  });

  const { data: usageData, isLoading: isUsageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ["companyModuleUsage"],
    queryFn: () => getModuleUsageApi().then(res => res.data),
  });

  const myRequests = requestsData?.data || [];
  const moduleBreakdown = usageData?.detailedBreakdown || [];

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
          We couldn't detect an active subscription package for your organization. You can send a direct provisioning request to Super Admin below.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 mx-auto shadow-md cursor-pointer"
          >
            <Send size={14} /> Send Plan Request to Super Admin
          </button>
        </div>

        <CompanySubscriptionRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => { setIsRequestModalOpen(false); refetch(); refetchRequests(); }}
          currentPlan={null}
        />
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
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-3.5 sm:p-4 flex items-start justify-between space-x-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="text-rose-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">Subscription Package Expired</h4>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                Your organization's subscription ended on {formatDate(subscription.endDate)}. Send an instant renewal request to Super Admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Request Renewal
          </button>
        </div>
      )}

      {!isExpired && daysRemaining <= 1 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl p-3.5 sm:p-4 flex items-start justify-between space-x-3 shadow-2xs animate-pulse">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">🔴 Final Notice: Subscription Expires Tomorrow!</h4>
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                Urgent: Your plan ({subscription.planName}) expires tomorrow on {formatDate(subscription.endDate)}. Renew now to prevent service suspension.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Request Urgent Renewal
          </button>
        </div>
      )}

      {!isExpired && daysRemaining > 1 && daysRemaining <= 7 && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-3.5 sm:p-4 flex items-start justify-between space-x-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase tracking-wider">🚨 Subscription Expiring in {daysRemaining} Days (Action Required)</h4>
              <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                Your plan ({subscription.planName}) expires on {formatDate(subscription.endDate)}. Request renewal in advance to keep seats active.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Renew Now
          </button>
        </div>
      )}

      {!isExpired && daysRemaining > 7 && daysRemaining <= 15 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 sm:p-4 flex items-start justify-between space-x-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <Clock className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">⚠️ Subscription Renewal Notice ({daysRemaining} Days Left)</h4>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                Your organization's subscription plan ({subscription.planName}) will expire on {formatDate(subscription.endDate)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Send Renewal Request
          </button>
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
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Send size={13} />
            <span>Send Request to Super Admin</span>
          </button>

          <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-xl border ${
            isExpired
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
              : isTrial
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          }`}>
            Status: {subscription.status}
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
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="text-amber-500" size={18} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider m-0">
                  Plan Entitlements & Features
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Request Upgrade</span>
                <ArrowUpRight size={12} />
              </button>
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
                  License & Upgrade Desk
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-3">
                Need more employee seats, plan upgrade, or custom CRM add-ons? Send a direct request to Super Admin.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5 mt-4 space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Mail size={12} /> Super Admin Platform Desk
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white m-0">Direct Licensing Response System</p>
                <p className="text-[11px] font-medium text-slate-400 m-0 flex items-center gap-1">
                  <Clock size={12} /> Super Admin Notified in Real-Time
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Send size={14} />
                <span>Submit Subscription Request</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Module-Wise Seat & License Allocation Breakdown ── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Layers size={16} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider m-0">
                Module-Wise Seat & License Allocation
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track allocated employee seats, assigned staff members, and remaining capacity across modules.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/company/employees"
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users size={13} className="text-amber-500" />
              <span>Manage Employee Access</span>
              <ExternalLink size={11} className="text-slate-400" />
            </Link>
            <button
              type="button"
              onClick={() => refetchUsage()}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Refresh Module Usage"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Category Filters & Quick Summary Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1 pb-1">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { key: "all", label: "All Modules" },
              { key: "Core HR", label: "Core HR" },
              { key: "Productivity", label: "Productivity" },
              { key: "Sales & CRM", label: "Sales & CRM" },
              { key: "Platform", label: "Platform & Reports" },
            ].map((cat) => {
              const active = selectedCategory === cat.key;
              const count = cat.key === "all"
                ? moduleBreakdown.length
                : cat.key === "Platform"
                ? moduleBreakdown.filter(m => m.category === "Platform" || m.category === "Analytics").length
                : moduleBreakdown.filter(m => m.category === cat.key).length;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.label} <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Summary Pill */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Plan Limit: <strong className="text-slate-900 dark:text-white">{usageData?.companyLimit || subscription.planId?.employeeLimit || 10} Seats</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Active Staff: <strong className="text-slate-900 dark:text-white">{usageData?.totalActiveEmployees || 0} Staff</strong>
            </span>
          </div>
        </div>

        {/* Module Cards Grid */}
        {isUsageLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading module seat usage...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {moduleBreakdown
              .filter((item) => {
                if (selectedCategory === "all") return true;
                if (selectedCategory === "Platform") return item.category === "Platform" || item.category === "Analytics";
                return item.category === selectedCategory;
              })
              .map((item) => {
                const IconComponent = MODULE_ICONS[item.key] || Layers;
                const colors = MODULE_COLORS[item.key] || {
                  bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  progress: "from-amber-500 to-amber-600",
                };
                const isExpanded = expandedModule === item.key;

                return (
                  <div
                    key={item.key}
                    className="bg-slate-50/70 dark:bg-[#0D151C] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-2xs"
                  >
                    <div className="space-y-3">
                      {/* Card Top: Icon, Title & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${colors.bg}`}>
                            <IconComponent size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate m-0">
                              {item.label}
                            </h4>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        {/* Capacity Status Badge */}
                        {item.isFull ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 shrink-0">
                            Full (100%)
                          </span>
                        ) : item.remaining <= 2 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                            Running Low
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug line-clamp-1">
                        {item.description}
                      </p>

                      {/* 3 Core Metric Stat Boxes */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                        {/* Total Allowed */}
                        <div className="text-center px-1 py-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                            Total Limit
                          </span>
                          <span className="text-sm font-black text-slate-900 dark:text-white leading-tight block my-0.5">
                            {item.limit}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                            Seats Allowed
                          </span>
                        </div>

                        {/* Assigned / Given */}
                        <div className="text-center px-1 py-1 border-x border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
                            Assigned
                          </span>
                          <span className="text-sm font-black text-blue-600 dark:text-blue-400 leading-tight block my-0.5">
                            {item.used}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                            Staff Active
                          </span>
                        </div>

                        {/* Remaining */}
                        <div className="text-center px-1 py-1">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider block truncate ${
                            item.remaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            Remaining
                          </span>
                          <span className={`text-sm font-black leading-tight block my-0.5 ${
                            item.remaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {item.remaining}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                            {item.remaining > 0 ? "Seats Left" : "No Seats Left"}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Seat Utilization</span>
                          <span className={item.isFull ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-slate-700 dark:text-slate-300"}>
                            {item.used} of {item.limit} used ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.isFull
                                ? "bg-gradient-to-r from-rose-500 to-rose-600"
                                : item.percentage > 70
                                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                : "bg-gradient-to-r from-emerald-500 to-teal-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(item.percentage, item.used > 0 ? 6 : 0))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Expand Assigned Employees Drawer */}
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setExpandedModule(isExpanded ? null : item.key)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users size={12} className="text-slate-400" />
                          <span>{isExpanded ? "Hide Staff List" : `View Assigned Staff (${item.used})`}</span>
                        </span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {/* Expanded Assigned Staff List */}
                      {isExpanded && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <span>Assigned Staff ({item.employees?.length || 0})</span>
                            <span>Status</span>
                          </div>

                          {(!item.employees || item.employees.length === 0) ? (
                            <p className="text-[11px] text-slate-400 py-1.5 text-center font-medium">
                              No employees currently assigned to this module.
                            </p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                              {item.employees.map((emp) => {
                                const initials = (emp.name || emp.email || "E")
                                  .split(" ")
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase();

                                return (
                                  <div key={emp._id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[9px] flex items-center justify-center shrink-0">
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate m-0 leading-tight">
                                          {emp.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 truncate m-0">
                                          {emp.email}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                                      <Check size={10} /> Active
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Bottom Action */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            {item.remaining > 0 ? (
                              <Link
                                to="/company/employees"
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Plus size={10} /> Assign {item.remaining} more staff
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsRequestModalOpen(true)}
                                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowUpRight size={10} /> Request more seats from Super Admin
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── My Submitted Subscription Requests Table ── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider m-0 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> My Subscription & Licensing Requests
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Track the status and Super Admin responses to your requested upgrades.</p>
          </div>
          <button
            type="button"
            onClick={() => refetchRequests()}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Refresh Requests"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 space-y-2">
            <p className="font-semibold">No subscription requests submitted yet.</p>
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              Click here to send your first request to Super Admin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider text-left">
                  <th className="pb-2">Request Code</th>
                  <th className="pb-2">Request Type</th>
                  <th className="pb-2">Requested Details</th>
                  <th className="pb-2">Submitted Date</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Super Admin Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {myRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {req.requestCode}
                    </td>
                    <td className="py-2.5 font-semibold capitalize">
                      {req.requestType?.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {req.requestedPlanName || req.requestedPlanId?.planName || "Custom Requirements"}
                      </span>
                      {req.requestedSeats > 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          Seats: {req.requestedSeats} Staff ({req.billingCycle})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="py-2.5">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="py-2.5 text-slate-500 italic max-w-xs truncate">
                      {req.adminResponseNotes || "Pending review..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <CompanySubscriptionRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => { setIsRequestModalOpen(false); refetch(); refetchRequests(); refetchUsage(); }}
        currentPlan={subscription?.planId}
      />
    </div>
  );
};

export default SubscriptionDetails;

