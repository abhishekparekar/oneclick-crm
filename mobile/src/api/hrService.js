import api from "./api";

// Dashboard
export const getHRDashboardApi = () => api.get("/hr/dashboard");

// Employees
export const basicCreateEmployeeApi = (data) => api.post("/hr/employees/basic-create", data);
export const getHREmployeesApi = () => api.get("/hr/employees");
export const getHREmployeeByIdApi = (id) => api.get(`/hr/employees/${id}`);
export const updateHREmployeeApi = (id, data) => api.put(`/hr/employees/${id}`, data);
export const patchHREmployeeStatusApi = (id, status) => api.patch(`/hr/employees/${id}/status`, { status });

// Attendance
export const getHRAttendanceApi = () => api.get("/hr/attendance");
export const getHRAttendanceByEmployeeApi = (employeeId) => api.get(`/hr/attendance/${employeeId}`);
export const approveHRRegularizationApi = (id) => api.patch(`/hr/attendance/regularization/${id}/approve`);
export const rejectHRRegularizationApi = (id) => api.patch(`/hr/attendance/regularization/${id}/reject`);

// Leaves
export const getHRLeavesApi = (params = {}) => api.get("/hr/leaves", { params });
export const approveHRLeaveApi = (id) => api.patch(`/hr/leaves/${id}/approve`);
export const rejectHRLeaveApi = (id, rejectionReason) =>
  api.patch(`/hr/leaves/${id}/reject`, { rejectionReason });
export const getHRLeaveBalanceApi = (employeeId) =>
  api.get("/hr/leaves/balance", { params: employeeId ? { employeeId } : {} });
export const updateHRLeaveBalanceApi = (employeeId, data) =>
  api.put(`/hr/leaves/balance/${employeeId}`, data);

// Holidays
export const createHRHolidayApi = (data) => api.post("/hr/holidays", data);
export const getHRHolidaysApi = () => api.get("/hr/holidays");
export const updateHRHolidayApi = (id, data) => api.put(`/hr/holidays/${id}`, data);
export const deleteHRHolidayApi = (id) => api.delete(`/hr/holidays/${id}`);

// Payroll
export const generateHRPayrollApi = (data) => api.post("/hr/payroll/generate", data);
export const getHRPayrollApi = (params = {}) => api.get("/hr/payroll", { params });
export const getHRPayrollByIdApi = (id) => api.get(`/hr/payroll/${id}`);
export const markHRPayrollPaidApi = (id) => api.patch(`/hr/payroll/${id}/mark-paid`);

// Salary Structure
export const createHRSalaryStructureApi = (data) => api.post("/hr/salary-structure", data);
export const getHRSalaryStructureApi = (employeeId) => api.get(`/hr/salary-structure/${employeeId}`);
export const updateHRSalaryStructureApi = (employeeId, data) => api.put(`/hr/salary-structure/${employeeId}`, data);

// Reports
export const getHRAttendanceReportApi = () => api.get("/hr/reports/attendance-summary");
export const getHRLeaveReportApi = () => api.get("/hr/reports/leave-summary");
export const getHRPayrollReportApi = () => api.get("/hr/reports/payroll-summary");
export const getHREmployeeReportApi = () => api.get("/hr/reports/employee-summary");

// Announcements
export const createHRAnnouncementApi = (data) => api.post("/hr/announcements", data);
export const getHRAnnouncementsApi = () => api.get("/hr/announcements");

// Audit Logs
export const getHRAuditLogsApi = () => api.get("/hr/audit-logs");
