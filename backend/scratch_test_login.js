const mongoose = require('mongoose');
require('dotenv').config();

async function testLoginReturn() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  require('./src/models/Department');
  require('./src/models/Designation');
  require('./src/models/Branch');
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');
  const { getUserPermissions } = require('./src/utils/permissionCheck');
  const formatUser = require('./src/utils/formatUser');
  
  const user = await User.findOne({ email: 'omkar@gmail.com' });
  console.log('User:', { id: user._id, email: user.email, role: user.role });
  
  const userObj = formatUser(user);
  console.log('Formatted user role:', userObj.role);
  
  const permissions = await getUserPermissions(user._id, user.companyId, user.role, user);
  userObj.permissions = permissions;
  
  const employee = await Employee.findOne({
    $or: [
      { userId: user._id },
      { email: user.email?.toLowerCase() }
    ],
    companyId: user.companyId
  })
    .populate("departmentId", "name")
    .populate("departmentIds", "name")
    .populate("accessibleDepartments", "name")
    .populate("designationId", "name")
    .populate("branchId", "branchName name")
    .populate("branchIds", "branchName name")
    .lean();

  console.log('Employee found:', Boolean(employee));
  if (employee) {
    console.log('Employee dept:', employee.departmentId);
    console.log('Employee designation:', employee.designationId);
  }
  console.log('SUCCESS! Login works when models are registered!');

  process.exit(0);
}
testLoginReturn().catch(e => { console.error('Error during testLogin:', e); process.exit(1); });
