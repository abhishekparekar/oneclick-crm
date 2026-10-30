import api from "./api";

// Punch In / Punch Out
export const punchInApi = (payload) => api.post("/attendance/punch-in", payload);
export const punchOutApi = (payload) => api.post("/attendance/punch-out", payload);
export const validateLocationApi = (payload) => api.post("/attendance/validate-location", payload);

// Breaks: Lunch Break, Tea Break
export const startBreakApi = (payload) => api.post("/attendance/break/start", payload);
export const endBreakApi = () => api.post("/attendance/break/end", {});

// My Logs
export const getMyTodayApi = () => api.get("/attendance/my-today");
export const getMyDateApi = (date) => api.get(`/attendance/my-date/${date}`);
export const getMyMonthlyApi = (params = {}) => api.get("/attendance/my-monthly", { params });

// Regularization Requests
export const regularizationRequestApi = (payload) => api.post("/attendance/regularization", payload);

// Legacy/Compatibility
export const checkInApi = (payload) => api.post("/attendance/punch-in", payload);
export const checkOutApi = (payload) => api.post("/attendance/punch-out", payload);
export const getMyAttendanceApi = (params = {}) => api.get("/attendance/my-monthly", { params });
export const getCompanyAttendanceApi = (params = {}) => api.get("/attendance/company", { params });
export const getEmployeeAttendanceApi = (employeeId, params = {}) =>
  api.get(`/attendance/employee/${employeeId}`, { params });
