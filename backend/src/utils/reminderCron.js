const cron = require("node-cron");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Company = require("../models/Company");
const { notifyUser, notifyRole, notifyManyUsers, notifyTaskAll, resolveToUserIds } = require("./notificationHelper");
const { formatISTDateTime } = require("./dateParser");
const calculateProfileCompletion = require("./calculateProfileCompletion");

// Helper to determine string format for date (YYYY-MM-DD)
// Helper to determine string format for date (YYYY-MM-DD) in Kolkata time
const getDateKey = (d = new Date()) => {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const initCronJobs = () => {
  console.log("Initializing cron jobs for reminders (Asia/Kolkata timezone)...");

  // 1. Daily Punch-in reminder at 9:00 AM (Disabled: Keeping only Pre-shift 1-hour reminder)
  /*
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
  */

  // 2. Daily Punch-out reminder at 6:00 PM (Disabled: Keeping only Pre-shift 1-hour reminder)
  /*
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
  */

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
      // Find leads whose scheduled nextFollowUpDate is <= now and has not been notified yet (strict companyId isolation)
      const dueLeads = await Lead.find({
        companyId: { $ne: null },
        nextFollowUpDate: { $lte: now, $ne: null },
        followUpNotified: { $ne: true },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      })
        .populate("assignedTo", "name email role")
        .populate("assignedToUsers", "name email role");

      for (const lead of dueLeads) {
        const contact = lead.phone || lead.whatsappPhone || "No phone";
        const { timeStr, dateStr } = formatISTDateTime(lead.nextFollowUpDate);

        const title = `⏰ Lead Follow-up Reminder: ${lead.name}`;
        const message = `Follow-up scheduled at ${timeStr}, ${dateStr} with client ${lead.name} (${contact}).`;

        const companyId = lead.companyId?._id ? lead.companyId._id.toString() : (lead.companyId?.toString() || null);
        const candidateIds = [
          lead.assignedTo?._id || lead.assignedTo,
          ...(Array.isArray(lead.assignedToUsers) ? lead.assignedToUsers.map((u) => u?._id || u) : []),
          lead.createdBy?._id || lead.createdBy,
        ].filter(Boolean);

        let targetUserIds = await resolveToUserIds(candidateIds, companyId);

        // Fallback: If no assigned staff resolved, notify company admin(s) so notification is never lost
        if ((!targetUserIds || targetUserIds.length === 0) && companyId) {
          const User = require("../models/User");
          const companyAdmins = await User.find({
            $or: [{ companyId }, { _id: companyId }],
            role: { $regex: /^(companyadmin|company_admin|admin|hr)$/i },
            isActive: { $ne: false },
          }).select("_id").lean();
          targetUserIds = companyAdmins.map((a) => a._id.toString());
        }

        if (targetUserIds && targetUserIds.length > 0 && companyId) {
          const timeEpoch = new Date(lead.nextFollowUpDate).getTime();
          await notifyManyUsers(
            targetUserIds,
            companyId,
            title,
            message,
            "lead_follow_up",
            { leadId: lead._id.toString(), leadName: lead.name, nextFollowUpDate: lead.nextFollowUpDate },
            `lead_followup_${lead._id.toString()}_${timeEpoch}`
          ).catch((e) => console.error("[Lead follow-up notify error]:", e));
        }

        // Mark as notified so notification isn't resent
        await Lead.findByIdAndUpdate(lead._id, { $set: { followUpNotified: true } }).catch(() => {});
      }
    } catch (err) {
      console.error("Cron Error (Lead follow-up reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 7. Task Scheduled Follow-up Reminder (Runs every minute)
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const Task = require("../models/Task");
      // Find tasks whose scheduled nextFollowUpDate is <= now and has not been notified yet (strict companyId isolation)
      const dueTasks = await Task.find({
        companyId: { $ne: null },
        nextFollowUpDate: { $lte: now, $ne: null },
        followUpNotified: { $ne: true },
        status: { $nin: ["complete", "completed", "done", "late_complete", "re_complete", "cancelled"] },
      }).populate("assignedTo", "firstName lastName name email");

      for (const task of dueTasks) {
        const { timeStr, dateStr } = formatISTDateTime(task.nextFollowUpDate);

        const title = `⏰ Task Follow-up Reminder: ${task.title}`;
        const message = `Follow-up scheduled at ${timeStr}, ${dateStr} for task "${task.title}".`;

        const companyId = task.companyId?._id || task.companyId;
        if (companyId) {
          const timeEpoch = new Date(task.nextFollowUpDate).getTime();
          await notifyTaskAll(
            companyId,
            task.assignedTo || [],
            task.departmentId || null,
            title,
            message,
            "task_follow_up",
            { taskId: task._id.toString(), taskTitle: task.title },
            {
              assigneeTitle: title,
              assigneeBody: message,
              supervisorTitle: `⏰ Team Follow-up Alert: ${task.title}`,
              supervisorBody: `Scheduled task follow-up at ${timeStr}, ${dateStr} for "${task.title}".`,
              customKeyPrefix: `task_followup_${task._id.toString()}_${timeEpoch}`
            }
          ).catch((e) => console.error("[Task follow-up notify error]:", e));
        }

        // Mark as notified
        await Task.findByIdAndUpdate(task._id, { $set: { followUpNotified: true } }).catch(() => {});
      }
    } catch (err) {
      console.error("Cron Error (Task follow-up reminder):", err);
    }
  }, { timezone: "Asia/Kolkata" });
};

module.exports = initCronJobs;
