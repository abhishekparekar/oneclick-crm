import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getCompanyAdminsApi, getCompaniesApi, createCompanyAdminApi, 
  makePrimaryAdminApi, deleteCompanyAdminApi, updateUserStatusApi, 
  resetUserPasswordApi 
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import SaSelect from "../../components/common/SaSelect";
import toast from "react-hot-toast";
import { 
  Search, Plus, MoreVertical, Key, CheckCircle, Ban, Star, 
  Trash2, Shield, Building2, Mail, Phone, Clock, UserCheck, ExternalLink, User, Download, ArrowUp, ArrowDown, ShieldAlert
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/* ─── Compact KPI Card Component (Matching Company Admin & Dashboard) ────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SuperAdminCompanyAdmins = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [formData, setFormData] = useState({
    companyId: "",
    name: "",
    email: "",
    phone: "",
    isPrimaryAdmin: false
  });

  const { data: adminsData, isLoading } = useQuery({ 
    queryKey: ["superAdminCompanyAdmins"], 
    queryFn: () => getCompanyAdminsApi() 
  });
  const { data: companiesData } = useQuery({ 
    queryKey: ["superAdminCompanies"], 
    queryFn: () => getCompaniesApi() 
  });

  const admins = Array.isArray(adminsData?.data)
    ? adminsData?.data
    : (adminsData?.data?.admins || adminsData?.data?.data || []);
  const companies = Array.isArray(companiesData?.data)
    ? companiesData?.data
    : (companiesData?.data?.companies || companiesData?.data?.data || []);

  const filteredAdmins = admins.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.companyId?.companyName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" ? (a.isActive === true || a.isActive === "active" || a.status === "active") : (a.isActive === false || a.isActive === "inactive" || !a.isActive || a.status !== "active"));
    const adminCompId = a.companyId?._id || a.companyId?.id || a.companyId;
    const matchesCompany = companyFilter === "all" || 
                           String(adminCompId) === String(companyFilter) ||
                           (a.companyId?.companyName && String(a.companyId.companyName).toLowerCase() === String(companyFilter).toLowerCase());
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const activeAdminsCount = admins.filter(a => a.isActive === true || a.isActive === "active" || a.status === "active").length;
  const primaryAdminsCount = admins.filter(a => a.isPrimaryAdmin).length;

  const createMutation = useMutation({
    mutationFn: createCompanyAdminApi,
    onSuccess: (res) => {
      queryClient.invalidateQueries(["superAdminCompanyAdmins"]);
      setIsModalOpen(false);
      setFormData({ companyId: "", name: "", email: "", phone: "", isPrimaryAdmin: false });
      toast.success("Administrator account created!");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create administrator account")
  });

  const makePrimaryMutation = useMutation({
    mutationFn: makePrimaryAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminCompanyAdmins"]);
      setActiveMenu(null);
      toast.success("Updated primary admin!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompanyAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminCompanyAdmins"]);
      setActiveMenu(null);
      toast.success("Admin deleted");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete administrator")
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateUserStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["superAdminCompanyAdmins"]);
      setActiveMenu(null);
      toast.success("Status updated");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPasswordApi,
    onSuccess: (data) => {
      setActiveMenu(null);
      toast.success(`Password reset link sent to ${data.data.email}!`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to reset password")
  });

  const handleStatusChange = (id, isActive) => {
    statusMutation.mutate({ id, status: isActive ? "inactive" : "active" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const columns = [
    {
      header: "Administrator Details",
      accessor: "admin",
      render: (row) => (
        <div className="flex items-center space-x-3.5 py-1">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            {row.name?.charAt(0) || "A"}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs">{row.name}</span>
              {row.isPrimaryAdmin && (
                <span className="px-2 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[9.5px] font-black uppercase tracking-wider flex items-center space-x-1">
                  <Star size={9} className="fill-amber-500" />
                  <span>Primary</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center">
              <Mail size={11} className="mr-1.5 flex-shrink-0 opacity-75" />
              <span className="truncate max-w-[220px]">{row.email}</span>
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Assigned Organization",
      accessor: "company",
      render: (row) => (
        <div className="py-1">
          <div className="flex items-center space-x-1.5">
            <Building2 size={13} className="text-amber-500 flex-shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{row.companyId?.companyName || "Organization N/A"}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center">
            <Phone size={11} className="mr-1.5 flex-shrink-0 opacity-75" />
            <span>{row.phone || "No phone recorded"}</span>
          </p>
        </div>
      )
    },
    {
      header: "Account Status",
      accessor: "status",
      render: (row) => {
        const isAct = row.isActive === true || row.isActive === "active" || row.status === "active";
        return (
          <span className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide border shadow-2xs ${
            isAct
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="capitalize">{isAct ? "Active" : "Suspended"}</span>
          </span>
        );
      }
    },
    {
      header: "Last Active Session",
      accessor: "lastLoginAt",
      render: (row) => (
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center">
          <Clock size={12} className="mr-1.5 flex-shrink-0 opacity-75" />
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString() : 'Never Logged In'}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => {
        const isOpen = activeMenu?.id === row._id;
        return (
          <div className="text-right select-none">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) {
                  setActiveMenu(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const openUpward = window.innerHeight - rect.bottom < 260;
                  setActiveMenu({
                    id: row._id,
                    x: window.innerWidth - rect.right,
                    y: openUpward ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
                    openUpward,
                    row
                  });
                }
              }}
              className={`p-1.5 rounded-lg border transition-all ${
                isOpen 
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs" 
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-slate-200/80 dark:border-slate-700"
              }`}
              title="Manage Administrator"
            >
              <MoreVertical size={15} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4 w-full pb-10 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Company Administrators</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage tenant executive permissions, credentials, and access across all organizations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Administrator</span>
        </button>
      </div>

      {/* Row 1: KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KPICard label="Total Admins"    value={admins.length}       trend="12.4%" isUp period="last month" strokeColor="#06B6D4" Icon={Shield}     iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="Active Admins"   value={activeAdminsCount}   trend="18.2%" isUp period="last month" strokeColor="#10B981" Icon={UserCheck}  iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Primary Admins"  value={primaryAdminsCount}  trend="100%"  isUp period="assigned"   strokeColor="#EAB308" Icon={Star}       iconBg="bg-amber-500/10"   iconColor="#D97706"/>
        <KPICard label="Organizations"   value={companies.length}    trend="9.3%"  isUp period="active"     strokeColor="#8B5CF6" Icon={Building2}  iconBg="bg-purple-500/10"  iconColor="#7C3AED"/>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search administrator name, email, or organization..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <SaSelect
            value={companyFilter}
            onChange={setCompanyFilter}
            options={[
              { label: `All Organizations (${companies.length})`, value: "all" },
              ...companies.map(c => ({ label: c.companyName, value: c._id }))
            ]}
            buttonClassName="!py-2 !px-3 !rounded-lg !bg-slate-50/70 dark:!bg-slate-900/60 min-w-[190px] !text-xs !border-slate-200/80 dark:!border-slate-800"
          />
          <SaSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All Status", value: "all" },
              { label: "Active Admins", value: "active" },
              { label: "Suspended Admins", value: "inactive" }
            ]}
            buttonClassName="!py-2 !px-3 !rounded-lg !bg-slate-50/70 dark:!bg-slate-900/60 min-w-[140px] !text-xs !border-slate-200/80 dark:!border-slate-800"
          />
        </div>
      </div>

      {/* Data Table Section */}
      {isLoading ? (
        <div className="py-24 text-center bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Loading administrator directory &amp; permissions...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          <DataTable columns={columns} data={filteredAdmins} pagination={{ total: filteredAdmins.length }} />
        </div>
      )}

      {/* Action Dropdown Menu Portal */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setActiveMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveMenu(null); }}
        />
      )}
      {activeMenu && (
        <div 
          style={{
            position: "fixed",
            right: `${activeMenu.x}px`,
            ...(activeMenu.openUpward 
              ? { bottom: `${activeMenu.y}px` } 
              : { top: `${activeMenu.y}px` }),
            zIndex: 9999
          }}
          className="w-52 bg-white dark:bg-[#1E293B] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <div className="py-1.5 px-1">
            {!activeMenu.row.isPrimaryAdmin && (
              <button 
                onClick={() => { 
                  if (window.confirm(`Promote ${activeMenu.row.name} to Primary Administrator for ${activeMenu.row.companyId?.companyName || 'this company'}?`)) {
                    makePrimaryMutation.mutate(activeMenu.row._id);
                  }
                }} 
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Star size={14} /> <span>Make Primary Admin</span>
              </button>
            )}
            <button 
              onClick={() => { const { row } = activeMenu; setActiveMenu(null); toast(`Impersonating session for ${row.name}...`); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <UserCheck size={14} className="text-slate-400" /> <span>Impersonate Session</span>
            </button>
          </div>

          <div className="py-1.5 px-1 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => { const { row } = activeMenu; setActiveMenu(null); handleStatusChange(row._id, row.isActive); }} 
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeMenu.row.isActive ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {activeMenu.row.isActive ? <><Ban size={14} /> <span>Suspend Access</span></> : <><CheckCircle size={14} /> <span>Activate Access</span></>}
            </button>
            <button 
              onClick={() => { 
                if (window.confirm(`Send password reset link / generate temporary password for ${activeMenu.row.email}?`)) {
                  resetPasswordMutation.mutate(activeMenu.row._id);
                }
              }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Key size={14} className="text-slate-400" /> <span>Reset Password</span>
            </button>
          </div>

          <div className="py-1.5 px-1 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => { 
                if (window.confirm(`Are you sure you want to permanently delete administrator account for "${activeMenu.row.name}"?`)) {
                  deleteMutation.mutate(activeMenu.row._id);
                }
              }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={14} /> <span>Delete Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Shield size={16} />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Company Administrator</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Assign to Organization</label>
                <SaSelect
                  value={formData.companyId}
                  onChange={val => setFormData({ ...formData, companyId: val })}
                  placeholder="Select target organization..."
                  options={companies.map(c => ({ label: c.companyName, value: c._id }))}
                  buttonClassName="!py-2 !px-3.5 !rounded-xl !bg-slate-50/70 dark:!bg-slate-900/60 !text-xs !border-slate-200/80 dark:!border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Executive Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all" 
                  placeholder="e.g. Rameshwar Chate" 
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Work Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all" 
                  placeholder="e.g. rameshwar@company.com" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone Number</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="w-full bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all" 
                  placeholder="e.g. +91 98765 43210" 
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors select-none">
                  <input 
                    type="checkbox" 
                    id="isPrimary" 
                    checked={formData.isPrimaryAdmin} 
                    onChange={e => setFormData({...formData, isPrimaryAdmin: e.target.checked})} 
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 w-4 h-4" 
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Designate as Primary Administrator</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Grants top-tier billing &amp; account management rights for this organization.</span>
                  </div>
                </label>
                {formData.isPrimaryAdmin && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mt-2.5 flex items-center">
                    <Star size={13} className="mr-2 flex-shrink-0 fill-amber-500" />
                    <span>This will automatically revoke primary status from the current primary administrator of the selected organization.</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending} 
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{createMutation.isPending ? "Creating..." : "Create Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCompanyAdmins;
