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

// Helper: Send aggregated pending tasks reminder to employees
const sendPendingTasksBatchNotification = async (partName, titlePrefix, msgTemplate) => {
  try {
    const { notifyUser } = require("../utils/notificationHelper");
    const Employee = require("../models/Employee");

    // Find all tasks that are currently pending or in progress (both template and manual)
    const pendingTasks = await Task.find({
      status: { $in: ["pending", "re_pending", "in_process", "re_in_process"] },
    });

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log(`[CRON] ${partName}: No pending tasks found.`);
      return;
    }

    // Collect all assignee IDs across tasks
    const allAssigneeIds = [];
    pendingTasks.forEach(t => {
      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
      assignees.forEach(id => {
        if (id) allAssigneeIds.push(id);
      });
    });

    if (allAssigneeIds.length === 0) return;

    // Fetch all active employees
    const employees = await Employee.find({
      $or: [
        { _id: { $in: allAssigneeIds } },
        { userId: { $in: allAssigneeIds } }
      ],
      status: "active"
    }).populate("userId");

    // Map: employeeId -> { userId, empName, companyId }
    const empIdToUserMap = new Map();
    employees.forEach(emp => {
      if (emp.userId) {
        const uId = (emp.userId._id || emp.userId).toString();
        const info = {
          userId: uId,
          empName: emp.firstName || "Team Member",
          companyId: emp.companyId
        };
        empIdToUserMap.set(emp._id.toString(), info);
        empIdToUserMap.set(uId, info);
      }
    });

    // Group pending tasks per user
    const userTaskMap = new Map(); // key: userId -> { companyId, empName, tasks: [] }
    for (const task of pendingTasks) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
      for (const rawId of assignees) {
        if (!rawId) continue;
        const idStr = rawId.toString();
        const empInfo = empIdToUserMap.get(idStr);
        if (empInfo) {
          if (!userTaskMap.has(empInfo.userId)) {
            userTaskMap.set(empInfo.userId, {
              companyId: task.companyId || empInfo.companyId,
              empName: empInfo.empName,
              tasks: []
            });
          }
          userTaskMap.get(empInfo.userId).tasks.push(task);
        }
      }
    }

    let sentCount = 0;
    for (const [userId, info] of userTaskMap.entries()) {
      const taskCount = info.tasks.length;
      if (taskCount === 0) continue;

      const topTask = info.tasks[0];
      const title = `${titlePrefix}: ${taskCount} Pending Task${taskCount > 1 ? "s" : ""}`;
      const body = msgTemplate(info.empName, taskCount, topTask.title);

      await notifyUser(
        userId,
        info.companyId,
        title,
        body,
        "task",
        { taskCount, topTaskId: topTask._id.toString() }
      ).catch(err => console.error(`[CRON] ${partName} error for user ${userId}:`, err));

      sentCount++;
    }

    console.log(`[CRON] ${partName} sent to ${sentCount} employee(s).`);
  } catch (error) {
    console.error(`[CRON] Error in ${partName}:`, error);
  }
};

// 1. Part 1: Morning Kickoff Reminder (09:00 AM IST) - For Employees + Company Admin
const sendAdminMorningPendingTasksSummary = async () => {
  try {
    const User = require("../models/User");
    const { notifyManyUsers } = require("../utils/notificationHelper");

    // Find all pending tasks grouped by companyId
    const pendingTasks = await Task.find({
      status: { $in: ["pending", "re_pending", "in_process", "re_in_process"] }
    });

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log("[CRON] Admin Morning Summary: No pending tasks found.");
      return;
    }

    const companyTaskMap = new Map(); // key: companyId -> tasks array
    for (const task of pendingTasks) {
      if (task.companyId) {
        const cIdStr = task.companyId.toString();
        if (!companyTaskMap.has(cIdStr)) {
          companyTaskMap.set(cIdStr, []);
        }
        companyTaskMap.get(cIdStr).push(task);
      }
    }

    for (const [companyId, tasks] of companyTaskMap.entries()) {
      const taskCount = tasks.length;
      if (taskCount === 0) continue;

      // Find all CompanyAdmin users for this company
      const adminUsers = await User.find({
        companyId,
        role: "CompanyAdmin",
        isActive: true
      }).select("_id");

      const adminUserIds = adminUsers.map(u => u._id.toString());
      if (adminUserIds.length === 0) continue;

      const title = `📋 Daily Task Overview: ${taskCount} Pending Task${taskCount > 1 ? "s" : ""}`;
      const body = `Good morning Admin! There are ${taskCount} total pending task(s) active in your company today. Track team progress and workflow status.`;

      await notifyManyUsers(
        adminUserIds,
        companyId,
        title,
        body,
        "task",
        { totalPendingTasks: taskCount }
      ).catch(e => console.error("[CRON] Admin morning summary error:", e));
    }

    console.log("[CRON] Admin Morning Pending Task Summary sent successfully.");
  } catch (error) {
    console.error("[CRON] Error in sendAdminMorningPendingTasksSummary:", error);
  }
};

const sendMorningTaskReminders = async () => {
  console.log("[CRON] Running Part 1: Morning Task Reminders (09:00 AM) for Employees & Admin...");
  // 1. Send employee-specific morning reminders
  await sendPendingTasksBatchNotification(
    "Morning Task Reminder",
    "📋 Morning Task Reminder",
    (name, count, topTitle) =>
      `Good morning ${name}! You have ${count} pending task${count > 1 ? "s" : ""} today (e.g. "${topTitle}"). Please start and complete them on time.`
  );

  // 2. Send 1 aggregated morning overview to Company Admin
  await sendAdminMorningPendingTasksSummary();
};

// 2. Part 2: Mid-Day Progress Check (01:30 PM IST)
const sendMidDayTaskReminders = async () => {
  console.log("[CRON] Running Part 2: Mid-Day Task Reminders (01:30 PM)...");
  await sendPendingTasksBatchNotification(
    "Mid-Day Task Reminder",
    "⏳ Mid-Day Task Reminder",
    (name, count, topTitle) =>
      `Mid-day update for ${name}: You still have ${count} pending task${count > 1 ? "s" : ""} (e.g. "${topTitle}"). Keep up the momentum to finish before deadlines!`
  );
};

// 3. Part 3: Evening Pre-Closing / Shift-End Reminder (05:00 PM IST)
const sendEveningTaskReminders = async () => {
  console.log("[CRON] Running Part 3: Evening Task Reminders (05:00 PM)...");
  await sendPendingTasksBatchNotification(
    "Evening Task Reminder",
    "⚠️ Evening Task Reminder",
    (name, count, topTitle) =>
      `Shift closing soon ${name}! You have ${count} task${count > 1 ? "s" : ""} still pending (e.g. "${topTitle}"). Please submit your updates or complete them.`
  );
};

// 4. Daily Recurring Generator Cron (Runs at 12:00 AM midnight)
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
      await processSingleTemplate(template, today);
    }
  } catch (error) {
    console.error("[CRON] Error in Daily Task Generator:", error);
  }
};

// 5. High-Accuracy 3-Stage Task Deadline & Overdue Reminder Engine (Runs every 1 minute)
const checkTaskDeadlinesAndReminders = async () => {
  try {
    const now = new Date();
    const { notifyTaskAll, sendNotificationToEmployees } = require("../utils/notificationHelper");

    // Fetch active incomplete tasks
    const activeTasks = await Task.find({
      status: { $in: ["pending", "re_pending", "in_process", "re_in_process"] },
      endDateTime: { $ne: null }
    });

    for (const task of activeTasks) {
      const dueTime = new Date(task.endDateTime);
      const diffMs = dueTime.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      const timeStr = dueTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      });

      const currentStage = task.reminderStage || 0;

      // ── Stage 1: 2-Hour Advance Notice (120 min >= diff > 30 min) ──
      if (diffMinutes <= 120 && diffMinutes > 30 && currentStage < 1) {
        task.reminderStage = 1;
        task.lastReminderSentAt = now;
        await task.save();

        await notifyTaskAll(
          task.companyId,
          task.assignedTo || [],
          task.departmentId || null,
          "⏰ Task Due in 2 Hours",
          `Task "${task.title}" is due at ${timeStr}. Please wrap up pending work.`,
          "task",
          { taskId: task._id.toString(), stage: 1 }
        ).catch(e => console.error("[CRON] Stage 1 reminder error:", e));
      }

      // ── Stage 2: 30-Minute Urgent Notice (30 min >= diff > 0 min) ──
      else if (diffMinutes <= 30 && diffMinutes > 0 && currentStage < 2) {
        task.reminderStage = 2;
        task.lastReminderSentAt = now;
        await task.save();

        await notifyTaskAll(
          task.companyId,
          task.assignedTo || [],
          task.departmentId || null,
          "⚠️ Urgent: Task Due in 30 Mins",
          `Urgent: Task "${task.title}" is due in 30 minutes (${timeStr}). Finish now or submit follow-up!`,
          "task",
          { taskId: task._id.toString(), stage: 2 }
        ).catch(e => console.error("[CRON] Stage 2 reminder error:", e));
      }

      // ── Stage 3: Deadline Crossed / Overdue Escalation (diff <= 0) ──
      else if (diffMinutes <= 0 && currentStage < 3) {
        task.status = "overdue";
        task.reminderStage = 3;
        task.lastReminderSentAt = now;
        await task.save();

        await TaskActivity.create({
          companyId: task.companyId,
          taskId: task._id,
          action: "overdue",
          remarks: `Task automatically marked as overdue at ${timeStr}`,
          performedBy: task.assignedBy
        }).catch(() => {});

        // Notify both assignees and supervisors (CompanyAdmin + Managers)
        await notifyTaskAll(
          task.companyId,
          task.assignedTo || [],
          task.departmentId || null,
          "🚨 Task Overdue Alert",
          `Task "${task.title}" has crossed its deadline (${timeStr})! Immediate action or follow-up required.`,
          "task",
          { taskId: task._id.toString(), stage: 3 }
        ).catch(e => console.error("[CRON] Stage 3 overdue error:", e));
      }
    }
  } catch (error) {
    console.error("[CRON] Error in checkTaskDeadlinesAndReminders:", error);
  }
};

const initCronJobs = () => {
  // 1. Daily midnight recurring generator (12:00 AM IST)
  cron.schedule("0 0 * * *", generateRecurringTasks, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // 2. Part 1: Morning Kickoff Reminder (09:00 AM IST)
  cron.schedule("0 9 * * *", sendMorningTaskReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // 3. Part 2: Mid-Day Progress Check (01:30 PM IST)
  cron.schedule("30 13 * * *", sendMidDayTaskReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // 4. Part 3: Evening Pre-Closing Alert (05:00 PM IST)
  cron.schedule("0 17 * * *", sendEveningTaskReminders, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // 5. High-Accuracy 3-Stage Deadline Reminders & Overdue Escalation (Every 1 minute)
  cron.schedule("* * * * *", checkTaskDeadlinesAndReminders, {
    scheduled: true,
  });

  console.log("[CRON] 3-Part Task Reminders and 1-Minute High-Accuracy Deadline Engine initialized.");

  // Run immediate catch-up on server start
  setTimeout(() => {
    console.log("[CRON] Running immediate catch-up for task engine...");
    generateRecurringTasks().catch(err => console.error("[CRON] Catch-up failed:", err));
    checkTaskDeadlinesAndReminders().catch(err => console.error("[CRON] Initial deadline check failed:", err));
  }, 5000);
};

module.exports = {
  initCronJobs,
  generateRecurringTasks,
  sendMorningTaskReminders,
  sendMidDayTaskReminders,
  sendEveningTaskReminders,
  checkTaskDeadlinesAndReminders,
  processSingleTemplate
};
