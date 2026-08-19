const Employee = require("../models/Employee");
const Notification = require("../models/Notification");

const sendNotificationToEmployees = async (companyId, employeeIds, title, body, type, data = {}) => {
  try {
    if (!employeeIds || employeeIds.length === 0) return;
    
    const employees = await Employee.find({ _id: { $in: employeeIds }, companyId }).populate("userId");
    const notifications = [];
    
    for (const emp of employees) {
      if (emp.userId) {
        notifications.push(
          Notification.create({
            companyId,
            userId: emp.userId._id || emp.userId,
            title,
            body,
            type,
            data
          })
        );
      }
    }
    await Promise.all(notifications);
  } catch (err) {
    console.error("Error creating notifications for employees:", err);
  }
};

const sendNotificationToAllEmployees = async (companyId, title, body, type, data = {}) => {
  try {
    const employees = await Employee.find({ companyId, status: "active" }).populate("userId");
    const notifications = [];
    
    for (const emp of employees) {
      if (emp.userId) {
        notifications.push(
          Notification.create({
            companyId,
            userId: emp.userId._id || emp.userId,
            title,
            body,
            type,
            data
          })
        );
      }
    }
    await Promise.all(notifications);
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
    // Use Promise.all + Notification.create (NOT insertMany!) so the post('save') hook
    // fires for each document, which triggers Firebase FCM push notifications.
    await Promise.all(
      userIds.map((id) =>
        Notification.create({
          companyId,
          userId: id._id || id,
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
    const User = require("../models/User");
    const users = await User.find({ companyId, role, isActive: true }).select("_id");
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
    const Employee = require("../models/Employee");
    
    // Find all assigned employees
    const employees = await Employee.find({ _id: { $in: employeeIds }, companyId });
    
    // Extract reporting manager IDs (which are Employee IDs)
    const managerEmpIds = [...new Set(employees.map(e => e.reportingManagerId).filter(Boolean))];
    
    if (managerEmpIds.length === 0) return;
    
    // Find those managers to get their userIds
    const managers = await Employee.find({ _id: { $in: managerEmpIds }, companyId }).populate("userId");
    const userIds = managers.map(m => m.userId?._id || m.userId).filter(Boolean);
    
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
 * 1. CompanyAdmin users for this company
 * 2. Reporting managers of the assigned employees
 * 3. Department managers (employees with accessibleDepartments containing the task's departmentId)
 *
 * Automatically deduplicates so no user gets double-notified.
 *
 * @param {ObjectId} companyId
 * @param {ObjectId[]} assignedEmployeeIds - Array of Employee._id of assigned employees
 * @param {ObjectId|null} departmentId - The task's departmentId (if any)
 * @param {string} title
 * @param {string} body
 * @param {string} type
 * @param {object} data
 */
const notifyTaskSupervisors = async (companyId, assignedEmployeeIds, departmentId, title, body, type, data = {}) => {
  try {
    const User = require("../models/User");
    const collectedUserIds = new Set();

    // 1. Notify CompanyAdmin users
    const admins = await User.find({ companyId, role: "CompanyAdmin", isActive: true }).select("_id");
    admins.forEach(a => collectedUserIds.add(a._id.toString()));

    if (assignedEmployeeIds && assignedEmployeeIds.length > 0) {
      // 2. Notify Reporting Managers of assigned employees
      const assignedEmps = await Employee.find({ _id: { $in: assignedEmployeeIds }, companyId });
      const reportingManagerEmpIds = [...new Set(assignedEmps.map(e => e.reportingManagerId).filter(Boolean).map(id => id.toString()))];

      if (reportingManagerEmpIds.length > 0) {
        const reportingManagers = await Employee.find({ _id: { $in: reportingManagerEmpIds }, companyId }).populate("userId");
        reportingManagers.forEach(m => {
          const uid = m.userId?._id || m.userId;
          if (uid) collectedUserIds.add(uid.toString());
        });
      }

      // 3. Notify Department Managers (accessibleDepartments covers the task's dept or assigned employees' depts)
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
            { departmentId: { $in: deptIds }, managerAccessLevel: "department" }
          ]
        }).populate("userId");
        deptManagers.forEach(m => {
          const uid = m.userId?._id || m.userId;
          if (uid) collectedUserIds.add(uid.toString());
        });
      }
    }

    if (collectedUserIds.size === 0) return;
    await notifyManyUsers([...collectedUserIds], companyId, title, body, type, data);
  } catch (err) {
    console.error("Error notifying task supervisors:", err);
  }
};

const notifyTaskAll = async (companyId, assignedEmployeeIds, departmentId, title, body, type, data = {}) => {
  try {
    await sendNotificationToEmployees(companyId, assignedEmployeeIds, title, body, type, data);
    await notifyTaskSupervisors(companyId, assignedEmployeeIds, departmentId, title, body, type, data);
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
