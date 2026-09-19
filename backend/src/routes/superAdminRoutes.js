const express = require("express");
const controller = require("../controllers/superAdminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { checkSuperAdminPermission } = require("../middleware/superAdminPermissionMiddleware");
const {
  createCompanyRules,
  updateCompanyRules,
} = require("../validators/companyValidators");

const router = express.Router();

router.use(protect);
router.use(authorize("SuperAdmin", "SubSuperAdmin"));

// Dashboard & Analytics
router.get("/dashboard", controller.getDashboardStats);
router.get("/dashboard/stats", controller.getDashboardStats);
router.get("/reports/analytics", checkSuperAdminPermission("reports", "view"), controller.getReportsAnalytics);

// Companies Management
router.route("/companies")
  .get(checkSuperAdminPermission("companies", "view"), controller.getCompanies)
  .post(checkSuperAdminPermission("companies", "create"), createCompanyRules, controller.createCompany);

router.route("/companies/:id")
  .get(checkSuperAdminPermission("companies", "view"), controller.getCompanyById)
  .put(checkSuperAdminPermission("companies", "edit"), updateCompanyRules, controller.updateCompany)
  .delete(checkSuperAdminPermission("companies", "delete"), controller.deleteCompany);

router.patch("/companies/:id/status", checkSuperAdminPermission("companies", "edit"), controller.updateCompanyStatus);
router.patch("/companies/:id/restore", checkSuperAdminPermission("companies", "edit"), controller.restoreCompany);
router.delete("/companies/:id/permanent", checkSuperAdminPermission("companies", "delete"), controller.permanentDeleteCompany);

// Company Admins
router.get("/company-admins", checkSuperAdminPermission("companyAdmins", "view"), controller.getCompanyAdmins);
router.post("/company-admins", checkSuperAdminPermission("companyAdmins", "create"), controller.createCompanyAdmin);
router.patch("/company-admins/:id/make-primary", checkSuperAdminPermission("companyAdmins", "edit"), controller.makePrimaryAdmin);
router.delete("/company-admins/:id", checkSuperAdminPermission("companyAdmins", "delete"), controller.deleteCompanyAdmin);

// Users Management
router.get("/users", checkSuperAdminPermission("users", "view"), controller.getGlobalUsers);
router.get("/users/:id", checkSuperAdminPermission("users", "view"), controller.getUserById);
router.patch("/users/:id/status", checkSuperAdminPermission("users", "edit"), controller.updateUserStatus);
router.patch("/users/:id/reset-password", checkSuperAdminPermission("users", "edit"), controller.resetUserPassword);
router.patch("/users/:id/force-logout", checkSuperAdminPermission("users", "edit"), controller.forceLogoutUser);

// Plans
router.route("/plans")
  .get(checkSuperAdminPermission("plans", "view"), controller.getPlans)
  .post(checkSuperAdminPermission("plans", "create"), controller.createPlan);

router.route("/plans/:id")
  .get(checkSuperAdminPermission("plans", "view"), controller.getPlanById)
  .put(checkSuperAdminPermission("plans", "edit"), controller.updatePlan)
  .delete(checkSuperAdminPermission("plans", "delete"), controller.deletePlan);

router.patch("/plans/:id/status", checkSuperAdminPermission("plans", "edit"), controller.updatePlanStatus);

// Subscriptions
router.get("/subscriptions", checkSuperAdminPermission("subscriptions", "view"), controller.getSubscriptions);
router.post("/subscriptions/sync-expiry-notifications", checkSuperAdminPermission("subscriptions", "edit"), controller.syncSubscriptionExpiryNotifications);
router.post("/subscriptions/assign", checkSuperAdminPermission("subscriptions", "create"), controller.assignSubscription);
router.put("/subscriptions/:id", checkSuperAdminPermission("subscriptions", "edit"), controller.updateSubscription);
router.patch("/subscriptions/:id/renew", checkSuperAdminPermission("subscriptions", "edit"), controller.renewSubscription);
router.patch("/subscriptions/:id/cancel", checkSuperAdminPermission("subscriptions", "edit"), controller.cancelSubscription);
router.patch("/subscriptions/:id/extend-trial", checkSuperAdminPermission("subscriptions", "edit"), controller.extendTrial);
router.delete("/subscriptions/:id", checkSuperAdminPermission("subscriptions", "delete"), controller.deleteSubscription);

// Announcements
router.get("/announcements", checkSuperAdminPermission("announcements", "view"), controller.getAnnouncements);
router.post("/announcements", checkSuperAdminPermission("announcements", "create"), controller.createAnnouncement);
router.get("/announcements/:id", checkSuperAdminPermission("announcements", "view"), controller.getAnnouncementById);
router.put("/announcements/:id", checkSuperAdminPermission("announcements", "edit"), controller.updateAnnouncement);
router.patch("/announcements/:id/publish", checkSuperAdminPermission("announcements", "edit"), controller.publishAnnouncement);
router.patch("/announcements/:id/cancel", checkSuperAdminPermission("announcements", "edit"), controller.cancelAnnouncement);
router.delete("/announcements/:id", checkSuperAdminPermission("announcements", "delete"), controller.deleteAnnouncement);

// Payments
router.get("/payments", checkSuperAdminPermission("payments", "view"), controller.getPayments);
router.post("/payments/manual", checkSuperAdminPermission("payments", "create"), controller.createManualPayment);
router.patch("/payments/:id/status", checkSuperAdminPermission("payments", "edit"), controller.updatePaymentStatus);

// Support Tickets
router.get("/support-tickets", checkSuperAdminPermission("supportTickets", "view"), controller.getSupportTickets);
router.get("/support-tickets/:id", checkSuperAdminPermission("supportTickets", "view"), controller.getSupportTicketById);
router.patch("/support-tickets/:id/status", checkSuperAdminPermission("supportTickets", "edit"), controller.updateSupportTicketStatus);
router.post("/support-tickets/:id/reply", checkSuperAdminPermission("supportTickets", "create"), controller.replyToSupportTicket);
router.post("/support-tickets/:id/internal-note", checkSuperAdminPermission("supportTickets", "create"), controller.addInternalNoteSupportTicket);

// Audit & Activity Logs
router.get("/audit-logs", checkSuperAdminPermission("activityLogs", "view"), controller.getAuditLogs);
router.get("/login-history", checkSuperAdminPermission("activityLogs", "view"), controller.getLoginHistory);

// System Settings & Backups
router.route("/settings")
  .get(checkSuperAdminPermission("settings", "view"), controller.getSystemSettings)
  .put(checkSuperAdminPermission("settings", "edit"), controller.updateSystemSettings);

router.get("/backups", checkSuperAdminPermission("settings", "view"), controller.getBackups);

// Company Requests
router.get("/company-requests", checkSuperAdminPermission("companyRequests", "view"), controller.getCompanyRequests);
router.post("/company-requests", checkSuperAdminPermission("companyRequests", "create"), controller.createCompanyRequest);
router.get("/company-requests/:id", checkSuperAdminPermission("companyRequests", "view"), controller.getCompanyRequestById);
router.put("/company-requests/:id", checkSuperAdminPermission("companyRequests", "edit"), controller.updateCompanyRequest);
router.patch("/company-requests/:id/status", checkSuperAdminPermission("companyRequests", "edit"), controller.updateCompanyRequestStatus);
router.post("/company-requests/:id/notes", checkSuperAdminPermission("companyRequests", "edit"), controller.addCompanyRequestNote);
router.post("/company-requests/:id/convert", checkSuperAdminPermission("companyRequests", "edit"), controller.convertCompanyRequest);
router.delete("/company-requests/:id", checkSuperAdminPermission("companyRequests", "delete"), controller.deleteCompanyRequest);

// Company Subscription Requests (SaaS Licensing & Upgrades)
const {
  getSuperAdminSubscriptionRequests,
  updateSubscriptionRequestStatus,
} = require("../controllers/subscriptionRequestController");

router.get("/subscription-requests", checkSuperAdminPermission("subscriptions", "view"), getSuperAdminSubscriptionRequests);
router.patch("/subscription-requests/:id/status", checkSuperAdminPermission("subscriptions", "edit"), updateSubscriptionRequestStatus);

// Sub-SuperAdmin Management (STRICTLY main SuperAdmin ONLY)
router.get("/sub-superadmins", authorize("SuperAdmin"), controller.getSubSuperAdmins);
router.post("/sub-superadmins", authorize("SuperAdmin"), controller.createSubSuperAdmin);
router.put("/sub-superadmins/:id", authorize("SuperAdmin"), controller.updateSubSuperAdmin);
router.patch("/sub-superadmins/:id/status", authorize("SuperAdmin"), controller.updateSubSuperAdminStatus);
router.delete("/sub-superadmins/:id", authorize("SuperAdmin"), controller.deleteSubSuperAdmin);

module.exports = router;