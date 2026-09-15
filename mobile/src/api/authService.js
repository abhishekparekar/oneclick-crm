import api from "./api";

export const loginApi = (email, password, force = false) =>
  api.post("/auth/login", { email, password, force });

export const getMeApi = () => api.get("/auth/me");

export const registerSuperAdminApi = (data) =>
  api.post("/auth/register-superadmin", data);

export const changePasswordApi = (newPassword) =>
  api.post("/auth/change-password", { newPassword });

export const registerCompanyApi = (data) =>
  api.post("/auth/register-company", data);

// ─── One User One Login Per Platform ───────────
export const logoutApi = () => api.post("/auth/logout");

