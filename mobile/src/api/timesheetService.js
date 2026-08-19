import api from "./api";

export const createManualTimesheetApi = (payload) =>
  api.post("/employee/timesheet/manual", payload);

export const getDailyTimesheetApi = (date) =>
  api.get("/employee/timesheet/daily", { params: { date } });

export const getWeeklyTimesheetApi = (week) =>
  api.get("/employee/timesheet/weekly", { params: { week } });
