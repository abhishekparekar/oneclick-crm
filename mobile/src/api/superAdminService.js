import api from "./api";

export const getDashboardStatsApi = () => api.get("/superadmin/dashboard/stats");

export const getCompaniesApi = (params) => api.get("/superadmin/companies", { params });

export const getCompanyByIdApi = (id) => api.get(`/superadmin/companies/${id}`);

export const createCompanyApi = (data) => api.post("/superadmin/companies", data);

export const updateCompanyApi = (id, data) =>
  api.put(`/superadmin/companies/${id}`, data);

export const updateCompanyStatusApi = (id, status) =>
  api.patch(`/superadmin/companies/${id}/status`, { status });

export const deleteCompanyApi = (id) => api.delete(`/superadmin/companies/${id}`);

export const getCompanyAdminsApi = (params) =>
  api.get("/superadmin/company-admins", { params });

export const updateUserStatusApi = (id, status) =>
  api.patch(`/superadmin/users/${id}/status`, { status });

export const getPlansApi = () => api.get("/superadmin/plans");

export const createPlanApi = (data) => api.post("/superadmin/plans", data);

export const getPlanByIdApi = (id) => api.get(`/superadmin/plans/${id}`);

export const updatePlanApi = (id, data) =>
  api.put(`/superadmin/plans/${id}`, data);

export const updatePlanStatusApi = (id, status) =>
  api.patch(`/superadmin/plans/${id}/status`, { status });

export const deletePlanApi = (id) => api.delete(`/superadmin/plans/${id}`);

export const getSubscriptionsApi = () => api.get("/superadmin/subscriptions");

export const updateSubscriptionApi = (id, data) =>
  api.put(`/superadmin/subscriptions/${id}`, data);

export const getPaymentsApi = (params) => api.get("/superadmin/payments", { params });

export const getGlobalUsersApi = (params) => api.get("/superadmin/users", { params });

export const getSupportTicketsApi = (params) =>
  api.get("/superadmin/support-tickets", { params });

export const updateSupportTicketStatusApi = (id, status) =>
  api.patch(`/superadmin/support-tickets/${id}/status`, { status });

export const createAnnouncementApi = (data) =>
  api.post("/superadmin/announcements", data);

export const getAnnouncementsApi = () => api.get("/superadmin/announcements");

export const getAuditLogsApi = () => api.get("/superadmin/audit-logs");

export const getLoginHistoryApi = () => api.get("/superadmin/login-history");

export const getSystemSettingsApi = () => api.get("/superadmin/settings");

export const updateSystemSettingsApi = (data) =>
  api.put("/superadmin/settings", data);

export const getBackupsApi = () => api.get("/superadmin/backups");
