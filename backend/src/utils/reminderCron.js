const cron = require("node-cron");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Company = require("../models/Company");
const { notifyUser, notifyRole } = require("./notificationHelper");
const calculateProfileCompletion = require("./calculateProfileCompletion");

// Helper to determine string format for date (YYYY-MM-DD)
// Helper to determine string format for date (YYYY-MM-DD) in Kolkata time
const getDateKey = (d = new Date()) => {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const initCronJobs = () => {
  console.log("Initializing cron jobs for reminders (Asia/Kolkata timezone)...");

  // 1. Daily Punch-in reminder at 9:00 AM
  cron.schedule("0 9 * * 1-5", async () => {
    try {
      const today = getDateKey();
      const companies = await Company.find({ status: "active" });

      for (const company of companies) {
        const employees = await Employee.find({ companyId: company._id, status: "active" });
        for (const emp of employees) {
          const attendance = await Attendance.findOne({ employeeId: emp._id, date: today });
          if (!attendance || !attendance.punchInTime) {
            // Remind to punch in
            await notifyUser(
              emp.userId,
              company._id,
              "Punch In Reminder",
              "Good morning! Don't forget to punch in for the day.",
              "attendance"
            );
          }
        }
      }
    } catch (err) {
      console.error("Cron Error (Punch-in reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 2. Daily Punch-out reminder at 6:00 PM
  cron.schedule("0 18 * * 1-5", async () => {
    try {
      const today = getDateKey();
      const attendances = await Attendance.find({ date: today, punchInTime: { $exists: true }, punchOutTime: { $exists: false } }).populate("employeeId");
      
      for (const att of attendances) {
        if (att.employeeId && att.employeeId.userId) {
          await notifyUser(
            att.employeeId.userId,
            att.companyId,
            "Punch Out Reminder",
            "Your shift is ending soon. Don't forget to punch out!",
            "attendance"
          );
        }
      }
    } catch (err) {
      console.error("Cron Error (Punch-out reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 3. Overdue tasks reminder at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    try {
      const now = new Date();
      const overdueTasks = await Task.find({ 
        dueDate: { $lt: now },
        status: { $nin: ["completed", "done", "cancelled"] }
      });

      for (const task of overdueTasks) {
        // Notify Assignees
        for (const assigneeId of task.assignees) {
          const emp = await Employee.findById(assigneeId);
          if (emp && emp.userId) {
            await notifyUser(
              emp.userId,
              task.companyId,
              "Task Overdue",
              `The task "${task.title}" is overdue. Please update its status.`,
              "task",
              { taskId: task._id.toString() }
            );
          }
        }
        
        // Notify Manager/Creator
        const creator = await Employee.findById(task.createdBy);
        if (creator && creator.userId) {
          await notifyUser(
            creator.userId,
            task.companyId,
            "Task Overdue",
            `A task you assigned ("${task.title}") is overdue.`,
            "task",
            { taskId: task._id.toString() }
          );
        }
      }
    } catch (err) {
      console.error("Cron Error (Overdue tasks):", err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 4. Profile completion reminder (Weekly on Monday at 10:00 AM)
  cron.schedule("0 10 * * 1", async () => {
    try {
      const employees = await Employee.find({ status: "active" }).populate("userId");
      
      for (const emp of employees) {
        const completion = calculateProfileCompletion(emp);
        if (completion < 100 && emp.userId) {
          await notifyUser(
            emp.userId._id,
            emp.companyId,
            "Complete Your Profile",
            `Your profile is only ${completion}% complete. Please update your details.`,
            "profile"
          );
        }
      }
    } catch (err) {
      console.error("Cron Error (Profile completion):", err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 5. Birthday Reminder at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      const kolkataDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const month = kolkataDate.getMonth() + 1; // 1-12
      const day = kolkataDate.getDate();

      const employees = await Employee.find({ status: "active" });

      for (const emp of employees) {
        if (emp.dateOfBirth) {
          const dob = new Date(emp.dateOfBirth);
          if (dob.getMonth() + 1 === month && dob.getDate() === day) {
            // Notify HR & Managers
            await notifyRole(
              emp.companyId,
              "HR",
              "Employee Birthday",
              `Today is ${emp.firstName} ${emp.lastName}'s birthday!`,
              "profile"
            );

            // Notify the employee
            if (emp.userId) {
              await notifyUser(
                emp.userId,
                emp.companyId,
                "Happy Birthday!",
                `Wishing you a very Happy Birthday from the team! 🎂`,
                "profile"
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Cron Error (Birthday reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });
};

module.exports = initCronJobs;
