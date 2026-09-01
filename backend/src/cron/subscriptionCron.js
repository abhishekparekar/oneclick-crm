const cron = require("node-cron");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const Company = require("../models/Company");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { notifyRole, notifyUser } = require("../utils/notificationHelper");
const { sendEmail, sendWhatsApp } = require("../services/notificationService");

/**
 * Check subscription expiry and send alerts:
 * - 15 days before expiry (First warning)
 * - 7 days before expiry (Second warning)
 * - 1 day before expiry (Final urgent warning)
 * - 0 days / expired (Expired notice)
 */
const checkSubscriptionExpiry = async () => {
  try {
    console.log("[CRON] Checking company subscription expiration milestones (15d, 7d, 1d, expired)...");
    const now = new Date();
    
    // Find all active or trial subscriptions
    const subscriptions = await Subscription.find({
      status: { $in: ["active", "trial"] },
      endDate: { $exists: true, $ne: null }
    }).populate("companyId planId");

    let notifiedCount = 0;

    for (const sub of subscriptions) {
      if (!sub.companyId) continue;
      const company = sub.companyId;
      const endDate = new Date(sub.endDate);
      
      // Calculate remaining days
      const diffTime = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Format human-readable expiration date
      const formattedEndDate = endDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      let milestone = null;
      let title = "";
      let body = "";
      let urgency = "normal";

      if (daysRemaining === 15) {
        milestone = 15;
        title = "⚠️ Subscription Renewal Reminder (15 Days Left)";
        body = `Your ${company.companyName || "company"} subscription for plan "${sub.planName}" will expire in 15 days on ${formattedEndDate}. Please renew in advance to ensure uninterrupted access to all modules and team services.`;
        urgency = "low";
      } else if (daysRemaining === 7) {
        milestone = 7;
        title = "🚨 Subscription Expiring in 7 Days (Action Required)";
        body = `Important: Your ${company.companyName || "company"} subscription for plan "${sub.planName}" expires in 7 days on ${formattedEndDate}. Renew now to keep all employee seats, task tracking, and lead CRM services active.`;
        urgency = "medium";
      } else if (daysRemaining === 1) {
        milestone = 1;
        title = "🔴 Final Notice: Subscription Expires Tomorrow!";
        body = `Urgent Final Notice: Your ${company.companyName || "company"} subscription for plan "${sub.planName}" expires tomorrow on ${formattedEndDate}. Please renew immediately to prevent service suspension.`;
        urgency = "high";
      } else if (daysRemaining <= 0) {
        milestone = 0;
        title = "⛔ Subscription Has Expired";
        body = `Your ${company.companyName || "company"} subscription for plan "${sub.planName}" expired on ${formattedEndDate}. Please renew your plan immediately to restore full platform access.`;
        urgency = "critical";

        // Mark subscription as expired if not already marked
        if (sub.status !== "expired") {
          sub.status = "expired";
          await sub.save();
          await Company.findByIdAndUpdate(company._id, { subscriptionStatus: "expired" });
        }
      }

      if (milestone !== null) {
        // Prevent sending duplicate notifications on the same day for this milestone
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingNotif = await Notification.findOne({
          companyId: company._id,
          type: "subscription_expiry",
          "data.milestone": milestone,
          createdAt: { $gte: dayAgo }
        });

        if (!existingNotif) {
          // 1. Send In-App & Push Notification to all CompanyAdmins
          await notifyRole(company._id, "CompanyAdmin", title, body, "subscription_expiry", {
            milestone,
            daysRemaining,
            endDate: sub.endDate,
            planName: sub.planName,
            urgency,
            actionUrl: "/company/subscription"
          });

          // 2. Send email to company owner if available
          const recipientEmail = company.ownerEmail || company.email;
          if (recipientEmail) {
            sendEmail(
              recipientEmail,
              `[${company.companyName || "SaaS HRMS"}] ${title}`,
              `Dear ${company.ownerName || "Administrator"},\n\n${body}\n\nPlan: ${sub.planName}\nExpiration Date: ${formattedEndDate}\n\nRenew your plan online or contact support.\n\nBest regards,\nPlatform Operations Team`
            ).catch(err => console.error("[CRON] Email notification error:", err));
          }

          // 3. Send WhatsApp notice to company owner phone if available
          const recipientPhone = company.ownerPhone || company.phone;
          if (recipientPhone) {
            sendWhatsApp(
              recipientPhone,
              `*${title}*\n\n${body}\n\nPlan: ${sub.planName}\nExpiry: ${formattedEndDate}`,
              company._id
            ).catch(err => console.error("[CRON] WhatsApp notification error:", err));
          }

          notifiedCount++;
          console.log(`[CRON] Subscription expiry alert (${milestone} days) sent for company "${company.companyName}" (${company._id}).`);
        }
      }
    }

    console.log(`[CRON] Subscription expiry check completed. ${notifiedCount} company alert(s) sent.`);
  } catch (error) {
    console.error("[CRON] Error in checkSubscriptionExpiry:", error);
  }
};

/**
 * Initialize Subscription Cron (Runs every day at 09:00 AM IST)
 */
const initSubscriptionCron = () => {
  console.log("[CRON] Initializing subscription expiry reminder cron (Daily at 09:00 AM)...");
  
  // Schedule to run at 09:00 AM everyday
  cron.schedule("0 9 * * *", async () => {
    await checkSubscriptionExpiry();
  });

  // Also run initial check 10 seconds after server startup
  setTimeout(() => {
    checkSubscriptionExpiry().catch(err => console.error("[CRON] Startup subscription check error:", err));
  }, 10000);
};

module.exports = {
  initSubscriptionCron,
  checkSubscriptionExpiry
};
