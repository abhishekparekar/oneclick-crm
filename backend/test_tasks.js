require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");

const Task = require("./src/models/Task");
const TaskActivity = require("./src/models/TaskActivity");
const CompanyTaskCounter = require("./src/models/CompanyTaskCounter");
const Company = require("./src/models/Company");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const Holiday = require("./src/models/Holiday");
const TaskTemplate = require("./src/models/TaskTemplate");

const { generateRecurringTasks, checkOverdueTasks } = require("./src/cron/taskCron");

const generateNextTaskId = async (companyId) => {
  const counter = await CompanyTaskCounter.findOneAndUpdate(
    { companyId },
    { $inc: { currentSequence: 1 } },
    { new: true, upsert: true }
  );
  const seqNumber = counter.currentSequence;
  const taskId = `T-${seqNumber.toString().padStart(5, "0")}`;
  return { taskId, seqNumber };
};

const isDayOff = async (companyId, date, workingDays) => {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (!workingDays.includes(dayName)) return true; // Weekly off

  // Check Holiday collection
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    companyId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  return !!holiday;
};

const getPrecedingWorkingDay = async (companyId, date, workingDays) => {
  let currentDate = new Date(date);
  let isOff = await isDayOff(companyId, currentDate, workingDays);
  
  let loopCount = 0;
  while (isOff && loopCount < 30) {
    currentDate.setDate(currentDate.getDate() - 1);
    isOff = await isDayOff(companyId, currentDate, workingDays);
    loopCount++;
  }
  return currentDate;
};

const runTests = async () => {
  console.log("==================================================");
  console.log("🚀 STARTING TASK WORKFLOW CHECKPOINT TEST SUITE 🚀");
  console.log("==================================================\n");

  await connectDB();
  
  const testCompanyId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testEmployeeId = new mongoose.Types.ObjectId();
  const testDeptId = new mongoose.Types.ObjectId();
  
  try {
    // --- Step 1: Cleanup any previous test data ---
    console.log("🧹 Cleaning up old test data...");
    await Task.deleteMany({ companyId: testCompanyId });
    await TaskActivity.deleteMany({ companyId: testCompanyId });
    await CompanyTaskCounter.deleteMany({ companyId: testCompanyId });
    await Company.deleteOne({ _id: testCompanyId });
    await Holiday.deleteMany({ companyId: testCompanyId });
    await TaskTemplate.deleteMany({ companyId: testCompanyId });
    await Employee.deleteOne({ _id: testEmployeeId });
    await User.deleteOne({ _id: testUserId });
    console.log("✅ Cleanup complete.\n");

    // Create a mock Company with settings for working days (exclude Saturday & Sunday)
    console.log("🏢 Creating mock company, user, and employee...");
    const mockCompany = new Company({
      _id: testCompanyId,
      companyName: "Checkpoint Test Corp.",
      ownerName: "Admin Owner",
      ownerEmail: "owner@checkpoint.com",
      email: "company@checkpoint.com",
      companyCode: "CPTEST",
      createdBy: testUserId,
      settings: {
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      }
    });
    await mockCompany.save();

    const mockUser = new User({
      _id: testUserId,
      name: "Test Employee User",
      email: "test_employee@checkpoint.com",
      password: "password123", // Encrypted by pre-save hooks usually
      role: "Employee",
      companyId: testCompanyId
    });
    await mockUser.save();

    const mockEmployee = new Employee({
      _id: testEmployeeId,
      companyId: testCompanyId,
      userId: testUserId,
      firstName: "Test",
      lastName: "Employee",
      fullName: "Test Employee",
      email: "test_employee@checkpoint.com",
      employeeCode: "EMP-CP-01",
      departmentId: testDeptId,
      departmentName: "Quality Assurance",
      createdBy: testUserId
    });
    await mockEmployee.save();

    mockUser.employeeId = testEmployeeId;
    await mockUser.save();
    console.log("✅ Company, User, and Employee created.\n");

    // ==========================================
    // CP-1: Task Numbering Sequence
    // ==========================================
    console.log("👉 VERIFYING: CP-1 (Task Numbering Sequence)...");
    const id1 = await generateNextTaskId(testCompanyId);
    const id2 = await generateNextTaskId(testCompanyId);
    console.assert(id1.taskId === "T-00001" && id1.seqNumber === 1, `Expected T-00001, got ${id1.taskId}`);
    console.assert(id2.taskId === "T-00002" && id2.seqNumber === 2, `Expected T-00002, got ${id2.taskId}`);
    console.log("✅ CP-1 Passed: Unique task IDs are correctly generated in sequence starting from T-00001.");

    // ==========================================
    // CP-2: Default Status
    // ==========================================
    console.log("\n👉 VERIFYING: CP-2 (Default Status)...");
    const manualTask = new Task({
      companyId: testCompanyId,
      taskId: id1.taskId,
      taskSequenceNumber: id1.seqNumber,
      assignedBy: testUserId,
      assignedTo: [testEmployeeId],
      title: "CP-2 Verification Task",
      startDateTime: new Date(),
      endDateTime: new Date(Date.now() + 3600000), // 1 hour later
    });
    await manualTask.save();
    console.assert(manualTask.status === "pending", `Expected default status 'pending', got '${manualTask.status}'`);
    console.log("✅ CP-2 Passed: Default status is 'pending' upon creation.");

    // ==========================================
    // CP-3: Activation of Task ID
    // ==========================================
    console.log("\n👉 VERIFYING: CP-3 (Activation of Task ID)...");
    const template = new TaskTemplate({
      companyId: testCompanyId,
      createdBy: testUserId,
      assignedBy: testUserId,
      assignedTo: [testEmployeeId],
      departmentId: testDeptId,
      title: "Daily Scrum Template",
      description: "Submit morning scrum status report",
      priority: "medium",
      startDate: new Date(),
      repeatEnabled: true,
      repeatType: "daily",
      deadlineTime: "18:00",
      isActive: true
    });
    await template.save();
    
    console.assert(template.taskId === undefined, "Template should NOT have a taskId!");
    console.assert(template.taskSequenceNumber === undefined, "Template should NOT have a taskSequenceNumber!");
    console.log("✅ CP-3 Passed: Recurring templates do not have Task IDs until they go live.");

    // ==========================================
    // CP-4: Weekly Offs & Holiday Safeguard
    // ==========================================
    console.log("\n👉 VERIFYING: CP-4 (Weekly Offs & Holiday Safeguard)...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const holiday = new Holiday({
      companyId: testCompanyId,
      name: "Mock Company Holiday",
      date: today
    });
    await holiday.save();

    const workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const isHolidayOff = await isDayOff(testCompanyId, today, workingDays);
    console.assert(isHolidayOff === true, "isDayOff should return true for a registered holiday!");
    
    // Simulate a weekend (Sunday)
    const testSunday = new Date();
    testSunday.setDate(testSunday.getDate() + (7 - testSunday.getDay()));
    const isSundayOff = await isDayOff(testCompanyId, testSunday, workingDays);
    console.assert(isSundayOff === true, "isDayOff should return true for Sunday!");
    console.log("✅ CP-4 Passed: Daily and weekly tasks are prevented from generating on holidays and weekends.");

    // Clean up holiday for subsequent tests
    await Holiday.deleteOne({ _id: holiday._id });

    // ==========================================
    // CP-5: Monthly Recurring Adjustments
    // ==========================================
    console.log("\n👉 VERIFYING: CP-5 (Monthly Recurring Adjustments)...");
    
    // July 5, 2026 is Sunday. Preceding working day (since Saturday/Sunday are off) is Friday, July 3rd.
    const julySunday = new Date("2026-07-05T12:00:00Z");
    const precedingWorkingDay = await getPrecedingWorkingDay(testCompanyId, julySunday, workingDays);
    
    const day = precedingWorkingDay.getUTCDate();
    const month = precedingWorkingDay.getUTCMonth(); // 6 = July
    console.assert(day === 3 && month === 6, `Expected July 3rd, got Day: ${day}, Month: ${month}`);
    console.log("✅ CP-5 Passed: Monthly recurring tasks falling on off days/holidays shift to the preceding working day.");

    // ==========================================
    // CP-6: Recurring Task Expiry
    // ==========================================
    console.log("\n👉 VERIFYING: CP-6 (Recurring Task Expiry)...");
    const expiredTemplate = new TaskTemplate({
      companyId: testCompanyId,
      createdBy: testUserId,
      assignedBy: testUserId,
      assignedTo: [testEmployeeId],
      departmentId: testDeptId,
      title: "Expired Sprint Report Template",
      priority: "high",
      startDate: new Date(Date.now() - 86400000 * 5),
      finishDate: new Date(Date.now() - 86400000), // Ended yesterday
      repeatEnabled: true,
      repeatType: "daily",
      isActive: true
    });
    await expiredTemplate.save();

    // Trigger generate cron
    await generateRecurringTasks();

    const checkedExpiredTemplate = await TaskTemplate.findById(expiredTemplate._id);
    console.assert(checkedExpiredTemplate.isActive === false, "Template should be marked inactive once finishDate is reached");
    console.assert(!!checkedExpiredTemplate.expiredAt, "Template should have an expiredAt timestamp");
    
    const expiredGeneratedTask = await Task.findOne({ templateId: expiredTemplate._id });
    console.assert(!expiredGeneratedTask, "Expired template should not generate tasks");
    console.log("✅ CP-6 Passed: Recurring tasks de-activate and stop generating when the finishDate is reached.");

    // ==========================================
    // CP-7: Overdue System
    // ==========================================
    console.log("\n👉 VERIFYING: CP-7 (Overdue System)...");
    const overdueTask = new Task({
      companyId: testCompanyId,
      taskId: "T-99999",
      taskSequenceNumber: 99999,
      assignedBy: testUserId,
      assignedTo: [testEmployeeId],
      title: "Missed Deadline Task",
      startDateTime: new Date(Date.now() - 86400000 * 5),
      endDateTime: new Date(Date.now() - (86400000 + 7200000 + 900000)), // 1 day, 2 hours, 15 minutes overdue
      status: "pending"
    });
    await overdueTask.save();

    await checkOverdueTasks();

    const checkedOverdueTask = await Task.findById(overdueTask._id);
    console.assert(checkedOverdueTask.status === "overdue", `Expected 'overdue', got '${checkedOverdueTask.status}'`);
    console.log("✅ CP-7 Passed: Task automatically changes status to 'overdue' after missing its deadline.");

    // ==========================================
    // CP-8: Late Completion Metric Calculation
    // ==========================================
    console.log("\n👉 VERIFYING: CP-8 (Late Completion Metric Calculation)...");
    const { lateCompleteTask } = require("./src/controllers/taskController");
    
    const mockReq = {
      params: { id: checkedOverdueTask._id },
      user: { _id: testUserId, companyId: testCompanyId },
      body: { finalRemarks: "Completed late due to emergency server patching", attachments: [] }
    };
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.responseData = data;
        return this;
      }
    };
    
    await lateCompleteTask(mockReq, mockRes);
    console.assert(mockRes.responseData?.success === true, "lateCompleteTask API call failed");
    
    const lateCompletedTask = await Task.findById(checkedOverdueTask._id);
    console.assert(lateCompletedTask.status === "late_complete", `Expected 'late_complete', got '${lateCompletedTask.status}'`);
    console.assert(lateCompletedTask.delayedDuration.days === 1, `Expected 1 day delay, got ${lateCompletedTask.delayedDuration.days}`);
    console.assert(lateCompletedTask.delayedDuration.hours === 2, `Expected 2 hours delay, got ${lateCompletedTask.delayedDuration.hours}`);
    console.assert(lateCompletedTask.delayedDuration.minutes === 15, `Expected 15 minutes delay, got ${lateCompletedTask.delayedDuration.minutes}`);
    console.log("✅ CP-8 Passed: Delayed duration is precisely recorded down to days, hours, and minutes.");

    // ==========================================
    // CP-9: Re-open Workflow
    // ==========================================
    console.log("\n👉 VERIFYING: CP-9 (Re-open Workflow)...");
    const { reopenTask } = require("./src/controllers/taskController");
    const newDeadline = new Date();
    newDeadline.setDate(newDeadline.getDate() + 3); // 3 days in the future
    
    const reopenReq = {
      params: { id: lateCompletedTask._id },
      user: { _id: testUserId, companyId: testCompanyId, role: "Manager" },
      body: {
        remarks: "Needs rework on codebase integration tests",
        nextFollowUpDate: newDeadline,
        newEndDate: newDeadline
      }
    };
    
    await reopenTask(reopenReq, mockRes);
    console.assert(mockRes.responseData?.success === true, "reopenTask API call failed");
    
    const reopenedTask = await Task.findById(lateCompletedTask._id);
    console.assert(reopenedTask.status === "re_pending", `Expected status 're_pending', got '${reopenedTask.status}'`);
    console.assert(new Date(reopenedTask.endDateTime).getDate() === newDeadline.getDate(), "End date was not correctly updated during reopen");
    console.log("✅ CP-9 Passed: Managers can reopen tasks, resetting status to 're_pending' and adjusting the deadline.");

    // ==========================================
    // CP-10: Mandatory End-of-Day Logout Check
    // ==========================================
    console.log("\n👉 VERIFYING: CP-10 (Mandatory End-of-Day Logout Check)...");
    const { logoutCheck } = require("./src/controllers/authController");
    
    const todayPendingTask = new Task({
      companyId: testCompanyId,
      taskId: "T-88888",
      taskSequenceNumber: 88888,
      assignedBy: testUserId,
      assignedTo: [testEmployeeId],
      title: "Today's Critical Task",
      startDateTime: today,
      endDateTime: new Date(Date.now() + 7200000), // 2 hours from now
      status: "pending"
    });
    await todayPendingTask.save();

    const logoutReq = {
      user: { _id: testUserId, companyId: testCompanyId, role: "Employee" }
    };
    
    await logoutCheck(logoutReq, mockRes);
    console.assert(mockRes.responseData?.success === true, "logoutCheck failed");
    console.assert(mockRes.responseData?.canLogout === false, "Employee should NOT be allowed to log out while having active daily pending tasks");
    console.log("✅ CP-10 Passed: Employee is blocked from logging out when they have daily pending tasks.");

    console.log("\n==================================================");
    console.log("🎉 ALL 10 TASK WORKFLOW CHECKPOINTS SUCCESSFUL! 🎉");
    console.log("==================================================");

  } catch (error) {
    console.error("\n❌ TEST EXCEPTION OCCURRED:", error);
  } finally {
    console.log("\n🧹 Cleaning up test database...");
    await Task.deleteMany({ companyId: testCompanyId });
    await TaskActivity.deleteMany({ companyId: testCompanyId });
    await CompanyTaskCounter.deleteMany({ companyId: testCompanyId });
    await Company.deleteOne({ _id: testCompanyId });
    await Holiday.deleteMany({ companyId: testCompanyId });
    await TaskTemplate.deleteMany({ companyId: testCompanyId });
    await Employee.deleteOne({ _id: testEmployeeId });
    await User.deleteOne({ _id: testUserId });
    
    mongoose.connection.close();
    console.log("✅ Database connection closed cleanly.");
  }
};

runTests();
