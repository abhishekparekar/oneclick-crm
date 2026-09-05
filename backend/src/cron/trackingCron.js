const cron = require("node-cron");
const Employee = require("../models/Employee");

/**
 * Auto-stop tracking at 12:00 AM (midnight) IST
 */
const stopTrackingAtMidnight = async () => {
  try {
    const result = await Employee.updateMany(
      { "lastLocation.isTrackingActive": true },
      { $set: { "lastLocation.isTrackingActive": false } }
    );
    console.log(`[TrackingCron] 12:00 AM Midnight auto-stop executed: stopped tracking for ${result.modifiedCount} employees.`);
  } catch (error) {
    console.error("[TrackingCron] Error stopping tracking at midnight:", error);
  }
};

const initTrackingMidnightCron = () => {
  // Run at 00:00 (12:00 AM) IST every night
  // 0 0 * * * = at 00:00 every day
  cron.schedule(
    "0 0 * * *",
    () => {
      console.log("[TrackingCron] 12:00 AM Midnight reached - auto-stopping tracking...");
      stopTrackingAtMidnight();
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
  console.log("Tracking Midnight Cron initialized (12:00 AM auto-stop).");
};

module.exports = { initTrackingMidnightCron, stopTrackingAtMidnight };
