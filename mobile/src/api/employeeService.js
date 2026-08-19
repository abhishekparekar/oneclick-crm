import api from "./api";

export const getMyEmployeeApi = () => api.get("/company/employees/me");

export const getEmployeeDashboardApi = (params = {}) => api.get("/employee/dashboard-summary", { params });
export const getEmployeeDashboardSummaryApi = (params = {}) => api.get("/employee/dashboard-summary", { params });

export const getEmployeesApi = (params = {}) =>
  api.get("/company/employees", { params });

export const getEmployeeByIdApi = (id) => api.get(`/company/employees/${id}`);

export const createEmployeeApi = (data) => api.post("/company/employees", data);

export const updateEmployeeApi = (id, data) =>
  api.put(`/company/employees/${id}`, data);

export const patchEmployeeStatusApi = (id, status) =>
  api.patch(`/company/employees/${id}/status`, { status });

export const deleteEmployeeApi = (id) => api.delete(`/company/employees/${id}`);

// Self-Service Profile APIs
export const getMyProfileApi = () => api.get("/employee/my-profile");
export const getMyProfileForEditApi = () => api.get("/employee/my-profile/edit");
export const saveProfileDraftApi = (data) => api.put("/employee/profile-draft", data);
export const completeProfileApi = (data) => api.put("/employee/complete-profile", data);
export const updateSelfProfileApi = (data) => api.put("/employee/update-profile", data);
export const changePasswordApi = (data) => api.put("/employee/change-password", data);
