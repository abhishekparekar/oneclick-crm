const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  const u = await User.findOne({ role: 'Manager' }).lean();
  const admin = await User.findOne({ role: 'CompanyAdmin', companyId: u.companyId }).lean();

  const { getCompanyDashboard } = require('./src/controllers/companyController');
  let compDash = null;
  const req = { user: admin, companyId: u.companyId };
  await getCompanyDashboard(req, { json: d => { compDash = d.data || d; }, status: () => {} }, console.error);

  console.log('Admin Dashboard totalTasks:', compDash?.kpis?.totalTasks);
  console.log('Admin Dashboard taskStats:', compDash?.taskStats);

  // Now Manager Dashboard:
  const { getManagerDashboardSummary, getTeamTasks } = require('./src/controllers/managerController');
  let mgrDash = null;
  await getManagerDashboardSummary({ user: u, companyId: u.companyId, query: {} }, { json: d => { mgrDash = d.data; }, status: () => {} }, console.error);

  console.log('Manager Dashboard taskSummary:', mgrDash?.taskSummary);

  // Manager web frontend:
  // How does ManagerDashboard.jsx in web frontend compute totalTasksCount?
  // Let's check:
  // In ManagerDashboard.jsx:
  // const totalTasksCount = Math.max(realTasks.length, tasks.totalTeamTasks ?? 0);
  // where realTasks is from getManagerTeamTasksApi + getManagerTeamTasksApi(isTemplate: true)
  let mgrTasks = [], mgrTpls = [];
  await getTeamTasks({ user: u, companyId: u.companyId, query: { limit: 1000 } }, { json: d => { mgrTasks = d.data || []; }, status: () => {} }, console.error);
  await getTeamTasks({ user: u, companyId: u.companyId, query: { isTemplate: 'true', limit: 1000 } }, { json: d => { mgrTpls = d.data || []; }, status: () => {} }, console.error);

  console.log('Manager web realTasks.length:', mgrTasks.length + mgrTpls.length);
  console.log('Manager web tasks.totalTeamTasks:', mgrDash?.taskSummary?.totalTeamTasks);
  console.log('Manager web totalTasks (Math.max):', Math.max(mgrTasks.length + mgrTpls.length, mgrDash?.taskSummary?.totalTeamTasks ?? 0));

  await mongoose.disconnect();
}

run().catch(console.error);
