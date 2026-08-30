import api, { getApiBaseUrl } from "./api";
import * as FileSystem from "expo-file-system/legacy";


export const getEmployeeTasksApi = (params = {}) =>
  api.get("/tasks", { params });

export const getActiveTaskStatusesApi = () =>
  api.get("/company/tasks/statuses/active");

export const createEmployeeTaskApi = (data) =>
  api.post("/tasks", data);

export const getEmployeeTaskDetailsApi = (id) =>
  api.get(`/tasks/${id}`);

export const updateTaskStatusApi = (id, actionOrPayload, payload = "") => {
  let actionStr = "";
  let payloadObj = {};

  if (typeof actionOrPayload === "object" && actionOrPayload !== null) {
    payloadObj = actionOrPayload;
    actionStr = actionOrPayload.status || actionOrPayload.statusKey || "status";
  } else if (typeof payload === "object" && payload !== null) {
    actionStr = String(actionOrPayload || "");
    payloadObj = { status: actionStr, ...payload };
  } else {
    actionStr = String(actionOrPayload || "");
    const remarkText = String(payload || "");
    payloadObj = { status: actionStr, remarks: remarkText, cancelReason: remarkText, finalRemarks: remarkText };
  }

  const normalizedAction = actionStr.toLowerCase().replace(/-/g, "_");

  return api.patch(`/tasks/${id}/${actionStr}`, payloadObj).catch(() =>
    api.patch(`/tasks/${id}/${normalizedAction}`, payloadObj).catch(() =>
      api.patch(`/employee/tasks/${id}/status`, payloadObj).catch(() =>
        api.patch(`/company/tasks/${id}/status`, payloadObj)
      )
    )
  );
};

export const addTaskCommentApi = (id, comment, attachments = []) => {
  let commentText = "";
  let attachmentList = attachments || [];

  if (typeof comment === "object" && comment !== null) {
    commentText = comment.comment || comment.text || "";
    attachmentList = comment.attachments || attachments || [];
  } else {
    commentText = comment || "";
  }

  return api.post(`/tasks/${id}/comments`, { comment: commentText, attachments: attachmentList });
};

const expoUpload = async (path, formData) => {
  const filePart = formData?._parts?.find(p => p[0] === "file")?.[1];
  if (!filePart || !filePart.uri) {
    return api.post(path, formData);
  }

  const baseUrl = getApiBaseUrl();
  const token = api.defaults.headers.common.Authorization;

  const uploadType = FileSystem.FileSystemUploadType?.MULTIPART ?? FileSystem.UploadType?.MULTIPART ?? 1;

  const uploadResult = await FileSystem.uploadAsync(
    `${baseUrl}${path}`,
    filePart.uri,
    {
      fieldName: "file",
      httpMethod: "POST",
      uploadType: uploadType,
      headers: token ? { Authorization: token } : {},
    }
  );

  const responseBody = JSON.parse(uploadResult.body);
  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(responseBody.message || "Upload failed");
  }

  return { data: responseBody };
};

export const uploadMediaFileApi = async (formData) => {
  try {
    const res = await api.post("/tasks/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (err) {
    try {
      const res2 = await api.post("/company/tasks/upload-media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res2;
    } catch (err2) {
      return await expoUpload("/tasks/upload-media", formData);
    }
  }
};

export const updateTaskChecklistApi = (id, checklistPayload) =>
  api.post(`/tasks/${id}/checklist`, checklistPayload);

export const startTaskTimerApi = (id) =>
  api.post(`/tasks/${id}/time/start`);

export const stopTaskTimerApi = (id, payload = {}) =>
  api.post(`/tasks/${id}/time/stop`, payload);

export const uploadTaskAttachmentApi = async (id, formData) => {
  try {
    return await api.post(`/tasks/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    return await expoUpload(`/tasks/${id}/attachments`, formData);
  }
};


export const deleteTaskAttachmentApi = (id, attachmentId) =>
  api.delete(`/tasks/${id}/attachments/${attachmentId}`);

export const getTodayFollowUpsApi = () =>
  api.get("/tasks/today-followups");

export const submitFollowUpApi = (id, data) =>
  api.post(`/tasks/${id}/submit-followup`, data);
