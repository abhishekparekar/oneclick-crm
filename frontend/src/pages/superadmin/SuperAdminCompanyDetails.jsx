import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { getCompanyByIdApi } from "../../api/superAdminApi";
import StatusBadge from "../../components/common/StatusBadge";
import SuperAdminEditCompanyModal from "../../components/company/SuperAdminEditCompanyModal";
import { 
  Building2, ArrowLeft, Mail, Phone, MapPin, Briefcase, CreditCard, 
  Users, Shield, Server, CheckCircle, Lock, 
  Settings, Key, User, Calendar, Cpu, RefreshCw
} from "lucide-react";

const formatDateSafe = (dateVal, formatStr = "dd MMM yyyy") => {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return format(d, formatStr);
  } catch {
    return "N/A";
  }
};

const SuperAdminCompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
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
  const admins = data?.data?.companyAdmins || (admin ? [admin] : []);
  const totalEmployees = data?.data?.totalEmployees ?? 0;
  const activeEmployeesCount = data?.data?.activeEmployeesCount ?? 0;
  const moduleStats = data?.data?.moduleStats || {};
  const subscription = data?.data?.subscription;
  const payments = data?.data?.payments || [];

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
  ];

  const employeeLimit = company.employeeLimit || 50;
  const employeePercent = employeeLimit > 0 ? Math.min(Math.round((activeEmployeesCount / employeeLimit) * 100), 100) : 0;
  const seatsAvailable = Math.max(0, employeeLimit - activeEmployeesCount);
  const isOverLimit = activeEmployeesCount > employeeLimit;

  return (
    <div className="w-full space-y-3 pb-12">
      {/* Header Profile Banner */}
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
                {company.planName || subscription?.planName || "Pro Plan"}
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
                {company.industryType || 'N/A'}
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
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
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
                      <p className="text-base font-bold text-sa-text mt-0.5">{company.industryType || 'N/A'}</p>
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

            {/* Right Column: Dynamic Resource Utilization & Module Access */}
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
                        {activeEmployeesCount} <span className="text-sa-text-secondary text-sm font-semibold">/ {employeeLimit}</span>
                      </span>
                    </div>
                    <div className="w-full bg-sa-bg rounded-full h-2.5 p-0.5 border border-sa-border">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isOverLimit ? "bg-rose-500" : "bg-gradient-to-r from-sa-primary to-purple-600"
                        }`} 
                        style={{ width: `${employeePercent}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-sa-text-secondary mt-1.5">
                      <span>{employeePercent}% Allocated</span>
                      <span className={isOverLimit ? "text-rose-500 font-extrabold" : ""}>
                        {isOverLimit ? `${activeEmployeesCount - employeeLimit} Over Quota` : `${seatsAvailable} Seats Available`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-sa-border/60 flex items-center justify-between text-xs text-sa-text-secondary">
                    <span>Total Employees Roster:</span>
                    <span className="font-bold text-sa-text">{totalEmployees} Registered ({activeEmployeesCount} Active)</span>
                  </div>
                </div>
              </div>

              {/* Module Access Authorization Card */}
              <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden p-6">
                {(() => {
                  const allSystemModules = [
                    { key: "tasks", label: "Task Management" },
                    { key: "leads", label: "Leads Engine & CRM" },
                    { key: "attendance", label: "Time & Attendance" },
                    { key: "location_tracking", label: "Live GPS Location Tracking" },
                    { key: "projects", label: "Projects Workspace" },
                    { key: "leave", label: "Leave Management" },
                    { key: "payroll", label: "Payroll & Compliance" },
                    { key: "reports", label: "Reports & Analytics" },
                    { key: "whatsapp", label: "WhatsApp Automations" },
                    { key: "mobileApp", label: "Mobile App Access" },
                  ];
                  const subList = Array.isArray(company.subscribedModules) ? company.subscribedModules : [];
                  const activeCount = allSystemModules.filter(m => {
                    const stat = moduleStats[m.key];
                    return stat ? stat.isSubscribed : subList.some(s => s.toLowerCase().trim() === m.key.toLowerCase());
                  }).length;

                  return (
                    <>
                      <h3 className="font-bold text-sa-text text-base pb-3 border-b border-sa-border mb-4 flex items-center justify-between">
                        <span>Module Access Matrix</span>
                        <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg">
                          {activeCount} Active
                        </span>
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {allSystemModules.map((mod) => {
                          const stat = moduleStats[mod.key] || {};
                          const isActive = stat.isSubscribed ?? subList.some(s => s.toLowerCase().trim() === mod.key.toLowerCase());
                          const assignedCount = stat.assignedCount ?? 0;
                          const modLimit = stat.limit ?? employeeLimit;

                          return (
                            <div 
                              key={mod.key} 
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                                isActive
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                                  : "bg-sa-bg border-sa-border text-sa-text-secondary opacity-60"
                              }`}
                            >
                              <span className="flex items-center space-x-2.5 min-w-0 pr-2">
                                {isActive ? (
                                  <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <Lock size={15} className="text-sa-text-secondary flex-shrink-0" />
                                )}
                                <span className="truncate">{mod.label}</span>
                              </span>
                              
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {isActive && (
                                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 whitespace-nowrap">
                                    {assignedCount} / {modLimit} Employees
                                  </span>
                                )}
                                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  isActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-sa-border/60 text-sa-text-secondary"
                                }`}>
                                  {isActive ? "Active" : "Locked"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-sa-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-sa-text">Assigned Company Administrators</h3>
                <p className="text-sm text-sa-text-secondary mt-0.5">Personnel with administrative authority over {company.companyName}.</p>
              </div>
            </div>

            {admins.length > 0 ? (
              <div className="space-y-3">
                {admins.map((adm) => (
                  <div key={adm._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-sa-bg rounded-2xl border border-sa-border shadow-sm gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-sa-primary text-white font-black text-lg flex items-center justify-center shadow-md flex-shrink-0">
                        {adm.name?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <div className="font-black text-sa-text text-base flex items-center space-x-2 flex-wrap gap-y-1">
                          <span>{adm.name}</span>
                          {adm.isPrimaryAdmin && (
                            <span className="px-2 py-0.5 bg-sa-primary/15 text-sa-primary text-[11px] font-extrabold rounded-md uppercase">Primary Admin</span>
                          )}
                          <span className="px-2 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold rounded-md uppercase">
                            {adm.role || 'Admin'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-sa-text-secondary mt-1 flex items-center flex-wrap gap-x-4 gap-y-1">
                          <span className="flex items-center">
                            <Mail size={13} className="mr-1.5 text-sa-primary" /> {adm.email}
                          </span>
                          {adm.phone && (
                            <span className="flex items-center">
                              <Phone size={13} className="mr-1.5 text-emerald-500" /> {adm.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <StatusBadge status={adm.isActive !== false ? 'active' : 'suspended'} />
                    </div>
                  </div>
                ))}
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
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-6 space-y-4">
            <div className="border-b border-sa-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-sa-text">Subscription Plan & Billing Status</h3>
                <p className="text-sm text-sa-text-secondary mt-0.5">Tier quotas, renewal periods, and account entitlements.</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)} 
                className="btn-primary px-4 py-2 text-sm font-bold rounded-xl self-start sm:self-auto cursor-pointer"
              >
                Change Subscription Limits
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sa-bg p-6 rounded-2xl border border-sa-border">
              <div className="space-y-3 md:border-r md:border-sa-border md:pr-6">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 font-black text-xs uppercase tracking-wider border border-purple-500/30">
                  {company.planName || subscription?.planName || 'Standard Plan'}
                </span>
                <h4 className="text-3xl font-black text-sa-text flex items-center space-x-2 capitalize">
                  <span>{company.status || subscription?.status || 'Active'}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${company.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                </h4>
                <p className="text-sm text-sa-text-secondary font-medium flex items-center">
                  <Calendar size={14} className="mr-1.5 text-sa-primary" /> 
                  Billing Cycle: {subscription?.billingCycle ? `${subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} Recurring` : 'Monthly Recurring'}
                </p>
                <p className="text-sm text-sa-text-secondary font-medium flex items-center">
                  <RefreshCw size={14} className="mr-1.5 text-emerald-500" /> 
                  Renewal Date: {formatDateSafe(company.subscriptionEndDate || subscription?.endDate)}
                </p>
                {company.subscriptionStartDate && (
                  <p className="text-xs text-sa-text-secondary font-medium flex items-center">
                    Started: {formatDateSafe(company.subscriptionStartDate || subscription?.startDate)}
                  </p>
                )}
              </div>

              <div className="space-y-3.5 md:col-span-2">
                <p className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Plan Entitlements & Limits</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">Employee License Limit</span>
                    <span className="font-black text-sa-text text-base">{company.employeeLimit || 50} Seats</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-sa-surface border border-sa-border flex justify-between items-center shadow-sm">
                    <span className="text-sm font-bold text-sa-text-secondary">Trial Duration</span>
                    <span className="font-black text-sa-text text-base">{company.trialDays ?? 0} Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-sa-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-sa-text">Payment & Transaction Records</h3>
                <p className="text-sm text-sa-text-secondary mt-0.5">Verified financial invoices and payment history for {company.companyName}.</p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-sa-primary/10 text-sa-primary">
                {payments.length} Records
              </span>
            </div>

            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-sa-border text-sa-text-secondary text-xs uppercase font-extrabold">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sa-border">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-sa-bg/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-sa-text font-mono">
                          {p.invoiceNo || `INV-${p._id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="py-3 px-4 text-sa-text-secondary font-mono text-xs">
                          {p.transactionId || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sa-text font-medium">
                          {formatDateSafe(p.paidAt || p.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-sa-text font-medium">
                          {p.planId?.planName || company.planName || 'Standard'}
                        </td>
                        <td className="py-3 px-4 uppercase text-xs font-extrabold text-sa-text-secondary">
                          {p.paymentMode || 'ONLINE'}
                        </td>
                        <td className="py-3 px-4 font-black text-sa-text">
                          ₹{p.amount?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <StatusBadge status={p.status || 'paid'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center bg-sa-bg/50 rounded-2xl border border-dashed border-sa-border">
                <Server size={36} className="text-sa-text-secondary mx-auto mb-3 opacity-60" />
                <p className="text-sa-text font-bold">No Payment Records Found</p>
                <p className="text-sa-text-secondary text-sm mt-1">No transaction receipts have been registered for this organization yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Company Details Modal */}
      {isEditModalOpen && (
        <SuperAdminEditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            refetch();
          }}
          company={company}
        />
      )}
    </div>
  );
};

export default SuperAdminCompanyDetails;
