import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCompanyApi, getPlansApi } from "../../api/superAdminApi";
import {
  Building2, Save, ArrowLeft, Mail, Copy, CheckCircle2,
  User, Key, Shield, CreditCard, Sparkles, Check,
  Users, Globe, MapPin, Phone, Briefcase, Cpu, HardDrive, Clock
} from "lucide-react";

const MODULES = [
  "attendance", "leave", "payroll", "tasks", "projects", 
  "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin", "leads", "location_tracking"
];

const MODULE_CAP_ITEMS = [
  { key: "attendance", label: "Attendance & Bio-Punch", color: "#10b981" },
  { key: "leave",      label: "Leave Management",       color: "#06B6D4" },
  { key: "payroll",    label: "Payroll & Salary",       color: "#8b5cf6" },
  { key: "tasks",      label: "Tasks Module",            color: "#f59e0b" },
  { key: "leads",      label: "Leads Engine & CRM",      color: "#f59e0b" },
  { key: "projects",   label: "Projects Workspace",      color: "#06B6D4" },
  { key: "reports",    label: "Analytics & Reports",     color: "#3B82F6" },
  { key: "location_tracking", label: "Field GPS Location Tracking", color: "#ec4899" },
];

/* ─── Shared Section Header ─────────────────────────────────────────────── */
const SectionHeader = ({ title, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"] }) => (
  <div className="flex items-center space-x-3 mb-5 pb-3.5 border-b border-sa-border/30">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
      <Icon size={15} className="text-white" />
    </div>
    <div>
      <h3 className="text-sm font-extrabold text-sa-text tracking-tight">{title}</h3>
      {subtitle && <p className="text-[11px] text-sa-text-secondary mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const SuperAdminAddCompany = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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
    employeeLimit: 10,
    storageLimit: 5,
    trialDays: 7,
    subscribedModules: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "mobileApp", "webAdmin", "leads"],
    moduleLimits: {
      attendance: 0,
      leave: 0,
      payroll: 0,
      tasks: 0,
      leads: 0,
      projects: 0,
      reports: 0,
    },
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["superAdminPlans"],
    queryFn: getPlansApi,
  });

  const activePlans = useMemo(() => {
    return (plansData?.data?.plans || []).filter(p => p.status === "active" || !p.status);
  }, [plansData]);

  useEffect(() => {
    if (activePlans.length > 0 && !formData.planId) {
      const first = activePlans[0];
      setFormData(prev => ({
        ...prev,
        planId: first._id,
        planName: first.planName,
        employeeLimit: first.employeeLimit || prev.employeeLimit || 10,
        storageLimit: first.storageLimit || prev.storageLimit || 5,
        trialDays: first.trialDays || prev.trialDays || 7,
        subscribedModules: (Array.isArray(first.modules) && first.modules.length > 0)
          ? first.modules
          : prev.subscribedModules,
        moduleLimits: first.moduleLimits || prev.moduleLimits || {},
      }));
    }
  }, [activePlans]);

  const handlePlanSelect = (e) => {
    const selectedId = e.target.value;
    const plan = activePlans.find(p => p._id === selectedId);
    if (plan) {
      setFormData(prev => ({
        ...prev,
        planId: plan._id,
        planName: plan.planName,
        employeeLimit: plan.employeeLimit || prev.employeeLimit || 10,
        storageLimit: plan.storageLimit || prev.storageLimit || 5,
        trialDays: plan.trialDays || prev.trialDays || 7,
        subscribedModules: (Array.isArray(plan.modules) && plan.modules.length > 0)
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

  const [successData, setSuccessData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-8) + "Aa1@";
    setFormData(prev => ({ ...prev, adminPassword: pwd }));
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
        [name]: (name === "employeeLimit" || name === "storageLimit" || name === "trialDays")
          ? Number(value) || 0
          : value
      }));
    }
  };

  const mutation = useMutation({
    mutationFn: createCompanyApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["superAdminCompanies"]);
      setSuccessData(data.data.adminLogin);
    },
    onError: (error) => {
      alert(error.response?.data?.message || "Failed to create company tenant.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalPayload = {
      ...formData,
      industryType: isCustomIndustry ? (customIndustryText.trim() || "Other") : formData.industryType
    };
    mutation.mutate(finalPayload);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /* ─── Success Provisioning Screen ─────────────────────────────────────── */
  if (successData) {
    return (
      <div className="w-full py-4">
        <div className="bg-sa-surface rounded-2xl p-8 border border-sa-border/30 dark:border-white/10 shadow-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm bg-gradient-to-br from-sa-primary-hover to-sa-primary">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-sa-text tracking-tight mb-2">Tenant Provisioned Successfully!</h2>
          <p className="text-xs text-sa-text-secondary leading-relaxed max-w-md mx-auto mb-4">
            The enterprise tenant space and primary administrator credentials have been securely provisioned. Share these temporary credentials with the tenant admin.
          </p>
          
          <div className="bg-sa-bg/60 rounded-xl p-5 border border-sa-border/30 dark:border-white/5 text-left space-y-4 mb-4">
            <div>
              <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1.5">Portal Login URL</p>
              <div className="flex items-center justify-between bg-sa-surface px-3.5 py-2.5 border border-sa-border/30 dark:border-white/10 rounded-xl shadow-xs">
                <span className="text-xs font-bold text-sa-text truncate pr-2">{window.location.origin}/login</span>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(`${window.location.origin}/login`, "url")}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition-all bg-sa-primary/10 text-sa-primary hover:bg-sa-primary/20 flex-shrink-0 cursor-pointer"
                >
                  {copiedField === "url" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedField === "url" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1.5">Admin Email Address</p>
              <div className="flex items-center justify-between bg-sa-surface px-3.5 py-2.5 border border-sa-border/30 dark:border-white/10 rounded-xl shadow-xs">
                <span className="text-xs font-bold text-sa-text truncate pr-2">{successData.email}</span>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(successData.email, "email")}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition-all bg-sa-primary/10 text-sa-primary hover:bg-sa-primary/20 flex-shrink-0 cursor-pointer"
                >
                  {copiedField === "email" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedField === "email" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1.5">Temporary Password</p>
              <div className="flex items-center justify-between bg-sa-surface px-3.5 py-2.5 border border-sa-border/30 dark:border-white/10 rounded-xl shadow-xs">
                <span className="text-xs font-mono font-bold text-sa-text truncate pr-2">{successData.temporaryPassword}</span>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(successData.temporaryPassword, "pwd")}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition-all bg-sa-primary/10 text-sa-primary hover:bg-sa-primary/20 flex-shrink-0 cursor-pointer"
                >
                  {copiedField === "pwd" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedField === "pwd" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  companyName: "", ownerName: "", ownerEmail: "", ownerPhone: "",
                  email: "", phone: "", address: "", city: "", state: "", pincode: "",
                  industryType: "Technology", planName: "Trial", employeeLimit: 50,
                  adminName: "", adminEmail: "", adminPhone: "", adminPassword: "",
                });
              }}
              className="px-5 py-2.5 rounded-xl border border-sa-border/30 dark:border-white/10 bg-sa-bg text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all cursor-pointer"
            >
              Onboard Another Tenant
            </button>
            <button
              type="button"
              onClick={() => navigate("/superadmin/companies")}
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm transition-all hover:opacity-90 bg-gradient-to-br from-sa-primary-hover to-sa-primary cursor-pointer"
            >
              Return to Companies Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main Onboarding Form ───────────────────────────────────────────── */
  return (
    <div className="w-full pb-12 space-y-3 sm:space-y-3.5">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2.5 border-b border-sa-border/30 dark:border-white/10">
        <div className="flex items-center space-x-3.5">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-sa-surface border border-sa-border/30 dark:border-white/10 text-sa-text-secondary hover:text-sa-text hover:bg-sa-bg transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-sa-text tracking-tight">Add New Tenant Company</h1>
            <p className="text-xs text-sa-text-secondary mt-0.5">Onboard a new enterprise tenant, configure subscription limits, and provision primary admin credentials.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl border border-sa-border/30 dark:border-white/10 bg-sa-surface text-xs font-extrabold text-sa-text hover:bg-sa-bg transition-all cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-br from-sa-primary-hover to-sa-primary cursor-pointer"
          >
            <Save size={14} />
            <span>{mutation.isPending ? "Provisioning..." : "Create Tenant Company"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start">
        {/* Left Column: Tenant Details, Owner Contact & Admin Setup (8 Cols) */}
        <div className="lg:col-span-8 space-y-3 sm:space-y-3.5">
          
          {/* Card 1: Company Profile */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm">
            <SectionHeader title="Tenant Profile & Organization Details" subtitle="Basic organizational profile and official business headquarters" icon={Building2} grad={["var(--color-sa-primary-hover)", "var(--color-sa-primary)"]} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Company Name *</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                  <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="e.g. Acme Corporation Pvt Ltd" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Official Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                  <input type="email" name="email" required value={formData.email} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="contact@acmecorp.com" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Official Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="+1 (234) 567-8900" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider block">Industry Classification *</label>
                  {isCustomIndustry && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomIndustry(false);
                        setFormData(prev => ({ ...prev, industryType: "Technology" }));
                      }}
                      className="text-[10.5px] font-bold text-sa-primary hover:underline cursor-pointer"
                    >
                      Choose from presets
                    </button>
                  )}
                </div>
                <div className="space-y-2">
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
                      className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all cursor-pointer"
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
                      <option value="Other">+ Add Custom Industry Classification</option>
                    </select>
                  </div>

                  {isCustomIndustry && (
                    <div className="space-y-1 animate-fadeIn">
                      <input
                        type="text"
                        required
                        value={customIndustryText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomIndustryText(val);
                          setFormData(prev => ({ ...prev, industryType: val }));
                        }}
                        placeholder="Enter custom Industry (e.g., Solar & Renewable Energy)"
                        className="w-full bg-sa-bg/80 border-2 border-sa-primary/50 dark:border-sa-primary/60 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/30 transition-all shadow-2xs"
                        autoFocus
                      />
                      <p className="text-[10px] text-sa-primary font-bold">
                        ✨ Custom classification will be saved directly for this company.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 pt-1">
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Headquarters Street Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="123 Enterprise Parkway, Suite 400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <div>
                  <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="New York" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">State / Region</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="NY" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-widest mb-1 block">Pincode / ZIP</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="10001" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Primary Owner Details */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm">
            <SectionHeader title="Primary Tenant Owner Contact" subtitle="Authorized executive signing and ownership authority for the account" icon={User} grad={["var(--color-sa-primary)", "var(--color-sa-accent)"]} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Name *</label>
                <input type="text" name="ownerName" required value={formData.ownerName} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="Jane Smith" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Email *</label>
                <input type="email" name="ownerEmail" required value={formData.ownerEmail} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="jane.smith@acmecorp.com" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Owner Phone</label>
                <input type="text" name="ownerPhone" value={formData.ownerPhone} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="+1 (987) 654-3210" />
              </div>
            </div>
          </div>

          {/* Card 3: Company Admin Provisioning */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm">
            <SectionHeader title="Initial Company Administrator Access" subtitle="Configure initial admin credentials to manage HR & employee operations" icon={Shield} grad={["var(--color-sa-secondary)", "var(--color-sa-primary)"]} />
            
            <div className="p-3.5 rounded-xl border border-sa-primary/20 dark:border-sa-primary/30 bg-sa-primary/5 flex items-center space-x-3 mb-5">
              <Sparkles size={16} className="text-sa-primary flex-shrink-0" />
              <p className="text-[11px] font-semibold text-sa-text">
                <span className="font-extrabold text-sa-primary">Smart Default: </span> 
                Leave these fields blank to automatically use the Owner details above as the initial Company Admin account.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Admin Full Name</label>
                <input type="text" name="adminName" value={formData.adminName} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="Leave blank to use Owner Name" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Admin Login Email</label>
                <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="Leave blank to use Owner Email" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Admin Phone</label>
                <input type="text" name="adminPhone" value={formData.adminPhone} onChange={handleChange}
                  className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="Leave blank to use Owner Phone" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Initial Password</label>
                <div className="flex space-x-2">
                  <input type="text" name="adminPassword" value={formData.adminPassword} onChange={handleChange}
                    className="flex-1 bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                    placeholder="Auto-generated if left empty" />
                  <button 
                    type="button" 
                    onClick={generatePassword} 
                    className="px-3.5 py-2 rounded-xl text-[11px] font-extrabold text-white transition-all shadow-xs flex-shrink-0 hover:opacity-90 bg-gradient-to-br from-sa-secondary to-sa-accent cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <label className="flex items-center space-x-3 p-3.5 rounded-xl border border-sa-border/30 dark:border-white/10 bg-sa-bg/40 cursor-pointer hover:border-sa-primary/40 transition-all">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-sa-primary focus:ring-sa-primary border-sa-border/30 dark:border-white/10 cursor-pointer bg-sa-bg/40" />
                  <div>
                    <span className="text-xs font-bold text-sa-text flex items-center gap-1.5">
                      <Mail size={14} className="text-sa-primary" />
                      <span>Send Automated Welcome Email with Access Credentials</span>
                    </span>
                    <p className="text-[10px] text-sa-text-secondary mt-0.5">Will immediately dispatch temporary portal login details to the administrator's email upon creation.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Card 4: Subscription Plan, Entitled Modules & Granular Seat Allocation */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm space-y-6">
            <SectionHeader 
              title="Subscription Tier & Suite Module Licensing" 
              subtitle="Configure enterprise feature entitlements, storage allowance, and per-module employee seat caps" 
              icon={CreditCard} 
              grad={["#d97706", "#f59e0b"]} 
            />

            {/* Plan Selector & 3-Column Base Limits */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider block">Assign Subscription Plan Preset</label>
                  <Link to="/superadmin/plans" className="text-[10px] font-bold text-[#f59e0b] hover:underline">
                    Manage Tier Presets →
                  </Link>
                </div>
                {plansLoading ? (
                  <div className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-sa-text-secondary animate-pulse font-medium">
                    Loading subscription plans...
                  </div>
                ) : activePlans.length > 0 ? (
                  <select 
                    name="planId" 
                    value={formData.planId || ""} 
                    onChange={handlePlanSelect}
                    className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-all cursor-pointer"
                  >
                    {activePlans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.planName} ({plan.employeeLimit} Seats · ₹{plan.priceMonthly || 0}/mo)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold space-y-1.5">
                    <p>No created subscription plans found.</p>
                    <Link to="/superadmin/plans" className="inline-block text-[11px] font-extrabold text-[#f59e0b] underline">
                      + Create a Plan in Plans Module
                    </Link>
                  </div>
                )}
              </div>

              {/* 3-Column Inputs: Total Seats, Storage, Trial Days */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Total Company Employee Seats</label>
                  </div>
                  <input 
                    type="number" 
                    name="employeeLimit" 
                    min="1" 
                    value={formData.employeeLimit} 
                    onChange={handleChange}
                    className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
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
                    className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                    placeholder="5" 
                  />
                  <p className="text-[10px] text-sa-text-secondary mt-1">Cloud document &amp; asset storage quota.</p>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Free Trial Duration (Days)</label>
                  <input 
                    type="number" 
                    name="trialDays" 
                    min="0" 
                    value={formData.trialDays} 
                    onChange={handleChange}
                    className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all"
                    placeholder="7" 
                  />
                  <p className="text-[10px] text-sa-text-secondary mt-1">Initial trial window duration.</p>
                </div>
              </div>
            </div>

            {/* Section: Entitled Suite Modules & Feature Licenses */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-sa-border/30 dark:border-white/10 pb-2">
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-sa-bg/60 border border-sa-border/30 dark:border-white/10">
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
              {formData.subscribedModules.some((m) => ["tasks", "leads", "projects", "attendance", "leave", "payroll", "reports", "location_tracking"].includes(m)) && (
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
        </div>

        {/* Right Sidebar: Sticky Provisioning Summary (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 sm:space-y-3.5">
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm sticky top-6">
            <h4 className="text-xs font-black text-sa-text uppercase tracking-wider mb-3.5 flex items-center justify-between">
              <span>Provisioning Summary</span>
              <span className="w-2 h-2 rounded-full bg-sa-accent animate-pulse" />
            </h4>

            <div className="space-y-3 pt-1 border-t border-sa-border/30 dark:border-white/10 text-xs">
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Tenant Name:</span>
                <span className="font-extrabold text-sa-text truncate max-w-[170px]">{formData.companyName || "Not entered"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Primary Contact:</span>
                <span className="font-extrabold text-sa-text truncate max-w-[170px]">{formData.ownerEmail || "Not entered"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Assigned Tier:</span>
                <span className="font-extrabold px-2 py-0.5 rounded-md bg-[#f59e0b]/15 text-[#f59e0b] text-[10px]">{formData.planName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Seat Quota:</span>
                <span className="font-black text-sa-text">{formData.employeeLimit} Seats</span>
              </div>
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Storage Quota:</span>
                <span className="font-black text-sa-text">{formData.storageLimit} GB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-sa-border/60 dark:border-white/5">
                <span className="text-sa-text-secondary font-semibold">Trial Duration:</span>
                <span className="font-black text-sa-text">{formData.trialDays} Days</span>
              </div>
              <div className="py-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sa-text-secondary font-semibold">Enabled Modules:</span>
                  <span className="font-bold text-[#f59e0b]">{formData.subscribedModules.length} Active</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.subscribedModules.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded bg-sa-bg text-[9.5px] font-extrabold uppercase text-sa-text-secondary border border-sa-border/40">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-4 border-t border-sa-border/30 dark:border-white/10 space-y-2.5">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              >
                <Save size={15} />
                <span>{mutation.isPending ? "Provisioning Tenant..." : "Create & Provision Tenant"}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-2.5 rounded-xl border border-sa-border/30 dark:border-white/10 bg-sa-bg text-xs font-extrabold text-sa-text-secondary hover:text-sa-text hover:bg-sa-border/40 transition-all text-center block cursor-pointer"
              >
                Cancel & Return
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default SuperAdminAddCompany;
