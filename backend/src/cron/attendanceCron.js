const cron = require("node-cron");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const { sendNotificationToEmployees } = require("../utils/notificationHelper");

const initAttendanceCron = () => {
  console.log("[CRON] Attendance reminder cron initialized (Runs at 08:00 AM every day).");

  // Run at 08:00 AM every day
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] Running attendance reminder check at 8:00 AM...");
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const employees = await Employee.find({ status: "active" }, { _id: 1, companyId: 1 }).lean();
      const employeesWithoutAttendance = [];

      for (const emp of employees) {
        const attendance = await Attendance.findOne({
          employeeId: emp._id,
          date: { $gte: todayStart, $lte: todayEnd }
        }).lean();

        if (!attendance || !attendance.checkInTime) {
           employeesWithoutAttendance.push(emp);
        }
      }

      // Group by company
      const byCompany = {};
      employeesWithoutAttendance.forEach(emp => {
        if (!byCompany[emp.companyId]) byCompany[emp.companyId] = [];
        byCompany[emp.companyId].push(emp._id);
      });

      for (const companyId in byCompany) {
        await sendNotificationToEmployees(
          companyId,
          byCompany[companyId],
          "Attendance Reminder",
          "You haven't checked in today. Please mark your attendance.",
          "attendance"
        );
      }

      console.log(`[CRON] Attendance reminder sent to ${employeesWithoutAttendance.length} employees.`);
    } catch (error) {
      console.error("[CRON] Error running attendance reminder:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

module.exports = { initAttendanceCron };
