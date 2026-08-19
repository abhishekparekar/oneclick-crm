require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const generateToken = require("./src/utils/generateToken");


mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    // Find a company admin
    const admin = await User.findOne({ role: "CompanyAdmin" });
    if (!admin) {
      console.log("No admin found");
      process.exit(1);
    }
    
    // Find active employees for this company
    const employees = await Employee.find({ companyId: admin.companyId, status: "active" });
    const employeeIds = employees.map(e => e._id.toString());
    
    const token = generateToken(admin._id);
    console.log("Got token for admin:", admin.email);
    
    try {
      const payload = {
        month: 6,
        year: 2026,
        employeeIds,
        overrides: {}
      };
      console.log("Sending payload...");
      const res = await fetch("http://localhost:5000/api/payroll/company/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log("API Response:", res.status, data);
    } catch (err) {
      console.error("API Error:", err.response?.data || err.message);
    }
    process.exit(0);
  })
  .catch(console.error);
