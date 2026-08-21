const Employee = require("../models/Employee");
const Task = require("../models/Task");
const Timesheet = require("../models/Timesheet");
const { sendNotificationToEmployees, notifyUser } = require("../utils/notificationHelper");

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

// GET /api/employee/tasks
const getAssignedTasks = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { status, priority, dueDate, search } = req.query;
    const filter = { companyId: req.companyId, assignedTo: employee._id };

    if (status) {
      if (status === "todo" || status === "pending") {
        filter.status = { $in: ["todo", "pending", "open"] };
      } else if (status === "completed" || status === "done") {
        filter.status = { $in: ["completed", "complete", "done"] };
      } else if (status === "inProgress" || status === "in-progress") {
        filter.status = { $in: ["in-progress", "inProgress", "in_process"] };
      } else if (status === "inReview" || status === "review") {
        filter.status = { $in: ["review", "inReview"] };
      } else {
        filter.status = status;
      }
    } else {
      filter.status = { $ne: "cancelled" };
    }

    if (priority) {
      filter.priority = priority.toLowerCase();
    }

    if (dueDate) {
      const targetDate = new Date(dueDate);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { title: regex },
        { description: regex }
      ];
    }
    
    const isTemplate = req.query.isTemplate === 'true' || req.query.isTemplate === true;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    let tasks;
    let totalCount;

    if (isTemplate) {
      const TaskTemplate = require("../models/TaskTemplate");
      totalCount = await TaskTemplate.countDocuments(filter);
      tasks = await TaskTemplate.find(filter)
        .populate({ path: "projectId", select: "name description status" })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode departmentName departmentId departmentIds",
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

      tasks.forEach(t => {
        t.isTemplate = true;
        t.assignees = t.assignedTo || [];
      });
    } else {
      totalCount = await Task.countDocuments(filter);
      tasks = await Task.find(filter)
        .populate({ path: "projectId", select: "name description status" })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode departmentName departmentId departmentIds",
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

      // Ensure assignees compatibility under lean()
      tasks.forEach(t => {
        t.assignees = t.assignedTo || [];
      });
    }

    res.json({ 
      success: true, 
      count: tasks.length, 
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      tasks 
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/tasks/:id
const getTaskDetails = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    let task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    }).populate({ path: "projectId", select: "name description status startDate endDate" })
      .populate({ path: "departmentId", select: "name", strictPopulate: false })
      .populate({ path: "assignedBy", select: "name" })
      .populate({ 
        path: "assignedTo", 
        select: "firstName lastName fullName photo employeeCode departmentName departmentId departmentIds",
        populate: [
          { path: "departmentId", select: "name", strictPopulate: false },
          { path: "departmentIds", select: "name", strictPopulate: false }
        ]
      }).lean();

    let isTemplate = false;
    if (!task) {
      const TaskTemplate = require("../models/TaskTemplate");
      task = await TaskTemplate.findOne({
        _id: req.params.id,
        companyId: req.companyId,
        assignedTo: employee._id
      }).populate({ path: "projectId", select: "name description status startDate endDate" })
        .populate({ path: "departmentId", select: "name", strictPopulate: false })
        .populate({ path: "assignedBy", select: "name" })
        .populate({ 
          path: "assignedTo", 
          select: "firstName lastName fullName photo employeeCode departmentName departmentId departmentIds",
          populate: [
            { path: "departmentId", select: "name", strictPopulate: false },
            { path: "departmentIds", select: "name", strictPopulate: false }
          ]
        }).lean();
      
      if (task) isTemplate = true;
    }

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    if (isTemplate) {
      task.isTemplate = true;
      task.assignees = task.assignedTo || [];
      task.status = task.status || "pending";
    } else {
      task.assignees = task.assignedTo || [];
    }

    // Check if there is an active timer for this task
    const activeTimer = await Timesheet.findOne({
      employeeId: employee._id,
      taskId: task._id,
      timerActive: true
    }).lean();

    res.json({ success: true, task, activeTimer });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/employee/tasks/:id/status
const updateOwnTaskStatus = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    let task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });
    let isTemplate = false;
    if (!task) {
      const TaskTemplate = require("../models/TaskTemplate");
      task = await TaskTemplate.findOne({
        _id: req.params.id,
        companyId: req.companyId,
        assignedTo: employee._id
      });
      if (task) isTemplate = true;
    }

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    // Resolve dynamic task status
    const TaskStatus = require("../models/TaskStatus");
    let statusDoc = await TaskStatus.findOne({ companyId: req.companyId, statusKey: status });
    if (!statusDoc) {
      statusDoc = await TaskStatus.findOne({ companyId: req.companyId, _id: status }).catch(() => null);
    }
    if (!statusDoc) {
      const normalizedKey = String(status).toLowerCase().replace(/_/g, "-");
      statusDoc = await TaskStatus.findOne({
        companyId: req.companyId,
        $or: [
          { statusKey: new RegExp(`^${status}$`, "i") },
          { statusKey: normalizedKey },
          { label: new RegExp(`^${status}$`, "i") }
        ]
      }).catch(() => null);
    }
    if (!statusDoc) {
      statusDoc = {
        _id: null,
        statusKey: String(status).toLowerCase(),
        label: String(status).charAt(0).toUpperCase() + String(status).slice(1),
        color: "#10B981",
        order: 99
      };
    }

    const oldStatusLabel = task.statusLabelSnapshot || task.status;
    const newStatusLabel = statusDoc.label;

    // Handle Individual Progress Tracker
    let isCompletedGlobally = true;
    
    // Seed assigneeProgress if older task doesn't have it
    const assigneesList = Array.isArray(task.assignees) && task.assignees.length > 0
      ? task.assignees
      : (task.assignedTo ? [task.assignedTo] : [employee._id]);

    if (!Array.isArray(task.assigneeProgress) || task.assigneeProgress.length === 0) {
      task.assigneeProgress = assigneesList.map(empId => ({
        employeeId: empId,
        statusKey: "pending",
        statusLabelSnapshot: "Pending",
        updatedAt: new Date()
      }));
    }

    // Update this specific employee's progress
    const empProgressIndex = task.assigneeProgress.findIndex(p => p.employeeId?.toString() === employee._id.toString());
    if (empProgressIndex > -1) {
      task.assigneeProgress[empProgressIndex].statusKey = statusDoc.statusKey;
      task.assigneeProgress[empProgressIndex].statusLabelSnapshot = statusDoc.label;
      task.assigneeProgress[empProgressIndex].updatedAt = new Date();
    } else {
      task.assigneeProgress.push({
        employeeId: employee._id,
        statusKey: statusDoc.statusKey,
        statusLabelSnapshot: statusDoc.label,
        updatedAt: new Date()
      });
    }

    // Check global completion criteria
    const COMPLETED_KEYS = ["completed", "complete", "done", "finished", "late_complete", "late_completed"];
    task.assigneeProgress.forEach(p => {
      if (!COMPLETED_KEYS.includes(String(p.statusKey || "").toLowerCase())) {
        isCompletedGlobally = false;
      }
    });

    // Determine what happens to global status
    if (assigneesList.length === 1 || isCompletedGlobally) {
      task.status = statusDoc.statusKey;
      if (statusDoc._id) task.statusId = statusDoc._id;
      task.statusKey = statusDoc.statusKey;
      task.statusLabelSnapshot = statusDoc.label;
      task.statusColorSnapshot = statusDoc.color;
      task.statusOrderSnapshot = statusDoc.order;
    } else {
      if (task.statusKey === 'pending' || task.statusKey === 'todo') {
        task.status = "in-progress";
        task.statusKey = "in-progress";
        task.statusLabelSnapshot = "In Progress";
      }
    }

    // Handle remarks and attachments if passed from complete modal
    const { remark, attachments: passedAttachments } = req.body;
    if (Array.isArray(passedAttachments) && passedAttachments.length > 0) {
      task.attachments = task.attachments || [];
      passedAttachments.forEach(att => {
        task.attachments.push({
          fileName: att.fileName || "attachment",
          fileUrl: att.fileUrl || att.url,
          fileType: att.fileType || "application/octet-stream",
          uploadedAt: new Date(),
          uploadedBy: employee._id
        });
      });
    }

    const userName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
    task.activityLog = task.activityLog || [];
    task.activityLog.push({
      action: "Status updated",
      performedBy: userName,
      oldStatus: oldStatusLabel,
      newStatus: newStatusLabel,
      remark: remark || undefined,
      timestamp: new Date()
    });

    await task.save();

    // Auto calculate project progress
    if (task.projectId) {
      const Project = require("../models/Project");
      const allTasks = await Task.find({ projectId: task.projectId });
      const completedTasks = allTasks.filter(t => t.statusKey === "completed" || t.statusKey === "done" || t.statusKey === "finished" || t.status === "done" || t.status === "completed").length;
      const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
      await Project.findByIdAndUpdate(task.projectId, { progress }).catch(() => null);
    }

    // Notify the employee's reporting manager
    if (employee.reportingManagerId) {
      const manager = await Employee.findById(employee.reportingManagerId).select("userId");
      if (manager && manager.userId) {
        await notifyUser(
          manager.userId,
          req.companyId,
          "Task Status Updated",
          `${employee.firstName || "Employee"} updated the status of "${task.title}" to ${newStatusLabel}`,
          "task",
          { taskId: task._id.toString() }
        ).catch(() => null);
      }
    }

    res.json({ success: true, message: "Status updated successfully", task });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks/:id/comments
const addTaskComment = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    const { comment, attachments } = req.body;
    if ((!comment || !String(comment).trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, message: "Comment content or media attachment is required" });
    }

    const userName = `${employee.firstName} ${employee.lastName}`;
    const userRole = req.user.role || "Employee";

    task.comments.push({
      comment: comment ? comment.trim() : "",
      senderName: userName,
      senderRole: userRole,
      attachments: attachments || [],
    });

    task.activityLog.push({
      action: `Added a comment: "${comment.trim().length > 30 ? comment.trim().substring(0, 30) + '...' : comment.trim()}"`,
      performedBy: userName,
    });

    if (task.statusKey === "pending" || task.statusKey === "todo" || task.status === "pending" || task.status === "todo") {
      task.status = "in-progress";
      task.statusKey = "in-progress";
      task.statusLabelSnapshot = "In Progress";
      task.statusColorSnapshot = "#3b82f6";
      
      task.activityLog.push({
        action: `Status auto-changed to 'In Progress' upon adding a comment`,
        performedBy: userName,
      });
      
      if (!task.assigneeProgress || task.assigneeProgress.length === 0) {
        task.assigneeProgress = task.assignees.map(empId => ({
          employeeId: empId,
          statusKey: "pending",
          statusLabelSnapshot: "Pending",
          updatedAt: new Date()
        }));
      }
      const empProgressIndex = task.assigneeProgress.findIndex(p => p.employeeId?.toString() === employee._id.toString());
      if (empProgressIndex > -1) {
        task.assigneeProgress[empProgressIndex].statusKey = "in-progress";
        task.assigneeProgress[empProgressIndex].statusLabelSnapshot = "In Progress";
        task.assigneeProgress[empProgressIndex].updatedAt = new Date();
      }
    }

    await task.save();

    // Notify assignees
    const otherAssignees = task.assignees.filter(id => id.toString() !== employee._id.toString());
    if (otherAssignees.length > 0) {
      await sendNotificationToEmployees(
        req.companyId,
        otherAssignees,
        "New Task Comment",
        `${employee.firstName} commented on task: ${task.title}`,
        "task",
        { taskId: task._id.toString() }
      );
    }

    // Also notify manager
    if (employee.reportingManagerId) {
      const manager = await Employee.findById(employee.reportingManagerId).select("userId");
      if (manager && manager.userId) {
        await notifyUser(
          manager.userId,
          req.companyId,
          "New Task Comment",
          `${employee.firstName} commented on task: ${task.title}`,
          "task",
          { taskId: task._id.toString() }
        );
      }
    }

    res.json({ success: true, message: "Comment added successfully", task });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks/:id/checklist
const updateTaskChecklist = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    const { subtaskId, completed, itemIndex } = req.body;

    let subtask = null;
    if (subtaskId) {
      subtask = task.subtasks.id(subtaskId);
    } else if (itemIndex !== undefined && itemIndex >= 0 && itemIndex < task.subtasks.length) {
      subtask = task.subtasks[itemIndex];
    }

    if (!subtask) {
      return res.status(404).json({ success: false, message: "Checklist item not found" });
    }

    subtask.completed = completed !== undefined ? completed : !subtask.completed;

    const userName = `${employee.firstName} ${employee.lastName}`;
    task.activityLog.push({
      action: `Checklist item "${subtask.title}" marked as ${subtask.completed ? "completed" : "incomplete"}`,
      performedBy: userName,
    });

    await task.save();

    res.json({ success: true, message: "Checklist item updated successfully", task });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks/:id/time/start
const startTaskTimer = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    // Check if there is an active timer already
    const activeTimesheet = await Timesheet.findOne({
      employeeId: employee._id,
      timerActive: true
    });

    if (activeTimesheet) {
      return res.status(400).json({
        success: false,
        message: "You already have an active timer. Please stop it before starting a new one.",
        activeTimesheet
      });
    }

    // Start a new timesheet log entry
    const newLog = await Timesheet.create({
      companyId: req.companyId,
      employeeId: employee._id,
      taskId: task._id,
      projectId: task.projectId,
      startTime: new Date(),
      timerActive: true,
      description: `Active tracking for task: ${task.title}`
    });

    // Update task status to "in-progress" if it's currently "todo"
    if (task.status === "todo") {
      task.status = "in-progress";
      task.activityLog.push({
        action: `Status auto-changed to 'in-progress' on timer start`,
        performedBy: `${employee.firstName} ${employee.lastName}`,
      });
      await task.save();
    }

    res.status(201).json({
      success: true,
      message: "Timer started successfully",
      timesheet: newLog
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks/:id/time/stop
const stopTaskTimer = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    // Find the active timer for this task and employee
    const activeTimesheet = await Timesheet.findOne({
      employeeId: employee._id,
      taskId: task._id,
      timerActive: true
    });

    if (!activeTimesheet) {
      return res.status(404).json({
        success: false,
        message: "No active timer found for this task"
      });
    }

    const { description } = req.body;
    const endTime = new Date();
    const startTime = new Date(activeTimesheet.startTime);
    const diffMs = endTime - startTime;
    const totalMinutes = Math.max(1, Math.round(diffMs / 60000)); // Round to nearest minute, minimum 1 min

    activeTimesheet.endTime = endTime;
    activeTimesheet.totalMinutes = totalMinutes;
    activeTimesheet.timerActive = false;
    if (description) {
      activeTimesheet.description = description;
    }

    await activeTimesheet.save();

    // Log to task activity
    task.activityLog.push({
      action: `Logged ${totalMinutes} minutes via stopwatch timer`,
      performedBy: `${employee.firstName} ${employee.lastName}`,
    });
    await task.save();

    res.json({
      success: true,
      message: "Timer stopped and work logged successfully",
      timesheet: activeTimesheet
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks
const createTask = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { title, description, priority, dueDate, projectId, dependsOn, estimatedHours, attachments } = req.body;

    const task = new Task({
      companyId: req.companyId,
      title,
      description,
      priority: priority || "medium",
      assignmentType: "self",
      assignedTo: [employee._id],
      dueDate: dueDate || null,
      projectId: projectId || null,
      dependsOn: dependsOn || [],
      estimatedHours: estimatedHours || 0,
      attachments: attachments || [],
      activityLog: [{ action: "Task self-created", performedBy: `${employee.firstName} ${employee.lastName}` }]
    });

    await task.save();

    // Notify assignee
    await sendNotificationToEmployees(
      req.companyId,
      [employee._id],
      "New Task Assigned",
      `You have created a new task: ${title}`,
      "task",
      { taskId: task._id.toString() }
    );

    // Socket Emit
    try {
      const io = require("../../socket").getIO();
      io.emit(`taskCreated_${req.companyId}`, { task });
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.status(201).json({ success: true, message: "Task created successfully", data: task });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/tasks/:id/attachments
const uploadTaskAttachment = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { uploadFileToFirebase } = require("../services/firebaseService");
    const fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "task-attachments");
    
    const newAttachment = {
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    };

    task.attachments.push(newAttachment);

    const userName = `${employee.firstName} ${employee.lastName}`;
    task.activityLog.push({
      action: `Uploaded attachment: ${req.file.originalname}`,
      performedBy: userName,
    });

    if (task.statusKey === "pending" || task.statusKey === "todo" || task.status === "pending" || task.status === "todo") {
      task.status = "in-progress";
      task.statusKey = "in-progress";
      task.statusLabelSnapshot = "In Progress";
      task.statusColorSnapshot = "#3b82f6";
      
      task.activityLog.push({
        action: `Status auto-changed to 'In Progress' upon uploading an attachment`,
        performedBy: userName,
      });
      
      if (!task.assigneeProgress || task.assigneeProgress.length === 0) {
        task.assigneeProgress = task.assignees.map(empId => ({
          employeeId: empId,
          statusKey: "pending",
          statusLabelSnapshot: "Pending",
          updatedAt: new Date()
        }));
      }
      const empProgressIndex = task.assigneeProgress.findIndex(p => p.employeeId?.toString() === employee._id.toString());
      if (empProgressIndex > -1) {
        task.assigneeProgress[empProgressIndex].statusKey = "in-progress";
        task.assigneeProgress[empProgressIndex].statusLabelSnapshot = "In Progress";
        task.assigneeProgress[empProgressIndex].updatedAt = new Date();
      }
    }

    await task.save();

    res.json({ success: true, message: "Attachment uploaded successfully", task, attachment: newAttachment });
  } catch (error) {
    next(error);
  }
};

const deleteTaskAttachment = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.companyId,
      assignedTo: employee._id
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });
    }

    const attachmentId = req.params.attachmentId;
    const attachmentIndex = task.attachments.findIndex(a => a._id.toString() === attachmentId);

    if (attachmentIndex === -1) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    const removedFileName = task.attachments[attachmentIndex].fileName;
    task.attachments.splice(attachmentIndex, 1);

    const userName = `${employee.firstName} ${employee.lastName}`;
    task.activityLog.push({
      action: `Deleted attachment: ${removedFileName}`,
      performedBy: userName,
    });

    await task.save();

    res.json({ success: true, message: "Attachment deleted successfully", task });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedTasks,
  getTaskDetails,
  updateOwnTaskStatus,
  addTaskComment,
  updateTaskChecklist,
  startTaskTimer,
  stopTaskTimer,
  createTask,
  uploadTaskAttachment,
  deleteTaskAttachment
};
