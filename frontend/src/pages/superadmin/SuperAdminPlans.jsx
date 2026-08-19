import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlansApi, createPlanApi, updatePlanApi,
  updatePlanStatusApi, deletePlanApi
} from "../../api/superAdminApi";
import {
  Search, Plus, Edit, Trash2, Ban, CheckCircle, CheckCircle2,
  Package, Layers, Users, HardDrive, Clock, Sparkles, Check,
  DollarSign, Shield, Cpu, Zap, ArrowRight, AlertCircle
} from "lucide-react";

const MODULES = [
  "attendance", "leave", "payroll", "tasks", "projects", 
  "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin"
];

/* ─── Palette-Enforced Status Badge ────────────────────────────────────── */
const PlanStatusBadge = ({ status }) => {
  const isEnabled = status === "active";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
      isEnabled 
        ? "bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30" 
        : "bg-sa-bg text-sa-text-secondary border-sa-border"
    }`}>
      <span className={`w-1 h-1 rounded-full mr-1.5 ${isEnabled ? "bg-[#fbbf24]" : "bg-sa-text-secondary"}`} />
      {isEnabled ? "Active Tier" : "Archived / Inactive"}
    </span>
  );
};

/* ─── Top Summary KPI Card ─────────────────────────────────────────────── */
const PlanKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-sa-surface rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
      active ? "border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md" : "border-sa-border hover:border-sa-border/80 hover:bg-sa-bg/30"
    }`}
  >
    <div>
      <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h4 className="text-2xl font-black text-sa-text tracking-tight leading-none">{count}</h4>
        {subtitle && <span className="text-[10px] font-bold text-sa-text-secondary">{subtitle}</span>}
      </div>
    </div>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
      <Icon size={18} className="text-white" />
    </div>
  </div>
);

const SuperAdminPlans = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    planName: "",
    planCode: "",
    priceMonthly: 0,
    priceYearly: 0,
    employeeLimit: 50,
    storageLimit: 5,
    trialDays: 14,
    features: "",
    modules: [],
    status: "active"
  });

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminPlans"],
    queryFn: () => getPlansApi(),
  });

  const rawPlans = Array.isArray(data?.data) ? data?.data : (data?.data?.plans || []);
  const plans = rawPlans.length > 0 ? rawPlans : [
    {
      _id: "plan_01",
      planName: "Trial",
      planCode: "TRIAL-14",
      priceMonthly: 0,
      priceYearly: 0,
      employeeLimit: 25,
      storageLimit: 2,
      trialDays: 14,
      features: "Core HR, Basic Attendance, 14-Day Free Access",
      modules: ["attendance", "leave"],
      status: "active"
    },
    {
      _id: "plan_02",
      planName: "Basic",
      planCode: "BASIC-50",
      priceMonthly: 2000,
      priceYearly: 20000,
      employeeLimit: 50,
      storageLimit: 10,
      trialDays: 0,
      features: "Attendance, Leave Management, Payroll Processing, Basic Reports",
      modules: ["attendance", "leave", "payroll", "reports"],
      status: "active"
    },
    {
      _id: "plan_03",
      planName: "Pro",
      planCode: "PRO-200",
      priceMonthly: 5000,
      priceYearly: 50000,
      employeeLimit: 200,
      storageLimit: 50,
      trialDays: 0,
      features: "All Basic features + Performance Management, Recruitment ATS, WhatsApp Notifications",
      modules: ["attendance", "leave", "payroll", "recruitment", "performance", "reports", "whatsapp"],
      status: "active"
    },
    {
      _id: "plan_04",
      planName: "Enterprise",
      planCode: "ENT-UNLIM",
      priceMonthly: 15000,
      priceYearly: 150000,
      employeeLimit: 1000,
      storageLimit: 500,
      trialDays: 0,
      features: "Unlimited modules, Dedicated Account Manager, Custom API Access, SLA 99.99%",
      modules: ["attendance", "leave", "payroll", "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin"],
      status: "active"
    }
  ];

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = (plan.planName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (plan.planCode || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const maxSeats = plans.length > 0 ? Math.max(...plans.map(p => Number(p.employeeLimit) || 0)) : 0;

  const createMutation = useMutation({
    mutationFn: createPlanApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminPlans"]);
      setIsModalOpen(false);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to create plan")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePlanApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminPlans"]);
      setIsModalOpen(false);
      setEditingPlan(null);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to update plan")
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updatePlanStatusApi(id, status),
    onSuccess: () => queryClient.invalidateQueries(["superAdminPlans"]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deletePlanApi(id),
    onSuccess: () => queryClient.invalidateQueries(["superAdminPlans"]),
    onError: (err) => alert(err.response?.data?.message || "Failed to delete plan")
  });

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        planName: plan.planName || "",
        planCode: plan.planCode || "",
        priceMonthly: Number(plan.priceMonthly) || 0,
        priceYearly: Number(plan.priceYearly) || 0,
        employeeLimit: Number(plan.employeeLimit) || 50,
        storageLimit: Number(plan.storageLimit) || 5,
        trialDays: Number(plan.trialDays) || 0,
        features: plan.features ? (Array.isArray(plan.features) ? plan.features.join("\n") : plan.features) : "",
        modules: plan.modules || [],
        status: plan.status || "active"
      });
    } else {
      setEditingPlan(null);
      setFormData({
        planName: "",
        planCode: "",
        priceMonthly: 0,
        priceYearly: 0,
        employeeLimit: 50,
        storageLimit: 5,
        trialDays: 14,
        features: "24/7 Priority Support\nCustom Workspace Domain\nAutomated Data Backups",
        modules: ["attendance", "leave", "reports", "tasks"],
        status: "active"
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "modules") {
      const moduleName = value;
      setFormData(prev => {
        if (checked) {
          return { ...prev, modules: [...prev.modules, moduleName] };
        } else {
          return { ...prev, modules: prev.modules.filter(m => m !== moduleName) };
        }
      });
    } else {
      setFormData({ ...formData, [name]: type === 'number' ? Number(value) : value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      features: formData.features.split("\n").filter(f => f.trim() !== "")
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    statusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this pricing tier? It cannot be deleted if active enterprise tenants are assigned to it.")) {
      deleteMutation.mutate(id);
    }
  };

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 w-full pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sa-border">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">SaaS Subscription Plans</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Architect pricing tiers, resource quotas, module entitlements, and evaluation trials for enterprise tenants.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 flex items-center space-x-2"
          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
        >
          <Plus size={15} />
          <span>Add New Plan Tier</span>
        </button>
      </div>

      {/* Analytics KPI Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PlanKpiCard 
          title="Total Pricing Tiers" 
          count={plans.length} 
          subtitle="All configured packages" 
          icon={Layers} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all"} 
          onClick={() => setStatusFilter("all")} 
        />
        <PlanKpiCard 
          title="Active Published Plans" 
          count={plans.filter(p => p.status === 'active').length} 
          subtitle="Available for enrollment" 
          icon={CheckCircle2} 
          grad={["#f59e0b", "#f59e0b"]} 
          active={statusFilter === "active"} 
          onClick={() => setStatusFilter("active")} 
        />
        <PlanKpiCard 
          title="Max Seat Capacity" 
          count={`${maxSeats} Emp`} 
          subtitle="Highest tier allowance" 
          icon={Users} 
          grad={["#b45309", "#06B6D4"]} 
          active={false} 
          onClick={() => {}} 
        />
        <PlanKpiCard 
          title="Core SaaS Modules" 
          count={MODULES.length} 
          subtitle="Enterprise system suites" 
          icon={Cpu} 
          grad={["#d97706", "#fbbf24"]} 
          active={false} 
          onClick={() => {}} 
        />
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="bg-sa-surface p-4 rounded-2xl border border-sa-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search plans by name, code, or feature keywords..."
            className="w-full bg-sa-bg/60 border border-sa-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Plans" },
            { id: "active", label: "Active Only" },
            { id: "inactive", label: "Archived / Inactive" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all border ${
                statusFilter === item.id 
                  ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 shadow-2xs" 
                  : "bg-sa-bg/60 text-sa-text-secondary border-sa-border hover:text-sa-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading subscription tiers...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="py-16 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <Package size={36} className="text-sa-text-secondary/40 mx-auto mb-3" />
          <h4 className="text-base font-black text-sa-text">No Subscription Plans Found</h4>
          <p className="text-xs text-sa-text-secondary mt-1">Try modifying your search filter or click Add Plan to create a new tier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPlans.map((plan) => {
            const savingsPercent = plan.priceMonthly && plan.priceYearly && plan.priceMonthly > 0
              ? Math.round((1 - (plan.priceYearly / (plan.priceMonthly * 12))) * 100)
              : 0;

            return (
              <div 
                key={plan._id} 
                className={`bg-sa-surface rounded-2xl border flex flex-col transition-all overflow-hidden shadow-sm hover:shadow-md ${
                  plan.status === 'active' ? "border-sa-border hover:border-[#f59e0b]/60" : "border-sa-border/60 opacity-80"
                }`}
              >
                {/* Card Top Header */}
                <div className="p-6 pb-4 border-b border-sa-border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-sa-bg border border-sa-border text-[10px] font-mono font-black text-[#f59e0b] uppercase tracking-widest mb-1.5">
                        {plan.planCode || "TIER"}
                      </span>
                      <h3 className="text-2xl font-black text-sa-text tracking-tight">{plan.planName}</h3>
                    </div>
                    <PlanStatusBadge status={plan.status} />
                  </div>

                  {/* Price Box */}
                  <div className="mt-3 bg-sa-bg/60 p-3.5 rounded-xl border border-sa-border flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-black text-sa-text leading-none">${plan.priceMonthly || 0}</span>
                        <span className="text-xs font-bold text-sa-text-secondary">/ month</span>
                      </div>
                      <p className="text-[11px] font-semibold text-sa-text-secondary mt-1 flex items-center gap-1.5">
                        <span>or <strong>${plan.priceYearly || 0}</strong> / year</span>
                      </p>
                    </div>
                    {savingsPercent > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 text-[10px] font-black uppercase tracking-wider">
                        Save {savingsPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Quota Pillars Card */}
                <div className="p-6 flex-1 space-y-5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-sa-bg p-2.5 rounded-xl border border-sa-border">
                      <Users size={14} className="text-[#f59e0b] mx-auto mb-1 opacity-80" />
                      <span className="block text-xs font-black text-sa-text">{plan.employeeLimit || 0}</span>
                      <span className="block text-[9px] font-extrabold text-sa-text-secondary uppercase">Seats</span>
                    </div>
                    <div className="bg-sa-bg p-2.5 rounded-xl border border-sa-border">
                      <HardDrive size={14} className="text-[#06B6D4] mx-auto mb-1 opacity-80" />
                      <span className="block text-xs font-black text-sa-text">{plan.storageLimit || 0} GB</span>
                      <span className="block text-[9px] font-extrabold text-sa-text-secondary uppercase">Storage</span>
                    </div>
                    <div className="bg-sa-bg p-2.5 rounded-xl border border-sa-border">
                      <Clock size={14} className="text-[#fbbf24] mx-auto mb-1 opacity-80" />
                      <span className="block text-xs font-black text-sa-text">{plan.trialDays || 0} Days</span>
                      <span className="block text-[9px] font-extrabold text-sa-text-secondary uppercase">Free Trial</span>
                    </div>
                  </div>

                  {/* Entitled Modules */}
                  <div>
                    <h4 className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span>Included Suite Modules</span>
                      <span className="text-[#f59e0b] font-mono font-black">{plan.modules?.length || 0} Entitled</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.modules && plan.modules.length > 0 ? (
                        plan.modules.map(mod => (
                          <span key={mod} className="inline-flex items-center space-x-1 px-2 py-1 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 size={10} className="flex-shrink-0" />
                            <span>{mod}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-sa-text-secondary italic">No specific modules checked</span>
                      )}
                    </div>
                  </div>

                  {/* Key Features List */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="pt-2 border-t border-sa-border/60">
                      <h4 className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-2">Key Value Features</h4>
                      <ul className="space-y-1.5 text-xs font-semibold text-sa-text">
                        {(Array.isArray(plan.features) ? plan.features : plan.features.split("\n")).slice(0, 4).map((feat, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <Check size={13} className="text-[#fbbf24] flex-shrink-0 mt-0.5" />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-sa-bg/60 border-t border-sa-border flex items-center justify-between gap-2">
                  <div className="flex space-x-1.5">
                    <button 
                      type="button" 
                      onClick={() => handleOpenModal(plan)} 
                      className="px-3 py-1.5 rounded-xl bg-sa-surface border border-sa-border text-xs font-black text-sa-text hover:border-[#f59e0b] hover:text-[#f59e0b] transition-all flex items-center space-x-1"
                    >
                      <Edit size={13} />
                      <span>Configure</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => toggleStatus(plan._id, plan.status)} 
                      className={`p-1.5 rounded-xl border transition-all ${
                        plan.status === 'active' 
                          ? "bg-sa-surface border-sa-border text-sa-text-secondary hover:text-rose-500" 
                          : "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20"
                      }`}
                      title={plan.status === 'active' ? "Deactivate Tier" : "Publish & Activate Tier"}
                    >
                      {plan.status === 'active' ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleDelete(plan._id)} 
                    className="p-1.5 rounded-xl bg-sa-surface border border-sa-border text-sa-text-secondary hover:text-rose-600 hover:border-rose-300 transition-all"
                    title="Delete Plan Tier"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Glassmorphic Add / Edit Plan Modal Configuration Suite ─────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-3xl my-4 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-sa-border flex justify-between items-center bg-sa-bg/80 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <div>
                  <h2 className="text-base font-black text-sa-text tracking-tight">{editingPlan ? "Modify SaaS Pricing Tier" : "Architect New SaaS Plan Tier"}</h2>
                  <p className="text-[10px] font-bold text-sa-text-secondary">Set exact limits, entitlements, and subscription pricing.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-3 hide-scrollbar">
              
              {/* Section 1: Core Tier Identity */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <Package size={14} className="text-[#f59e0b]" />
                  <span>Tier Identity & Status</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Tier Name</label>
                    <input type="text" name="planName" required value={formData.planName} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" placeholder="e.g. Enterprise Pro" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Plan Code Identifier</label>
                    <input type="text" name="planCode" required value={formData.planCode} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#f59e0b] focus:outline-none focus:border-[#f59e0b] transition-all uppercase" placeholder="e.g. ENT-PRO" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Publish Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="active">Active (Published)</option>
                      <option value="inactive">Archived / Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing Structure */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-[#06B6D4]" />
                  <span>Subscription Pricing Models</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sa-bg/50 p-4 rounded-xl border border-sa-border">
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Monthly Billing Price ($ / month)</label>
                    <input type="number" name="priceMonthly" required min="0" step="0.01" value={formData.priceMonthly} onChange={handleChange}
                      className="w-full bg-sa-surface border border-sa-border rounded-xl px-3.5 py-2.5 text-sm font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Annual Billing Price ($ / year)</label>
                    <input type="number" name="priceYearly" required min="0" step="0.01" value={formData.priceYearly} onChange={handleChange}
                      className="w-full bg-sa-surface border border-sa-border rounded-xl px-3.5 py-2.5 text-sm font-black text-[#f59e0b] focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                </div>
              </div>

              {/* Section 3: Quota & Resource Ceilings */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border pb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-[#fbbf24]" />
                  <span>Quota Ceilings & Evaluation Trial</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Max Employee Seats</label>
                    <input type="number" name="employeeLimit" required min="1" value={formData.employeeLimit} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Storage Allowance (GB)</label>
                    <input type="number" name="storageLimit" required min="1" value={formData.storageLimit} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Free Trial Duration (Days)</label>
                    <input type="number" name="trialDays" required min="0" value={formData.trialDays} onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                </div>
              </div>

              {/* Section 4: Entitled Suite Modules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-sa-border pb-2">
                  <h4 className="text-xs font-black text-sa-text uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={14} className="text-[#f59e0b]" />
                    <span>Entitled Suite Modules</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#f59e0b]">{formData.modules.length} / {MODULES.length} Selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-4 rounded-xl bg-sa-bg/60 border border-sa-border">
                  {MODULES.map(mod => {
                    const isChecked = formData.modules.includes(mod);
                    return (
                      <label 
                        key={mod} 
                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked 
                            ? "bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#f59e0b] shadow-2xs" 
                            : "bg-sa-surface border-sa-border text-sa-text-secondary hover:text-sa-text hover:border-sa-border/80"
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          name="modules"
                          value={mod}
                          checked={isChecked}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked ? "bg-[#f59e0b] border-transparent text-white" : "border-sa-border bg-sa-bg"
                        }`}>
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider truncate">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Key Value Features */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#fbbf24]" />
                  <span>Key Value Features & Selling Points (One bullet per line)</span>
                </h4>
                <textarea 
                  name="features" 
                  rows="4" 
                  value={formData.features} 
                  onChange={handleChange} 
                  className="w-full bg-sa-bg border border-sa-border rounded-xl p-3.5 text-xs font-semibold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all leading-relaxed" 
                  placeholder="24/7 Priority VIP Support&#10;Custom Workspace Domain & Branding&#10;Unlimited API & Webhook Access&#10;Dedicated Success Manager" 
                />
              </div>
            </form>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-sa-border bg-sa-bg/80 flex justify-end space-x-3 sticky bottom-0 z-10 backdrop-blur-md">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-sa-border bg-sa-surface text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                Cancel Configuration
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5"
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              >
                <Check size={14} />
                <span>{editingPlan ? (updateMutation.isPending ? "Saving..." : "Save Tier Changes") : (createMutation.isPending ? "Publishing..." : "Create & Publish Plan Tier")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPlans;
