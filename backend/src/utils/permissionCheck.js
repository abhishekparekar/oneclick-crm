const Employee = require("../models/Employee");

/**
 * Checks if a user has a specific permission.
 * @param {string} userId - The user ID.
 * @param {string} companyId - The company ID.
 * @param {string} userRole - The user's role (e.g. HR, Manager, Employee, CompanyAdmin).
 * @param {string} category - The permission category ('tasks', 'leaves', 'teamMembers', 'announcementsHolidays').
 * @param {string} [action] - The specific action (e.g. 'create', 'edit', 'shift', 'cancel', 'reopen', 'add', 'activeInactive').
 * @returns {Promise<boolean>} Resolves to true if access is allowed, false otherwise.
 */
const checkUserPermission = async (userId, companyId, userRole, category, action) => {
  if (userRole === "CompanyAdmin" || userRole === "SuperAdmin") {
    return true;
  }

  const employee = await Employee.findOne({ userId, companyId }).lean();
  if (!employee) {
    return false;
  }

  const perm = employee.permissions || {};
  const hasCustomized = employee.permissions && Object.keys(perm).length > 0;

  if (hasCustomized) {
    if (action) {
      return perm[category]?.[action] === true;
    } else {
      return perm[category] === true;
    }
  }

  // Fallback to default role permissions
  if (userRole === "HR") {
    return true; // HR has all access by default
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

  // normal Employees default to false (unless explicit customized permission set)
  return false;
};

const getUserPermissions = async (userId, companyId, userRole) => {
  if (userRole === "CompanyAdmin" || userRole === "SuperAdmin") {
    return {
      tasks: { create: true, edit: true, shift: true, cancel: true, reopen: true },
      leaves: { approveReject: true },
      teamMembers: { add: true, edit: true, activeInactive: true },
      announcementsHolidays: true,
      leads: { view: true, create: true, edit: true, delete: true },
    };
  }

  const employee = await Employee.findOne({ userId, companyId }).lean();
  const perm = employee?.permissions || {};
  const hasCustomized = employee?.permissions && Object.keys(perm).length > 0;

  if (hasCustomized) {
    return {
      tasks: {
        create: perm.tasks?.create === true,
        edit: perm.tasks?.edit === true,
        shift: perm.tasks?.shift === true,
        cancel: perm.tasks?.cancel === true,
        reopen: perm.tasks?.reopen === true,
      },
      leaves: {
        approveReject: perm.leaves?.approveReject === true,
      },
      teamMembers: {
        add: perm.teamMembers?.add === true,
        edit: perm.teamMembers?.edit === true,
        activeInactive: perm.teamMembers?.activeInactive === true,
      },
      announcementsHolidays: perm.announcementsHolidays === true,
      leads: {
        view: perm.leads?.view === true || perm.leads === true,
        create: perm.leads?.create === true,
        edit: perm.leads?.edit === true,
        delete: perm.leads?.delete === true,
      },
    };
  }

  // Fallback to default role permissions
  if (userRole === "HR") {
    return {
      tasks: { create: true, edit: true, shift: true, cancel: true, reopen: true },
      leaves: { approveReject: true },
      teamMembers: { add: true, edit: true, activeInactive: true },
      announcementsHolidays: true,
      leads: { view: true, create: true, edit: true, delete: true },
    };
  }

  if (userRole === "Manager") {
    return {
      tasks: { create: true, edit: true, shift: true, cancel: false, reopen: true },
      leaves: { approveReject: true },
      teamMembers: { add: false, edit: false, activeInactive: false },
      announcementsHolidays: false,
      leads: { view: true, create: true, edit: true, delete: false },
    };
  }

  // normal Employees default to false
  return {
    tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false },
    leaves: { approveReject: false },
    teamMembers: { add: false, edit: false, activeInactive: false },
    announcementsHolidays: false,
    leads: { view: false, create: false, edit: false, delete: false },
  };
};

module.exports = { checkUserPermission, getUserPermissions };
