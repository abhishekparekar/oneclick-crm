import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGlobalUsersApi, getCompaniesApi, updateUserStatusApi,
  resetUserPasswordApi, forceLogoutUserApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import SaSelect from "../../components/common/SaSelect";
import {
  Search, MoreVertical, ShieldAlert, Key, LogOut, CheckCircle,
  CheckCircle2, Ban, Eye, Users, UserCheck, Shield, User, Building2,
  ExternalLink, Mail, Phone, Calendar, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Palette-Enforced Role Badge ──────────────────────────────────────── */
const GlobalUserRoleBadge = ({ role }) => {
  const roleMap = {
    CompanyAdmin: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Company Admin" },
    HR: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "HR Manager" },
    Manager: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Team Lead / Mgr" },
    Employee: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border/30", label: "Standard Employee" }
  };
  const current = roleMap[role] || roleMap.Employee;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      {current.label}
    </span>
  );
};

/* ─── Palette-Enforced Status Badge ────────────────────────────────────── */
const GlobalUserStatusBadge = ({ isActive }) => (
  <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
    isActive 
      ? "bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30" 
      : "bg-sa-bg text-sa-text-secondary border-sa-border/30"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#fbbf24]" : "bg-sa-text-secondary"}`} />
    <span>{isActive ? "Active Account" : "Suspended / Locked"}</span>
  </span>
);

/* ─── Top Identity & Access Summary Card ───────────────────────────────── */
const UserKpiCard = ({ title, count, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-sa-surface rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
      active ? "border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md" : "border-sa-border/30 hover:border-sa-border/80 hover:bg-sa-bg/30"
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

const MOCK_USERS = [
  {
    _id: "usr_01",
    name: "Rajesh Sharma",
    email: "rajesh.sharma@acmeglobal.com",
    role: "CompanyAdmin",
    companyId: { _id: "comp_101", companyName: "Acme Corporation Global" },
    department: "Executive",
    designation: "CEO & Managing Director",
    isActive: true,
    lastLogin: "2026-07-08T18:45:00Z",
    createdAt: "2025-11-15T10:30:00Z"
  },
  {
    _id: "usr_02",
    name: "Ananya Iyer",
    email: "ananya.iyer@acmeglobal.com",
    role: "Employee",
    companyId: { _id: "comp_101", companyName: "Acme Corporation Global" },
    department: "Human Resources",
    designation: "HR Manager",
    isActive: true,
    lastLogin: "2026-07-09T09:12:00Z",
    createdAt: "2025-11-16T11:00:00Z"
  },
  {
    _id: "usr_03",
    name: "Priya Nair",
    email: "priya.nair@techsphere.io",
    role: "CompanyAdmin",
    companyId: { _id: "comp_102", companyName: "TechSphere Solutions Pvt Ltd" },
    department: "Operations",
    designation: "Chief Operating Officer",
    isActive: true,
    lastLogin: "2026-07-08T14:20:00Z",
    createdAt: "2025-12-01T14:20:00Z"
  },
  {
    _id: "usr_04",
    name: "Vikram Singh",
    email: "vikram.s@techsphere.io",
    role: "Employee",
    companyId: { _id: "comp_102", companyName: "TechSphere Solutions Pvt Ltd" },
    department: "Engineering",
    designation: "Lead Systems Architect",
    isActive: true,
    lastLogin: "2026-07-09T08:30:00Z",
    createdAt: "2025-12-05T09:00:00Z"
  },
  {
    _id: "usr_05",
    name: "Arjun Verma",
    email: "arjun@nexuslabs.co",
    role: "CompanyAdmin",
    companyId: { _id: "comp_103", companyName: "Nexus Innovation Labs" },
    department: "Product",
    designation: "Founder & Product Head",
    isActive: true,
    lastLogin: "2026-07-07T16:10:00Z",
    createdAt: "2026-01-10T09:15:00Z"
  },
  {
    _id: "usr_06",
    name: "Sunita Menon",
    email: "sunita@starlightretail.in",
    role: "CompanyAdmin",
    companyId: { _id: "comp_104", companyName: "Starlight Retail Ventures" },
    department: "Retail Operations",
    designation: "Director of Retail",
    isActive: true,
    lastLogin: "2026-07-09T07:45:00Z",
    createdAt: "2026-02-18T16:45:00Z"
  },
  {
    _id: "usr_07",
    name: "Vikramaditya Rao",
    email: "vikram@cloudscale.ai",
    role: "CompanyAdmin",
    companyId: { _id: "comp_105", companyName: "CloudScale AI Systems" },
    department: "AI Research",
    designation: "Chief Scientist & Founder",
    isActive: true,
    lastLogin: "2026-07-08T21:15:00Z",
    createdAt: "2026-06-20T11:00:00Z"
  },
  {
    _id: "usr_08",
    name: "Meera Joshi",
    email: "meera.j@apexlogistics.com",
    role: "CompanyAdmin",
    companyId: { _id: "comp_106", companyName: "Apex Logistics India" },
    department: "Logistics & Supply",
    designation: "General Manager",
    isActive: false,
    lastLogin: "2026-06-15T12:00:00Z",
    createdAt: "2026-03-05T08:30:00Z"
  }
];

const SuperAdminUsers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({ queryKey: ["superAdminUsers"], queryFn: () => getGlobalUsersApi() });
  const { data: companiesData } = useQuery({ queryKey: ["superAdminCompanies"], queryFn: () => getCompaniesApi() });

  const rawUsers = Array.isArray(usersData?.data) ? usersData?.data : (usersData?.data?.users || []);
  const users = rawUsers;
  const companies = Array.isArray(companiesData?.data)
    ? companiesData?.data
    : (companiesData?.data?.companies || companiesData?.data?.data || []);

  const filteredUsers = users.filter((user) => {
    const name = user.name || "";
    const email = user.email || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" ? (user.isActive === true || user.isActive === "active" || user.status === "active") : (user.isActive === false || user.isActive === "inactive" || !user.isActive || user.status !== "active"));
    const matchesRole = roleFilter === "all" || user.role === roleFilter || (roleFilter === "standard" && user.role !== "CompanyAdmin");
    const userCompId = user.companyId?._id || user.companyId?.id || user.companyId;
    const matchesCompany = companyFilter === "all" || 
                           String(userCompId) === String(companyFilter) ||
                           (user.companyId?.companyName && String(user.companyId.companyName).toLowerCase() === String(companyFilter).toLowerCase());
    return matchesSearch && matchesStatus && matchesRole && matchesCompany;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const suspendedUsers = users.filter(u => !u.isActive).length;
  const companyAdmins = users.filter(u => u.role === "CompanyAdmin").length;
  const standardUsers = users.filter(u => u.role !== "CompanyAdmin").length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateUserStatusApi(id, status),
    onSuccess: () => queryClient.invalidateQueries(["superAdminUsers"]),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPasswordApi,
    onSuccess: (data) => {
      alert(`Password reset successfully!\nEmail: ${data?.data?.email || 'User'}\nTemporary Password: ${data?.data?.temporaryPassword}\n\nPlease copy this securely and transmit to the user.`);
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to reset password")
  });

  const forceLogoutMutation = useMutation({
    mutationFn: forceLogoutUserApi,
    onSuccess: () => alert("User has been forcefully logged out across all active sessions and devices."),
    onError: (err) => alert(err.response?.data?.message || "Failed to force logout")
  });

  const handleUpdateStatus = (id, isActive) => {
    const newStatus = isActive ? "inactive" : "active";
    if (window.confirm(`Are you sure you want to mark this user account as ${isActive ? "SUSPENDED" : "ACTIVE"}?`)) {
      statusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleResetPassword = (id) => {
    if (window.confirm("CRITICAL SECURITY ACTION: This will immediately overwrite the user's password with a temporary system generated password. Proceed?")) {
      resetPasswordMutation.mutate(id);
    }
  };

  const handleForceLogout = (id) => {
    if (window.confirm("Force logout user from all active browser sessions and mobile devices?")) {
      forceLogoutMutation.mutate(id);
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  /* ─── Table Columns Definition ───────────────────────────────────────── */
  const columns = [
    {
      header: "User Identity & Profile",
      accessor: "user",
      render: (row) => (
        <div className="flex items-center space-x-3 py-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            {(row.name || "U").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span 
              onClick={() => handleViewDetails(row)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer block leading-tight"
            >
              {row.name || "Unnamed User"}
            </span>
            <span className="text-[11px] font-mono font-semibold text-sa-text-secondary mt-0.5 block">
              {row.email || "No email recorded"}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Tenant Workspace",
      accessor: "company",
      render: (row) => (
        <div className="py-1">
          {row.companyId ? (
            <span 
              onClick={() => navigate(`/superadmin/companies/${row.companyId?._id || row.companyId}`)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer inline-flex items-center gap-1 leading-tight"
            >
              <span>{row.companyId?.companyName || "Assigned Workspace"}</span>
              <ExternalLink size={11} className="text-[#f59e0b] opacity-70" />
            </span>
          ) : (
            <span className="text-xs font-bold text-sa-text-secondary italic">System / Unassigned</span>
          )}
          <p className="text-[10px] font-semibold text-sa-text-secondary mt-0.5 uppercase tracking-wider">
            {row.phone || "No phone recorded"}
          </p>
        </div>
      )
    },
    {
      header: "Access Role",
      accessor: "role",
      render: (row) => <GlobalUserRoleBadge role={row.role} />
    },
    {
      header: "Security Status",
      accessor: "status",
      render: (row) => <GlobalUserStatusBadge isActive={row.isActive} />
    },
    {
      header: "Account Actions",
      accessor: "actions",
      render: (row) => {
        const isOpen = activeMenu?.id === row._id;
        return (
          <div className="flex items-center justify-end space-x-1.5 select-none py-1">
            <button
              type="button"
              onClick={() => handleViewDetails(row)}
              className="p-1.5 rounded-lg bg-sa-surface border border-sa-border/30 text-sa-text hover:border-[#f59e0b] hover:text-[#f59e0b] transition-all"
              title="View Security & Profile Details"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(row._id, row.isActive)}
              className={`p-1.5 rounded-lg border border-sa-border/30 transition-all ${
                row.isActive 
                  ? "bg-sa-surface text-sa-text-secondary hover:text-rose-500 hover:border-rose-300" 
                  : "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20"
              }`}
              title={row.isActive ? "Suspend Account Access" : "Reactivate User Account"}
            >
              {row.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
            </button>
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
              className={`p-1.5 rounded-lg border border-sa-border/30 transition-all ${
                isOpen 
                  ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-xs" 
                  : "bg-sa-surface text-sa-text-secondary hover:text-sa-text hover:border-[#f59e0b]"
              }`}
              title="Security Options Menu"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        );
      }
    }
  ];

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-sa-border/30">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">Global Identity & Access Management</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Audit user accounts, enforce security policies, manage tenant credentials, and control session lifecycles.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-sa-surface border border-sa-border/30 text-xs font-extrabold text-sa-text flex items-center gap-1.5">
            <Lock size={13} className="text-[#f59e0b]" />
            <span>Multi-Tenant Auth Grid</span>
          </span>
        </div>
      </div>

      {/* Identity & Access KPI Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <UserKpiCard 
          title="Total Platform Users" 
          count={totalUsers} 
          subtitle="All identity records" 
          icon={Users} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all" && roleFilter === "all"} 
          onClick={() => { setStatusFilter("all"); setRoleFilter("all"); }} 
        />
        <UserKpiCard 
          title="Active Profiles" 
          count={activeUsers} 
          subtitle="Enrolled & verified" 
          icon={UserCheck} 
          grad={["#f59e0b", "#f59e0b"]} 
          active={statusFilter === "active"} 
          onClick={() => setStatusFilter("active")} 
        />
        <UserKpiCard 
          title="Suspended / Locked" 
          count={suspendedUsers} 
          subtitle="Access revoked" 
          icon={Ban} 
          grad={["#b45309", "#06B6D4"]} 
          active={statusFilter === "inactive"} 
          onClick={() => setStatusFilter("inactive")} 
        />
        <UserKpiCard 
          title="Tenant Company Admins" 
          count={companyAdmins} 
          subtitle="Supervisors & owners" 
          icon={Shield} 
          grad={["#d97706", "#fbbf24"]} 
          active={roleFilter === "CompanyAdmin"} 
          onClick={() => setRoleFilter("CompanyAdmin")} 
        />
        <UserKpiCard 
          title="Standard Employee / HR" 
          count={standardUsers} 
          subtitle="Regular workforce" 
          icon={User} 
          grad={["#f59e0b", "#06B6D4"]} 
          active={roleFilter === "standard"} 
          onClick={() => setRoleFilter("standard")} 
        />
      </div>

      {/* Multi-Filter Search Toolbar */}
      <div className="bg-sa-surface p-2.5 sm:p-3 rounded-2xl border border-sa-border/30 shadow-xs space-y-2.5 sm:space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="relative md:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
            <input 
              type="text" 
              placeholder="Search users by full name, email address, or registered phone..." 
              className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <SaSelect
            value={companyFilter}
            onChange={setCompanyFilter}
            options={[
              { label: "All Tenant Companies", value: "all" },
              ...companies.map(c => ({ label: c.companyName, value: c._id }))
            ]}
            buttonClassName="!py-2 !px-3.5 !rounded-xl !bg-sa-bg/60 !w-full"
          />
          <div className="grid grid-cols-2 gap-2">
            <SaSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { label: "All Roles", value: "all" },
                { label: "Company Admin", value: "CompanyAdmin" },
                { label: "HR Manager", value: "HR" },
                { label: "Manager", value: "Manager" },
                { label: "Employee", value: "Employee" }
              ]}
              buttonClassName="!py-2 !px-3 !rounded-xl !bg-sa-bg/60 !w-full"
            />
            <SaSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All Status", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Suspended", value: "inactive" }
              ]}
              buttonClassName="!py-2 !px-3 !rounded-xl !bg-sa-bg/60 !w-full"
            />
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      {usersLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading global identity and access records...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredUsers} pagination={{ total: filteredUsers.length }} />
        </div>
      )}

      {/* ─── Glassmorphic User Access & Security Profile Drawer ──────────── */}
      {isDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-black flex-shrink-0 shadow-sm"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-sa-text tracking-tight">{selectedUser.name}</h3>
                    <GlobalUserRoleBadge role={selectedUser.role} />
                  </div>
                  <p className="text-xs font-mono font-semibold text-sa-text-secondary mt-0.5">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto max-h-[80vh] hide-scrollbar">
              
              {/* Section 1: Tenant Workspace Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#f59e0b]" />
                  <span>Assigned Tenant & Contact Details</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-sa-bg/60 p-4 rounded-xl border border-sa-border/30">
                  <div>
                    <span className="block text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Assigned Company</span>
                    <span className="text-xs font-black text-sa-text mt-0.5 block">{selectedUser.companyId?.companyName || "System / Unassigned"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Registered Phone</span>
                    <span className="text-xs font-bold text-sa-text mt-0.5 block">{selectedUser.phone || "No phone on record"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Account Creation Date</span>
                    <span className="text-xs font-bold text-sa-text mt-0.5 block">{new Date(selectedUser.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider">Current Security Status</span>
                    <div className="mt-1"><GlobalUserStatusBadge isActive={selectedUser.isActive} /></div>
                  </div>
                </div>
              </div>

              {/* Section 2: Security & Session Control Action Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2 flex items-center gap-1.5">
                  <Lock size={14} className="text-[#06B6D4]" />
                  <span>Security Enforcement & Session Control</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => handleResetPassword(selectedUser._id)}
                    className="p-3.5 rounded-xl border border-sa-border/30 bg-sa-surface hover:border-[#f59e0b] transition-all text-left group flex items-start space-x-3"
                  >
                    <div className="p-2 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] group-hover:bg-[#f59e0b]/20 transition-all flex-shrink-0">
                      <Key size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-sa-text group-hover:text-[#f59e0b] transition-colors">Reset Password Credentials</h5>
                      <p className="text-[10px] text-sa-text-secondary mt-0.5">Generate a temporary access password and revoke current secret.</p>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleForceLogout(selectedUser._id)}
                    className="p-3.5 rounded-xl border border-sa-border/30 bg-sa-surface hover:border-[#06B6D4] transition-all text-left group flex items-start space-x-3"
                  >
                    <div className="p-2 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] group-hover:bg-[#06B6D4]/20 transition-all flex-shrink-0">
                      <LogOut size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-sa-text group-hover:text-[#06B6D4] transition-colors">Force Logout Sessions</h5>
                      <p className="text-[10px] text-sa-text-secondary mt-0.5">Disconnect all active browser tokens and mobile device sessions.</p>
                    </div>
                  </button>
                </div>

                {/* Account Suspension / Reactivation Button */}
                <button
                  type="button"
                  onClick={() => { setIsDrawerOpen(false); handleUpdateStatus(selectedUser._id, selectedUser.isActive); }}
                  className={`w-full p-3.5 rounded-xl border border-sa-border/30 transition-all flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider ${
                    selectedUser.isActive 
                      ? "bg-sa-surface text-rose-600 hover:bg-rose-500/10 hover:border-rose-300" 
                      : "bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/25"
                  }`}
                >
                  {selectedUser.isActive ? (
                    <><Ban size={15} /> <span>Suspend & Revoke User Account Access</span></>
                  ) : (
                    <><CheckCircle2 size={15} /> <span>Reactivate User Account Access</span></>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-sa-border/30 bg-sa-bg/60 flex justify-end">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 rounded-xl border border-sa-border/30 bg-sa-surface text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                Close Security Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed z-[9999] Action Kebab Dropdown Portal */}
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
          className="w-48 bg-sa-surface rounded-2xl shadow-2xl border border-sa-border overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <div className="py-1 px-1">
            <button onClick={() => { const { row } = activeMenu; setActiveMenu(null); handleViewDetails(row); }} className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-sa-text hover:bg-[#f59e0b]/10 hover:text-[#f59e0b] transition-colors">
              <Eye size={14} className="text-[#f59e0b]" /> <span>Security Profile</span>
            </button>
          </div>
          <div className="py-1 px-1 border-t border-sa-border/30">
            <button onClick={() => { const { row } = activeMenu; setActiveMenu(null); handleUpdateStatus(row._id, row.isActive); }} className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeMenu.row.isActive ? 'text-rose-600 hover:bg-rose-500/10' : 'text-[#fbbf24] hover:bg-[#fbbf24]/10'}`}>
              {activeMenu.row.isActive ? <><Ban size={14} /> <span>Suspend User</span></> : <><CheckCircle2 size={14} /> <span>Activate User</span></>}
            </button>
            <button onClick={() => { const { row } = activeMenu; setActiveMenu(null); handleForceLogout(row._id); }} className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-sa-text hover:bg-[#06B6D4]/10 hover:text-[#06B6D4] transition-colors">
              <LogOut size={14} className="text-[#06B6D4]" /> <span>Force Logout</span>
            </button>
          </div>
          <div className="py-1 px-1 border-t border-sa-border/30">
            <button onClick={() => { const { row } = activeMenu; setActiveMenu(null); handleResetPassword(row._id); }} className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors">
              <ShieldAlert size={14} /> <span>Reset Password</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsers;
