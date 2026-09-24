import api, { getApiBaseUrl } from "./api";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const uploadInternalRequestAttachmentApi = async (file) => {
  const baseUrl = getApiBaseUrl();
  let token = null;
  try {
    const stored = await AsyncStorage.getItem("hrms_token");
    if (stored) token = `Bearer ${stored}`;
  } catch (_) {}

  // 1. Try FileSystem.uploadAsync if native URI is provided
  if (file?.uri && typeof file.uri === "string") {
    try {
      const uploadType =
        FileSystem.FileSystemUploadType?.MULTIPART ??
        FileSystem.UploadType?.MULTIPART ??
        1;

      const res = await FileSystem.uploadAsync(
        `${baseUrl}/internal-requests/upload`,
        file.uri,
        {
          fieldName: "file",
          httpMethod: "POST",
          uploadType,
          headers: token ? { Authorization: token } : {},
        }
      );

      const parsed = JSON.parse(res.body);
      if (res.status >= 200 && res.status < 300 && parsed?.file) {
        return parsed.file;
      }
    } catch (fsErr) {
      console.warn("[uploadInternalRequestAttachmentApi] FileSystem upload failed, falling back to FormData:", fsErr?.message || fsErr);
    }
  }

  // 2. Fallback to standard FormData via Axios
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name || file.fileName || `document_${Date.now()}`,
    type: file.mimeType || file.type || "application/octet-stream",
  });

  const res = await api.post("/internal-requests/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (res.data?.file) {
    return res.data.file;
  }
  throw new Error(res.data?.message || "File upload failed");
};
