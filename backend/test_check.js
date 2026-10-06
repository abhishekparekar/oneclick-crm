const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./src/config/db');
const EmployeeLocation = require('./src/models/EmployeeLocation');
const Employee = require('./src/models/Employee');

async function test() {
  try {
    await connectDB();
    const total = await EmployeeLocation.countDocuments();
    const withCompanyId = await EmployeeLocation.countDocuments({ companyId: { $exists: true, $ne: null } });
    const withoutCompanyId = await EmployeeLocation.countDocuments({ $or: [{ companyId: { $exists: false } }, { companyId: null }] });
    const recent = await EmployeeLocation.find().sort({ timestamp: -1 }).limit(5).lean();
    
    // Group count by date (in IST)
    const distinctDates = await EmployeeLocation.aggregate([
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "+05:30" } },
          employeeId: 1,
          companyId: 1,
        }
      },
      {
        $group: {
          _id: { date: "$date", employeeId: "$employeeId" },
          count: { $sum: 1 },
          hasCompanyId: { $max: { $cond: [{ $ifNull: ["$companyId", false] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          activeEmployeesCount: { $sum: 1 },
          totalPoints: { $sum: "$count" },
          employees: { $push: "$_id.employeeId" }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]);

    console.log(JSON.stringify({ total, withCompanyId, withoutCompanyId, distinctDates }, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
test();
