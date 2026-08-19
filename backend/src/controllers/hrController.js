const Company = require("../models/Company");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Payroll = require("../models/Payroll");
const Holiday = require("../models/Holiday");
const Notification = require("../models/Notification");
const Department = require("../models/Department");
const SalaryStructure = require("../models/SalaryStructure");

// GET /api/hr/dashboard
const getHRDashboard = async (req, res, next) => {
  try {
    const { companyId } = req;
    
    // We want dates in YYYY-MM-DD format
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    // Monthly range for approved leaves
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // For payroll, we match by numeric month (1-12) or string (January-December)
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();

    const [
      totalEmployees,
      activeEmployees,
      presentToday,
      lateToday,
      halfDayToday,
      pendingLeavesCount,
      approvedLeavesThisMonth,
      payrollGeneratedThisMonth,
      pendingPayroll,
      upcomingHolidaysCount,
    ] = await Promise.all([
      Employee.countDocuments({ companyId }),
      Employee.countDocuments({ companyId, status: "active" }),
      Attendance.countDocuments({ companyId, date: todayStr, status: "present" }),
      Attendance.countDocuments({ companyId, date: todayStr, status: "late" }),
      Attendance.countDocuments({ companyId, date: todayStr, status: "half-day" }),
      Leave.countDocuments({ companyId, status: "pending" }),
      Leave.countDocuments({
        companyId,
        status: "approved",
        $or: [
          { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
          { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      }),
      Payroll.countDocuments({
        companyId,
        $or: [
          { month: String(currentMonthNum), year: currentYearNum },
          { month: String(now.toLocaleString("en-US", { month: "long" })), year: currentYearNum }
        ]
      }),
      Payroll.countDocuments({ companyId, status: "pending" }),
      Holiday.countDocuments({ companyId, date: { $gte: new Date(todayStr) } }),
    ]);

    const absentToday = Math.max(0, activeEmployees - (presentToday + lateToday + halfDayToday));

    // Fetch Lists
    const [
      attendanceSummary,
      recentEmployees,
      pendingLeaveRequests,
      regularizationRequests,
      upcomingHolidays,
      latestNotifications,
      departments,
      payrolls,
    ] = await Promise.all([
      Attendance.find({ companyId, date: todayStr })
        .populate("employeeId", "firstName lastName employeeCode photo email phone")
        .limit(10),
      Employee.find({ companyId })
        .populate("departmentId", "name")
        .populate("designationId", "name")
        .populate("branchId", "branchName")
        .sort({ createdAt: -1 })
        .limit(5),
      Leave.find({ companyId, status: "pending" })
        .populate("employeeId", "firstName lastName employeeCode departmentId")
        .sort({ createdAt: -1 })
        .limit(5),
      Attendance.find({ companyId, regularizationStatus: "pending" })
        .populate("employeeId", "firstName lastName employeeCode departmentId")
        .sort({ updatedAt: -1 })
        .limit(5),
      Holiday.find({ companyId, date: { $gte: new Date(todayStr) } })
        .sort({ date: 1 })
        .limit(5),
      Notification.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(5),
      Department.find({ companyId }),
      Payroll.find({ companyId }),
    ]);

    // Department-wise Employee Count
    const departmentWiseCount = await Promise.all(
      departments.map(async (dept) => {
        const count = await Employee.countDocuments({ companyId, departmentId: dept._id, status: "active" });
        return { departmentName: dept.name, count };
      })
    );

    // Payroll Summary
    const totalPaidCost = payrolls.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.netSalary, 0);
    const totalPendingCost = payrolls.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.netSalary, 0);
    const payrollSummary = {
      totalPaidCost,
      totalPendingCost,
      totalCost: totalPaidCost + totalPendingCost,
      totalRecords: payrolls.length,
      paidRecords: payrolls.filter((p) => p.status === "paid").length,
      pendingRecords: payrolls.filter((p) => p.status === "pending").length,
    };

    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday,
        lateToday,
        pendingLeavesCount,
        approvedLeavesThisMonth,
        payrollGeneratedThisMonth,
        pendingPayroll,
        upcomingHolidaysCount,
      },
      todayAttendanceSummary: attendanceSummary,
      recentEmployees,
      pendingLeaveRequests,
      attendanceRegularizationRequests: regularizationRequests,
      upcomingHolidays,
      latestNotifications,
      departmentWiseEmployeeCount: departmentWiseCount,
      payrollSummary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHRDashboard,
};
