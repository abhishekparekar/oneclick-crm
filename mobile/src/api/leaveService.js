import api from "./api";

export const applyLeaveApi = (data) =>
  api.post("/employee/leaves/apply", data);

export const getMyLeavesApi = (params = {}) =>
  api.get("/employee/leaves/my", { params });

export const getLeaveDetailsApi = (id) =>
  api.get(`/employee/leaves/${id}`);

export const cancelLeaveApi = (id) =>
  api.delete(`/employee/leaves/${id}/cancel`);

export const getLeaveBalanceApi = () =>
  api.get("/employee/leaves/balance");

export const getCompanyHolidaysApi = () =>
  api.get("/employee/holidays");
