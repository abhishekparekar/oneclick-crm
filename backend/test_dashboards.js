const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId('6a7db5defd75191d13bcd516');
  const Task = require('./src/models/Task');
  const TaskTemplate = require('./src/models/TaskTemplate');
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');

  const totalTasks = await Task.countDocuments({ companyId });
  const nonCancelledTasks = await Task.countDocuments({ companyId, status: { $ne: 'cancelled' } });
  const liveNonCancelled = await Task.countDocuments({ companyId, isLive: { $ne: false }, status: { $ne: 'cancelled' } });
  const totalTemplates = await TaskTemplate.countDocuments({ companyId });
  const activeTemplates = await TaskTemplate.countDocuments({ companyId, isActive: true });

  console.log('Counts:', { totalTasks, nonCancelledTasks, liveNonCancelled, totalTemplates, activeTemplates });

  // Now check manager
  const user = await User.findOne({ email: 'abhiparekar58@gmail.com' });
  const emp = await Employee.findOne({ userId: user._id });
  console.log('Manager user:', user._id, 'emp:', emp._id);

  // Manager dashboard summary
  const managerController = require('./src/controllers/managerController');
  const companyController = require('./src/controllers/companyController');

  // simulate manager req
  const reqManager = {
    user: { _id: user._id, email: user.email, role: user.role, employeeId: emp._id },
    companyId,
    query: {}
  };
  let managerResData = null;
  const resManager = {
    json: (data) => { managerResData = data; return resManager; },
    status: () => resManager
  };
  await managerController.getManagerDashboardSummary(reqManager, resManager, (err) => console.error('Manager dash err:', err));

  // simulate admin req
  const adminUser = await User.findOne({ companyId, role: { $in: ['admin', 'CompanyAdmin'] } });
  console.log('Admin user:', adminUser ? adminUser.email : 'none');
  const reqAdmin = {
    user: adminUser,
    companyId,
    query: {}
  };
  let adminResData = null;
  const resAdmin = {
    json: (data) => { adminResData = data; return resAdmin; },
    status: () => resAdmin
  };
  await companyController.getCompanyDashboard(reqAdmin, resAdmin, (err) => console.error('Admin dash err:', err));

  console.log('Manager dash tasks summary:', managerResData?.data?.taskSummary);
  console.log('Admin dash kpis totalTasks:', adminResData?.data?.kpis?.totalTasks, 'taskStats:', adminResData?.data?.taskStats);

  // Also check getManagerTeamTasksApi
  let teamTasksData = null;
  const resTeam = {
    json: (data) => { teamTasksData = data; return resTeam; },
    status: () => resTeam
  };
  await managerController.getTeamTasks({ ...reqManager, query: { limit: 1000 } }, resTeam, (err) => console.error('Team tasks err:', err));
  
  let teamTplData = null;
  const resTpl = {
    json: (data) => { teamTplData = data; return resTpl; },
    status: () => resTpl
  };
  await managerController.getTeamTasks({ ...reqManager, query: { isTemplate: true, limit: 1000 } }, resTpl, (err) => console.error('Team tpl err:', err));

  console.log('Manager getTeamTasks count:', teamTasksData?.count, 'templates count:', teamTplData?.count, 'sum:', (teamTasksData?.count || 0) + (teamTplData?.count || 0));

  // Also check admin getTasks
  const taskController = require('./src/controllers/taskController');
  let adminTasksData = null;
  const resAdminTasks = {
    json: (data) => { adminTasksData = data; return resAdminTasks; },
    status: () => resAdminTasks
  };
  await taskController.getTasks({ ...reqAdmin, query: {} }, resAdminTasks, (err) => console.error('Admin tasks err:', err));

  let adminTplData = null;
  const resAdminTpl = {
    json: (data) => { adminTplData = data; return resAdminTpl; },
    status: () => resAdminTpl
  };
  await taskController.getTasks({ ...reqAdmin, query: { isTemplate: true } }, resAdminTpl, (err) => console.error('Admin tpl err:', err));

  console.log('Admin getTasks count:', adminTasksData?.totalCount, adminTasksData?.tasks?.length, 'tpl count:', adminTplData?.totalCount, adminTplData?.tasks?.length);

  process.exit(0);
}

run().catch(console.error);
