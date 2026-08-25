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
      const { notifyTaskAll } = require("./notificationHelper");
      const overdueTasks = await Task.find({ 
        endDateTime: { $lt: now },
        status: { $in: ["pending", "re_pending", "in_process", "re_in_process", "overdue"] }
      });

      for (const task of overdueTasks) {
        await notifyTaskAll(
          task.companyId,
          task.assignedTo || [],
          task.departmentId || null,
          "🚨 Task Overdue Reminder",
          `The task "${task.title}" is overdue. Please complete it or submit a follow-up.`,
          "task",
          { taskId: task._id.toString() }
        ).catch(() => {});
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

  // 6. Lead Scheduled Follow-up Reminder (Runs every minute)
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const Lead = require("../models/Lead");
      const Employee = require("../models/Employee");
      // Find leads whose scheduled nextFollowUpDate is <= now and has not been notified yet
      const dueLeads = await Lead.find({
        nextFollowUpDate: { $lte: now, $ne: null },
        followUpNotified: { $ne: true },
        deletedAt: null,
      }).populate("assignedTo", "name email");

      for (const lead of dueLeads) {
        const contact = lead.phone || lead.whatsappPhone || "No phone";
        const timeStr = new Date(lead.nextFollowUpDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
        const dateStr = new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });

        const title = `⏰ Lead Follow-up Reminder: ${lead.name}`;
        const message = `Follow-up scheduled at ${timeStr}, ${dateStr} with client ${lead.name} (${contact}).`;

        // Resolve user ID (handling case where assignedTo might be an Employee or User ID)
        let rawTargetId = lead.assignedTo?._id || lead.assignedTo || lead.createdBy;
        let targetUserId = rawTargetId;
        let companyId = lead.companyId;

        if (rawTargetId) {
          const emp = await Employee.findById(rawTargetId).select("userId companyId");
          if (emp && emp.userId) {
            targetUserId = emp.userId;
            if (!companyId) companyId = emp.companyId;
          }
        }

        if (targetUserId && companyId) {
          await notifyUser(
            targetUserId,
            companyId,
            title,
            message,
            "lead_follow_up",
            { leadId: lead._id.toString(), leadName: lead.name }
          ).catch((e) => console.error("[Lead follow-up notify error]:", e));
        }

        // Mark as notified so notification isn't resent every minute
        lead.followUpNotified = true;
        await lead.save().catch(() => {});
      }
    } catch (err) {
      console.error("Cron Error (Lead follow-up reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });
};

module.exports = initCronJobs;
