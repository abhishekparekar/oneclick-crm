import axios from "axios";
import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

// Toggle this to true if you want to force the mobile app to use the live Vercel backend during local development
const FORCE_LIVE = false;

let _cachedHost = null;

export const getBackendHost = () => {
  if (FORCE_LIVE) {
    return "oneclick-crm-black.vercel.app";
  }

  if (_cachedHost) {
    return _cachedHost;
  }

  if (__DEV__) {
    // Current machine LAN IP for Wi-Fi Expo Go & USB ADB reverse
    let ip = "192.168.1.12";

    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
      const extractedIp = hostUri.split(":")[0];
      if (
        extractedIp &&
        extractedIp !== "0.0.0.0" &&
        extractedIp !== "localhost" &&
        extractedIp !== "127.0.0.1" &&
        extractedIp !== "10.0.2.2"
      ) {
        ip = extractedIp;
      }
    } else {
      try {
        const scriptURL = NativeModules.SourceCode?.scriptURL;
        if (scriptURL) {
          const extractedIp = scriptURL.split("://")[1]?.split(":")[0];
          if (
            extractedIp &&
            extractedIp !== "0.0.0.0" &&
            extractedIp !== "localhost" &&
            extractedIp !== "127.0.0.1" &&
            extractedIp !== "10.0.2.2"
          ) {
            ip = extractedIp;
          }
        }
      } catch (_) {}
    }

    _cachedHost = `${ip}:5000`;
    console.log("[getBackendHost] Resolved API Host:", _cachedHost);
    return _cachedHost;
  }

  return "oneclick-crm-black.vercel.app";
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
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || "";
    const message = error.response?.data?.message || error.message;

    // Automatic failover: If local endpoint encounters Network Error and hasn't retried yet, switch to live cloud backend
    if (!error.response && !originalRequest._retry && !originalRequest.baseURL?.includes("vercel.app")) {
      console.log("[API] Local network unreachable, automatically failing over to cloud backend...");
      originalRequest._retry = true;
      _cachedHost = "oneclick-crm-black.vercel.app";
      originalRequest.baseURL = "https://oneclick-crm-black.vercel.app/api";
      return api(originalRequest);
    }

    // Suppress verbose WARN for known gateway 400s — these are handled silently by the app
    const isKnownGateway400 = status === 400 && (url.includes("whatsapp/send") || url.includes("send-template"));
    if (!isKnownGateway400) {
      console.warn(`[API] ✗ ${status ?? "NET"} ${url}: ${message}`);
    }
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
