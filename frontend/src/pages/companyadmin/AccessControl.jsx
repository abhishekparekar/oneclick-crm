import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getEmployeesApi,
  updateEmployeeApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import {
  ShieldCheck,
  Users,
  Lock,
  Unlock,
  Building2,
  Search,
  X,
  CheckSquare,
  ClipboardList,
  CalendarOff,
  UserCog,
  Megaphone,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Shield,
  Magnet,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-[#E65100]/15 text-[#E65100]",
  "bg-[#B33F00]/15 text-[#B33F00]",
  "bg-[#FF9800]/15 text-[#C47A00]",
  "bg-[#E65100]/10 text-[#B33F00]",
  "bg-[#FF9800]/10 text-[#E65100]",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ROLE_CFG = {
  HR:           { label: "HR",           bg: "bg-[#E65100]/10 text-[#B33F00] border border-[#E65100]/20" },
  Manager:      { label: "Manager",      bg: "bg-[#B33F00]/10 text-[#B33F00] border border-[#B33F00]/25" },
  CompanyAdmin: { label: "Company Admin",bg: "bg-[#E65100]/15 text-[#E65100] border border-[#E65100]/30" },
  Employee:     { label: "Employee",     bg: "bg-[#FF9800]/10 text-[#C47A00] border border-[#FF9800]/20" },
};
const roleStyle = (role) => ROLE_CFG[role] || ROLE_CFG.Employee;

// Custom toggle switch component
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
      checked ? "bg-orange-700" : "bg-ca-border"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-ca-surface shadow transition-transform duration-200 ${
        checked ? "translate-x-[18px]" : "translate-x-1"
      }`}
    />
  </button>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, iconBg, iconColor, glowColor }) => (
  <div className="group relative bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
    {/* Subtle glow blob */}
    <div
      className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
      style={{ background: glowColor || "#E65100" }}
    />
    {/* Top accent bar */}
    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: glowColor || "#E65100", opacity: 0.7 }} />

    <div className="relative flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${iconBg}`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-ca-text-secondary">{label}</p>
        <p className="text-3xl font-black text-ca-text leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-ca-text-secondary font-semibold mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

// ── Permission row ────────────────────────────────────────────────────────────
const PermRow = ({ label, sub, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 px-1">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-ca-text-secondary leading-tight">{label}</p>
      {sub && <p className="text-[11px] text-ca-text-secondary mt-0.5">{sub}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// ── Section header inside drawer ──────────────────────────────────────────────
const PermSection = ({ icon: Icon, title, children }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-orange-700 dark:text-orange-500" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-ca-text-secondary">{title}</span>
    </div>
    <div className="bg-ca-bg/60 border border-ca-border rounded-xl px-3 divide-y divide-slate-100">
      {children}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const AccessControl = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedManager, setSelectedManager] = useState(null);
  const [tempAccessLevel, setTempAccessLevel] = useState("team");
  const [tempDepts, setTempDepts] = useState([]);
  const [tempPermissions, setTempPermissions] = useState({
    tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false },
    leaves: { approveReject: false },
    teamMembers: { add: false, edit: false, activeInactive: false },
    announcementsHolidays: false,
    leads: { view: false, create: false, edit: false, delete: false },
  });

  // Queries
  const { data: deptRes } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartmentsApi,
  });
  const departments = deptRes?.data?.departments || deptRes?.data || [];

  const { data: empRes, isLoading } = useQuery({
    queryKey: ["accessControlEmployees"],
    queryFn: () => getEmployeesApi(),
  });
  const employees = empRes?.data?.employees || empRes?.data || [];

  // Mutation
  const updateAccessMutation = useMutation({
    mutationFn: ({ id, data }) => updateEmployeeApi(id, data),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(["accessControlEmployees"], (oldData) => {
        if (!oldData) return oldData;
        const updatedEmployee = response?.data?.employee || response?.data;
        if (!updatedEmployee) return oldData;
        if (oldData?.data?.employees) {
          const updated = oldData.data.employees.map((emp) =>
            emp._id === variables.id ? updatedEmployee : emp
          );
          return { ...oldData, data: { ...oldData.data, employees: updated } };
        } else if (oldData?.data) {
          const updated = oldData.data.map((emp) =>
            emp._id === variables.id ? updatedEmployee : emp
          );
          return { ...oldData, data: updated };
        }
        return oldData;
      });
      queryClient.invalidateQueries(["accessControlEmployees"]);
      setSelectedManager(null);
      toast.success("Permissions updated successfully!");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to update permissions");
    },
  });

  // Computed stats
  const stats = useMemo(() => {
    const total = employees.length;
    const managers = employees.filter((e) => {
      const r = e.role || e.userId?.role || "Employee";
      return r === "Manager" || r === "HR";
    }).length;
    const withAccess = employees.filter((e) => e.permissions && Object.keys(e.permissions).length > 0).length;
    return { total, managers, withAccess };
  }, [employees]);

  // Filtered list
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const name = (emp.fullName || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const role = emp.role || emp.userId?.role || "Employee";
      const matchSearch = name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
      const matchRole = !roleFilter || role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  // Open drawer
  const handleEditClick = (manager) => {
    setSelectedManager(manager);
    setTempAccessLevel(manager.managerAccessLevel || "team");
    const currentDepts = manager.accessibleDepartments?.map((d) =>
      typeof d === "object" ? d._id : d
    ) || [];
    setTempDepts(currentDepts);

    const perm = manager.permissions || {};
    const displayRole = manager.role || manager.userId?.role || "Employee";
    const hasCustomized = manager.permissions && Object.keys(manager.permissions).length > 0;

    let defaultTasks = { create: false, edit: false, shift: false, cancel: false, reopen: false };
    let defaultLeaves = { approveReject: false };
    let defaultTeamMembers = { add: false, edit: false, activeInactive: false };
    let defaultAnnouncementsHolidays = false;
    let defaultLeads = { view: false, create: false, edit: false, delete: false };

    if (!hasCustomized) {
      if (displayRole === "HR") {
        defaultTasks = { create: true, edit: true, shift: true, cancel: true, reopen: true };
        defaultLeaves = { approveReject: true };
        defaultTeamMembers = { add: true, edit: true, activeInactive: true };
        defaultAnnouncementsHolidays = true;
        defaultLeads = { view: true, create: true, edit: true, delete: true };
      } else if (displayRole === "Manager") {
        defaultTasks = { create: true, edit: true, shift: true, cancel: false, reopen: true };
        defaultLeaves = { approveReject: true };
        defaultTeamMembers = { add: false, edit: false, activeInactive: false };
        defaultAnnouncementsHolidays = false;
        defaultLeads = { view: true, create: true, edit: true, delete: false };
      }
    } else {
      defaultTasks = {
        create: perm.tasks?.create || false,
        edit: perm.tasks?.edit || false,
        shift: perm.tasks?.shift || false,
        cancel: perm.tasks?.cancel || false,
        reopen: perm.tasks?.reopen || false,
      };
      defaultLeaves = { approveReject: perm.leaves?.approveReject || false };
      defaultTeamMembers = {
        add: perm.teamMembers?.add || false,
        edit: perm.teamMembers?.edit || false,
        activeInactive: perm.teamMembers?.activeInactive || false,
      };
      defaultAnnouncementsHolidays = perm.announcementsHolidays || false;
      defaultLeads = {
        view: perm.leads?.view || perm.leads === true || false,
        create: perm.leads?.create || false,
        edit: perm.leads?.edit || false,
        delete: perm.leads?.delete || false,
      };
    }

    setTempPermissions({
      tasks: defaultTasks,
      leaves: defaultLeaves,
      teamMembers: defaultTeamMembers,
      announcementsHolidays: defaultAnnouncementsHolidays,
      leads: defaultLeads,
    });
  };

  const handleToggleDept = (deptId) => {
    setTempDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleTogglePerm = (category, action) => {
    setTempPermissions((prev) => {
      if (action) {
        return { ...prev, [category]: { ...prev[category], [action]: !prev[category][action] } };
      }
      return { ...prev, [category]: !prev[category] };
    });
  };

  const handleSave = () => {
    if (!selectedManager) return;
    updateAccessMutation.mutate({
      id: selectedManager._id,
      data: {
        managerAccessLevel: tempAccessLevel,
        accessibleDepartments: tempDepts,
        permissions: tempPermissions,
      },
    });
  };

  // Count active permissions for badge
  const countActivePerms = (emp) => {
    const p = emp.permissions || {};
    let c = 0;
    if (p.tasks) c += Object.values(p.tasks).filter(Boolean).length;
    if (p.leaves?.approveReject) c++;
    if (p.teamMembers) c += Object.values(p.teamMembers).filter(Boolean).length;
    if (p.announcementsHolidays) c++;
    if (p.leads) c += Object.values(p.leads).filter(Boolean).length;
    return c;
  };

  return (
    <div className="space-y-3">

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Role Access & Permission Controls <ShieldCheck size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage granular employee permissions, department visibility scopes, and administrative roles.
          </p>
        </div>
      </div>

      {/* ── Stat KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{isLoading ? "—" : stats.total}</h3>
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400">All Workforce</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Users size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Managers & HR</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{isLoading ? "—" : stats.managers}</h3>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Elevated Roles</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Shield size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Access Set</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">{isLoading ? "—" : stats.withAccess}</h3>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Customized</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Security Policy</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight my-1 truncate">RBAC Active</h3>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Enforced</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <Lock size={16} />
          </div>
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">

        {/* Table toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Team Role Permissions</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click "Configure" on any member to set their module access rights
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 w-48"
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="HR">HR</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
              <option value="CompanyAdmin">Company Admin</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-ca-text-secondary space-y-2">
              <RefreshCw size={24} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Loading employees...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3 text-ca-text-secondary">
              <AlertCircle size={36} className="mx-auto text-slate-200" />
              <p className="text-sm font-bold text-ca-text-secondary">No employees found</p>
              <p className="text-xs">Try adjusting your search or filter</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Department &amp; Branch</th>
                  <th className="px-5 py-3.5 text-center">Active Perms</th>
                  <th className="px-5 py-3.5 text-center">Access Status</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ca-border text-sm">
                {filtered.map((mgr) => {
                  const displayRole = mgr.role || mgr.userId?.role || mgr.user?.role || "Employee";
                  const formattedRole = displayRole === "CompanyAdmin" ? "CompanyAdmin" : displayRole;
                  const deptName =
                    Array.isArray(mgr.accessibleDepartments) && mgr.accessibleDepartments.length > 0
                      ? mgr.accessibleDepartments
                          .map((d) => (typeof d === "object" ? d.name : d))
                          .filter(Boolean)
                          .join(", ")
                      : mgr.departmentId?.name || "—";
                  const branchName = mgr.branchId?.branchName || "—";
                  const role = roleStyle(formattedRole);
                  const activePerm = countActivePerms(mgr);
                  const hasCustomAccess = mgr.permissions && Object.keys(mgr.permissions).length > 0;

                  return (
                    <tr
                      key={mgr._id}
                      className="hover:bg-ca-bg/60 transition-colors group"
                    >
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-sm border border-white flex-shrink-0 ${avatarColor(mgr.fullName || "")}`}
                          >
                            {(mgr.fullName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ca-text leading-tight group-hover:text-primary transition-colors">
                              {mgr.fullName}
                            </p>
                            <p className="text-xs text-ca-text-secondary font-medium mt-0.5">{mgr.employeeCode}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${role.bg}`}>
                          {role.label}
                        </span>
                      </td>

                      {/* Dept & Branch */}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-ca-text-secondary text-sm leading-tight">{deptName}</p>
                        <p className="text-xs text-ca-text-secondary mt-0.5 flex items-center gap-1">
                          <Building2 size={10} /> {branchName}
                        </p>
                      </td>

                      {/* Active permissions count */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          activePerm > 0 ? "bg-[#E65100]/10 text-[#E65100]" : "bg-ca-bg text-ca-text-secondary"
                        }`}>
                          {activePerm}
                        </span>
                      </td>

                      {/* Access status */}
                      <td className="px-5 py-3.5 text-center">
                        {hasCustomAccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E65100]/10 text-[#B33F00] border border-[#E65100]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E65100]" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-ca-bg text-ca-text-secondary border border-ca-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Default
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleEditClick(mgr)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E65100] hover:bg-[#B33F00] text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-[#E65100]/30 hover:shadow-md"
                        >
                          <Lock size={11} />
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-ca-border flex justify-between items-center text-xs text-ca-text-secondary font-semibold bg-ca-bg/30">
            <span>Showing {filtered.length} of {employees.length} members</span>
            <span>Access Control Registry</span>
          </div>
        )}
      </div>

      {/* ── Right-side Permission Drawer ──────────────────────────────────── */}
      {selectedManager && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setSelectedManager(null)}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[440px] bg-ca-surface shadow-2xl flex flex-col"
            style={{ animation: "slideInFromRight 0.3s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 bg-orange-700 dark:bg-slate-800 flex-shrink-0 border-b border-orange-800 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white">Configure Access</h3>
                <p className="text-sm text-white/70 mt-0.5">
                  {selectedManager.fullName} · {selectedManager.employeeCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedManager(null)}
                className="p-2 rounded-xl text-white/70 hover:bg-ca-surface/20 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Employee mini-card */}
            <div className="px-5 py-4 border-b border-ca-border bg-ca-bg/50 flex items-center gap-3 flex-shrink-0">
              <div className={`w-11 h-11 rounded-xl font-black text-sm flex items-center justify-center border border-white shadow-sm flex-shrink-0 ${avatarColor(selectedManager.fullName || "")}`}>
                {(selectedManager.fullName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-ca-text leading-tight">{selectedManager.fullName}</p>
                <p className="text-xs text-ca-text-secondary font-semibold mt-0.5">
                  {selectedManager.departmentId?.name || "—"} · {selectedManager.branchId?.branchName || "—"}
                </p>
              </div>
              {(() => {
                const r = selectedManager.role || selectedManager.userId?.role || "Employee";
                const s = roleStyle(r === "CompanyAdmin" ? "CompanyAdmin" : r);
                return (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.bg}`}>
                    {s.label}
                  </span>
                );
              })()}
            </div>

            {/* Scrollable permissions body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* 1. Task Control */}
              <PermSection icon={ClipboardList} title="Task Control">
                {[
                  { key: "create", label: "Create Task", sub: "Allow creating new project tasks" },
                  { key: "edit",   label: "Edit Task",   sub: "Allow modifying existing tasks" },
                  { key: "shift",  label: "Shift Task",  sub: "Allow rescheduling task timelines" },
                  { key: "cancel", label: "Cancel Task", sub: "Allow cancelling active tasks" },
                  { key: "reopen", label: "Re-open Task",sub: "Allow reopening completed tasks" },
                ].map((item) => (
                  <PermRow
                    key={item.key}
                    label={item.label}
                    sub={item.sub}
                    checked={tempPermissions.tasks?.[item.key] || false}
                    onChange={() => handleTogglePerm("tasks", item.key)}
                  />
                ))}
              </PermSection>

              {/* 2. Leave Control */}
              <PermSection icon={CalendarOff} title="Leave Control">
                <PermRow
                  label="Approve & Reject Leaves"
                  sub="Authorize or decline employee time-off requests"
                  checked={tempPermissions.leaves?.approveReject || false}
                  onChange={() => handleTogglePerm("leaves", "approveReject")}
                />
              </PermSection>

              {/* 3. Team Management */}
              <PermSection icon={UserCog} title="Team Management">
                {[
                  { key: "add",            label: "Add Team Member",             sub: "Onboard new employees to the system" },
                  { key: "edit",           label: "Edit Team Member",            sub: "Modify existing employee profiles" },
                  { key: "activeInactive", label: "Toggle Active / Inactive",    sub: "Enable or disable employee accounts" },
                ].map((item) => (
                  <PermRow
                    key={item.key}
                    label={item.label}
                    sub={item.sub}
                    checked={tempPermissions.teamMembers?.[item.key] || false}
                    onChange={() => handleTogglePerm("teamMembers", item.key)}
                  />
                ))}
              </PermSection>

              {/* 4. Announcements & Holidays */}
              <PermSection icon={Megaphone} title="Announcements & Holidays">
                <PermRow
                  label="Manage Announcements & Holidays"
                  sub="Create, edit and publish company-wide notices"
                  checked={tempPermissions.announcementsHolidays || false}
                  onChange={() => handleTogglePerm("announcementsHolidays", null)}
                />
              </PermSection>

              {/* 5. Lead Engine & WhatsApp CRM */}
              <PermSection icon={Magnet} title="Lead Engine & WhatsApp CRM">
                {[
                  { key: "view",   label: "View Leads & Pipeline",      sub: "Allow viewing CRM board, pipeline metrics & prospects" },
                  { key: "create", label: "Add New Lead",               sub: "Allow registering new client inquiries & deals" },
                  { key: "edit",   label: "Work on Leads & Notes",      sub: "Allow updating stages, adding timeline notes & status" },
                  { key: "delete", label: "Delete / Archive Leads",     sub: "Allow removing lead records from pipeline" },
                ].map((item) => (
                  <PermRow
                    key={item.key}
                    label={item.label}
                    sub={item.sub}
                    checked={tempPermissions.leads?.[item.key] || false}
                    onChange={() => handleTogglePerm("leads", item.key)}
                  />
                ))}
              </PermSection>

            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-ca-border bg-ca-surface flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedManager(null)}
                className="px-4 py-2.5 text-sm font-bold text-ca-text-secondary bg-ca-bg hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateAccessMutation.isPending}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-700 hover:bg-orange-800 rounded-xl disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck size={13} />
                {updateAccessMutation.isPending ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessControl;
