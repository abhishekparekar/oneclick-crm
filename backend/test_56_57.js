const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/User');
  const Task = require('./src/models/Task');
  const TaskTemplate = require('./src/models/TaskTemplate');

  // Let's count tasks for company:
  const u = await User.findOne({ role: 'Manager' }).lean();
  const companyId = u.companyId;

  console.log('companyId:', companyId);

  // All tasks in company
  const allTasks = await Task.find({ companyId }).lean();
  console.log('All tasks (including cancelled):', allTasks.length);

  const notCancelled = allTasks.filter(t => t.status !== 'cancelled');
  console.log('Tasks status != cancelled:', notCancelled.length);

  const isLiveTasks = notCancelled.filter(t => t.isLive !== false);
  console.log('Tasks status != cancelled and isLive != false:', isLiveTasks.length);

  // Templates
  const allTpls = await TaskTemplate.find({ companyId }).lean();
  console.log('All templates in company:', allTpls.length);
  const activeTpls = allTpls.filter(t => t.isActive);
  console.log('Active templates in company:', activeTpls.length);

  // Look at sums:
  console.log('notCancelled + allTpls:', notCancelled.length + allTpls.length);
  console.log('notCancelled + activeTpls:', notCancelled.length + activeTpls.length);
  console.log('isLiveTasks + allTpls:', isLiveTasks.length + allTpls.length);
  console.log('isLiveTasks + activeTpls:', isLiveTasks.length + activeTpls.length);

  // Check how many have isGeneratedFromTemplate:
  const fromTpl = notCancelled.filter(t => t.isGeneratedFromTemplate || t.parentTemplateId);
  console.log('from template:', fromTpl.length);

  // Check manager tasks:
  const Employee = require('./src/models/Employee');
  const mgr = await Employee.findOne({ userId: u._id }).lean();
  const mgrTargetIds = [u._id.toString(), mgr._id.toString()];

  // Check how many tasks are visible to manager:
  const { getManagerTeamEmployeeIds } = require('./src/controllers/managerController');
  const teamEmpIds = await getManagerTeamEmployeeIds(mgr._id, companyId);
  console.log('teamEmpIds count:', teamEmpIds.length);

  await mongoose.disconnect();
}

check().catch(console.error);
