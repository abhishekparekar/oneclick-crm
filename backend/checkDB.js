const mongoose = require("mongoose");
const Attendance = require("./src/models/Attendance");
const Task = require("./src/models/Task");

mongoose.connect("mongodb+srv://developer:icodedhrms%40123@icodedhrms.dthff.mongodb.net/icoded-hrms?retryWrites=true&w=majority")
  .then(async () => {
    const today = new Date().toISOString().slice(0, 10);
    console.log("Today:", today);
    const counts = await Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    console.log("All Attendance Counts:", counts);
    const todayCounts = await Attendance.aggregate([{ $match: { date: today } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    console.log("Today Attendance Counts:", todayCounts);

    const taskCounts = await Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    console.log("Task Counts:", taskCounts);
    
    process.exit(0);
  });
