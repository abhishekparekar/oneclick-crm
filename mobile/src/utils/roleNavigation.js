import CompanyNavigator from "../navigation/CompanyNavigator";
import EmployeeNavigator from "../navigation/EmployeeNavigator";
import SuperAdminNavigator from "../navigation/SuperAdminNavigator";
import HRNavigator from "../navigation/HRNavigator";
import ManagerNavigator from "../navigation/ManagerNavigator";

// Normalized role → Navigator map (all keys lowercase for case-insensitive lookup)
const ROLE_NAVIGATORS_MAP = {
  superadmin: SuperAdminNavigator,
  companyadmin: CompanyNavigator,
  hr: HRNavigator,
  manager: ManagerNavigator,
  employee: EmployeeNavigator,
};

// Normalized role → dashboard route name
const ROLE_ROUTES_MAP = {
  superadmin: "SuperAdminDashboard",
  companyadmin: "CompanyDashboard",
  hr: "HRStack",
  manager: "ManagerDashboard",
  employee: "EmployeeDashboard",
};

/**
 * Returns the correct Navigator component for a given role string.
 * Case-insensitive — handles "HR", "hr", "Hr" all the same.
 */
export const getNavigatorForRole = (role) => {
  if (!role) return null;
  return ROLE_NAVIGATORS_MAP[role.toLowerCase()] || null;
};

/**
 * Returns the dashboard screen route name for a given role string.
 * Case-insensitive.
 */
export const getDashboardRouteForRole = (role) => {
  if (!role) return "Login";
  return ROLE_ROUTES_MAP[role.toLowerCase()] || "Login";
};

// Keep named exports for any code that directly reads these maps
export const ROLE_NAVIGATORS = {
  SuperAdmin: SuperAdminNavigator,
  CompanyAdmin: CompanyNavigator,
  HR: HRNavigator,
  Manager: ManagerNavigator,
  Employee: EmployeeNavigator,
};

export const ROLE_ROUTES = {
  SuperAdmin: "SuperAdminDashboard",
  CompanyAdmin: "CompanyDashboard",
  HR: "HRStack",
  Manager: "ManagerDashboard",
  Employee: "EmployeeDashboard",
};
