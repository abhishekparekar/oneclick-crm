const mongoose = require("mongoose");
const Company = require("../models/Company");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");

const DEFAULT_WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getDayName = (date) => date.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });

const getCompanyWorkingDays = async (companyId) => {
  const company = await Company.findById(companyId).select("settings").lean();
  return company?.settings?.workingDays?.length
    ? company.settings.workingDays
    : DEFAULT_WORKING_DAYS;
};

const isWeeklyOff = (date, workingDays) => !workingDays.includes(getDayName(date));

const isCompanyHoliday = async (companyId, date) => {
  const holiday = await Holiday.findOne({
    companyId,
    date: { $gte: startOfDay(date), $lte: endOfDay(date) },
  }).lean();
  return !!holiday;
};

const isCompanyDayOff = async (companyId, date, workingDays) => {
  if (isWeeklyOff(date, workingDays)) {
    return { off: true, reason: "weekly off" };
  }
  if (await isCompanyHoliday(companyId, date)) {
    return { off: true, reason: "company holiday" };
  }
  return { off: false, reason: null };
};

const getEmployeesOnLeave = async (companyId, employeeIds, date) => {
  if (!employeeIds?.length) return [];

  const ids = employeeIds.map((id) => id.toString());
  const leaves = await Leave.find({
    companyId,
    employeeId: { $in: employeeIds },
    status: "approved",
    startDate: { $lte: endOfDay(date) },
    endDate: { $gte: startOfDay(date) },
  })
    .populate("employeeId", "firstName lastName fullName")
    .lean();

  return leaves
    .filter((leave) => leave.employeeId && ids.includes(leave.employeeId._id.toString()))
    .map((leave) => ({
      employeeId: leave.employeeId._id,
      name:
        leave.employeeId.fullName ||
        `${leave.employeeId.firstName || ""} ${leave.employeeId.lastName || ""}`.trim(),
      leaveType: leave.leaveType,
    }));
};

const filterAssigneesNotOnLeave = async (companyId, employeeIds, date) => {
  if (!employeeIds?.length) return [];
  const onLeave = await getEmployeesOnLeave(companyId, employeeIds, date);
  const onLeaveIds = new Set(onLeave.map((entry) => entry.employeeId.toString()));
  return employeeIds.filter((id) => !onLeaveIds.has(id.toString()));
};

const getPrecedingWorkingDay = async (companyId, date, workingDays) => {
  let currentDate = startOfDay(new Date(date));
  let loopCount = 0;

  while (loopCount < 30) {
    const off = await isCompanyDayOff(companyId, currentDate, workingDays);
    if (!off.off) return currentDate;
    currentDate.setDate(currentDate.getDate() - 1);
    loopCount++;
  }

  return currentDate;
};

const validateTaskSchedule = async (companyId, { startDate, endDate, assignedTo = [] }) => {
  const errors = [];
  const workingDays = await getCompanyWorkingDays(companyId);

  if (!startDate) {
    return { valid: false, errors: ["Start date is required."], workingDays };
  }

  // Filter out empty or invalid ObjectIds to prevent Mongoose CastErrors
  const cleanAssignedTo = (assignedTo || [])
    .map(id => id ? id.toString().trim() : "")
    .filter(id => id && mongoose.Types.ObjectId.isValid(id));

  const start = startOfDay(new Date(startDate));
  const end = endDate ? startOfDay(new Date(endDate)) : null;

  const startOff = await isCompanyDayOff(companyId, start, workingDays);
  if (startOff.off) {
    errors.push(
      `Start date falls on a ${startOff.reason}. Tasks cannot be assigned on weekly offs or company holidays.`
    );
  }

  if (end) {
    if (end < start) {
      errors.push("End date cannot be before the start date.");
    }

    const endOff = await isCompanyDayOff(companyId, end, workingDays);
    if (endOff.off) {
      errors.push(
        `End date falls on a ${endOff.reason}. Task deadline cannot be on weekly offs or company holidays.`
      );
    }
  }

  if (cleanAssignedTo.length > 0) {
    const startLeave = await getEmployeesOnLeave(companyId, cleanAssignedTo, start);
    if (startLeave.length > 0) {
      const names = startLeave.map((entry) => entry.name).join(", ");
      errors.push(
        `Cannot assign on the start date: ${names} ${startLeave.length === 1 ? "is" : "are"} on approved leave.`
      );
    }

    if (end) {
      const endLeave = await getEmployeesOnLeave(companyId, cleanAssignedTo, end);
      if (endLeave.length > 0) {
        const names = endLeave.map((entry) => entry.name).join(", ");
        errors.push(`End date falls during approved leave for: ${names}.`);
      }
    }
  }

  return { valid: errors.length === 0, errors, workingDays };
};

module.exports = {
  DEFAULT_WORKING_DAYS,
  startOfDay,
  endOfDay,
  getCompanyWorkingDays,
  isWeeklyOff,
  isCompanyHoliday,
  isCompanyDayOff,
  getEmployeesOnLeave,
  filterAssigneesNotOnLeave,
  getPrecedingWorkingDay,
  validateTaskSchedule,
};
