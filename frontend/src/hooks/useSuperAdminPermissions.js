import { useAuth } from "../context/AuthContext";
import { useCallback } from "react";

export const SUPERADMIN_MODULES = [
  { key: "companies", label: "Companies", desc: "Manage client companies, branches, & specifications" },
  { key: "companyRequests", label: "Company Requests", desc: "Leads & onboarding company registration inquiries" },
  { key: "companyAdmins", label: "Company Admins", desc: "Assigned enterprise administrators & account owners" },
  { key: "subscriptions", label: "Subscriptions", desc: "Client subscriptions, renewals, trial extensions" },
  { key: "plans", label: "Plans & Packages", desc: "Subscription pricing tiers & feature quotas" },
  { key: "payments", label: "Payments", desc: "Payment records, manual invoices, and transactions" },
  { key: "users", label: "Global Users", desc: "Platform-wide user directory, status & security resets" },
  { key: "announcements", label: "Announcements", desc: "System-wide broadcasts and notices" },
  { key: "supportTickets", label: "Support Tickets", desc: "Customer service inquiries & internal notes" },
  { key: "reports", label: "Reports & Analytics", desc: "Executive business intelligence & telemetry" },
  { key: "activityLogs", label: "Activity Logs", desc: "Security audit trail & authentication history" },
  { key: "settings", label: "System Settings", desc: "Platform settings, integrations & database backups" },
];

export const useSuperAdminPermissions = () => {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SuperAdmin";
  const isSubSuperAdmin = user?.role === "SubSuperAdmin";

  const can = useCallback(
    (moduleName, action = "view") => {
      // SuperAdmin is the source of truth with complete unconstrained access
      if (isSuperAdmin) return true;

      // Only SubSuperAdmin has granular permission evaluation
      if (!isSubSuperAdmin) return false;

      const perms = user?.permissions || {};
      const modPerm = perms[moduleName];
      if (!modPerm) return false;

      const a = String(action).toLowerCase().trim();
      if (a === "view" || a === "read") {
        return Boolean(modPerm.view || modPerm.read);
      }
      if (a === "create" || a === "add") {
        return Boolean(modPerm.create || modPerm.add);
      }
      if (a === "edit" || a === "update") {
        return Boolean(modPerm.edit || modPerm.update);
      }
      if (a === "delete") {
        return Boolean(modPerm.delete);
      }

      return Boolean(modPerm[a]);
    },
    [isSuperAdmin, isSubSuperAdmin, user?.permissions]
  );

  const canView = useCallback((moduleName) => can(moduleName, "view"), [can]);
  const canCreate = useCallback((moduleName) => can(moduleName, "create"), [can]);
  const canEdit = useCallback((moduleName) => can(moduleName, "edit"), [can]);
  const canDelete = useCallback((moduleName) => can(moduleName, "delete"), [can]);

  return {
    isSuperAdmin,
    isSubSuperAdmin,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    modules: SUPERADMIN_MODULES,
  };
};

export default useSuperAdminPermissions;
