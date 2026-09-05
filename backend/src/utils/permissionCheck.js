const Employee = require("../models/Employee");

/**
 * Checks if a user has a specific permission.
 * @param {string} userId - The user ID.
 * @param {string} companyId - The company ID.
 * @param {string} userRole - The user's role (e.g. HR, Manager, Employee, CompanyAdmin).
 * @param {string} category - The permission category ('tasks', 'leaves', 'teamMembers', 'announcementsHolidays', 'leads').
 * @param {string} [action] - The specific action (e.g. 'create', 'edit', 'shift', 'cancel', 'reopen', 'add', 'activeInactive', 'view').
 * @returns {Promise<boolean>} Resolves to true if access is allowed, false otherwise.
 */
const checkUserPermission = async (userId, companyId, userRole, category, action) => {
  if (userRole === "CompanyAdmin" || userRole === "SuperAdmin") {
    return true;
  }

  const employee = await Employee.findOne({
    $or: [{ userId }, ...(userId ? [{ _id: userId }] : [])],
    companyId,
  }).lean();

  if (!employee) {
    return false;
  }

  const assigned = Array.isArray(employee.assignedModules)
    ? employee.assignedModules.map((m) => String(m).toLowerCase().trim())
    : [];

  const normCat = String(category).toLowerCase().trim();
  const modKey =
    normCat === "leaves" ? "leave" : normCat === "lead" ? "leads" : normCat === "task" ? "tasks" : normCat;

  // Module check for known modules (if assignedModules is configured)
  const isSuiteModule = [
    "attendance", "leave", "payroll", "tasks", "projects", "leads", "reports",
    "recruitment", "performance", "whatsapp", "mobileapp", "webadmin"
  ].includes(modKey);

  if (isSuiteModule && Array.isArray(employee.assignedModules) && !assigned.includes(modKey)) {
    return false; // Employee is not assigned this module
  }

  const perm = employee.permissions || {};
  const catPerm =
    perm[category] ??
    perm[normCat] ??
    perm[modKey] ??
    (modKey === "leave" ? perm.leaves : undefined) ??
    (modKey === "leads" ? perm.leads : undefined) ??
    (modKey === "tasks" ? perm.tasks : undefined);

  if (!action || action === "view" || action === "read") {
    if (catPerm === false) return false;
    if (typeof catPerm === "object" && catPerm !== null && catPerm.view === false) return false;
    return true;
  }

  if (catPerm !== undefined && catPerm !== null) {
    if (typeof catPerm === "boolean") return catPerm;
    if (typeof catPerm === "object" && catPerm[action] !== undefined) {
      return catPerm[action] === true;
    }
  }

  // Fallback to default role permissions for specific actions
  if (userRole === "HR") {
    return true; // HR has full operational access by default
  }

  if (userRole === "Manager") {
    if (category === "tasks") {
      if (action === "cancel") return false;
      return true;
    }
    if (category === "leaves") {
      return true;
    }
    if (category === "leads") {
      if (action === "delete") return false;
      return true;
    }
    return false; // Team Members and Announcements/Holidays default to false for Manager
  }

  // normal Employees default to false for manager/administrative actions
  return false;
};

const getUserPermissions = async (userId, companyId, userRole) => {
  if (userRole === "CompanyAdmin" || userRole === "SuperAdmin") {
    return {
      tasks: { view: true, create: true, edit: true, shift: true, cancel: true, reopen: true },
      leaves: { view: true, approveReject: true },
      teamMembers: { add: true, edit: true, activeInactive: true },
      announcementsHolidays: true,
      leads: { view: true, create: true, edit: true, delete: true },
      attendance: { view: true, markAttendance: true },
      payroll: { view: true },
      projects: { view: true },
      reports: { view: true },
    };
  }

  const employee = await Employee.findOne({
    $or: [{ userId }, ...(userId ? [{ _id: userId }] : [])],
    companyId,
  }).lean();

  const perm = employee?.permissions || {};
  const hasAssignedArr = Array.isArray(employee?.assignedModules);
  const assigned = hasAssignedArr
    ? employee.assignedModules.map((m) => String(m).toLowerCase().trim())
    : [];

  const hasMod = (mod) => (!hasAssignedArr ? true : assigned.includes(mod));

  const canViewTasks = perm.tasks?.view !== undefined ? perm.tasks.view === true : hasMod("tasks");
  const canViewLeaves =
    perm.leaves?.view !== undefined
      ? perm.leaves.view === true
      : hasMod("leave") || hasMod("leaves");
  const canViewLeads = perm.leads?.view !== undefined ? perm.leads.view === true : hasMod("leads");
  const canViewAttendance =
    perm.attendance?.view !== undefined ? perm.attendance.view === true : hasMod("attendance");
  const canViewPayroll =
    perm.payroll?.view !== undefined ? perm.payroll.view === true : hasMod("payroll");
  const canViewProjects =
    perm.projects?.view !== undefined ? perm.projects.view === true : hasMod("projects");
  const canViewReports =
    perm.reports?.view !== undefined ? perm.reports.view === true : hasMod("reports");

  if (userRole === "HR") {
    return {
      tasks: {
        view: canViewTasks,
        create: perm.tasks?.create !== undefined ? perm.tasks.create === true : true,
        edit: perm.tasks?.edit !== undefined ? perm.tasks.edit === true : true,
        shift: perm.tasks?.shift !== undefined ? perm.tasks.shift === true : true,
        cancel: perm.tasks?.cancel !== undefined ? perm.tasks.cancel === true : true,
        reopen: perm.tasks?.reopen !== undefined ? perm.tasks.reopen === true : true,
      },
      leaves: {
        view: canViewLeaves,
        approveReject: perm.leaves?.approveReject !== undefined ? perm.leaves.approveReject === true : true,
      },
      teamMembers: {
        add: perm.teamMembers?.add !== undefined ? perm.teamMembers.add === true : true,
        edit: perm.teamMembers?.edit !== undefined ? perm.teamMembers.edit === true : true,
        activeInactive: perm.teamMembers?.activeInactive !== undefined ? perm.teamMembers.activeInactive === true : true,
      },
      announcementsHolidays: perm.announcementsHolidays !== undefined ? perm.announcementsHolidays === true : true,
      leads: {
        view: canViewLeads,
        create: perm.leads?.create !== undefined ? perm.leads.create === true : true,
        edit: perm.leads?.edit !== undefined ? perm.leads.edit === true : true,
        delete: perm.leads?.delete !== undefined ? perm.leads.delete === true : true,
      },
      attendance: { view: canViewAttendance, markAttendance: true },
      payroll: { view: canViewPayroll },
      projects: { view: canViewProjects },
      reports: { view: canViewReports },
    };
  }

  if (userRole === "Manager") {
    return {
      tasks: {
        view: canViewTasks,
        create: perm.tasks?.create !== undefined ? perm.tasks.create === true : true,
        edit: perm.tasks?.edit !== undefined ? perm.tasks.edit === true : true,
        shift: perm.tasks?.shift !== undefined ? perm.tasks.shift === true : true,
        cancel: perm.tasks?.cancel !== undefined ? perm.tasks.cancel === true : false,
        reopen: perm.tasks?.reopen !== undefined ? perm.tasks.reopen === true : true,
      },
      leaves: {
        view: canViewLeaves,
        approveReject: perm.leaves?.approveReject !== undefined ? perm.leaves.approveReject === true : true,
      },
      teamMembers: {
        add: perm.teamMembers?.add === true,
        edit: perm.teamMembers?.edit === true,
        activeInactive: perm.teamMembers?.activeInactive === true,
      },
      announcementsHolidays: perm.announcementsHolidays === true,
      leads: {
        view: canViewLeads,
        create: perm.leads?.create !== undefined ? perm.leads.create === true : true,
        edit: perm.leads?.edit !== undefined ? perm.leads.edit === true : true,
        delete: perm.leads?.delete !== undefined ? perm.leads.delete === true : false,
      },
      attendance: { view: canViewAttendance, markAttendance: true },
      payroll: { view: canViewPayroll },
      projects: { view: canViewProjects },
      reports: { view: canViewReports },
    };
  }

  // normal Employees:
  return {
    tasks: {
      view: canViewTasks,
      create: perm.tasks?.create === true,
      edit: perm.tasks?.edit === true,
      shift: perm.tasks?.shift === true,
      cancel: perm.tasks?.cancel === true,
      reopen: perm.tasks?.reopen === true,
    },
    leaves: {
      view: canViewLeaves,
      approveReject: perm.leaves?.approveReject === true,
    },
    teamMembers: {
      add: perm.teamMembers?.add === true,
      edit: perm.teamMembers?.edit === true,
      activeInactive: perm.teamMembers?.activeInactive === true,
    },
    announcementsHolidays: perm.announcementsHolidays === true,
    leads: {
      view: canViewLeads,
      create: perm.leads?.create === true,
      edit: perm.leads?.edit === true,
      delete: perm.leads?.delete === true,
    },
    attendance: { view: canViewAttendance, markAttendance: true },
    payroll: { view: canViewPayroll },
    projects: { view: canViewProjects },
    reports: { view: canViewReports },
  };
};

module.exports = { checkUserPermission, getUserPermissions };
