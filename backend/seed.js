require("dotenv").config();
const connectDB = require("./src/config/db");
const User = require("./src/models/User");

const run = async () => {
  try {
    console.log("[Seed] Connecting to database...");
    await connectDB();
    console.log("[Seed] Database connected");

    console.log("[Seed] Checking for existing SuperAdmin...");
    const existingAdmin = await User.findOne({ role: "SuperAdmin" });
    if (existingAdmin) {
      console.log("[Seed] SuperAdmin account already exists:", existingAdmin.email);
      console.log("[Seed] User ID:", existingAdmin._id);
      console.log("[Seed] Skipping seed.");
      process.exit(0);
    }

    const password = process.env.SEED_SUPERADMIN_PASSWORD || "Admin@123";
    console.log("[Seed] Creating SuperAdmin account...");
    console.log("[Seed] Email: admin@example.com");
    console.log("[Seed] Password: ", password === "Admin@123" ? "Admin@123 (default)" : "custom (from .env)");

    const superAdmin = await User.create({
      name: "Super Admin",
      email: "admin@example.com",
      phone: "",
      password,
      role: "SuperAdmin",
      companyId: null,
    });

    console.log("[Seed] ✓ SuperAdmin account created successfully");
    console.log("[Seed] Email:", superAdmin.email);
    console.log("[Seed] User ID:", superAdmin._id);
    console.log("[Seed] Password:", password === "Admin@123" ? "Admin@123" : "custom");
    process.exit(0);
  } catch (error) {
    console.error("[Seed] ✗ Seed failed:", error.message);
    console.error("[Seed] Stack trace:", error.stack);
    process.exit(1);
  }
};

run();
