import axios from "axios";

export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) {
      return `${window.location.protocol}//${host}:5000/api`;
    }
  }
  return "https://oneclick-crm-black.vercel.app/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    // ─── One User One Login Per Platform ─────────────────────────────
    // Every web request carries this header so the backend knows
    // which platform's active session slot to validate against.
    "X-Platform": "web",
  },
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure X-Platform is always present (in case headers were reset)
    config.headers["X-Platform"] = "web";
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // ─── Session Invalidated — force logout on web ────────────────────────────
    // This fires when another device/browser has logged in with the same account,
    // invalidating this session's token hash on the server.
    if (status === 401 && code === "SESSION_INVALIDATED") {
      localStorage.removeItem("token");
      // Store a flag so LoginPage can show the right message
      sessionStorage.setItem("session_invalidated", "1");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
