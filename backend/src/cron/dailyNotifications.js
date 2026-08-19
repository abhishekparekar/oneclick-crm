const cron = require("node-cron");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Task = require("../models/Task");
const { sendEmail, sendWhatsApp } = require("../services/notificationService");

/**
 * Utility to parse time string "HH:MM" and compare with current Date
 */
const timeMatch = (timeStr, now) => {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(":").map(Number);
  return now.getHours() === h && now.getMinutes() === m;
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
 * Get One Hour Before String "HH:MM"
 */
const getOneHourBefore = (endStr) => {
  if (!endStr) return null;
  const [eh, em] = endStr.split(":").map(Number);
  let totalEndMins = eh * 60 + em;
  totalEndMins -= 60;
  if (totalEndMins < 0) totalEndMins += 24 * 60;

  const h = Math.floor((totalEndMins % (24 * 60)) / 60);
  const m = totalEndMins % 60;
  
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Core Engine Function
 */
const checkAndSendNotifications = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // 1. Fetch all active employees
    // Note: We pull employees directly from DB to allow for custom processing.
    // Index { status: 1 } ensures this is fast.
    const employees = await Employee.find({ status: "active" }).select("_id firstName email phone shiftStartTime shiftEndTime");

    if (!employees || employees.length === 0) return;

    // Batching to prevent event loop blocking
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
      const batch = employees.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (emp) => {
        const isMorning = timeMatch(emp.shiftStartTime, now);
        const midPoint = getHalfwayPoint(emp.shiftStartTime, emp.shiftEndTime);
        const isMidDay = timeMatch(midPoint, now);
        const oneHourBefore = getOneHourBefore(emp.shiftEndTime);
        const isEndShift = timeMatch(oneHourBefore, now);
        
        const preShiftHour = getOneHourBefore(emp.shiftStartTime);
        const isPreShift = timeMatch(preShiftHour, now);

        if (!isMorning && !isMidDay && !isEndShift && !isPreShift) return; // Skip if no trigger time matched

        // Get tasks for this employee
        const tasks = await Task.find({
          assignedTo: emp._id,
          startDateTime: { $gte: todayStart, $lt: todayEnd }
        }).lean();

        const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "re_pending");
        const inProcessTasks = tasks.filter(t => t.status === "in_process" || t.status === "re_in_process");
        const allPending = [...pendingTasks, ...inProcessTasks];

        // Action 0: Pre-Shift Reminder
        if (isPreShift) {
          const msg = `Reminder ${emp.firstName}: Your shift starts in exactly 1 hour. Please remember to punch in on time!`;
          await sendEmail(emp.email, "Pre-Shift Reminder", msg);
          if (emp.phone) await sendWhatsApp(emp.phone, msg);
        }

        // Action 1: Morning Trigger
        if (isMorning) {
          const msg = `Good Morning ${emp.firstName}! You have ${tasks.length} tasks scheduled for today.`;
          await sendEmail(emp.email, "Daily Task List", msg);
          if (emp.phone) await sendWhatsApp(emp.phone, msg);
        }

        // Action 2: Mid-Day Trigger
        if (isMidDay && allPending.length > 0) {
          const msg = `Reminder ${emp.firstName}: You still have ${allPending.length} pending tasks to complete today.`;
          await sendEmail(emp.email, "Mid-Day Task Reminder", msg);
          if (emp.phone) await sendWhatsApp(emp.phone, msg);
        }

        // Action 3: Shift End Trigger
        if (isEndShift) {
          if (allPending.length === 0 && tasks.length > 0) {
            const msg = `Good Job ${emp.firstName}! 🎉 All your tasks for today are complete. Have a great evening!`;
            await sendEmail(emp.email, "Great Job Today!", msg);
            if (emp.phone) await sendWhatsApp(emp.phone, msg);
          } else if (allPending.length > 0) {
            const msg = `URGENT ${emp.firstName}: Your shift ends in 1 hour and you have ${allPending.length} tasks pending. Please update them!`;
            await sendEmail(emp.email, "Urgent: End of Shift Task Reminder", msg);
            if (emp.phone) await sendWhatsApp(emp.phone, msg);
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
