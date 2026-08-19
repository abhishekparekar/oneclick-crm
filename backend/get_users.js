const connectDB = require("./src/config/db");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const Company = require("./src/models/Company");

async function main() {
  try {
    await connectDB();
    
    const userCount = await User.countDocuments();
    const empCount = await Employee.countDocuments();
    const companyCount = await Company.countDocuments();
    
    console.log("=== DB SUMMARY ===");
    console.log("Total Users (User collection):", userCount);
    console.log("Total Employees (Employee collection):", empCount);
    console.log("Total Companies:", companyCount);

    const users = await User.find().select("-password").lean();
    console.log("\n--- DETAILED USER LIST ---");
    users.forEach((u, i) => {
      console.log(`${i + 1}. Name: "${u.name}", Email: "${u.email}", Role: "${u.role}", Active: ${u.isActive}, CompanyId: ${u.companyId || 'None'}`);
    });

    const rolesBreakdown = {};
    users.forEach(u => {
      rolesBreakdown[u.role] = (rolesBreakdown[u.role] || 0) + 1;
    });

    console.log("\n--- USER ROLES BREAKDOWN ---");
    console.dir(rolesBreakdown);

    process.exit(0);
  } catch (err) {
    console.error("Error fetching users:", err);
    process.exit(1);
  }
}

main();
