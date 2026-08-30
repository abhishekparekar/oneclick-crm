const mongoose = require("mongoose");
const dns = require("dns");

// Force Node.js to use public DNS servers (fixes Windows querySrv ECONNREFUSED for MongoDB Atlas)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("[DB] Could not custom set DNS servers:", e.message);
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

  const defaultUri = "mongodb+srv://Abhiparekar58:Abhi%408485@oneclick.zy12ers.mongodb.net/icoded_hrms?retryWrites=true&w=majority";
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri || mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost")) {
    mongoUri = defaultUri;
  }

  const poolOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    console.log("[DB] Connecting to MongoDB Atlas Cloud...");
    const conn = await mongoose.connect(mongoUri, poolOptions);
    isConnected = conn.connections[0].readyState === 1;
    console.log("[DB] Connected to MongoDB Atlas Cloud");
    seedInitialData().catch(err => console.warn("[DB Seed Warning]:", err.message));
  } catch (error) {
    console.error("[DB Connection Error]:", error.message);
    if (mongoUri !== defaultUri) {
      try {
        console.log("[DB] Retrying connection with default MongoDB Atlas URI...");
        const conn = await mongoose.connect(defaultUri, poolOptions);
        isConnected = conn.connections[0].readyState === 1;
        console.log("[DB] Connected to MongoDB Atlas Cloud (fallback)");
      } catch (fallbackErr) {
        console.error("[DB Fallback Error]:", fallbackErr.message);
      }
    }
  }
};

module.exports = connectDB;
