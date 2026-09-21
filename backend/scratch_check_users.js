const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = require('./src/models/User');
  const Employee = require('./src/models/Employee');
  
  const users = await User.find({}).sort({ updatedAt: -1 }).limit(15).lean();
  console.log('Recent Users:');
  for (const u of users) {
    console.log({
      id: u._id,
      email: u.email,
      role: u.role,
      name: u.name,
      companyId: u.companyId,
      status: u.status,
      isActive: u.isActive
    });
  }
  process.exit(0);
}
checkUsers().catch(e => { console.error(e); process.exit(1); });
