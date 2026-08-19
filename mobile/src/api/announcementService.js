import api from "./api";

export const getEmployeeAnnouncementsApi = () =>
  api.get("/employee/announcements");

export const markAnnouncementReadApi = (id) =>
  api.patch(`/employee/announcements/${id}/read`);
