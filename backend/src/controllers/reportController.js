const mongoose = require("mongoose");
const Company = require("../models/Company");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const ReportLog = require("../models/ReportLog");
const Leave = require("../models/Leave");
const Payroll = require("../models/Payroll");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Department = require("../models/Department");
const Designation = require("../models/Designation");

const allowCompanyScope = (req) => {
  if (req.user && req.user.role === "SuperAdmin") {
    return req.query.companyId || req.companyId || null;
  }
  return req.companyId || (req.user && req.user.companyId) || null;
};

const buildDateFilter = (req, dateField = "createdAt") => {
  const { month, year } = req.query;
  const filter = {};
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);
    filter[dateField] = { $gte: startDate, $lte: endDate };
  } else if (year) {
    const y = parseInt(year, 10);
    const startDate = new Date(y, 0, 1);
    const endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    filter[dateField] = { $gte: startDate, $lte: endDate };
  }
  return filter;
};

const logReport = async (req, reportType, filters) => {
  try {
    await ReportLog.create({
      reportType,
      companyId: filters.companyId || null,
      generatedBy: req.user._id,
      filters,
    });
  } catch (err) {
    console.warn("Failed to save report log", err);
  }
};

const getGlobalCompanyStats = async () => {
  const [totalCompanies, activeCompanies, totalEmployees] = await Promise.all([
    Company.countDocuments(),
    Company.countDocuments({ status: "active" }),
    Employee.countDocuments(),
  ]);

  return {
    totalCompanies,
    activeCompanies,
    totalEmployees,
    totalRevenue: 0,
  };
};

const getCompanyDashboardSummary = async (companyId) => {
  const today = new Date().toISOString().slice(0, 10);
  const [totalEmployees, presentToday, absentToday, lateToday, halfDayToday] =
    await Promise.all([
      Employee.countDocuments({ companyId }),
      Attendance.countDocuments({ companyId, date: today, status: "present" }),
      Attendance.countDocuments({ companyId, date: today, status: "absent" }),
      Attendance.countDocuments({ companyId, date: today, status: "late" }),
      Attendance.countDocuments({ companyId, date: today, status: "half-day" }),
    ]);

  const now = new Date();

  const [
    totalLeaves, pendingLeaves, approvedLeaves, rejectedLeaves,
    totalProjects, activeProjects, completedProjects,
    totalTasks, completedTasks, pendingTasks, overdueTasks
  ] = await Promise.all([
    Leave.countDocuments({ companyId }),
    Leave.countDocuments({ companyId, status: "pending" }),
    Leave.countDocuments({ companyId, status: "approved" }),
    Leave.countDocuments({ companyId, status: "rejected" }),
    
    Project.countDocuments({ companyId }),
    Project.countDocuments({ companyId, status: { $in: ["active", "working"] } }),
    Project.countDocuments({ companyId, status: "completed" }),
    
    Task.countDocuments({ companyId }),
    Task.countDocuments({ companyId, status: "completed" }),
    Task.countDocuments({ companyId, status: { $ne: "completed" } }),
    Task.countDocuments({ companyId, status: { $ne: "completed" }, dueDate: { $lt: now } }),
  ]);

  const payrollAgg = await Payroll.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    { $group: {
        _id: "$status",
        totalSalary: { $sum: "$netSalary" }
    }}
  ]);

  let totalPayroll = 0, paidPayroll = 0, duePayroll = 0;
  payrollAgg.forEach(p => {
    totalPayroll += p.totalSalary;
    if (p._id === "paid") paidPayroll += p.totalSalary;
    else duePayroll += p.totalSalary;
  });

  return {
    totalEmployees,
    attendance: {
      presentToday,
      absentToday,
      lateToday,
      halfDayToday,
    },
    leaves: {
      totalLeaves,
      pending: pendingLeaves,
      approved: approvedLeaves,
      rejected: rejectedLeaves,
    },
    payroll: {
      totalPayroll,
      paid: paidPayroll,
      due: duePayroll,
    },
    projects: {
      totalProjects,
      activeProjects,
      completedProjects,
    },
    tasks: {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    },
  };
};

const getEmployeeDashboardSummary = async (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  const [presentCount, absentCount, lateCount, halfDayCount, totalRecords] =
    await Promise.all([
      Attendance.countDocuments({ userId, status: "present" }),
      Attendance.countDocuments({ userId, status: "absent" }),
      Attendance.countDocuments({ userId, status: "late" }),
      Attendance.countDocuments({ userId, status: "half-day" }),
      Attendance.countDocuments({ userId }),
    ]);

  const employeeInfo = await Employee.findOne({ userId });
  let pendingLeaves = 0, approvedLeaves = 0, rejectedLeaves = 0;
  let totalTasks = 0, completedTasks = 0, pendingTasks = 0, overdueTasks = 0;
  
  if (employeeInfo) {
    const empId = employeeInfo._id;
    const now = new Date();
    
    [
      pendingLeaves, approvedLeaves, rejectedLeaves,
      totalTasks, completedTasks, pendingTasks, overdueTasks
    ] = await Promise.all([
      Leave.countDocuments({ employeeId: empId, status: "pending" }),
      Leave.countDocuments({ employeeId: empId, status: "approved" }),
      Leave.countDocuments({ employeeId: empId, status: "rejected" }),
      
      Task.countDocuments({ assignedTo: empId }),
      Task.countDocuments({ assignedTo: empId, status: "completed" }),
      Task.countDocuments({ assignedTo: empId, status: { $ne: "completed" } }),
      Task.countDocuments({ assignedTo: empId, status: { $ne: "completed" }, dueDate: { $lt: now } })
    ]);
  }

  return {
    attendance: {
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      totalRecords,
      todayStatus: await Attendance.findOne({ userId, date: today }).then((doc) => doc?.status || "absent"),
    },
    leaves: {
      pending: pendingLeaves,
      approved: approvedLeaves,
      rejected: rejectedLeaves,
    },
    tasks: {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    },
  };
};

const getDashboardSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    let result;
    let filters = { companyId: queryCompanyId };

    if (req.user.role === "SuperAdmin") {
      result = queryCompanyId
        ? await getCompanyDashboardSummary(queryCompanyId)
        : await getGlobalCompanyStats();
    } else if (req.user.role === "Employee") {
      result = await getEmployeeDashboardSummary(req.user._id);
    } else {
      result = await getCompanyDashboardSummary(queryCompanyId);
    }

    await logReport(req, "dashboard-summary", filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    let filter = buildDateFilter(req, "date");

    if (req.user.role === "SuperAdmin") {
      if (queryCompanyId) filter.companyId = queryCompanyId;
    } else if (req.user.role === "Employee") {
      filter.userId = req.user._id;
      if (queryCompanyId) filter.companyId = queryCompanyId;
    } else {
      if (queryCompanyId) filter.companyId = queryCompanyId;
    }

    const [present, absent, late, halfDay, total, list] = await Promise.all([
      Attendance.countDocuments({ ...filter, status: "present" }),
      Attendance.countDocuments({ ...filter, status: "absent" }),
      Attendance.countDocuments({ ...filter, status: "late" }),
      Attendance.countDocuments({ ...filter, status: "half-day" }),
      Attendance.countDocuments(filter),
      Attendance.find(filter).populate("userId", "name email").sort({ date: -1 })
    ]);

    await logReport(req, "attendance-summary", filter);
    res.json({ present, absent, late, halfDay, total, list });
  } catch (error) {
    next(error);
  }
};

const getLeaveSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const leaves = await Leave.find(filter).populate("employeeId").sort({ createdAt: -1 });
    let pending = 0, approved = 0, rejected = 0;
    leaves.forEach(l => {
      if (l.status === "pending") pending++;
      else if (l.status === "approved") approved++;
      else if (l.status === "rejected") rejected++;
    });

    await logReport(req, "leave-summary", filter);
    res.json({ totalLeaves: leaves.length, pending, approved, rejected, list: leaves });
  } catch (error) {
    next(error);
  }
};

const getPayrollSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const payrolls = await Payroll.find(filter).populate("employeeId").sort({ createdAt: -1 });
    let totalPayroll = 0, paid = 0, due = 0;
    payrolls.forEach(p => {
      totalPayroll += p.netSalary || 0;
      if (p.status === "paid") paid += p.netSalary || 0;
      else due += p.netSalary || 0;
    });

    await logReport(req, "payroll-summary", filter);
    res.json({ totalPayroll, paid, due, list: payrolls });
  } catch (error) {
    next(error);
  }
};

const getTaskSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { status: { $ne: "cancelled" }, ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const { buildTaskReportSummary } = require("../utils/taskReportUtils");
    const tasks = await Task.find(filter)
      .populate("assignedTo", "firstName lastName fullName")
      .sort({ createdAt: -1 });

    const summary = buildTaskReportSummary(tasks);

    await logReport(req, "task-summary", filter);
    res.json({
      success: true,
      ...summary,
      totalTasks: summary.total,
      completedTasks: summary.completed,
      pendingTasks: summary.pending,
      overdueTasks: summary.overdue,
      onTimeTasks: summary.onTime,
      delayedTasks: summary.delayed,
      list: tasks,
    });
  } catch (error) {
    next(error);
  }
};

const getProjectSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const projects = await Project.find(filter).populate("projectManager members").sort({ createdAt: -1 });
    let activeProjects = 0, completedProjects = 0, otherProjects = 0;
    projects.forEach(p => {
      if (p.status === "active" || p.status === "working") activeProjects++;
      else if (p.status === "completed") completedProjects++;
      else otherProjects++;
    });

    await logReport(req, "project-summary", filter);
    res.json({ totalProjects: projects.length, activeProjects, completedProjects, otherProjects, list: projects });
  } catch (error) {
    next(error);
  }
};

const getPerformanceReport = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;
    
    // We get tasks and attendance for this period
    const tasks = await Task.find(filter).populate("assignedTo");
    const attendances = await Attendance.find(buildDateFilter(req, "date")).populate("userId");
    
    let empFilter = { status: "active" };
    if (queryCompanyId) empFilter.companyId = queryCompanyId;
    const employees = await Employee.find(empFilter).populate("userId designationId");

    const performanceData = employees.map(emp => {
      const empTasks = tasks.filter(t => t.assignees.some(a => a._id.toString() === emp._id.toString()));
      const completedTasks = empTasks.filter(t => t.status === "completed").length;
      const taskCompletionRate = empTasks.length ? (completedTasks / empTasks.length) * 100 : 100;

      const empAtt = attendances.filter(a => a.userId && emp.userId && a.userId._id.toString() === emp.userId._id.toString());
      const totalAtt = empAtt.length;
      const presentOrHalf = empAtt.filter(a => a.status === "present" || a.status === "half-day").length;
      const attendanceRate = totalAtt ? (presentOrHalf / totalAtt) * 100 : 100;

      const performanceScore = (taskCompletionRate * 0.6) + (attendanceRate * 0.4);

      return {
        employee: emp,
        totalTasks: empTasks.length,
        completedTasks,
        taskCompletionRate,
        totalAttendanceDays: totalAtt,
        presentDays: presentOrHalf,
        attendanceRate,
        performanceScore,
      };
    });

    const sortedData = performanceData.sort((a, b) => b.performanceScore - a.performanceScore);

    res.json({
      averageScore: sortedData.length ? sortedData.reduce((acc, curr) => acc + curr.performanceScore, 0) / sortedData.length : 0,
      list: sortedData
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeSummary = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    if (req.user.role === "Employee") {
      const employee = await Employee.findById(req.user.employeeId);
      const attendanceCount = await Attendance.countDocuments({ userId: req.user._id, ...buildDateFilter(req, "date") });
      await logReport(req, "employee-summary", { companyId: queryCompanyId, userId: req.user._id });
      return res.json({
        name: req.user.name,
        role: req.user.role,
        email: req.user.email,
        attendanceCount,
        status: employee?.status || "unknown",
        companyId: req.user.companyId,
      });
    }

    const employeeCount = await Employee.countDocuments({ ...filter });
    const activeCount = await Employee.countDocuments({ ...filter, status: "active" });
    const inactiveCount = await Employee.countDocuments({
      ...filter,
      status: { $in: ["inactive", "terminated"] },
    });
    
    const list = await Employee.find(filter).populate("designationId departmentId").sort({ createdAt: -1 });

    await logReport(req, "employee-summary", filter);
    res.json({ totalEmployees: employeeCount, activeEmployees: activeCount, inactiveEmployees: inactiveCount, list });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Detailed Task Analytics API (Unchanged Existing APIs) ─────────────────
const getTaskDetailedAnalytics = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { status: { $ne: "cancelled" }, ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const [tasks, departments] = await Promise.all([
      Task.find(filter).populate("assignedTo", "firstName lastName fullName departmentId designationId").sort({ createdAt: -1 }),
      Department.find({ ...(queryCompanyId ? { companyId: queryCompanyId } : {}) })
    ]);

    const statusBreakdown = {};
    const priorityBreakdown = { high: { total: 0, completed: 0 }, medium: { total: 0, completed: 0 }, low: { total: 0, completed: 0 } };
    const employeeMap = {};

    tasks.forEach(task => {
      const st = task.status || "pending";
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;

      const prio = (task.priority || "medium").toLowerCase();
      if (priorityBreakdown[prio]) {
        priorityBreakdown[prio].total += 1;
        if (["complete", "completed", "done", "late_complete"].includes(st)) {
          priorityBreakdown[prio].completed += 1;
        }
      }

      (task.assignedTo || []).forEach(emp => {
        if (!emp || !emp._id) return;
        const id = emp._id.toString();
        if (!employeeMap[id]) {
          employeeMap[id] = {
            employeeId: id,
            name: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Team Member",
            totalAssigned: 0,
            completed: 0,
            pending: 0,
            overdue: 0
          };
        }
        employeeMap[id].totalAssigned += 1;
        if (["complete", "completed", "done", "late_complete"].includes(st)) {
          employeeMap[id].completed += 1;
        } else if (st === "overdue" || (task.endDateTime && new Date(task.endDateTime) < new Date() && !["complete", "completed"].includes(st))) {
          employeeMap[id].overdue += 1;
        } else {
          employeeMap[id].pending += 1;
        }
      });
    });

    const employeeWorkload = Object.values(employeeMap).map(e => ({
      ...e,
      completionRate: e.totalAssigned > 0 ? Math.round((e.completed / e.totalAssigned) * 100) : 0
    })).sort((a, b) => b.totalAssigned - a.totalAssigned);

    res.json({
      success: true,
      totalTasks: tasks.length,
      statusBreakdown,
      priorityBreakdown,
      employeeWorkload,
      departments,
      list: tasks
    });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Detailed Employee Analytics API (Unchanged Existing APIs) ─────────────
const getEmployeeDetailedAnalytics = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const [employees, tasks, leaves, departments] = await Promise.all([
      Employee.find(filter).populate("designationId departmentId").sort({ createdAt: -1 }),
      Task.find({ status: { $ne: "cancelled" }, ...(queryCompanyId ? { companyId: queryCompanyId } : {}) }).populate("assignedTo", "firstName lastName fullName email userId"),
      Leave.find({ ...(queryCompanyId ? { companyId: queryCompanyId } : {}) }).populate("employeeId", "firstName lastName fullName email userId"),
      Department.find({ ...(queryCompanyId ? { companyId: queryCompanyId } : {}) })
    ]);

    const departmentBreakdown = {};
    const designationBreakdown = {};

    const employeeGrid = employees.map(emp => {
      const deptName = emp.departmentId?.name || emp.departmentId?.departmentName || "General";
      const desigName = emp.designationId?.name || emp.designationId?.title || "Staff";

      if (!departmentBreakdown[deptName]) {
        departmentBreakdown[deptName] = { total: 0, active: 0, inactive: 0 };
      }
      departmentBreakdown[deptName].total += 1;
      if (emp.status === "active") departmentBreakdown[deptName].active += 1;
      else departmentBreakdown[deptName].inactive += 1;

      designationBreakdown[desigName] = (designationBreakdown[desigName] || 0) + 1;

      const empIds = [emp._id?.toString(), emp.userId?.toString(), emp.employeeCode].filter(Boolean);
      const empEmails = [emp.email, emp.personalEmail].filter(Boolean).map(e => e.toLowerCase());
      const empName = (emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()).toLowerCase();

      const empTasks = tasks.filter(t => {
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : (Array.isArray(t.assignees) ? t.assignees : (t.assignees ? [t.assignees] : [])));
        return assignees.some(a => {
          const aId = a?._id?.toString() || a?.id?.toString() || a?.userId?.toString() || a?.employeeId?.toString() || (typeof a === 'string' && a.match(/^[0-9a-fA-F]{24}$/) ? a : "");
          const aEmail = a?.email ? a.email.toLowerCase() : "";
          const aName = a?.fullName?.toLowerCase() || a?.name?.toLowerCase() || "";
          if (aId && empIds.includes(aId)) return true;
          if (aEmail && empEmails.includes(aEmail)) return true;
          if (!aId && !aEmail && aName && aName === empName && empName !== "") return true;
          return false;
        });
      });
      const completedTasks = empTasks.filter(t => ["complete", "completed", "done", "late_complete"].includes(t.status)).length;

      const empLeaves = leaves.filter(l => {
        const lEmpId = l.employeeId?._id?.toString() || l.employeeId?.toString() || l.userId?.toString() || l.user?._id?.toString() || (typeof l.employeeId === 'string' && l.employeeId.match(/^[0-9a-fA-F]{24}$/) ? l.employeeId : "");
        const lEmail = l.email?.toLowerCase() || l.employeeId?.email?.toLowerCase() || l.user?.email?.toLowerCase() || "";
        const lName = l.employeeName?.toLowerCase() || l.employeeId?.fullName?.toLowerCase() || l.employeeId?.name?.toLowerCase() || "";
        if (lEmpId && empIds.includes(lEmpId)) return true;
        if (lEmail && empEmails.includes(lEmail)) return true;
        if (!lEmpId && !lEmail && lName && lName === empName && empName !== "") return true;
        return false;
      });
      const approvedLeaves = empLeaves.filter(l => l.status === "approved").length;

      return {
        _id: emp._id,
        name: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee",
        email: emp.email || emp.personalEmail || "—",
        phone: emp.phone || emp.mobileNumber || "—",
        status: emp.status || "active",
        department: deptName,
        designation: desigName,
        joinDate: emp.joinDate || emp.joiningDate || emp.createdAt,
        totalTasks: empTasks.length,
        completedTasks,
        taskCompletionRate: empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 0,
        leaveRequests: empLeaves.length,
        approvedLeaves
      };
    });

    res.json({
      success: true,
      totalEmployees: employees.length,
      departmentBreakdown,
      designationBreakdown,
      employeeGrid,
      departments,
      list: employees
    });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Detailed Leave Analytics API (Unchanged Existing APIs) ────────────────
const getLeaveDetailedAnalytics = async (req, res, next) => {
  try {
    const queryCompanyId = allowCompanyScope(req);
    const filter = { ...buildDateFilter(req, "createdAt") };
    if (queryCompanyId) filter.companyId = queryCompanyId;

    const [leaves, departments] = await Promise.all([
      Leave.find(filter).populate("employeeId", "firstName lastName fullName email departmentId designationId status").sort({ createdAt: -1 }),
      Department.find({ ...(queryCompanyId ? { companyId: queryCompanyId } : {}) })
    ]);

    const leaveTypeBreakdown = {};
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    const employeeLeaveMap = {};

    leaves.forEach(lv => {
      const type = lv.leaveType || lv.type || "Casual Leave";
      if (!leaveTypeBreakdown[type]) {
        leaveTypeBreakdown[type] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      leaveTypeBreakdown[type].total += 1;

      const st = lv.status || "pending";
      if (st === "approved") {
        leaveTypeBreakdown[type].approved += 1;
        statusCounts.approved += 1;
      } else if (st === "rejected") {
        leaveTypeBreakdown[type].rejected += 1;
        statusCounts.rejected += 1;
      } else {
        leaveTypeBreakdown[type].pending += 1;
        statusCounts.pending += 1;
      }

      const emp = lv.employeeId;
      if (emp && emp._id) {
        const id = emp._id.toString();
        if (!employeeLeaveMap[id]) {
          employeeLeaveMap[id] = {
            employeeId: id,
            name: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
            department: emp.departmentId?.name || emp.departmentId?.departmentName || "General",
            totalApplications: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            totalDays: 0
          };
        }
        employeeLeaveMap[id].totalApplications += 1;
        if (st === "approved") employeeLeaveMap[id].approved += 1;
        else if (st === "rejected") employeeLeaveMap[id].rejected += 1;
        else employeeLeaveMap[id].pending += 1;

        let days = lv.days || lv.duration || 1;
        if (lv.startDate && lv.endDate) {
          const d1 = new Date(lv.startDate);
          const d2 = new Date(lv.endDate);
          if (!isNaN(d1) && !isNaN(d2)) {
            const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
            if (diff > 0 && diff <= 90) days = diff;
          }
        }
        if (st === "approved") {
          employeeLeaveMap[id].totalDays += days;
        }
      }
    });

    const employeeLeaveSummary = Object.values(employeeLeaveMap).sort((a, b) => b.totalApplications - a.totalApplications);

    res.json({
      success: true,
      totalLeaves: leaves.length,
      statusCounts,
      leaveTypeBreakdown,
      employeeLeaveSummary,
      departments,
      list: leaves
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getAttendanceSummary,
  getLeaveSummary,
  getPayrollSummary,
  getTaskSummary,
  getProjectSummary,
  getPerformanceReport,
  getEmployeeSummary,
  getTaskDetailedAnalytics,
  getEmployeeDetailedAnalytics,
  getLeaveDetailedAnalytics,
};
