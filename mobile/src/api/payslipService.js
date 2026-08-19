import api from "./api";

export const getPayslipsApi = (params = {}) =>
  api.get("/payroll/my-payslips", { params });

export const getPayslipDetailsApi = (id) =>
  api.get(`/payroll/${id}`);

export const downloadPayslipApi = (id) =>
  api.get(`/payroll/${id}/payslip-pdf`, { responseType: "blob" });
