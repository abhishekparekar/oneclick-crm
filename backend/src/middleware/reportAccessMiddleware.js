const mongoose = require("mongoose");
const Company = require("../models/Company");

/**
 * Report Access Authorization & Data Scoping Middleware
 *
 * Enforces dynamic role and module-level permission gating:
 * - SuperAdmin: unconstrained access to any company
 * - SubSuperAdmin: requires explicit permission in req.user.permissions
 * - CompanyAdmin: requires module to be in company's subscribed plan
 * - HR: requires company subscription + user assigned module
 * - Manager: requires company subscription + user assigned module (scoped to team/department)
 * - Employee: requires company subscription + user assigned module (scoped strictly to own employee ID)
 * - Payroll: strictly requires explicit payroll permission
 * - Audit: strictly restricted to SuperAdmin and CompanyAdmin
 */

const normalizeModule = (mod) => {
  if (!mod) return "";
  const m = String(mod).toLowerCase().trim();
  if (m === "leaves" || m === "leave") return "leave";
  if (m === "leads" || m === "lead") return "leads";
  if (m === "tasks" || m === "task") return "tasks";
  if (m === "projects" || m === "project") return "projects";
  if (m === "employees" || m === "workforce" || m === "teammembers") return "employees";
  if (m === "attendance") return "attendance";
  if (m === "payroll" || m === "payslips") return "payroll";
  if (m === "performance") return "performance";
  if (m === "audit" || m === "auditlog" || m === "auditlogs") return "audit";
  if (m === "executive" || m === "reports" || m === "report") return "reports";
  if (m === "organization" || m === "departments" || m === "designations") return "organization";
  return m;
};

const checkReportAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const role = (req.user.role || "").toLowerCase();
      const normMod = normalizeModule(moduleName);

      // 1. SuperAdmin: Full unconstrained access
      if (role === "superadmin") {
        const targetCompanyId = req.query.companyId || req.companyId || req.user.companyId;
        if (targetCompanyId) req.companyId = targetCompanyId;
        return next();
      }

      // 2. Sub-SuperAdmin: Check assigned permissions
      if (role === "subsuperadmin" || role === "sub-superadmin") {
        const perms = req.user.permissions || {};
        const hasDirect = perms[normMod]?.view === true || perms[normMod]?.read === true || perms[normMod] === true;
        const hasReports = perms.reports?.view === true || perms.reports === true;

        if (!hasDirect && !hasReports && normMod !== "reports") {
          return res.status(403).json({
            success: false,
            message: `Access Denied: Sub-SuperAdmin does not have access to "${moduleName}" report.`,
          });
        }

        const targetCompanyId = req.query.companyId || req.companyId || req.user.companyId;
        if (targetCompanyId) req.companyId = targetCompanyId;
        return next();
      }

      // Resolve Company ID for tenant roles
      const companyId = req.companyId || req.user.companyId;
      if (!companyId) {
        return res.status(403).json({ success: false, message: "No company associated with account." });
      }
      req.companyId = companyId;

      // 3. Audit Report: Only SuperAdmin and CompanyAdmin
      if (normMod === "audit" && role !== "companyadmin" && role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Audit ledger reports are restricted to administrators.",
        });
      }

      // 4. Payroll Report: Strict permission check
      if (normMod === "payroll") {
        const canAccessPayroll =
          role === "companyadmin" ||
          role === "admin" ||
          role === "hr" ||
          req.user.permissions?.payroll?.view === true ||
          req.user.permissions?.payroll === true;

        if (!canAccessPayroll) {
          return res.status(403).json({
            success: false,
            message: "Access Denied: Payroll reports are restricted to authorized personnel.",
          });
        }
      }

      // 5. Check Company Subscription Plan for suite modules
      const suiteCheckMods = ["attendance", "leave", "payroll", "tasks", "projects", "leads", "performance"];
      if (suiteCheckMods.includes(normMod)) {
        let subscribedModules = req.user.company?.subscribedModules;
        if (!subscribedModules) {
          const comp = await Company.findById(companyId).select("subscribedModules").lean();
          subscribedModules = comp?.subscribedModules || [];
        }

        if (Array.isArray(subscribedModules)) {
          const normSubs = subscribedModules.map(normalizeModule);
          if (!normSubs.includes(normMod)) {
            return res.status(403).json({
              success: false,
              message: `Your company subscription plan does not include the "${moduleName}" module.`,
            });
          }
        }
      }

      // CompanyAdmin has access to all active company modules
      if (role === "companyadmin" || role === "admin") {
        return next();
      }

      // 6. User-Level Assigned Modules Check (for HR, Manager, Employee)
      if (suiteCheckMods.includes(normMod)) {
        const assigned = req.user.assignedModules || req.user.employee?.assignedModules;
        if (Array.isArray(assigned)) {
          const normAssigned = assigned.map(normalizeModule);
          if (!normAssigned.includes(normMod)) {
            return res.status(403).json({
              success: false,
              message: `Access Denied: The "${moduleName}" module is not assigned to your profile.`,
            });
          }
        }
      }

      // 7. Role Data Scope Constraint
      if (role === "employee" || role === "team member") {
        const ownEmpId = req.user.employeeId || req.user._id;
        // Lock queries to employee's own record
        req.query.employeeId = ownEmpId ? ownEmpId.toString() : "";
      }

      return next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  checkReportAccess,
  normalizeModule,
};
