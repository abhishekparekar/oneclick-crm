import api from "./api";

export const getDashboardSummaryApi = (params = {}) =>
  api.get("/reports/dashboard-summary", { params });
export const getAttendanceSummaryApi = (params = {}) =>
  api.get("/reports/attendance-summary", { params });
export const getLeaveSummaryApi = (params = {}) =>
  api.get("/reports/leave-summary", { params });
export const getPayrollSummaryApi = (params = {}) =>
  api.get("/reports/payroll-summary", { params });
export const getTaskSummaryApi = (params = {}) =>
  api.get("/reports/task-summary", { params });
export const getEmployeeSummaryApi = (params = {}) =>
  api.get("/reports/employee-summary", { params });
export const getProjectSummaryApi = (params = {}) =>
  api.get("/reports/project-summary", { params });
export const getPerformanceReportApi = (params = {}) =>
  api.get("/reports/performance-report", { params });
