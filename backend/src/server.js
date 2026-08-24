require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const apiRoutes = require("./routes/index");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { apiResponse } = require("./middleware/apiResponse");

connectDB();

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

if (!isVercel) {
  const { initCronJobs } = require("./cron/taskCron");
  const { initAttendanceCron } = require("./cron/attendanceCron");
  const initReminderCron = require("./utils/reminderCron");
  const { initCron } = require("./cron/dailyNotifications");
  const { initMissingCheckoutCron } = require("./cron/missingCheckoutCron");
  initCronJobs();
  initAttendanceCron();
  initReminderCron();
  initCron();
  initMissingCheckoutCron();
}


const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, access-control-request-private-network");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use((req, res, next) => {
  ["body", "params", "headers"].forEach((key) => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  next();
});

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.originalUrl}`);
    if (req.query && Object.keys(req.query).length) {
      console.log("  query:", req.query);
    }
    if (req.body && Object.keys(req.body).length) {
      console.log("  body:", req.body);
    }
    if (req.params && Object.keys(req.params).length) {
      console.log("  params:", req.params);
    }
    next();
  });
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 100 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  })
);
app.use(morgan("dev"));
app.use(apiResponse);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Oneclick API" });
});

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

if (!isVercel) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
  });

  const io = require("./socket").init(server);
  io.on("connection", (socket) => {
    console.log("[Socket] Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("[Socket] Client disconnected:", socket.id);
    });
  });
}

module.exports = app;
