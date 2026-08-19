const express = require("express");
const controller = require("../controllers/superAdminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  createCompanyRules,
  updateCompanyRules,
} = require("../validators/companyValidators");

const router = express.Router();

router.use(protect);
router.use(authorize("SuperAdmin"));

router.get("/dashboard", controller.getDashboardStats);
router.get("/dashboard/stats", controller.getDashboardStats);
router.get("/reports/analytics", controller.getReportsAnalytics);
router.route("/companies").post(createCompanyRules, controller.createCompany).get(controller.getCompanies);
router
  .route("/companies/:id")
  .get(controller.getCompanyById)
  .put(updateCompanyRules, controller.updateCompany)
  .delete(controller.deleteCompany);
router.patch("/companies/:id/status", controller.updateCompanyStatus);
router.get("/company-admins", controller.getCompanyAdmins);
router.post("/company-admins", controller.createCompanyAdmin);
router.patch("/company-admins/:id/make-primary", controller.makePrimaryAdmin);
router.delete("/company-admins/:id", controller.deleteCompanyAdmin);
router.get("/users", controller.getGlobalUsers);
router.get("/users/:id", controller.getUserById);
router.patch("/users/:id/status", controller.updateUserStatus);
router.patch("/users/:id/reset-password", controller.resetUserPassword);
router.patch("/users/:id/force-logout", controller.forceLogoutUser);
router.route("/plans").get(controller.getPlans).post(controller.createPlan);
router
  .route("/plans/:id")
  .get(controller.getPlanById)
  .put(controller.updatePlan)
  .delete(controller.deletePlan);
router.patch("/plans/:id/status", controller.updatePlanStatus);
router.get("/subscriptions", controller.getSubscriptions);
router.post("/subscriptions/assign", controller.assignSubscription);
router.put("/subscriptions/:id", controller.updateSubscription);
router.patch("/subscriptions/:id/renew", controller.renewSubscription);
router.patch("/subscriptions/:id/cancel", controller.cancelSubscription);
router.patch("/subscriptions/:id/extend-trial", controller.extendTrial);
router.delete("/subscriptions/:id", controller.deleteSubscription);
router.get("/announcements", controller.getAnnouncements);
router.post("/announcements", controller.createAnnouncement);
router.get("/announcements/:id", controller.getAnnouncementById);
router.put("/announcements/:id", controller.updateAnnouncement);
router.patch("/announcements/:id/publish", controller.publishAnnouncement);
router.patch("/announcements/:id/cancel", controller.cancelAnnouncement);
router.delete("/announcements/:id", controller.deleteAnnouncement);
router.get("/payments", controller.getPayments);
router.post("/payments/manual", controller.createManualPayment);
router.patch("/payments/:id/status", controller.updatePaymentStatus);
router.get("/support-tickets", controller.getSupportTickets);
router.get("/support-tickets/:id", controller.getSupportTicketById);
router.patch("/support-tickets/:id/status", controller.updateSupportTicketStatus);
router.post("/support-tickets/:id/reply", controller.replyToSupportTicket);
router.post("/support-tickets/:id/internal-note", controller.addInternalNoteSupportTicket);
router.get("/audit-logs", controller.getAuditLogs);
router.get("/login-history", controller.getLoginHistory);
router.route("/settings").get(controller.getSystemSettings).put(controller.updateSystemSettings);
router.get("/backups", controller.getBackups);

router.get("/company-requests", controller.getCompanyRequests);
router.post("/company-requests", controller.createCompanyRequest);
router.get("/company-requests/:id", controller.getCompanyRequestById);
router.put("/company-requests/:id", controller.updateCompanyRequest);
router.patch("/company-requests/:id/status", controller.updateCompanyRequestStatus);
router.post("/company-requests/:id/notes", controller.addCompanyRequestNote);
router.post("/company-requests/:id/convert", controller.convertCompanyRequest);
router.delete("/company-requests/:id", controller.deleteCompanyRequest);

module.exports = router;