import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCompanyByIdApi } from "../../api/superAdminApi";
import StatusBadge from "../../components/common/StatusBadge";
import SuperAdminEditCompanyModal from "../../components/company/SuperAdminEditCompanyModal";
import { 
  Building2, ArrowLeft, Mail, Phone, MapPin, Briefcase, CreditCard, 
  Users, Shield, History, Server, Activity, CheckCircle, Lock, 
  Settings, Key, User, Calendar, HardDrive, Cpu, ExternalLink 
} from "lucide-react";

const SuperAdminCompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminCompanyDetails", id],
    queryFn: () => getCompanyByIdApi(id),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border w-full my-3">
        <div className="animate-spin w-9 h-9 border-4 border-sa-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sa-text-secondary font-bold text-sm">Loading organization profile & telemetry...</p>
      </div>
    );
  }

  const company = data?.data?.company;
  const admin = data?.data?.companyAdmin;

  if (!company) {
    return (
      <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border w-full my-3 p-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} />
        </div>
        <p className="text-sa-danger text-lg font-bold">Organization Not Found</p>
        <p className="text-sa-text-secondary text-sm mt-1 mb-3">The requested company profile record could not be retrieved.</p>
        <button onClick={() => navigate("/superadmin/companies")} className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm">
          Return to Companies Directory
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "admins", label: "Administrators", icon: Shield },
    { id: "subscription", label: "Subscription & Billing", icon: CreditCard },
    { id: "payments", label: "Payment History", icon: Server },
    { id: "users", label: "Assigned Users", icon: Users },
    { id: "logs", label: "Audit Logs", icon: History },
  ];

  const employeeCount = 12;
  const employeeLimit = company.employeeLimit || 50;
  const employeePercent = Math.min(Math.round((employeeCount / employeeLimit) * 100), 100);

  const storageUsed = 1.2;
  const storageLimit = 10;
  const storagePercent = Math.round((storageUsed / storageLimit) * 100);

  return (
    <div className="w-full space-y-3 pb-12">
      {/* Header Profile Banner (Upside square icon box removed for professional clean layout) */}
      <div className="bg-sa-surface p-5 sm:p-6 rounded-2xl border border-sa-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="flex items-start sm:items-center space-x-4">
          <button 
            onClick={() => navigate("/superadmin/companies")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-sa-bg border border-sa-border text-sa-text-secondary hover:bg-sa-primary/15 hover:text-sa-primary hover:border-sa-primary/40 transition-all shadow-sm flex-shrink-0 mt-0.5 sm:mt-0"
            title="Back to Companies List"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-sa-text tracking-tight">{company.companyName}</h1>
              <StatusBadge status={company.status} />
              <span className="px-3 py-0.5 rounded-md text-xs font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                {company.planName || "Pro Plan"}
              </span>
              {company.companyCode && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-sa-bg text-sa-text-secondary border border-sa-border">
                  ID: {company.companyCode}
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-sa-text-secondary font-medium mt-2">
              <span className="flex items-center text-sa-text">
                <MapPin size={14} className="mr-1.5 text-sa-primary" /> 
                {[company.city, company.state].filter(Boolean).join(', ') || 'Headquarters Location N/A'}
              </span>
              <span className="text-sa-border/80 hidden sm:inline">•</span>
              <span className="flex items-center">
                <Briefcase size={14} className="mr-1.5 text-sa-text-secondary" /> 
                {company.industryType || 'Enterprise Services'}
              </span>
              <span className="text-sa-border/80 hidden sm:inline">•</span>
              <span className="flex items-center">
                <Mail size={14} className="mr-1.5 text-sa-text-secondary" /> 
                {company.email || 'No email registered'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3 self-end md:self-center w-full sm:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-sa-border/60">
          <button 
            type="button" 
            onClick={() => alert("Impersonating admin user session...")} 
            className="px-4 py-2.5 rounded-xl border border-sa-border bg-sa-bg text-sa-text text-sm font-bold hover:bg-sa-primary/10 hover:text-sa-primary hover:border-sa-primary/40 transition-all shadow-sm flex items-center space-x-2"
          >
            <Key size={15} className="text-sa-text-secondary" />
            <span>Login as Admin</span>
          </button>
          <button 
            type="button" 
            onClick={() => setIsEditModalOpen(true)} 
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Settings size={15} />
            <span>Edit Company</span>
          </button>
        </div>
      </div>

      {/* Segmented Tabs Bar */}
      <div className="bg-sa-surface p-1.5 rounded-2xl border border-sa-border shadow-sm flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-sa-primary text-white shadow-md' 
                  : 'text-sa-text-secondary hover:text-sa-text hover:bg-sa-bg'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="min-h-[420px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left 2 Columns: Information & Contact */}
            <div className="lg:col-span-2 space-y-3">
              {/* Organization Specifications Card */}
              <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border bg-sa-bg/50 flex items-center justify-between">
                  <h3 className="font-bold text-sa-text text-base flex items-center space-x-2">
                    <Building2 size={18} className="text-sa-primary" />
                    <span>Company Information & Specifications</span>
                  </h3>
                  <span className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Core Metadata</span>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sa-primary/10 text-sa-primary flex items-center justify-center flex-shrink-0">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Company Code</p>
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.companyCode || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Industry Sector</p>
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.industryType || 'Technology / Services'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Registered Email</p>
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Contact Phone</p>
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-start space-x-3.5 pt-2 border-t border-sa-border/60">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Registered Office Address</p>
                      <p className="text-base font-bold text-sa-text mt-0.5 leading-relaxed">
                        {[company.address, company.city, company.state, company.pincode].filter(Boolean).join(', ') || 'Address information pending registration.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner & Primary Contact Card */}
              <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border bg-sa-bg/50 flex items-center justify-between">
                  <h3 className="font-bold text-sa-text text-base flex items-center space-x-2">
                    <User size={18} className="text-sa-primary" />
                    <span>Executive Ownership Details</span>
                  </h3>
                  <span className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Account Stakeholder</span>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-full bg-sa-primary/15 text-sa-primary font-black flex items-center justify-center flex-shrink-0 text-base">
                      {company.ownerName?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Owner Name</p>
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.ownerName || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sa-bg border border-sa-border text-sa-text-secondary flex items-center justify-center flex-shrink-0">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Owner Email</p>
                      <p className="text-sm font-bold text-sa-text mt-0.5 break-all">{company.ownerEmail || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sa-bg border border-sa-border text-sa-text-secondary flex items-center justify-center flex-shrink-0">
                      <Phone size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Owner Phone</p>
                      <p className="text-sm font-bold text-sa-text mt-0.5">{company.ownerPhone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Quick Stats & Module Access */}
            <div className="space-y-3">
              {/* Resource Utilization & Stats Card */}
              <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden p-6">
                <h3 className="font-bold text-sa-text text-base pb-3 border-b border-sa-border mb-5 flex items-center justify-between">
                  <span>Resource Utilization</span>
                  <span className="text-xs font-extrabold text-sa-primary bg-sa-primary/10 px-2.5 py-1 rounded-lg">Live Quota</span>
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-baseline text-sm mb-2">
                      <span className="font-bold text-sa-text flex items-center">
                        <Users size={15} className="mr-2 text-sa-primary" /> Employee Licenses
                      </span>
                      <span className="font-extrabold text-sa-text text-base">
                        {employeeCount} <span className="text-sa-text-secondary text-sm font-semibold">/ {employeeLimit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-sa-bg rounded-full h-2.5 p-0.5 border border-sa-border">
                      <div 
                        className="bg-gradient-to-r from-sa-primary to-purple-600 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${employeePercent}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-sa-text-secondary mt-1.5">
                      <span>{employeePercent}% Allocated</span>
                      <span>{employeeLimit - employeeCount} Seats Available</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-sa-border/60">
                    <div className="flex justify-between items-baseline text-sm mb-2">
                      <span className="font-bold text-sa-text flex items-center">
                        <HardDrive size={15} className="mr-2 text-blue-500" /> Cloud Storage
                      </span>
                      <span className="font-extrabold text-sa-text text-base">
                        {storageUsed} GB <span className="text-sa-text-secondary text-sm font-semibold">/ {storageLimit} GB</span>
                      </span>
                    </div>
                    <div className="w-full bg-sa-bg rounded-full h-2.5 p-0.5 border border-sa-border">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${storagePercent}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-sa-text-secondary mt-1.5">
                      <span>{storagePercent}% Consumed</span>
                      <span>{storageLimit - storageUsed} GB Free</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Access Authorization Card */}
              <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden p-6">
                <h3 className="font-bold text-sa-text text-base pb-3 border-b border-sa-border mb-4 flex items-center justify-between">
                  <span>Module Access Matrix</span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg">4 Active</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {['Core HR & Directory', 'Time & Attendance', 'Payroll & Compliance', 'Leave Management'].map((mod, i) => (
                    <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <span className="flex items-center space-x-2.5">
                        <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>{mod}</span>
                      </span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded">Active</span>
                    </div>
                  ))}
                  {['Recruitment & ATS', 'Performance & OKRs'].map((mod, i) => (
                    <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sa-bg border border-sa-border text-sa-text-secondary font-medium text-sm opacity-70">
                      <span className="flex items-center space-x-2.5">
                        <Lock size={15} className="text-sa-text-secondary flex-shrink-0" />
                        <span>{mod}</span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-sa-border/60 px-2 py-0.5 rounded text-sa-text-secondary">Locked</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-sa-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-sa-text">Assigned Company Administrators</h3>
                <p className="text-sm text-sa-text-secondary mt-0.5">Personnel with full administrative rights over {company.companyName}.</p>
              </div>
              <button onClick={() => alert("Add administrator modal coming soon")} className="btn-primary px-4 py-2 text-sm font-bold rounded-xl">
                + Add Administrator
              </button>
            </div>
            {admin ? (
              <div className="flex items-center justify-between p-5 bg-sa-bg rounded-2xl border border-sa-border shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-sa-primary text-white font-black text-lg flex items-center justify-center shadow-md">
                    {admin.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-black text-sa-text text-base flex items-center space-x-2">
                      <span>{admin.name}</span>
                      <span className="px-2 py-0.5 bg-sa-primary/15 text-sa-primary text-[11px] font-extrabold rounded-md uppercase">Primary Admin</span>
                    </p>
                    <p className="text-sm font-medium text-sa-text-secondary mt-0.5 flex items-center">
                      <Mail size={13} className="mr-1.5" /> {admin.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={admin.isActive ? 'active' : 'suspended'} />
                  <button onClick={() => alert("Impersonating...")} className="px-3.5 py-2 rounded-xl bg-sa-surface border border-sa-border hover:bg-sa-primary/10 text-sa-text text-xs font-bold transition-all shadow-sm">
                    Impersonate
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-sa-bg/50 rounded-2xl border border-dashed border-sa-border">
                <Shield size={36} className="text-sa-text-secondary mx-auto mb-3 opacity-60" />
                <p className="text-sa-text font-bold">No Administrator Account Associated</p>
                <p className="text-sa-text-secondary text-sm mt-1">Assign an executive email to create the first administrative login.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-6 space-y-3">
            <div className="border-b border-sa-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-sa-text">Subscription Plan & Billing Status</h3>
                <p className="text-sm text-sa-text-secondary mt-0.5">Manage tier quotas, renewal dates, and payment terms.</p>
              </div>
              <button onClick={() => alert("Upgrade subscription modal coming soon")} className="btn-primary px-4 py-2 text-sm font-bold rounded-xl self-start sm:self-auto">
                Upgrade or Change Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-sa-bg p-6 rounded-2xl border border-sa-border">
              <div className="space-y-3 md:border-r md:border-sa-border md:pr-6">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-black text-xs uppercase tracking-wider border border-purple-500/30">
                  {company.planName || 'Enterprise Pro'}
                </span>
                <h4 className="text-3xl font-black text-sa-text flex items-center space-x-2">
                  <span>Active</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </h4>
                <p className="text-sm text-sa-text-secondary font-medium flex items-center">
                  <Calendar size={14} className="mr-1.5" /> Billing Cycle: Monthly Recurring
                </p>
                <p className="text-sm text-sa-text-secondary font-medium flex items-center">
                  <History size={14} className="mr-1.5" /> Next Invoice: 01 Jul 2026
                </p>
              </div>

              <div className="space-y-3.5 md:col-span-2">
                <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Plan Entitlements & Limits</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">Employee User Limit</span>
                    <span className="font-black text-sa-text text-base">{company.employeeLimit || 50} Seats</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">Storage Quota</span>
                    <span className="font-black text-sa-text text-base">10 GB SSD</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">API & Webhooks</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">Enabled</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">24/7 Priority Support</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {['payments', 'users', 'logs'].includes(activeTab) && (
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-20 text-center">
            <div className="w-16 h-16 bg-sa-bg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sa-border shadow-sm">
              <Activity size={28} className="text-sa-primary" />
            </div>
            <h3 className="text-xl font-bold text-sa-text mb-2 capitalize">{activeTab === 'logs' ? 'System Audit Logs' : `${activeTab} Directory`}</h3>
            <p className="text-sa-text-secondary text-sm max-w-md mx-auto leading-relaxed">
              Real-time telemetry and detailed {activeTab} queries for <span className="font-bold text-sa-text">{company.companyName}</span> will be synchronized right here.
            </p>
          </div>
        )}
      </div>

      {/* Edit Company Details Modal */}
      {isEditModalOpen && (
        <SuperAdminEditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          company={company}
        />
      )}
    </div>
  );
};

export default SuperAdminCompanyDetails;
