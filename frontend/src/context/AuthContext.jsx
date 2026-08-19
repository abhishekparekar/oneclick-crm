import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, registerCompany as apiRegisterCompany } from "../api/authApi";
import { getTodayPendingUpdatesApi } from "../api/companyAdminApi";
import DailyReportModal from "../components/tasks/DailyReportModal";

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

  const hasPermission = (category, action) => {
    if (!user) return false;
    if (user.role === "CompanyAdmin" || user.role === "SuperAdmin") return true;
    
    const perm = user.permissions || {};
    const hasCustomized = Object.keys(perm).length > 0;
    
    if (hasCustomized) {
      if (action) {
        return perm[category]?.[action] === true || (action === "view" && (perm[category] === true || perm[category]?.read === true));
      } else {
        return perm[category] === true || (typeof perm[category] === "object" && Object.values(perm[category]).some(v => v === true));
      }
    }
    
    // Fallback defaults
    if (user.role === "HR") return true;
    if (user.role === "Manager") {
      if (category === "tasks") {
        if (action === "cancel") return false;
        return true;
      }
      if (category === "leaves") return true;
      if (category === "leads") {
        if (action === "delete") return false;
        return true;
      }
      return false;
    }
    return false;
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser, hasPermission }}>
      {children}
      
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
