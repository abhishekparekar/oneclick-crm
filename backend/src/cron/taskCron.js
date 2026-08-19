const cron = require("node-cron");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const TaskTemplate = require("../models/TaskTemplate");
const TaskActivity = require("../models/TaskActivity");
const CompanyTaskCounter = require("../models/CompanyTaskCounter");
const Company = require("../models/Company");
const {
  getCompanyWorkingDays,
  isCompanyDayOff,
  getPrecedingWorkingDay,
  filterAssigneesNotOnLeave,
} = require("../utils/taskScheduleUtils");

// Helper: Generate next Task ID for a company (T-00001 format)
const generateNextTaskId = async (companyId) => {
  const counter = await CompanyTaskCounter.findOneAndUpdate(
    { companyId },
    { $inc: { currentSequence: 1 } },
    { new: true, upsert: true }
  );
  const seqNumber = counter.currentSequence;
  const taskId = `T-${seqNumber}`;
  return { taskId, seqNumber };
};

// Helper: Get Asia/Kolkata date represented at UTC midnight
const getKolkataDate = (date = new Date()) => {
  const dateString = new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${dateString}T00:00:00.000Z`);
};

const isScheduledForDate = async (template, date, workingDays) => {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  if (template.repeatType === "daily") {
    return true;
  }
  if (template.repeatType === "weekly") {
    const normalizedWeeklyDays = (template.weeklyDays || []).map(d => d.toLowerCase());
    return normalizedWeeklyDays.includes(dayName.toLowerCase());
  }
  if (template.repeatType === "monthly") {
    const targetDay = date.getUTCDate();
    const lastDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    for (const tDate of (template.monthlyDates || [])) {
      const actualTarget = Math.min(tDate, lastDayOfMonth);
      if (actualTarget === targetDay) return true;
    }
  }
  return false;
};

// 1. Process a single template for task generation (recovers all missed dates chronologically)
const processSingleTemplate = async (template, targetDate = new Date()) => {
  try {
    const today = getKolkataDate(targetDate);

    // Check if template start date is in the future
    const tempStart = getKolkataDate(template.startDate);
    if (tempStart > today) return null;

    // Determine the start date for task generation
    let currentDate = tempStart;
    if (template.lastGeneratedDate) {
      const lastGen = getKolkataDate(template.lastGeneratedDate);
      
      // If we've already generated up to or past today, skip
      if (lastGen >= today) {
        return null;
      }
      
      // Start from the day after the last generation date
      currentDate = new Date(lastGen);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    let lastGeneratedTask = null;

    // Loop through each missed day chronologically up to today
    while (currentDate <= today) {
      // Check expiry for this loop's specific date
      if (template.finishDate) {
        const finish = getKolkataDate(template.finishDate);
        if (currentDate > finish) {
          template.isActive = false;
          template.expiredAt = new Date();
          await template.save();
          break;
        }
      }

      // Atomically claim this date to prevent duplicate concurrent runs across threads/reloads
      const claimedTemplate = await TaskTemplate.findOneAndUpdate(
        {
          _id: template._id,
          $or: [
            { lastGeneratedDate: { $lt: currentDate } },
            { lastGeneratedDate: { $exists: false } }
          ]
        },
        { $set: { lastGeneratedDate: currentDate } },
        { new: true }
      );

      if (!claimedTemplate) {
        // Date already claimed or processed by a concurrent execution, skip to next date
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        continue;
      }

      const workingDays = await getCompanyWorkingDays(template.companyId);
      const isTodayOff = await isCompanyDayOff(template.companyId, currentDate, workingDays);

      // If today is a working day, generate tasks scheduled for today, and look ahead for upcoming holiday/weekly offs
      if (!isTodayOff.off) {
        let datesToGenerate = [];

        // 1. Check if we should generate for currentDate itself
        if (await isScheduledForDate(template, currentDate, workingDays)) {
          datesToGenerate.push(currentDate);
        }

        // 2. Look ahead for upcoming holiday/weekly off days whose preceding working day is currentDate
        let nextDate = new Date(currentDate);
        for (let i = 1; i <= 7; i++) {
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          const nextOff = await isCompanyDayOff(template.companyId, nextDate, workingDays);
          if (!nextOff.off) {
            // It's a working day, so no holiday sequences after this can claim currentDate as preceding working day
            break;
          }
          const precWorking = await getPrecedingWorkingDay(template.companyId, nextDate, workingDays);
          if (precWorking.getTime() === currentDate.getTime()) {
            if (await isScheduledForDate(template, nextDate, workingDays)) {
              datesToGenerate.push(new Date(nextDate));
            }
          }
        }

        // Generate tasks for all scheduled dates mapped to today
        for (const genDate of datesToGenerate) {
          // Check if already generated (strict range check on generatedDate)
          const startOfDay = new Date(genDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(genDate);
          endOfDay.setUTCHours(23, 59, 59, 999);

          const existingTask = await Task.findOne({
            templateId: template._id,
            generatedDate: { $gte: startOfDay, $lte: endOfDay }
          });

          if (existingTask) {
            lastGeneratedTask = existingTask;
            continue;
          }

          const availableAssignees = await filterAssigneesNotOnLeave(
            template.companyId,
            template.assignedTo || [],
            currentDate
          );

          if (availableAssignees.length > 0) {
            const { taskId, seqNumber } = await generateNextTaskId(template.companyId);

            const dateStr = currentDate.toISOString().split("T")[0];
            let endDateTime;
            if (template.deadlineTime) {
              endDateTime = new Date(`${dateStr}T${template.deadlineTime}:00.000+05:30`);
            } else {
              endDateTime = new Date(`${dateStr}T23:59:59.999+05:30`);
            }

            const isHolidayCatchup = genDate.getTime() !== currentDate.getTime();
            const displayTitle = isHolidayCatchup 
              ? `${template.title} (Holiday catch-up for ${genDate.toLocaleDateString("en-IN")})` 
              : template.title;

            const newTask = new Task({
              companyId: template.companyId,
              taskId,
              taskSequenceNumber: seqNumber,
              templateId: template._id,
              parentTemplateId: template._id,
              generatedDate: genDate, // Represents the originally scheduled date
              isGeneratedFromTemplate: true,
              isRecurring: true,
              assignedBy: template.assignedBy,
              assignedTo: availableAssignees,
              departmentId: template.departmentId,
              title: displayTitle,
              description: template.description,
              priority: template.priority,
              startDateTime: currentDate, // Active from today
              endDateTime,
              nextFollowUpDate: currentDate,
              status: "pending",
              isLive: true,
              liveAt: new Date(),
              attachments: template.attachments,
              projectId: template.projectId || null,
              checklist: template.checklist || []
            });

            await newTask.save();

            // Log generation activity
            await TaskActivity.create({
              companyId: template.companyId,
              taskId: newTask._id,
              action: "generated",
              remarks: `Task auto-generated from template for date: ${genDate.toDateString()} (Generated on working day ${currentDate.toDateString()})`,
              performedBy: template.createdBy
            });

            // Notify assignees
            try {
              const { sendNotificationToEmployees } = require("../utils/notificationHelper");
              await sendNotificationToEmployees(
                template.companyId,
                availableAssignees,
                "New Task Assigned (Recurring)",
                `You have been assigned a new task: ${displayTitle}`,
                "task",
                { taskId: newTask._id.toString() }
              );
            } catch (err) {
              console.error("Error sending recurring task notification:", err);
            }

            console.log(`[taskCron] Auto-generated task ${newTask.taskId} from template ${template._id} for scheduled date ${genDate.toISOString().split("T")[0]}`);
            lastGeneratedTask = newTask;
          } else {
            console.log(
              `[taskCron] Skipping template ${template._id} for date ${currentDate.toDateString()} — all assignees on approved leave.`
            );
          }
        }
      }

      // Advance to next day
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return lastGeneratedTask;
  } catch (error) {
    console.error("[taskCron] Error processing single template:", error);
  }
  return null;
};

// 2. Morning Reminder Cron — sends "Task Reminder" push to employees with a pending recurring task today
const sendMorningTaskReminders = async () => {
  console.log("[CRON] Morning Task Reminder starting...");
  try {
    const { sendNotificationToEmployees } = require("../utils/notificationHelper");
    const today = getKolkataDate(new Date());

    const startOfToday = new Date(today);
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // Find all live recurring tasks generated today that are still pending
    const pendingTasks = await Task.find({
      isGeneratedFromTemplate: true,
      status: { $in: ["pending", "re_pending"] },
      startDateTime: { $gte: startOfToday, $lte: endOfToday }
    }).populate("templateId");

    if (pendingTasks.length === 0) {
      console.log("[CRON] No pending recurring tasks to remind today.");
      return;
    }

    // Group by companyId for working day checks
    const companyWorkingDayCache = {};
    const notified = new Set();

    for (const task of pendingTasks) {
      if (!companyWorkingDayCache[task.companyId]) {
        companyWorkingDayCache[task.companyId] = await getCompanyWorkingDays(task.companyId);
      }
      const workingDays = companyWorkingDayCache[task.companyId];
      const dayOff = await isCompanyDayOff(task.companyId, today, workingDays);
      if (dayOff.off) {
        console.log(`[CRON] Skipping reminder for company ${task.companyId} — ${dayOff.reason}`);
        continue;
      }

      // Filter out employees on leave today
      const availableAssignees = await filterAssigneesNotOnLeave(
        task.companyId,
        task.assignedTo || [],
        today
      );

      if (availableAssignees.length === 0) continue;

      // Deduplicate — don't notify same employee twice for same task
      const key = `${task._id}`;
      if (notified.has(key)) continue;
      notified.add(key);

      const deadlineStr = task.endDateTime
        ? new Date(task.endDateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
        : "";

      await sendNotificationToEmployees(
        task.companyId,
        availableAssignees,
        "📋 Task Reminder",
        `Reminder: "${task.title}" is pending. Deadline: ${deadlineStr}`,
        "task",
        { taskId: task._id.toString() }
      ).catch(err => console.error("[CRON] Reminder notification error:", err));
    }

    console.log(`[CRON] Morning reminders sent for ${notified.size} task(s).`);
  } catch (error) {
    console.error("[CRON] Error in Morning Reminder:", error);
  }
};

// 2. Daily Generator Cron (Runs at 12:00 AM midnight)
const generateRecurringTasks = async () => {
  try {
    const today = getKolkataDate(new Date());

    const activeTemplates = await TaskTemplate.find({
      isActive: true,
      repeatEnabled: true,
      startDate: { $lte: today },
    });

    console.log(`[CRON] Generating recurring tasks for ${today.toUTCString()} - Found ${activeTemplates.length} active templates`);

    for (const template of activeTemplates) {
      // Generate task for today without checking original creation time,
      // as this job now strictly runs at midnight.
      await processSingleTemplate(template, today);
    }
  } catch (error) {
    console.error("[CRON] Error in Daily Task Generator:", error);
  }
};

// 2. Overdue Checker Cron (Runs every 5 minutes)
const checkOverdueTasks = async () => {
  try {
    const now = new Date();

    // Find tasks that missed their endDateTime
    const overdueTasks = await Task.find({
      status: { $in: ["pending", "re_pending"] },
      endDateTime: { $lt: now }
    });

    if (overdueTasks.length > 0) {
      console.log(`[CRON] Found ${overdueTasks.length} newly overdue tasks. Updating status...`);

      for (const task of overdueTasks) {
        task.status = "overdue";
        await task.save();

        await TaskActivity.create({
          companyId: task.companyId,
          taskId: task._id,
          action: "overdue",
          remarks: "Task automatically marked as overdue",
          performedBy: task.assignedBy // System action attributed loosely to creator/assigner
        });
      }
    }
  } catch (error) {
    console.error("[CRON] Error in Overdue Checker:", error);
  }
};

const initCronJobs = () => {
  // At 12:00 AM (Midnight) IST every day — generate recurring tasks
  cron.schedule("0 0 * * *", generateRecurringTasks, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // 9:00 AM IST every day — send morning reminders for pending recurring tasks
  cron.schedule("0 9 * * *", sendMorningTaskReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Every 5 minutes — mark overdue tasks
  cron.schedule("*/5 * * * *", checkOverdueTasks, {
    scheduled: true,
  });

  console.log("[CRON] Task generator, morning reminder, and overdue checker initialized.");

  // Run immediate catch-up on server start
  setTimeout(() => {
    console.log("[CRON] Running immediate catch-up for recurring tasks...");
    generateRecurringTasks().catch(err => console.error("[CRON] Catch-up failed:", err));
  }, 5000);
};

module.exports = {
  initCronJobs,
  generateRecurringTasks,
  sendMorningTaskReminders,
  checkOverdueTasks,
  processSingleTemplate
};
