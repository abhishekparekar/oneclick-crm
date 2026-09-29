const mongoose = require("mongoose");
const dns = require("dns");

// Force Node.js to use public DNS servers only on Windows (fixes Windows querySrv ECONNREFUSED for MongoDB Atlas)
if (process.platform === "win32") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (e) {
    console.warn("[DB] Could not custom set DNS servers:", e.message);
  }
}

const seedInitialData = async () => {
  try {
    const User = require("../models/User");
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("[DB] No users found. Creating initial admin accounts...");
      
      const password = process.env.SEED_SUPERADMIN_PASSWORD || "Admin@123";

      await User.create({
        name: "ICoded Admin",
        email: "icoded@gmail.com",
        phone: "1234567890",
        password,
        role: "SuperAdmin",
        isPrimaryAdmin: true,
      });

      await User.create({
        name: "Super Admin",
        email: "admin@example.com",
        phone: "0987654321",
        password,
        role: "SuperAdmin",
        isPrimaryAdmin: true,
      });

      console.log("[DB] ✓ Created admin accounts:");
      console.log("     - Email: icoded@gmail.com / Password:", password);
      console.log("     - Email: admin@example.com / Password:", password);
    }
  } catch (seedErr) {
    console.warn("[DB] Note on initial seeding:", seedErr.message);
  }
};

let isConnected = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || isConnected) {
    return;
  }

  const defaultUri = "mongodb://127.0.0.1:27017/icoded_hrms";
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || defaultUri;

  const poolOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    const isLocal = mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost");
    console.log(`[DB] Connecting to MongoDB (${isLocal ? "Local VPS MongoDB" : mongoUri})...`);
    const conn = await mongoose.connect(mongoUri, poolOptions);
    isConnected = conn.connections[0].readyState === 1;
    console.log(`[DB] Connected successfully to ${isLocal ? "Local VPS MongoDB" : "Database"}`);
    seedInitialData().catch(err => console.warn("[DB Seed Warning]:", err.message));
  } catch (error) {
    console.error("[DB Connection Error]:", error.message);
  }
};

module.exports = connectDB;
