import api from "./api";

export const login = async (credentials, force = false) => {
  const payload = typeof credentials === "object" ? { ...credentials, force: !!force } : credentials;
  const response = await api.post("/auth/login", payload);
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

export const sendResetOtpApi = async (email) => {
  const response = await api.post("/auth/send-reset-otp", { email });
  return response.data;
};

export const verifyResetOtpApi = async (email, otp) => {
  const response = await api.post("/auth/verify-reset-otp", { email, otp });
  return response.data;
};

export const resetPasswordWithOtpApi = async (data) => {
  const response = await api.post("/auth/reset-password-otp", data);
  return response.data;
};

export const resetPassword = async ({ token, password }) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};

// ─── One User One Login Per Platform ─────────────────────────────────────────
// Tells the server to clear this user's active web session token slot.
export const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};


