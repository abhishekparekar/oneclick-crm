import api, { getApiBaseUrl } from "./api";
import * as FileSystem from "expo-file-system/legacy";

// ── Dashboard ──────────────────────────────────────────────
export const getManagerDashboard = async (params = {}) => {
  const res = await api.get("/manager/dashboard-summary", { params });
  return res.data;
};

// ── Team ──────────────────────────────────────────────────
export const getManagerTeam = async (params = {}) => {
  const res = await api.get("/manager/team", { params });
  return res.data;
};

export const getTeamOrg = async () => {
  const res = await api.get("/manager/team-org");
  return res.data;
};

export const getTeamMemberById = async (employeeId) => {
  const res = await api.get(`/manager/team/${employeeId}`);
  return res.data;
};

// ── Attendance ─────────────────────────────────────────────
export const getAttendancePermissions = async () => {
  const res = await api.get("/manager/attendance-permissions");
  return res.data;
};

export const getTeamAttendance = async (params = {}) => {
  const res = await api.get("/manager/team-attendance", { params });
  return res.data;
};

export const getTeamMemberMonthlyAttendance = async (employeeId, params = {}) => {
  const res = await api.get(`/manager/team-attendance/${employeeId}/monthly`, { params });
  return res.data;
};

export const manualUpdateTeamAttendance = async (id, data) => {
  const res = await api.patch(`/manager/team-attendance/${id}/manual-update`, data);
  return res.data;
};

// ── Regularization ─────────────────────────────────────────
export const getRegularizationRequests = async () => {
  const res = await api.get("/manager/regularization");
  return res.data;
};

export const approveRegularization = async (id) => {
  const res = await api.patch(`/manager/regularization/${id}/approve`);
  return res.data;
};

export const rejectRegularization = async (id, reason) => {
  const res = await api.patch(`/manager/regularization/${id}/reject`, {
    reason,
  });
  return res.data;
};

// ── Leaves ─────────────────────────────────────────────────
export const getLeavePermissions = async () => {
  const res = await api.get("/manager/leave-permissions");
  return res.data;
};

export const getTeamLeaves = async (params = {}) => {
  const res = await api.get("/manager/team-leaves", { params });
  return res.data;
};

export const getTeamLeaveById = async (id) => {
  const res = await api.get(`/manager/team-leaves/${id}`);
  return res.data;
};

export const approveTeamLeave = async (id) => {
  const res = await api.patch(`/manager/team-leaves/${id}/approve`);
  return res.data;
};

export const rejectTeamLeave = async (id, rejectionReason) => {
  const res = await api.patch(`/manager/team-leaves/${id}/reject`, { rejectionReason });
  return res.data;
};

// ── Tasks ──────────────────────────────────────────────────
export const getTaskPermissions = async () => {
  const res = await api.get("/manager/task-permissions");
  return res.data;
};

export const getMyManagerTasks = async (params = {}) => {
  const res = await api.get("/manager/tasks/my", { params });
  return res.data;
};

export const getTeamTasks = async (params = {}) => {
  const res = await api.get("/manager/tasks/team", { params });
  return res.data;
};

export const createTask = async (taskData) => {
  const res = await api.post("/tasks", taskData);
  return res.data;
};

export const getTaskById = async (id) => {
  const res = await api.get(`/tasks/${id}`);
  return res.data;
};

export const updateTask = async (id, taskData) => {
  const res = await api.put(`/tasks/${id}`, taskData);
  return res.data;
};

export const deleteTask = async (id) => {
  const res = await api.delete(`/manager/tasks/${id}`);
  return res.data;
};

export const updateTaskStatus = async (id, action, payload = {}) => {
  const res = await api.patch(`/tasks/${id}/${action}`, payload);
  return res.data;
};

export const addTaskComment = async (id, comment, attachments = []) => {
  const res = await api.post(`/tasks/${id}/comments`, { comment, attachments });
  return res.data;
};

const expoUpload = async (path, formData) => {
  const filePart = formData?._parts?.find(p => p[0] === "file")?.[1];
  if (!filePart || !filePart.uri) {
    const res = await api.post(path, formData);
    return res.data;
  }

  const baseUrl = getApiBaseUrl();
  const token = api.defaults.headers.common.Authorization;

  const uploadType = FileSystem.FileSystemUploadType?.MULTIPART ?? FileSystem.UploadType?.MULTIPART ?? 1;

  const uploadResult = await FileSystem.uploadAsync(
    `${baseUrl}${path}`,
    filePart.uri,
    {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: uploadType,
      headers: token ? { Authorization: token } : {},
    }
  );

  const responseBody = JSON.parse(uploadResult.body);
  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(responseBody.message || "Upload failed");
  }

  return responseBody;
};

export const uploadMediaFile = async (formData) => {
  return expoUpload("/tasks/upload-media", formData);
};

export const updateTaskChecklist = async (id, subtasks) => {
  const res = await api.post(`/manager/tasks/${id}/checklist`, { subtasks });
  return res.data;
};

export const shiftTaskApi = async (id, data) => {
  const res = await api.patch(`/tasks/${id}/shift`, data);
  return res.data;
};

export const startTaskTimer = async (id, projectId) => {
  const res = await api.post(`/manager/tasks/${id}/time/start`, { taskId: id, projectId });
  return res.data;
};

export const stopTaskTimer = async (id) => {
  const res = await api.post(`/manager/tasks/${id}/time/stop`);
  return res.data;
};

export const addManualTaskTime = async (id, payload) => {
  const res = await api.post(`/manager/tasks/${id}/time/manual`, { taskId: id, ...payload });
  return res.data;
};

export const toggleTaskTemplateApi = async (id) => {
  const res = await api.patch(`/manager/tasks/templates/${id}/toggle-active`);
  return res.data;
};

// Employee tasks (own tasks)
export const getMyTasks = async (userId) => {
  const res = await api.get("/tasks", { params: { assignedTo: userId } });
  return res.data;
};

export const updateMyTaskStatus = async (id, action, remarks = "") => {
  const res = await api.patch(`/tasks/${id}/${action}`, { remarks });
  return res.data;
};

// ── Projects ───────────────────────────────────────────────
export const getManagerProjects = async () => {
  const res = await api.get("/manager/projects");
  return res.data;
};

export const createManagerProject = async (data) => {
  const res = await api.post("/manager/projects", data);
  return res.data;
};

export const getManagerProjectById = async (id) => {
  const res = await api.get(`/manager/projects/${id}`);
  return res.data;
};

export const getProjectTasks = async (projectId) => {
  const res = await api.get(`/manager/projects/${projectId}/tasks`);
  return res.data;
};

export const getManagerProjectActivity = async (projectId) => {
  const res = await api.get(`/manager/projects/${projectId}/activity`);
  return res.data;
};

// ── Work Tracking / Timesheet ──────────────────────────────
export const startWork = async (payload) => {
  const res = await api.post("/manager/work/start", payload);
  return res.data;
};

export const stopWork = async () => {
  const res = await api.post("/manager/work/stop");
  return res.data;
};

export const addManualWork = async (payload) => {
  const res = await api.post("/manager/work/manual", payload);
  return res.data;
};

export const getMyTimesheet = async (params = {}) => {
  const res = await api.get("/manager/timesheet/my", { params });
  return res.data;
};

export const getTeamTimesheet = async (params = {}) => {
  const res = await api.get("/manager/timesheet/team", { params });
  return res.data;
};

export const approveTimesheet = async (id) => {
  const res = await api.patch(`/manager/timesheet/${id}/approve`);
  return res.data;
};

// ── Reports ────────────────────────────────────────────────
export const getReportsSummary = async () => {
  const res = await api.get("/manager/reports/summary");
  return res.data;
};

export const getTeamAttendanceReport = async (params = {}) => {
  const res = await api.get("/manager/reports/team-attendance", { params });
  return res.data;
};

export const getTeamTasksReport = async (params = {}) => {
  const res = await api.get("/manager/reports/team-tasks", { params });
  return res.data;
};

export const getTeamLeavesReport = async (params = {}) => {
  const res = await api.get("/manager/reports/team-leaves", { params });
  return res.data;
};

export const getTeamWorkReport = async (params = {}) => {
  const res = await api.get("/manager/reports/team-work", { params });
  return res.data;
};

// ── Announcements ──────────────────────────────────────────
export const getManagerAnnouncements = async () => {
  const res = await api.get("/manager/announcements");
  return res.data;
};

export const markAnnouncementRead = async (id) => {
  const res = await api.patch(`/manager/announcements/${id}/read`);
  return res.data;
};

export const getReportsData = async (endpoint, params = {}) => {
  const res = await api.get(`/reports/${endpoint}`, { params });
  return res.data;
};


// ── My Attendance ──────────────────────────────────────────
export const getMyTodayAttendance = async () => {
  const res = await api.get("/attendance/my-today");
  return res.data;
};

export const getMyMonthlyAttendance = async (params = {}) => {
  const res = await api.get("/attendance/my-monthly", { params });
  return res.data;
};

export const punchIn = async (data = {}) => {
  const res = await api.post("/attendance/punch-in", data);
  return res.data;
};

export const punchOut = async (data = {}) => {
  const res = await api.post("/attendance/punch-out", data);
  return res.data;
};

// ── My Leaves ─────────────────────────────────────────────
export const applyLeave = async (leaveData) => {
  const res = await api.post("/employee/leaves/apply", leaveData);
  return res.data;
};

export const getMyLeaves = async () => {
  const res = await api.get("/employee/leaves/my");
  return res.data;
};

// ── Notifications ─────────────────────────────────────────
export const getMyNotifications = async () => {
  const res = await api.get("/notifications/my");
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch("/notifications/read-all");
  return res.data;
};

// ── Profile ────────────────────────────────────────────────
export const getMyProfile = async () => {
  const res = await api.get("/employee/my-profile");
  return res.data;
};

export const updateMyProfile = async (profileData) => {
  const res = await api.put("/employee/update-profile", profileData);
  return res.data;
};

export const changeMyPassword = async (data) => {
  const res = await api.put("/employee/change-password", data);
  return res.data;
};
