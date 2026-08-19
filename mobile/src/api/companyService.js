import api from "./api";

export const getCompanyDashboardStatsApi = (params) => api.get("/company/dashboard/stats", { params });
export const getDashboardAttendanceDetailsApi = (params) => api.get("/company/dashboard/attendance-details", { params });

export const getCompanyProfileApi = () => api.get("/company/profile");

export const updateCompanyProfileApi = (data) => api.put("/company/profile", data);

export const getDepartmentsApi = () => api.get("/company/departments");

export const createDepartmentApi = (data) => api.post("/company/departments", data);

export const updateDepartmentApi = (id, data) =>
  api.put(`/company/departments/${id}`, data);

export const deleteDepartmentApi = (id) => api.delete(`/company/departments/${id}`);

export const getDesignationsApi = () => api.get("/company/designations");

export const createDesignationApi = (data) => api.post("/company/designations", data);

export const updateDesignationApi = (id, data) =>
  api.put(`/company/designations/${id}`, data);

export const deleteDesignationApi = (id) =>
  api.delete(`/company/designations/${id}`);

export const getBranchesApi = () => api.get("/company/branches");

export const createBranchApi = (data) => api.post("/company/branches", data);

export const updateBranchApi = (id, data) => api.put(`/company/branches/${id}`, data);

export const deleteBranchApi = (id) => api.delete(`/company/branches/${id}`);
export const getCompanyDashboardApi = () => api.get("/company/dashboard");

export const getCompanySettingsApi = () => api.get("/company/settings");

export const updateCompanySettingsApi = (data) => api.put("/company/settings", data);

export const getCompanyAttendanceSettingsApi = () => api.get("/company/attendance-settings");
export const updateCompanyAttendanceSettingsApi = (data) => api.put("/company/attendance-settings", data);

export const getCompanyAnnouncementsApi = () => api.get("/company/announcements");

export const createCompanyAnnouncementApi = (data) => api.post("/company/announcements", data);

export const getCompanyAuditLogsApi = () => api.get("/company/audit-logs");

// Leaves
export const getCompanyLeavesApi = (params = {}) => api.get("/company/leaves", { params });

export const approveLeaveApi = (id) => api.patch(`/company/leaves/${id}/approve`);

export const rejectLeaveApi = (id, rejectionReason) =>
  api.patch(`/company/leaves/${id}/reject`, { rejectionReason });

export const getLeaveBalanceApi = (employeeId) =>
  api.get("/company/leaves/balance", { params: employeeId ? { employeeId } : {} });

export const updateLeaveBalanceApi = (employeeId, data) =>
  api.put(`/company/leaves/balance/${employeeId}`, data);

export const getLeaveSettingsApi = () => api.get("/company/leave-settings");

export const updateLeaveSettingsApi = (data) => api.put("/company/leave-settings", data);

// Holidays
export const getHolidaysApi = () => api.get("/company/holidays");

export const createHolidayApi = (data) => api.post("/company/holidays", data);

export const updateHolidayApi = (id, data) => api.put(`/company/holidays/${id}`, data);

export const deleteHolidayApi = (id) => api.delete(`/company/holidays/${id}`);

// Projects
export const getProjectsApi = () => api.get("/company/projects");

export const createProjectApi = (data) => api.post("/company/projects", data);

export const getProjectByIdApi = (id) => api.get(`/company/projects/${id}`);

export const updateProjectApi = (id, data) => api.put(`/company/projects/${id}`, data);

export const addProjectNoticeApi = (id, message) => 
  api.post(`/company/projects/${id}/notices`, { message });

export const deleteProjectApi = (id) => api.delete(`/company/projects/${id}`);

// Tasks
export const getTasksApi = (params = {}) => api.get("/tasks", { params });

export const createTaskApi = (data) => api.post("/tasks", data);

export const getTaskByIdApi = (id) => api.get(`/tasks/${id}`);

export const updateTaskApi = (id, data) => api.put(`/tasks/${id}`, data);

export const updateTaskStatusApi = (id, actionOrPayload, payload = "") => {
  let actionStr = "";
  let payloadObj = {};

  if (typeof actionOrPayload === "object" && actionOrPayload !== null) {
    payloadObj = actionOrPayload;
    actionStr = actionOrPayload.status || actionOrPayload.statusKey || "status";
  } else if (typeof payload === "object" && payload !== null) {
    actionStr = String(actionOrPayload || "");
    payloadObj = { status: actionStr, ...payload };
  } else {
    actionStr = String(actionOrPayload || "");
    const remarkText = String(payload || "");
    payloadObj = { status: actionStr, remarks: remarkText, cancelReason: remarkText, finalRemarks: remarkText };
  }

  const normalizedAction = actionStr.toLowerCase().replace(/-/g, "_");

  return api.patch(`/tasks/${id}/${actionStr}`, payloadObj).catch(() =>
    api.patch(`/tasks/${id}/${normalizedAction}`, payloadObj).catch(() =>
      api.patch(`/employee/tasks/${id}/status`, payloadObj).catch(() =>
        api.patch(`/company/tasks/${id}/status`, payloadObj)
      )
    )
  );
};

export const shiftTaskApi = (id, data) => api.patch(`/tasks/${id}/shift`, data);

export const bulkShiftTasksApi = (data) => api.patch("/tasks/bulk-shift", data);

export const addCompanyTaskCommentApi = (id, comment, attachments = []) =>
  api.post(`/tasks/${id}/comments`, { comment, attachments });

export const deleteTaskApi = (id) => api.delete(`/company/tasks/${id}`);

export const toggleTaskTemplateApi = (id) => api.patch(`/company/tasks/templates/${id}/toggle-active`);

// Salary Structure & Payroll
export const getSalaryStructureApi = (employeeId) =>
  api.get(`/company/payroll/salary-structure/${employeeId}`);

export const createOrUpdateSalaryStructureApi = (employeeId, data) =>
  api.post(`/company/payroll/salary-structure/${employeeId}`, data);

export const generatePayrollApi = (data) => api.post("/company/payroll/generate", data);

export const getCompanyPayrollApi = (params = {}) => api.get("/company/payroll/company", { params });

export const getEmployeePayrollApi = (employeeId) =>
  api.get(`/company/payroll/employee/${employeeId}`);

export const markPayrollPaidApi = (id) => api.patch(`/company/payroll/${id}/pay`);

export const getPayslipApi = (id) => api.get(`/company/payroll/payslip/${id}`);

// Reports
export const getReportsDashboardSummaryApi = () => api.get("/company/reports/dashboard");

export const getReportsAttendanceSummaryApi = () => api.get("/company/reports/attendance");

export const getReportsLeaveSummaryApi = () => api.get("/company/reports/leaves");

export const getReportsPayrollSummaryApi = (params = {}) => api.get("/company/reports/payroll", { params });
export const getReportsTaskSummaryApi = (params = {}) => api.get("/company/reports/tasks", { params });
export const getReportsEmployeeSummaryApi = (params = {}) => api.get("/company/reports/employees", { params });

export const uploadEmployeeDocumentApi = (employeeId, data) => 
  api.post(`/company/employees/${employeeId}/documents/upload`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
