const DEFAULT_WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDayName = (date) => date.toLocaleDateString("en-US", { weekday: "long" });

const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isWeeklyOff = (date, workingDays) => !workingDays.includes(getDayName(date));

const isHoliday = (date, holidays = []) =>
  holidays.some((holiday) => {
    const holidayDate = new Date(holiday.date);
    return isSameDay(holidayDate, date);
  });

const isCompanyDayOff = (date, workingDays, holidays) => {
  if (isWeeklyOff(date, workingDays)) {
    return { off: true, reason: "weekly off" };
  }
  if (isHoliday(date, holidays)) {
    return { off: true, reason: "company holiday" };
  }
  return { off: false, reason: null };
};

const getEmployeesOnLeave = (date, assigneeIds = [], approvedLeaves = []) => {
  if (!assigneeIds.length || !approvedLeaves.length) return [];

  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const assigneeSet = new Set(assigneeIds.map((id) => id.toString()));

  return approvedLeaves.filter((leave) => {
    const employeeId = leave.employeeId?._id || leave.employeeId;
    if (!employeeId || !assigneeSet.has(employeeId.toString())) return false;

    const leaveStart = startOfDay(new Date(leave.startDate));
    const leaveEnd = new Date(new Date(leave.endDate));
    leaveEnd.setHours(23, 59, 59, 999);

    return leaveStart <= dayEnd && leaveEnd >= dayStart;
  });
};

export const validateTaskDatesClient = ({
  startDateISO,
  endDateISO,
  assigneeIds = [],
  workingDays = DEFAULT_WORKING_DAYS,
  holidays = [],
  approvedLeaves = [],
}) => {
  const errors = [];

  if (!startDateISO) {
    return { valid: false, errors: ["Start date is required."] };
  }

  const start = startOfDay(new Date(startDateISO));
  const end = endDateISO ? startOfDay(new Date(endDateISO)) : null;

  const startOff = isCompanyDayOff(start, workingDays, holidays);
  if (startOff.off) {
    errors.push(
      `Start date falls on a ${startOff.reason}. Tasks cannot be assigned on weekly offs or company holidays.`
    );
  }

  if (end) {
    if (end < start) {
      errors.push("End date cannot be before the start date.");
    }

    const endOff = isCompanyDayOff(end, workingDays, holidays);
    if (endOff.off) {
      errors.push(
        `End date falls on a ${endOff.reason}. Task deadline cannot be on weekly offs or company holidays.`
      );
    }
  }

  const startLeave = getEmployeesOnLeave(start, assigneeIds, approvedLeaves);
  if (startLeave.length > 0) {
    errors.push(
      `Cannot assign on the start date: selected team member(s) are on approved leave.`
    );
  }

  if (end) {
    const endLeave = getEmployeesOnLeave(end, assigneeIds, approvedLeaves);
    if (endLeave.length > 0) {
      errors.push(`End date falls during approved leave for selected team member(s).`);
    }
  }

  return { valid: errors.length === 0, errors };
};

export { DEFAULT_WORKING_DAYS };
