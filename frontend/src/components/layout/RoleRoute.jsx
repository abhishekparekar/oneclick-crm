import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RoleRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect based on what role they actually are if they shouldn't be here
    if (user?.role === "SuperAdmin") return <Navigate to="/superadmin/dashboard" replace />;
    if (user?.role === "CompanyAdmin") return <Navigate to="/company/dashboard" replace />;
    if (user?.role === "Manager") return <Navigate to="/manager/dashboard" replace />;
    if (user?.role === "Employee") return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
