import api from "../api/api";
import { getMeApi } from "../api/authService";
import { getEmployeesApi, getEmployeeDashboardApi } from "../api/employeeService";
import { getMyMonthlyApi, punchInApi, punchOutApi } from "../api/attendanceService";
import { getCompanyDashboardStatsApi } from "../api/companyService";
import { updateProfileImageApi } from "../api/userService";

// Polyfill sessionStorage for native environments
if (typeof sessionStorage === "undefined") {
  const cache = {};
  global.sessionStorage = {
    getItem: (key) => cache[key] || null,
    setItem: (key, value) => { cache[key] = String(value); },
    removeItem: (key) => { delete cache[key]; },
    clear: () => {
      Object.keys(cache).forEach(key => delete cache[key]);
    }
  };
}

export const getCurrentUser = async () => {
  console.log("API CALLED: getCurrentUser");
  const cached = sessionStorage.getItem("currentUser");
  if (cached) {
    console.log("CACHE HIT: getCurrentUser");
    return JSON.parse(cached);
  }
  
  const { data } = await getMeApi();
  const user = data.user || data;
  sessionStorage.setItem("currentUser", JSON.stringify(user));
  return user;
};

export const getEmployees = async (params = {}) => {
  console.log("API CALLED: getEmployees", params);
  const cacheKey = `employees_${JSON.stringify(params)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log("CACHE HIT: getEmployees");
    return JSON.parse(cached);
  }
  
  const { data } = await getEmployeesApi(params);
  const employees = data.employees || data;
  sessionStorage.setItem(cacheKey, JSON.stringify(employees));
  return employees;
};

export const getAttendance = async (params = {}) => {
  console.log("API CALLED: getAttendance", params);
  const cacheKey = `attendance_${JSON.stringify(params)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log("CACHE HIT: getAttendance");
    return JSON.parse(cached);
  }
  
  const { data } = await getMyMonthlyApi(params);
  const attendance = data.data || data;
  sessionStorage.setItem(cacheKey, JSON.stringify(attendance));
  return attendance;
};

export const getDashboardStats = async () => {
  console.log("API CALLED: getDashboardStats");
  const cached = sessionStorage.getItem("dashboardStats");
  if (cached) {
    console.log("CACHE HIT: getDashboardStats");
    return JSON.parse(cached);
  }
  
  const { data } = await getCompanyDashboardStatsApi();
  const stats = data.stats || data;
  sessionStorage.setItem("dashboardStats", JSON.stringify(stats));
  return stats;
};

export const getEmployeeDashboard = async (params = {}) => {
  console.log("API CALLED: getEmployeeDashboard", params);
  const cacheKey = `employeeDashboard_${JSON.stringify(params)}`;
  const timestampKey = `employeeDashboard_timestamp_${JSON.stringify(params)}`;
  const cached = sessionStorage.getItem(cacheKey);
  const timestamp = sessionStorage.getItem(timestampKey);
  const now = Date.now();

  if (cached && timestamp && (now - parseInt(timestamp, 10) < 120000)) {
    console.log("CACHE HIT: getEmployeeDashboard (fresh)");
    return JSON.parse(cached);
  }
  
  try {
    const { data } = await getEmployeeDashboardApi(params);
    const dashboardData = data;
    sessionStorage.setItem(cacheKey, JSON.stringify(dashboardData));
    sessionStorage.setItem(timestampKey, String(now));
    return dashboardData;
  } catch (err) {
    if (cached) {
      console.log("CACHE FALLBACK on rate limit: getEmployeeDashboard");
      return JSON.parse(cached);
    }
    throw err;
  }
};

export const updateProfile = async (profileData) => {
  console.log("API CALLED: updateProfile");
  const { data } = await api.put("/company/profile", profileData);
  sessionStorage.removeItem("currentUser");
  return data.user || data;
};

export const uploadProfileImage = async (userId, imageUrl) => {
  console.log("API CALLED: uploadProfileImage");
  const data = await updateProfileImageApi(userId, imageUrl);
  sessionStorage.removeItem("currentUser");
  return data.user || data;
};

export const markAttendance = async (type, payload) => {
  console.log("API CALLED: markAttendance", type);
  let res;
  if (type === "in") {
    res = await punchInApi(payload);
  } else {
    res = await punchOutApi(payload);
  }
  
  // Invalidate attendance cache
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key ? sessionStorage.key(i) : Object.keys(sessionStorage)[i];
    if (key && key.startsWith("attendance_")) {
      sessionStorage.removeItem(key);
    }
  }
  sessionStorage.removeItem("dashboardStats");
  sessionStorage.removeItem("employeeDashboard");
  return res.data;
};
