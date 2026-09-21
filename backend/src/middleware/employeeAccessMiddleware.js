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

const canMutateEmployees = async (req, res, next) => {
  const roleLower = (req.user?.role || "").toLowerCase();
  if (WRITER_ROLES.some((r) => r.toLowerCase() === roleLower)) {
    return next();
  }

  if (roleLower === "manager") {
    try {
      let permissions = req.user?.permissions;
      if (!permissions || Object.keys(permissions).length === 0) {
        const Employee = require("../models/Employee");
        const emp = await Employee.findOne({
          $or: [
            { userId: req.user._id },
            ...(req.user.employeeId ? [{ _id: req.user.employeeId }] : []),
            { _id: req.user._id },
          ],
          companyId: req.user.companyId || req.companyId,
        }).lean();
        permissions = emp?.permissions || {};
      }

      const tm = permissions.teamMembers || {};
      const reqPath = (req.path || "").toLowerCase();
      const method = (req.method || "").toUpperCase();

      // Document upload
      if (reqPath.includes("documents/upload")) {
        if (tm.uploadDocs === true || tm.edit === true) return next();
        return res.status(403).json({ message: "Manager does not have permission to upload KYC documents" });
      }

      // Status toggle (Active / Deactivate)
      if (reqPath.includes("status")) {
        if (tm.activeInactive === true) return next();
        return res.status(403).json({ message: "Manager does not have permission to change employee status" });
      }

      // Reset password
      if (reqPath.includes("reset-password")) {
        if (tm.edit === true) return next();
        return res.status(403).json({ message: "Manager does not have permission to reset employee passwords" });
      }

      // POST /employees (Add Employee)
      if (method === "POST") {
        if (tm.add === true) return next();
        return res.status(403).json({ message: "Manager does not have permission to add employees" });
      }

      // PUT /employees/:id (Edit Employee)
      if (method === "PUT") {
        if (tm.edit === true) return next();
        return res.status(403).json({ message: "Manager does not have permission to edit employees" });
      }

      if (tm.add === true || tm.edit === true) {
        return next();
      }

      return res.status(403).json({ message: "Manager does not have permission to modify employees" });
    } catch (err) {
      console.error("[canMutateEmployees] Error checking manager permissions:", err);
      return res.status(500).json({ message: "Error verifying permissions" });
    }
  }

  return res.status(403).json({ message: "Only Company Admin, HR, or authorized Manager can modify employees" });
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
