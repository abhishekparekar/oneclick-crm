const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const uri = 'mongodb+srv://Abhiparekar58:Abhi%408485@oneclick.zy12ers.mongodb.net/icoded_hrms?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const managerEmpId = new mongoose.Types.ObjectId('6a7db72afd75191d13bcd51f');
  const managerUserId = new mongoose.Types.ObjectId('6a7db729fd75191d13bcd51e');
  const companyId = new mongoose.Types.ObjectId('6a7db5defd75191d13bcd516');

  // Get all tasks for company
  const tasks = await db.collection('tasks').find({ companyId, status: { $ne: 'cancelled' } }).toArray();
  console.log('Total active tasks in company:', tasks.length);

  // Check how many are assigned to manager
  const myTasks = tasks.filter(t => {
    const assignedArr = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
    return assignedArr.some(id => id.toString() === managerEmpId.toString() || id.toString() === managerUserId.toString());
  });
  console.log('Tasks assigned to Manager (my tasks):', myTasks.length);

  // Check manager employee record
  const managerEmp = await db.collection('employees').findOne({ _id: managerEmpId });
  console.log('Manager dept:', managerEmp.departmentId, 'accessible:', managerEmp.accessibleDepartments);

  // Find team members
  const teamMembers = await db.collection('employees').find({
    companyId,
    $or: [
      { reportingManagerId: managerEmpId },
      { departmentId: managerEmp.departmentId },
      { departmentId: { $in: managerEmp.accessibleDepartments || [] } }
    ]
  }).toArray();
  console.log('Team members count:', teamMembers.length);
  const teamMemberIds = teamMembers.map(e => e._id.toString());
  console.log('Team members:', teamMembers.map(e => `${e.firstName} ${e.lastName} (${e._id})`));

  // Team tasks
  const teamTasks = tasks.filter(t => {
    if (t.assignmentType === 'self') return false;
    const assignedArr = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
    if (assignedArr.length === 0) return true; // unassigned
    const hasTeamMember = assignedArr.some(id => teamMemberIds.includes(id.toString()));
    const allManager = assignedArr.every(id => id.toString() === managerEmpId.toString() || id.toString() === managerUserId.toString());
    return hasTeamMember && !allManager;
  });
  console.log('Team tasks count:', teamTasks.length);
  for (const t of teamTasks) {
    console.log(`- [${t.taskId}] "${t.title}" | assignedTo: ${JSON.stringify(t.assignedTo)} | status: ${t.status}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
