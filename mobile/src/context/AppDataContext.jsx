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
  const userRef = useRef(user);
  userRef.current = user;
  const employeesRef = useRef(employees);
  employeesRef.current = employees;
  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;
  const dashboardStatsRef = useRef(dashboardStats);
  dashboardStatsRef.current = dashboardStats;
  const employeeDashboardRef = useRef(employeeDashboard);
  employeeDashboardRef.current = employeeDashboard;

  const [loading, setLoading] = useState({
    user: false,
    employees: false,
    attendance: false,
    dashboardStats: false,
    employeeDashboard: false,
  });
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  
  const [error, setError] = useState({
    user: null,
    employees: null,
    attendance: null,
    dashboardStats: null,
    employeeDashboard: null,
  });

  const prevUserIdRef = useRef(null);

  useEffect(() => {
    const currentUserId = authUser?._id || authUser?.id || null;
    if (currentUserId) {
      setUser(authUser);
      if (prevUserIdRef.current && prevUserIdRef.current !== currentUserId) {
        setEmployees([]);
        setAttendance(null);
        setDashboardStats(null);
        setEmployeeDashboard(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.clear();
        }
      }
      prevUserIdRef.current = currentUserId;
    } else {
      setUser(null);
      setEmployees([]);
      setAttendance(null);
      setDashboardStats(null);
      setEmployeeDashboard(null);
      prevUserIdRef.current = null;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }
    }
  }, [authUser]);

  const fetchUserData = useCallback(async (force = false) => {
    if (loadingRef.current.user) return;
    if (!force && userRef.current) return userRef.current;
    
    setLoading(prev => ({ ...prev, user: true }));
    setError(prev => ({ ...prev, user: null }));
    try {
      const data = await getCurrentUser();
      setUser(data);
      return data;
    } catch (err) {
      setError(prev => ({ ...prev, user: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, user: false }));
    }
  }, []);

  const fetchEmployeesData = useCallback(async (force = false, params = {}) => {
    if (loadingRef.current.employees) return;
    if (!force && employeesRef.current.length > 0) return employeesRef.current;
    
    setLoading(prev => ({ ...prev, employees: true }));
    setError(prev => ({ ...prev, employees: null }));
    try {
      const data = await getEmployees(params);
      setEmployees(data);
      return data;
    } catch (err) {
      setError(prev => ({ ...prev, employees: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  }, []);

  const fetchAttendanceData = useCallback(async (force = false, params = {}) => {
    if (loadingRef.current.attendance) return;
    if (!force && attendanceRef.current) return attendanceRef.current;
    
    setLoading(prev => ({ ...prev, attendance: true }));
    setError(prev => ({ ...prev, attendance: null }));
    try {
      const data = await getAttendance(params);
      setAttendance(data);
      return data;
    } catch (err) {
      setError(prev => ({ ...prev, attendance: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, attendance: false }));
    }
  }, []);

  const fetchDashboardStatsData = useCallback(async (force = false) => {
    if (loadingRef.current.dashboardStats) return;
    if (!force && dashboardStatsRef.current) return dashboardStatsRef.current;
    
    setLoading(prev => ({ ...prev, dashboardStats: true }));
    setError(prev => ({ ...prev, dashboardStats: null }));
    try {
      const data = await getDashboardStats();
      setDashboardStats(data);
      return data;
    } catch (err) {
      setError(prev => ({ ...prev, dashboardStats: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, dashboardStats: false }));
    }
  }, []);

  const refreshUser = useCallback(() => fetchUserData(true), [fetchUserData]);
  const refreshEmployees = useCallback((params) => fetchEmployeesData(true, params), [fetchEmployeesData]);
  const refreshAttendance = useCallback((params) => fetchAttendanceData(true, params), [fetchAttendanceData]);
  const refreshDashboardStats = useCallback(() => fetchDashboardStatsData(true), [fetchDashboardStatsData]);

  const getEmployeesCached = useCallback(async (force = false, params = {}) => {
    if (force || employeesRef.current.length === 0) {
      await fetchEmployeesData(force, params);
    }
    return employeesRef.current;
  }, [fetchEmployeesData]);

  const getAttendanceCached = useCallback(async (force = false, params = {}) => {
    if (force || !attendanceRef.current) {
      await fetchAttendanceData(force, params);
    }
    return attendanceRef.current;
  }, [fetchAttendanceData]);

  const getDashboardStatsCached = useCallback(async (force = false) => {
    if (force || !dashboardStatsRef.current) {
      await fetchDashboardStatsData(force);
    }
    return dashboardStatsRef.current;
  }, [fetchDashboardStatsData]);

  const fetchEmployeeDashboardData = useCallback(async (force = false, params = {}) => {
    if (isFetchingDash.current && !force) return employeeDashboardRef.current;
    isFetchingDash.current = true;
    if (!employeeDashboardRef.current) {
      setLoading((prev) => ({ ...prev, employeeDashboard: true }));
    }
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
  }, []);

  const refreshEmployeeDashboard = useCallback((params = {}) => fetchEmployeeDashboardData(true, params), [fetchEmployeeDashboardData]);

  const getEmployeeDashboardCached = useCallback(async (force = false, params = {}) => {
    if (force || !employeeDashboardRef.current) {
      return await fetchEmployeeDashboardData(force, params);
    }
    return employeeDashboardRef.current;
  }, [fetchEmployeeDashboardData]);

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
