const axios = require("axios");

async function run() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: "icoded@gmail.com", // Assuming this is the company admin email
      password: "password123" // Guessing password or we need another way to get token
    });
    
    console.log("Login Success");
  } catch (err) {
    console.error("Login Error:", err.response?.data || err.message);
  }
}
run();
