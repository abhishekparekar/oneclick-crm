const Employee = require("../models/Employee");
const Notification = require("../models/Notification");
const User = require("../models/User");

const sendNotificationToEmployees = async (companyId, employeeIds, title, body, type, data = {}) => {
  try {
    if (!employeeIds || employeeIds.length === 0) return;
    const cleanIds = (Array.isArray(employeeIds) ? employeeIds : [employeeIds]).filter(Boolean);
    
    // Find employees by _id OR by userId
    const employees = await Employee.find({
      $or: [
        { _id: { $in: cleanIds } },
        { userId: { $in: cleanIds } }
      ]
    }).select("userId");

    const targetUserIds = new Set();
    for (const emp of employees) {
      if (emp && emp.userId) {
        targetUserIds.add((emp.userId._id || emp.userId).toString());
      }
    }

    // Also check if any cleanIds are directly valid User _id documents
    const directUsers = await User.find({ _id: { $in: cleanIds } }).select("_id");
    for (const u of directUsers) {
      targetUserIds.add(u._id.toString());
    }

    if (targetUserIds.size === 0) return;

    await notifyManyUsers([...targetUserIds], companyId, title, body, type, data);
  } catch (err) {
    console.error("Error creating notifications for employees:", err);
  }
};

const sendNotificationToAllEmployees = async (companyId, title, body, type, data = {}) => {
  try {
    const employees = await Employee.find({ companyId, status: "active" }).select("userId");
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error("Error creating notifications for all employees:", err);
  }
};

const notifyUser = async (userId, companyId, title, body, type, data = {}) => {
  try {
    if (!userId) return;
    await Notification.create({
      companyId,
      userId: userId._id || userId,
      title,
      body,
      type,
      data
    });
  } catch (err) {
    console.error("Error creating notification for user:", err);
  }
};

const notifyManyUsers = async (userIds, companyId, title, body, type, data = {}) => {
  try {
    if (!userIds || userIds.length === 0) return;
    const uniqueUserIds = [...new Set(userIds.map(id => id ? (id._id ? id._id.toString() : id.toString()) : "").filter(Boolean))];
    if (uniqueUserIds.length === 0) return;

    await Promise.all(
      uniqueUserIds.map((id) =>
        Notification.create({
          companyId,
          userId: id,
          title,
          body,
          type,
          data,
        })
      )
    );
  } catch (err) {
    console.error("Error creating notifications for multiple users:", err);
  }
};

const notifyRole = async (companyId, role, title, body, type, data = {}) => {
  try {
    const roleRegex = new RegExp(`^${role}$`, "i");
    const users = await User.find({
      companyId,
      role: { $regex: roleRegex },
      isActive: { $ne: false }
    }).select("_id");
    const userIds = users.map(u => u._id);
    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error(`Error creating notifications for role ${role}:`, err);
  }
};

const notifyDepartment = async (companyId, departmentId, title, body, type, data = {}) => {
  try {
    const employees = await Employee.find({ companyId, departmentId, status: "active" }).select("userId");
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error(`Error creating notifications for department ${departmentId}:`, err);
  }
};

const notifyReportingManagers = async (companyId, employeeIds, title, body, type, data = {}) => {
  try {
    if (!employeeIds || employeeIds.length === 0) return;
    
    // Find all assigned employees
    const employees = await Employee.find({
      $or: [
        { _id: { $in: employeeIds } },
        { userId: { $in: employeeIds } }
      ],
      companyId
    }).select("reportingManagerId");
    
    // Extract reporting manager IDs
    const managerEmpIds = [...new Set(employees.map(e => e.reportingManagerId).filter(Boolean))];
    if (managerEmpIds.length === 0) return;
    
    const managers = await Employee.find({ _id: { $in: managerEmpIds }, companyId }).select("userId");
    const userIds = managers.map(m => m.userId).filter(Boolean);
    
    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error("Error notifying reporting managers:", err);
  }
};

const notifyCompany = async (companyId, title, body, type, data = {}) => {
  try {
    const employees = await Employee.find({ companyId, status: "active" }).select("userId");
    const userIds = employees.map(emp => emp.userId).filter(Boolean);
    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error("Error creating notifications for company:", err);
  }
};

/**
 * Notify all supervisors of a task:
 * 1. CompanyAdmin / HR users for this company
 * 2. Reporting managers of the assigned employees
 * 3. Department managers
 */
const notifyTaskSupervisors = async (companyId, assignedEmployeeIds, departmentId, title, body, type, data = {}) => {
  try {
    const collectedUserIds = new Set();

    // 1. Notify CompanyAdmin & HR users
    const admins = await User.find({
      companyId,
      role: { $in: ["CompanyAdmin", "admin", "Admin", "hr", "HR", "company_admin"] },
      isActive: { $ne: false }
    }).select("_id");
    admins.forEach(a => collectedUserIds.add(a._id.toString()));

    if (assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      // 2. Notify Reporting Managers of assigned employees
      const assignedEmps = await Employee.find({
        $or: [
          { _id: { $in: assignedEmployeeIds } },
          { userId: { $in: assignedEmployeeIds } }
        ],
        companyId
      }).select("reportingManagerId departmentId");

      const reportingManagerEmpIds = [...new Set(assignedEmps.map(e => e.reportingManagerId).filter(Boolean).map(id => id.toString()))];

      if (reportingManagerEmpIds.length > 0) {
        const reportingManagers = await Employee.find({
          _id: { $in: reportingManagerEmpIds },
          companyId
        }).select("userId");
        reportingManagers.forEach(m => {
          if (m.userId) collectedUserIds.add((m.userId._id || m.userId).toString());
        });
      }

      // 3. Notify Department Managers
      const deptIds = [...new Set([
        ...(departmentId ? [departmentId.toString()] : []),
        ...assignedEmps.map(e => e.departmentId).filter(Boolean).map(id => id.toString())
      ])];

      if (deptIds.length > 0) {
        const deptManagers = await Employee.find({
          companyId,
          status: "active",
          $or: [
            { accessibleDepartments: { $in: deptIds } },
            { departmentId: { $in: deptIds }, managerAccessLevel: { $in: ["department", "full", "team"] } },
            { isManager: true, departmentId: { $in: deptIds } }
          ]
        }).select("userId");
        deptManagers.forEach(m => {
          if (m.userId) collectedUserIds.add((m.userId._id || m.userId).toString());
        });
      }
    } else if (departmentId) {
      const deptManagers = await Employee.find({
        companyId,
        status: "active",
        $or: [
          { accessibleDepartments: { $in: [departmentId] } },
          { departmentId: departmentId, managerAccessLevel: { $in: ["department", "full", "team"] } },
          { isManager: true, departmentId: departmentId }
        ]
      }).select("userId");
      deptManagers.forEach(m => {
        if (m.userId) collectedUserIds.add((m.userId._id || m.userId).toString());
      });
    }

    if (collectedUserIds.size === 0) return;
    await notifyManyUsers([...collectedUserIds], companyId, title, body, type, data);
  } catch (err) {
    console.error("Error notifying task supervisors:", err);
  }
};

const notifyTaskAll = async (companyId, assignedEmployeeIds, departmentId, title, body, type, data = {}) => {
  try {
    await Promise.all([
      sendNotificationToEmployees(companyId, assignedEmployeeIds, title, body, type, data),
      notifyTaskSupervisors(companyId, assignedEmployeeIds, departmentId, title, body, type, data)
    ]);
  } catch (err) {
    console.error("Error in notifyTaskAll helper:", err);
  }
};
const notifyDeptManagers = async (companyId, departmentId, title, body, type, data = {}) => {
  try {
    if (!departmentId) return;
    const deptManagers = await Employee.find({
      companyId,
      managerAccessLevel: "department",
      status: "active",
      $or: [
        { departmentId: departmentId },
        { departmentIds: departmentId },
        { accessibleDepartments: departmentId }
      ]
    }).populate("userId");

    const userIds = deptManagers
      .map(dm => dm.userId?._id || dm.userId)
      .filter(Boolean);

    await notifyManyUsers(userIds, companyId, title, body, type, data);
  } catch (err) {
    console.error("Error notifying department managers:", err);
  }
};

module.exports = {
  sendNotificationToEmployees,
  sendNotificationToAllEmployees,
  notifyUser,
  notifyManyUsers,
  notifyRole,
  notifyDepartment,
  notifyCompany,
  notifyReportingManagers,
  notifyDeptManagers,
  notifyTaskSupervisors,
  notifyTaskAll
};
