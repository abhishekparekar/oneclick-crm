const jwt = require("jsonwebtoken");
const User = require("../models/User");
const connectDB = require("../config/db");

const protect = async (req, res, next) => {
  let token;

  // Ensure DB connection is active for serverless/cold starts
  await connectDB();

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      const secret = process.env.JWT_SECRET || "oneclick_secret_key_2026";
      const decoded = jwt.verify(token, secret);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        console.warn("[Auth Middleware] User not found for ID:", decoded.id);
        return res.status(401).json({ message: "User not found" });
      }

      if (req.user.isActive === false) {
        console.warn("[Auth Middleware] Account is inactive for user:", req.user.email);
        return res.status(401).json({ message: "Account is deactivated" });
      }

      console.log("[Auth Middleware] Auth success for user:", req.user.email, "- Role:", req.user.role);
      return next();
    } catch (error) {
      console.error("[Auth Middleware] Token verification failed:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  console.warn("[Auth Middleware] No authorization header provided");
  return res.status(401).json({ message: "Not authorized, no token" });
};

module.exports = { protect };
