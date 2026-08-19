const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URIS = [
  process.env.MONGO_URI,
  process.env.MONGODB_URI,
  "mongodb://127.0.0.1:27017/icoded_hrms",
  "mongodb://localhost:27017/icoded_hrms",
  "mongodb+srv://developer:icodedhrms%40123@icodedhrms.dthff.mongodb.net/icoded-hrms?retryWrites=true&w=majority"
].filter(Boolean);

async function check() {
  for (const uri of MONGO_URIS) {
    try {
      console.log(`Connecting to: ${uri}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`CONNECTED SUCCESSFULLY to ${uri}`);
      
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      const employeesCollection = db.collection('employees');
      
      const totalUsers = await usersCollection.countDocuments();
      const totalEmployees = await employeesCollection.countDocuments();
      
      console.log(`--- TOTAL USERS IN DB: ${totalUsers} ---`);
      console.log(`--- TOTAL EMPLOYEES IN DB: ${totalEmployees} ---`);
      
      const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
      console.log("\nUsers breakdown by role:");
      const roleCounts = {};
      users.forEach(u => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
        console.log(`  - Name: ${u.name || u.fullName || 'N/A'}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive !== false}`);
      });
      console.log("Role Counts Summary:", roleCounts);

      await mongoose.disconnect();
      return;
    } catch (err) {
      console.log(`Failed to connect to ${uri}: ${err.message}`);
    }
  }
}

check();
