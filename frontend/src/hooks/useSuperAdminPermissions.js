import { useAuth } from "../context/AuthContext";
import { useCallback } from "react";

export const SUPERADMIN_MODULES = [
  { key: "companies", label: "All Companies", desc: "Manage registered companies, branches, & profiles" },
  { key: "companyRequests", label: "Web Company Registrations", desc: "Review website registration requests & lead inquiries" },
  { key: "companyAdmins", label: "All Admins Details", desc: "Manage company primary administrators & account owners" },
  { key: "subscriptions", label: "Subscriptions", desc: "Client subscriptions, renewals, & trial extensions" },
  { key: "plans", label: "Subscription Plans", desc: "Subscription pricing tiers, packages, & feature quotas" },
  { key: "payments", label: "Payment Records", desc: "Payment records, manual invoices, and transactions" },
  { key: "users", label: "All Users", desc: "Platform-wide user directory, status & account management" },
  { key: "announcements", label: "Announcements", desc: "System-wide broadcasts, notices & alerts" },
  { key: "supportTickets", label: "Support Tickets", desc: "Customer service inquiries, complaints & internal notes" },
  { key: "reports", label: "Reports & Analytics", desc: "System performance, telemetry & business intelligence" },
  { key: "activityLogs", label: "Activity Logs", desc: "Security audit trail, authentication history & logs" },
  { key: "settings", label: "Settings", desc: "Platform settings, configurations & system preferences" },
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
