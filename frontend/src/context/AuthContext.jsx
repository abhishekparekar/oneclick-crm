import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, registerCompany as apiRegisterCompany } from "../api/authApi";
import { getTodayPendingUpdatesApi } from "../api/companyAdminApi";
import DailyReportModal from "../components/tasks/DailyReportModal";
import ForcePasswordResetModal from "../components/auth/ForcePasswordResetModal";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Logout Blocker States
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await getMe();
          if (res.success) {
            setUser(res.user);
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Auth init failed", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const res = await apiLogin(credentials);
      if (res.success) {
        if (!["SuperAdmin", "CompanyAdmin", "HR", "Manager", "Employee"].includes(res.user.role)) {
          throw new Error("Unauthorized access. Invalid user role.");
        }
        localStorage.setItem("token", res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || "Login failed");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      throw new Error(errorMessage);
    }
  };

  const register = async (data) => {
    try {
      const res = await apiRegisterCompany(data);
      if (res.success) {
        localStorage.setItem("token", res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || "Registration failed");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      throw new Error(errorMessage);
    }
  };

  const executeLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsLogoutPending(false);
    setPendingTasks([]);
  };

  const logout = async () => {
    // Intercept logout to check for pending daily reports
    if (!user) return executeLogout();
    
    try {
      const res = await getTodayPendingUpdatesApi();
      if (res.data && res.data.data && res.data.data.length > 0) {
        // Block logout, show modal
        setPendingTasks(res.data.data);
        setIsLogoutPending(true);
      } else {
        // No pending updates, proceed
        executeLogout();
      }
    } catch (err) {
      console.error("Failed to check pending updates before logout", err);
      executeLogout(); // Fallback if API fails
    }
  };

  const normalizeModule = (category) => {
    if (!category) return "";
    const cat = String(category).toLowerCase().trim();
    if (cat === "leave" || cat === "leaves") return "leave";
    if (cat === "lead" || cat === "leads") return "leads";
    if (cat === "task" || cat === "tasks") return "tasks";
    if (cat === "project" || cat === "projects") return "projects";
    if (cat === "report" || cat === "reports") return "reports";
    if (cat === "attendance") return "attendance";
    if (cat === "payroll" || cat === "payslips") return "payroll";
    return cat;
  };

  const hasPermission = (category, action) => {
    if (!user) return false;
    const roleLower = (user.role || "").toLowerCase();
    if (roleLower === "superadmin") return true;

    const normMod = normalizeModule(category);
    if (!normMod) return true;

    // 1. Check Company Active Subscription Plan Modules (Plan-Level Access)
    const rawSubscribed = 
      user.company?.subscribedModules ?? 
      user.subscribedModules ?? 
      (typeof user.companyId === "object" && user.companyId !== null ? user.companyId.subscribedModules : null);

    if (Array.isArray(rawSubscribed)) {
      const subscribed = rawSubscribed.map(normalizeModule);
      if (!subscribed.includes(normMod)) {
        return false; // Company did not purchase this module in their plan!
      }
    }

    // CompanyAdmin has full access to all company subscribed modules
    if (roleLower === "companyadmin" || roleLower === "admin") return true;

    // 2. Check Employee/Manager/HR Assigned Modules Quota (Seat-Level Access)
    const rawAssigned = 
      user.assignedModules ?? 
      user.employee?.assignedModules ?? 
      (typeof user.employee === "object" && user.employee !== null ? user.employee.assignedModules : null);

    if (Array.isArray(rawAssigned)) {
      const assigned = rawAssigned.map(normalizeModule);
      if (!assigned.includes(normMod)) {
        return false; // Not assigned to this specific employee/manager/HR!
      }
    }

    const perm = user.permissions || {};
    const catPerm = perm[category] || perm[category?.toLowerCase()] || (normMod ? perm[normMod] : undefined);
    
    if (catPerm !== undefined) {
      if (action) {
        return catPerm[action] === true || (action === "view" && (catPerm === true || catPerm.read === true || catPerm.view === true));
      } else {
        return catPerm === true || (typeof catPerm === "object" && Object.values(catPerm).some(v => v === true));
      }
    }
    
    // Fallback defaults by role (if module is allowed by subscription & assignment)
    if (roleLower === "hr") return true;
    if (roleLower === "manager") {
      if (normMod === "tasks" && action === "cancel") return false;
      if (normMod === "leads" && action === "delete") return false;
      return true;
    }
    if (roleLower === "employee" || roleLower === "team member") {
      if (["attendance", "leave", "payroll", "projects", "tasks", "leads", "reports"].includes(normMod)) return true;
    }
    return false;
  };

  const syncCompanyProfile = (companyData) => {
    if (!companyData) return;
    setUser(prev => {
      if (!prev) return prev;
      const nextSubs = Array.isArray(companyData.subscribedModules) ? companyData.subscribedModules : prev.subscribedModules;
      return {
        ...prev,
        subscribedModules: nextSubs,
        company: {
          ...(prev.company || {}),
          ...companyData,
          subscribedModules: nextSubs,
        }
      };
    });
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, syncCompanyProfile, hasPermission }}>
      {children}
      
      {/* First-Time Login Password Reset Modal */}
      <ForcePasswordResetModal
        isOpen={Boolean(user?.isPasswordResetRequired)}
        user={user}
        onPasswordSet={(updated) => updateUser(updated)}
        onLogout={executeLogout}
      />

      {/* End of Day Report Blocker */}
      <DailyReportModal 
        isOpen={isLogoutPending} 
        onClose={() => setIsLogoutPending(false)} 
        tasks={pendingTasks} 
        onCompleteAll={executeLogout}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: false,
      login: async () => {},
      logout: () => {},
      register: async () => {},
      updateUser: () => {},
      hasPermission: () => false,
    };
  }
  return context;
};
