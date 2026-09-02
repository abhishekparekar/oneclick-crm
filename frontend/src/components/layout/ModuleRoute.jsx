import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ModuleRoute = ({ module }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // SuperAdmin has global unrestricted access
  if (user.role === "SuperAdmin") {
    return <Outlet />;
  }

  const allowed = hasPermission(module, "view") || hasPermission(module);

  if (!allowed) {
    // Redirect to their default dashboard
    if (user.role === "CompanyAdmin") return <Navigate to="/company/dashboard" replace />;
    if (user.role === "HR") return <Navigate to="/hr/dashboard" replace />;
    if (user.role === "Manager") return <Navigate to="/manager/dashboard" replace />;
    if (user.role === "Employee") return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ModuleRoute;
