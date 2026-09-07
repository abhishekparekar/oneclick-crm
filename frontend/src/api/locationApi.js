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

/**
 * Fetch Tracking Allowance Report (GPS KM, Rates & Payable Amounts)
 */
export const getTrackingAllowanceReportApi = (params) =>
  api.get("/locations/allowance", { params });

/**
 * Update Company Travel Allowance Rate per KM
 */
export const updateTrackingAllowanceRateApi = (data) =>
  api.post("/locations/allowance/rate", data);

/**
 * Approve or Reject Employee Travel Allowance claims
 */
export const updateAllowanceStatusApi = (data) =>
  api.post("/locations/allowance/status", data);

