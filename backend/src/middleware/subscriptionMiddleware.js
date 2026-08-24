const Subscription = require("../models/Subscription");

/**
 * SUBSCRIPTION SECURITY DESIGN
 * ─────────────────────────────
 * The middleware uses req.baseUrl + req.path (the FULL path after /api)
 * because req.path alone is RELATIVE to the router mount point.
 *
 * Examples:
 *   POST /api/tasks         → baseUrl="/tasks"       path="/"
 *   POST /api/attendance/punch-in → baseUrl="/attendance"  path="/punch-in"
 *   POST /api/tasks/abc123/complete → baseUrl="/tasks"  path="/abc123/complete"
 *
 * Security rules:
 *   1. GETs always pass (read-only — always show data in UI)
 *   2. SuperAdmin always passes
 *   3. Core employee self-service writes ALWAYS pass (bypass list)
 *   4. All other writes require active + paid subscription
 */

// Build the full logical path from baseUrl + path or originalUrl
const getFullPath = (req) => {
  if (req.originalUrl) {
    return req.originalUrl.replace(/^\/api/, "").split("?")[0];
  }
  const base = req.baseUrl || "";
  const p = req.path === "/" ? "" : (req.path || "");
  return base + p;
};

// These writes must ALWAYS work regardless of subscription state.
const ALWAYS_ALLOWED = [
  // ── Auth & device ──────────────────────────────────────────────────────────
  (f) => f.startsWith("/auth/"),
  (f) => f.endsWith("/register-device"),

  // ── Attendance (core clock-in/out) ─────────────────────────────────────────
  (f) => f === "/attendance/punch-in",
  (f) => f === "/attendance/punch-out",
  (f) => f === "/attendance/validate-location",
  (f) => f === "/attendance/regularization",

  // ── Task media upload ───────────────────────────────────────────────────
  (f) => ["/tasks/upload-media", "/company/tasks/upload-media"].includes(f),

  // ── Task WORKFLOW actions on existing tasks (employee/manager self-service) ─
  // Matches: POST|PATCH /tasks/<mongoId>/<action>
  (f) => /^\/tasks\/[a-f0-9]{24}\/(in-process|in_process|in-progress|complete|completed|late-complete|late_complete|reopen|re-in-process|re_in_process|re-complete|re_complete|re-late-complete|re_late_complete|shift|cancel|submit-followup|comments|attachments|daily-report|checklist)/.test(f),

  // ── Leave self-service ─────────────────────────────────────────────────────
  (f) => /^\/employee\/leaves\/(apply|[a-f0-9]{24}\/cancel)$/.test(f),

  // ── Notifications (read/mark) ──────────────────────────────────────────────
  (f) => f.startsWith("/notifications/"),

  // ── Employee profile self-update ───────────────────────────────────────────
  (f) => ["/employee/update-profile", "/employee/complete-profile", "/employee/profile-draft"].includes(f),

  // ── Announcement read-marks ────────────────────────────────────────────────
  (f) => /^\/company\/announcements\/[a-f0-9]{24}\/read$/.test(f),

  // ── AI Intelligence Actions & Reports ──────────────────────────────────────
  (f) => f.startsWith("/ai"),
];

const isAlwaysAllowed = (req) => {
  const full = getFullPath(req);
  return ALWAYS_ALLOWED.some((fn) => fn(full));
};

// ── 60-second in-memory subscription cache (avoids DB hit per request) ───────
const subCache = new Map(); // companyId.toString() -> { sub, expiresAt }
const CACHE_TTL_MS = 60_000;

const getSubscription = async (companyId) => {
  const key = companyId.toString();
  const now = Date.now();
  const cached = subCache.get(key);
  if (cached && cached.expiresAt > now) return cached.sub;
  const sub = await Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean();
  subCache.set(key, { sub, expiresAt: now + CACHE_TTL_MS });
  return sub;
};

// Exported so subscription update endpoints can bust the cache immediately
const bustSubscriptionCache = (companyId) => {
  if (companyId) subCache.delete(companyId.toString());
};

// ── Main middleware ────────────────────────────────────────────────────────────
const checkSubscription = async (req, res, next) => {
  // 1. GET requests are read-only — never block them
  if (req.method === "GET") return next();

  // 2. Always-allowed self-service actions bypass the subscription gate
  if (isAlwaysAllowed(req)) return next();

  // 3. No authenticated user yet — let authMiddleware handle it
  if (!req.user) return next();

  // 4. SuperAdmin has global access
  if (req.user.role === "SuperAdmin") return next();

  try {
    const companyId = req.user.companyId || req.user.company_id;

    if (!companyId) {
      return res.status(403).json({
        message: "No company associated with this account. Action blocked.",
        subscriptionStatus: "none",
      });
    }

    const activeSub = await getSubscription(companyId);

    // No subscription record found
    if (!activeSub) {
      return res.status(403).json({
        message: "No active package found for your company. Please contact your administrator.",
        subscriptionStatus: "none",
      });
    }

    // Subscription explicitly cancelled or expired
    if (activeSub.status === "expired" || activeSub.status === "cancelled") {
      return res.status(403).json({
        message: `Your company subscription is ${activeSub.status}. Please contact your administrator to renew.`,
        subscriptionStatus: activeSub.status,
      });
    }

    // Subscription end date passed (status field may not have been updated yet)
    const now = new Date();
    if (activeSub.endDate && new Date(activeSub.endDate) < now) {
      return res.status(403).json({
        message: "Your company subscription has expired. Please contact your administrator to renew.",
        subscriptionStatus: "expired",
      });
    }

    // ✅ All checks passed — status is active/trial and within validity period
    // (We intentionally do NOT block on paymentStatus="pending" if the admin has explicitly set the subscription status to "active")
    next();
  } catch (error) {
    console.error("[Subscription Middleware] Error:", error.message);
    next(error);
  }
};

module.exports = { checkSubscription, bustSubscriptionCache };
