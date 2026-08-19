import api from "./api";

export const getEmployeeProjectsApi = (params = {}) =>
  api.get("/employee/projects", { params });

export const getEmployeeProjectDetailsApi = (id) =>
  api.get(`/employee/projects/${id}`);

export const getEmployeeProjectTasksApi = (id) =>
  api.get(`/employee/projects/${id}/tasks`);

export const getEmployeeProjectActivityApi = (id) =>
  api.get(`/employee/projects/${id}/activity`);
