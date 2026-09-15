const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const connectDB = require("../config/db");

// ─── Helper: SHA-256 hash of a token ─────────────────────────────────────────
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// ─── Helper: detect platform from request header ──────────────────────────────
// Clients must send X-Platform: "web" or "mobile" on every request.
// Falls back to "web" if header is missing (backward compatibility).
const detectPlatform = (req) => {
  const p = (req.headers["x-platform"] || "web").toLowerCase().trim();
  return p === "mobile" ? "mobile" : "web";
};

// ─── Roles that bypass per-platform session enforcement ───────────────────────
const BYPASS_SESSION_ENFORCEMENT = ["SuperAdmin", "SubSuperAdmin"];

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

      // ─── One User One Login Per Platform — Session Validation ─────────────
      // Skip enforcement for SuperAdmin / SubSuperAdmin (system managers)
      if (!BYPASS_SESSION_ENFORCEMENT.includes(req.user.role)) {
        const platform = detectPlatform(req);
        const incomingHash = hashToken(token);
        const storedHash =
          platform === "mobile"
            ? req.user.activeMobileToken
            : req.user.activeWebToken;

        // If a stored active token exists and doesn't match the incoming token,
        // this session has been superseded or invalidated → force logout
        if (storedHash && storedHash !== incomingHash) {
          console.warn(
            `[Auth Middleware] Session invalidated for user: ${req.user.email} on platform: ${platform}`
          );
          return res.status(401).json({
            message:
              "Your session is no longer active. Please log in again.",
            code: "SESSION_INVALIDATED",
          });
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      req.platform = detectPlatform(req);
      console.log(
        `[Auth Middleware] Auth success for user: ${req.user.email} - Role: ${req.user.role} - Platform: ${req.platform}`
      );
      return next();
    } catch (error) {
      console.error("[Auth Middleware] Token verification failed:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  console.warn("[Auth Middleware] No authorization header provided");
  return res.status(401).json({ message: "Not authorized, no token" });
};

module.exports = { protect, hashToken, detectPlatform };
