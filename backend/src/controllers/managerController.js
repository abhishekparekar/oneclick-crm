const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const Notification = require("../models/Notification");
const Holiday = require("../models/Holiday");
const AuditLog = require("../models/AuditLog");
const Announcement = require("../models/Announcement");
const CompanyAttendanceSettings = require("../models/CompanyAttendanceSettings");
const CompanyTaskSettings = require("../models/CompanyTaskSettings");
const CompanyLeaveSettings = require("../models/CompanyLeaveSettings");
const Timesheet = require("../models/Timesheet");
const mongoose = require("mongoose");
const { sendNotificationToEmployees, notifyUser, notifyTaskSupervisors } = require("../utils/notificationHelper");

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns direct-report employee _ids for a manager.
 * Scoped strictly to companyId + reportingManagerId.
 * All other manager APIs MUST use this — never expose all employees.
 */
const getManagerTeamEmployeeIds = async (managerOrId, companyId) => {
  let managerId = managerOrId;
  let manager = null;
  
  // Detect if a full Employee document was passed (has managerAccessLevel field)
  // vs just a Mongoose ObjectId / string ID
  const isEmployeeDoc = (
    managerOrId !== null &&
    typeof managerOrId === 'object' &&
    managerOrId.managerAccessLevel !== undefined
  );

  if (isEmployeeDoc) {
    manager = managerOrId;
    managerId = managerOrId._id;
  } else {
    // managerOrId is either a string or ObjectId — fetch the full document
    manager = await Employee.findById(managerOrId).lean();
    managerId = manager ? manager._id : managerOrId;
  }

  if (!manager) return [];

  const allowedDeptIds = [manager.departmentId?._id || manager.departmentId].filter(Boolean);
  
  if (manager.departmentIds && manager.departmentIds.length > 0) {
    manager.departmentIds.forEach(d => {
      const id = d?._id || d;
      if (id) {
        const idStr = id.toString();
        if (!allowedDeptIds.map(x => x.toString()).includes(idStr)) {
          allowedDeptIds.push(id);
        }
      }
    });
  }

  if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
    manager.accessibleDepartments.forEach(d => {
      const id = d?._id || d;
      if (id) {
        const idStr = id.toString();
        if (!allowedDeptIds.map(x => x.toString()).includes(idStr)) {
          allowedDeptIds.push(id);
        }
      }
    });
  }

  let departmentMemberIds = [];
  if (allowedDeptIds.length > 0) {
    const departmentMembers = await Employee.find(
      { 
        companyId, 
        status: "active",
        $or: [
          { departmentId: { $in: allowedDeptIds } },
          { departmentIds: { $in: allowedDeptIds } },
          { accessibleDepartments: { $in: allowedDeptIds } }
        ]
      },
      { _id: 1 }
    ).lean();
    departmentMemberIds = departmentMembers.map((e) => e._id.toString());
  }

  const teamMembers = await Employee.find(
    { companyId, reportingManagerId: managerId, status: "active" },
    { _id: 1 }
  ).lean();
  const teamMemberIds = teamMembers.map((e) => e._id.toString());

  const allIds = Array.from(new Set([
    ...departmentMemberIds,
    ...teamMemberIds,
    managerId.toString()
  ]));

  return allIds;
};


/**
 * Resolves the logged-in manager's Employee document.
 * Falls back to userId lookup if employeeId not on JWT.
 */
const resolveManagerEmployee = async (req) => {
  const { companyId } = req;
  const { _id: userId, employeeId } = req.user;

  let manager = null;
  if (employeeId) {
    manager = await Employee.findOne({ _id: employeeId, companyId })
      .populate([
        { path: "departmentId", select: "name" },
        { path: "departmentIds", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
        { path: "accessibleDepartments", select: "name" },
      ])
      .lean();
  }
  if (!manager) {
    manager = await Employee.findOne({ userId, companyId })
      .populate([
        { path: "departmentId", select: "name" },
        { path: "departmentIds", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
        { path: "accessibleDepartments", select: "name" },
      ])
      .lean();
  }
  if (!manager && req.user.email) {
    manager = await Employee.findOne({ email: new RegExp(`^${req.user.email}$`, "i"), companyId })
      .populate([
        { path: "departmentId", select: "name" },
        { path: "departmentIds", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
        { path: "accessibleDepartments", select: "name" },
      ])
      .lean();
    if (manager && !manager.userId) {
      await Employee.updateOne({ _id: manager._id }, { $set: { userId } });
    }
  }
  return manager;
};

/** YYYY-MM-DD key */
const getDateKey = (d = new Date()) => {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/dashboard-summary
// ═══════════════════════════════════════════════════════════════
const getManagerDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const companyId = req.companyId;
    const TaskTemplate = require("../models/TaskTemplate");

    const manager = await resolveManagerEmployee(req);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Manager employee profile not found" });
    }

    const managerEmployeeId = manager._id;
    const todayStr = getDateKey();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const { departmentId } = req.query;
    let teamEmployeeIds = await getManagerTeamEmployeeIds(managerEmployeeId, companyId);

    if (departmentId) {
      const mongoose = require("mongoose");
      const Employee = require("../models/Employee");
      const filtered = await Employee.find({
        companyId,
        _id: { $in: teamEmployeeIds },
        departmentId: new mongoose.Types.ObjectId(departmentId)
      }).select("_id").lean();
      teamEmployeeIds = filtered.map(e => e._id);
    }
    const teamCount = teamEmployeeIds.length;

    // Resolve departments the manager has access to (for project visibility)
    const allowedDeptIds = [manager.departmentId?._id || manager.departmentId].filter(Boolean);
    
    if (manager.departmentIds && manager.departmentIds.length > 0) {
      manager.departmentIds.forEach(d => {
        const id = d?._id || d;
        if (id) {
          const idStr = id.toString();
          if (!allowedDeptIds.map(x => x.toString()).includes(idStr)) {
            allowedDeptIds.push(id);
          }
        }
      });
    }

    if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
      manager.accessibleDepartments.forEach(d => {
        const id = d?._id || d;
        if (id) {
          const idStr = id.toString();
          if (!allowedDeptIds.map(x => x.toString()).includes(idStr)) {
            allowedDeptIds.push(id);
          }
        }
      });
    }
    const teamIdsForProj = [...teamEmployeeIds, managerEmployeeId];

    const teamEmployees = await Employee.find({ _id: { $in: teamEmployeeIds } }).select("userId").lean();
    const teamUserIds = teamEmployees.map(e => e.userId).filter(Boolean);
    const allRelevantUserIds = [userId, ...teamUserIds];

    const [
      teamAttendanceTodayRaw,
      pendingTeamLeaves,
      activeProjects,
      latestNotifications,
      upcomingHolidays,
      recentActivities,
      rawAnnouncements,
      rawTimesheets,
      
      totalTeamTasks,
      openTeamTasks,
      completedTeamTasks,
      overdueTeamTasks,
      myPendingTasks,
      recentMyTasks,
      recentTeamTasks,
      teamTemplatesCount,
      myTemplatesCount
    ] = await Promise.all([
      Attendance.find({ companyId, employeeId: { $in: teamEmployeeIds }, date: todayStr })
        .populate({ path: "employeeId", select: "fullName employeeCode photo" })
        .lean(),
      Leave.find({ companyId, employeeId: { $in: teamEmployeeIds }, status: "pending" })
        .populate({ path: "employeeId", select: "fullName employeeCode" })
        .sort({ createdAt: -1 }).limit(10).lean(),
      Project.find({
        companyId,
        $or: [
          { departmentId: { $in: allowedDeptIds } },
          { members: { $in: teamIdsForProj } },
          { projectManager: managerEmployeeId }
        ],
        status: { $in: ["planning", "active", "working", "review", "deployment"] },
      }).limit(10).lean(),
      Notification.find({ companyId, userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Holiday.find({ companyId, date: { $gte: new Date(now) } }).sort({ date: 1 }).limit(5).lean(),
      AuditLog.find({ companyId, performedBy: { $in: allRelevantUserIds } }).sort({ createdAt: -1 }).limit(5).lean(),
      Announcement.find({
        status: "published",
        $or: [
          { targetType: "allEmployees" },
          { targetType: "selectedCompany", targetCompanies: companyId },
          { targetType: "roleBased", targetRoles: "Manager" },
        ],
      }).sort({ createdAt: -1 }).limit(3).lean(),
      Timesheet.find({
        companyId,
        employeeId: { $in: teamEmployeeIds },
        startTime: { $gte: now },
      }).lean(),

      Task.countDocuments({ companyId, assignedTo: { $in: teamEmployeeIds } }),
      Task.countDocuments({ companyId, assignedTo: { $in: teamEmployeeIds }, status: { $ne: "cancelled" } }),
      Task.countDocuments({ companyId, assignedTo: { $in: teamEmployeeIds }, $or: [{ status: { $in: ["done", "complete", "late_complete"] } }, { statusKey: { $in: ["completed", "done"] } }] }),
      Task.countDocuments({ companyId, assignedTo: { $in: teamEmployeeIds }, statusKey: { $nin: ["completed", "done"] }, status: { $nin: ["done", "complete", "late_complete"] }, endDateTime: { $lt: now } }),
      Task.countDocuments({ companyId, assignedTo: managerEmployeeId, status: { $ne: "cancelled" }, ...(departmentId ? { departmentId } : {}) }),
      
      Task.find({ companyId, assignedTo: managerEmployeeId, statusKey: { $nin: ["completed", "done"] }, status: { $nin: ["done", "complete", "late_complete"] }, ...(departmentId ? { departmentId } : {}) })
        .populate({ path: "projectId", select: "name", strictPopulate: false })
        .sort({ endDateTime: 1 }).limit(5).lean(),
      Task.find({ companyId, assignedTo: { $in: teamEmployeeIds }, statusKey: { $nin: ["completed", "done"] }, status: { $nin: ["done", "complete", "late_complete"] } })
        .populate({ path: "projectId", select: "name", strictPopulate: false })
        .sort({ endDateTime: 1 }).limit(5).lean(),
      TaskTemplate.countDocuments({ companyId, assignedTo: { $in: teamEmployeeIds } }),
      TaskTemplate.countDocuments({ companyId, assignedTo: managerEmployeeId, ...(departmentId ? { departmentId } : {}) }),
    ]);

    recentMyTasks.forEach(t => t.assignees = t.assignedTo);
    recentTeamTasks.forEach(t => t.assignees = t.assignedTo);

    const activeProjectIds = activeProjects.map(p => p._id);
    const allProjectTasks = await Task.find({ projectId: { $in: activeProjectIds } }).select("projectId status statusKey").lean();
    activeProjects.forEach(proj => {
      const pTasks = allProjectTasks.filter(t => t.projectId?.toString() === proj._id.toString());
      if (pTasks.length === 0) {
        proj.progress = 0;
      } else {
        const completedCount = pTasks.filter(t => {
          const st = (t.status || t.statusKey || "").toLowerCase();
          return ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(st);
        }).length;
        proj.progress = Math.round((completedCount / pTasks.length) * 100);
      }
    });

    const presentToday = teamAttendanceTodayRaw.filter(
      (a) => ["present", "late"].includes(a.status)
    ).length;
    const halfDayToday = teamAttendanceTodayRaw.filter(
      (a) => ["half_day", "half-day"].includes(a.status)
    ).length;
    const onLeaveToday = teamAttendanceTodayRaw.filter(
      (a) => ["paid_leave", "unpaid_leave"].includes(a.status)
    ).length;
    const absentToday = Math.max(0, teamCount - presentToday - halfDayToday - onLeaveToday);



    const announcements = (rawAnnouncements || []).map((ann) => ({
      ...ann,
      isRead: (ann.readBy || []).map((id) => id.toString()).includes(userId.toString()),
    }));

    const totalTeamWorkMinutesToday = rawTimesheets.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const workHoursSummary = {
      todayMinutes: totalTeamWorkMinutesToday,
      todayHours: (totalTeamWorkMinutesToday / 60).toFixed(1),
    };

    return res.json({
      success: true,
      data: {
        manager: {
          _id: manager._id,
          fullName: manager.fullName,
          firstName: manager.firstName,
          lastName: manager.lastName,
          employeeCode: manager.employeeCode,
          designation: manager.designationId?.name || manager.designationName || "Manager",
          department: manager.departmentId?.name || manager.departmentName || "",
          departmentId: manager.departmentId || "",
          departmentIds: manager.departmentIds || [],
          photo: manager.photo || "",
          managerAccessLevel: manager.managerAccessLevel || "team",
          accessibleDepartments: manager.accessibleDepartments || [],
        },
        teamSummary: { teamCount },
        attendanceSummary: {
          totalTeam: teamCount,
          presentToday,
          absentToday,
          halfDayToday
        },
        leaveSummary: { pendingTeamLeaves: pendingTeamLeaves.length, onLeaveToday },
        taskSummary: {
          openTeamTasks: openTeamTasks + teamTemplatesCount,
          overdueTeamTasks,
          completedTeamTasks,
          myPendingTasks: myPendingTasks + myTemplatesCount,
          totalTeamTasks: totalTeamTasks + teamTemplatesCount,
          teamTaskDoneCount: completedTeamTasks,
        },
        workHoursSummary,
        projectSummary: { activeProjects: activeProjects.length },
        teamAttendanceToday: teamAttendanceTodayRaw.map((a) => ({
          employeeId: a.employeeId?._id,
          name: a.employeeId?.fullName || "Unknown",
          employeeCode: a.employeeId?.employeeCode || "",
          photo: a.employeeId?.photo || "",
          status: a.status,
          punchIn: a.punchInTime,
          punchOut: a.punchOutTime,
          totalHours: a.totalHours || 0,
          punchLog: a.punchLog || [],
        })),
        pendingLeaves: pendingTeamLeaves,
        activeProjects,
        recentTasks: (() => {
          const combinedTasks = [...recentMyTasks, ...recentTeamTasks];
          const uniqueTasksMap = {};
          combinedTasks.forEach(t => {
            uniqueTasksMap[t._id.toString()] = t;
          });
          const uniqueTasks = Object.values(uniqueTasksMap);

          uniqueTasks.sort((a, b) => {
            if (!a.endDateTime) return 1;
            if (!b.endDateTime) return -1;
            return new Date(a.endDateTime) - new Date(b.endDateTime);
          });
          return uniqueTasks.slice(0, 5);
        })(),
        recentActivities,
        latestNotifications,
        announcements,
        upcomingHolidays,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team
// Supports: ?search= &departmentId= &designationId= &status=
// ═══════════════════════════════════════════════════════════════
const getManagerTeam = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { search, departmentId, designationId, status } = req.query;

    const manager = await resolveManagerEmployee(req);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    const managerEmployeeId = manager._id;
    const teamIds = await getManagerTeamEmployeeIds(managerEmployeeId, companyId);

    if (teamIds.length === 0) {
      return res.json({
        success: true,
        data: {
          teamMembers: [],
          summary: {
            totalTeamMembers: 0,
            activeMembers: 0,
            presentToday: 0,
            absentToday: 0,
            pendingTasks: 0,
            overdueTasks: 0,
          },
        },
      });
    }

    // Build employee filter
    const employeeFilter = {
      _id: { $in: teamIds },
      companyId,
    };

    // Status filter (active/inactive/terminated) — default shows active only
    if (status && ["active", "inactive", "terminated"].includes(status)) {
      employeeFilter.status = status;
    } else {
      employeeFilter.status = "active";
    }

    if (departmentId) {
      employeeFilter.departmentId = new mongoose.Types.ObjectId(departmentId);
    }
    if (designationId) {
      employeeFilter.designationId = new mongoose.Types.ObjectId(designationId);
    }

    // Search filter (name, email, phone, employeeCode)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      employeeFilter.$or = [
        { fullName: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { employeeCode: regex },
      ];
    }

    const teamMembers = await Employee.find(employeeFilter)
      .populate([
        { path: "departmentId", select: "name" },
        { path: "departmentIds", select: "name" },
        { path: "accessibleDepartments", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
      ])
      .select(
        "fullName firstName lastName employeeCode email phone photo status role " +
        "departmentId departmentIds designationId branchId joiningDate employmentType workMode reportingManagerName accessibleDepartments"
      )
      .lean();

    // Fetch today's attendance for all visible team members
    const todayStr = getDateKey();
    const visibleIds = teamMembers.map((e) => e._id);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const [todayAttendanceList, taskList] = await Promise.all([
      Attendance.find({
        companyId,
        employeeId: { $in: visibleIds },
        date: todayStr,
      }).select("employeeId status punchInTime punchOutTime totalHours").lean(),

      Task.find({
        companyId,
        assignedTo: { $in: visibleIds },
        status: { $ne: "done" },
      }).select("assignedTo status dueDate").lean(),
    ]);

    // Map attendance & tasks to each employee
    const attMap = {};
    todayAttendanceList.forEach((a) => {
      attMap[a.employeeId.toString()] = a;
    });

    const taskCountMap = {};
    const overdueMap = {};
    taskList.forEach((t) => {
      if (t.assignedTo && Array.isArray(t.assignedTo)) {
        t.assignedTo.forEach((assigneeId) => {
          const key = assigneeId.toString();
          taskCountMap[key] = (taskCountMap[key] || 0) + 1;
          if (t.dueDate && new Date(t.dueDate) < now) {
            overdueMap[key] = (overdueMap[key] || 0) + 1;
          }
        });
      }
    });

    const enrichedMembers = teamMembers.map((emp) => {
      const key = emp._id.toString();
      const att = attMap[key];
      return {
        ...emp,
        todayAttendance: att
          ? {
              status: att.status,
              punchIn: att.punchInTime,
              punchOut: att.punchOutTime,
              totalHours: att.totalHours || 0,
              punchLog: att.punchLog || [],
            }
          : null,
        activeTaskCount: taskCountMap[key] || 0,
        overdueTaskCount: overdueMap[key] || 0,
      };
    });

    // Summary across all active team members (not just filtered)
    const allActiveIds = teamIds; // already only active
    const presentToday = todayAttendanceList.filter((a) =>
      ["present", "late", "half_day"].includes(a.status)
    ).length;
    const totalPendingTasks = taskList.length;
    const totalOverdueTasks = taskList.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    ).length;

    return res.json({
      success: true,
      data: {
        teamMembers: enrichedMembers,
        summary: {
          totalTeamMembers: allActiveIds.length,
          activeMembers: teamMembers.length,
          presentToday,
          absentToday: Math.max(0, allActiveIds.length - presentToday),
          pendingTasks: totalPendingTasks,
          overdueTasks: totalOverdueTasks,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team/:employeeId
// Full member detail + attendance summary + tasks + projects + leave
// ═══════════════════════════════════════════════════════════════
const getTeamMemberById = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { employeeId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const manager = await resolveManagerEmployee(req);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    // Enforce team boundary — 403 if not a direct report
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    const isTeamMember = teamIds.map((id) => id.toString()).includes(employeeId);
    if (!isTeamMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied: employee is not in your team",
      });
    }

    const todayStr = getDateKey();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const empObjId = new mongoose.Types.ObjectId(employeeId);

    const [employee, todayAttendance, monthlyAttendance, assignedTasks, activeProjects, leaveSummary] =
      await Promise.all([
        Employee.findOne({ _id: empObjId, companyId })
          .populate([
            { path: "departmentId", select: "name" },
            { path: "designationId", select: "name" },
            { path: "branchId", select: "branchName" },
            { path: "reportingManagerId", select: "fullName employeeCode" },
          ])
          .select(
            "-bankDetails -aadhaarNumber -panNumber -documents -educationDetails -experienceDetails"
          )
          .lean(),

        Attendance.findOne({ companyId, employeeId: empObjId, date: todayStr }).lean(),

        Attendance.find({
          companyId,
          employeeId: empObjId,
          month: currentMonth,
          year: currentYear,
        }).lean(),

        Task.find({ companyId, assignedTo: empObjId })
          .select("title status priority dueDate projectId")
          .populate({ path: "projectId", select: "name" })
          .lean(),

        Project.find({
          companyId,
          members: empObjId,
          status: { $in: ["active", "in-progress", "planning"] },
        }).select("name status progress").lean(),

        LeaveBalance.findOne({ companyId, employeeId: empObjId }).lean(),
      ]);

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Build attendance summary
    const statusCounts = {
      present: 0, late: 0, absent: 0, half_day: 0,
      paid_leave: 0, unpaid_leave: 0, holiday: 0, weekly_off: 0,
    };
    monthlyAttendance.forEach((r) => {
      if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
    });

    // Build task summary
    const taskStatuses = { todo: 0, "in-progress": 0, review: 0, done: 0 };
    assignedTasks.forEach((t) => {
      if (taskStatuses[t.status] !== undefined) taskStatuses[t.status]++;
    });
    const overdueCount = assignedTasks.filter(
      (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
    ).length;

    return res.json({
      success: true,
      data: {
        employee,
        todayAttendance: todayAttendance
          ? {
              status: todayAttendance.status,
              punchIn: todayAttendance.punchInTime,
              punchOut: todayAttendance.punchOutTime,
              totalHours: todayAttendance.totalHours || 0,
              punchLog: todayAttendance.punchLog || [],
            }
          : null,
        monthlyAttendanceSummary: {
          month: currentMonth,
          year: currentYear,
          totalLogs: monthlyAttendance.length,
          ...statusCounts,
        },
        taskSummary: {
          total: assignedTasks.length,
          ...taskStatuses,
          overdue: overdueCount,
        },
        recentTasks: assignedTasks.slice(0, 5),
        activeProjects,
        leaveBalance: leaveSummary || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team-org
// Org hierarchy: manager → direct reports → (their reports if nested)
// ═══════════════════════════════════════════════════════════════
const getTeamOrg = async (req, res, next) => {
  try {
    const companyId = req.companyId;

    const manager = await resolveManagerEmployee(req);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    const managerEmployeeId = manager._id;

    // Direct reports
    const directReports = await Employee.find({
      companyId,
      reportingManagerId: managerEmployeeId,
      status: "active",
    })
      .populate([
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ])
      .select("fullName employeeCode photo departmentId designationId status")
      .lean();

    const directIds = directReports.map((e) => e._id);

    // Their direct reports (level 2)
    const level2Reports = await Employee.find({
      companyId,
      reportingManagerId: { $in: directIds },
      status: "active",
    })
      .populate([
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ])
      .select("fullName employeeCode photo departmentId designationId status reportingManagerId")
      .lean();

    // Map level2 by their manager id
    const level2Map = {};
    level2Reports.forEach((e) => {
      const key = e.reportingManagerId?.toString();
      if (!level2Map[key]) level2Map[key] = [];
      level2Map[key].push(e);
    });

    // Attach sub-reports to direct reports
    const enrichedDirectReports = directReports.map((e) => ({
      ...e,
      directReports: level2Map[e._id.toString()] || [],
    }));

    return res.json({
      success: true,
      data: {
        manager: {
          _id: manager._id,
          fullName: manager.fullName,
          employeeCode: manager.employeeCode,
          photo: manager.photo || "",
          designation: manager.designationId?.name || manager.designationName || "Manager",
          department: manager.departmentId?.name || manager.departmentName || "",
        },
        directReports: enrichedDirectReports,
        totalCount: directReports.length + level2Reports.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// STUB HANDLERS — implemented in subsequent steps
// ═══════════════════════════════════════════════════════════════
const stubHandler = (label) => async (req, res) =>
  res.json({ success: true, data: [], message: `${label} — coming soon` });

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/attendance-permissions
// ═══════════════════════════════════════════════════════════════
const getAttendancePermissions = async (req, res, next) => {
  try {
    const { companyId } = req;
    const settings = await CompanyAttendanceSettings.findOne({ companyId }).lean();
    
    return res.json({
      success: true,
      data: {
        allowManagerAttendanceApproval: settings?.allowManagerAttendanceApproval ?? true,
        allowManagerManualAttendance: settings?.allowManagerManualAttendance ?? false,
        allowManagerNestedTeamAccess: settings?.allowManagerNestedTeamAccess ?? false,
      }
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team-attendance
// ═══════════════════════════════════════════════════════════════
const getTeamAttendance = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { date, month, year, search, status, departmentId } = req.query;

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });

    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    if (teamIds.length === 0) return res.json({ success: true, data: [] });

    // Build base filter
    let employeeFilter = { companyId, _id: { $in: teamIds }, status: "active" };

    if (departmentId) {
      const mongoose = require("mongoose");
      employeeFilter.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      employeeFilter.$or = [
        { fullName: regex }, { employeeCode: regex }
      ];
    }

    const teamMembers = await Employee.find(employeeFilter)
      .select("fullName employeeCode photo departmentId designationId")
      .populate([
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ])
      .lean();
    
    const visibleIds = teamMembers.map(e => e._id);

    let attendanceFilter = { companyId, employeeId: { $in: visibleIds } };
    
    if (date) {
      attendanceFilter.date = date;
    } else if (month && year) {
      attendanceFilter.month = parseInt(month, 10);
      attendanceFilter.year = parseInt(year, 10);
    } else {
      attendanceFilter.date = getDateKey();
    }

    if (status) attendanceFilter.status = status;

    const attendanceRecords = await Attendance.find(attendanceFilter).lean();
    
    // Map records to employees
    const attMap = {};
    attendanceRecords.forEach(a => {
      const key = a.employeeId.toString();
      if (!attMap[key]) attMap[key] = [];
      attMap[key].push(a);
    });

    const result = teamMembers.map(emp => {
      const atts = attMap[emp._id.toString()];
      return {
        employee: emp,
        attendance: (date || (!month && !year)) ? (atts ? atts[0] : null) : (atts || [])
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team-attendance/:employeeId/monthly
// ═══════════════════════════════════════════════════════════════
const getTeamMemberMonthlyAttendance = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });

    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    if (!teamIds.map(id => id.toString()).includes(employeeId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const attendanceFilter = { companyId, employeeId: new mongoose.Types.ObjectId(employeeId) };
    if (month && year) {
      attendanceFilter.month = parseInt(month, 10);
      attendanceFilter.year = parseInt(year, 10);
    } else {
      const d = new Date();
      attendanceFilter.month = d.getMonth() + 1;
      attendanceFilter.year = d.getFullYear();
    }

    const records = await Attendance.find(attendanceFilter).sort({ date: 1 }).lean();
    return res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/regularization
// ═══════════════════════════════════════════════════════════════
const getRegularizationRequests = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });

    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);

    const requests = await Attendance.find({
      companyId,
      employeeId: { $in: teamIds },
      regularizationStatus: "pending"
    })
      .populate({ path: "employeeId", select: "fullName employeeCode photo" })
      .lean();

    return res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/regularization/:id/approve
// ═══════════════════════════════════════════════════════════════
const approveRegularization = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const settings = await CompanyAttendanceSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerAttendanceApproval === false) {
      return res.status(403).json({ success: false, message: "Manager approval not enabled for this company" });
    }

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);

    const record = await Attendance.findOne({ _id: id, companyId });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    if (!teamIds.map(eId => eId.toString()).includes(record.employeeId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    record.regularizationStatus = "approved";
    record.status = "present"; 
    
    // Set default full day hours if the employee has 0 hours
    const fullDayHours = settings?.fullDayHours || 8;
    if (!record.totalHours || record.totalHours < fullDayHours) {
      record.totalHours = fullDayHours;
    }

    // Ensure there's a dummy punchIn and punchOut if missing so reports don't crash
    if (!record.punchInTime) {
      const shiftStartTime = settings?.shiftStartTime || "09:30";
      const [h, m] = shiftStartTime.split(":").map(Number);
      const inDate = new Date(record.date);
      inDate.setHours(h, m, 0, 0);
      record.punchInTime = inDate;
    }
    if (!record.punchOutTime && record.punchInTime) {
      const outDate = new Date(record.punchInTime);
      outDate.setHours(outDate.getHours() + fullDayHours);
      record.punchOutTime = outDate;
    }

    record.approvedBy = req.user._id;
    await record.save();

    await AuditLog.create({
      companyId,
      action: "Approve Regularization",
      performedBy: req.user._id,
    });

    return res.json({ success: true, message: "Regularization approved" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/regularization/:id/reject
// ═══════════════════════════════════════════════════════════════
const rejectRegularization = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { reason } = req.body;

    const settings = await CompanyAttendanceSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerAttendanceApproval === false) {
      return res.status(403).json({ success: false, message: "Manager approval not enabled for this company" });
    }

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);

    const record = await Attendance.findOne({ _id: id, companyId });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    if (!teamIds.map(eId => eId.toString()).includes(record.employeeId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    record.regularizationStatus = "rejected";
    record.rejectionReason = reason || "";
    record.approvedBy = req.user._id;
    await record.save();

    await AuditLog.create({
      companyId,
      action: "Reject Regularization",
      performedBy: req.user._id,
    });

    return res.json({ success: true, message: "Regularization rejected" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/team-attendance/:id/manual-update
// ═══════════════════════════════════════════════════════════════
const manualUpdateTeamAttendance = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { status, punchInTime, punchOutTime, manualReason } = req.body;

    const settings = await CompanyAttendanceSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerManualAttendance === false) {
      return res.status(403).json({ success: false, message: "Manager manual update not enabled" });
    }

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager profile not found" });
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);

    const record = await Attendance.findOne({ _id: id, companyId });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });

    if (!teamIds.map(eId => eId.toString()).includes(record.employeeId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (status) record.status = status;
    if (punchInTime) record.punchInTime = new Date(punchInTime);
    if (punchOutTime) record.punchOutTime = new Date(punchOutTime);
    
    if (record.punchInTime && record.punchOutTime) {
      const ms = new Date(record.punchOutTime) - new Date(record.punchInTime);
      record.totalHours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));
    }

    record.source = "manual";
    record.isManuallyUpdated = true;
    record.manualReason = manualReason || "Updated by manager";
    record.updatedBy = req.user._id;

    await record.save();

    await AuditLog.create({
      companyId,
      action: "Manager Manual Attendance Update",
      performedBy: req.user._id,
    });

    return res.json({ success: true, message: "Attendance manually updated" });
  } catch (error) {
    next(error);
  }
};
// ═══════════════════════════════════════════════════════════════
// GET /api/manager/leave-permissions
// ═══════════════════════════════════════════════════════════════
const getLeavePermissions = async (req, res, next) => {
  try {
    const { companyId } = req;
    let settings = await CompanyLeaveSettings.findOne({ companyId }).lean();
    if (!settings) {
      settings = await CompanyLeaveSettings.create({ companyId });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team-leaves
// ═══════════════════════════════════════════════════════════════
const getTeamLeaves = async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    const Employee = require("../models/Employee");
    const companyId = req.user.companyId || req.companyId;
    const { status, leaveTypeId, fromDate, toDate, employeeId, search, page = 1, limit = 20, departmentId } = req.query;

    const isCompanyAdmin = req.user.role === "CompanyAdmin" || req.user.role === "HR";
    const manager = await resolveManagerEmployee(req);
    if (!manager && !isCompanyAdmin) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    let filteredTeamIds = null; // null means no restriction (CompanyAdmin full access)

    if (manager) {
      const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
      filteredTeamIds = teamIds.filter(id => id.toString() !== manager._id.toString());
    } else if (!isCompanyAdmin) {
      filteredTeamIds = [];
    }

    if (isCompanyAdmin && (!filteredTeamIds || filteredTeamIds.length === 0)) {
      filteredTeamIds = null; // all employees
    }

    if (departmentId) {
      const empQuery = {
        companyId,
        departmentId: new mongoose.Types.ObjectId(departmentId)
      };
      if (filteredTeamIds !== null) {
        empQuery._id = { $in: filteredTeamIds };
      }
      const filtered = await Employee.find(empQuery).select("_id").lean();
      filteredTeamIds = filtered.map(e => e._id);
    }

    if (filteredTeamIds !== null && filteredTeamIds.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 },
          leaves: [],
          pagination: { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 },
          permissions: { allowManagerLeaveApproval: true }
        }
      });
    }

    let filter = { companyId };
    if (filteredTeamIds !== null) {
      filter.employeeId = { $in: filteredTeamIds };
    }
    
    // Keep a base filter for summary and properly cast ObjectIds because aggregate $match doesn't auto-cast strings
    let summaryFilter = {
      companyId: new mongoose.Types.ObjectId(companyId)
    };
    if (filteredTeamIds !== null) {
      summaryFilter.employeeId = { $in: filteredTeamIds.map(id => new mongoose.Types.ObjectId(id.toString())) };
    }

    if (leaveTypeId) {
      filter.leaveTypeId = leaveTypeId;
      summaryFilter.leaveTypeId = new mongoose.Types.ObjectId(leaveTypeId);
    }
    if (employeeId) {
      filter.employeeId = employeeId;
      summaryFilter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);
      filter.createdAt = dateFilter;
      summaryFilter.createdAt = dateFilter;
    }

    if (search && search.trim() !== "") {
      const empQuery = { companyId };
      if (filteredTeamIds !== null) {
        empQuery._id = { $in: filteredTeamIds };
      }
      empQuery.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { employeeCode: new RegExp(search, "i") }
      ];
      const emps = await Employee.find(empQuery, "_id").lean();
      const empIds = emps.map(e => e._id);
      filter.employeeId = { $in: empIds };
      summaryFilter.employeeId = { $in: empIds.map(id => new mongoose.Types.ObjectId(id.toString())) };
    }

    if (status && status !== "all" && status !== "All") filter.status = status.toLowerCase();

    // Summary counts
    const summaryAggr = await Leave.aggregate([
      { $match: summaryFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const summary = { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    summaryAggr.forEach(item => {
      summary[item._id] = item.count;
      summary.total += item.count;
    });

    const skip = (Number(page) - 1) * Number(limit);
    
    const leaves = await Leave.find(filter)
      .populate("employeeId", "fullName firstName lastName employeeCode photo departmentId designationId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = summary.total;
    const totalPages = Math.ceil(total / Number(limit));

    let settings = await CompanyLeaveSettings.findOne({ companyId }).lean();
    if (!settings) settings = { allowManagerLeaveApproval: true };

    return res.json({
      success: true,
      data: {
        summary,
        leaves,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages },
        permissions: { allowManagerLeaveApproval: settings.allowManagerLeaveApproval }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/team-leaves/:id
// ═══════════════════════════════════════════════════════════════
const getTeamLeaveById = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const isCompanyAdmin = req.user.role === "CompanyAdmin" || req.user.role === "HR";

    const manager = await resolveManagerEmployee(req);
    let teamIds = [];
    if (!isCompanyAdmin) {
      if (!manager) return res.status(403).json({ success: false, message: "No employee profile found for this manager" });
      teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    }
    
    const leave = await Leave.findOne({ _id: id, companyId })
      .populate({
        path: "employeeId",
        select: "fullName firstName lastName employeeCode photo departmentId designationId",
        populate: [
          { path: "departmentId", select: "name" },
          { path: "designationId", select: "name" }
        ]
      })
      .lean();

    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

    if (!isCompanyAdmin) {
      if (!teamIds.map(t => t.toString()).includes(leave.employeeId._id.toString()) || leave.employeeId._id.toString() === manager._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied: Employee not in your direct team" });
      }
    }

    const leaveBalance = await LeaveBalance.findOne({ employeeId: leave.employeeId._id, companyId }).lean();

    return res.json({ success: true, data: { leave, leaveBalance } });
  } catch (error) {
    next(error);
  }
};

// Safe deduction logic for leave approval
const deductLeaveBalanceOnApproval = async (leave, companyId) => {
  if (leave.balanceDeducted || leave.status !== "pending") return;

  // Paid days reduce LeaveBalance
  let balance = await LeaveBalance.findOne({ employeeId: leave.employeeId, companyId });
  if (!balance) {
    balance = await LeaveBalance.createWithDefaults(leave.employeeId, companyId);
  }
  
  if (leave.paidDays && leave.paidDays > 0) {
    // Dynamic mapping: If leaveType is passed or we assume from leaveTypeNameSnapshot
    let typeKey = "casualLeave"; // fallback
    if (leave.leaveCodeSnapshot) {
      if (leave.leaveCodeSnapshot === "CL") typeKey = "casualLeave";
      else if (leave.leaveCodeSnapshot === "SL") typeKey = "sickLeave";
      else if (leave.leaveCodeSnapshot === "EL" || leave.leaveCodeSnapshot === "PL") typeKey = "earnedLeave";
      else if (leave.leaveCodeSnapshot === "LWP") typeKey = "lossOfPay"; // doesn't deduct paid balances
    }
    
    if (typeKey !== "lossOfPay") {
      balance[typeKey] = Math.max(0, balance[typeKey] - leave.paidDays);
      await balance.save();
    }
  }

  leave.balanceDeducted = true;
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/team-leaves/:id/approve
// ═══════════════════════════════════════════════════════════════
const approveTeamLeave = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const isCompanyAdmin = req.user.role === "CompanyAdmin" || req.user.role === "HR";

    const settings = await CompanyLeaveSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerLeaveApproval === false && !isCompanyAdmin) {
      return res.status(403).json({ success: false, message: "Manager leave approval is disabled by company settings." });
    }

    const manager = await resolveManagerEmployee(req);
    let teamIds = [];
    if (!isCompanyAdmin) {
      if (!manager) return res.status(403).json({ success: false, message: "No employee profile found for this manager" });
      teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    }
    
    const leave = await Leave.findOne({ _id: id, companyId });
    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

    if (!isCompanyAdmin) {
      if (!teamIds.map(t => t.toString()).includes(leave.employeeId.toString())) {
        return res.status(403).json({ success: false, message: "You cannot access this leave request." });
      }
    }
    
    if (manager && leave.employeeId.toString() === manager._id.toString()) {
      return res.status(403).json({ success: false, message: "You cannot approve your own leave." });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({ success: false, message: "This leave request is already approved/rejected." });
    }

    await deductLeaveBalanceOnApproval(leave, companyId);

    leave.status = "approved";
    leave.approvedBy = req.user._id;
    leave.approvalLevel = "manager";
    await leave.save();

    await AuditLog.create({
      companyId,
      action: "Manager Approved Leave",
      performedBy: req.user._id,
      newData: { leaveId: leave._id, status: "approved" },
    });

    try {
      const emp = await Employee.findById(leave.employeeId).populate("userId");
      if (emp && emp.userId) {
        await Notification.create({
          companyId,
          userId: emp.userId._id || emp.userId,
          title: "Leave Approved",
          body: `Your leave request for ${leave.totalDays} days has been approved.`,
          type: "leave",
          data: { leaveId: leave._id.toString() },
        });
      }
    } catch (err) {
      console.error(err);
    }

    return res.json({ success: true, data: leave, message: "Leave approved successfully" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/team-leaves/:id/reject
// ═══════════════════════════════════════════════════════════════
const rejectTeamLeave = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const isCompanyAdmin = req.user.role === "CompanyAdmin" || req.user.role === "HR";

    const settings = await CompanyLeaveSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerLeaveApproval === false && !isCompanyAdmin) {
      return res.status(403).json({ success: false, message: "Manager leave approval is disabled." });
    }

    if (!rejectionReason || String(rejectionReason).trim() === "") {
      return res.status(400).json({ success: false, message: "Please enter rejection reason." });
    }

    const manager = await resolveManagerEmployee(req);
    let teamIds = [];
    if (!isCompanyAdmin) {
      if (!manager) return res.status(403).json({ success: false, message: "No employee profile found for this manager" });
      teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    }
    
    const leave = await Leave.findOne({ _id: id, companyId });
    if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

    if (!isCompanyAdmin) {
      if (!teamIds.map(t => t.toString()).includes(leave.employeeId.toString())) {
        return res.status(403).json({ success: false, message: "You cannot access this leave request." });
      }
    }
    
    if (manager && leave.employeeId.toString() === manager._id.toString()) {
      return res.status(403).json({ success: false, message: "You cannot reject your own leave." });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({ success: false, message: "This leave request is already approved/rejected." });
    }

    leave.status = "rejected";
    leave.rejectionReason = rejectionReason;
    leave.approvedBy = req.user._id; 
    
    // Auto-refund balance
    if (leave.balanceDeducted) {
      const LeaveBalance = require("../models/LeaveBalance");
      const balance = await LeaveBalance.findOne({ employeeId: leave.employeeId, companyId });
      if (balance) {
        const typeKey = leave.leaveType.toLowerCase();
        if (balance[typeKey] !== undefined) {
          balance[typeKey] += leave.numberOfDays;
          await balance.save();
        }
      }
      leave.balanceDeducted = false;
    }

    await leave.save();

    await AuditLog.create({
      companyId,
      action: "Manager Rejected Leave",
      performedBy: req.user._id,
      newData: { leaveId: leave._id, status: "rejected", reason: rejectionReason },
    });

    try {
      const emp = await Employee.findById(leave.employeeId).populate("userId");
      if (emp && emp.userId) {
        await Notification.create({
          companyId,
          userId: emp.userId._id || emp.userId,
          title: "Leave Rejected",
          body: `Your leave request has been rejected. Reason: ${rejectionReason}`,
          type: "leave",
          data: { leaveId: leave._id.toString() },
        });
      }
    } catch (err) {
      console.error(err);
    }

    return res.json({ success: true, data: leave, message: "Leave rejected successfully" });
  } catch (error) {
    next(error);
  }
};
// ═══════════════════════════════════════════════════════════════
// GET /api/manager/task-permissions
// ═══════════════════════════════════════════════════════════════
const getTaskPermissions = async (req, res, next) => {
  try {
    const { companyId } = req;
    let settings = await CompanyTaskSettings.findOne({ companyId }).lean();
    if (!settings) {
      settings = await CompanyTaskSettings.create({ companyId });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/tasks/my
// ═══════════════════════════════════════════════════════════════
const getMyTasks = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const isTemplate = req.query.isTemplate === 'true' || req.query.isTemplate === true;
    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    let tasks;
    if (isTemplate) {
      const TaskTemplate = require("../models/TaskTemplate");
      tasks = await TaskTemplate.find({ companyId, assignedTo: manager._id })
        .populate({ path: "projectId", select: "name", strictPopulate: false })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
          populate: [
            { path: "departmentId", select: "name", strictPopulate: false },
            { path: "departmentIds", select: "name", strictPopulate: false }
          ]
        })
        .populate({ path: "departmentId", select: "name", strictPopulate: false })
        .sort({ createdAt: -1 })
        .lean();
      
      tasks.forEach(t => {
        t.isTemplate = true;
        t.assignees = t.assignedTo || [];
      });
    } else {
      tasks = await Task.find({ companyId, assignedTo: manager._id, status: { $ne: "cancelled" } })
        .populate({ path: "projectId", select: "name", strictPopulate: false })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
          populate: [
            { path: "departmentId", select: "name", strictPopulate: false },
            { path: "departmentIds", select: "name", strictPopulate: false }
          ]
        })
        .populate({ path: "departmentId", select: "name", strictPopulate: false })
        .sort({ createdAt: -1 })
        .lean();
      tasks.forEach(t => t.assignees = t.assignedTo);
    }

    return res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/tasks/team
// ═══════════════════════════════════════════════════════════════
const getTeamTasks = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const isTemplate = req.query.isTemplate === 'true' || req.query.isTemplate === true;
    const { status, priority, projectId, employeeId, search, departmentId } = req.query;

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    let teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    if (departmentId) {
      const mongoose = require("mongoose");
      const Employee = require("../models/Employee");
      const deptObjectId = new mongoose.Types.ObjectId(departmentId);
      const filtered = await Employee.find({
        companyId,
        _id: { $in: teamIds },
        $or: [
          { departmentId: deptObjectId },
          { departmentIds: deptObjectId }
        ]
      }).select("_id").lean();
      teamIds = filtered.map(e => e._id);
    }
    if (isTemplate) {
      const TaskTemplate = require("../models/TaskTemplate");
      let filter = { companyId, assignedTo: { $in: teamIds } };
      if (priority) filter.priority = priority;
      if (projectId) filter.projectId = projectId;
      if (employeeId) filter.assignedTo = employeeId;
      if (search && search.trim()) {
        filter.title = new RegExp(search.trim(), "i");
      }
      
      const templates = await TaskTemplate.find(filter)
        .populate({ path: "projectId", select: "name", strictPopulate: false })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
          populate: [
            { path: "departmentId", select: "name", strictPopulate: false },
            { path: "departmentIds", select: "name", strictPopulate: false }
          ]
        })
        .populate({ path: "departmentId", select: "name", strictPopulate: false })
        .sort({ createdAt: -1 })
        .lean();
        
      templates.forEach(t => t.assignees = t.assignedTo);
      
      return res.json({
        success: true,
        count: templates.length,
        totalCount: templates.length,
        page: 1,
        totalPages: 1,
        data: templates
      });
    }

    let filter = { companyId, assignedTo: { $in: teamIds } };
    
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: "cancelled" };
    }
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;
    if (employeeId) filter.assignedTo = employeeId;
    
    if (search && search.trim()) {
      filter.title = new RegExp(search.trim(), "i");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    const totalCount = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate({ path: "projectId", select: "name", strictPopulate: false })
      .populate({ 
        path: "assignedTo", 
        select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
        populate: [
          { path: "departmentId", select: "name", strictPopulate: false },
          { path: "departmentIds", select: "name", strictPopulate: false }
        ]
      })
      .populate({ path: "departmentId", select: "name", strictPopulate: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    tasks.forEach(t => t.assignees = t.assignedTo);

    return res.json({ 
      success: true, 
      count: tasks.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      data: tasks 
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/tasks
// ═══════════════════════════════════════════════════════════════
const createTask = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { 
      title, description, priority, assignmentType, projectId, dependsOn, estimatedHours,
      repeatEnabled, repeatType, startDate, endDate, nextFollowUpDate, finishDate, deadlineTime, checklist,
      weeklyDays, monthlyDates, attachments
    } = req.body;

    const assigneesInput = req.body.assignees || req.body.assignedTo || [];

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    if (assignmentType === "company") {
      return res.status(403).json({ success: false, message: "Managers cannot assign tasks to the entire company" });
    }
    if (assignmentType === "department" && manager.managerAccessLevel !== "department") {
      return res.status(403).json({ success: false, message: "You do not have permission to assign tasks to the entire department" });
    }

    let finalAssignees = [];

    if (assignmentType === "self") {
      finalAssignees = [manager._id];
    } else if (assignmentType === "single" || assignmentType === "multiple" || assignmentType === "both") {
      if (!assigneesInput || assigneesInput.length === 0) {
        return res.status(400).json({ success: false, message: "Please select assignees" });
      }
      const rawIds = assigneesInput.map(id => typeof id === "object" && id._id ? id._id : id);
      const allInTeam = rawIds.every(id => teamIds.map(t => t.toString()).includes(id.toString()) || id.toString() === manager._id.toString());
      if (!allInTeam) {
        return res.status(403).json({ success: false, message: "Can only assign tasks to team members" });
      }
      finalAssignees = rawIds;
    } else if (assignmentType === "department") {
      const targetDeptId = req.body.targetDepartmentId || manager.departmentId;
      
      const allowedDepts = [manager.departmentId].filter(Boolean);
      if (manager.departmentIds && manager.departmentIds.length > 0) {
        manager.departmentIds.forEach(id => {
          const idStr = typeof id === "object" ? id._id.toString() : id.toString();
          if (!allowedDepts.map(d => d.toString()).includes(idStr)) {
            allowedDepts.push(id);
          }
        });
      }
      if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
        manager.accessibleDepartments.forEach(id => {
          const idStr = typeof id === "object" ? id._id.toString() : id.toString();
          if (!allowedDepts.map(d => d.toString()).includes(idStr)) {
            allowedDepts.push(id);
          }
        });
      }

      if (!targetDeptId || !allowedDepts.map(id => id.toString()).includes(targetDeptId.toString())) {
        return res.status(403).json({ success: false, message: "You do not have access to this department" });
      }

      const deptEmployees = await Employee.find({ companyId, departmentId: targetDeptId, status: "active" }).select("_id").lean();
      finalAssignees = deptEmployees.map(e => e._id);
    } else if (assignmentType === "project") {
      if (!projectId) return res.status(400).json({ success: false, message: "Project required for project assignment" });
      const project = await Project.findOne({ _id: projectId, companyId }).lean();
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });
      finalAssignees = project.members || [];
    } else if (assignmentType === "company") {
      const allEmployees = await Employee.find({ companyId }).select("_id").lean();
      finalAssignees = allEmployees.map(e => e._id);
    }

    const startDt = startDate ? new Date(startDate) : new Date();
    
    if (repeatEnabled) {
      const TaskTemplate = require("../models/TaskTemplate");
      const { processSingleTemplate } = require("../cron/taskCron");
      
      let finalWeeklyDays = weeklyDays || [];
      let finalMonthlyDates = monthlyDates || [];
      if (repeatType === "weekly" && finalWeeklyDays.length === 0) {
        finalWeeklyDays = [startDt.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" })];
      }
      if (repeatType === "monthly" && finalMonthlyDates.length === 0) {
        finalMonthlyDates = [startDt.getDate()];
      }
      
      const Company = require("../models/Company");
      const company = await Company.findById(companyId);
      const seqNumber = (company.taskSequence || 0) + 1;
      company.taskSequence = seqNumber;
      await company.save();

      const newTemplate = new TaskTemplate({
        companyId,
        taskId: `TASK-${seqNumber.toString().padStart(4, "0")}`,
        createdBy: req.user._id,
        assignedBy: req.user._id,
        assignmentType: assignmentType || "multiple",
        departmentId: req.body.departmentId || manager.departmentId || undefined,
        assignedTo: finalAssignees,
        title,
        description,
        priority: priority || "medium",
        repeatEnabled,
        repeatType,
        weeklyDays: finalWeeklyDays,
        monthlyDates: finalMonthlyDates,
        startDate: startDt,
        endDate: endDate ? new Date(endDate) : undefined,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : startDt,
        finishDate: finishDate ? new Date(finishDate) : undefined,
        deadlineTime: deadlineTime || "18:00",
        attachments: attachments || [],
        projectId: projectId || null,
        checklist: checklist || [],
        isActive: true
      });

      await newTemplate.save();

      // Attempt immediate generation for today
      let generatedTask = null;
      try {
        generatedTask = await processSingleTemplate(newTemplate, new Date());
      } catch (cronErr) {
        console.error("Error executing immediate task generation for template:", cronErr);
      }

      await AuditLog.create({
        companyId,
        action: "Manager Created Recurring Task Template",
        performedBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        template: newTemplate,
        task: generatedTask,
        message: generatedTask
          ? "Recurring task template created and first instance generated immediately."
          : "Task Template scheduled for future generation."
      });
    }

    // Otherwise, create live one-time task
    const CompanyTaskCounter = require("../models/CompanyTaskCounter");
    const counter = await CompanyTaskCounter.findOneAndUpdate(
      { companyId },
      { $inc: { currentSequence: 1 } },
      { new: true, upsert: true }
    );
    const seqNumber = counter.currentSequence;
    const taskId = `T-${seqNumber}`;

    const endDt = endDate ? new Date(endDate) : new Date();
    if (deadlineTime) {
      const [hours, mins] = deadlineTime.split(":");
      endDt.setHours(parseInt(hours), parseInt(mins), 0, 0);
    }

    const newTask = new Task({
      companyId,
      taskId,
      taskSequenceNumber: seqNumber,
      assignedBy: req.user._id,
      assignedTo: finalAssignees,
      assignmentType: assignmentType || "multiple",
      departmentId: req.body.departmentId || manager.departmentId || undefined,
      title,
      description,
      priority: priority || "medium",
      startDateTime: startDt,
      endDateTime: endDt,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : startDt,
      status: "pending",
      isLive: true,
      liveAt: new Date(),
      attachments: attachments || [],
      projectId: projectId || null,
      checklist: checklist || []
    });

    await newTask.save();
    
    const TaskActivity = require("../models/TaskActivity");
    await TaskActivity.create({
      companyId,
      taskId: newTask._id,
      action: "created",
      remarks: "Task created directly by manager",
      performedBy: req.user._id
    });

    await AuditLog.create({
      companyId,
      action: "Manager Created One-Time Task",
      performedBy: req.user._id,
    });

    // Socket.IO Emit
    try {
      const io = require("../../socket").getIO();
      io.emit(`taskCreated_${companyId}`, { task: newTask });
    } catch (err) {
      console.error("Socket error on createTask:", err);
    }

    return res.status(201).json({ success: true, data: newTask, message: "Task created successfully" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/tasks/:id
// ═══════════════════════════════════════════════════════════════
const getTaskById = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    teamIds.push(manager._id); // Can view own tasks too

    let task = await Task.findOne({ _id: id, companyId })
      .populate({ 
        path: "assignedTo", 
        select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
        populate: [
          { path: "departmentId", select: "name", strictPopulate: false },
          { path: "departmentIds", select: "name", strictPopulate: false }
        ]
      })
      .populate("assignedBy", "name")
      .populate("projectId", "name")
      .populate({ path: "departmentId", select: "name", strictPopulate: false })
      .lean();

    let isTemplate = false;
    if (!task) {
      const TaskTemplate = require("../models/TaskTemplate");
      task = await TaskTemplate.findOne({ _id: id, companyId })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode designationId departmentName departmentId departmentIds",
          populate: [
            { path: "departmentId", select: "name", strictPopulate: false },
            { path: "departmentIds", select: "name", strictPopulate: false }
          ]
        })
        .populate("assignedBy", "name")
        .populate("projectId", "name")
        .populate({ path: "departmentId", select: "name", strictPopulate: false })
        .lean();
      
      if (task) isTemplate = true;
    }

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (task.assignedTo && task.assignedTo.length > 0) {
      const hasAccess = task.assignedTo.some(a => teamIds.map(t => t.toString()).includes(a._id.toString()));
      if (!hasAccess && manager._id.toString() !== task.assignedTo[0]._id.toString()) {
        // We only allow if at least one assignee is in team or manager is assigned
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }
    
    if (isTemplate) {
      task.isTemplate = true;
      task.status = task.status || "pending";
    }
    task.assignees = task.assignedTo || [];

    return res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/manager/tasks/:id
// ═══════════════════════════════════════════════════════════════
const updateTask = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { 
      title, description, priority, dueDate, assignees, assignmentType, dependsOn, estimatedHours, actualHours,
      isRecurringTemplate, recurrenceType, recurringTime, recurringDaysOfWeek, recurringDayOfMonth
    } = req.body;

    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const task = await Task.findOne({ _id: id, companyId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Track old assignees for notification
    const oldAssignees = task.assignees ? task.assignees.map(a => a.toString()) : [];

    // Permissions check
    let settings = await CompanyTaskSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerEditTeamTask === false) {
      return res.status(403).json({ success: false, message: "Editing team task not allowed" });
    }

    if (task.assignees && task.assignees.length > 0) {
      const hasAccess = task.assignees.some(a => teamIds.map(t => t.toString()).includes(a.toString()));
      if (!hasAccess && task.assignees[0].toString() !== manager._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    if (assignmentType) {
      if (assignmentType === "company") {
        return res.status(403).json({ success: false, message: "Managers cannot assign tasks to the entire company" });
      }
      if (assignmentType === "department" && manager.managerAccessLevel !== "department") {
        return res.status(403).json({ success: false, message: "You do not have permission to assign tasks to the entire department" });
      }
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (assignmentType) task.assignmentType = assignmentType;
    if (dependsOn) task.dependsOn = dependsOn;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;
    if (isRecurringTemplate !== undefined) task.isRecurringTemplate = isRecurringTemplate;
    if (recurrenceType !== undefined) task.recurrenceType = recurrenceType;
    if (recurringTime !== undefined) task.recurringTime = recurringTime;
    if (recurringDaysOfWeek !== undefined) task.recurringDaysOfWeek = recurringDaysOfWeek;
    if (recurringDayOfMonth !== undefined) task.recurringDayOfMonth = recurringDayOfMonth;
    
    if (assignees && Array.isArray(assignees)) {
      // Basic check to ensure they are team members
      const allInTeam = assignees.every(aid => teamIds.map(t => t.toString()).includes(aid.toString()) || aid.toString() === manager._id.toString());
      if (allInTeam) {
        task.assignees = assignees;

        // Sync assigneeProgress
        if (!task.assigneeProgress) task.assigneeProgress = [];
        
        // Remove assignees that are no longer in the list
        task.assigneeProgress = task.assigneeProgress.filter(p => 
          assignees.some(aid => aid.toString() === p.employeeId?.toString())
        );

        // Add new assignees that aren't in the progress list yet
        assignees.forEach(aid => {
          const exists = task.assigneeProgress.some(p => p.employeeId?.toString() === aid.toString());
          if (!exists) {
            task.assigneeProgress.push({
              employeeId: aid,
              statusKey: "pending",
              statusLabelSnapshot: "Pending",
              updatedAt: new Date()
            });
          }
        });
      }
    }

    task.activityLog.push({ action: "Task updated", performedBy: manager.fullName });
    await task.save();

    try {
      const io = require("../../socket").getIO();
      io.emit(`taskUpdated_${companyId}`, { task });
    } catch (err) {
      console.error("Socket error on updateTask:", err);
    }

    // Notify newly added assignees
    if (assignees && Array.isArray(assignees)) {
      const newAssignees = assignees.filter(a => !oldAssignees.includes(a.toString()));
      if (newAssignees.length > 0) {
        sendNotificationToEmployees(
          companyId,
          newAssignees,
          "New Task Assigned",
          `You have been assigned a task: ${task.title}`,
          "task",
          { taskId: task._id.toString(), projectId: task.projectId ? task.projectId.toString() : null }
        );
      }
    }

    return res.json({ success: true, data: task, message: "Task updated" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// DELETE /api/manager/tasks/:id
// ═══════════════════════════════════════════════════════════════
const deleteTask = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const manager = await resolveManagerEmployee(req);
    const task = await Task.findOne({ _id: id, companyId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Custom Permissions Check
    const perm = manager.permissions || {};
    const hasCustomized = Object.keys(perm).length > 0;
    if (hasCustomized) {
      if (perm.tasks?.cancel !== true) {
        return res.status(403).json({ success: false, message: "You do not have permission to cancel tasks." });
      }
    } else {
      // Default: Manager has cancel set to false
      return res.status(403).json({ success: false, message: "You do not have permission to cancel tasks." });
    }

    // We rely on RBAC (perm.tasks.cancel) for this action

    task.status = "cancelled";
    task.timerActive = false;
    await task.save();

    return res.json({ success: true, message: "Task cancelled successfully" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PATCH /api/manager/tasks/:id/status
// ═══════════════════════════════════════════════════════════════
const updateTaskStatus = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { status, nextFollowUpDate, remarks, remark } = req.body;
    const actualRemark = remarks || remark || "";

    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    let task = await Task.findOne({ _id: id, companyId });
    let isTemplate = false;
    if (!task) {
      const TaskTemplate = require("../models/TaskTemplate");
      task = await TaskTemplate.findOne({ _id: id, companyId });
      if (task) isTemplate = true;
    }
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (task.assignees && task.assignees.length > 0) {
      const hasAccess = task.assignees.some(a => 
        teamIds.map(t => t.toString()).includes(a.toString()) || a.toString() === manager._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    task.status = status;
    if (nextFollowUpDate !== undefined) {
      if (nextFollowUpDate && !isNaN(new Date(nextFollowUpDate).getTime())) {
        task.nextFollowUpDate = new Date(nextFollowUpDate);
      } else {
        task.nextFollowUpDate = null;
      }
    } else if (["complete", "completed", "late_complete", "re_complete", "re_late_complete", "cancelled"].includes(status)) {
      task.nextFollowUpDate = null;
    }

    task.activityLog = task.activityLog || [];
    task.activityLog.push({ action: `Status changed to ${status}`, performedBy: manager.fullName, remark: actualRemark || undefined });
    await task.save();

    // Auto calculate project progress
    if (task.projectId) {
      const allTasks = await Task.find({ projectId: task.projectId });
      const completedTasks = allTasks.filter(t => t.status === "done" || t.status === "completed").length;
      const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
      await Project.findByIdAndUpdate(task.projectId, { progress });
    }


    // Notify assignees about status change
    const allTaskAssignees = (task.assignedTo && task.assignedTo.length > 0) ? task.assignedTo : (task.assignees || []);
    const otherAssignees = allTaskAssignees.filter(id => (id._id ? id._id.toString() : id.toString()) !== manager._id.toString());
    if (otherAssignees.length > 0) {
      await sendNotificationToEmployees(
        companyId,
        otherAssignees,
        "Task Status Updated",
        `${manager.fullName} changed the status of "${task.title}" to ${status}`,
        "task",
        { taskId: task._id.toString() }
      ).catch(err => console.error("Error sending notification to other assignees:", err));
    }

    // Notify CompanyAdmin + Dept Manager when task is completed or late completed
    const completionStatuses = ["complete", "completed", "late_complete", "re_complete", "re_late_complete"];
    if (completionStatuses.includes(status)) {
      const notifTitle = status.includes("late") ? "Task Completed Late" : "Task Completed";
      const notifBody = status.includes("late")
        ? `Task "${task.title}" has been completed late.`
        : `Task "${task.title}" has been completed.`;
      notifyTaskSupervisors(
        companyId,
        allTaskAssignees,
        task.departmentId || null,
        notifTitle,
        notifBody,
        "task_update",
        { taskId: task._id.toString() }
      ).catch(err => console.error("notifyTaskSupervisors error:", err));
    }

    return res.json({ success: true, data: task, message: "Status updated" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/tasks/:id/comments
// ═══════════════════════════════════════════════════════════════
const addTaskComment = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { comment, attachments } = req.body;

    const manager = await resolveManagerEmployee(req);
    const task = await Task.findOne({ _id: id, companyId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (!task.comments) task.comments = [];
    task.comments.push({
      comment,
      senderName: manager.fullName,
      senderRole: "Manager",
      attachments: attachments || [],
      createdAt: new Date(),
    });

    task.activityLog.push({ action: "Added a comment", performedBy: manager.fullName });
    await task.save();

    // Notify assignees about comment
    const otherAssignees = (task.assignees || []).filter(id => id.toString() !== manager._id.toString());
    if (otherAssignees.length > 0) {
      await sendNotificationToEmployees(
        companyId,
        otherAssignees,
        "New Comment on Task",
        `${manager.fullName} commented on task: ${task.title}`,
        "task",
        { taskId: task._id.toString() }
      );
    }

    return res.json({ success: true, data: task, message: "Comment added" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/tasks/:id/checklist
// ═══════════════════════════════════════════════════════════════
const updateTaskChecklist = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    const { subtaskId, completed, isCompleted, itemIndex, subtasks, checklist } = req.body;

    const manager = await resolveManagerEmployee(req);
    const task = await Task.findOne({ _id: id, companyId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (!Array.isArray(task.checklist)) {
      task.checklist = [];
    }

    const fullChecklist = Array.isArray(checklist) ? checklist : (Array.isArray(subtasks) ? subtasks : null);

    if (fullChecklist) {
      task.checklist = fullChecklist;
    } else {
      let subtask = null;
      if (subtaskId && mongoose.Types.ObjectId.isValid(subtaskId)) {
        try {
          if (typeof task.checklist.id === "function") {
            subtask = task.checklist.id(subtaskId);
          }
        } catch (e) {}
      }

      if (!subtask && subtaskId) {
        subtask = task.checklist.find((x) => x._id && x._id.toString() === subtaskId.toString());
      }

      if (!subtask && itemIndex !== undefined && itemIndex >= 0 && itemIndex < task.checklist.length) {
        subtask = task.checklist[itemIndex];
      }

      if (!subtask) {
        return res.status(404).json({ success: false, message: "Checklist item not found" });
      }

      const nextCompleted = completed !== undefined ? completed : (isCompleted !== undefined ? isCompleted : !subtask.isCompleted);
      subtask.isCompleted = Boolean(nextCompleted);
    }

    await task.save();

    return res.json({ success: true, data: task, task, message: "Checklist updated" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/work/start
// ═══════════════════════════════════════════════════════════════
const startTaskTimer = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { taskId, projectId } = req.body;
    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    const activeTimer = await Timesheet.findOne({
      companyId,
      employeeId: manager._id,
      timerActive: true
    });

    if (activeTimer) {
      return res.status(400).json({ success: false, message: "A timer is already active" });
    }

    const ts = new Timesheet({
      companyId,
      employeeId: manager._id,
      taskId: taskId || null,
      projectId: projectId || null,
      startTime: new Date(),
      timerActive: true,
      isManual: false
    });

    await ts.save();

    if (taskId) {
      await Task.updateOne(
        { _id: taskId },
        { $push: { activityLog: { action: "Timer started", performedBy: manager.fullName } } }
      );
    }

    return res.json({ success: true, data: ts, message: "Timer started" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/work/stop
// ═══════════════════════════════════════════════════════════════
const stopTaskTimer = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    const activeTimer = await Timesheet.findOne({
      companyId,
      employeeId: manager._id,
      timerActive: true
    });

    if (!activeTimer) {
      return res.status(400).json({ success: false, message: "No active timer found" });
    }

    activeTimer.endTime = new Date();
    activeTimer.timerActive = false;
    const ms = activeTimer.endTime.getTime() - activeTimer.startTime.getTime();
    activeTimer.totalMinutes = Math.round(ms / 60000);

    await activeTimer.save();

    if (activeTimer.taskId) {
      await Task.updateOne(
        { _id: activeTimer.taskId },
        { $push: { activityLog: { action: `Timer stopped (${activeTimer.totalMinutes} min)`, performedBy: manager.fullName } } }
      );
    }

    return res.json({ success: true, data: activeTimer, message: "Timer stopped" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/manager/work/manual
// ═══════════════════════════════════════════════════════════════
const addManualTaskTime = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { taskId, projectId, startTime, endTime, description } = req.body;
    const manager = await resolveManagerEmployee(req);

    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Start and End times are required" });
    }

    const st = new Date(startTime);
    const et = new Date(endTime);
    const ms = et.getTime() - st.getTime();
    const totalMinutes = Math.round(ms / 60000);

    if (totalMinutes <= 0) {
      return res.status(400).json({ success: false, message: "Invalid time range" });
    }

    const ts = new Timesheet({
      companyId,
      employeeId: manager._id,
      taskId: taskId || null,
      projectId: projectId || null,
      startTime: st,
      endTime: et,
      totalMinutes,
      description,
      isManual: true,
      timerActive: false
    });

    await ts.save();

    if (taskId) {
      await Task.updateOne(
        { _id: taskId },
        { $push: { activityLog: { action: `Manual time logged (${totalMinutes} min)`, performedBy: manager.fullName } } }
      );
    }

    return res.json({ success: true, data: ts, message: "Manual time added" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/projects (and related)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// POST /api/manager/projects
// ═══════════════════════════════════════════════════════════════
const createManagerProject = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    if (!manager) {
      return res.status(404).json({ success: false, message: "Manager profile not found" });
    }

    const { name, description, status, members, startDate, endDate, priority, estimatedWorkingDays, clientName, attachments, nextFollowUpDate } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    // A Manager can only create a project for their own department!
    const departmentId = manager.departmentId ? manager.departmentId._id || manager.departmentId : null;

    // The manager is automatically the project manager and a member!
    const projectManager = manager._id;
    
    // Ensure manager is in members list, and merge with submitted members
    const finalMembers = Array.isArray(members) ? [...new Set([projectManager.toString(), ...members])] : [projectManager.toString()];

    const sanitizedAttachments = Array.isArray(attachments)
      ? attachments.map(att => ({
          fileName: att.fileName || att.name || "Attachment",
          fileUrl: att.fileUrl || att.url || "",
          fileType: att.fileType || att.type || "",
        }))
      : [];

    const project = await Project.create({
      name,
      description,
      status: status || "planning",
      members: finalMembers,
      projectManager,
      startDate,
      endDate,
      priority: priority || "medium",
      estimatedWorkingDays: estimatedWorkingDays || 0,
      clientName: clientName || "",
      departmentId,
      companyId,
      attachments: sanitizedAttachments,
      nextFollowUpDate,
    });

    // Notify members (fire and forget)
    const notifyMembers = finalMembers.filter(m => m !== projectManager.toString());
    if (notifyMembers.length > 0) {
      sendNotificationToEmployees(
        companyId,
        notifyMembers,
        "New Project Assigned",
        `You have been assigned to the project: ${name}`,
        "project",
        { projectId: project._id.toString() }
      );
    }

    res.status(201).json({ success: true, project, message: "Project created successfully" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/projects
// ═══════════════════════════════════════════════════════════════
const getManagerProjects = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);

    const allowedDeptIds = [manager.departmentId].filter(Boolean);
    if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
      manager.accessibleDepartments.forEach(id => {
        if (!allowedDeptIds.map(d => d.toString()).includes(id.toString())) {
          allowedDeptIds.push(id);
        }
      });
    }

    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    teamIds.push(manager._id);

    // Projects belonging to allowed departments OR where manager/team is a member
    const projects = await Project.find({
      companyId,
      $or: [
        { departmentId: { $in: allowedDeptIds } },
        { members: { $in: teamIds } }
      ]
    }).sort({ createdAt: -1 }).lean();

    return res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/projects/:id
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
const getManagerProjectById = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    
    if (!id || id.length !== 24) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    let project = await Project.findOne({ _id: id, companyId })
      .populate("members", "fullName photo designationId")
      .lean();

    if (!project) {
      project = await Project.findById(id)
        .populate("members", "fullName photo designationId")
        .lean();
    }

    if (!project || (project.companyId && project.companyId.toString() !== companyId.toString())) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.json({ success: true, data: project, project });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/projects/:id/tasks
// ═══════════════════════════════════════════════════════════════
const getProjectTasks = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    const tasks = await Task.find({ 
      companyId, 
      projectId: id,
    })
      .populate("assignedTo", "firstName lastName fullName photo")
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map(t => ({
      ...t,
      assignees: t.assignedTo || []
    }));

    return res.json({ success: true, data: formattedTasks, tasks: formattedTasks });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/manager/projects/:id/activity
// ═══════════════════════════════════════════════════════════════
const getManagerProjectActivity = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    
    let project = await Project.findOne({ _id: id, companyId }, { activityLog: 1 }).lean();
    if (!project) {
      project = await Project.findById(id, { activityLog: 1 }).lean();
    }
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    return res.json({ success: true, data: project.activityLog || [], activityLog: project.activityLog || [] });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// TIMESHEET GENERIC METHODS
// ═══════════════════════════════════════════════════════════════
const startWork = startTaskTimer; // Reusing logic
const stopWork = stopTaskTimer;
const addManualWork = addManualTaskTime;

const getMyTimesheet = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { date } = req.query; // YYYY-MM-DD
    const manager = await resolveManagerEmployee(req);
    
    let filter = { companyId, employeeId: manager._id };
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const timesheets = await Timesheet.find(filter)
      .populate("taskId", "title status")
      .populate("projectId", "name")
      .sort({ startTime: -1 })
      .lean();

    return res.json({ success: true, data: timesheets });
  } catch (error) {
    next(error);
  }
};

const getTeamTimesheet = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { date, employeeId, projectId } = req.query;
    
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    let filter = { companyId, employeeId: { $in: teamIds } };
    if (employeeId) filter.employeeId = employeeId;
    if (projectId) filter.projectId = projectId;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "fullName photo employeeCode")
      .populate("taskId", "title status")
      .populate("projectId", "name")
      .sort({ startTime: -1 })
      .lean();

    return res.json({ success: true, data: timesheets });
  } catch (error) {
    next(error);
  }
};

const approveTimesheet = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;
    
    const settings = await CompanyTaskSettings.findOne({ companyId }).lean();
    if (settings && settings.allowManagerApproveTimesheet === false) {
      return res.status(403).json({ success: false, message: "Timesheet approval disabled" });
    }

    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);

    const ts = await Timesheet.findOne({ _id: id, companyId });
    if (!ts) return res.status(404).json({ success: false, message: "Timesheet not found" });

    if (!teamIds.map(t=>t.toString()).includes(ts.employeeId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    ts.description = ts.description ? ts.description + " [Approved]" : "[Approved]";
    await ts.save();

    return res.json({ success: true, message: "Timesheet approved" });
  } catch (error) {
    next(error);
  }
};
// ═══════════════════════════════════════════════════════════════
// REPORTS APIs
// ═══════════════════════════════════════════════════════════════

const getReportsSummary = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [monthlyAtt, teamTasks, teamLeaves, teamTimesheets] = await Promise.all([
      Attendance.find({ companyId, employeeId: { $in: teamIds }, month: currentMonth, year: currentYear }).lean(),
      Task.find({ companyId, assignedTo: { $in: teamIds } }).lean(),
      Leave.find({ companyId, employeeId: { $in: teamIds } }).lean(),
      Timesheet.find({ companyId, employeeId: { $in: teamIds } }).lean(),
    ]);

    const presentCount = monthlyAtt.filter(a => ["present", "late", "half_day"].includes(a.status)).length;
    const absentCount = monthlyAtt.filter(a => a.status === "absent").length;
    
    const openTasks = teamTasks.filter(t => t.status !== "done").length;
    const completedTasks = teamTasks.filter(t => t.status === "done").length;
    const overdueTasks = teamTasks.filter(t => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now).length;
    
    const pendingLeaves = teamLeaves.filter(l => l.status === "pending").length;
    const approvedLeaves = teamLeaves.filter(l => l.status === "approved").length;
    
    const totalWorkMinutes = teamTimesheets.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

    return res.json({
      success: true,
      data: {
        attendance: { presentCount, absentCount, totalLogs: monthlyAtt.length },
        tasks: { openTasks, completedTasks, overdueTasks },
        leaves: { pendingLeaves, approvedLeaves },
        work: { totalWorkHours: (totalWorkMinutes / 60).toFixed(1) }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTeamAttendanceReport = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const { startDate, endDate, employeeId } = req.query;
    let filter = { companyId, employeeId: { $in: teamIds } };
    
    if (employeeId) {
      if (!teamIds.map(id => id.toString()).includes(employeeId)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      filter.employeeId = employeeId;
    }
    
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }
    
    const records = await Attendance.find(filter)
      .populate("employeeId", "fullName employeeCode")
      .sort({ date: -1 })
      .lean();
      
    return res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

const getTeamTasksReport = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const { status, employeeId, projectId } = req.query;
    let filter = { companyId, assignedTo: { $in: teamIds } };
    
    if (status) filter.status = status;
    if (employeeId) filter.assignedTo = employeeId;
    if (projectId) filter.projectId = projectId;
    
    const tasks = await Task.find(filter)
      .populate("assignedTo", "firstName lastName fullName employeeCode")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formattedTasks = tasks.map(t => ({
      ...t,
      assignees: t.assignedTo || []
    }));
      
    return res.json({ success: true, data: formattedTasks });
  } catch (error) {
    next(error);
  }
};

const getTeamLeavesReport = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const { status, employeeId } = req.query;
    let filter = { companyId, employeeId: { $in: teamIds } };
    
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    
    const leaves = await Leave.find(filter)
      .populate("employeeId", "fullName employeeCode")
      .sort({ createdAt: -1 })
      .lean();
      
    return res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
};

const getTeamWorkReport = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const manager = await resolveManagerEmployee(req);
    const teamIds = await getManagerTeamEmployeeIds(manager._id, companyId);
    
    const { employeeId, projectId } = req.query;
    let filter = { companyId, employeeId: { $in: teamIds } };
    
    if (employeeId) filter.employeeId = employeeId;
    if (projectId) filter.projectId = projectId;
    
    const timesheets = await Timesheet.find(filter)
      .populate("employeeId", "fullName employeeCode")
      .populate("projectId", "name")
      .populate("taskId", "title")
      .sort({ startTime: -1 })
      .lean();
      
    return res.json({ success: true, data: timesheets });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════

const getManagerAnnouncements = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const userId = req.user._id;
    
    const announcements = await Announcement.find({
      status: "published",
      $or: [
        { targetType: "allEmployees" },
        { targetType: "selectedCompany", targetCompanies: companyId },
        { targetType: "roleBased", targetRoles: "Manager" },
      ],
    }).sort({ createdAt: -1 }).lean();
    
    const enriched = announcements.map((ann) => ({
      ...ann,
      isRead: (ann.readBy || []).map((id) => id.toString()).includes(userId.toString()),
    }));
    
    return res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

const markAnnouncementRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    await Announcement.updateOne(
      { _id: id },
      { $addToSet: { readBy: userId } }
    );
    
    return res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// PROJECT CHANGE REQUESTS
// ═══════════════════════════════════════════════════════════════

const getProjectChangeRequests = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ProjectChangeRequest = require("../models/ProjectChangeRequest");
    const requests = await ProjectChangeRequest.find({ projectId, companyId: req.companyId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

const updateProjectChangeRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ProjectChangeRequest = require("../models/ProjectChangeRequest");
    
    const request = await ProjectChangeRequest.findOneAndUpdate(
      { _id: id, companyId: req.companyId },
      { status },
      { new: true }
    );
    
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    // Emit socket event
    try {
      const io = require("../../socket").getIO();
      io.emit(`changeRequestUpdated_${req.companyId}`, { request });
    } catch (err) { }

    return res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

const toggleTaskTemplateStatus = async (req, res, next) => {
  try {
    const TaskTemplate = require("../models/TaskTemplate");
    // Verify the template exists and belongs to the company
    const template = await TaskTemplate.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!template) {
      return res.status(404).json({ success: false, message: "Task template not found" });
    }
    
    // Toggle the status
    template.isActive = !template.isActive;
    await template.save();
    
    res.json({ success: true, message: `Recurring task ${template.isActive ? 'resumed' : 'stopped'} successfully`, isActive: template.isActive });
  } catch (error) {
    next(error);
  }
};

const updateManagerProject = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    let project = await Project.findOne({ _id: id, companyId });
    if (!project) {
      project = await Project.findById(id);
    }

    if (!project || (project.companyId && project.companyId.toString() !== companyId.toString())) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const fields = ["name", "description", "status", "members", "projectManager", "startDate", "endDate", "priority", "estimatedWorkingDays", "clientName", "milestones", "activityLog", "departmentId", "nextFollowUpDate"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) project[f] = req.body[f];
    });

    if (req.body.attachments !== undefined && Array.isArray(req.body.attachments)) {
      project.attachments = req.body.attachments.map(att => ({
        fileName: att.fileName || att.name || "Attachment",
        fileUrl: att.fileUrl || att.url || "",
        fileType: att.fileType || att.type || "",
      }));
    }

    await project.save();

    res.json({ success: true, project, data: project, message: "Project updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteManagerProject = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { id } = req.params;

    let project = await Project.findOneAndDelete({ _id: id, companyId });
    if (!project) {
      project = await Project.findByIdAndDelete(id);
    }

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getManagerTeamEmployeeIds,
  getManagerDashboardSummary,
  getManagerTeam,
  getTeamMemberById,
  getTeamOrg,
  getAttendancePermissions,
  getTeamAttendance,
  getTeamMemberMonthlyAttendance,
  getRegularizationRequests,
  approveRegularization,
  rejectRegularization,
  manualUpdateTeamAttendance,
  getLeavePermissions,
  getTeamLeaves,
  getTeamLeaveById,
  approveTeamLeave,
  rejectTeamLeave,
  getTaskPermissions,
  getMyTasks,
  getTeamTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addTaskComment,
  updateTaskChecklist,
  startTaskTimer,
  stopTaskTimer,
  addManualTaskTime,
  getManagerProjects,
  createManagerProject,
  getManagerProjectById,
  updateManagerProject,
  deleteManagerProject,
  getProjectTasks,
  getManagerProjectActivity,
  startWork,
  stopWork,
  addManualWork,
  getMyTimesheet,
  getTeamTimesheet,
  approveTimesheet,
  getTeamAttendanceReport,
  getTeamTasksReport,
  getTeamLeavesReport,
  getTeamWorkReport,
  getReportsSummary,
  getManagerAnnouncements,
  markAnnouncementRead,
  getProjectChangeRequests,
  updateProjectChangeRequestStatus,
  toggleTaskTemplateStatus
};
