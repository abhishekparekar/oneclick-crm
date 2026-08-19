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
  DollarSign,
  Award,
  TrendingUp,
  Folder,
  CalendarCheck,
  Sliders,
  FileText,
  CheckCircle2,
  Sparkles,
  Clock,
  Target,
  FileCheck,
  Send,
  Eye,
  Settings
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ROLE_CFG = {
  HR:           { label: "HR",            bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  Manager:      { label: "Manager",       bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  CompanyAdmin: { label: "Company Admin", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-extrabold" },
  Employee:     { label: "Employee",      bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};
const roleStyle = (role) => ROLE_CFG[role] || ROLE_CFG.Employee;

// Custom toggle switch component
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 cursor-pointer ${
      checked ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? "translate-x-[18px]" : "translate-x-1"
      }`}
    />
  </button>
);

// ── Permission row ────────────────────────────────────────────────────────────
const PermRow = ({ label, sub, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 px-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
    <div className="flex-1 min-w-0 pr-2">
      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{label}</p>
      {sub && <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{sub}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// ── Section header inside drawer ──────────────────────────────────────────────
const PermSection = ({ icon: Icon, title, activeCount, totalCount, onToggleAll, children }) => (
  <div className="space-y-1 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/60 dark:border-slate-800/80">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold">
          <Icon size={13} />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">{title}</span>
        {totalCount !== undefined && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {activeCount}/{totalCount}
          </span>
        )}
      </div>
      {onToggleAll && (
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
        >
          {activeCount === totalCount ? "Deselect All" : "Select All"}
        </button>
      )}
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
  const [drawerSearch, setDrawerSearch] = useState("");
  const [tempAccessLevel, setTempAccessLevel] = useState("team");
  const [tempDepts, setTempDepts] = useState([]);

  // Comprehensive Granular Permissions Structure
  const [tempPermissions, setTempPermissions] = useState({
    tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false, assign: false, projects: false },
    leaves: { approveReject: false, viewAllLeaves: false },
    attendance: { markAttendance: false, shiftsRosters: false },
    teamMembers: { add: false, edit: false, activeInactive: false, uploadDocs: false, salaryStructure: false },
    leads: { view: false, create: false, edit: false, delete: false, assignLeads: false, campaigns: false },
    payroll: { view: false, generate: false, settings: false },
    performance: { view: false, evaluate: false },
    company: { announcementsHolidays: false, departmentsBranches: false, reports: false },
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
      queryClient.invalidateQueries({ queryKey: ["accessControlEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setSelectedManager(null);
      toast.success("Employee permissions updated successfully!");
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
      return r === "Manager" || r === "HR" || r === "CompanyAdmin";
    }).length;
    const withAccess = employees.filter((e) => e.permissions && Object.keys(e.permissions).length > 0).length;
    return { total, managers, withAccess };
  }, [employees]);

  // Filtered list
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const name = (emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const role = emp.role || emp.userId?.role || "Employee";
      const matchSearch = name.includes(search.toLowerCase()) || code.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      const matchRole = !roleFilter || role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  // Open drawer & load existing/default permissions
  const handleEditClick = (manager) => {
    setSelectedManager(manager);
    setDrawerSearch("");
    setTempAccessLevel(manager.managerAccessLevel || "team");
    const currentDepts = manager.accessibleDepartments?.map((d) =>
      typeof d === "object" ? d._id : d
    ) || [];
    setTempDepts(currentDepts);

    const perm = manager.permissions || {};
    const displayRole = manager.role || manager.userId?.role || "Employee";
    const hasCustomized = manager.permissions && Object.keys(manager.permissions).length > 0;

    let initTasks = { create: false, edit: false, shift: false, cancel: false, reopen: false, assign: false, projects: false };
    let initLeaves = { approveReject: false, viewAllLeaves: false };
    let initAttendance = { markAttendance: false, shiftsRosters: false };
    let initTeamMembers = { add: false, edit: false, activeInactive: false, uploadDocs: false, salaryStructure: false };
    let initLeads = { view: false, create: false, edit: false, delete: false, assignLeads: false, campaigns: false };
    let initPayroll = { view: false, generate: false, settings: false };
    let initPerformance = { view: false, evaluate: false };
    let initCompany = { announcementsHolidays: false, departmentsBranches: false, reports: false };

    if (!hasCustomized) {
      if (displayRole === "CompanyAdmin" || displayRole === "Admin") {
        initTasks = { create: true, edit: true, shift: true, cancel: true, reopen: true, assign: true, projects: true };
        initLeaves = { approveReject: true, viewAllLeaves: true };
        initAttendance = { markAttendance: true, shiftsRosters: true };
        initTeamMembers = { add: true, edit: true, activeInactive: true, uploadDocs: true, salaryStructure: true };
        initLeads = { view: true, create: true, edit: true, delete: true, assignLeads: true, campaigns: true };
        initPayroll = { view: true, generate: true, settings: true };
        initPerformance = { view: true, evaluate: true };
        initCompany = { announcementsHolidays: true, departmentsBranches: true, reports: true };
      } else if (displayRole === "HR") {
        initTasks = { create: true, edit: true, shift: true, cancel: true, reopen: true, assign: true, projects: false };
        initLeaves = { approveReject: true, viewAllLeaves: true };
        initAttendance = { markAttendance: true, shiftsRosters: true };
        initTeamMembers = { add: true, edit: true, activeInactive: true, uploadDocs: true, salaryStructure: false };
        initLeads = { view: true, create: true, edit: true, delete: false, assignLeads: false, campaigns: false };
        initPayroll = { view: true, generate: false, settings: false };
        initPerformance = { view: true, evaluate: true };
        initCompany = { announcementsHolidays: true, departmentsBranches: false, reports: true };
      } else if (displayRole === "Manager") {
        initTasks = { create: true, edit: true, shift: true, cancel: false, reopen: true, assign: true, projects: true };
        initLeaves = { approveReject: true, viewAllLeaves: true };
        initAttendance = { markAttendance: false, shiftsRosters: false };
        initTeamMembers = { add: false, edit: false, activeInactive: false, uploadDocs: true, salaryStructure: false };
        initLeads = { view: true, create: true, edit: true, delete: false, assignLeads: true, campaigns: false };
        initPayroll = { view: false, generate: false, settings: false };
        initPerformance = { view: true, evaluate: true };
        initCompany = { announcementsHolidays: false, departmentsBranches: false, reports: true };
      }
    } else {
      initTasks = {
        create: perm.tasks?.create || false,
        edit: perm.tasks?.edit || false,
        shift: perm.tasks?.shift || false,
        cancel: perm.tasks?.cancel || false,
        reopen: perm.tasks?.reopen || false,
        assign: perm.tasks?.assign || false,
        projects: perm.tasks?.projects || perm.projects?.manage || false,
      };
      initLeaves = {
        approveReject: perm.leaves?.approveReject || false,
        viewAllLeaves: perm.leaves?.viewAllLeaves || false,
      };
      initAttendance = {
        markAttendance: perm.attendance?.markAttendance || false,
        shiftsRosters: perm.attendance?.shiftsRosters || false,
      };
      initTeamMembers = {
        add: perm.teamMembers?.add || false,
        edit: perm.teamMembers?.edit || false,
        activeInactive: perm.teamMembers?.activeInactive || false,
        uploadDocs: perm.teamMembers?.uploadDocs || false,
        salaryStructure: perm.teamMembers?.salaryStructure || false,
      };
      initLeads = {
        view: perm.leads?.view || perm.leads === true || false,
        create: perm.leads?.create || false,
        edit: perm.leads?.edit || false,
        delete: perm.leads?.delete || false,
        assignLeads: perm.leads?.assignLeads || false,
        campaigns: perm.leads?.campaigns || false,
      };
      initPayroll = {
        view: perm.payroll?.view || false,
        generate: perm.payroll?.generate || false,
        settings: perm.payroll?.settings || false,
      };
      initPerformance = {
        view: perm.performance?.view || false,
        evaluate: perm.performance?.evaluate || false,
      };
      initCompany = {
        announcementsHolidays: perm.company?.announcementsHolidays || perm.announcementsHolidays || false,
        departmentsBranches: perm.company?.departmentsBranches || false,
        reports: perm.company?.reports || perm.reports || false,
      };
    }

    setTempPermissions({
      tasks: initTasks,
      leaves: initLeaves,
      attendance: initAttendance,
      teamMembers: initTeamMembers,
      leads: initLeads,
      payroll: initPayroll,
      performance: initPerformance,
      company: initCompany,
    });
  };

  const handleToggleDept = (deptId) => {
    setTempDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleTogglePerm = (category, action) => {
    setTempPermissions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [action]: !prev[category]?.[action]
      }
    }));
  };

  const handleToggleAllCategory = (category) => {
    setTempPermissions((prev) => {
      const current = prev[category] || {};
      const allTrue = Object.values(current).every(Boolean);
      const updated = {};
      Object.keys(current).forEach((k) => {
        updated[k] = !allTrue;
      });
      return { ...prev, [category]: updated };
    });
  };

  // Preset Handlers
  const applyPreset = (presetType) => {
    if (presetType === "admin") {
      setTempPermissions({
        tasks: { create: true, edit: true, shift: true, cancel: true, reopen: true, assign: true, projects: true },
        leaves: { approveReject: true, viewAllLeaves: true },
        attendance: { markAttendance: true, shiftsRosters: true },
        teamMembers: { add: true, edit: true, activeInactive: true, uploadDocs: true, salaryStructure: true },
        leads: { view: true, create: true, edit: true, delete: true, assignLeads: true, campaigns: true },
        payroll: { view: true, generate: true, settings: true },
        performance: { view: true, evaluate: true },
        company: { announcementsHolidays: true, departmentsBranches: true, reports: true },
      });
      setTempAccessLevel("company");
      toast.success("Applied Full Admin Access preset");
    } else if (presetType === "hr") {
      setTempPermissions({
        tasks: { create: true, edit: true, shift: true, cancel: true, reopen: true, assign: true, projects: false },
        leaves: { approveReject: true, viewAllLeaves: true },
        attendance: { markAttendance: true, shiftsRosters: true },
        teamMembers: { add: true, edit: true, activeInactive: true, uploadDocs: true, salaryStructure: true },
        leads: { view: true, create: true, edit: true, delete: false, assignLeads: false, campaigns: false },
        payroll: { view: true, generate: true, settings: false },
        performance: { view: true, evaluate: true },
        company: { announcementsHolidays: true, departmentsBranches: false, reports: true },
      });
      toast.success("Applied HR Manager preset");
    } else if (presetType === "manager") {
      setTempPermissions({
        tasks: { create: true, edit: true, shift: true, cancel: false, reopen: true, assign: true, projects: true },
        leaves: { approveReject: true, viewAllLeaves: true },
        attendance: { markAttendance: false, shiftsRosters: false },
        teamMembers: { add: false, edit: false, activeInactive: false, uploadDocs: true, salaryStructure: false },
        leads: { view: true, create: true, edit: true, delete: false, assignLeads: true, campaigns: false },
        payroll: { view: false, generate: false, settings: false },
        performance: { view: true, evaluate: true },
        company: { announcementsHolidays: false, departmentsBranches: false, reports: true },
      });
      setTempAccessLevel("department");
      toast.success("Applied Team Manager preset");
    } else if (presetType === "sales") {
      setTempPermissions({
        tasks: { create: true, edit: true, shift: false, cancel: false, reopen: false, assign: false, projects: false },
        leaves: { approveReject: false, viewAllLeaves: false },
        attendance: { markAttendance: false, shiftsRosters: false },
        teamMembers: { add: false, edit: false, activeInactive: false, uploadDocs: false, salaryStructure: false },
        leads: { view: true, create: true, edit: true, delete: true, assignLeads: true, campaigns: true },
        payroll: { view: false, generate: false, settings: false },
        performance: { view: false, evaluate: false },
        company: { announcementsHolidays: false, departmentsBranches: false, reports: false },
      });
      toast.success("Applied Sales & CRM Lead preset");
    } else if (presetType === "none") {
      setTempPermissions({
        tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false, assign: false, projects: false },
        leaves: { approveReject: false, viewAllLeaves: false },
        attendance: { markAttendance: false, shiftsRosters: false },
        teamMembers: { add: false, edit: false, activeInactive: false, uploadDocs: false, salaryStructure: false },
        leads: { view: false, create: false, edit: false, delete: false, assignLeads: false, campaigns: false },
        payroll: { view: false, generate: false, settings: false },
        performance: { view: false, evaluate: false },
        company: { announcementsHolidays: false, departmentsBranches: false, reports: false },
      });
      setTempAccessLevel("team");
      toast.success("Reset to Standard Employee Access");
    }
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
    Object.values(p).forEach((sub) => {
      if (typeof sub === "object" && sub !== null) {
        c += Object.values(sub).filter(Boolean).length;
      } else if (sub === true) {
        c += 1;
      }
    });
    return c;
  };

  // Total active in drawer
  const drawerActiveCount = useMemo(() => {
    let count = 0;
    Object.values(tempPermissions).forEach((sub) => {
      if (typeof sub === "object" && sub !== null) {
        count += Object.values(sub).filter(Boolean).length;
      }
    });
    return count;
  }, [tempPermissions]);

  const drawerTotalCount = useMemo(() => {
    let total = 0;
    Object.values(tempPermissions).forEach((sub) => {
      if (typeof sub === "object" && sub !== null) {
        total += Object.keys(sub).length;
      }
    });
    return total;
  }, [tempPermissions]);

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Role Access & Permission Controls <ShieldCheck size={22} className="text-amber-500" />
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Enterprise RBAC module: Configure granular module permissions, approval rights, and department scopes.
          </p>
        </div>
      </div>

      {/* ── Stat KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Staff</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">{isLoading ? "—" : stats.total}</h3>
            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">All Workforce</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Managers &amp; HR</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">{isLoading ? "—" : stats.managers}</h3>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Elevated Roles</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Shield size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Access Set</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">{isLoading ? "—" : stats.withAccess}</h3>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Customized</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs hover:shadow-md transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Security Policy</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">RBAC Active</h3>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Enforced</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <Lock size={18} />
          </div>
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">

        {/* Table toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Workforce Role Permissions Matrix</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click "Configure" on any member to customize module rights &amp; department visibility scopes
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name, code, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 w-56"
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin text-amber-500" />
              <p className="text-sm font-bold">Loading permissions matrix...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3 text-slate-400">
              <AlertCircle size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No employees found</p>
              <p className="text-xs">Try adjusting your search keywords or role filter</p>
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shadow-2xs border border-white dark:border-slate-800 flex-shrink-0 ${avatarColor(mgr.fullName || "")}`}
                          >
                            {(mgr.fullName || mgr.firstName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-amber-500 transition-colors">
                              {mgr.fullName || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim() || mgr.name || "Employee"}
                            </p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{mgr.employeeCode || "EMP-000"}</p>
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
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-xs leading-tight">{deptName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Building2 size={10} /> {branchName}
                        </p>
                      </td>

                      {/* Active permissions count */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black ${
                          activePerm > 0 ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}>
                          {activePerm}
                        </span>
                      </td>

                      {/* Access status */}
                      <td className="px-5 py-3.5 text-center">
                        {hasCustomAccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Default
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleEditClick(mgr)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Lock size={12} />
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
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-900/30">
            <span>Showing {filtered.length} of {employees.length} members</span>
            <span>Access Control &amp; RBAC Registry</span>
          </div>
        )}
      </div>

      {/* ── Right-side Permission Drawer ──────────────────────────────────── */}
      {selectedManager && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedManager(null)}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[500px] bg-white dark:bg-[#0B131A] shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
            style={{ animation: "slideInFromRight 0.25s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white flex-shrink-0 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-500" />
                  <h3 className="text-base font-extrabold text-white m-0">Configure Permissions</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedManager.fullName || `${selectedManager.firstName || ""} ${selectedManager.lastName || ""}`.trim() || selectedManager.name || "Employee"} · {selectedManager.employeeCode || "EMP"}
                </p>
              </div>
              <button
                onClick={() => setSelectedManager(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Employee mini-card */}
            <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center gap-3 flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center border border-white dark:border-slate-800 shadow-2xs flex-shrink-0 ${avatarColor(selectedManager.fullName || "")}`}>
                {(selectedManager.fullName || selectedManager.firstName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight truncate">
                  {selectedManager.fullName || `${selectedManager.firstName || ""} ${selectedManager.lastName || ""}`.trim() || selectedManager.name || "Employee"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                  {selectedManager.departmentId?.name || "General"} · {selectedManager.branchId?.branchName || "Main Office"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {drawerActiveCount} / {drawerTotalCount} Active
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset("admin")}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-all shrink-0 cursor-pointer"
              >
                Full Admin
              </button>
              <button
                type="button"
                onClick={() => applyPreset("hr")}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-all shrink-0 cursor-pointer"
              >
                HR Manager
              </button>
              <button
                type="button"
                onClick={() => applyPreset("manager")}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-all shrink-0 cursor-pointer"
              >
                Team Lead
              </button>
              <button
                type="button"
                onClick={() => applyPreset("sales")}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-all shrink-0 cursor-pointer"
              >
                Sales &amp; CRM
              </button>
              <button
                type="button"
                onClick={() => applyPreset("none")}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all shrink-0 cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Scope selection card */}
            <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B131A] space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Access Scope &amp; Visibility Level
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "team", label: "Assigned Team", sub: "Direct reports" },
                  { key: "department", label: "Departments", sub: "Selected depts" },
                  { key: "company", label: "Whole Company", sub: "Organization" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setTempAccessLevel(s.key)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      tempAccessLevel === s.key
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold ring-1 ring-amber-500/40"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{s.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                  </button>
                ))}
              </div>

              {/* Department chips when scope is department */}
              {tempAccessLevel === "department" && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Select Accessible Departments:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {departments.map((dept) => {
                      const isSelected = tempDepts.includes(dept._id);
                      return (
                        <button
                          key={dept._id}
                          type="button"
                          onClick={() => handleToggleDept(dept._id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 shadow-2xs font-extrabold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {dept.name || dept.departmentName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable permissions body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-[#070D12]">

              {/* 1. Task & Project Operations */}
              <PermSection
                icon={ClipboardList}
                title="Task & Project Control"
                activeCount={Object.values(tempPermissions.tasks || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.tasks || {}).length}
                onToggleAll={() => handleToggleAllCategory("tasks")}
              >
                <PermRow
                  label="Create Tasks"
                  sub="Allow creating new project and team tasks"
                  checked={tempPermissions.tasks?.create || false}
                  onChange={() => handleTogglePerm("tasks", "create")}
                />
                <PermRow
                  label="Edit Tasks"
                  sub="Allow modifying title, description, priority and status"
                  checked={tempPermissions.tasks?.edit || false}
                  onChange={() => handleTogglePerm("tasks", "edit")}
                />
                <PermRow
                  label="Assign Tasks"
                  sub="Allow assigning tasks to any team member"
                  checked={tempPermissions.tasks?.assign || false}
                  onChange={() => handleTogglePerm("tasks", "assign")}
                />
                <PermRow
                  label="Shift & Reschedule Tasks"
                  sub="Allow extending or rescheduling task deadlines"
                  checked={tempPermissions.tasks?.shift || false}
                  onChange={() => handleTogglePerm("tasks", "shift")}
                />
                <PermRow
                  label="Cancel Tasks"
                  sub="Allow terminating or cancelling active tasks"
                  checked={tempPermissions.tasks?.cancel || false}
                  onChange={() => handleTogglePerm("tasks", "cancel")}
                />
                <PermRow
                  label="Re-open Tasks"
                  sub="Allow reopening completed or reviewed tasks"
                  checked={tempPermissions.tasks?.reopen || false}
                  onChange={() => handleTogglePerm("tasks", "reopen")}
                />
                <PermRow
                  label="Manage Projects"
                  sub="Allow creating, updating and archiving client projects"
                  checked={tempPermissions.tasks?.projects || false}
                  onChange={() => handleTogglePerm("tasks", "projects")}
                />
              </PermSection>

              {/* 2. Leave Management */}
              <PermSection
                icon={CalendarOff}
                title="Leave Approvals & Records"
                activeCount={Object.values(tempPermissions.leaves || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.leaves || {}).length}
                onToggleAll={() => handleToggleAllCategory("leaves")}
              >
                <PermRow
                  label="Approve & Reject Leaves"
                  sub="Authorize or decline employee time-off applications"
                  checked={tempPermissions.leaves?.approveReject || false}
                  onChange={() => handleTogglePerm("leaves", "approveReject")}
                />
                <PermRow
                  label="View All Leave Applications"
                  sub="View company-wide leave calendar and historical requests"
                  checked={tempPermissions.leaves?.viewAllLeaves || false}
                  onChange={() => handleTogglePerm("leaves", "viewAllLeaves")}
                />
              </PermSection>

              {/* 3. Attendance & Rosters */}
              <PermSection
                icon={CalendarCheck}
                title="Attendance & Shifts"
                activeCount={Object.values(tempPermissions.attendance || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.attendance || {}).length}
                onToggleAll={() => handleToggleAllCategory("attendance")}
              >
                <PermRow
                  label="Manual Attendance Override"
                  sub="Punch attendance on behalf of employees and correct logs"
                  checked={tempPermissions.attendance?.markAttendance || false}
                  onChange={() => handleTogglePerm("attendance", "markAttendance")}
                />
                <PermRow
                  label="Shifts & Roster Management"
                  sub="Assign shifts, timing slots and roster schedules"
                  checked={tempPermissions.attendance?.shiftsRosters || false}
                  onChange={() => handleTogglePerm("attendance", "shiftsRosters")}
                />
              </PermSection>

              {/* 4. Workforce & Employee Profiles */}
              <PermSection
                icon={UserCog}
                title="Workforce & KYC Management"
                activeCount={Object.values(tempPermissions.teamMembers || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.teamMembers || {}).length}
                onToggleAll={() => handleToggleAllCategory("teamMembers")}
              >
                <PermRow
                  label="Add New Employees"
                  sub="Onboard new staff with personal and employment details"
                  checked={tempPermissions.teamMembers?.add || false}
                  onChange={() => handleTogglePerm("teamMembers", "add")}
                />
                <PermRow
                  label="Edit Employee Profiles"
                  sub="Modify personal details, address, KYC and designations"
                  checked={tempPermissions.teamMembers?.edit || false}
                  onChange={() => handleTogglePerm("teamMembers", "edit")}
                />
                <PermRow
                  label="Toggle Active / Inactive Status"
                  sub="Enable or disable employee platform login access"
                  checked={tempPermissions.teamMembers?.activeInactive || false}
                  onChange={() => handleTogglePerm("teamMembers", "activeInactive")}
                />
                <PermRow
                  label="Upload & Manage Documents"
                  sub="Upload identity, contracts, and view employee vault files"
                  checked={tempPermissions.teamMembers?.uploadDocs || false}
                  onChange={() => handleTogglePerm("teamMembers", "uploadDocs")}
                />
                <PermRow
                  label="View & Edit Salary Structure"
                  sub="Manage salary components, monthly/paid leaves quota"
                  checked={tempPermissions.teamMembers?.salaryStructure || false}
                  onChange={() => handleTogglePerm("teamMembers", "salaryStructure")}
                />
              </PermSection>

              {/* 5. Lead Engine & WhatsApp CRM */}
              <PermSection
                icon={Magnet}
                title="Lead Engine & WhatsApp CRM"
                activeCount={Object.values(tempPermissions.leads || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.leads || {}).length}
                onToggleAll={() => handleToggleAllCategory("leads")}
              >
                <PermRow
                  label="View Leads Pipeline"
                  sub="Allow access to CRM Kanban board and lead records"
                  checked={tempPermissions.leads?.view || false}
                  onChange={() => handleTogglePerm("leads", "view")}
                />
                <PermRow
                  label="Add New Leads"
                  sub="Allow registering new client inquiries and deals"
                  checked={tempPermissions.leads?.create || false}
                  onChange={() => handleTogglePerm("leads", "create")}
                />
                <PermRow
                  label="Edit Deal Stages & Notes"
                  sub="Allow updating pipeline stage, follow-up dates and notes"
                  checked={tempPermissions.leads?.edit || false}
                  onChange={() => handleTogglePerm("leads", "edit")}
                />
                <PermRow
                  label="Reassign Leads"
                  sub="Allow transferring lead ownership to sales representatives"
                  checked={tempPermissions.leads?.assignLeads || false}
                  onChange={() => handleTogglePerm("leads", "assignLeads")}
                />
                <PermRow
                  label="Delete / Archive Leads"
                  sub="Allow permanent deletion of leads from the database"
                  checked={tempPermissions.leads?.delete || false}
                  onChange={() => handleTogglePerm("leads", "delete")}
                />
                <PermRow
                  label="WhatsApp Campaigns & Broadcasts"
                  sub="Allow launching automated flows and broadcast campaigns"
                  checked={tempPermissions.leads?.campaigns || false}
                  onChange={() => handleTogglePerm("leads", "campaigns")}
                />
              </PermSection>

              {/* 6. Payroll & Financials */}
              <PermSection
                icon={DollarSign}
                title="Payroll & Financials"
                activeCount={Object.values(tempPermissions.payroll || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.payroll || {}).length}
                onToggleAll={() => handleToggleAllCategory("payroll")}
              >
                <PermRow
                  label="View Payroll Statements"
                  sub="View company-wide payroll disbursement history and slips"
                  checked={tempPermissions.payroll?.view || false}
                  onChange={() => handleTogglePerm("payroll", "view")}
                />
                <PermRow
                  label="Process Monthly Payroll"
                  sub="Generate payroll calculations, approve pay runs and payslips"
                  checked={tempPermissions.payroll?.generate || false}
                  onChange={() => handleTogglePerm("payroll", "generate")}
                />
                <PermRow
                  label="Configure Payroll Settings"
                  sub="Modify allowances, deduction rules and tax policies"
                  checked={tempPermissions.payroll?.settings || false}
                  onChange={() => handleTogglePerm("payroll", "settings")}
                />
              </PermSection>

              {/* 7. Performance & Appraisals */}
              <PermSection
                icon={Award}
                title="Performance & Appraisals"
                activeCount={Object.values(tempPermissions.performance || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.performance || {}).length}
                onToggleAll={() => handleToggleAllCategory("performance")}
              >
                <PermRow
                  label="View Performance Metrics"
                  sub="View employee KPI dashboards, rankings and review scores"
                  checked={tempPermissions.performance?.view || false}
                  onChange={() => handleTogglePerm("performance", "view")}
                />
                <PermRow
                  label="Submit Appraisals & Ratings"
                  sub="Conduct employee evaluations and submit performance ratings"
                  checked={tempPermissions.performance?.evaluate || false}
                  onChange={() => handleTogglePerm("performance", "evaluate")}
                />
              </PermSection>

              {/* 8. Company & Administration */}
              <PermSection
                icon={Building2}
                title="Company & BI Analytics"
                activeCount={Object.values(tempPermissions.company || {}).filter(Boolean).length}
                totalCount={Object.keys(tempPermissions.company || {}).length}
                onToggleAll={() => handleToggleAllCategory("company")}
              >
                <PermRow
                  label="Announcements & Holidays"
                  sub="Publish company-wide announcements and manage holiday calendar"
                  checked={tempPermissions.company?.announcementsHolidays || false}
                  onChange={() => handleTogglePerm("company", "announcementsHolidays")}
                />
                <PermRow
                  label="Departments & Branches"
                  sub="Create, update and manage organizational departments & branches"
                  checked={tempPermissions.company?.departmentsBranches || false}
                  onChange={() => handleTogglePerm("company", "departmentsBranches")}
                />
                <PermRow
                  label="BI Reports & Excel/PDF Exports"
                  sub="Access executive reports, business intelligence & data exports"
                  checked={tempPermissions.company?.reports || false}
                  onChange={() => handleTogglePerm("company", "reports")}
                />
              </PermSection>

            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B131A] flex items-center justify-between gap-3 shadow-lg">
              <button
                onClick={() => setSelectedManager(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateAccessMutation.isPending}
                className="flex-1 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {updateAccessMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Save All Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessControl;
