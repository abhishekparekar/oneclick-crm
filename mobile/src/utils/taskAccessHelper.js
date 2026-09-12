/**
 * Evaluates whether an employee has access to the Task module based on their role,
 * assignedModules, and explicit permissions.
 *
 * Rule:
 * 1. CompanyAdmin / SuperAdmin / Admin roles always have access.
 * 2. Employee must have "tasks" (or "task") in assignedModules (or userId.assignedModules).
 * 3. Custom permissions must not explicitly disable tasks (permissions.tasks !== false && permissions.tasks?.view !== false).
 *
 * @param {Object} emp - The employee or team member object
 * @returns {boolean} True if employee has task module access, false otherwise
 */
export const hasTaskModuleAccess = (emp) => {
  if (!emp) return false;

  // 1. Full admin roles always have access
  const role = (emp.role || emp.userId?.role || "").toLowerCase();
  if (role === "companyadmin" || role === "superadmin" || role === "admin") {
    return true;
  }

  // 2. Extract assignedModules from employee directly, userId, or nested employee object
  const rawModules =
    emp.assignedModules ||
    emp.userId?.assignedModules ||
    (typeof emp.employee === "object" && emp.employee !== null ? emp.employee.assignedModules : null);

  const modules = Array.isArray(rawModules)
    ? rawModules.map((m) => String(m).toLowerCase().trim())
    : [];

  const hasModule = modules.includes("tasks") || modules.includes("task");
  if (!hasModule) {
    return false;
  }

  // 3. Check explicit permission overrides
  const perm = emp.permissions || emp.userId?.permissions || {};
  const taskPerm = perm.tasks ?? perm.task;
  if (taskPerm === false) {
    return false;
  }
  if (typeof taskPerm === "object" && taskPerm !== null && taskPerm.view === false) {
    return false;
  }

  return true;
};
