import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../api/api";
import { isEmployeeRole } from "../utils/roleHelpers";
import { getMeApi, loginApi, registerCompanyApi } from "../api/authService";

const AuthContext = createContext(null);

const TOKEN_KEY = "hrms_token";
const USER_KEY = "hrms_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const persistAuth = async (authToken, authUser) => {
    console.log("[AuthContext] Persisting auth for user:", authUser?.email);
    await AsyncStorage.setItem(TOKEN_KEY, authToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(authUser));
    setAuthToken(authToken);
    setToken(authToken);
    setUser(authUser);
    console.log("[AuthContext] Auth persisted successfully");
  };

  const loadStoredAuth = async () => {
    console.log("[AuthContext] Loading stored auth...");
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      console.log("[AuthContext] Token found:", !!storedToken, "User found:", !!storedUser);

      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Verify in background without blocking
        getMeApi()
          .then(async ({ data }) => {
            console.log("[AuthContext] Token verified in background, user:", data.user?.email);
            setUser(data.user);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
          })
          .catch(async (error) => {
            console.warn("[AuthContext] Background token verification failed:", error.message);
            if (error.response?.status === 401) {
              console.log("[AuthContext] Clearing invalid auth");
              await clearAuthStorage();
              setToken(null);
              setUser(null);
            }
          });
      } else {
        console.log("[AuthContext] No stored token found");
      }
    } catch (error) {
      console.error("[AuthContext] Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthStorage = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setAuthToken(null);
  };

  const login = async ({ email, password }) => {
    console.log("[AuthContext] Login attempt with email:", email);
    try {
      const { data } = await loginApi(email.trim(), password);
      console.log("[AuthContext] Login successful, token received");
      await persistAuth(data.token, data.user);
      console.log("[AuthContext] User logged in:", data.user?.email);
      return { success: true, user: data.user };
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      console.error("[AuthContext] Login failed:", message);
      return { success: false, message };
    }
  };

  const register = async (data) => {
    console.log("[AuthContext] Company registration attempt:", data.email);
    try {
      const { data: res } = await registerCompanyApi(data);
      if (res.success && res.token) {
        await persistAuth(res.token, res.user);
        console.log("[AuthContext] Company registered and logged in:", res.user?.email);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || "Registration failed" };
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed. Please try again.";
      console.error("[AuthContext] Registration failed:", message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    console.log("[AuthContext] Logging out user:", user?.email);
    try {
      if (isEmployeeRole(user?.role)) {
        const api = require("../api/api").default;
        const res = await api.get("/auth/logout-check");
        if (res.data && res.data.canLogout === false) {
          const { Alert } = require("react-native");
          Alert.alert(
            "Action Required",
            res.data.message || "You have pending tasks for today. You cannot logout.",
            [{ text: "OK" }]
          );
          return { success: false, message: "Pending tasks exist." };
        }
      }
    } catch (err) {
      console.warn("[AuthContext] Logout check failed, proceeding to logout anyway", err);
    }

    await clearAuthStorage();
    setToken(null);
    setUser(null);
    console.log("[AuthContext] User logged out successfully");
    return { success: true };
  };

  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const refreshUserProfile = async () => {
    try {
      const { data } = await getMeApi();
      if (data && data.success && data.user) {
        setUser(data.user);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        console.log("[AuthContext] User profile refreshed successfully:", data.user?.email);
        return data.user;
      }
    } catch (err) {
      console.warn("[AuthContext] Failed to refresh user profile:", err.message);
    }
    return null;
  };

  const hasPermission = (category, action) => {
    if (!user) return false;
    const roleLower = (user.role || "").toLowerCase();
    if (roleLower === "companyadmin" || roleLower === "superadmin" || roleLower === "admin") return true;

    // Check company subscribed modules (if defined)
    const subscribedModules = user.company?.subscribedModules || user.subscribedModules || [];
    if (subscribedModules.length > 0 && category) {
      const catLower = category.toLowerCase();
      const normCat = catLower === "leave" ? "leaves" : catLower === "lead" ? "leads" : catLower === "task" ? "tasks" : catLower;
      const isSubscribed = subscribedModules.some(m => {
        const mLower = String(m).toLowerCase();
        return mLower === normCat || mLower === catLower;
      });
      if (!isSubscribed) return false;
    }

    // Check employee assigned modules (if defined)
    const assignedModules = user.assignedModules || user.employee?.assignedModules || [];
    if (assignedModules.length > 0 && category) {
      const catLower = category.toLowerCase();
      const normCat = catLower === "leave" ? "leaves" : catLower === "lead" ? "leads" : catLower === "task" ? "tasks" : catLower;
      const isAssigned = assignedModules.some(m => {
        const mLower = String(m).toLowerCase();
        return mLower === normCat || mLower === catLower;
      });
      if (!isAssigned) return false;
    }

    const perm = user.permissions || {};
    const catPerm = perm[category] || perm[category?.toLowerCase()] || (category === "leave" ? perm.leaves : category === "leaves" ? perm.leave : undefined);

    if (catPerm !== undefined) {
      if (action) {
        return catPerm[action] === true || (action === "view" && (catPerm === true || catPerm.read === true || catPerm.view === true));
      } else {
        return catPerm === true || (typeof catPerm === "object" && Object.values(catPerm).some(v => v === true));
      }
    }

    // Fallback defaults by role
    if (roleLower === "hr") return true;
    if (roleLower === "manager") {
      if (category === "tasks" || category === "task") {
        if (action === "cancel") return false;
        return true;
      }
      if (category === "leaves" || category === "leave") return true;
      if (category === "leads" || category === "lead") {
        if (action === "delete") return false;
        return true;
      }
      if (category === "attendance") return true;
      if (category === "projects" || category === "project") return true;
      return false;
    }
    if (roleLower === "employee" || roleLower === "team member") {
      if (category === "attendance" || category === "leaves" || category === "leave" || category === "payroll" || category === "projects") return true;
      if (category === "tasks" || category === "task") {
        return true;
      }
      if (category === "leads" || category === "lead") {
        return false;
      }
    }
    return false;
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    register,
    updateUser,
    refreshUserProfile,
    hasPermission,
  };

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    let unsubscribeTokenRefresh;
    if (token && user) {
      const initNotifications = async () => {
        const NotificationService = require("../services/NotificationService").default;
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          await NotificationService.getFCMToken(token);
          unsubscribeTokenRefresh = NotificationService.listenForTokenRefresh(token);
        }
      };
      initNotifications();
    }
    return () => {
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export { TOKEN_KEY, USER_KEY };
