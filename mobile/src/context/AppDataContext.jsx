import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";
import { 
  getCurrentUser, 
  getEmployees, 
  getAttendance, 
  getDashboardStats,
  getEmployeeDashboard
} from "../services/api";

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [employeeDashboard, setEmployeeDashboard] = useState(null);

  const isFetchingDash = useRef(false);

  const [loading, setLoading] = useState({
    user: false,
    employees: false,
    attendance: false,
    dashboardStats: false,
    employeeDashboard: false,
  });
  
  const [error, setError] = useState({
    user: null,
    employees: null,
    attendance: null,
    dashboardStats: null,
    employeeDashboard: null,
  });

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    } else {
      setUser(null);
      setEmployees([]);
      setAttendance(null);
      setDashboardStats(null);
      setEmployeeDashboard(null);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
    }
  }, [authUser]);

  const fetchUserData = useCallback(async (force = false) => {
    if (loading.user) return;
    if (!force && user) return;
    
    setLoading(prev => ({ ...prev, user: true }));
    setError(prev => ({ ...prev, user: null }));
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      setError(prev => ({ ...prev, user: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, user: false }));
    }
  }, [loading.user, user]);

  const fetchEmployeesData = useCallback(async (force = false, params = {}) => {
    if (loading.employees) return;
    if (!force && employees.length > 0) return;
    
    setLoading(prev => ({ ...prev, employees: true }));
    setError(prev => ({ ...prev, employees: null }));
    try {
      const data = await getEmployees(params);
      setEmployees(data);
    } catch (err) {
      setError(prev => ({ ...prev, employees: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  }, [loading.employees, employees]);

  const fetchAttendanceData = useCallback(async (force = false, params = {}) => {
    if (loading.attendance) return;
    if (!force && attendance) return;
    
    setLoading(prev => ({ ...prev, attendance: true }));
    setError(prev => ({ ...prev, attendance: null }));
    try {
      const data = await getAttendance(params);
      setAttendance(data);
    } catch (err) {
      setError(prev => ({ ...prev, attendance: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, attendance: false }));
    }
  }, [loading.attendance, attendance]);

  const fetchDashboardStatsData = useCallback(async (force = false) => {
    if (loading.dashboardStats) return;
    if (!force && dashboardStats) return;
    
    setLoading(prev => ({ ...prev, dashboardStats: true }));
    setError(prev => ({ ...prev, dashboardStats: null }));
    try {
      const data = await getDashboardStats();
      setDashboardStats(data);
    } catch (err) {
      setError(prev => ({ ...prev, dashboardStats: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, dashboardStats: false }));
    }
  }, [loading.dashboardStats, dashboardStats]);

  const refreshUser = useCallback(() => fetchUserData(true), [fetchUserData]);
  const refreshEmployees = useCallback((params) => fetchEmployeesData(true, params), [fetchEmployeesData]);
  const refreshAttendance = useCallback((params) => fetchAttendanceData(true, params), [fetchAttendanceData]);
  const refreshDashboardStats = useCallback(() => fetchDashboardStatsData(true), [fetchDashboardStatsData]);

  const getEmployeesCached = useCallback(async (force = false, params = {}) => {
    if (force || employees.length === 0) {
      await fetchEmployeesData(force, params);
    }
    return employees;
  }, [employees, fetchEmployeesData]);

  const getAttendanceCached = useCallback(async (force = false, params = {}) => {
    if (force || !attendance) {
      await fetchAttendanceData(force, params);
    }
    return attendance;
  }, [attendance, fetchAttendanceData]);

  const getDashboardStatsCached = useCallback(async (force = false) => {
    if (force || !dashboardStats) {
      await fetchDashboardStatsData(force);
    }
    return dashboardStats;
  }, [dashboardStats, fetchDashboardStatsData]);

  const fetchEmployeeDashboardData = useCallback(async (force = false, params = {}) => {
    if (isFetchingDash.current && !force) return employeeDashboard;
    isFetchingDash.current = true;
    setLoading((prev) => ({ ...prev, employeeDashboard: true }));
    setError((prev) => ({ ...prev, employeeDashboard: null }));
    try {
      if (force && typeof sessionStorage !== "undefined") {
        const cacheKey = `employeeDashboard_${JSON.stringify(params)}`;
        const timestampKey = `employeeDashboard_timestamp_${JSON.stringify(params)}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(timestampKey);
      }
      const data = await getEmployeeDashboard(params);
      setEmployeeDashboard(data);
      return data;
    } catch (err) {
      setError((prev) => ({ ...prev, employeeDashboard: err.message }));
      throw err;
    } finally {
      isFetchingDash.current = false;
      setLoading((prev) => ({ ...prev, employeeDashboard: false }));
    }
  }, [employeeDashboard]);

  const refreshEmployeeDashboard = useCallback((params = {}) => fetchEmployeeDashboardData(true, params), [fetchEmployeeDashboardData]);

  const getEmployeeDashboardCached = useCallback(async (force = false, params = {}) => {
    if (force || !employeeDashboard) {
      return await fetchEmployeeDashboardData(force, params);
    }
    return employeeDashboard;
  }, [employeeDashboard, fetchEmployeeDashboardData]);

  const value = useMemo(() => ({
    user,
    employees,
    attendance,
    dashboardStats,
    employeeDashboard,
    loading,
    error,
    refreshUser,
    refreshEmployees,
    refreshAttendance,
    refreshDashboardStats,
    refreshEmployeeDashboard,
    getEmployeesCached,
    getAttendanceCached,
    getDashboardStatsCached,
    getEmployeeDashboardCached,
  }), [
    user,
    employees,
    attendance,
    dashboardStats,
    employeeDashboard,
    loading,
    error,
    refreshUser,
    refreshEmployees,
    refreshAttendance,
    refreshDashboardStats,
    refreshEmployeeDashboard,
    getEmployeesCached,
    getAttendanceCached,
    getDashboardStatsCached,
    getEmployeeDashboardCached,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};
