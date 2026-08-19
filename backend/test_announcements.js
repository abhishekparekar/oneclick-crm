const mongoose = require("mongoose");
const Announcement = require("./src/models/Announcement");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("Connected to DB");
  
  const allAnn = await Announcement.find({}).lean();
  console.log("All Announcements:", JSON.stringify(allAnn, null, 2));

  // Let's take the first one and test the query manually
  if (allAnn.length > 0) {
     const companyId = allAnn[0].companyId;
     
     const match = await Announcement.find({
       status: "published",
       $or: [
         { targetType: "allEmployees" },
         { targetType: "selectedCompany", targetCompanies: companyId },
         { targetType: "roleBased", targetRoles: "Employee" }
       ]
     });
     
     console.log("Matched with Employee filter:", match.length);
  }

  process.exit(0);
});
