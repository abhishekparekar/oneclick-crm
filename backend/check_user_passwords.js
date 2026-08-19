const connectDB = require("./src/config/db");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");

async function check() {
  try {
    await connectDB();
    const users = await User.find().lean();
    console.log("=== ALL REGISTERED USERS ===");
    for (const u of users) {
      console.log(`ID: ${u._id} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
    }

    const employees = await Employee.find().lean();
    console.log("\n=== ALL REGISTERED EMPLOYEES ===");
    for (const e of employees) {
      console.log(`ID: ${e._id} | Name: ${e.firstName} ${e.lastName} | Email: ${e.email} | Code: ${e.employeeCode} | UserId: ${e.userId}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
