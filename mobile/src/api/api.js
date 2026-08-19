import axios from "axios";
import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

// Toggle this to true if you want to force the mobile app to use the live Vercel backend during local development
const FORCE_LIVE = false;

let _cachedHost = null;

export const getBackendHost = () => {
  if (FORCE_LIVE) {
    return "nextact-backend.vercel.app";
  }

  if (_cachedHost) {
    return _cachedHost;
  }

  if (__DEV__) {
    let ip = "192.168.1.13"; 

    const isValidLanIp = (val) => {
      if (!val) return false;
      const lower = val.trim().toLowerCase();
      if (lower === "localhost" || lower === "127.0.0.1" || lower === "0.0.0.0" || lower === "10.0.2.2") {
        return false;
      }
      return true;
    };

    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const extractedIp = hostUri.split(':')[0];
      if (isValidLanIp(extractedIp)) {
        ip = extractedIp;
      }
    } else {
      try {
        const scriptURL = NativeModules.SourceCode?.scriptURL;
        if (scriptURL) {
          const extractedIp = scriptURL.split("://")[1].split(":")[0];
          if (isValidLanIp(extractedIp)) {
            ip = extractedIp;
          }
        }
      } catch (_) {}
    }

    _cachedHost = `${ip}:5000`;
    console.log("[getBackendHost] Resolved API Host:", _cachedHost);
    return _cachedHost;
  }
  
  return "nextact-backend.vercel.app";
};

export const getApiBaseUrl = () => {
  const host = getBackendHost();
  if (host.includes("vercel.app")) {
    return `https://${host}/api`;
  }
  return `http://${host}/api`;
};

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const isFormData = config.data instanceof FormData;
    if (isFormData && config.headers) {
      config.headers["Content-Type"] = "multipart/form-data";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    console.warn(`[API] ✗ ${status ?? "NET"} ${error.config?.url}: ${message}`);
    return Promise.reject(error);
  }
);

// ─── Auth Token Helper ────────────────────────────────────────────────────────
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    console.log("[API] Auth token set");
  } else {
    delete api.defaults.headers.common.Authorization;
    console.log("[API] Auth token cleared");
  }
};

export default api;
