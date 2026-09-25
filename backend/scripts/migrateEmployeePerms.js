const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const emps = await Employee.find({ role: 'Employee' }).lean();
    let updatedCount = 0;

    for (const emp of emps) {
      const rawAssigned = emp.assignedModules || [];
      const assignedMods = Array.isArray(rawAssigned) ? rawAssigned.map(m => String(m).toLowerCase().trim()) : [];
      const hasTasks = assignedMods.length === 0 || assignedMods.includes('tasks') || assignedMods.includes('task');
      const hasLeads = assignedMods.includes('leads') || assignedMods.includes('lead');

      let curPerm = emp.permissions || {};
      let changed = false;

      // Check tasks
      if (hasTasks) {
        if (!curPerm.tasks || (curPerm.tasks.create === false && curPerm.tasks.edit === false && !curPerm.tasks.assign)) {
          curPerm.tasks = {
            ...(curPerm.tasks || {}),
            view: true,
            create: true,
            edit: true,
          };
          changed = true;
        }
      }

      // Check leads
      if (hasLeads) {
        if (!curPerm.leads || (!curPerm.leads.create && !curPerm.leads.edit && !curPerm.leads.assignLeads)) {
          curPerm.leads = {
            view: true,
            create: true,
            edit: true,
            delete: false,
            assignLeads: false,
            campaigns: false,
            ...(curPerm.leads || {}),
            view: true,
            create: true,
            edit: true,
          };
          changed = true;
        }
      }

      if (changed) {
        console.log('Updated employee:', emp.employeeCode, emp.firstName, emp.lastName);
        console.log('  Tasks:', JSON.stringify(curPerm.tasks));
        console.log('  Leads:', JSON.stringify(curPerm.leads));
        await Employee.updateOne({ _id: emp._id }, { $set: { permissions: curPerm } });
        if (emp.userId) {
          await User.updateOne({ _id: emp.userId }, { $set: { permissions: curPerm } });
        }
        updatedCount++;
      }
    }

    console.log('Finished updating employees:', updatedCount);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
})();
