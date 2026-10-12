const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function testAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');
  const Task = require('./src/models/Task');
  const TaskTemplate = require('./src/models/TaskTemplate');

  const managerUser = await User.findOne({ role: 'Manager' }).lean();
  const adminUser = await User.findOne({ role: 'CompanyAdmin', companyId: managerUser.companyId }).lean();
  const companyId = managerUser.companyId;

  console.log('--- COMPANY ADMIN ---');
  // How frontend CompanyDashboard.jsx gets tasks:
  const { getTasks } = require('./src/controllers/taskController');
  let adminTasks = [], adminTpls = [];
  await getTasks({ user: adminUser, companyId, query: {} }, { json: d => { adminTasks = d.tasks || d.data || []; }, status: () => {} }, console.error);
  await getTasks({ user: adminUser, companyId, query: { isTemplate: 'true' } }, { json: d => { adminTpls = d.tasks || d.data || []; }, status: () => {} }, console.error);
  console.log('CompanyDashboard tasksRes (admin):', adminTasks.length + adminTpls.length, '(tasks:', adminTasks.length, 'tpls:', adminTpls.length, ')');

  const { getCompanyDashboard } = require('./src/controllers/companyController');
  let compDash = null;
  await getCompanyDashboard({ user: adminUser, companyId }, { json: d => { compDash = d.data || d; }, status: () => {} }, console.error);
  console.log('CompanyDashboard kpis.totalTasks:', compDash?.kpis?.totalTasks);

  console.log('--- MANAGER (WEB) ---');
  // How frontend ManagerDashboard.jsx gets tasks:
  // 1. getManagerDashboardApi:
  const { getManagerDashboardSummary, getTeamTasks } = require('./src/controllers/managerController');
  let mgrDash = null;
  await getManagerDashboardSummary({ user: managerUser, companyId, query: {} }, { json: d => { mgrDash = d.data; }, status: () => {} }, console.error);
  console.log('ManagerDashboardApi taskSummary:', mgrDash?.taskSummary);

  // 2. getManagerTeamTasksApi:
  let mgrTasks = [], mgrTpls = [];
  await getTeamTasks({ user: managerUser, companyId, query: { limit: 1000 } }, { json: d => { mgrTasks = d.data || []; }, status: () => {} }, console.error);
  await getTeamTasks({ user: managerUser, companyId, query: { isTemplate: 'true', limit: 1000 } }, { json: d => { mgrTpls = d.data || []; }, status: () => {} }, console.error);
  console.log('Manager team tasks (limit 1000):', mgrTasks.length + mgrTpls.length, '(tasks:', mgrTasks.length, 'tpls:', mgrTpls.length, ')');

  // Let's check WITHOUT limit 1000 for getTeamTasks:
  let mgrTasksNoLimit = [], mgrTplsNoLimit = [];
  await getTeamTasks({ user: managerUser, companyId, query: {} }, { json: d => { mgrTasksNoLimit = d.data || []; }, status: () => {} }, console.error);
  await getTeamTasks({ user: managerUser, companyId, query: { isTemplate: 'true' } }, { json: d => { mgrTplsNoLimit = d.data || []; }, status: () => {} }, console.error);
  console.log('Manager team tasks (no limit):', mgrTasksNoLimit.length + mgrTplsNoLimit.length);

  // 3. ManagerMyTasks (web /manager/my-tasks) or getMyManagerTasks:
  const { getMyManagerTasks } = require('./src/controllers/managerController');
  if (getMyManagerTasks) {
    let myTasks = [], myTpls = [];
    await getMyManagerTasks({ user: managerUser, companyId, query: {} }, { json: d => { myTasks = d.data || []; }, status: () => {} }, console.error);
    await getMyManagerTasks({ user: managerUser, companyId, query: { isTemplate: 'true' } }, { json: d => { myTpls = d.data || []; }, status: () => {} }, console.error);
    console.log('Manager my tasks:', myTasks.length + myTpls.length);
  }

  // Check what showed 57 vs 56:
  // Is there any query in managerController or taskController that returns 57 or 56?
  // Let's check all tasks in Task collection:
  const tasksInDb = await Task.find({ companyId }).lean();
  console.log('Total tasks in DB:', tasksInDb.length);
  console.log('Tasks with status != cancelled:', tasksInDb.filter(t => t.status !== 'cancelled').length);
  console.log('Tasks with isLive == true:', tasksInDb.filter(t => t.isLive === true).length);
  console.log('Tasks with isLive != false:', tasksInDb.filter(t => t.isLive !== false).length);

  await mongoose.disconnect();
}

testAll().catch(console.error);
