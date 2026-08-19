const Employee = require("../models/Employee");
const Company = require("../models/Company");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const TaskTemplate = require("../models/TaskTemplate");
const Project = require("../models/Project");
const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const Notification = require("../models/Notification");
const Holiday = require("../models/Holiday");
const AuditLog = require("../models/AuditLog");
const Payroll = require("../models/Payroll");
const Announcement = require("../models/Announcement");
const CompanyLeaveSettings = require("../models/CompanyLeaveSettings");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const Branch = require("../models/Branch");
const calculateProfileCompletion = require("../utils/calculateProfileCompletion");

const getDateKey = (d = new Date()) => {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const getEmployeeDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const companyId = req.companyId;

    // 1. Resolve employee profile
    let employee = null;
    if (req.user.employeeId) {
      employee = await Employee.findOne({ _id: req.user.employeeId, companyId })
        .populate([
          { path: "departmentId", select: "name" },
          { path: "departmentIds", select: "name" },
          { path: "accessibleDepartments", select: "name" },
          { path: "designationId", select: "name" },
          { path: "branchId", select: "branchName" },
        ])
        .lean();
    }
    if (!employee) {
      employee = await Employee.findOne({ userId, companyId })
        .populate([
          { path: "departmentId", select: "name" },
          { path: "departmentIds", select: "name" },
          { path: "accessibleDepartments", select: "name" },
          { path: "designationId", select: "name" },
          { path: "branchId", select: "branchName" },
        ])
        .lean();
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found for this account",
      });
    }

    const employeeId = employee._id;
    const todayStr = getDateKey(new Date());
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { departmentId } = req.query;

    let allowedDeptIds = [];
    if (employee) {
      if (employee.departmentId) allowedDeptIds.push(employee.departmentId);
      if (employee.accessibleDepartments && employee.accessibleDepartments.length > 0) {
        employee.accessibleDepartments.forEach((deptId) => {
          if (!allowedDeptIds.map(d => d.toString()).includes(deptId.toString())) {
            allowedDeptIds.push(deptId);
          }
        });
      }
    }

    const taskQueryBase = {
      companyId,
      isLive: true, // Dashboard shows only live tasks, not templates
      $or: [
        { assignedTo: employeeId },
        allowedDeptIds.length > 0 ? { departmentId: { $in: allowedDeptIds }, assignmentType: { $in: ["department", "company", "company_wide"] } } : null,
        { assignmentType: { $in: ["company", "company_wide"] } }
      ].filter(Boolean)
    };

    if (departmentId) {
      taskQueryBase.departmentId = departmentId;
    }

    // Fast counts for Tasks
    const totalRegularTasks = await Task.countDocuments(taskQueryBase);
    const templateQuery = { companyId, assignedTo: employeeId };
    if (departmentId) {
      templateQuery.departmentId = departmentId;
    }
    const totalTemplates = await TaskTemplate.countDocuments(templateQuery);
    const totalTasks = totalRegularTasks + totalTemplates;
    const pendingTasksCount = await Task.countDocuments({ ...taskQueryBase, status: { $in: ["todo", "pending", "open", "re_pending"] } });
    const inProgressTasksCount = await Task.countDocuments({ ...taskQueryBase, status: { $in: ["in-progress", "in_process", "inProgress", "review", "re_in_process", "re_in_progress"] } });
    const completedTasksCount = await Task.countDocuments({ ...taskQueryBase, status: { $in: ["done", "completed", "complete", "late_complete", "re_complete", "re_completed", "re_late_complete"] } });
    
    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const dueTodayCount = await Task.countDocuments({ ...taskQueryBase, status: { $nin: ["done", "completed", "complete", "late_complete", "re_complete", "re_completed", "re_late_complete"] }, dueDate: { $gte: now, $lte: endOfToday } });
    const overdueCount = await Task.countDocuments({ ...taskQueryBase, status: { $nin: ["done", "completed", "complete", "late_complete", "re_complete", "re_completed", "re_late_complete"] }, dueDate: { $lt: now } });

    const todayDay = new Date();
    const currentDay = todayDay.getDay();
    const diff = todayDay.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(todayDay.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const completedThisWeek = await Task.countDocuments({ ...taskQueryBase, status: { $in: ["done", "completed", "complete", "late_complete", "re_complete", "re_completed", "re_late_complete"] }, $or: [{ updatedAt: { $gte: monday } }, { createdAt: { $gte: monday } }] });

    const projectIdsFromTasks = await Task.distinct("projectId", taskQueryBase);

    const userRole = req.user.role || "Employee";
    const deptId = departmentId || employee.departmentId;

    const announcementFilter = {
      status: "published",
      $or: [
        { targetType: "allEmployees" },
        { targetType: "selectedCompany", targetCompanies: companyId },
        { targetType: "roleBased", targetRoles: userRole }
      ]
    };

    if (deptId) {
      announcementFilter.$or.push({ targetType: "departmentBased", targetDepartments: deptId });
    }

    const projectQuery = {
      companyId,
      $or: [
        { members: employeeId },
        { _id: { $in: projectIdsFromTasks } }
      ]
    };
    if (departmentId) {
      projectQuery.departmentId = departmentId;
    }

    const [
      attendanceToday,
      monthlyAttendance,
      allProjects,
      leaveBalanceDoc,
      pendingLeavesCount,
      approvedLeavesCount,
      latestNotifications,
      upcomingHolidays,
      recentActivities,
      latestPayslip,
      rawAnnouncements,
      companyDoc,
      holidaysThisMonth,
      leavesThisMonth,
      unreadNotificationsCount,
      companyLeaveSettings,
    ] = await Promise.all([
      // A. Today attendance
      Attendance.findOne({ companyId, employeeId, date: todayStr }).lean(),

      // B. Monthly logs for summary stats
      Attendance.find({ companyId, employeeId, month: currentMonth, year: currentYear }).lean(),

      // C. All secure Projects matching boundary
      Project.find(projectQuery).lean(),

      // D. Leave balances
      LeaveBalance.findOne({ companyId, employeeId }).lean(),

      // E. Pending leaves count
      Leave.countDocuments({ companyId, employeeId, status: "pending" }),

      // F. Approved leaves count
      Leave.countDocuments({ companyId, employeeId, status: "approved" }),

      // G. Latest Notifications
      Notification.find({ companyId, userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // H. Upcoming Holidays
      Holiday.find({
        companyId,
        date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      })
        .sort({ date: 1 })
        .limit(5)
        .lean(),

      // I. Recent Audit logs
      AuditLog.find({ companyId, performedBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // J. Latest Payslip
      Payroll.findOne({ companyId, employeeId }).sort({ year: -1, month: -1 }).lean(),

      // K. Targeted announcements
      Announcement.find(announcementFilter).sort({ createdAt: -1 }).limit(3).lean(),

      // L. Company doc
      Company.findById(companyId).select("settings.workingDays").lean(),

      // M. Holidays this month
      Holiday.find({
        companyId,
        date: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
        },
      }).lean(),

      // N. Leaves this month
      Leave.find({
        companyId,
        employeeId,
        status: "approved",
        $or: [
          { startDate: { $lte: new Date(currentYear, currentMonth, 0) } },
          { endDate: { $gte: new Date(currentYear, currentMonth - 1, 1) } }
        ]
      }).lean(),
      
      // O. Unread notifications count
      Notification.countDocuments({ companyId, userId, isRead: false }),

      // P. Company Leave Settings
      CompanyLeaveSettings.findOne({ companyId }).lean(),
    ]);

    // 2. Profile completion calculation
    const profileCompResult = calculateProfileCompletion(employee);
    const profileCompletion = {
      isCompleted: employee.isProfileCompleted || profileCompResult.isCompleted,
      percentage: employee.profileCompletionPercentage || profileCompResult.percentage,
    };

    // 3. Attendance Today structure
    const todayAttendanceObj = attendanceToday ? {
      punchInTime: attendanceToday.punchInTime,
      punchOutTime: attendanceToday.punchOutTime,
      totalHours: attendanceToday.totalHours || 0,
      status: attendanceToday.status,
      punchLog: attendanceToday.punchLog || [],
    } : null;

    // 4. Attendance Summary YTD/MTD
    const attendanceSummary = { present: 0, late: 0, absent: 0, halfDay: 0, paidLeave: 0, unpaidLeave: 0, totalLogs: monthlyAttendance.length };
    
    const workingDays = companyDoc?.settings?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth - 1, day);
      const dateStr = getDateKey(currentDate);

      // Don't count future days as absent
      if (dateStr > todayStr) break;

      const dbRecord = monthlyAttendance.find((r) => r.date === dateStr);

      if (dbRecord) {
        if (dbRecord.status === "present" || dbRecord.status === "late") attendanceSummary.present++;
        else if (dbRecord.status === "absent") attendanceSummary.absent++;
        else if (dbRecord.status === "half_day" || dbRecord.status === "half-day") attendanceSummary.halfDay++;
        else if (dbRecord.status === "paid_leave" || dbRecord.status === "paid-leave") attendanceSummary.paidLeave++;
        else if (dbRecord.status === "unpaid_leave" || dbRecord.status === "unpaid-leave") attendanceSummary.unpaidLeave++;
      } else {
        // Evaluate if it's leave, holiday, weekly off
        const matchedLeave = leavesThisMonth.find(l => {
          const start = new Date(l.startDate); start.setHours(0,0,0,0);
          const end = new Date(l.endDate); end.setHours(23,59,59,999);
          return currentDate >= start && currentDate <= end;
        });

        if (matchedLeave) {
          if (matchedLeave.leaveType === "LWP" || matchedLeave.leaveType === "unpaid") attendanceSummary.unpaidLeave++;
          else attendanceSummary.paidLeave++;
        } else {
          const isHoliday = holidaysThisMonth.find(h => getDateKey(new Date(h.date)) === dateStr);
          if (!isHoliday) {
            const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
            const isWorking = workingDays.includes(dayName);
            if (isWorking) {
              attendanceSummary.absent++;
            }
          }
        }
      }
    }

    const taskSummary = {
      assignedTasks: totalTasks,
      pending: pendingTasksCount,
      inProgress: inProgressTasksCount,
      completed: completedTasksCount,
      dueToday: dueTodayCount,
      overdue: overdueCount,
      completedThisWeek,
    };

    // 6. Project summary
    const activeProjects = allProjects.filter(p => ["active", "in-progress", "planning"].includes(p.status));
    const completedProjects = allProjects.filter(p => p.status === "completed");
    const projectProgress = allProjects.length > 0 
      ? Math.round(allProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / allProjects.length)
      : 0;

    const projectSummary = {
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      projectProgress,
    };

    // 7. Leave summary
    const defaultCasual = companyLeaveSettings?.defaultCasualLeaves ?? 0;
    const defaultSick = companyLeaveSettings?.defaultSickLeaves ?? 0;
    const defaultAnnual = companyLeaveSettings?.defaultAnnualLeaves ?? 0;
    const defaultLop = companyLeaveSettings?.defaultUnpaidLeaves ?? 0;

    const leaveSummary = {
      leaveBalance: leaveBalanceDoc || { casual: defaultCasual, sick: defaultSick, annual: defaultAnnual, lop: defaultLop },
      leaveLimits: { casual: defaultCasual, sick: defaultSick, annual: defaultAnnual },
      pendingRequests: pendingLeavesCount,
      approvedLeaves: approvedLeavesCount,
    };

    // 8. Payslip Summary
    const payslipSummary = latestPayslip ? {
      latestPayslipMonth: `${latestPayslip.month} ${latestPayslip.year}`,
      netSalary: latestPayslip.netSalary || 0,
      status: latestPayslip.status,
    } : null;

    // 9. Enriched Announcements
    const announcementsEnriched = (rawAnnouncements || []).map((ann) => {
      const readByList = ann.readBy || [];
      const isRead = readByList.map((id) => id.toString()).includes(userId.toString());
      return {
        ...ann,
        isRead,
      };
    });

    res.json({
      success: true,
      employee,
      profileCompletion,
      todayAttendance: todayAttendanceObj,
      attendanceSummary,
      taskSummary,
      projectSummary,
      leaveSummary,
      payslipSummary,
      notifications: latestNotifications,
      unreadNotificationsCount,
      announcements: announcementsEnriched,
      upcomingHolidays,
      recentActivities,
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeDashboard = async (req, res, next) => {
  return getEmployeeDashboardSummary(req, res, next);
};

module.exports = {
  getEmployeeDashboard,
  getEmployeeDashboardSummary,
};
