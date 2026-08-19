const { authorize } = require("./roleMiddleware");

const requireRole = (...allowedRoles) => authorize(...allowedRoles);

module.exports = { requireRole };
