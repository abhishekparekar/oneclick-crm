import api from "./api";

export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const registerCompany = async (data) => {
  const response = await api.post("/auth/register-company", data);
  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.post("/auth/change-password", data);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async ({ token, password }) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};

