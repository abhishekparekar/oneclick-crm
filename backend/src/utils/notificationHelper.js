const Employee = require("../models/Employee");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Company = require("../models/Company");

/**
 * Universal safe helper to resolve any mix of User/Employee ObjectIds or strings into unique User ObjectIds
 */
const resolveToUserIds = async (ids, companyId = null) => {
  if (!ids || (Array.isArray(ids) && ids.length === 0)) return [];
  const cleanIds = (Array.isArray(ids) ? ids : [ids])
    .map(id => (id ? (id._id ? id._id.toString() : id.toString()) : ""))
    .filter(Boolean);
  if (cleanIds.length === 0) return [];

  const targetUserIds = new Set();

  // 1. Check if any are direct User _ids
  const directUsers = await User.find({ _id: { $in: cleanIds } }).select("_id").lean();
  directUsers.forEach(u => targetUserIds.add(u._id.toString()));

  // 2. Check if any are Employee records by _id or userId
  const employeeQuery = {
    $or: [{ _id: { $in: cleanIds } }, { userId: { $in: cleanIds } }]
  };
  if (companyId) employeeQuery.companyId = companyId;

  const employees = await Employee.find(employeeQuery).select("userId").lean();
  employees.forEach(emp => {
    if (emp && emp.userId) {
      targetUserIds.add((emp.userId._id || emp.userId).toString());
    }
  });

  return [...targetUserIds];
};

/**
 * Send deduplicated notification to a single user
 */
const notifyUser = async (userId, companyId, title, body, type = "system", data = {}, idempotencyKey = null) => {
  try {
    if (!userId) return null;
    const cleanUserId = userId._id || userId;
    return await Notification.createDeduplicated({
      companyId,
      userId: cleanUserId,
      title,
      body,
      type,
      data,
      idempotencyKey
    });
  } catch (err) {
    console.error("[notifyUser] Error creating notification:", err);
    return null;
  }
};

/**
 * Send deduplicated notifications to multiple users
 */
const notifyManyUsers = async (userIds, companyId, title, body, type = "system", data = {}, idempotencyKeyPrefix = null) => {
  try {
    if (!userIds || userIds.length === 0) return [];
    const uniqueUserIds = [...new Set(
      userIds.map(id => (id ? (id._id ? id._id.toString() : id.toString()) : "")).filter(Boolean)
    )];
    if (uniqueUserIds.length === 0) return [];

    return await Promise.all(
      uniqueUserIds.map(id => {
        const idKey = idempotencyKeyPrefix ? `${idempotencyKeyPrefix}_${id}` : null;
        return Notification.createDeduplicated({
          companyId,
          userId: id,
          title,
          body,
          type,
          data,
          idempotencyKey: idKey
        });
      })
    );
  } catch (err) {
    console.error("[notifyManyUsers] Error creating notifications:", err);
    return [];
  }
};

/**
 * Notify employee IDs (resolves to User records)
 */
const sendNotificationToEmployees = async (companyId, employeeIds, title, body, type = "task", data = {}, idempotencyKeyPrefix = null) => {
  try {
    const userIds = await resolveToUserIds(employeeIds, companyId);
    if (userIds.length === 0) return [];
    return await notifyManyUsers(userIds, companyId, title, body, type, data, idempotencyKeyPrefix);
  } catch (err) {
    console.error("[sendNotificationToEmployees] Error:", err);
    return [];
  }
};

/**
 * Notify all active employees of a company
 */
const sendNotificationToAllEmployees = async (companyId, title, body, type = "announcement", data = {}) => {
  try {
    const employees = await Employee.find({ companyId, status: "active" }).select("userId").lean();
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    return await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error("[sendNotificationToAllEmployees] Error:", err);
    return [];
  }
};

/**
 * Notify users matching a specific role
 */
const notifyRole = async (companyId, role, title, body, type = "system", data = {}, excludeUserIds = []) => {
  try {
    const roleRegex = new RegExp(`^${role}$`, "i");
    const query = {
      companyId,
      role: { $regex: roleRegex },
      isActive: { $ne: false }
    };
    if (excludeUserIds && excludeUserIds.length > 0) {
      query._id = { $nin: excludeUserIds };
    }
    const users = await User.find(query).select("_id").lean();
    const userIds = users.map(u => u._id.toString());
    return await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error(`[notifyRole] Error creating notifications for role ${role}:`, err);
    return [];
  }
};

/**
 * Notify all employees belonging to a department
 */
const notifyDepartment = async (companyId, departmentId, title, body, type = "system", data = {}, excludeUserIds = []) => {
  try {
    const employees = await Employee.find({ companyId, departmentId, status: "active" }).select("userId").lean();
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    const filtered = excludeUserIds.length > 0
      ? userIds.filter(id => !excludeUserIds.includes(id.toString()))
      : userIds;
    return await notifyManyUsers(filtered, companyId, title, body, type, data);
  } catch (err) {
    console.error(`[notifyDepartment] Error creating notifications for department ${departmentId}:`, err);
    return [];
  }
};

/**
 * Notify reporting managers of specific employees
 */
const notifyReportingManagers = async (companyId, employeeIds, title, body, type = "system", data = {}, excludeUserIds = []) => {
  try {
    if (!employeeIds || employeeIds.length === 0) return [];
    const employees = await Employee.find({
      $or: [{ _id: { $in: employeeIds } }, { userId: { $in: employeeIds } }],
      companyId
    }).select("reportingManagerId").lean();

    const managerEmpIds = [...new Set(employees.map(e => e.reportingManagerId).filter(Boolean))];
    if (managerEmpIds.length === 0) return [];

    const managers = await Employee.find({ _id: { $in: managerEmpIds }, companyId }).select("userId").lean();
    const userIds = managers
      .map(m => (m.userId ? (m.userId._id || m.userId).toString() : null))
      .filter(Boolean);

    const filtered = excludeUserIds.length > 0
      ? userIds.filter(id => !excludeUserIds.includes(id))
      : userIds;

    return await notifyManyUsers(filtered, companyId, title, body, type, data);
  } catch (err) {
    console.error("[notifyReportingManagers] Error:", err);
    return [];
  }
};

/**
 * Notify department managers
 */
const notifyDeptManagers = async (companyId, departmentId, title, body, type = "system", data = {}, excludeUserIds = []) => {
  try {
    if (!departmentId) return [];
    const deptManagers = await Employee.find({
      companyId,
      status: "active",
      $or: [
        { departmentId, isManager: true },
        { departmentIds: departmentId, isManager: true },
        { accessibleDepartments: departmentId, isManager: true },
        { departmentId, role: { $in: ["Manager", "TeamLeader"] } },
        { departmentIds: departmentId, role: { $in: ["Manager", "TeamLeader"] } },
        { accessibleDepartments: departmentId, role: { $in: ["Manager", "TeamLeader"] } },
        { isManager: true, departmentId }
      ]
    }).select("userId").lean();

    const userIds = deptManagers
      .map(dm => (dm.userId ? (dm.userId._id || dm.userId).toString() : null))
      .filter(Boolean);

    const filtered = excludeUserIds.length > 0
      ? userIds.filter(id => !excludeUserIds.includes(id))
      : userIds;

    return await notifyManyUsers(filtered, companyId, title, body, type, data);
  } catch (err) {
    console.error("[notifyDeptManagers] Error:", err);
    return [];
  }
};

/**
 * Notify all supervisors of a task (CompanyAdmin, HR, Reporting Managers, Department Managers)
 * strictly excluding any IDs in excludeUserIds (e.g. assignees already notified or creator).
 */
const notifyTaskSupervisors = async (
  companyId,
  assignedEmployeeIds = [],
  departmentId = null,
  title = "Task Update",
  body = "",
  type = "task",
  data = {},
  excludeUserIds = [],
  customKeyPrefix = null
) => {
  try {
    const collectedUserIds = new Set();
    const excludeSet = new Set(
      (excludeUserIds || []).map(id => (id ? (id._id ? id._id.toString() : id.toString()) : "")).filter(Boolean)
    );

    // Guarantee that assignees are ALWAYS added to the supervisor excludeSet
    if (assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      const resolvedAssigneeUserIds = await resolveToUserIds(assignedEmployeeIds, companyId);
      resolvedAssigneeUserIds.forEach(id => excludeSet.add(id.toString()));
    }

    // 1. Company Admin users ("admin la gelch pahije")
    const admins = await User.find({
      companyId,
      role: { $in: ["CompanyAdmin", "admin", "Admin", "company_admin"] },
      isActive: { $ne: false }
    }).select("_id").lean();

    admins.forEach(a => {
      const idStr = a._id.toString();
      if (!excludeSet.has(idStr)) collectedUserIds.add(idStr);
    });

    // 2. Direct Reporting Managers of assigned employees (strictly verified manager role)
    if (assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      const assignedEmps = await Employee.find({
        $or: [{ _id: { $in: assignedEmployeeIds } }, { userId: { $in: assignedEmployeeIds } }],
        companyId
      }).select("reportingManagerId departmentId").lean();

      const reportingManagerEmpIds = [
        ...new Set(assignedEmps.map(e => e.reportingManagerId).filter(Boolean).map(id => id.toString()))
      ];

      if (reportingManagerEmpIds.length > 0) {
        const reportingManagers = await Employee.find({
          _id: { $in: reportingManagerEmpIds },
          companyId,
          status: "active",
          $or: [
            { role: { $in: ["Manager", "TeamLeader"] } },
            { isManager: true }
          ]
        }).select("userId").lean();

        reportingManagers.forEach(m => {
          if (m.userId) {
            const idStr = (m.userId._id || m.userId).toString();
            if (!excludeSet.has(idStr)) collectedUserIds.add(idStr);
          }
        });
      }

      // 3. Department Managers of that department (strictly checking role: Manager / TeamLeader or isManager: true)
      const deptIds = [
        ...new Set([
          ...assignedEmps.map(e => e.departmentId).filter(Boolean).map(id => id.toString()),
          ...(departmentId ? [departmentId.toString()] : [])
        ])
      ];

      if (deptIds.length > 0) {
        const deptManagers = await Employee.find({
          companyId,
          status: "active",
          $or: [
            { role: { $in: ["Manager", "TeamLeader"] }, departmentId: { $in: deptIds } },
            { role: { $in: ["Manager", "TeamLeader"] }, departmentIds: { $in: deptIds } },
            { role: { $in: ["Manager", "TeamLeader"] }, accessibleDepartments: { $in: deptIds } },
            { isManager: true, departmentId: { $in: deptIds } },
            { isManager: true, departmentIds: { $in: deptIds } },
            { isManager: true, accessibleDepartments: { $in: deptIds } }
          ]
        }).select("userId").lean();

        deptManagers.forEach(m => {
          if (m.userId) {
            const idStr = (m.userId._id || m.userId).toString();
            if (!excludeSet.has(idStr)) collectedUserIds.add(idStr);
          }
        });
      }
    } else if (departmentId) {
      const deptManagers = await Employee.find({
        companyId,
        status: "active",
        $or: [
          { role: { $in: ["Manager", "TeamLeader"] }, departmentId },
          { role: { $in: ["Manager", "TeamLeader"] }, departmentIds: departmentId },
          { role: { $in: ["Manager", "TeamLeader"] }, accessibleDepartments: { $in: [departmentId] } },
          { isManager: true, departmentId },
          { isManager: true, departmentIds: departmentId },
          { isManager: true, accessibleDepartments: { $in: [departmentId] } }
        ]
      }).select("userId").lean();

      deptManagers.forEach(m => {
        if (m.userId) {
          const idStr = (m.userId._id || m.userId).toString();
          if (!excludeSet.has(idStr)) collectedUserIds.add(idStr);
        }
      });
    }

    if (collectedUserIds.size === 0) return [];

    const taskId = data?.taskId || data?.templateId || "";
    const actionKey = data?.action || data?.status || "update";
    const idKeyPrefix = customKeyPrefix || (taskId ? `task_sup_${type}_${taskId}_${actionKey}` : null);

    return await notifyManyUsers([...collectedUserIds], companyId, title, body, type, data, idKeyPrefix);
  } catch (err) {
    console.error("[notifyTaskSupervisors] Error:", err);
    return [];
  }
};

/**
 * Unified Task Notification Dispatcher
 * Coordinates Assignees vs Supervisors with ZERO overlap.
 * One event = strictly one notification per intended recipient.
 */
const notifyTaskAll = async (
  companyId,
  assignedEmployeeIds = [],
  departmentId = null,
  title = "Task Notification",
  body = "",
  type = "task",
  data = {},
  options = {}
) => {
  try {
    const {
      excludeUserId = null,
      assigneeTitle = null,
      assigneeBody = null,
      supervisorTitle = null,
      supervisorBody = null,
    } = options;

    const excludeStr = excludeUserId ? (excludeUserId._id || excludeUserId).toString() : null;

    // 1. Resolve all assignees to clean User IDs
    const assigneeUserIds = await resolveToUserIds(assignedEmployeeIds, companyId);
    const finalAssigneeUserIds = excludeStr
      ? assigneeUserIds.filter(id => id !== excludeStr)
      : assigneeUserIds;

    const taskId = data?.taskId || data?.templateId || "";
    const actionKey = data?.action || data?.status || "update";

    // 2. Notify Assignees with assignee-tailored notification
    if (finalAssigneeUserIds.length > 0) {
      const aTitle = assigneeTitle || title;
      const aBody = assigneeBody || body;
      const aKeyPrefix = taskId ? `task_assignee_${type}_${taskId}_${actionKey}` : null;

      await notifyManyUsers(finalAssigneeUserIds, companyId, aTitle, aBody, type, data, aKeyPrefix);
    }

    // 3. Notify Supervisors (Admins & Managers)
    // Strictly exclude all assigneeUserIds and excludeUserId to guarantee ZERO duplicates!
    const excludeFromSupervisors = [
      ...assigneeUserIds,
      ...(excludeStr ? [excludeStr] : [])
    ];

    const sTitle = supervisorTitle || title;
    const sBody = supervisorBody || body;
    const supKeyPrefix = taskId ? `task_sup_${type}_${taskId}_${actionKey}` : null;

    await notifyTaskSupervisors(
      companyId,
      assignedEmployeeIds,
      departmentId,
      sTitle,
      sBody,
      type,
      data,
      excludeFromSupervisors,
      supKeyPrefix
    );
  } catch (err) {
    console.error("[notifyTaskAll] Error:", err);
  }
};

/**
 * Unified Attendance Punch In/Out Notification Dispatcher
 * Sends:
 * 1. Exactly 1 confirmation notification to the employee who punched
 * 2. Exactly 1 notification to supervisors (CompanyAdmin, HR, Dept Managers, Reporting Manager)
 * Guarantees zero duplicate notifications even if employee has administrative/managerial roles.
 */
const notifyAttendancePunch = async ({
  companyId,
  employee,
  action, // "punch_in" or "punch_out"
  timeStr,
  status = "Present",
  totalHours = "",
  attendanceId = ""
}) => {
  try {
    if (!employee || !companyId) return;
    const empUserId = employee.userId ? (employee.userId._id || employee.userId).toString() : null;
    const empName = employee.user?.name || (employee.firstName ? `${employee.firstName} ${employee.lastName || ""}`.trim() : "Employee");

    // Fetch company notification settings
    const company = await Company.findById(companyId).select("settings.attendanceNotifications").lean();
    const notifSettings = company?.settings?.attendanceNotifications;

    const actionKey = action === "punch_in" ? "punchIn" : "punchOut";
    const actionConfig = notifSettings?.[actionKey] || {
      enabled: false,
      notifyEmployee: false,
      notifyManager: false,
      notifyAdmin: false,
    };

    // If notifications for this punch action are disabled (default is false), exit immediately
    if (!actionConfig.enabled) {
      return;
    }

    // 1. Employee Confirmation Notification (Only to employee, if enabled)
    if (empUserId && actionConfig.notifyEmployee) {
      const empTitle = action === "punch_in" ? "Punch In Recorded" : "Punch Out Recorded";
      const empBody = action === "punch_in"
        ? `You punched in at ${timeStr}.`
        : `You punched out at ${timeStr}.${totalHours ? ` Total hours: ${totalHours}.` : ""}`;

      await Notification.createDeduplicated({
        companyId,
        userId: empUserId,
        title: empTitle,
        body: empBody,
        type: "attendance",
        data: {
          attendanceId: attendanceId ? attendanceId.toString() : "",
          action
        },
        idempotencyKey: attendanceId ? `att_emp_${action}_${attendanceId}_${empUserId}` : null,
      });
    }

    // 2. Supervisor Notification (Admins, HR, Reporting Manager, Dept Manager)
    const supervisorUserIds = new Set();

    // CompanyAdmin & HR (only if notifyAdmin is enabled)
    if (actionConfig.notifyAdmin) {
      const adminUsers = await User.find({
        companyId,
        role: { $in: ["CompanyAdmin", "admin", "Admin", "hr", "HR", "company_admin"] },
        isActive: { $ne: false },
        ...(empUserId ? { _id: { $ne: empUserId } } : {})
      }).select("_id").lean();
      adminUsers.forEach(u => supervisorUserIds.add(u._id.toString()));
    }

    // Managers (Reporting Manager & Department Managers - only if notifyManager is enabled)
    if (actionConfig.notifyManager) {
      // Reporting Manager
      if (employee.reportingManagerId) {
        const repMgr = await Employee.findOne({ _id: employee.reportingManagerId, companyId }).select("userId").lean();
        if (repMgr && repMgr.userId) {
          const repMgrUserId = (repMgr.userId._id || repMgr.userId).toString();
          if (!empUserId || repMgrUserId !== empUserId) {
            supervisorUserIds.add(repMgrUserId);
          }
        }
      }

      // Department Managers
      const deptId = employee.departmentId ? (employee.departmentId._id || employee.departmentId).toString() : null;
      if (deptId) {
        const deptMgrs = await Employee.find({
          companyId,
          status: "active",
          $or: [
            { accessibleDepartments: { $in: [deptId] }, isManager: true },
            { departmentId: deptId, isManager: true },
            { departmentId: deptId, role: { $in: ["Manager", "TeamLeader"] } },
            { accessibleDepartments: { $in: [deptId] }, role: { $in: ["Manager", "TeamLeader"] } },
            { isManager: true, departmentId: deptId }
          ]
        }).select("userId").lean();
        deptMgrs.forEach(m => {
          if (m.userId) {
            const mgrUserId = (m.userId._id || m.userId).toString();
            if (!empUserId || mgrUserId !== empUserId) {
              supervisorUserIds.add(mgrUserId);
            }
          }
        });
      }
    }

    // Ensure empUserId is strictly removed from supervisor set
    if (empUserId) supervisorUserIds.delete(empUserId);

    if (supervisorUserIds.size > 0) {
      const supTitle = action === "punch_in" ? `Punch In: ${empName}` : `Punch Out: ${empName}`;
      const supBody = action === "punch_in"
        ? `${empName} punched in at ${timeStr}. Status: ${status}.`
        : `${empName} punched out at ${timeStr}.${totalHours ? ` Total hours: ${totalHours}.` : ""}`;

      await Promise.all(
        [...supervisorUserIds].map(supId =>
          Notification.createDeduplicated({
            companyId,
            userId: supId,
            title: supTitle,
            body: supBody,
            type: "attendance",
            data: {
              attendanceId: attendanceId ? attendanceId.toString() : "",
              employeeId: employee._id ? employee._id.toString() : "",
              action
            },
            idempotencyKey: attendanceId ? `att_sup_${action}_${attendanceId}_${supId}` : null,
          })
        )
      );
    }
  } catch (err) {
    console.error("[notifyAttendancePunch] Error dispatching attendance notification:", err);
  }
};

module.exports = {
  resolveToUserIds,
  sendNotificationToEmployees,
  sendNotificationToAllEmployees,
  notifyUser,
  notifyManyUsers,
  notifyRole,
  notifyDepartment,
  notifyCompany: sendNotificationToAllEmployees,
  notifyReportingManagers,
  notifyDeptManagers,
  notifyTaskSupervisors,
  notifyTaskAll,
  notifyAttendancePunch
};
