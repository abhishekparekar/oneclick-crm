const mongoose = require("mongoose");
require("dotenv").config();

async function fixTaskIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const TaskTemplate = mongoose.connection.collection("tasktemplates");
    const CompanyTaskCounter = mongoose.connection.collection("companytaskcounters");

    // Find templates with TASK- prefix or missing taskId
    const invalidTemplates = await TaskTemplate.find({
      $or: [
        { taskId: { $regex: "^TASK-", $options: "i" } },
        { taskId: { $exists: false } },
        { taskId: null },
        { taskId: "" }
      ]
    }).toArray();

    console.log(`Found ${invalidTemplates.length} templates with invalid or duplicate TASK- prefix.`);

    for (const tpl of invalidTemplates) {
      const counter = await CompanyTaskCounter.findOneAndUpdate(
        { companyId: tpl.companyId },
        { $inc: { currentSequence: 1 } },
        { returnDocument: "after", upsert: true }
      );
      const seq = counter.currentSequence || (counter.value ? counter.value.currentSequence : 1);
      const newTaskId = `T-${seq}`;

      await TaskTemplate.updateOne(
        { _id: tpl._id },
        { $set: { taskId: newTaskId } }
      );

      console.log(`Updated Template ${tpl._id} ("${tpl.title}") from ${tpl.taskId} -> ${newTaskId}`);
    }

    console.log("Fix completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error fixing task IDs:", err);
    process.exit(1);
  }
}

fixTaskIds();
