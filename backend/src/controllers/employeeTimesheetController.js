const Employee = require("../models/Employee");
const Timesheet = require("../models/Timesheet");

// Resolve employee profile
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
  return employee;
};

// POST /api/employee/timesheet/manual
const createManualTimesheet = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { taskId, projectId, startTime, endTime, totalMinutes, description } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Start time and end time are required" });
    }

    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    let computedMinutes = totalMinutes;

    if (!computedMinutes) {
      const diffMs = parsedEnd - parsedStart;
      computedMinutes = Math.max(1, Math.round(diffMs / 60000));
    }

    const newTimesheet = await Timesheet.create({
      companyId: req.companyId,
      employeeId: employee._id,
      taskId: taskId || null,
      projectId: projectId || null,
      startTime: parsedStart,
      endTime: parsedEnd,
      totalMinutes: computedMinutes,
      description: description || "Manual log entry",
      isManual: true,
      timerActive: false
    });

    res.status(201).json({
      success: true,
      message: "Manual timesheet log created successfully",
      timesheet: newTimesheet
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/timesheet/daily
const getDailyTimesheet = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date parameter is required (YYYY-MM-DD)" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await Timesheet.find({
      employeeId: employee._id,
      companyId: req.companyId,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate({ path: "taskId", select: "title status priority" })
    .populate({ path: "projectId", select: "name status" })
    .sort({ startTime: -1 })
    .lean();

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/timesheet/weekly
const getWeeklyTimesheet = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { week } = req.query;
    if (!week) {
      return res.status(400).json({ success: false, message: "Week date is required (YYYY-MM-DD)" });
    }

    const pivotDate = new Date(week);
    const day = pivotDate.getDay();
    const diff = pivotDate.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(pivotDate.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const logs = await Timesheet.find({
      employeeId: employee._id,
      companyId: req.companyId,
      startTime: { $gte: startOfWeek, $lte: endOfWeek }
    })
    .populate({ path: "taskId", select: "title status" })
    .populate({ path: "projectId", select: "name" })
    .sort({ startTime: 1 })
    .lean();

    const hoursByProject = {};
    const hoursByTask = {};
    let totalMinutes = 0;

    logs.forEach(log => {
      const mins = log.totalMinutes || 0;
      totalMinutes += mins;

      const projId = log.projectId ? log.projectId._id.toString() : "general";
      const projName = log.projectId ? log.projectId.name : "General Operations";
      if (!hoursByProject[projId]) {
        hoursByProject[projId] = { projectId: projId, projectName: projName, totalMinutes: 0 };
      }
      hoursByProject[projId].totalMinutes += mins;

      const tId = log.taskId ? log.taskId._id.toString() : "general";
      const tTitle = log.taskId ? log.taskId.title : log.description || "General Task";
      if (!hoursByTask[tId]) {
        hoursByTask[tId] = { taskId: tId, taskTitle: tTitle, totalMinutes: 0 };
      }
      hoursByTask[tId].totalMinutes += mins;
    });

    const projectsSummary = Object.values(hoursByProject).map(p => ({
      ...p,
      totalHours: Number((p.totalMinutes / 60).toFixed(2))
    }));

    const tasksSummary = Object.values(hoursByTask).map(t => ({
      ...t,
      totalHours: Number((t.totalMinutes / 60).toFixed(2))
    }));

    res.json({
      success: true,
      startOfWeek,
      endOfWeek,
      totalWeeklyMinutes: totalMinutes,
      totalWeeklyHours: Number((totalMinutes / 60).toFixed(2)),
      projectsSummary,
      tasksSummary,
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createManualTimesheet,
  getDailyTimesheet,
  getWeeklyTimesheet
};
