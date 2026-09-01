const SubscriptionRequest = require("../models/SubscriptionRequest");
const Company = require("../models/Company");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { notifyRole, notifyUser } = require("../utils/notificationHelper");

/**
 * ── Company Admin: Get list of active SaaS plans available for upgrade ──
 */
exports.getAvailablePlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ priceMonthly: 1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── Company Admin: Submit a new subscription/plan request ──
 */
exports.createCompanySubscriptionRequest = async (req, res, next) => {
  try {
    const {
      requestType,
      requestedPlanId,
      requestedSeats,
      requestedModules,
      billingCycle,
      priority,
      message,
    } = req.body;

    const companyId = req.companyId;
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    let requestedPlanName = "";
    if (requestedPlanId) {
      const plan = await Plan.findById(requestedPlanId);
      if (plan) {
        requestedPlanName = plan.planName;
      }
    }

    const currentPlanName = company.planId?.planName || "Standard Plan";

    const request = await SubscriptionRequest.create({
      companyId: company._id,
      companyName: company.companyName,
      requestedBy: req.user._id,
      requestType: requestType || "upgrade_plan",
      currentPlanId: company.planId?._id || null,
      currentPlanName,
      requestedPlanId: requestedPlanId || null,
      requestedPlanName,
      requestedSeats: parseInt(requestedSeats, 10) || 0,
      requestedModules: Array.isArray(requestedModules) ? requestedModules : [],
      billingCycle: billingCycle || "yearly",
      priority: priority || "medium",
      message: message || "",
      status: "pending",
    });

    // Notify Super Admin users
    try {
      const superAdmins = await User.find({ role: { $regex: /^SuperAdmin$/i }, isActive: { $ne: false } }).select("_id");
      for (const sa of superAdmins) {
        await notifyUser(
          sa._id,
          company._id,
          `New Subscription Request from ${company.companyName}`,
          `${company.companyName} submitted a ${requestType?.replace(/_/g, " ") || "subscription"} request for ${requestedPlanName || "custom quota"}.`,
          "subscription_request",
          { requestId: request._id, companyId: company._id }
        );
      }
    } catch (notifErr) {
      console.error("Error sending notification to SuperAdmins:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Subscription request submitted successfully. Super Admin will review your request.",
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── Company Admin: Get all subscription requests submitted by current company ──
 */
exports.getCompanySubscriptionRequests = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const requests = await SubscriptionRequest.find({ companyId })
      .populate("requestedPlanId", "planName priceMonthly priceYearly maxEmployees moduleLimits")
      .populate("currentPlanId", "planName priceMonthly priceYearly maxEmployees moduleLimits")
      .populate("reviewedBy", "name email firstName lastName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── Super Admin: Get all company subscription requests with stats ──
 */
exports.getSuperAdminSubscriptionRequests = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { requestCode: { $regex: q, $options: "i" } },
        { requestedPlanName: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
    }

    const requests = await SubscriptionRequest.find(filter)
      .populate("companyId", "companyName email phone status employeeLimit logo")
      .populate("requestedPlanId", "planName priceMonthly priceYearly maxEmployees modules moduleLimits")
      .populate("currentPlanId", "planName priceMonthly priceYearly maxEmployees modules moduleLimits")
      .populate("requestedBy", "name email firstName lastName")
      .populate("reviewedBy", "name email firstName lastName")
      .sort({ createdAt: -1 });

    const total = await SubscriptionRequest.countDocuments();
    const pending = await SubscriptionRequest.countDocuments({ status: "pending" });
    const inReview = await SubscriptionRequest.countDocuments({ status: "in_review" });
    const approved = await SubscriptionRequest.countDocuments({ status: { $in: ["approved", "provisioned"] } });
    const rejected = await SubscriptionRequest.countDocuments({ status: "rejected" });

    res.json({
      success: true,
      data: requests,
      stats: {
        total,
        pending,
        inReview,
        approved,
        rejected,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── Super Admin: Update subscription request status & optionally auto-provision ──
 */
exports.updateSubscriptionRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminResponseNotes, autoProvision } = req.body;

    const request = await SubscriptionRequest.findById(id).populate("companyId requestedPlanId");
    if (!request) {
      return res.status(404).json({ success: false, message: "Subscription request not found" });
    }

    request.status = status || request.status;
    if (adminResponseNotes !== undefined) {
      request.adminResponseNotes = adminResponseNotes;
    }
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    // If approved & autoProvision or status == provisioned, update Company and Subscription
    if ((status === "approved" && autoProvision) || status === "provisioned") {
      const company = await Company.findById(request.companyId._id || request.companyId);

      if (company) {
        // Update plan if requestedPlanId is present
        if (request.requestedPlanId) {
          const plan = await Plan.findById(request.requestedPlanId._id || request.requestedPlanId);
          if (plan) {
            company.planId = plan._id;
            if (plan.maxEmployees && plan.maxEmployees > 0) {
              company.employeeLimit = plan.maxEmployees;
            }
          }
        }

        // Update custom seat capacity if requested
        if (request.requestedSeats && request.requestedSeats > 0) {
          company.employeeLimit = request.requestedSeats;
        }

        await company.save();

        // Create or update Subscription record
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (request.billingCycle === "yearly") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (request.billingCycle === "monthly") {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setDate(endDate.getDate() + 14); // Trial
        }

        const planName = request.requestedPlanName || (request.requestedPlanId ? request.requestedPlanId.planName : "Custom Plan");
        const amount = request.billingCycle === "yearly"
          ? (request.requestedPlanId?.priceYearly || 0)
          : (request.requestedPlanId?.priceMonthly || 0);

        await Subscription.findOneAndUpdate(
          { companyId: company._id },
          {
            companyId: company._id,
            planId: request.requestedPlanId?._id || company.planId,
            planName,
            billingCycle: request.billingCycle || "yearly",
            startDate,
            endDate,
            amount,
            status: "active",
            paymentStatus: "paid",
          },
          { upsert: true, new: true }
        );

        request.status = "provisioned";
      }
    }

    await request.save();

    // Send notification back to Company Admin
    try {
      const notifTitle = status === "approved" || status === "provisioned"
        ? "Subscription Request Approved!"
        : status === "rejected"
        ? "Subscription Request Update"
        : "Subscription Request In Review";

      const notifBody = status === "approved" || status === "provisioned"
        ? `Your request (${request.requestCode}) for ${request.requestedPlanName || "custom quota"} has been approved and provisioned by Super Admin.`
        : status === "rejected"
        ? `Your request (${request.requestCode}) was reviewed: ${adminResponseNotes || "Contact Super Admin for details."}`
        : `Your request (${request.requestCode}) is currently under review by Super Admin.`;

      await notifyRole(
        request.companyId._id || request.companyId,
        "CompanyAdmin",
        notifTitle,
        notifBody,
        "subscription",
        { requestId: request._id }
      );
    } catch (notifErr) {
      console.error("Error sending response notification to CompanyAdmin:", notifErr);
    }

    res.json({
      success: true,
      message: `Subscription request marked as ${request.status}.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};
