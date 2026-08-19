const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const PayrollSettings = require("../models/PayrollSettings");
const Holiday = require("../models/Holiday");

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
  let settings = await PayrollSettings.findOne({ companyId });
  const weeklyOffDays = settings?.weeklyOffDays?.length ? settings.weeklyOffDays : [0]; // Default: Sunday
  const includeWeeklyOffAsPaid = settings?.includeWeeklyOffAsPaid ?? false;
  const includeHolidayAsPaid = settings?.includeHolidayAsPaid ?? true;
  const fullDayMinHours = settings?.fullDayMinHours ?? 8;
  const halfDayMinHours = settings?.halfDayMinHours ?? 4;

  // 1. Determine effective start date (mid-month joiners)
  let effectiveStartStr = startStr;
  if (emp.joiningDate) {
    const jDate = new Date(emp.joiningDate);
    if (jDate > startDay) {
      effectiveStartStr = toDateStr(jDate);
    }
  }

  // 2. Enumerate all days and classify as working/weekly-off
  let workingDays = 0;
  let weeklyOffDays_count = 0;
  const workingDaySet = new Set();
  const weeklyOffDaySet = new Set();

  for (let d = 1; d <= totalCalendarDays; d++) {
    const current = new Date(targetYear, targetMonth - 1, d);
    const currentStr = toDateStr(current);
    if (currentStr < effectiveStartStr || currentStr > endStr) continue;

    const dow = current.getDay();
    if (weeklyOffDays.includes(dow)) {
      weeklyOffDays_count++;
      weeklyOffDaySet.add(currentStr);
    } else {
      workingDays++;
      workingDaySet.add(currentStr);
    }
  }

  // 3. Fetch holidays (only count if on a working day)
  const holidays = await Holiday.find({
    companyId,
    date: { $gte: startDay, $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59) },
  });

  let holidayDays = 0;
  const holidayDaySet = new Set();
  holidays.forEach((h) => {
    const hDate = new Date(h.date);
    const hStr = toDateStr(hDate);
    if (workingDaySet.has(hStr)) {
      holidayDays++;
      holidayDaySet.add(hStr);
      workingDaySet.delete(hStr);
      workingDays--;
    }
  });

  // 4. Fetch all attendance records for the month using STRING date comparison
  const attendanceRecords = await Attendance.find({
    employeeId,
    companyId,
    date: { $gte: startStr, $lte: endStr },
  });

  // Build a map of date → record for easy lookup
  const attMap = {};
  attendanceRecords.forEach((r) => {
    attMap[r.date] = r;
  });

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  // 5. Fetch approved Leave records from Leave model
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

  // 6. Calculate Payable, LOP, and all Breakdowns exactly per day
  const todayStr = toDateStr(new Date());
  
  let finalPayableDays = 0;
  let finalLOPDays = 0;

  for (let d = 1; d <= totalCalendarDays; d++) {
    const current = new Date(targetYear, targetMonth - 1, d);
    const dStr = toDateStr(current);
    
    // Out of effective dates (e.g., joined mid-month or left mid-month)
    if (dStr < effectiveStartStr || dStr > endStr) {
      finalLOPDays += 1;
      continue;
    }

    // Is there an approved leave?
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

    // Is it a Holiday?
    if (holidayDaySet.has(dStr)) {
      if (includeHolidayAsPaid) finalPayableDays += 1;
      else finalLOPDays += 1;
      continue;
    }

    // Is it a Weekly Off?
    const dow = current.getDay();
    if (weeklyOffDays.includes(dow)) {
      if (includeWeeklyOffAsPaid) {
        finalPayableDays += 1;
      }
      // If weekly off is unpaid, it is an off day (non-working day), neither payable nor penalized as LOP
      continue;
    }

    // It's a regular working day. Check attendance.
    const att = attMap[dStr];
    if (att) {
      let status = (att.status || "").toLowerCase();
      
      // Auto-classify based on totalHours if status is missing or absent
      if (!status || status === "absent") {
        if (att.totalHours >= fullDayMinHours) {
          status = "present";
        } else if (att.totalHours >= halfDayMinHours) {
          status = "half_day";
        }
      }

      if (status === "present") {
        presentDays += 1;
        finalPayableDays += 1;
      } else if (status === "late") {
        lateDays += 1;
        finalPayableDays += 1;
      } else if (status === "paid_leave") {
        paidLeaveDays += 1;
        finalPayableDays += 1;
      } else if (status === "half_day") {
        halfDays += 1;
        finalPayableDays += 0.5;
        finalLOPDays += 0.5;
      } else { // absent or unpaid_leave
        absentDays += 1;
        finalLOPDays += 1;
      }
    } else {
      // Unrecorded day
      if (dStr <= todayStr) {
        // Past unrecorded -> Absent
        absentDays += 1;
        finalLOPDays += 1;
      } else {
        // Future unrecorded -> Strict Mode: Mark as Absent/LOP since they haven't punched yet
        absentDays += 1;
        finalLOPDays += 1;
      }
    }
  }

  let payableDays = Math.round(finalPayableDays * 100) / 100;
  let lossOfPayDays = Math.round(finalLOPDays * 100) / 100;

  return {
    totalCalendarDays,
    workingDays,
    weeklyOffDays: weeklyOffDays_count,
    holidayDays,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    payableDays: Math.round(payableDays * 100) / 100,
    lossOfPayDays: Math.round(lossOfPayDays * 100) / 100,
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
