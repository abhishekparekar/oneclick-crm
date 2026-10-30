const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const PayrollSettings = require("../models/PayrollSettings");
const Holiday = require("../models/Holiday");
const Department = require("../models/Department");
const Designation = require("../models/Designation");

/**
 * Calculates the full attendance summary for payroll for a given employee, month, year.
 *
 * KEY FACTS about this system:
 * - Attendance.date is stored as a STRING e.g. "2026-06-01"
 * - Attendance.status enum: "present", "half_day", "absent", "late", "paid_leave", "unpaid_leave", "holiday", "weekly_off"
 * - Attendance.totalHours is used to auto-classify if status is missing/generic
 * - Leave.leaveType: "Casual", "Sick", "Annual" (PAID), "LOP" (UNPAID)
 * - Leave.status: only "approved" leaves count
 *
 * FORMULA:
 *   payableDays = presentDays + lateDays + paidLeaveDays + (halfDays × 0.5)
 *              + [weeklyOffDays if includeWeeklyOffAsPaid]
 *              + [holidayDays if includeHolidayAsPaid]
 *   lopDays    = absentDays + unpaidLeaveDays + (halfDays × 0.5)
 */
const getPayrollAttendanceSummary = async (employeeId, month, year, companyId) => {
  const targetMonth = parseInt(month, 10);
  const targetYear = parseInt(year, 10);

  const startDay = new Date(targetYear, targetMonth - 1, 1);
  const endDay = new Date(targetYear, targetMonth, 0); // last day of month
  const totalCalendarDays = endDay.getDate();

  // Format date object as "YYYY-MM-DD" string for Attendance.date queries
  const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const startStr = toDateStr(startDay);
  const endStr = toDateStr(endDay);

  const emp = await Employee.findOne({ _id: employeeId, companyId });
  if (!emp) throw new Error("Employee not found");

  // Load settings with safe defaults
  const Company = require("../models/Company");
  const company = await Company.findById(companyId).select("settings").lean();

  let settings = await PayrollSettings.findOne({ companyId });

  // Map weekday names to day-of-week numbers (0=Sunday ... 6=Saturday)
  const DAY_MAP = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Determine weekly off days:
  // 1. Single source of truth: derive weeklyOffDays directly from company.settings.workingDays (Active Working Days)
  // 2. Fallback to settings.weeklyOffDays or standard [0, 6].
  let weeklyOffDays = [];
  if (Array.isArray(company?.settings?.workingDays) && company.settings.workingDays.length > 0) {
    const workingDayIndices = company.settings.workingDays
      .map((d) => DAY_MAP[String(d).toLowerCase().trim()])
      .filter((n) => n !== undefined);
    weeklyOffDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !workingDayIndices.includes(d));
  } else if (Array.isArray(settings?.weeklyOffDays) && settings.weeklyOffDays.length > 0) {
    weeklyOffDays = settings.weeklyOffDays;
  } else {
    weeklyOffDays = [0, 6]; // Default to Sunday & Saturday (5-day work week)
  }

  const includeWeeklyOffAsPaid = settings?.includeWeeklyOffAsPaid ?? false;
  const includeHolidayAsPaid = settings?.includeHolidayAsPaid ?? true;

  // Dynamically resolve fullDayMinHours from Company settings (Settings.jsx) or PayrollSettings
  const fullDayMinHours = Number(company?.settings?.fullDayHours || settings?.fullDayMinHours || 8);
  const halfDayMinHours = Number(company?.settings?.halfDayHours || settings?.halfDayMinHours || Math.round(fullDayMinHours / 2));

  // 1. Fetch all attendance records for the month using STRING date comparison
  const attendanceRecords = await Attendance.find({
    employeeId,
    companyId,
    date: { $gte: startStr, $lte: endStr },
  });

  // Build a map of date -> record for easy lookup and find earliest recorded attendance
  const attMap = {};
  let earliestAttDate = null;
  attendanceRecords.forEach((r) => {
    if (r && r.date) {
      attMap[r.date] = r;
      if (!earliestAttDate || r.date < earliestAttDate) {
        earliestAttDate = r.date;
      }
    }
  });

  // 2. Determine effective start date (mid-month joiners)
  let effectiveStartStr = startStr;
  if (emp.joiningDate) {
    const jDate = new Date(emp.joiningDate);
    if (!isNaN(jDate.getTime()) && jDate > startDay) {
      effectiveStartStr = toDateStr(jDate);
      // If employee already has attendance records in this month prior to joiningDate
      // (e.g. admin backfilled or corrected attendance), honour their actual attendance start
      if (earliestAttDate && earliestAttDate < effectiveStartStr) {
        effectiveStartStr = earliestAttDate;
      }
    }
  }

  // 3. Fetch holidays
  const holidays = await Holiday.find({
    companyId,
    date: { $gte: startDay, $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59) },
  });

  const holidayDaySet = new Set();
  holidays.forEach((h) => {
    const hDate = new Date(h.date);
    holidayDaySet.add(toDateStr(hDate));
  });

  // 4. Fetch approved Leave records from Leave model
  const approvedLeaves = await Leave.find({
    employeeId,
    companyId,
    status: "approved",
    $or: [
      { startDate: { $gte: startDay, $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59) } },
      { endDate: { $gte: startDay, $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59) } },
      { startDate: { $lte: startDay }, endDate: { $gte: new Date(targetYear, targetMonth, 0, 23, 59, 59) } },
    ],
  });

  // 5. Calculate daily breakdown across all calendar days of the month
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weeklyOffDays_count = 0;
  let holidayDays_count = 0;

  let finalPayableDays = 0;
  let finalLOPDays = 0;

  for (let d = 1; d <= totalCalendarDays; d++) {
    const current = new Date(targetYear, targetMonth - 1, d);
    const dStr = toDateStr(current);
    const dow = current.getDay();
    const isScheduledOff = weeklyOffDays.includes(dow);
    const isHoliday = holidayDaySet.has(dStr);

    // (A) Check approved leave from Leave collection
    let leaveType = null;
    for (const leave of approvedLeaves) {
      const lStart = toDateStr(new Date(leave.startDate));
      const lEnd = toDateStr(new Date(leave.endDate));
      if (dStr >= lStart && dStr <= lEnd) {
        leaveType = leave.leaveType;
        break;
      }
    }

    if (leaveType) {
      if (leaveType === "LOP" || leaveType === "Unpaid Leave") {
        unpaidLeaveDays += 1;
        finalLOPDays += 1;
      } else {
        paidLeaveDays += 1;
        finalPayableDays += 1;
      }
      continue;
    }

    // (B) Check attendance record in Attendance collection
    const att = attMap[dStr];
    let attStatus = null;
    if (att) {
      attStatus = (att.status || "").toLowerCase().replace(/[-_ ]/g, "").trim();
      // Auto-classify based on hours if status missing or absent
      if (!attStatus || attStatus === "absent") {
        if (att.totalHours >= fullDayMinHours) {
          attStatus = "present";
        } else if (att.totalHours >= halfDayMinHours) {
          attStatus = "halfday";
        }
      }
    }

    // Prioritize actual working punches even if performed on a weekend or holiday
    if (attStatus === "present") {
      presentDays += 1;
      finalPayableDays += 1;
      continue;
    }

    if (attStatus === "late") {
      lateDays += 1;
      finalPayableDays += 1;
      continue;
    }

    if (attStatus === "halfday") {
      halfDays += 1;
      finalPayableDays += 0.5;
      finalLOPDays += 0.5;
      continue;
    }

    if (attStatus === "paidleave") {
      paidLeaveDays += 1;
      finalPayableDays += 1;
      continue;
    }

    if (attStatus === "unpaidleave" || attStatus === "lop") {
      unpaidLeaveDays += 1;
      finalLOPDays += 1;
      continue;
    }

    if (attStatus === "weeklyoff" || attStatus === "weekend") {
      weeklyOffDays_count += 1;
      if (includeWeeklyOffAsPaid) finalPayableDays += 1;
      continue;
    }

    if (attStatus === "holiday") {
      holidayDays_count += 1;
      if (includeHolidayAsPaid) finalPayableDays += 1;
      else finalLOPDays += 1;
      continue;
    }

    // (C) Scheduled Holiday without a working punch
    if (isHoliday) {
      holidayDays_count += 1;
      if (includeHolidayAsPaid) finalPayableDays += 1;
      else finalLOPDays += 1;
      continue;
    }

    // (D) Scheduled Weekly Off without a working punch
    if (isScheduledOff) {
      weeklyOffDays_count += 1;
      if (includeWeeklyOffAsPaid) {
        finalPayableDays += 1;
      }
      continue;
    }

    // (E) Explicit absent on scheduled working day
    if (attStatus === "absent") {
      absentDays += 1;
      finalLOPDays += 1;
      continue;
    }

    // (F) Unrecorded working day
    if (dStr < effectiveStartStr || dStr > endStr) {
      // Days before employee started with company (no punch)
      finalLOPDays += 1;
    } else {
      // Unrecorded working day during active tenure
      absentDays += 1;
      finalLOPDays += 1;
    }
  }

  // Working days = calendar days minus non-working days (actual off days & holidays)
  const workingDays = Math.max(0, totalCalendarDays - weeklyOffDays_count - holidayDays_count);

  let payableDays = Math.round(finalPayableDays * 100) / 100;
  let lossOfPayDays = Math.round(finalLOPDays * 100) / 100;

  // Calculate Overtime Hours beyond shift minimum hours (default 8 hrs)
  let totalOvertimeHours = 0;
  attendanceRecords.forEach((att) => {
    const status = (att.status || "").toLowerCase().replace(/[-_ ]/g, "").trim();
    if (status !== "absent" && status !== "unpaidleave" && status !== "lop") {
      const h = Number(att.totalHours) || 0;
      if (h > fullDayMinHours) {
        totalOvertimeHours += (h - fullDayMinHours);
      }
    }
  });
  totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100;

  return {
    totalCalendarDays,
    workingDays,
    weeklyOffDays: weeklyOffDays_count,
    holidayDays: holidayDays_count,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    payableDays: Math.round(payableDays * 100) / 100,
    lossOfPayDays: Math.round(lossOfPayDays * 100) / 100,
    totalOvertimeHours,
    shiftHours: fullDayMinHours,
  };
};

/**
 * Get attendance summary for ALL employees in a company for a given month/year.
 * Used by Attendance Summary admin page.
 */
const getCompanyAttendanceSummary = async (month, year, companyId) => {
  const Employee = require("../models/Employee");
  const employees = await Employee.find({ companyId, status: "active" })
    .select("_id firstName lastName employeeCode departmentId designationId")
    .populate("departmentId", "name")
    .populate("designationId", "name")
    .lean();

  const summaries = await Promise.all(
    employees.map(async (emp) => {
      try {
        const summary = await getPayrollAttendanceSummary(emp._id, month, year, companyId);
        return {
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.departmentId?.name || "N/A",
          designation: emp.designationId?.name || "N/A",
          ...summary,
        };
      } catch (err) {
        return {
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          error: err.message,
          payableDays: 0,
          lossOfPayDays: 0,
        };
      }
    })
  );

  return summaries;
};

module.exports = {
  getPayrollAttendanceSummary,
  getCompanyAttendanceSummary,
};
