/**
 * Script: Clear Location + Attendance Data for specific employees
 * Emails: viki@gmail.com, ram@gmail.com, omkar@gmail.com, abhiparekar58@gmail.com
 * Usage: node scripts/clearEmployeeData.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

// Target emails
const TARGET_EMAILS = [
  "viki@gmail.com",
  "ram@gmail.com",
  "omkar@gmail.com",
  "abhiparekar58@gmail.com",
];

async function clearData() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // ── Step 1: Find User IDs for target emails ──
    console.log("🔍 Finding users by email...");
    const users = await db
      .collection("users")
      .find({ email: { $in: TARGET_EMAILS } })
      .project({ _id: 1, email: 1 })
      .toArray();

    if (users.length === 0) {
      console.log("⚠️  No users found for given emails. Exiting.");
      process.exit(0);
    }

    const userIds = users.map((u) => u._id);
    const userEmails = users.map((u) => u.email);
    console.log(`Found ${users.length} users: ${userEmails.join(", ")}\n`);

    // ── Step 2: Find Employee IDs for those user IDs ──
    console.log("🔍 Finding employee records...");
    const employees = await db
      .collection("employees")
      .find({
        $or: [
          { userId: { $in: userIds } },
          { email: { $in: TARGET_EMAILS } },
        ],
      })
      .project({ _id: 1, email: 1, name: 1 })
      .toArray();

    const employeeIds = employees.map((e) => e._id);
    console.log(`Found ${employees.length} employee records:`);
    employees.forEach((e) => console.log(`  - ${e.name || e.email} (${e._id})`));
    console.log();

    if (employeeIds.length === 0) {
      console.log("⚠️  No employee records found. Exiting.");
      process.exit(0);
    }

    // ── Step 3: Delete EmployeeLocation records ──
    console.log("🗑️  Deleting location data (employeelocations)...");
    const locResult = await db
      .collection("employeelocations")
      .deleteMany({ employeeId: { $in: employeeIds } });
    console.log(`   ✅ Deleted ${locResult.deletedCount} location records\n`);

    // ── Step 4: Clear lastLocation from Employee documents ──
    console.log("🗑️  Clearing lastLocation from employee profiles...");
    const empLocResult = await db.collection("employees").updateMany(
      { _id: { $in: employeeIds } },
      {
        $unset: { lastLocation: "" },
      }
    );
    console.log(`   ✅ Cleared lastLocation for ${empLocResult.modifiedCount} employees\n`);

    // ── Step 5: Delete Attendance records ──
    console.log("🗑️  Deleting attendance data (attendances)...");
    const attResult = await db
      .collection("attendances")
      .deleteMany({ employeeId: { $in: employeeIds } });
    console.log(`   ✅ Deleted ${attResult.deletedCount} attendance records\n`);

    // ── Step 6: Summary ──
    console.log("══════════════════════════════════════════");
    console.log("✅ CLEANUP COMPLETE");
    console.log("══════════════════════════════════════════");
    console.log(`Employees cleaned : ${employees.length}`);
    console.log(`Location records  : ${locResult.deletedCount} deleted`);
    console.log(`Employee profiles : ${empLocResult.modifiedCount} lastLocation cleared`);
    console.log(`Attendance records: ${attResult.deletedCount} deleted`);
    console.log("══════════════════════════════════════════");

  } catch (err) {
    console.error("❌ Error during cleanup:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

clearData();
