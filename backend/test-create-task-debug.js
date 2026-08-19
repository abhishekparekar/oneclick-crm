const mongoose = require("mongoose");
require("dotenv").config();

const Task = require("./src/models/Task");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const Company = require("./src/models/Company");
const { validateTaskSchedule } = require("./src/utils/taskScheduleUtils");
const { checkUserPermission } = require("./src/utils/permissionCheck");

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully to DB!");

    // Let's find any user
    const user = await User.findOne({});
    if (!user) {
      console.log("No user found!");
      return;
    }
    console.log("Found User:", user.email, "ID:", user._id, "Role:", user.role, "CompanyId:", user.companyId);

    // Let's find an employee to assign the task to
    const employee = await Employee.findOne({ companyId: user.companyId });
    if (!employee) {
      console.log("No employee found for company:", user.companyId);
    } else {
      console.log("Found Employee:", employee.firstName, employee.lastName, "ID:", employee._id);
    }

    const payload = {
      title: "Test Task",
      description: "Test task description",
      departmentId: employee ? employee.departmentId : null,
      assignedTo: employee ? [employee._id] : [],
      startDate: "2026-07-21",
      endDate: "2026-07-23",
      deadlineTime: "18:00",
      repeatEnabled: false,
      priority: "medium"
    };

    console.log("\nSimulating permission check...");
    const isAllowed = await checkUserPermission(user._id, user.companyId, user.role, "tasks", "create");
    console.log("Permission check result:", isAllowed);

    console.log("\nSimulating schedule check with payload:", payload);
    const scheduleCheck = await validateTaskSchedule(user.companyId, {
      startDate: payload.startDate,
      endDate: payload.endDate,
      assignedTo: payload.assignedTo,
    });
    console.log("Schedule check result:", scheduleCheck);

    if (!scheduleCheck.valid) {
      console.log("Schedule is invalid. Errors:", scheduleCheck.errors);
      return;
    }

    console.log("\nGenerating mock task sequence...");
    const CompanyTaskCounter = require("./src/models/CompanyTaskCounter");
    let counter = await CompanyTaskCounter.findOne({ companyId: user.companyId });
    if (!counter) {
      counter = new CompanyTaskCounter({ companyId: user.companyId, currentSequence: 0 });
    }
    console.log("Current sequence count:", counter.currentSequence);

    console.log("\nCreating new Task document...");
    const startDt = new Date(payload.startDate);
    const endDt = new Date(payload.endDate);
    if (payload.deadlineTime) {
      const [hours, mins] = payload.deadlineTime.split(":");
      endDt.setHours(parseInt(hours), parseInt(mins), 0, 0);
    }

    const newTask = new Task({
      companyId: user.companyId,
      taskId: `T-${counter.currentSequence + 1}`,
      taskSequenceNumber: counter.currentSequence + 1,
      assignedBy: user._id,
      assignedTo: payload.assignedTo,
      assignmentType: "employee",
      departmentId: payload.departmentId || undefined,
      title: payload.title,
      description: payload.description,
      priority: payload.priority || "medium",
      startDateTime: startDt,
      endDateTime: endDt,
      nextFollowUpDate: startDt,
      status: "pending",
      isLive: true,
      liveAt: new Date(),
    });

    console.log("Validating newTask before saving...");
    await newTask.validate();
    console.log("NewTask validation passed!");

  } catch (error) {
    console.error("DEBUG ERROR ENCOUNTERED:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
};

run();
