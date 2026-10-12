const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId('6a7db5defd75191d13bcd516');
  
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');
  const Task = require('./src/models/Task');
  const TaskTemplate = require('./src/models/TaskTemplate');

  const taskController = require('./src/controllers/taskController');
  const managerController = require('./src/controllers/managerController');
  const companyController = require('./src/controllers/companyController');

  const adminUser = await User.findOne({ companyId, role: { $in: ['admin', 'CompanyAdmin'] } });
  const managerUser = await User.findOne({ email: 'abhiparekar58@gmail.com' });
  const managerEmp = await Employee.findOne({ userId: managerUser._id });

  console.log('--- ADMIN SCREENS ---');
  // Admin TaskBoard
  let adminTasksRes = null;
  await taskController.getTasks({ user: adminUser, companyId, query: {} }, { json: d => adminTasksRes = d }, () => {});
  let adminTplRes = null;
  await taskController.getTasks({ user: adminUser, companyId, query: { isTemplate: true } }, { json: d => adminTplRes = d }, () => {});

  const adminRegTasks = adminTasksRes?.tasks || [];
  const adminTplTasks = adminTplRes?.tasks || [];
  console.log('Admin Tasks (reg):', adminRegTasks.length);
  console.log('Admin Templates (all):', adminTplTasks.length);
  console.log('Admin Templates (active only):', adminTplTasks.filter(t => t.isActive).length);

  // In TaskBoard.jsx:
  // tabFilteredTasks with activeTab === "All Time":
  // allTasks = [...reg, ...tpls]
  // if (task.isTemplate && activeTab !== "All Time") return false;
  console.log('TaskBoard "All Time" total:', adminRegTasks.length + adminTplTasks.length);
  console.log('TaskBoard other tabs (excluding templates):', adminRegTasks.length);
  console.log('TaskBoard + active templates:', adminRegTasks.length + adminTplTasks.filter(t => t.isActive).length);

  console.log('\n--- MANAGER SCREENS ---');
  // Manager Dashboard / Manager Team Tasks
  let mgrTeamTasksRes = null;
  await managerController.getTeamTasks({ user: managerUser, companyId, query: { limit: 1000 } }, { json: d => mgrTeamTasksRes = d }, () => {});
  let mgrTeamTplRes = null;
  await managerController.getTeamTasks({ user: managerUser, companyId, query: { isTemplate: true, limit: 1000 } }, { json: d => mgrTeamTplRes = d }, () => {});

  const mgrRegTasks = mgrTeamTasksRes?.data || [];
  const mgrTplTasks = mgrTeamTplRes?.data || [];
  console.log('Manager Team Tasks (reg):', mgrRegTasks.length);
  console.log('Manager Team Templates (all):', mgrTplTasks.length);
  console.log('Manager Team Templates (active):', mgrTplTasks.filter(t => t.isActive).length);
  console.log('Manager Team Total (reg + tpls):', mgrRegTasks.length + mgrTplTasks.length);

  // Manager My Tasks
  let mgrMyTasksRes = null;
  await managerController.getMyTasks({ user: managerUser, companyId, query: { limit: 1000 } }, { json: d => mgrMyTasksRes = d }, () => {});
  let mgrMyTplRes = null;
  await managerController.getMyTasks({ user: managerUser, companyId, query: { isTemplate: true, limit: 1000 } }, { json: d => mgrMyTplRes = d }, () => {});
  const mgrMyReg = mgrMyTasksRes?.data || [];
  const mgrMyTpl = mgrMyTplRes?.data || [];
  console.log('Manager My Tasks (reg):', mgrMyReg.length);
  console.log('Manager My Templates:', mgrMyTpl.length);
  console.log('Manager My Total:', mgrMyReg.length + mgrMyTpl.length);

  console.log('Combined Manager Tasks (distinct or sum):', (mgrRegTasks.length + mgrTplTasks.length) + (mgrMyReg.length + mgrMyTpl.length));

  // Check union of manager team and my tasks
  const allMgrTaskIds = new Set([...mgrRegTasks.map(t => t._id.toString()), ...mgrMyReg.map(t => t._id.toString())]);
  const allMgrTplIds = new Set([...mgrTplTasks.map(t => t._id.toString()), ...mgrMyTpl.map(t => t._id.toString())]);
  console.log('Manager Unique Tasks:', allMgrTaskIds.size, 'Unique Templates:', allMgrTplIds.size, 'Total Unique:', allMgrTaskIds.size + allMgrTplIds.size);

  process.exit(0);
}

run().catch(console.error);
