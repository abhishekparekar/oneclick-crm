import { Navigate, Outlet } from "react-router-dom";
import useSuperAdminPermissions from "../../hooks/useSuperAdminPermissions";
import { ShieldAlert } from "lucide-react";

const SuperAdminModuleRoute = ({ module, children }) => {
  const { isSuperAdmin, canView } = useSuperAdminPermissions();

  if (isSuperAdmin) {
    return children ? children : <Outlet />;
  }

  if (!canView(module)) {
    return (
      <div className="py-20 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-sm">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-sa-text">Access Restricted</h2>
        <p className="text-sm text-sa-text-secondary mt-2 mb-6">
          Your Sub-SuperAdmin account has not been granted access to this module. Please contact the primary SuperAdmin if you require access.
        </p>
        <Navigate to="/superadmin/dashboard" replace />
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default SuperAdminModuleRoute;
