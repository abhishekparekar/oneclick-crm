import api from "./api";

// ── Manager Dashboard ──────────────────────────────────────────────────────
export const getManagerDashboardApi = (params = {}) => api.get("/manager/dashboard-summary", { params });
export const getManagerDashboardStatsApi = (params = {}) => api.get("/manager/dashboard-summary", { params });

// ── Manager Tasks (My Tasks) ───────────────────────────────────────────────
export const getManagerMyTasksApi = (params = {}) => api.get("/manager/tasks/my", { params });
export const getManagerTaskByIdApi = (id) => api.get(`/manager/tasks/${id}`);
export const createManagerTaskApi = (data) => api.post("/manager/tasks", data);
export const updateManagerTaskApi = (id, data) => api.put(`/manager/tasks/${id}`, data);
export const deleteManagerTaskApi = (id) => api.delete(`/manager/tasks/${id}`);
export const updateManagerTaskStatusApi = (id, status, data = {}) =>
  api.patch(`/manager/tasks/${id}/status`, { status, ...data });
export const addManagerTaskCommentApi = (id, comment) =>
  api.post(`/manager/tasks/${id}/comments`, { comment });

// ── Manager Team Tasks ─────────────────────────────────────────────────────
export const getManagerTeamTasksApi = (params = {}) => api.get("/manager/tasks/team", { params });

// ── Manager Team ───────────────────────────────────────────────────────────
export const getManagerTeamApi = (params = {}) => api.get("/manager/team", { params });
export const getManagerTeamMemberApi = (id) => api.get(`/manager/team/${id}`);
export const getManagerTeamOrgApi = () => api.get("/manager/team-org");

// ── Manager Attendance ─────────────────────────────────────────────────────
// Manager's own attendance — use /attendance/my-monthly (Manager is authorized)
export const getManagerMyAttendanceApi = (params = {}) => api.get("/attendance/my-monthly", { params });
export const getManagerTeamAttendanceApi = (params = {}) => api.get("/manager/team-attendance", { params });
export const getManagerTeamMemberMonthlyAttendanceApi = (employeeId, params = {}) =>
  api.get(`/manager/team-attendance/${employeeId}/monthly`, { params });
export const manualUpdateManagerTeamAttendanceApi = (id, data) =>
  api.patch(`/manager/team-attendance/${id}/manual-update`, data);
export const getManagerRegularizationApi = (params = {}) => api.get("/manager/regularization", { params });
export const approveManagerRegularizationApi = (id) => api.patch(`/manager/regularization/${id}/approve`);
export const rejectManagerRegularizationApi = (id) => api.patch(`/manager/regularization/${id}/reject`);

// ── Manager Leaves ─────────────────────────────────────────────────────────
// Manager's own leaves — use /employee/leaves routes (no role restriction, just protect + requireCompany)
export const getManagerMyLeavesApi = (params = {}) => api.get("/employee/leaves/my", { params });
export const applyManagerLeaveApi = (data) => api.post("/employee/leaves/apply", data);
export const cancelManagerLeaveApi = (id) => api.delete(`/employee/leaves/${id}/cancel`);
export const getManagerLeaveBalanceApi = () => api.get("/employee/leaves/balance");

// Team leaves
export const getManagerTeamLeavesApi = (params = {}) => api.get("/manager/team-leaves", { params });
export const getManagerTeamLeaveByIdApi = (id) => api.get(`/manager/team-leaves/${id}`);
export const approveManagerTeamLeaveApi = (id) => api.patch(`/manager/team-leaves/${id}/approve`);
export const rejectManagerTeamLeaveApi = (id, reason) =>
  api.patch(`/manager/team-leaves/${id}/reject`, { rejectionReason: reason });

// ── Manager Projects ───────────────────────────────────────────────────────
export const getManagerProjectsApi = (params = {}) => api.get("/manager/projects", { params });
export const getManagerProjectByIdApi = (id) => api.get(`/manager/projects/${id}`);
export const createManagerProjectApi = (data) => api.post("/manager/projects", data);
export const updateManagerProjectApi = (id, data) => api.put(`/manager/projects/${id}`, data);
export const deleteManagerProjectApi = (id) => api.delete(`/manager/projects/${id}`);
export const getManagerProjectTasksApi = (id) => api.get(`/manager/projects/${id}/tasks`);
export const getManagerProjectActivityApi = (id) => api.get(`/manager/projects/${id}/activity`);
export const getManagerProjectChangeRequestsApi = (projectId) =>
  api.get(`/manager/projects/${projectId}/change-requests`);
export const updateManagerChangeRequestStatusApi = (id, status) =>
  api.patch(`/manager/change-requests/${id}/status`, { status });

// ── Manager Reports ────────────────────────────────────────────────────────
export const getManagerReportsSummaryApi = (params = {}) => api.get("/manager/reports/summary", { params });
export const getManagerTaskReportApi = (params = {}) => api.get("/manager/reports/team-tasks", { params });
export const getManagerAttendanceReportApi = (params = {}) => api.get("/manager/reports/team-attendance", { params });
export const getManagerLeaveReportApi = (params = {}) => api.get("/manager/reports/team-leaves", { params });
export const getManagerTeamWorkReportApi = (params = {}) => api.get("/manager/reports/team-work", { params });

// ── Manager Announcements ──────────────────────────────────────────────────
export const getManagerAnnouncementsApi = (params = {}) => api.get("/manager/announcements", { params });
export const markManagerAnnouncementReadApi = (id) => api.patch(`/manager/announcements/${id}/read`);

// ── Manager Profile ────────────────────────────────────────────────────────
export const getManagerProfileApi = async () => {
  const [authRes, empRes] = await Promise.all([
    api.get("/auth/me"),
    api.get("/employee/my-profile/edit").catch(() => ({ data: { employee: {} } }))
  ]);
  return {
    data: {
      user: authRes.data.user,
      employee: empRes.data.employee
    }
  };
};
export const updateManagerProfileApi = (data) => api.put("/employee/update-profile", data);
export const changeManagerPasswordApi = (data) => api.post("/auth/change-password", data);

// ── Manager Settings / Notifications ──────────────────────────────────────
export const getManagerSettingsApi = () => api.get("/manager/task-permissions");
export const updateManagerSettingsApi = (data) => api.put("/company/settings", data);
export const getManagerNotificationsApi = (params = {}) => api.get("/notifications", { params });
export const markManagerNotificationReadApi = (id) => api.patch(`/notifications/${id}/read`);
