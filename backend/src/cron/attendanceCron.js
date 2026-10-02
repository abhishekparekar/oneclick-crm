const cron = require("node-cron");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const { sendNotificationToEmployees } = require("../utils/notificationHelper");

const initAttendanceCron = () => {
  // Disabled: Keeping only pre-shift 1-hour reminder active as requested
  console.log("[CRON] 08:00 AM attendance reminder cron disabled (Pre-shift 1-hour reminder is active).");
};

module.exports = { initAttendanceCron };
