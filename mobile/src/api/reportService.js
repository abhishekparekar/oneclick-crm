import api from "./api";

// ── In-Memory Report Cache (60s TTL) ──────────────────────────────────────────
const clientReportCache = new Map();
const CACHE_TTL_MS = 60000;

const cachedGet = async (url, params = {}) => {
  const { refresh = false, ...cleanParams } = params;
  const cacheKey = `${url}:${JSON.stringify(cleanParams || {})}`;

  if (!refresh) {
    const cached = clientReportCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data, isCached: true };
    }
  }

  const response = await api.get(url, { params: cleanParams });
  if (response?.data) {
    if (clientReportCache.size > 50) {
      const oldestKey = clientReportCache.keys().next().value;
      clientReportCache.delete(oldestKey);
    }
    clientReportCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
  }
  return response;
};

export const clearReportCache = () => {
  clientReportCache.clear();
};

// ── Consolidated BI Reporting Suite (Source of Truth matching Web) ───────────

export const getBIExecutiveReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/executive", params);

export const getBIWorkforceReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/workforce", params);

export const getBIAttendanceReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/attendance", params);

export const getBILeaveReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/leaves", params);

export const getBITaskReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/tasks", params);

export const getBIProjectReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/projects", params);

export const getBIPayrollReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/payroll", params);

export const getBIPerformanceReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/performance", params);

export const getBILeadReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/leads", params);

export const getBIAuditReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/audit", params);

export const getBIOrganizationReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/organization", params);

// ── Legacy / Compatibility Aliases ────────────────────────────────────────────

export const getDashboardSummaryApi = (params = {}) =>
  cachedGet("/reports/dashboard-summary", params);

export const getAttendanceSummaryApi = (params = {}) =>
  cachedGet("/reports/attendance-summary", params);

export const getLeaveSummaryApi = (params = {}) =>
  cachedGet("/reports/leave-summary", params);

export const getLeadReportApi = (params = {}) =>
  cachedGet("/company/reports/bi/leads", params);

export const getTaskSummaryApi = (params = {}) =>
  cachedGet("/reports/task-summary", params);

export const getEmployeeSummaryApi = (params = {}) =>
  cachedGet("/reports/employee-summary", params);

export const getProjectSummaryApi = (params = {}) =>
  cachedGet("/reports/project-summary", params);

export const getPerformanceReportApi = (params = {}) =>
  cachedGet("/reports/performance-report", params);
