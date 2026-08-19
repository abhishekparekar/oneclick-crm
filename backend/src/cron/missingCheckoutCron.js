const cron = require("node-cron");
const Attendance = require("../models/Attendance");

const checkMissingCheckouts = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Find all attendances from yesterday (or any past day) that have punchInTime but no punchOutTime
    const missingCheckouts = await Attendance.find({
      punchInTime: { $ne: null },
      punchOutTime: null,
      createdAt: { $lt: today }, // Created strictly before today
      status: { $ne: "half_day" } // Avoid re-processing
    });

    if (missingCheckouts.length === 0) return;

    console.log(`Found ${missingCheckouts.length} missing checkouts from previous days.`);

    const promises = missingCheckouts.map(async (attendance) => {
      // Auto-penalize
      attendance.status = "half_day";
      attendance.manualReason = "Auto-Penalty: Missing Checkout";
      
      // Close the active punch log session
      if (attendance.punchLog && attendance.punchLog.length > 0) {
        const lastSession = attendance.punchLog[attendance.punchLog.length - 1];
        if (!lastSession.punchOutTime) {
          // Set to same as punchInTime or exact midnight to just close it out
          lastSession.punchOutTime = new Date(attendance.punchInTime);
        }
      }
      
      await attendance.save();
    });

    await Promise.allSettled(promises);
    console.log("Successfully processed missing checkouts.");
  } catch (error) {
    console.error("Error in missingCheckoutCron:", error);
  }
};

const initMissingCheckoutCron = () => {
  // Run at 3:00 AM every day
  // 0 3 * * * = at 3:00 AM every day
  cron.schedule("0 3 * * *", () => {
    console.log("Running Missing Checkout Cron...");
    checkMissingCheckouts();
  });
  console.log("Missing Checkout Cron initialized.");
};

module.exports = { initMissingCheckoutCron, checkMissingCheckouts };
