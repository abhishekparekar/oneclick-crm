import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCompanyApi } from "../../api/superAdminApi";
import {
  Building2, Save, ArrowLeft, Mail, Copy, CheckCircle2,
  User, Key, Shield, CreditCard, Sparkles, Check,
  Users, Globe, MapPin, Phone, Briefcase
} from "lucide-react";

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
    planName: "Trial",
    employeeLimit: 50,
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });

  const [successData, setSuccessData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-8) + "Aa1@";
    setFormData(prev => ({ ...prev, adminPassword: pwd }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === "employeeLimit" ? Number(value) || 0 : value }));
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
    mutation.mutate(formData);
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
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Industry Classification</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none" />
                  <select name="industryType" value={formData.industryType} onChange={handleChange}
                    className="w-full bg-sa-bg/60 border border-sa-border/30 dark:border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all cursor-pointer">
                    <option value="Technology">Technology & Software</option>
                    <option value="Finance">Banking & Finance</option>
                    <option value="Healthcare">Healthcare & Life Sciences</option>
                    <option value="Retail">Retail & E-Commerce</option>
                    <option value="Manufacturing">Manufacturing & Logistics</option>
                    <option value="Other">Other Industry</option>
                  </select>
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
        </div>

        {/* Right Sidebar: Subscription Quota & Live Summary (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 sm:space-y-3.5">
          
          {/* Card 4: Plan & Quota Configuration */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border/30 dark:border-white/10 p-6 shadow-sm">
            <SectionHeader title="Subscription Plan & Limits" subtitle="Assign initial subscription tiers and employee capacity boundaries" icon={CreditCard} grad={["var(--color-sa-primary)", "var(--color-sa-accent)"]} />
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1.5 block">Assign Subscription Plan</label>
                <select name="planName" value={formData.planName} onChange={handleChange}
                  className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all cursor-pointer">
                  <option value="Trial">Free Trial (14 Days)</option>
                  <option value="Starter">Starter Tier</option>
                  <option value="Professional">Professional Tier</option>
                  <option value="Enterprise">Enterprise Unlimited Tier</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Employee Quota Limit</label>
                  <span className="text-xs font-black text-sa-primary">{formData.employeeLimit} Seats</span>
                </div>
                <input type="number" name="employeeLimit" min="1" value={formData.employeeLimit} onChange={handleChange}
                  className="w-full bg-sa-bg border border-sa-border/30 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-sa-primary focus:ring-1 focus:ring-sa-primary/20 transition-all"
                  placeholder="50" />
                
                {/* Quick select pills */}
                <div className="flex items-center space-x-1.5 mt-2.5">
                  {[25, 50, 100, 250, 500].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, employeeLimit: num }))}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                        formData.employeeLimit === num 
                          ? "text-white border-transparent bg-gradient-to-br from-sa-primary-hover to-sa-primary" 
                          : "text-sa-text-secondary border-sa-border/30 dark:border-white/10 bg-sa-bg hover:text-sa-text hover:border-sa-primary/50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Provisioning Summary Card */}
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
                <span className="font-extrabold px-2 py-0.5 rounded-md bg-sa-primary/15 text-sa-primary text-[10px]">{formData.planName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sa-text-secondary font-semibold">Seat Quota:</span>
                <span className="font-black text-sa-text">{formData.employeeLimit} Employees</span>
              </div>
            </div>

            <div className="mt-3 pt-4 border-t border-sa-border/30 dark:border-white/10 space-y-2.5">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer bg-gradient-to-br from-sa-primary-hover to-sa-primary"
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
