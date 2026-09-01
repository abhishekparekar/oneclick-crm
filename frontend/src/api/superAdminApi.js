import api from "./api";

// Dashboard
export const getSuperAdminDashboardStatsApi = (params) => api.get("/superadmin/dashboard/stats", { params });
export const getSuperAdminReportsApi = (params) => api.get("/superadmin/reports/analytics", { params });

// Companies & Admins
export const getCompaniesApi = (params) => api.get("/superadmin/companies", { params });
export const getCompanyByIdApi = (id) => api.get(`/superadmin/companies/${id}`);
export const createCompanyApi = (data) => api.post("/superadmin/companies", data);
export const updateCompanyApi = (id, data) => api.put(`/superadmin/companies/${id}`, data);
export const deleteCompanyApi = (id) => api.delete(`/superadmin/companies/${id}`);
export const updateCompanyStatusApi = (id, status) => api.patch(`/superadmin/companies/${id}/status`, { status });

export const getCompanyAdminsApi = (params) => api.get("/superadmin/company-admins", { params });
export const createCompanyAdminApi = (data) => api.post("/superadmin/company-admins", data);
export const makePrimaryAdminApi = (id) => api.patch(`/superadmin/company-admins/${id}/make-primary`);
export const deleteCompanyAdminApi = (id) => api.delete(`/superadmin/company-admins/${id}`);

// Plans
export const getPlansApi = () => api.get("/superadmin/plans");
export const getPlanByIdApi = (id) => api.get(`/superadmin/plans/${id}`);
export const createPlanApi = (data) => api.post("/superadmin/plans", data);
export const updatePlanApi = (id, data) => api.put(`/superadmin/plans/${id}`, data);
export const updatePlanStatusApi = (id, status) => api.patch(`/superadmin/plans/${id}/status`, { status });
export const deletePlanApi = (id) => api.delete(`/superadmin/plans/${id}`);

// Subscriptions
export const getSubscriptionsApi = (params) => api.get("/superadmin/subscriptions", { params });
export const assignSubscriptionApi = (data) => api.post("/superadmin/subscriptions/assign", data);
export const updateSubscriptionApi = (id, data) => api.put(`/superadmin/subscriptions/${id}`, data);
export const renewSubscriptionApi = (id) => api.patch(`/superadmin/subscriptions/${id}/renew`);
export const cancelSubscriptionApi = (id) => api.patch(`/superadmin/subscriptions/${id}/cancel`);
export const extendTrialApi = (id, days) => api.patch(`/superadmin/subscriptions/${id}/extend-trial`, { days });
export const deleteSubscriptionApi = (id) => api.delete(`/superadmin/subscriptions/${id}`);

// Payments
export const getPaymentsApi = (params) => api.get("/superadmin/payments", { params });
export const createManualPaymentApi = (data) => api.post("/superadmin/payments/manual", data);
export const updatePaymentStatusApi = (id, status) => api.patch(`/superadmin/payments/${id}/status`, { status });

// Users
export const getGlobalUsersApi = (params) => api.get("/superadmin/users", { params });
export const getUserByIdApi = (id) => api.get(`/superadmin/users/${id}`);
export const updateUserStatusApi = (id, status) => api.patch(`/superadmin/users/${id}/status`, { status });
export const resetUserPasswordApi = (id) => api.patch(`/superadmin/users/${id}/reset-password`);
export const forceLogoutUserApi = (id) => api.patch(`/superadmin/users/${id}/force-logout`);

// Support Tickets
export const getSupportTicketsApi = (params) => api.get("/superadmin/support-tickets", { params });
export const getSupportTicketByIdApi = (id) => api.get(`/superadmin/support-tickets/${id}`);
export const updateSupportTicketStatusApi = (id, status) => api.patch(`/superadmin/support-tickets/${id}/status`, { status });
export const replyToSupportTicketApi = (id, message) => api.post(`/superadmin/support-tickets/${id}/reply`, { message });
export const addInternalNoteSupportTicketApi = (id, note) => api.post(`/superadmin/support-tickets/${id}/internal-note`, { note });

// Announcements
export const getAnnouncementsApi = (params) => api.get("/superadmin/announcements", { params });
export const createAnnouncementApi = (data) => api.post("/superadmin/announcements", data);
export const getAnnouncementByIdApi = (id) => api.get(`/superadmin/announcements/${id}`);
export const updateAnnouncementApi = (id, data) => api.put(`/superadmin/announcements/${id}`, data);
export const publishAnnouncementApi = (id) => api.patch(`/superadmin/announcements/${id}/publish`);
export const cancelAnnouncementApi = (id) => api.patch(`/superadmin/announcements/${id}/cancel`);
export const deleteAnnouncementApi = (id) => api.delete(`/superadmin/announcements/${id}`);

// Logs & History
export const getAuditLogsApi = (params) => api.get("/superadmin/audit-logs", { params });
export const getLoginHistoryApi = (params) => api.get("/superadmin/login-history", { params });

// System Settings & Backups
export const getSystemSettingsApi = () => api.get("/superadmin/settings");
export const updateSystemSettingsApi = (data) => api.put("/superadmin/settings", data);
export const getBackupsApi = () => api.get("/superadmin/backups");

// Company Requests
export const getCompanyRequestsApi = (params) => api.get("/superadmin/company-requests", { params });
export const createCompanyRequestApi = (data) => api.post("/superadmin/company-requests", data);
export const getCompanyRequestByIdApi = (id) => api.get(`/superadmin/company-requests/${id}`);
export const updateCompanyRequestApi = (id, data) => api.put(`/superadmin/company-requests/${id}`, data);
export const updateCompanyRequestStatusApi = (id, data) => api.patch(`/superadmin/company-requests/${id}/status`, data);
export const addCompanyRequestNoteApi = (id, note) => api.post(`/superadmin/company-requests/${id}/notes`, { note });
export const convertCompanyRequestApi = (id, data) => api.post(`/superadmin/company-requests/${id}/convert`, data);
export const deleteCompanyRequestApi = (id) => api.delete(`/superadmin/company-requests/${id}`);

// Company Subscription Requests (SaaS Plan Upgrades, Seat Extensions, Renewals)
export const getSuperAdminSubscriptionRequestsApi = (params) => api.get("/superadmin/subscription-requests", { params });
export const updateSubscriptionRequestStatusApi = (id, data) => api.patch(`/superadmin/subscription-requests/${id}/status`, data);