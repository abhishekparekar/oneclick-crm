const WRITER_ROLES = ["CompanyAdmin", "HR", "companyadmin", "hr"];
const LIST_ROLES = ["CompanyAdmin", "HR", "Manager", "Employee", "employee", "manager", "hr", "companyadmin"];

const canListEmployees = (req, res, next) => {
  if (!LIST_ROLES.some(r => r.toLowerCase() === (req.user?.role || "").toLowerCase())) {
    return res.status(403).json({ message: "Not authorized to list employees" });
  }
  next();
};

const canViewEmployeeDetail = (req, res, next) => {
  if (WRITER_ROLES.includes(req.user.role) || req.user.role === "Manager") {
    return next();
  }

  if (req.user.role === "Employee") {
    const targetId = req.params.id;
    const ownId = req.user.employeeId?.toString();
    if (!ownId || targetId !== ownId) {
      return res.status(403).json({ message: "You can only view your own profile" });
    }
    return next();
  }

  return res.status(403).json({ message: "Not authorized" });
};

const canMutateEmployees = (req, res, next) => {
  if (!WRITER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: "Only Company Admin or HR can modify employees" });
  }
  next();
};

const canAccessMyEmployee = (req, res, next) => {
  if (!req.user?.employeeId) {
    return res.status(404).json({ message: "No employee profile linked to this account" });
  }
  next();
};

module.exports = {
  canListEmployees,
  canViewEmployeeDetail,
  canMutateEmployees,
  canAccessMyEmployee,
  WRITER_ROLES,
  LIST_ROLES,
};
