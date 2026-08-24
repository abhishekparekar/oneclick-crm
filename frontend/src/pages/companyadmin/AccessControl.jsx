import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getEmployeesApi,
  updateEmployeeApi,
  getDepartmentsApi,
} from "../../api/companyAdminApi";
import {
  ShieldCheck, Users, Lock, Unlock, Building2, Search, X, CheckSquare,
  ClipboardList, CalendarOff, UserCog, Megaphone, ChevronRight, AlertCircle,
  RefreshCw, Shield, Magnet, DollarSign, Award, TrendingUp, Folder,
  CalendarCheck, Sliders, FileText, CheckCircle2, Sparkles, Clock, Target,
  FileCheck, Send, Eye, Settings, Check, Filter, Layers, CheckCheck, User
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
];
const avatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ROLE_CFG = {
  HR:           { label: "HR Manager",    bg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  Manager:      { label: "Team Manager",  bg: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  CompanyAdmin: { label: "Company Admin", bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-black" },
  Employee:     { label: "Employee",      bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
};
const roleStyle = (role) => ROLE_CFG[role] || ROLE_CFG.Employee;

// ── Micro Toggle Switch ───────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-4 w-7.5 items-center rounded-full transition-colors duration-150 focus:outline-none flex-shrink-0 cursor-pointer ${
      checked ? "bg-[#1268D9]" : "bg-slate-300 dark:bg-slate-700"
    }`}
  >
    <span
      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform duration-150 ${
        checked ? "translate-x-3.5" : "translate-x-0.5"
      }`}
    />
  </button>
);

// ── Compact Permission Item ───────────────────────────────────────────────────
const PermItem = ({ label, checked, onChange }) => (
  <div
    onClick={onChange}
    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
      checked
        ? "bg-[#1268D9]/10 dark:bg-[#1268D9]/20 border-[#1268D9]/40 text-slate-900 dark:text-white font-bold shadow-2xs"
        : "bg-white dark:bg-[#071A2F]/80 border-slate-200/80 dark:border-[#1C3554] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
    }`}
  >
    <span className="text-xs truncate">{label}</span>
    <Toggle checked={checked} onChange={(e) => { e.stopPropagation(); onChange(); }} />
  </div>
);

// ── Main Access Control Component ─────────────────────────────────────────────
const AccessControl = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState("all");
  const [deptFilter, setDeptFilter] = useState("");
  const [selectedManager, setSelectedManager] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [tempAccessLevel, setTempAccessLevel] = useState("team");
  const [tempDepts, setTempDepts] = useState([]);

  // Granular Permissions State
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
      toast.success("Permissions updated successfully!");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to update permissions");
    },
  });

  // Computed stats
  const stats = useMemo(() => {
    const total = employees.length;
    const admins = employees.filter((e) => {
      const r = e.role || e.userId?.role || "Employee";
      return r === "CompanyAdmin" || r === "Admin";
    }).length;
    const managers = employees.filter((e) => {
      const r = e.role || e.userId?.role || "Employee";
      return r === "Manager";
    }).length;
    const hrs = employees.filter((e) => {
      const r = e.role || e.userId?.role || "Employee";
      return r === "HR";
    }).length;
    const withCustom = employees.filter((e) => e.permissions && Object.keys(e.permissions).length > 0).length;
    return { total, admins, managers, hrs, withCustom };
  }, [employees]);

  // Filtered list
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const name = (emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const email = (emp.email || emp.user?.email || "").toLowerCase();
      const role = emp.role || emp.userId?.role || "Employee";
      const hasCustom = emp.permissions && Object.keys(emp.permissions).length > 0;
      const deptId = emp.departmentId?._id || emp.departmentId || emp.department?._id;

      const matchSearch = !search || name.includes(search.toLowerCase()) || code.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
      const matchDept = !deptFilter || deptId === deptFilter;
      
      let matchTab = true;
      if (roleTab === "admin") matchTab = role === "CompanyAdmin" || role === "Admin";
      else if (roleTab === "manager") matchTab = role === "Manager";
      else if (roleTab === "hr") matchTab = role === "HR";
      else if (roleTab === "employee") matchTab = role === "Employee";
      else if (roleTab === "custom") matchTab = hasCustom;

      return matchSearch && matchDept && matchTab;
    });
  }, [employees, search, roleTab, deptFilter]);

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

  // Open drawer & load existing or role-default permissions
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

  const handleToggleCategory = (category, shouldEnable) => {
    setTempPermissions((prev) => {
      const current = prev[category] || {};
      const updated = {};
      Object.keys(current).forEach((k) => {
        updated[k] = shouldEnable;
      });
      return { ...prev, [category]: updated };
    });
  };

  const handleToggleAllGlobal = (shouldEnable) => {
    setTempPermissions((prev) => {
      const next = {};
      Object.keys(prev).forEach((cat) => {
        next[cat] = {};
        Object.keys(prev[cat]).forEach((k) => {
          next[cat][k] = shouldEnable;
        });
      });
      return next;
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

  // Drawer Active and Total Count
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

  // Categories Definition with icon & items
  const permissionCategories = [
    {
      key: "tasks",
      title: "Tasks & Projects",
      icon: ClipboardList,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      items: [
        { key: "create", label: "Create Tasks" },
        { key: "edit", label: "Edit Tasks" },
        { key: "assign", label: "Assign Tasks" },
        { key: "shift", label: "Reschedule / Shift" },
        { key: "cancel", label: "Cancel Tasks" },
        { key: "reopen", label: "Re-open Tasks" },
        { key: "projects", label: "Manage Projects" },
      ],
    },
    {
      key: "leaves",
      title: "Leave Approvals",
      icon: CalendarOff,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10",
      items: [
        { key: "approveReject", label: "Approve & Reject" },
        { key: "viewAllLeaves", label: "View All Leaves" },
      ],
    },
    {
      key: "attendance",
      title: "Attendance & Shifts",
      icon: CalendarCheck,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10",
      items: [
        { key: "markAttendance", label: "Manual Punch Override" },
        { key: "shiftsRosters", label: "Manage Shifts & Rosters" },
      ],
    },
    {
      key: "teamMembers",
      title: "Workforce & KYC",
      icon: UserCog,
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10",
      items: [
        { key: "add", label: "Add Employees" },
        { key: "edit", label: "Edit Profiles" },
        { key: "activeInactive", label: "Toggle Status" },
        { key: "uploadDocs", label: "Upload Documents" },
        { key: "salaryStructure", label: "Salary Structure" },
      ],
    },
    {
      key: "leads",
      title: "Lead Engine & CRM",
      icon: Magnet,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      items: [
        { key: "view", label: "View Pipeline" },
        { key: "create", label: "Create Leads" },
        { key: "edit", label: "Edit Deal Stages" },
        { key: "assignLeads", label: "Reassign Deals" },
        { key: "delete", label: "Delete Leads" },
        { key: "campaigns", label: "WhatsApp Campaigns" },
      ],
    },
    {
      key: "payroll",
      title: "Payroll & Finance",
      icon: DollarSign,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      items: [
        { key: "view", label: "View Payroll Slips" },
        { key: "generate", label: "Process Pay Runs" },
        { key: "settings", label: "Payroll Settings" },
      ],
    },
    {
      key: "performance",
      title: "Performance & Reviews",
      icon: Award,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10",
      items: [
        { key: "view", label: "View KPI Metrics" },
        { key: "evaluate", label: "Submit Appraisals" },
      ],
    },
    {
      key: "company",
      title: "Company & BI Analytics",
      icon: Building2,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
      items: [
        { key: "announcementsHolidays", label: "Announcements & Holidays" },
        { key: "departmentsBranches", label: "Departments & Branches" },
        { key: "reports", label: "BI Reports & Exports" },
      ],
    },
  ];

  return (
    <div className="space-y-3 pb-16 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden">

      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Access & Permission Controls
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Enterprise RBAC: Configure granular rights, approvals & visibility scopes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10.5px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RBAC Engine Active
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Staff</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">{isLoading ? "—" : stats.total}</h3>
            <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400">Workforce</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Users size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Admins & HR</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">{isLoading ? "—" : stats.admins + stats.hrs}</h3>
            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">{stats.admins} Admins · {stats.hrs} HR</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Shield size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Team Leads</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">{isLoading ? "—" : stats.managers}</h3>
            <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400">Managers</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
            <UserCog size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Custom Access</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none my-1">{isLoading ? "—" : stats.withCustom}</h3>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">Overridden</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <ShieldCheck size={15} />
          </div>
        </div>
      </div>

      {/* ── Table & Matrix Main Container ───────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">

        {/* Toolbar with Tabs and Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/30">
          
          {/* Quick Role Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "All Staff", count: stats.total },
              { id: "admin", label: "Admins", count: stats.admins },
              { id: "hr", label: "HR", count: stats.hrs },
              { id: "manager", label: "Managers", count: stats.managers },
              { id: "employee", label: "Employees", count: stats.total - (stats.admins + stats.hrs + stats.managers) },
              { id: "custom", label: "Custom RBAC", count: stats.withCustom, highlight: true },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleTab(tab.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  roleTab === tab.id
                    ? "bg-[#1268D9] text-white shadow-xs"
                    : tab.highlight
                    ? "bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] hover:bg-[#1268D9]/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[9.5px] font-black ${roleTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Department Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, code, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 w-44 sm:w-52"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name || d.departmentName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <RefreshCw size={20} className="animate-spin text-amber-500" />
              <p className="text-xs font-bold">Loading permissions matrix...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 space-y-2 text-slate-400">
              <AlertCircle size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No staff members found</p>
              <p className="text-[11px]">Try adjusting your search query or role filter tab</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2.5">Staff Member</th>
                  <th className="px-4 py-2.5">System Role</th>
                  <th className="px-4 py-2.5">Department & Branch</th>
                  <th className="px-4 py-2.5">Access Scope</th>
                  <th className="px-4 py-2.5 text-center">Active Rights</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
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
                  const branchName = mgr.branchId?.branchName || mgr.branchId?.name || "Main Office";
                  const role = roleStyle(formattedRole);
                  const activePerm = countActivePerms(mgr);
                  const hasCustomAccess = mgr.permissions && Object.keys(mgr.permissions).length > 0;
                  const scopeLabel = mgr.managerAccessLevel === "company" ? "Whole Org" : mgr.managerAccessLevel === "department" ? "Department" : "Team Only";

                  return (
                    <tr
                      key={mgr._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Employee Identity */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-xs font-black shadow-2xs flex-shrink-0 border ${avatarColor(mgr.fullName || mgr.firstName || "")}`}
                          >
                            {(mgr.fullName || mgr.firstName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate max-w-[180px]">
                              {mgr.fullName || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim() || mgr.name || "Employee"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.2 truncate">{mgr.employeeCode || mgr.email || "EMP"}</p>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${role.bg}`}>
                          {role.label}
                        </span>
                      </td>

                      {/* Department & Branch */}
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] leading-tight truncate max-w-[160px]">{deptName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.2 flex items-center gap-1 truncate">
                          <Building2 size={9} /> {branchName}
                        </p>
                      </td>

                      {/* Access Scope */}
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <Layers size={11} className="text-amber-500" />
                          {scopeLabel}
                        </span>
                      </td>

                      {/* Active Rights Count */}
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10.5px] font-mono font-black ${
                          activePerm > 0 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}>
                          {activePerm} Perms
                        </span>
                      </td>

                      {/* Access Status */}
                      <td className="px-4 py-2.5 text-center">
                        {hasCustomAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Custom RBAC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Role Default
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleEditClick(mgr)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1268D9] hover:bg-[#0D50B8] text-white rounded-xl text-[11px] font-extrabold transition-all shadow-2xs shadow-[#1268D9]/20 cursor-pointer"
                        >
                          <Lock size={12} />
                          <span>Configure</span>
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
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10.5px] text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/30">
            <span>Showing {filtered.length} of {employees.length} members</span>
            <span>Enterprise RBAC Policy Engine</span>
          </div>
        )}
      </div>

      {/* ── Centered Permission Studio Modal Popup ─────────────────────────── */}
      {selectedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedManager(null)}
          />

          {/* Modal Popup Body */}
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10 animate-scaleUp"
          >
            {/* ── 1. Executive Header Bar ── */}
            <div className="flex-shrink-0 bg-slate-50/80 dark:bg-[#071A2F] border-b border-slate-200/80 dark:border-[#1C3554] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs flex-shrink-0 border ${avatarColor(selectedManager.fullName || "")}`}>
                    {(selectedManager.fullName || selectedManager.firstName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">
                        {selectedManager.fullName || `${selectedManager.firstName || ""} ${selectedManager.lastName || ""}`.trim() || selectedManager.name || "Employee"}
                      </p>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[9.5px] font-extrabold border shrink-0 ${roleStyle(selectedManager.role || "Employee").bg}`}>
                        {roleStyle(selectedManager.role || "Employee").label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {selectedManager.employeeCode || "EMP"} · {selectedManager.departmentId?.name || "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] border border-[#1268D9]/20">
                    {drawerActiveCount}/{drawerTotalCount} Active
                  </span>
                  <button
                    onClick={() => setSelectedManager(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. Controls Strip (Scope & Presets & Search) ── */}
            <div className="flex-shrink-0 bg-white dark:bg-[#071A2F]/60 border-b border-slate-200/80 dark:border-[#1C3554] p-3 space-y-2.5">
              
              {/* Row 1: Scope & Presets */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Scope segmented selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#050F1F] p-0.5 rounded-xl border border-slate-200/80 dark:border-[#1C3554]">
                  {[
                    { key: "team", label: "Team" },
                    { key: "department", label: "Departments" },
                    { key: "company", label: "Whole Org" },
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setTempAccessLevel(s.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        tempAccessLevel === s.key
                          ? "bg-[#1268D9] text-white shadow-xs font-black"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Presets pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-black uppercase text-slate-400">Presets:</span>
                  {[
                    { type: "admin", label: "Admin" },
                    { type: "hr", label: "HR" },
                    { type: "manager", label: "Lead" },
                    { type: "sales", label: "Sales" },
                    { type: "none", label: "Reset", danger: true },
                  ].map(p => (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => applyPreset(p.type)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer ${
                        p.danger
                          ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900"
                          : "bg-slate-100 dark:bg-[#050F1F] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1C3554] hover:bg-[#1268D9]/10 hover:text-[#1268D9]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department chips when scope is department */}
              {tempAccessLevel === "department" && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#1C3554]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Accessible Departments:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (tempDepts.length === departments.length) setTempDepts([]);
                        else setTempDepts(departments.map(d => d._id));
                      }}
                      className="text-[10.5px] font-extrabold text-[#1268D9] hover:underline cursor-pointer"
                    >
                      {tempDepts.length === departments.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                    {departments.map((dept) => {
                      const isSelected = tempDepts.includes(dept._id);
                      return (
                        <button
                          key={dept._id}
                          type="button"
                          onClick={() => handleToggleDept(dept._id)}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#1268D9] text-white font-black shadow-2xs"
                              : "bg-slate-100 dark:bg-[#050F1F] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1C3554]"
                          }`}
                        >
                          {dept.name || dept.departmentName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 2: Search & Global Batch Toggles */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#1C3554]/60">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter permissions..."
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 bg-slate-50 dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1268D9]"
                  />
                  {drawerSearch && (
                    <button onClick={() => setDrawerSearch("")} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleAllGlobal(true)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] hover:bg-[#1268D9]/20 transition-all cursor-pointer"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAllGlobal(false)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-[#050F1F] text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Revoke All
                  </button>
                </div>
              </div>

            </div>

            {/* ── 3. High-Density Permissions List Body ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {permissionCategories.map((cat) => {
                const CategoryIcon = cat.icon;
                const activeCount = Object.values(tempPermissions[cat.key] || {}).filter(Boolean).length;
                const totalCount = cat.items.length;
                const isAll = activeCount === totalCount;

                // Filter items by drawer search
                const filteredItems = cat.items.filter(item => 
                  !drawerSearch || 
                  item.label.toLowerCase().includes(drawerSearch.toLowerCase()) ||
                  cat.title.toLowerCase().includes(drawerSearch.toLowerCase())
                );

                if (filteredItems.length === 0) return null;

                return (
                  <div key={cat.key} className="bg-slate-50/50 dark:bg-[#071A2F]/40 border border-slate-200/80 dark:border-[#1C3554] rounded-2xl p-3 shadow-2xs space-y-2.5">
                    
                    {/* Category Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#1C3554]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center flex-shrink-0 font-bold">
                          <CategoryIcon size={13} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">{cat.title}</span>
                        <span className={`text-[10px] font-mono font-black px-2 py-0.2 rounded-md ${
                          isAll ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : activeCount > 0 ? "bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF]" : "bg-slate-100 dark:bg-[#050F1F] text-slate-400"
                        }`}>
                          {activeCount}/{totalCount}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat.key, !isAll)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-all cursor-pointer ${
                          isAll
                            ? "text-slate-400 hover:text-slate-600"
                            : "text-[#1268D9] dark:text-[#2F8BFF] hover:underline"
                        }`}
                      >
                        {isAll ? "Revoke" : "Grant All"}
                      </button>
                    </div>

                    {/* 2-Column Grid of Permissions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredItems.map((item) => (
                        <PermItem
                          key={item.key}
                          label={item.label}
                          checked={tempPermissions[cat.key]?.[item.key] || false}
                          onChange={() => handleTogglePerm(cat.key, item.key)}
                        />
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* ── 4. Sticky Action Footer ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-[#1C3554] bg-slate-50/80 dark:bg-[#071A2F] flex items-center justify-between gap-3 shadow-lg">
              <div className="text-xs font-bold text-slate-400">
                <span className="text-slate-900 dark:text-white font-extrabold">{drawerActiveCount}</span> of {drawerTotalCount} permissions enabled
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedManager(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateAccessMutation.isPending}
                  className="px-5 py-1.5 text-xs font-extrabold text-white bg-[#1268D9] hover:bg-[#0D50B8] rounded-xl disabled:opacity-50 transition-all shadow-md shadow-[#1268D9]/25 flex items-center gap-1.5 cursor-pointer"
                >
                  {updateAccessMutation.isPending ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} strokeWidth={2.5} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AccessControl;
