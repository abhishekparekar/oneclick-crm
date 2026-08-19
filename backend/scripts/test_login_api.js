const http = require("http");

const data = JSON.stringify({
  email: "anita@gmail.com",
  password: "123456"
});

const options = {
  hostname: "127.0.0.1",
  port: 5000,
  path: "/api/auth/login",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", (e) => {
  console.error("HTTP Request Error:", e);
});

req.write(data);
req.end();
