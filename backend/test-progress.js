const mongoose = require("mongoose");
const Task = require("./src/models/Task");
const Project = require("./src/models/Project");

mongoose.connect("mongodb+srv://rameshwarchate917_db_user:YRgyehEYhCzhDQ9r@autocrm.pwlechg.mongodb.net/autoflow_hrms?retryWrites=true&w=majority&appName=AutoCRM")
  .then(async () => {
    console.log("Connected to DB");
    
    // Find all projects
    const projects = await Project.find().lean();
    console.log(`Found ${projects.length} projects`);
    
    // Find all tasks
    const tasks = await Task.find().lean();
    console.log(`Found ${tasks.length} tasks`);
    
    tasks.forEach(t => {
      console.log(`Task: ${t.title} | Project: ${t.projectId} | Status: ${t.status}`);
    });
    
    for (const p of projects) {
      const projTasks = tasks.filter(t => {
        const tPid = t.projectId ? t.projectId.toString() : null;
        const pid = p._id.toString();
        return tPid === pid;
      });
      
      const completedTasks = projTasks.filter(t => t.status === "completed").length;
      const progress = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;
      
      console.log(`Project: ${p.name} (Status: ${p.status})`);
      console.log(`- Tasks: ${projTasks.length}`);
      console.log(`- Completed: ${completedTasks}`);
      console.log(`- Progress: ${progress}%`);
      console.log("-------------------");
    }
    
    process.exit(0);
  });
