const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const Employee = require("../models/Employee");

/**
 * Calculates month-wise leave accruals, carry-over from past months,
 * usage this month, and remaining allowed leaves under the monthly cap.
 *
 * @param {string|ObjectId} employeeId
 * @param {string|ObjectId} companyId
 * @param {Date} [asOfDate=new Date()]
 * @param {Object} [existingBalanceDoc=null]
 * @returns {Promise<Object>} monthlyMetrics
 */
const calculateLeaveAccrualMetrics = async (employeeId, companyId, asOfDate = new Date(), existingBalanceDoc = null) => {
  try {
    let balance = existingBalanceDoc;
    if (!balance) {
      balance = await LeaveBalance.findOne({ employeeId, companyId }).lean();
      if (!balance) {
        balance = await LeaveBalance.createWithDefaults(employeeId, companyId);
        if (balance && balance.toObject) balance = balance.toObject();
      }
    }

    const employee = await Employee.findById(employeeId).select("joiningDate firstName lastName").lean();

    const date = asOfDate instanceof Date && !isNaN(asOfDate.getTime()) ? asOfDate : new Date();
    const currentYear = date.getFullYear();
    const currentMonthIndex = date.getMonth(); // 0-11
    const currentMonthNum = currentMonthIndex + 1; // 1-12

    // Determine when employee's leave accrual started for this calendar year
    let startMonthNum = 1;
    if (employee?.joiningDate) {
      const joiningDate = new Date(employee.joiningDate);
      if (!isNaN(joiningDate.getTime()) && joiningDate.getFullYear() === currentYear) {
        startMonthNum = joiningDate.getMonth() + 1;
      } else if (!isNaN(joiningDate.getTime()) && joiningDate.getFullYear() > currentYear) {
        startMonthNum = 12; // joined in future
      }
    }

    // Number of months active in current year up to current month (inclusive)
    const monthsElapsed = Math.max(1, Math.min(12, currentMonthNum - startMonthNum + 1));
    const pastMonthsCount = Math.max(0, monthsElapsed - 1);

    // Monthly accrual rates (defaults to 0 if not configured)
    const annualCasual = Number(balance.casual ?? 0);
    const annualSick = Number(balance.sick ?? 0);
    const annualAnnual = Number(balance.annual ?? 0);
    const monthlyCap = Number(balance.monthlyLeaves ?? 0);

    const monthlyCasualRate = Number(
      (balance.monthlyCasual !== undefined && balance.monthlyCasual !== null
        ? balance.monthlyCasual
        : (annualCasual ? annualCasual / 12 : 0)
      ).toFixed(2)
    );

    const monthlySickRate = Number(
      (balance.monthlySick !== undefined && balance.monthlySick !== null
        ? balance.monthlySick
        : (annualSick ? annualSick / 12 : 0)
      ).toFixed(2)
    );

    const monthlyAnnualRate = Number(
      (balance.monthlyAnnual !== undefined && balance.monthlyAnnual !== null
        ? balance.monthlyAnnual
        : (annualAnnual ? annualAnnual / 12 : 0)
      ).toFixed(2)
    );

    const totalMonthlyAccrual = Number((monthlyCasualRate + monthlySickRate + monthlyAnnualRate).toFixed(2));

    // Date boundaries
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const startOfCurrentMonth = new Date(currentYear, currentMonthIndex, 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0, 23, 59, 59, 999);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Query leaves taken this calendar year
    const leavesThisYear = await Leave.find({
      employeeId,
      companyId,
      status: { $in: ["approved", "pending"] },
      startDate: { $gte: startOfYear, $lte: endOfYear },
    }).lean();

    // Sum past usage vs current month usage
    const pastUsed = { casual: 0, sick: 0, annual: 0, unpaid: 0, totalPaid: 0, totalAll: 0 };
    const currentMonthUsed = { casual: 0, sick: 0, annual: 0, unpaid: 0, totalPaid: 0, totalAll: 0 };
    const pendingThisMonth = { casual: 0, sick: 0, annual: 0, unpaid: 0, totalPaid: 0, totalAll: 0 };

    for (const l of leavesThisYear) {
      const days = Number(l.numberOfDays || 1);
      const lStart = new Date(l.startDate);
      const typeKey = (l.leaveType || "").toLowerCase();
      const isPaid = ["casual", "sick", "annual"].includes(typeKey);

      if (l.status === "approved") {
        if (lStart < startOfCurrentMonth) {
          // Used in prior months of this year
          if (typeKey === "casual") pastUsed.casual += days;
          else if (typeKey === "sick") pastUsed.sick += days;
          else if (typeKey === "annual") pastUsed.annual += days;
          else pastUsed.unpaid += days;

          if (isPaid) pastUsed.totalPaid += days;
          pastUsed.totalAll += days;
        } else if (lStart <= endOfCurrentMonth) {
          // Used in current month
          if (typeKey === "casual") currentMonthUsed.casual += days;
          else if (typeKey === "sick") currentMonthUsed.sick += days;
          else if (typeKey === "annual") currentMonthUsed.annual += days;
          else currentMonthUsed.unpaid += days;

          if (isPaid) currentMonthUsed.totalPaid += days;
          currentMonthUsed.totalAll += days;
        }
      } else if (l.status === "pending" && lStart >= startOfCurrentMonth && lStart <= endOfCurrentMonth) {
        // Pending in current month
        if (typeKey === "casual") pendingThisMonth.casual += days;
        else if (typeKey === "sick") pendingThisMonth.sick += days;
        else if (typeKey === "annual") pendingThisMonth.annual += days;
        else pendingThisMonth.unpaid += days;

        if (isPaid) pendingThisMonth.totalPaid += days;
        pendingThisMonth.totalAll += days;
      }
    }

    // Past accruals
    const pastAccruedCasual = Number((pastMonthsCount * monthlyCasualRate).toFixed(2));
    const pastAccruedSick = Number((pastMonthsCount * monthlySickRate).toFixed(2));
    const pastAccruedAnnual = Number((pastMonthsCount * monthlyAnnualRate).toFixed(2));
    const pastAccruedTotal = Number((pastMonthsCount * totalMonthlyAccrual).toFixed(2));

    // Carried over from past months = past accrued - past used (cannot be negative)
    const carriedOverCasual = Math.max(0, Number((pastAccruedCasual - pastUsed.casual).toFixed(2)));
    const carriedOverSick = Math.max(0, Number((pastAccruedSick - pastUsed.sick).toFixed(2)));
    const carriedOverAnnual = Math.max(0, Number((pastAccruedAnnual - pastUsed.annual).toFixed(2)));
    const carriedOverTotal = Math.max(0, Number((pastAccruedTotal - pastUsed.totalPaid).toFixed(2)));

    // Current month entitlement (Quota for this month)
    const currentMonthQuota = {
      casual: monthlyCasualRate,
      sick: monthlySickRate,
      annual: monthlyAnnualRate,
      total: totalMonthlyAccrual,
    };

    // Total available this month before cap = Carried over + Current month quota - Current month used
    const currentMonthAvailableCasual = Math.max(0, Number((carriedOverCasual + monthlyCasualRate - currentMonthUsed.casual).toFixed(2)));
    const currentMonthAvailableSick = Math.max(0, Number((carriedOverSick + monthlySickRate - currentMonthUsed.sick).toFixed(2)));
    const currentMonthAvailableAnnual = Math.max(0, Number((carriedOverAnnual + monthlyAnnualRate - currentMonthUsed.annual).toFixed(2)));
    const currentMonthAvailableTotal = Math.max(0, Number((carriedOverTotal + totalMonthlyAccrual - currentMonthUsed.totalPaid).toFixed(2)));

    // Monthly Cap enforcement (e.g. max 3 or 4 days per month)
    const maxRemainingUnderMonthlyCap = Math.max(0, Number((monthlyCap - currentMonthUsed.totalPaid).toFixed(2)));

    // True allowed remaining leaves employee can actually take this month
    const allowedRemainingThisMonth = Math.max(0, Math.min(currentMonthAvailableTotal, maxRemainingUnderMonthlyCap));

    return {
      currentMonthNum,
      currentMonthName: date.toLocaleString("en-US", { month: "long" }),
      currentYear,
      monthsElapsed,
      pastMonthsCount,
      monthlyCap,
      monthlyRates: {
        casual: monthlyCasualRate,
        sick: monthlySickRate,
        annual: monthlyAnnualRate,
        total: totalMonthlyAccrual,
      },
      currentMonthQuota,
      carriedOver: {
        casual: carriedOverCasual,
        sick: carriedOverSick,
        annual: carriedOverAnnual,
        total: carriedOverTotal,
      },
      pastUsed,
      currentMonthUsed,
      pendingThisMonth,
      currentMonthAvailable: {
        casual: currentMonthAvailableCasual,
        sick: currentMonthAvailableSick,
        annual: currentMonthAvailableAnnual,
        total: currentMonthAvailableTotal,
      },
      maxRemainingUnderMonthlyCap,
      allowedRemainingThisMonth,
      annualRemaining: {
        casual: annualCasual,
        sick: annualSick,
        annual: annualAnnual,
        unpaid: Number(balance.lop ?? balance.unpaidLeaves ?? 0),
        totalPaid: Number(balance.paidLeaves ?? (annualCasual + annualSick + annualAnnual)),
      },
      annualAllocated: {
        casual: Number((monthlyCasualRate * 12).toFixed(1)),
        sick: Number((monthlySickRate * 12).toFixed(1)),
        annual: Number((monthlyAnnualRate * 12).toFixed(1)),
        totalPaid: Number(((monthlyCasualRate + monthlySickRate + monthlyAnnualRate) * 12).toFixed(1)),
      },
    };
  } catch (error) {
    console.error("[calculateLeaveAccrualMetrics] Error:", error);
    return null;
  }
};

module.exports = {
  calculateLeaveAccrualMetrics,
};
