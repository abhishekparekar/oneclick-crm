import api from "./api";

// ── Dashboard ─────────────────────────────────────────────────────────────
export const getCompanyDashboardStatsApi = (params) => api.get("/company/dashboard/stats", { params });
export const getCompanyDashboardApi = (params) => api.get("/company/dashboard", { params });
export const getCompanyAuditLogsApi = (params) => api.get("/company/audit-logs", { params });

// ── Employees ─────────────────────────────────────────────────────────────
export const getEmployeesApi = (params = {}) => api.get("/company/employees", { params });
export const getEmployeeByIdApi = (id) => api.get(`/company/employees/${id}`);
export const createEmployeeApi = (data) => api.post("/company/employees", data);
export const updateEmployeeApi = (id, data) => api.put(`/company/employees/${id}`, data);
export const patchEmployeeStatusApi = (id, status) => api.patch(`/company/employees/${id}/status`, { status });
export const resetEmployeePasswordApi = (id, newPassword) => api.patch(`/company/employees/${id}/reset-password`, { newPassword });
export const deleteEmployeeApi = (id) => api.delete(`/company/employees/${id}`);
export const uploadEmployeeDocumentApi = (id, data) => api.post(`/company/employees/${id}/documents/upload`, data, {
  headers: { "Content-Type": "multipart/form-data" },
});

// ── Master Data: Departments ──────────────────────────────────────────────
export const getDepartmentsApi = () => api.get("/company/departments");
export const createDepartmentApi = (data) => api.post("/company/departments", data);
export const updateDepartmentApi = (id, data) => api.put(`/company/departments/${id}`, data);
export const deleteDepartmentApi = (id) => api.delete(`/company/departments/${id}`);

// ── Master Data: Designations ─────────────────────────────────────────────
export const getDesignationsApi = () => api.get("/company/designations");
export const createDesignationApi = (data) => api.post("/company/designations", data);
export const updateDesignationApi = (id, data) => api.put(`/company/designations/${id}`, data);
export const deleteDesignationApi = (id) => api.delete(`/company/designations/${id}`);

// ── Master Data: Branches ─────────────────────────────────────────────────
export const getBranchesApi = () => api.get("/company/branches");
export const createBranchApi = (data) => api.post("/company/branches", data);
export const updateBranchApi = (id, data) => api.put(`/company/branches/${id}`, data);
export const deleteBranchApi = (id) => api.delete(`/company/branches/${id}`);

// ── Attendance ────────────────────────────────────────────────────────────
export const getCompanyAttendanceApi = (params = {}) => api.get("/company/attendance", { params });
export const getEmployeeAttendanceApi = (employeeId, params = {}) => api.get(`/company/attendance/${employeeId}/monthly`, { params });
export const manualUpdateAttendanceApi = (id, data) => api.patch(`/company/attendance/${id}/manual-update`, data);
export const deleteAttendanceApi = (id) => api.delete(`/company/attendance/${id}`);
export const getRegularizationRequestsApi = (params = {}) => api.get("/company/attendance/regularization", { params });
export const approveRegularizationApi = (id) => api.patch(`/company/attendance/regularization/${id}/approve`);
export const rejectRegularizationApi = (id, reason) => api.patch(`/company/attendance/regularization/${id}/reject`, { rejectionReason: reason });
export const getAttendanceSettingsApi = () => api.get("/company/attendance-settings");
export const updateAttendanceSettingsApi = (data) => api.put("/company/attendance-settings", data);

// ── Leaves ────────────────────────────────────────────────────────────────
export const getCompanyLeavesApi = (params = {}) => api.get("/company/leaves", { params });
export const createLeaveAdminApi = (data) => api.post("/company/leaves", data);
export const approveLeaveApi = (id) => api.patch(`/company/leaves/${id}/approve`);
export const rejectLeaveApi = (id, rejectionReason) => api.patch(`/company/leaves/${id}/reject`, { rejectionReason });
export const getLeaveBalanceApi = (params = {}) => api.get("/company/leaves/balance", { params });
export const updateLeaveBalanceApi = (employeeId, data) => api.put(`/company/leaves/balance/${employeeId}`, data);

// ── Holidays ──────────────────────────────────────────────────────────────
export const getHolidaysApi = () => api.get("/company/holidays");
export const createHolidayApi = (data) => api.post("/company/holidays", data);
export const updateHolidayApi = (id, data) => api.put(`/company/holidays/${id}`, data);
export const deleteHolidayApi = (id) => api.delete(`/company/holidays/${id}`);

// ── Projects ──────────────────────────────────────────────────────────────
export const getProjectsApi = () => api.get("/company/projects");
export const createProjectApi = (data) => api.post("/company/projects", data);
export const getProjectByIdApi = (id) => api.get(`/company/projects/${id}`);
export const updateProjectApi = (id, data) => api.put(`/company/projects/${id}`, data);
export const deleteProjectApi = (id) => api.delete(`/company/projects/${id}`);
export const addProjectNoticeApi = (id, data) => api.post(`/company/projects/${id}/notices`, data);
export const getProjectChangeRequestsApi = (projectId) => api.get(`/manager/projects/${projectId}/change-requests`);
export const updateProjectChangeRequestStatusApi = (id, status) => api.patch(`/manager/change-requests/${id}/status`, { status });

// ── Tasks ─────────────────────────────────────────────────────────────────
export const getTasksApi = (params = {}) => api.get("/tasks", { params });
export const createTaskApi = (data) => api.post("/tasks", data);
export const getTaskByIdApi = (id) => api.get(`/tasks/${id}`);
export const getDashboardSummaryApi = (params = {}) => api.get("/tasks/dashboard-summary", { params });
export const getTodayPendingUpdatesApi = () => api.get("/tasks/today-pending-updates");
export const inProcessTaskApi = (id, data) => api.patch(`/tasks/${id}/in-process`, data);
export const completeTaskApi = (id, data) => api.patch(`/tasks/${id}/complete`, data);
export const lateCompleteTaskApi = (id, data) => api.patch(`/tasks/${id}/late-complete`, data);
export const reopenTaskApi = (id, data) => api.patch(`/tasks/${id}/reopen`, data);
export const reInProcessTaskApi = (id, data) => api.patch(`/tasks/${id}/re-in-process`, data);
export const submitDailyReportApi = (id, data) => api.post(`/tasks/${id}/daily-report`, data);
export const toggleTaskTemplateApi = (id) => api.patch(`/tasks/${id}/toggle-template`);

// Legacy Task Exports (to prevent build errors in other components like Projects.jsx)
export const updateTaskApi = (id, data) => api.put(`/tasks/${id}`, data);
export const updateTaskStatusApi = (id, status) => api.patch(`/tasks/${id}/status`, { status });
export const deleteTaskApi = (id) => api.delete(`/company/tasks/${id}`);
export const addTaskCommentApi = (id, comment) => api.post(`/tasks/${id}/comments`, { comment });
export const uploadTaskAttachmentApi = (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/tasks/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// -- TASK STATUSES (Dynamic) --
export const getTaskStatusesApi = () => api.get("/company/task-statuses");
export const getActiveTaskStatusesApi = () => api.get("/company/tasks/statuses/active");
export const createTaskStatusApi = (data) => api.post("/company/task-statuses", data);
export const updateTaskStatusConfigApi = (id, data) => api.put(`/company/task-statuses/${id}`, data);
export const reorderTaskStatusesApi = (orderedIds) => api.patch("/company/task-statuses/reorder", { orderedIds });
export const deleteTaskStatusApi = (id) => api.delete(`/company/task-statuses/${id}`);

// ── Payroll ───────────────────────────────────────────────────────────────
export const getSalaryStructureApi = (employeeId) => api.get(`/company/payroll/salary-structure/${employeeId}`);
export const createOrUpdateSalaryStructureApi = (employeeId, data) => api.post(`/company/payroll/salary-structure/${employeeId}`, data);
export const generatePayrollApi = (data) => api.post("/company/payroll/generate", data);
export const getCompanyPayrollApi = (params = {}) => api.get("/company/payroll/company", { params });
export const getEmployeePayrollApi = (employeeId) => api.get(`/company/payroll/employee/${employeeId}`);
export const markPayrollPaidApi = (id) => api.patch(`/company/payroll/${id}/pay`);
export const getPayslipApi = (id) => api.get(`/company/payroll/payslip/${id}`);

// ── Announcements ─────────────────────────────────────────────────────────
export const getCompanyAnnouncementsApi = () => api.get("/company/announcements");
export const createCompanyAnnouncementApi = (data) => api.post("/company/announcements", data);
export const deleteAnnouncementApi = (id) => api.delete(`/company/announcements/${id}`);

// ── Company Profile & Settings ────────────────────────────────────────────
export const getCompanyProfileApi = () => api.get("/company/profile");
export const updateCompanyProfileApi = (data) => api.put("/company/profile", data);
export const getCompanySettingsApi = () => api.get("/company/settings");
export const updateCompanySettingsApi = (data) => api.put("/company/settings", data);
export const getLeaveSettingsApi = () => api.get("/company/leave-settings");
export const updateLeaveSettingsApi = (data) => api.put("/company/leave-settings", data);

// ── Reports ───────────────────────────────────────────────────────────────
export const getReportsDashboardSummaryApi = () => api.get("/company/reports/dashboard");
export const getReportsAttendanceSummaryApi = () => api.get("/company/reports/attendance");
export const getReportsLeaveSummaryApi = () => api.get("/company/reports/leaves");
export const getReportsPayrollSummaryApi = () => api.get("/company/reports/payroll");
export const getReportsTaskSummaryApi = () => api.get("/company/reports/tasks");
export const getReportsEmployeeSummaryApi = () => api.get("/company/reports/employees");

// ── NEW: Detailed Analytics API Callers (Unchanged Existing APIs) ──────────
export const getReportsTaskDetailedApi = (params) => api.get("/company/reports/tasks-detailed", { params });
export const getReportsEmployeeDetailedApi = (params) => api.get("/company/reports/employees-detailed", { params });
export const getReportsLeaveDetailedApi = (params) => api.get("/company/reports/leaves-detailed", { params });

// ── Subscription ──────────────────────────────────────────────────────────
export const getActiveSubscriptionApi = () => api.get("/company/subscription/active");

// ── Task Media Upload ──────────────────────────────────────────────────────
export const uploadTaskMediaApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/tasks/upload-media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
