const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://rameshwarchate917_db_user:YRgyehEYhCzhDQ9r@autocrm.pwlechg.mongodb.net/autoflow_hrms?retryWrites=true&w=majority&appName=AutoCRM";

mongoose.connect(MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String,
    companyId: mongoose.Schema.Types.ObjectId
  }));
  const Employee = mongoose.model('Employee', new mongoose.Schema({
    fullName: String,
    email: String,
    role: String,
    companyId: mongoose.Schema.Types.ObjectId,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }));
  const Company = mongoose.model('Company', new mongoose.Schema({
    companyName: String
  }));
  
  const companies = await Company.find().lean();
  console.log("COMPANIES:");
  companies.forEach(c => console.log(`- ${c.companyName} (_id: ${c._id})`));

  const employees = await Employee.find().populate('userId').lean();
  console.log(`\nFOUND ${employees.length} EMPLOYEES:`);
  employees.forEach(e => {
    console.log(`- Name: ${e.fullName}, Email: ${e.email}, EmpRole: ${e.role}, UserRole: ${e.userId?.role}, CompanyId: ${e.companyId}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error("DB connection error:", err);
  process.exit(1);
});
