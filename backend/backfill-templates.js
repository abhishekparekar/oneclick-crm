const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "d:/icoded softwares/HRMS/icoded-hrms/backend/.env" });

const connectDB = require("d:/icoded softwares/HRMS/icoded-hrms/backend/src/config/db");
const TaskTemplate = require("d:/icoded softwares/HRMS/icoded-hrms/backend/src/models/TaskTemplate");
const Company = require("d:/icoded softwares/HRMS/icoded-hrms/backend/src/models/Company");

const backfill = async () => {
  try {
    await connectDB();
    console.log("Connected to DB via connectDB.");

    const templates = await TaskTemplate.find({ taskId: { $exists: false } });
    console.log(`Found ${templates.length} templates without taskId.`);

    for (const template of templates) {
      const company = await Company.findById(template.companyId);
      if (company) {
        const seqNumber = (company.taskSequence || 0) + 1;
        company.taskSequence = seqNumber;
        await company.save();
        
        template.taskId = `TASK-${seqNumber.toString().padStart(4, "0")}`;
        await template.save();
        console.log(`Assigned ${template.taskId} to template ${template._id}`);
      }
    }

    console.log("Backfill complete.");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
};

backfill();
