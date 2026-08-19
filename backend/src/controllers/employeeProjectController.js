const Employee = require("../models/Employee");
const Project = require("../models/Project");
const Task = require("../models/Task");

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

// GET /api/employee/projects
const getEmployeeProjects = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const employeeId = employee._id;

    // Find all tasks assigned to the employee to see which project IDs they belong to
    const myTasks = await Task.find({ assignedTo: employeeId }).select("projectId").lean();
    const projectIdsFromTasks = myTasks.map(t => t.projectId).filter(Boolean);

    // Secure Filter: Only projects where employee is a member OR has assigned tasks
    const baseSecurityFilter = {
      companyId: req.companyId,
      $or: [
        { members: employeeId },
        { _id: { $in: projectIdsFromTasks } }
      ]
    };

    const filter = {
      $and: [baseSecurityFilter]
    };

    const { status, search } = req.query;

    if (status) {
      let dbStatus = status;
      if (status === "inProgress") dbStatus = "in-progress";
      if (status === "onHold") dbStatus = "on-hold";
      filter.$and.push({ status: dbStatus });
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$and.push({
        $or: [
          { name: regex },
          { description: regex }
        ]
      });
    }

    const projectsList = await Project.find(filter)
      .populate({ path: "members", select: "firstName lastName email photo" })
      .sort({ createdAt: -1 })
      .lean();

    // Enriched list with progress & overdue values
    const enrichedProjects = await Promise.all(
      projectsList.map(async (project) => {
        if (project.status === "completed") {
          return { ...project, progress: 100, isOverdue: false };
        }
        
        const totalTasks = await Task.countDocuments({ companyId: req.companyId, projectId: project._id });
        const completedTasks = await Task.countDocuments({ 
          companyId: req.companyId, 
          projectId: project._id, 
          status: { $in: ["completed", "complete", "done"] } 
        });
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== "completed";

        return {
          ...project,
          progress,
          isOverdue
        };
      })
    );

    res.json({ success: true, count: enrichedProjects.length, projects: enrichedProjects });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/projects/:id
const getEmployeeProjectDetails = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const employeeId = employee._id;
    const projectId = req.params.id;

    const myTasks = await Task.find({ assignedTo: employeeId }).select("projectId").lean();
    const projectIdsFromTasks = myTasks.map(t => t.projectId).filter(Boolean);

    // Verify assignment security boundary
    const project = await Project.findOne({
      _id: projectId,
      companyId: req.companyId,
      $or: [
        { members: employeeId },
        { _id: { $in: projectIdsFromTasks } }
      ]
    }).populate({ path: "members", select: "firstName lastName email photo phone status" });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or not assigned to you" });
    }

    // Calculate completions
    const totalTasks = await Task.countDocuments({ companyId: req.companyId, projectId: project._id });
    const completedTasks = await Task.countDocuments({ 
      companyId: req.companyId, 
      projectId: project._id, 
      status: { $in: ["completed", "complete", "done"] } 
    });

    if (project.status === "completed") {
      project.progress = 100;
    } else {
      project.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }
    const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== "completed";

    res.json({
      success: true,
      project: {
        ...project.toObject(),
        progress: project.progress,
        isOverdue,
        totalTasks,
        completedTasks
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/projects/:id/tasks
const getEmployeeProjectTasks = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const employeeId = employee._id;
    const projectId = req.params.id;

    // Verify project belongs to employee
    const myTasks = await Task.find({ assignedTo: employeeId }).select("projectId").lean();
    const projectIdsFromTasks = myTasks.map(t => t.projectId).filter(Boolean);

    const projectExists = await Project.findOne({
      _id: projectId,
      companyId: req.companyId,
      $or: [
        { members: employeeId },
        { _id: { $in: projectIdsFromTasks } }
      ]
    });

    if (!projectExists) {
      return res.status(404).json({ success: false, message: "Project not found or not assigned to you" });
    }

    // Fetch ONLY the employee's assigned tasks inside this project
    const tasks = await Task.find({
      companyId: req.companyId,
      projectId: projectId,
      assignedTo: employeeId
    })
    .populate({ path: "departmentId", select: "name", strictPopulate: false })
    .sort({ dueDate: 1 })
    .lean();

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

// GET /api/employee/projects/:id/activity
const getEmployeeProjectActivity = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const employeeId = employee._id;
    const projectId = req.params.id;

    const myTasks = await Task.find({ assignedTo: employeeId }).select("projectId").lean();
    const projectIdsFromTasks = myTasks.map(t => t.projectId).filter(Boolean);

    const project = await Project.findOne({
      _id: projectId,
      companyId: req.companyId,
      $or: [
        { members: employeeId },
        { _id: { $in: projectIdsFromTasks } }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or not assigned to you" });
    }

    res.json({ success: true, activityLog: project.activityLog || [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeProjects,
  getEmployeeProjectDetails,
  getEmployeeProjectTasks,
  getEmployeeProjectActivity
};
