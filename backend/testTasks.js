const mongoose = require("mongoose");
const Task = require("./src/models/Task");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("Connected to DB");
  
  const tasks = await Task.find({ isRecurringTemplate: { $ne: true } }).lean();
  console.log("Total normal tasks:", tasks.length);
  
  const recTasks = await Task.find({ isRecurringTemplate: true }).lean();
  console.log("Total recurring tasks:", recTasks.length);

  process.exit(0);
}).catch(console.error);
