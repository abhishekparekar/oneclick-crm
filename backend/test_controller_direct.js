const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const uri = "mongodb+srv://Abhiparekar58:Abhi%408485@oneclick.zy12ers.mongodb.net/icoded_hrms?retryWrites=true&w=majority";

async function test() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Load all models
  const modelsDir = path.join(__dirname, 'src/models');
  fs.readdirSync(modelsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        require(path.join(modelsDir, file));
      } catch (e) {}
    }
  });

  const { getTeamTasks, getMyTasks, resolveManagerEmployee, getManagerTeamEmployeeIds } = require('./src/controllers/managerController');
  const User = mongoose.model('User');
  const user = await User.findOne({ name: /abhishek/i }).lean();

  const req = {
    user,
    companyId: user.companyId,
    query: { limit: 200 }
  };

  const manager = await resolveManagerEmployee(req);
  console.log('Resolved manager:', manager.firstName + ' ' + manager.lastName);

  const teamIds = await getManagerTeamEmployeeIds(manager._id, user.companyId);
  console.log('Team IDs count:', teamIds.length);

  const res = {
    status: (s) => { console.log('status:', s); return res; },
    json: (data) => {
      console.log('getTeamTasks success:', data.success, 'count:', data.count, 'tasks len:', data.tasks?.length);
      if (data.tasks) {
        data.tasks.forEach(t => {
          const assignees = (t.assignedTo || []).map(a => a?.fullName || a?.firstName || a?.name || a?._id || a);
          console.log(`  [${t.taskId}] ${t.title} -> [${assignees.join(', ')}] (${t.status})`);
        });
      }
    }
  };

  await getTeamTasks(req, res, (err) => console.error('Next err:', err));

  const myRes = {
    status: (s) => { console.log('my status:', s); return myRes; },
    json: (data) => {
      console.log('getMyTasks count:', data.data?.length);
    }
  };
  await getMyTasks(req, myRes, (err) => console.error('My Next err:', err));

  await mongoose.disconnect();
  process.exit(0);
}

test().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
