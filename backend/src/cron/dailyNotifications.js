const cron = require("node-cron");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Task = require("../models/Task");
const { sendEmail, sendWhatsApp } = require("../services/notificationService");

/**
 * Utility to parse time string "HH:MM" and compare with current Date
 */
/**
 * Utility to parse time string "HH:MM" and compare with current Date in IST/Kolkata
 */
const timeMatch = (timeStr, now) => {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(":").map(Number);
  return now.getHours() === h && now.getMinutes() === m;
};

/**
 * Add minutes to "HH:MM" string
 */
const addMinutes = (timeStr, minutesToAdd) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  let totalMins = (h * 60 + m + minutesToAdd) % (24 * 60);
  if (totalMins < 0) totalMins += 24 * 60;
  const resH = Math.floor(totalMins / 60);
  const resM = totalMins % 60;
  return `${String(resH).padStart(2, "0")}:${String(resM).padStart(2, "0")}`;
};

/**
 * Subtract minutes from "HH:MM" string
 */
const subtractMinutes = (timeStr, minutesToSubtract) => {
  return addMinutes(timeStr, -minutesToSubtract);
};

/**
 * Get Halfway Point String "HH:MM"
 */
const getHalfwayPoint = (startStr, endStr) => {
  if (!startStr || !endStr) return null;
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  
  let totalStartMins = sh * 60 + sm;
  let totalEndMins = eh * 60 + em;
  if (totalEndMins < totalStartMins) totalEndMins += 24 * 60; // night shift

  const midMins = Math.floor((totalStartMins + totalEndMins) / 2);
  const midH = Math.floor((midMins % (24 * 60)) / 60);
  const midM = midMins % 60;

  return `${String(midH).padStart(2, "0")}:${String(midM).padStart(2, "0")}`;
};

/**
 * Core Engine Function
 */
const checkAndSendNotifications = async () => {
  try {
    // Current time in Asia/Kolkata timezone
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // 1. Fetch all active employees with populated user info
    const employees = await Employee.find({ status: "active" })
      .select("_id firstName lastName email phone companyId userId shiftStartTime shiftEndTime");

    if (!employees || employees.length === 0) return;

    const { notifyUser } = require("../utils/notificationHelper");

    // Batching to prevent event loop blocking
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
      const batch = employees.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (emp) => {
        const shiftStart = emp.shiftStartTime || "09:00";
        const shiftEnd = emp.shiftEndTime || "18:00";

        // 1. Shift Start + 10 mins (e.g. 9:10 AM for 9:00 AM shift)
        const shiftStartPlus10 = addMinutes(shiftStart, 10);
        const isShiftStartPlus10 = timeMatch(shiftStartPlus10, now);

        // 2. Mid-Shift Halfway point (e.g. 1:30 PM for 9:00 AM - 6:00 PM shift)
        const midPoint = getHalfwayPoint(shiftStart, shiftEnd);
        const isMidDay = timeMatch(midPoint, now);

        // 3. Shift End - 15 mins (e.g. 5:45 PM for 6:00 PM shift)
        const shiftEndMinus15 = subtractMinutes(shiftEnd, 15);
        const isEndShiftMinus15 = timeMatch(shiftEndMinus15, now);
        
        // 4. Pre-Shift 1 hour reminder
        const preShiftHour = subtractMinutes(shiftStart, 60);
        const isPreShift = timeMatch(preShiftHour, now);

        if (!isShiftStartPlus10 && !isMidDay && !isEndShiftMinus15 && !isPreShift) return; // Skip if no trigger time matched

        // Get tasks for this employee for today
        const tasks = await Task.find({
          assignedTo: emp._id,
          startDateTime: { $gte: todayStart, $lt: todayEnd }
        }).lean();

        const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "re_pending");
        const inProcessTasks = tasks.filter(t => t.status === "in_process" || t.status === "re_in_process");
        const allPending = [...pendingTasks, ...inProcessTasks];

        // Action 0: Pre-Shift Reminder (1 hour before shift)
        if (isPreShift) {
          const msg = `Reminder ${emp.firstName}: Your shift starts in 1 hour (${shiftStart}). Please remember to punch in on time!`;
          await sendEmail(emp.email, "Pre-Shift Reminder", msg);
          if (emp.phone) await sendWhatsApp(emp.phone, msg, emp.companyId);
          if (emp.userId) {
            await notifyUser(emp.userId, emp.companyId, "⏰ Shift Starts in 1 Hour", msg, "attendance");
          }
        }

        // Action 1: Shift Start + 10 mins Trigger (Morning Task Reminder)
        if (isShiftStartPlus10) {
          if (tasks.length > 0) {
            const msg = `Good Morning ${emp.firstName}! You have ${tasks.length} task(s) scheduled for today (${allPending.length} pending). Please start your work on time.`;
            await sendEmail(emp.email, "📋 Daily Task List", msg);
            if (emp.phone) await sendWhatsApp(emp.phone, msg, emp.companyId);
            if (emp.userId) {
              await notifyUser(emp.userId, emp.companyId, "📋 Today's Tasks Assigned", msg, "task");
            }
          }
        }

        // Action 2: Mid-Day Trigger (Halfway through shift)
        if (isMidDay && allPending.length > 0) {
          const msg = `Mid-Day Reminder ${emp.firstName}: You still have ${allPending.length} pending task(s) to complete today. Keep up the momentum!`;
          await sendEmail(emp.email, "⏳ Mid-Day Task Reminder", msg);
          if (emp.phone) await sendWhatsApp(emp.phone, msg, emp.companyId);
          if (emp.userId) {
            await notifyUser(emp.userId, emp.companyId, "⏳ Mid-Day Pending Tasks", msg, "task");
          }
        }

        // Action 3: Shift End - 15 mins Trigger (e.g. 5:45 PM for 6:00 PM shift)
        if (isEndShiftMinus15) {
          if (allPending.length === 0 && tasks.length > 0) {
            const msg = `Great Job ${emp.firstName}! 🎉 All your tasks for today are completed. Shift ends in 15 mins. Have a wonderful evening!`;
            await sendEmail(emp.email, "🎉 Great Job Today!", msg);
            if (emp.phone) await sendWhatsApp(emp.phone, msg, emp.companyId);
            if (emp.userId) {
              await notifyUser(emp.userId, emp.companyId, "🎉 Tasks Completed!", msg, "task");
            }
          } else if (allPending.length > 0) {
            const msg = `⚠️ URGENT ${emp.firstName}: Your shift ends in 15 minutes (${shiftEnd}) and you still have ${allPending.length} task(s) pending. Please submit or update them!`;
            await sendEmail(emp.email, "⚠️ Urgent: Pending Tasks Before Shift End", msg);
            if (emp.phone) await sendWhatsApp(emp.phone, msg, emp.companyId);
            if (emp.userId) {
              await notifyUser(emp.userId, emp.companyId, "⚠️ Shift Ending Soon - Pending Tasks!", msg, "task");
            }
          }
        }
      });

      // Await batch completion, catching errors gracefully
      await Promise.allSettled(promises);
    }
  } catch (error) {
    console.error("Error in dailyNotifications cron:", error);
  }
};

/**
 * Initialize Cron
 * Runs every minute to accurately catch "HH:MM" triggers.
 */
const initCron = () => {
  cron.schedule("* * * * *", () => {
    checkAndSendNotifications();
  });
  console.log("Daily Notifications Cron Engine initialized.");
};

module.exports = { initCron, checkAndSendNotifications };
