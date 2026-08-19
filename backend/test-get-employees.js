const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://rameshwarchate917_db_user:YRgyehEYhCzhDQ9r@autocrm.pwlechg.mongodb.net/autoflow_hrms?retryWrites=true&w=majority&appName=AutoCRM";

mongoose.connect(MONGODB_URI).then(async () => {
  const Department = require('./src/models/Department');
  const Designation = require('./src/models/Designation');
  const Branch = require('./src/models/Branch');
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');
  
  const companyId = new mongoose.Types.ObjectId("6a154be9586c3e7e12bedcfc");
  
  const employees = await Employee.find({ companyId })
    .select("employeeCode firstName lastName fullName email phone photo gender dateOfBirth departmentId designationId branchId status role userId managerAccessLevel accessibleDepartments")
    .populate([
      { path: "userId", select: "role" },
      { path: "departmentId", select: "name" },
      { path: "designationId", select: "name" },
      { path: "branchId", select: "branchName" },
      { path: "accessibleDepartments", select: "name" },
    ])
    .lean();

  console.log(`QUERY RESULTS: Fetched ${employees.length} employees for company ${companyId}`);
  
  const managers = employees.filter(
    (e) => e.role === "Manager" || e.userId?.role === "Manager"
  );
  
  console.log(`FILTER RESULTS: Found ${managers.length} managers`);
  managers.forEach(mgr => {
    console.log(`- Manager: ${mgr.fullName}, role: ${mgr.role}, userIdRole: ${mgr.userId?.role}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error("DB connection error:", err);
  process.exit(1);
});
