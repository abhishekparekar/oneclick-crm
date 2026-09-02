import api from "./api";

/**
 * Fetch live locations of all active staff
 */
export const getLiveEmployeeLocationsApi = () => api.get("/locations/live");

/**
 * Fetch GPS movement trail for a specific employee on a date
 */
export const getEmployeeLocationTrailApi = (employeeId, date) =>
  api.get(`/locations/trail/${employeeId}`, { params: { date } });
