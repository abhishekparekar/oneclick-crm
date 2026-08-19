require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log("=== USERS ===");
  const users = await db.collection("users").find({}, { projection: { password: 0 } }).toArray();
  users.forEach(u => console.log(JSON.stringify({
    _id: u._id, email: u.email, role: u.role,
    companyId: u.companyId, name: u.name, full_name: u.full_name,
    isActive: u.isActive, isPasswordResetRequired: u.isPasswordResetRequired
  })));

  console.log("\n=== COMPANIES ===");
  const companies = await db.collection("companies").find({}).toArray();
  companies.forEach(c => console.log(JSON.stringify({ _id: c._id, companyName: c.companyName, email: c.email })));

  console.log("\n=== EMPLOYEES ===");
  const emps = await db.collection("employees").find({}).toArray();
  emps.forEach(e => console.log(JSON.stringify({
    _id: e._id, employeeCode: e.employeeCode, firstName: e.firstName, lastName: e.lastName,
    companyId: e.companyId, userId: e.userId, departmentId: e.departmentId
  })));

  console.log("\n=== DEPARTMENTS ===");
  const depts = await db.collection("departments").find({}).toArray();
  depts.forEach(d => console.log(JSON.stringify({ _id: d._id, name: d.name, companyId: d.companyId })));

  console.log("\n=== BRANCHES ===");
  const branches = await db.collection("branches").find({}).toArray();
  branches.forEach(b => console.log(JSON.stringify({ _id: b._id, branchName: b.branchName, companyId: b.companyId })));

  console.log("\n=== DESIGNATIONS ===");
  const desigs = await db.collection("designations").find({}).toArray();
  desigs.forEach(d => console.log(JSON.stringify({ _id: d._id, name: d.name, companyId: d.companyId, departmentId: d.departmentId })));

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
