import { getCompanySettingsApi, getHolidaysApi, getCompanyLeavesApi } from "../api/companyService";
import { getTeamLeaves } from "../api/managerApi";
import { getMyLeavesApi } from "../api/leaveService";
import { DEFAULT_WORKING_DAYS } from "./taskDateValidation";

let cachedContext = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

export const loadTaskScheduleContext = async (role) => {
  const now = Date.now();
  if (cachedContext && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedContext;
  }

  let workingDays = DEFAULT_WORKING_DAYS;
  let holidays = [];
  let approvedLeaves = [];

  try {
    const settingsRes = await getCompanySettingsApi().catch(() => null);
    if (settingsRes?.data?.settings?.workingDays?.length) {
      workingDays = settingsRes.data.settings.workingDays;
    }
  } catch (_) {
    // Keep defaults when settings are unavailable for this role.
  }

  try {
    const holidaysRes = await getHolidaysApi().catch(() => null);
    holidays = holidaysRes?.data?.holidays || holidaysRes?.data?.data || holidaysRes?.data || [];
  } catch (_) {
    holidays = [];
  }

  try {
    if (role === "Manager") {
      const leavesRes = await getTeamLeaves({ status: "approved" }).catch(() => null);
      approvedLeaves = leavesRes?.data?.leaves || leavesRes?.data?.data || leavesRes?.data || [];
    } else if (role === "Employee" || role === "Team Member") {
      const leavesRes = await getMyLeavesApi().catch(() => null);
      const allLeaves = leavesRes?.data?.leaves || leavesRes?.data?.data || leavesRes?.data || [];
      approvedLeaves = allLeaves.filter((leave) => leave.status === "approved");
    } else {
      const leavesRes = await getCompanyLeavesApi({ status: "approved" }).catch(() => null);
      approvedLeaves = leavesRes?.data?.leaves || leavesRes?.data?.data || leavesRes?.data || [];
    }
  } catch (_) {
    approvedLeaves = [];
  }

  cachedContext = { workingDays, holidays, approvedLeaves };
  cacheTimestamp = now;
  return cachedContext;
};

export const clearTaskScheduleContextCache = () => {
  cachedContext = null;
  cacheTimestamp = 0;
};
