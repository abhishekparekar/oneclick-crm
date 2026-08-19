require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Announcement = require('./src/models/Announcement');
  
  const companyIdStr = '6a53965f547a9304fb8a4dde';
  
  const filter = {
    status: 'published',
    $or: [
      { targetType: 'allEmployees' },
      { targetType: 'selectedCompany', targetCompanies: companyIdStr },
      { targetType: 'roleBased', targetRoles: 'Employee' }
    ]
  };
  
  const results = await Announcement.find(filter).lean();
  console.log("Found matches:", results.length);
  console.log(JSON.stringify(results, null, 2));
  
  process.exit();
});
