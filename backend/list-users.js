const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://rameshwarchate917_db_user:YRgyehEYhCzhDQ9r@autocrm.pwlechg.mongodb.net/autoflow_hrms?retryWrites=true&w=majority&appName=AutoCRM";

mongoose.connect(MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    companyId: mongoose.Schema.Types.ObjectId
  }));
  
  const users = await User.find().lean();
  console.log(`FOUND ${users.length} USERS:`);
  users.forEach(u => {
    console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, CompanyId: ${u.companyId}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error("DB connection error:", err);
  process.exit(1);
});
