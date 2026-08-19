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
