import api from "./api";

export const getMyNotificationsApi = (params = {}) => api.get("/notifications/my", { params });
export const markNotificationReadApi = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsReadApi = () => api.patch("/notifications/read-all");
export const deleteNotificationApi = (id) => api.delete(`/notifications/${id}`);
