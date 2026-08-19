const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const Holiday = require("../models/Holiday");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Helper to resolve employee profile
const getEmployeeProfile = async (req) => {
  const userId = req.user._id;
  const companyId = req.companyId;

  let employee = null;
  if (req.user.employeeId) {
    employee = await Employee.findOne({ _id: req.user.employeeId, companyId });
  }
  if (!employee) {
    employee = await Employee.findOne({ userId, companyId });
  }
  if (!employee && req.user.email) {
    employee = await Employee.findOne({ email: new RegExp(`^${req.user.email}$`, "i"), companyId });
    if (employee && !employee.userId) {
      employee.userId = userId;
      await employee.save();
    }
  }
  return employee;
};

// POST /api/employee/leaves/apply
const applyLeave = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    let start = new Date(startDate);
    let end = new Date(endDate);
    
    // For half day, force start and end date to be the exact same day
    if (isHalfDay) {
      end = new Date(start);
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: "Start date must be before end date" });
    }

    // Calculate number of days
    const diffTime = Math.abs(end - start);
    const numberOfDays = isHalfDay ? 0.5 : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    let balance = await LeaveBalance.findOne({
      employeeId: employee._id,
      companyId: req.companyId,
    });

    if (!balance) {
      balance = await LeaveBalance.createWithDefaults(employee._id, req.companyId);
    }

    let finalLeaveType = leaveType;
    let balanceDeducted = false;

    // We only deduct if it's one of the standard paid types
    const paidTypes = ["casual", "sick", "annual"];
    const requestedTypeKey = leaveType.toLowerCase();
    
    if (paidTypes.includes(requestedTypeKey)) {
      const available = balance[requestedTypeKey] || 0;
      
      if (available >= numberOfDays) {
        // Sufficient balance -> auto-deduct
        balance[requestedTypeKey] -= numberOfDays;
        await balance.save();
        balanceDeducted = true;
      } else {
        // Insufficient balance -> auto-convert to Unpaid
        finalLeaveType = "Unpaid Leave";
        balanceDeducted = false;
      }
    } else {
      // If it's already Unpaid Leave or LOP
      finalLeaveType = leaveType === "LOP" ? "Unpaid Leave" : leaveType;
      balanceDeducted = false;
    }

    const newLeave = await Leave.create({
      companyId: req.companyId,
      employeeId: employee._id,
      leaveType: finalLeaveType,
      startDate: start,
      endDate: end,
      numberOfDays,
      isHalfDay: isHalfDay ? true : false,
      reason: reason.trim(),
      status: "pending",
      balanceDeducted,
    });

    // Notify HR, CompanyAdmin, Reporting Manager, and Department Managers
    try {
      const hrs = await User.find({ companyId: req.companyId, role: { $in: ["HR", "CompanyAdmin"] } });
      const notificationPromises = hrs.map(hr => 
        Notification.create({
          companyId: req.companyId,
          userId: hr._id,
          title: "New Leave Request",
          body: `${employee.firstName} ${employee.lastName} has applied for ${numberOfDays} days of ${leaveType} leave.`,
          type: "leave",
          data: { leaveId: newLeave._id.toString() },
        })
      );

      // Track users who already received the notification
      const notifiedUserIds = new Set(hrs.map(hr => hr._id.toString()));

      // Notify direct reporting manager
      if (employee.reportingManagerId) {
        const managerEmp = await Employee.findById(employee.reportingManagerId).populate("userId");
        if (managerEmp && managerEmp.userId) {
          const mUserId = managerEmp.userId._id || managerEmp.userId;
          if (!notifiedUserIds.has(mUserId.toString())) {
            notifiedUserIds.add(mUserId.toString());
            notificationPromises.push(Notification.create({
              companyId: req.companyId,
              userId: mUserId,
              title: "New Leave Request",
              body: `${employee.firstName} ${employee.lastName} has applied for ${numberOfDays} days of ${leaveType} leave.`,
              type: "leave",
              data: { leaveId: newLeave._id.toString() },
            }));
          }
        }
      }

      // Notify department managers
      if (employee.departmentId) {
        const deptManagers = await Employee.find({
          companyId: req.companyId,
          managerAccessLevel: "department",
          status: "active",
          $or: [
            { departmentId: employee.departmentId },
            { departmentIds: employee.departmentId },
            { accessibleDepartments: employee.departmentId }
          ]
        }).populate("userId");

        for (const dm of deptManagers) {
          if (dm.userId) {
            const dmUserId = dm.userId._id || dm.userId;
            if (!notifiedUserIds.has(dmUserId.toString())) {
              notifiedUserIds.add(dmUserId.toString());
              notificationPromises.push(Notification.create({
                companyId: req.companyId,
                userId: dmUserId,
                title: "New Leave Request",
                body: `${employee.firstName} ${employee.lastName} has applied for ${numberOfDays} days of ${leaveType} leave.`,
                type: "leave",
                data: { leaveId: newLeave._id.toString() },
              }));
            }
          }
        }
      }
      
      await Promise.all(notificationPromises);
    } catch (notifErr) {
      console.error("Error sending leave notifications:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      leave: newLeave,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/leaves/my
const getMyLeaves = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { status, leaveType } = req.query;
    const filter = {
      employeeId: employee._id,
      companyId: req.companyId,
    };

    if (status) {
      filter.status = status;
    }
    if (leaveType) {
      filter.leaveType = leaveType;
    }

    const leaves = await Leave.find(filter).sort({ startDate: -1 }).lean();

    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/leaves/:id
const getLeaveDetails = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      employeeId: employee._id,
      companyId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    res.json({ success: true, leave });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/employee/leaves/:id/cancel
const cancelLeave = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      employeeId: employee._id,
      companyId: req.companyId,
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending leave requests can be cancelled.",
      });
    }

    // Securely cancel or delete the record
    await leave.deleteOne();

    res.json({ success: true, message: "Leave application cancelled successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/leaves/balance
const getLeaveBalance = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.json({
        success: true,
        balance: { casual: 12, sick: 10, annual: 15, lop: 0 },
      });
    }

    let balance = null;
    try {
      balance = await LeaveBalance.findOne({
        employeeId: employee._id,
      }).lean();
    } catch (findErr) {
      console.warn("[getLeaveBalance] find error:", findErr.message);
    }

    if (!balance) {
      try {
        balance = await LeaveBalance.createWithDefaults(employee._id, req.companyId || employee.companyId);
      } catch (createErr) {
        console.warn("[getLeaveBalance] create defaults error:", createErr.message);
        balance = { casual: 12, sick: 10, annual: 15, lop: 0 };
      }
    }

    res.json({ success: true, balance });
  } catch (error) {
    console.error("[getLeaveBalance] Error:", error.message);
    res.json({
      success: true,
      balance: { casual: 12, sick: 10, annual: 15, lop: 0 },
    });
  }
};

// GET /api/employee/holidays
const getCompanyHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find({
      companyId: req.companyId,
    })
      .sort({ date: 1 })
      .lean();

    res.json({ success: true, count: holidays.length, holidays });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getLeaveDetails,
  cancelLeave,
  getLeaveBalance,
  getCompanyHolidays,
};
