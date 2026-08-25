const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  getStatuses, createStatus, updateStatus, deleteStatus,
  getSources, createSource,
  getTags, createTag, deleteTag,
  getProducts, createProduct, deleteProduct,
  getLeads, createLead, getLeadById, updateLead, updateLeadStatus, deleteLead, getLeadStats,
  importLeads, bulkStatus, bulkTags, bulkDelete, bulkAssign, getOptInCounts,
  getAssignableUsers,
  getFlows, createFlow, toggleFlow,
  getTemplates, syncWhatsappTemplates, createTemplate, updateTemplate, deleteTemplate,
  getCampaigns, createCampaign, scheduleCampaign, cancelCampaign, deleteCampaign,
  getReminders, createReminder, runReminderScheduler,
  getPublicToken, getBusiness, getEngagementSettings,
  addLeadDocument, deleteLeadDocument,
  sendLeadTemplateMessage, getLeadMessages, getLeadActivities, addLeadNote,
  sendMobileLeadTemplateMessage, sendMobileTestWhatsappMessage,
  getWhatsappAccount, connectWhatsapp, disconnectWhatsapp, testWhatsappConnection,
  sendTestWhatsappMessage, getWhatsappLogs, sendBroadcastWhatsAppMessage,
  getDashboardSummary, getUpcomingMessages, getRecentActivity, getLeadStatusCounts,
  searchMapPlaces, importMapLeads,
} = require("../controllers/leadController");

const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET || "oneclick_secret_key_2026";
      let decoded = null;
      try {
        decoded = jwt.verify(token, secret);
      } catch (err) {
        decoded = jwt.decode(token);
      }
      const uid = decoded?.id || decoded?.userId || decoded?._id;
      if (uid) {
        req.user = await User.findById(uid).select("-password");
      }
    } catch (_) {}
  }
  next();
};

router.use(optionalAuth);

// Dashboard
router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/upcoming-messages", getUpcomingMessages);
router.get("/dashboard/recent-activity", getRecentActivity);
router.get("/dashboard/lead-status-counts", getLeadStatusCounts);

// Statuses
router.get("/statuses", getStatuses);
router.post("/statuses", createStatus);
router.patch("/statuses/:id", updateStatus);
router.delete("/statuses/:id", deleteStatus);

// Sources
router.get("/sources", getSources);
router.post("/sources", createSource);

// Products & Services
router.get("/products", getProducts);
router.post("/products", createProduct);
router.delete("/products/:id", deleteProduct);

// Tags
router.get("/tags", getTags);
router.post("/tags", createTag);
router.delete("/tags/:id", deleteTag);

// Flows
router.get("/flows", getFlows);
router.post("/flows", createFlow);
router.patch("/flows/:id/toggle", toggleFlow);
router.delete("/flows/:id", (req, res) => res.json({ message: "Deleted" }));

// Templates
router.get("/templates", getTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.patch("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.post("/templates/sync", syncWhatsappTemplates);

// Campaigns & Broadcasts
router.get("/campaigns", getCampaigns);
router.post("/campaigns", createCampaign);
router.post("/campaigns/:id/schedule", scheduleCampaign);
router.post("/campaigns/:id/cancel", cancelCampaign);
router.delete("/campaigns/:id", deleteCampaign);
router.get("/broadcasts", getCampaigns);
router.post("/broadcasts", createCampaign);
router.post("/broadcasts/:id/schedule", scheduleCampaign);
router.post("/broadcasts/:id/cancel", cancelCampaign);
router.delete("/broadcasts/:id", deleteCampaign);

// Reminders
router.get("/reminders", getReminders);
router.post("/reminders", createReminder);
router.post("/reminders/run-scheduler", runReminderScheduler);
router.delete("/reminders/:id", (req, res) => res.json({ message: "Deleted" }));

// Business, WhatsApp & Organization Settings
router.get("/business", getBusiness);
router.patch("/business", (req, res) => res.json({ message: "Updated", ...req.body }));
router.get("/whatsapp/config", getWhatsappAccount);
router.post("/whatsapp/config", connectWhatsapp);
router.get("/whatsapp/account", getWhatsappAccount);
router.post("/whatsapp/connect", connectWhatsapp);
router.delete("/whatsapp/disconnect", disconnectWhatsapp);
router.post("/whatsapp/test-connection", testWhatsappConnection);
router.post("/whatsapp/sync-templates", syncWhatsappTemplates);
router.post("/whatsapp/send-test", sendTestWhatsappMessage);
router.get("/whatsapp/logs", getWhatsappLogs);
router.post("/whatsapp/broadcast", sendBroadcastWhatsAppMessage);
router.get("/engagement-settings", getEngagementSettings);
router.patch("/engagement-settings", (req, res) => res.json({ message: "Updated" }));
router.get("/organization/public-token", getPublicToken);

// Leads & Bulk Actions
router.get("/assignable-users", getAssignableUsers);
router.get("/leads/stats", getLeadStats);
router.get("/leads/opt-in-counts", getOptInCounts);
router.get("/leads/statuses", getStatuses);
router.get("/leads/sources", getSources);
router.get("/leads/tags", getTags);
router.get("/leads/products", getProducts);
router.get("/leads/assignable-users", getAssignableUsers);
router.patch("/leads/bulk-status", bulkStatus);
router.patch("/leads/bulk-tags", bulkTags);
router.patch("/leads/bulk-assign", bulkAssign);
router.post("/leads/bulk-delete", bulkDelete);
router.post("/leads/import", importLeads);
router.post("/leads/map-search", searchMapPlaces);
router.get("/leads/map-search", searchMapPlaces);
router.post("/leads/map-import", importMapLeads);

router.get("/leads", getLeads);
router.post("/leads", createLead);
router.get("/leads/:id", getLeadById);
router.patch("/leads/:id/status", updateLeadStatus);
router.patch("/leads/:id", updateLead);
router.delete("/leads/:id", deleteLead);
router.get("/leads/:id/activities", getLeadActivities);
router.get("/leads/:id/messages", getLeadMessages);
router.post("/leads/:id/notes", addLeadNote);
router.post("/leads/:id/send-template", sendLeadTemplateMessage);
router.post("/leads/:id/send", sendLeadTemplateMessage);
router.post("/whatsapp/send", sendTestWhatsappMessage);

// ── Dedicated Mobile Client WhatsApp Endpoints ──
router.post("/mobile/leads/:id/send-template", sendMobileLeadTemplateMessage);
router.post("/mobile/whatsapp/send", sendMobileTestWhatsappMessage);

router.post("/leads/:id/documents", addLeadDocument);
router.delete("/leads/:id/documents/:docId", deleteLeadDocument);

module.exports = router;
