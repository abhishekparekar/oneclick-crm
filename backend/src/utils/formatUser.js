/**
 * Normalizes a user document (new or legacy schema) into a clean, consistent
 * shape before sending it to the frontend.
 *
 * Legacy fields handled:
 *   full_name  → name
 *   company_id → companyId
 *   is_active  → isActive
 *   role       → normalized to proper case (hr→HR, companyadmin→CompanyAdmin, etc.)
 */

const ROLE_MAP = {
  superadmin: "SuperAdmin",
  companyadmin: "CompanyAdmin",
  hr: "HR",
  manager: "Manager",
  employee: "Employee",
};

const normalizeRole = (role) => {
  if (!role) return role;
  // Already correct casing — return as-is if it matches a known valid role
  const valid = ["SuperAdmin", "CompanyAdmin", "HR", "Manager", "Employee"];
  if (valid.includes(role)) return role;
  // Try case-insensitive lookup in the map
  return ROLE_MAP[role.toLowerCase()] || role;
};

const formatUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };

  // Remove sensitive fields
  delete obj.password;

  // ── Normalize legacy field: full_name → name ──────────────────────────────
  if (!obj.name && obj.full_name) {
    obj.name = obj.full_name;
  }
  // Keep full_name out of the payload (not needed by frontend)
  delete obj.full_name;

  // ── Normalize legacy field: company_id → companyId ────────────────────────
  if (!obj.companyId && obj.company_id) {
    obj.companyId = obj.company_id;
  }
  delete obj.company_id;

  // ── Normalize legacy field: is_active → isActive ──────────────────────────
  if (obj.isActive === undefined && obj.is_active !== undefined) {
    obj.isActive = obj.is_active;
  }
  delete obj.is_active;

  // ── Normalize role casing ─────────────────────────────────────────────────
  obj.role = normalizeRole(obj.role);

  // ── Ensure isPasswordResetRequired exists ─────────────────────────────────
  if (obj.isPasswordResetRequired === undefined) {
    obj.isPasswordResetRequired = false;
  }

  // ── Ensure assignedModules exists ─────────────────────────────────────────
  if (!Array.isArray(obj.assignedModules) || obj.assignedModules.length === 0) {
    obj.assignedModules = ["attendance", "leave", "tasks", "leads", "payroll", "projects", "reports"];
  }

  return obj;
};

module.exports = formatUser;
