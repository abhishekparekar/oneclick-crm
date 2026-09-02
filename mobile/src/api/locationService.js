import api from "./api";

/**
 * Sync batch of GPS points
 */
export const syncLocationsApi = (locations) => api.post("/locations/sync", { locations });

/**
 * Fetch live locations of all active team members/employees
 */
export const getLiveEmployeeLocationsApi = () => api.get("/locations/live");

/**
 * Fetch historical movement trail for a specific employee on a date
 */
export const getEmployeeLocationTrailApi = (employeeId, date) =>
  api.get(`/locations/trail/${employeeId}`, { params: { date } });
