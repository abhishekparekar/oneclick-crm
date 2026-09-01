const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Employee = require('./src/models/Employee');
const managerController = require('./src/controllers/managerController');

async function testManagerDashboard() {
  await connectDB();
  
  const user = await User.findOne({ email: 'abhiparekar58@gmail.com' }).lean();
  console.log('User found:', user.email, 'Role:', user.role);

  const employee = await Employee.findOne({ userId: user._id }).lean();
  console.log('Employee found:', employee?._id, 'Dept:', employee?.departmentId);

  // Mock req, res, next
  const req = {
    user: {
      ...user,
      employeeId: employee?._id,
      departmentId: employee?.departmentId
    },
    companyId: user.companyId,
    query: {}
  };

  const res = {
    status(code) {
      console.log('Status code:', code);
      return this;
    },
    json(data) {
      console.log('Response JSON success:', data?.success);
      if (!data?.success) {
        console.log('Error message:', data?.message);
      } else {
        console.log('Dashboard Data keys:', Object.keys(data.data || data));
      }
      return this;
    }
  };

  const next = (err) => {
    console.error('Next called with error:', err);
  };

  try {
    await managerController.getManagerDashboardSummary(req, res, next);
  } catch (err) {
    console.error('getManagerDashboardSummary CRASHED with error:', err);
  }

  process.exit(0);
}

testManagerDashboard().catch(console.error);
