import api from "./api";

// ── Employee Dashboard ──────────────────────────────────────────────────
export const getEmployeeDashboardApi = (params = {}) => api.get("/employee/dashboard", { params });
export const getEmployeeDashboardSummaryApi = (params = {}) => api.get("/employee/dashboard-summary", { params });
export const getEmployeeActivitiesApi = (params = {}) => api.get("/employee/activities", { params });

// ── Employee Tasks ──────────────────────────────────────────────────────
export const getEmployeeTasksApi = (params = {}) => api.get("/employee/tasks", { params });
export const getMyTasksApi = getEmployeeTasksApi;
export const getTasksApi = getEmployeeTasksApi;
export const createEmployeeTaskApi = (data) => api.post("/employee/tasks", data);
export const getEmployeeTaskDetailsApi = (id) => api.get(`/employee/tasks/${id}`);
export const getTaskDetailsApi = getEmployeeTaskDetailsApi;
export const updateEmployeeTaskStatusApi = (id, status, extraData = {}) =>
  api.patch(`/employee/tasks/${id}/status`, { status, ...extraData });
export const updateTaskStatusApi = updateEmployeeTaskStatusApi;
export const submitTaskProgressApi = (id, data = {}) =>
  api.post(`/employee/tasks/${id}/comments`, { comment: data.comment, attachments: data.attachments, nextFollowUpDate: data.nextFollowUpDate });
export const addEmployeeTaskCommentApi = (id, text, attachments = []) =>
  api.post(`/employee/tasks/${id}/comments`, { comment: text, attachments });
export const updateEmployeeTaskChecklistApi = (id, checklist) =>
  api.post(`/employee/tasks/${id}/checklist`, { checklist });
export const startEmployeeTaskTimerApi = (id) => api.post(`/employee/tasks/${id}/time/start`, {});
export const stopEmployeeTaskTimerApi = (id) => api.post(`/employee/tasks/${id}/time/stop`, {});
export const uploadTaskMediaApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/tasks/upload-media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ⏱️ Timesheet
export const createManualTimesheetApi = (data) => api.post("/employee/timesheet/manual", data);
export const getDailyTimesheetApi = (params = {}) => api.get("/employee/timesheet/daily", { params });
export const getWeeklyTimesheetApi = (params = {}) => api.get("/employee/timesheet/weekly", { params });

// ── Employee Attendance ──────────────────────────────────────────────────
export const punchInApi = (data = {}) => api.post("/attendance/punch-in", data);
export const punchOutApi = (data = {}) => api.post("/attendance/punch-out", data);
export const getMyTodayAttendanceApi = () => api.get("/attendance/my-today");
export const getMyMonthlyAttendanceApi = (params = {}) => api.get("/attendance/my-monthly", { params });
export const submitRegularizationApi = (data) => api.post("/attendance/regularization", data);

// ── Employee Leaves & Holidays ──────────────────────────────────────────
export const getMyLeavesApi = (params = {}) => api.get("/employee/leaves/my", { params });
export const getLeaveBalanceApi = () => api.get("/employee/leaves/balance");
export const getLeaveDetailsApi = (id) => api.get(`/employee/leaves/${id}`);
export const applyLeaveApi = (data) => api.post("/employee/leaves/apply", data);
export const cancelLeaveApi = (id) => api.delete(`/employee/leaves/${id}/cancel`);
export const getCompanyHolidaysApi = (params = {}) => api.get("/employee/holidays", { params });

// ── Employee Projects ───────────────────────────────────────────────────
export const getEmployeeProjectsApi = (params = {}) => api.get("/employee/projects", { params });
export const getEmployeeProjectDetailsApi = (id) => api.get(`/employee/projects/${id}`);
export const getEmployeeProjectTasksApi = (id) => api.get(`/employee/projects/${id}/tasks`);
export const getEmployeeProjectActivityApi = (id) => api.get(`/employee/projects/${id}/activity`);

// ──────────────── Employee Notifications ─────────────────────────
export const getMyNotificationsApi = () => api.get("/notifications/my");
export const markNotificationReadApi = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadApi = () => api.patch("/notifications/read-all");
export const deleteNotificationApi = (id) => api.delete(`/notifications/${id}`);

// ── Employee Payslips ───────────────────────────────────────────────────
export const getPayslipsApi = (params = {}) => api.get("/employee/payslips", { params });
export const getPayslipDetailsApi = (id) => api.get(`/employee/payslips/${id}`);

// ── Employee Announcements ──────────────────────────────────────────────
export const getEmployeeAnnouncementsApi = (params = {}) => api.get("/employee/announcements", { params });
export const markAnnouncementReadApi = (id) => api.patch(`/employee/announcements/${id}/read`);

// ── Employee Profile & Settings ─────────────────────────────────────────
export const getMyProfileApi = () => api.get("/employee/my-profile/edit");
export const updateEmployeeProfileApi = (data) => api.put("/employee/update-profile", data);
export const changePasswordApi = (data) => api.put("/employee/change-password", data);
export const uploadMyDocumentApi = (file, title) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  return api.post("/employee/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
