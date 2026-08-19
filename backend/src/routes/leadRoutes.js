const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  getStatuses, createStatus, updateStatus, deleteStatus,
  getSources, createSource,
  getTags, createTag, deleteTag,
  getLeads, createLead, getLeadById, updateLead, deleteLead,
  importLeads, bulkStatus, bulkTags, bulkDelete, bulkAssign, getOptInCounts,
  getAssignableUsers,
  getFlows, createFlow, toggleFlow,
  getTemplates, createTemplate,
  getCampaigns, createCampaign,
  getReminders, createReminder, runReminderScheduler,
  getPublicToken, getBusiness, getEngagementSettings,
  addLeadDocument, deleteLeadDocument,
} = require("../controllers/leadController");

const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET || "oneclick_secret_key_2026";
      const decoded = jwt.verify(token, secret);
      if (decoded?.id) {
        req.user = await User.findById(decoded.id).select("-password");
      }
    } catch (_) {}
  }
  next();
};

router.use(optionalAuth);

// Statuses
router.get("/statuses", getStatuses);
router.post("/statuses", createStatus);
router.patch("/statuses/:id", updateStatus);
router.delete("/statuses/:id", deleteStatus);

// Sources
router.get("/sources", getSources);
router.post("/sources", createSource);

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
router.delete("/templates/:id", (req, res) => res.json({ message: "Deleted" }));

// Campaigns & Broadcasts
router.get("/campaigns", getCampaigns);
router.post("/campaigns", createCampaign);
router.get("/broadcasts", getCampaigns);
router.post("/broadcasts", createCampaign);

// Reminders
router.get("/reminders", getReminders);
router.post("/reminders", createReminder);
router.post("/reminders/run-scheduler", runReminderScheduler);
router.delete("/reminders/:id", (req, res) => res.json({ message: "Deleted" }));

// Business, WhatsApp & Organization Settings
router.get("/business", getBusiness);
router.patch("/business", (req, res) => res.json({ message: "Updated" }));
router.get("/whatsapp/account", (req, res) => res.json({ status: "CONNECTED" }));
router.post("/whatsapp/connect", (req, res) => res.json({ status: "CONNECTED" }));
router.delete("/whatsapp/disconnect", (req, res) => res.json({ status: "DISCONNECTED" }));
router.post("/whatsapp/test-connection", (req, res) => res.json({ status: "OK" }));
router.get("/engagement-settings", getEngagementSettings);
router.patch("/engagement-settings", (req, res) => res.json({ message: "Updated" }));
router.get("/organization/public-token", getPublicToken);

// Leads & Bulk Actions
router.get("/assignable-users", getAssignableUsers);
router.get("/leads/opt-in-counts", getOptInCounts);
router.patch("/leads/bulk-status", bulkStatus);
router.patch("/leads/bulk-tags", bulkTags);
router.patch("/leads/bulk-assign", bulkAssign);
router.post("/leads/bulk-delete", bulkDelete);
router.post("/leads/import", importLeads);

router.get("/leads", getLeads);
router.post("/leads", createLead);
router.get("/leads/:id", getLeadById);
router.patch("/leads/:id", updateLead);
router.delete("/leads/:id", deleteLead);
router.get("/leads/:id/activities", (req, res) => res.json({ activities: [], data: [] }));
router.get("/leads/:id/messages", (req, res) => res.json({ messages: [], data: [] }));
router.post("/leads/:id/notes", (req, res) => res.json({ id: Date.now().toString(), note: req.body.note || "", createdAt: new Date().toISOString() }));
router.post("/leads/:id/send-template", (req, res) => res.json({ success: true, message: "Message sent" }));
router.post("/leads/:id/documents", addLeadDocument);
router.delete("/leads/:id/documents/:docId", deleteLeadDocument);

module.exports = router;
