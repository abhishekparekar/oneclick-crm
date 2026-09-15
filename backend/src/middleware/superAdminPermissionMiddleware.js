/**
 * SuperAdmin Permission Enforcement Middleware
 * 
 * SuperAdmin is the source of truth and bypasses all permission checks.
 * SubSuperAdmin permissions are checked per module and action:
 * - view / read
 * - create / add
 * - edit / update
 * - delete
 */

const normalizeAction = (action) => {
  if (!action) return "view";
  const a = String(action).toLowerCase().trim();
  if (a === "read" || a === "view") return "view";
  if (a === "create" || a === "add") return "create";
  if (a === "edit" || a === "update" || a === "patch") return "edit";
  if (a === "delete" || a === "remove") return "delete";
  return a;
};

const checkSuperAdminPermission = (moduleName, requiredAction = "view") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const role = req.user.role;

    // SuperAdmin is the source of truth — full unconstrained access
    if (role === "SuperAdmin") {
      return next();
    }

    // SubSuperAdmin check
    if (role === "SubSuperAdmin") {
      const perms = req.user.permissions || {};
      const modPerm = perms[moduleName];

      if (!modPerm) {
        return res.status(403).json({
          message: `Access denied: No permissions configured for module "${moduleName}".`,
        });
      }

      const normAction = normalizeAction(requiredAction);

      let isAllowed = false;
      if (normAction === "view") {
        isAllowed = Boolean(modPerm.view || modPerm.read);
      } else if (normAction === "create") {
        isAllowed = Boolean(modPerm.create || modPerm.add);
      } else if (normAction === "edit") {
        isAllowed = Boolean(modPerm.edit || modPerm.update);
      } else if (normAction === "delete") {
        isAllowed = Boolean(modPerm.delete);
      } else {
        isAllowed = Boolean(modPerm[normAction]);
      }

      if (!isAllowed) {
        return res.status(403).json({
          message: `Permission denied: You do not have "${normAction}" permission for module "${moduleName}".`,
        });
      }

      return next();
    }

    return res.status(403).json({ message: "Forbidden: SuperAdmin or SubSuperAdmin privileges required" });
  };
};

module.exports = { checkSuperAdminPermission };
