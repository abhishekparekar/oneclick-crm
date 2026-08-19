// Valid roles in the system (canonical casing)
const ROLES = ["SuperAdmin", "CompanyAdmin", "HR", "Manager", "Employee"];

/**
 * Normalizes a role string to canonical casing.
 * e.g. "hr" → "HR", "companyadmin" → "CompanyAdmin"
 */
const normalizeRole = (role) => {
  if (!role) return "";
  const map = {
    superadmin: "SuperAdmin",
    companyadmin: "CompanyAdmin",
    hr: "HR",
    manager: "Manager",
    employee: "Employee",
  };
  return map[role.toLowerCase()] || role;
};

/**
 * Middleware factory: allows only users whose role (after normalization)
 * is in the allowedRoles list.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const normalizedRole = normalizeRole(req.user.role);

    if (!allowedRoles.includes(normalizedRole)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    // Persist normalized role back onto req.user so downstream code is consistent
    req.user.role = normalizedRole;
    next();
  };
};

module.exports = { authorize, ROLES, normalizeRole };
