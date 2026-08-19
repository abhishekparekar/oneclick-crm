require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Announcement = require('./src/models/Announcement');
  
  // Create a test announcement exactly as the controller does
  const doc = await Announcement.create({
    title: 'Test direct save',
    message: 'Testing',
    targetType: 'selectedCompany',
    targetCompanies: ['6a53965f547a9304fb8a4dde'],
    status: 'published',
    createdBy: '6a53965f547a9304fb8a4ddf',
    companyId: '6a53965f547a9304fb8a4dde'
  });
  console.log("Created Document:", JSON.stringify(doc, null, 2));
  
  // Fetch the recently created document
  const recent = await Announcement.findById(doc._id).lean();
  console.log("Fetched Document:", JSON.stringify(recent, null, 2));
  
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});
