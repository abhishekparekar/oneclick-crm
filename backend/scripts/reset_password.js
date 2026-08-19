const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("Could not set DNS servers:", e.message);
}

const User = require("../src/models/User");

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://Abhiparekar58:Abhi%408485@oneclick.zy12ers.mongodb.net/icoded_hrms?retryWrites=true&w=majority";

async function resetPassword() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas Cloud");

    const email = "anita@gmail.com";
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });

    if (!user) {
      console.log(`User with email "${email}" not found. Listing all users...`);
      const allUsers = await User.find({}, "name email role isActive");
      console.log("Existing users in DB:", allUsers);
      return;
    }

    console.log(`Found user: ${user.name} (${user.email}), Role: ${user.role}, Active: ${user.isActive}`);
    
    // Set new password
    user.password = "123456";
    user.isActive = true;
    await user.save();

    console.log(`Password for "${user.email}" has been successfully updated to: 123456`);

    // Verify
    const verifyUser = await User.findOne({ email: user.email });
    const isMatch = await verifyUser.matchPassword("123456");
    console.log(`Verification: Password match test with "123456" -> ${isMatch}`);

  } catch (error) {
    console.error("Error resetting password:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetPassword();
