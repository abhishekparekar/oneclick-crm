import api from "./api";

export const getInternalRequestsApi = (params = {}) => {
  return api.get("/internal-requests", { params });
};

export const getInternalRequestByIdApi = (id) => {
  return api.get(`/internal-requests/${id}`);
};

export const createInternalRequestApi = (data) => {
  return api.post("/internal-requests", data);
};

export const replyToInternalRequestApi = (id, data) => {
  return api.post(`/internal-requests/${id}/reply`, data);
};

export const updateInternalRequestStatusApi = (id, status) => {
  return api.patch(`/internal-requests/${id}/status`, { status });
};

export const deleteInternalRequestApi = (id) => {
  return api.delete(`/internal-requests/${id}`);
};
