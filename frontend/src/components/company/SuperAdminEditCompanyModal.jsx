import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateCompanyApi, getPlansApi } from "../../api/superAdminApi";
import { toast } from "react-hot-toast";
import {
  X, Building2, User, Phone, Mail, MapPin, Briefcase,
  CreditCard, Users, Cpu, HardDrive, Sparkles, Check,
  Save, AlertCircle
} from "lucide-react";

const MODULES = [
  "attendance", "leave", "payroll", "tasks", "projects",
  "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin", "leads"
];

const MODULE_CAP_ITEMS = [
  { key: "attendance", label: "Attendance & Bio-Punch", color: "#10b981" },
  { key: "leave",      label: "Leave Management",       color: "#06B6D4" },
  { key: "payroll",    label: "Payroll & Salary",       color: "#8b5cf6" },
  { key: "tasks",      label: "Tasks Module",            color: "#f59e0b" },
  { key: "leads",      label: "Leads Engine & CRM",      color: "#f59e0b" },
  { key: "projects",   label: "Projects Workspace",      color: "#06B6D4" },
  { key: "reports",    label: "Analytics & Reports",     color: "#3B82F6" },
];

const SuperAdminEditCompanyModal = ({ isOpen, onClose, company, onUpdated }) => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("general"); // "general" | "licenses" | "owner"
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  const [customIndustryText, setCustomIndustryText] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    industryType: "Technology",
    planId: "",
    planName: "",
    employeeLimit: 50,
    storageLimit: 5,
    subscribedModules: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"],
    moduleLimits: {
      attendance: 0,
      leave: 0,
      payroll: 0,
      tasks: 0,
      leads: 0,
      projects: 0,
      reports: 0,
    },
  });

  const { data: plansData } = useQuery({
    queryKey: ["superAdminPlans"],
    queryFn: getPlansApi,
  });

  const activePlans = useMemo(() => {
    return (plansData?.data?.plans || []).filter(p => p.status === "active" || !p.status);
  }, [plansData]);

  useEffect(() => {
    if (company && isOpen) {
      const knownIndustries = [
        "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
        "Education", "Real Estate", "Hospitality", "Consulting"
      ];
      const isCustom = company.industryType && !knownIndustries.includes(company.industryType);
      setIsCustomIndustry(isCustom);
      setCustomIndustryText(isCustom ? company.industryType : "");

      setFormData({
        companyName: company.companyName || company.name || "",
        ownerName: company.ownerName || company.contactPerson || "",
        ownerEmail: company.ownerEmail || company.email || "",
        ownerPhone: company.ownerPhone || company.phone || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        pincode: company.pincode || "",
        industryType: company.industryType || "Technology",
        planId: company.planId?._id || company.planId || "",
        planName: company.planName || company.plan || "Custom",
        employeeLimit: company.employeeLimit ?? company.userLimit ?? 50,
        storageLimit: company.storageLimit ?? 5,
        subscribedModules: Array.isArray(company.subscribedModules) && company.subscribedModules.length > 0
          ? company.subscribedModules
          : ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"],
        moduleLimits: company.moduleLimits || {
          attendance: 0,
          leave: 0,
          payroll: 0,
          tasks: 0,
          leads: 0,
          projects: 0,
          reports: 0,
        },
      });
    }
  }, [company, isOpen]);

  const handlePlanSelect = (e) => {
    const selectedId = e.target.value;
    const plan = activePlans.find(p => p._id === selectedId);
    if (plan) {
      setFormData(prev => ({
        ...prev,
        planId: plan._id,
        planName: plan.planName,
        employeeLimit: plan.employeeLimit || prev.employeeLimit || 50,
        storageLimit: plan.storageLimit || prev.storageLimit || 5,
        subscribedModules: Array.isArray(plan.modules) && plan.modules.length > 0
          ? plan.modules
          : prev.subscribedModules,
        moduleLimits: plan.moduleLimits || prev.moduleLimits || {},
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        planId: "",
        planName: selectedId,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "subscribedModules") {
      const mod = value;
      setFormData(prev => {
        const current = prev.subscribedModules || [];
        const next = checked ? [...current, mod] : current.filter(m => m !== mod);
        return { ...prev, subscribedModules: next };
      });
    } else if (name.startsWith("moduleLimit_")) {
      const modKey = name.replace("moduleLimit_", "");
      const numVal = Math.max(0, parseInt(value, 10) || 0);
      setFormData(prev => ({
        ...prev,
        moduleLimits: {
          ...(prev.moduleLimits || {}),
          [modKey]: numVal,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (name === "employeeLimit" || name === "storageLimit") ? Number(value) || 0 : value
      }));
    }
  };

  const mutation = useMutation({
    mutationFn: (payload) => updateCompanyApi(company._id, payload),
    onSuccess: (res) => {
      toast.success("Company profile & licenses updated successfully!");
      queryClient.invalidateQueries(["superAdminCompanies"]);
      queryClient.invalidateQueries(["superAdminCompany", company._id]);
      if (onUpdated) onUpdated(res.data?.company || res.data);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update company.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!company?._id) return;
    const finalPayload = {
      ...formData,
      industryType: isCustomIndustry ? (customIndustryText.trim() || "Other") : formData.industryType
    };
    mutation.mutate(finalPayload);
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-sa-surface border border-sa-border/40 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-sa-border/40 dark:border-white/10 flex items-center justify-between bg-sa-bg/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-sa-text tracking-tight">
                  Edit Company: {company.companyName || company.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                  {formData.planName}
                </span>
              </div>
              <p className="text-xs text-sa-text-secondary mt-0.5">
                Update organization details, subscription tier, entitled modules, and seat caps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sa-text-secondary hover:text-sa-text hover:bg-sa-border/30 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 border-b border-sa-border/30 dark:border-white/5 flex items-center space-x-2 bg-sa-bg/30 overflow-x-auto">
          {[
            { id: "general",  label: "Organization & Contact", icon: Building2 },
            { id: "licenses", label: "Plan & Feature Licenses", icon: Cpu, badge: `${formData.subscribedModules.length} Modules` },
            { id: "owner",    label: "Primary Owner Details", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none ${
                  isActive
                    ? "bg-[#f59e0b] text-white shadow-sm"
                    : "text-sa-text-secondary hover:text-sa-text hover:bg-sa-border/30"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-sa-border text-sa-text-secondary"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Body Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Organization & Contact */}
          {activeTab === "general" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Company Name *</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                    <input 
                      type="text" 
                      name="companyName" 
                      required 
                      value={formData.companyName} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                      placeholder="e.g. Acme Corporation" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Official Email *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                    <input 
                      type="email" 
                      name="email" 
                      required 
                      value={formData.email} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                      placeholder="contact@acme.com" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Official Phone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                    <input 
                      type="text" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                      placeholder="+1 (234) 567-8900" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Industry Classification</label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none" />
                    <select
                      name="industryType"
                      value={isCustomIndustry ? "Other" : formData.industryType}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Other") {
                          setIsCustomIndustry(true);
                          setFormData(prev => ({ ...prev, industryType: customIndustryText || "" }));
                        } else {
                          setIsCustomIndustry(false);
                          setFormData(prev => ({ ...prev, industryType: val }));
                        }
                      }}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer"
                    >
                      <option value="Technology">Technology & Software</option>
                      <option value="Finance">Banking & Finance</option>
                      <option value="Healthcare">Healthcare & Life Sciences</option>
                      <option value="Retail">Retail & E-Commerce</option>
                      <option value="Manufacturing">Manufacturing & Logistics</option>
                      <option value="Education">Education & EdTech</option>
                      <option value="Real Estate">Real Estate & Construction</option>
                      <option value="Hospitality">Hospitality & Tourism</option>
                      <option value="Consulting">Consulting & Professional Services</option>
                      <option value="Other">+ Custom Industry Classification</option>
                    </select>
                  </div>
                  {isCustomIndustry && (
                    <input
                      type="text"
                      value={customIndustryText}
                      onChange={(e) => {
                        setCustomIndustryText(e.target.value);
                        setFormData(prev => ({ ...prev, industryType: e.target.value }));
                      }}
                      placeholder="Enter custom industry"
                      className="w-full mt-2 bg-sa-bg border border-[#f59e0b] rounded-xl px-3.5 py-2 text-xs font-bold text-sa-text"
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Street Address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                    <input 
                      type="text" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                      placeholder="123 Enterprise Parkway" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">City</label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-sa-text"
                      placeholder="City" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">State</label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-sa-text"
                      placeholder="State" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">Pincode</label>
                    <input 
                      type="text" 
                      name="pincode" 
                      value={formData.pincode} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-sa-text"
                      placeholder="10001" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Plan & Feature Licenses (Exact User Design) */}
          {activeTab === "licenses" && (
            <div className="space-y-6">
              {/* Plan Preset Selector & Top 3 Inputs */}
              <div className="p-4 rounded-xl bg-sa-bg/60 border border-sa-border/40 dark:border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider block">Assign Subscription Plan Preset</label>
                    <span className="text-[10px] font-bold text-[#f59e0b]">Auto-configures module licenses</span>
                  </div>
                  <select 
                    name="planId" 
                    value={formData.planId || ""} 
                    onChange={handlePlanSelect}
                    className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] cursor-pointer"
                  >
                    <option value="">Custom Plan</option>
                    {activePlans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.planName} ({plan.employeeLimit} Seats · ₹{plan.priceMonthly || 0}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Total Company Employee Seats</label>
                    <input 
                      type="number" 
                      name="employeeLimit" 
                      min="1" 
                      value={formData.employeeLimit} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b]"
                      placeholder="10" 
                    />
                    <p className="text-[10px] text-sa-text-secondary mt-1">All employees receive attendance &amp; leave access.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Storage Allowance (GB)</label>
                    <input 
                      type="number" 
                      name="storageLimit" 
                      min="1" 
                      value={formData.storageLimit} 
                      onChange={handleChange}
                      className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b]"
                      placeholder="5" 
                    />
                    <p className="text-[10px] text-sa-text-secondary mt-1">Cloud document &amp; asset quota.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Subscription Status</label>
                    <div className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text flex items-center justify-between">
                      <span className="capitalize">{company.status || "active"}</span>
                      <span className={`w-2 h-2 rounded-full ${company.status === "active" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
                    </div>
                    <p className="text-[10px] text-sa-text-secondary mt-1">Managed via Subscriptions.</p>
                  </div>
                </div>
              </div>

              {/* Entitled Suite Modules & Feature Licenses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-sa-border/40 dark:border-white/10 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-sa-text uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={14} className="text-[#f59e0b]" />
                      <span>Entitled Suite Modules &amp; Feature Licenses</span>
                    </h4>
                    <p className="text-[10px] text-sa-text-secondary font-medium mt-0.5">
                      Select enabled modules. Attendance &amp; Leave apply to all total employee seats. Optionally set custom sub-caps for Tasks and Leads.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#f59e0b]">{formData.subscribedModules.length} / {MODULES.length} Selected</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-sa-bg/60 border border-sa-border/40 dark:border-white/10">
                  {MODULES.map((mod) => {
                    const isChecked = formData.subscribedModules.includes(mod);
                    return (
                      <label 
                        key={mod} 
                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked 
                            ? "bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#f59e0b] shadow-2xs" 
                            : "bg-sa-surface border-sa-border/40 dark:border-white/10 text-sa-text-secondary hover:text-sa-text hover:border-sa-border/80"
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          name="subscribedModules"
                          value={mod}
                          checked={isChecked}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked ? "bg-[#f59e0b] border-transparent text-white" : "border-sa-border/60 bg-sa-bg"
                        }`}>
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider truncate">{mod}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Granular Seat Allocation per Module */}
                {formData.subscribedModules.some((m) => ["tasks", "leads", "projects", "attendance", "leave", "payroll", "reports"].includes(m)) && (
                  <div className="bg-sa-bg/40 border border-sa-border/40 dark:border-white/10 rounded-xl p-3.5 space-y-2.5 mt-3">
                    <p className="text-[11px] font-black text-sa-text flex items-center gap-1.5 uppercase tracking-wider">
                      <Users size={13} className="text-[#f59e0b]" />
                      <span>Per-Module Employee Seat Caps (Optional Sub-Quota — 0 = All Seats)</span>
                    </p>
                    <p className="text-[10px] text-sa-text-secondary font-medium -mt-1">
                      Set how many employees can access each module. Leave 0 to allow all company seats.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {MODULE_CAP_ITEMS.filter((m) => formData.subscribedModules.includes(m.key)).map((m) => (
                        <div key={m.key} className="bg-sa-surface p-2.5 rounded-xl border border-sa-border/40 dark:border-white/10">
                          <label
                            className="text-[10px] font-black uppercase tracking-wider block mb-1"
                            style={{ color: m.color }}
                          >
                            {m.label}
                          </label>
                          <input
                            type="number"
                            name={`moduleLimit_${m.key}`}
                            min="0"
                            value={formData.moduleLimits?.[m.key] || 0}
                            onChange={handleChange}
                            placeholder="0 = All Company Seats"
                            className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b]"
                          />
                          <p className="text-[9px] text-sa-text-secondary mt-1">
                            {formData.moduleLimits?.[m.key] > 0
                              ? `Max ${formData.moduleLimits[m.key]} employee seats`
                              : `Max ${formData.employeeLimit} employee seats`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Primary Owner Details */}
          {activeTab === "owner" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Name *</label>
                  <input 
                    type="text" 
                    name="ownerName" 
                    required 
                    value={formData.ownerName} 
                    onChange={handleChange}
                    className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b]"
                    placeholder="Owner Full Name" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Email *</label>
                  <input 
                    type="email" 
                    name="ownerEmail" 
                    required 
                    value={formData.ownerEmail} 
                    onChange={handleChange}
                    className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b]"
                    placeholder="owner@acme.com" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Phone</label>
                  <input 
                    type="text" 
                    name="ownerPhone" 
                    value={formData.ownerPhone} 
                    onChange={handleChange}
                    className="w-full bg-sa-bg border border-sa-border/40 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b]"
                    placeholder="+1 (987) 654-3210" 
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-sa-border/40 dark:border-white/10 bg-sa-bg/80 flex items-center justify-between">
          <div className="text-xs text-sa-text-secondary">
            <span>Company Code: </span>
            <span className="font-mono font-bold text-sa-text">{company.companyCode || company._id?.slice(-6)?.toUpperCase()}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-sa-border/40 dark:border-white/10 bg-sa-surface text-xs font-extrabold text-sa-text hover:bg-sa-border/30 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
            >
              <Save size={14} />
              <span>{mutation.isPending ? "Saving Changes..." : "Save Company Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminEditCompanyModal;
