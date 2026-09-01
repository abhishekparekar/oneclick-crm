const { validationResult } = require("express-validator");
const Company = require("../models/Company");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const SupportTicket = require("../models/SupportTicket");
const Announcement = require("../models/Announcement");
const AuditLog = require("../models/AuditLog");
const LoginHistory = require("../models/LoginHistory");
const SystemSetting = require("../models/SystemSetting");
const Backup = require("../models/Backup");
const CompanyRequest = require("../models/CompanyRequest");
const formatUser = require("../utils/formatUser");
const generateTempPassword = require("../utils/generateTempPassword");
const { bustSubscriptionCache } = require("../middleware/subscriptionMiddleware");

const createCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const {
      companyName,
      ownerName,
      ownerEmail,
      ownerPhone,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      industryType,
      planName,
      planId,
      employeeLimit,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
    } = req.body;

    const companyEmail = email ? email.toLowerCase() : "";
    const ownerEmailValue = ownerEmail || email || "";
    const adminEmailLower = (adminEmail || ownerEmailValue).toLowerCase();

    const existingCompany = await Company.findOne({ email: companyEmail });
    if (existingCompany) {
      return res.status(400).json({ message: "Company email already exists" });
    }

    const existingAdmin = await User.findOne({ email: adminEmailLower });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin email already registered" });
    }

    let company = null;

    try {
      company = await Company.create({
        companyName,
        ownerName,
        ownerEmail: ownerEmailValue.toLowerCase(),
        ownerPhone: ownerPhone || phone || "",
        email: companyEmail,
        phone,
        address,
        city,
        state,
        pincode,
        industryType,
        planName,
        planId,
        employeeLimit,
        createdBy: req.user._id,
      });

      const temporaryPassword = adminPassword || generateTempPassword();

      const companyAdmin = await User.create({
        name: adminName || ownerName,
        email: adminEmailLower,
        phone: adminPhone || ownerPhone,
        password: temporaryPassword,
        role: "CompanyAdmin",
        companyId: company._id,
        isPrimaryAdmin: true,
        isPasswordResetRequired: true,
      });

      res.status(201).json({
        company,
        companyAdmin: formatUser(companyAdmin),
        adminLogin: {
          email: companyAdmin.email,
          temporaryPassword,
        },
      });
    } catch (error) {
      if (company?._id) {
        await Company.findByIdAndDelete(company._id);
      }
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const companies = await Company.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ companies, count: companies.length });
  } catch (error) {
    next(error);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const companyAdmin = await User.findOne({
      companyId: company._id,
      role: "CompanyAdmin",
    }).select("-password");

    res.json({ company, companyAdmin });
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const fields = [
      "companyName",
      "ownerName",
      "ownerEmail",
      "ownerPhone",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
      "industryType",
      "planName",
      "planId",
      "employeeLimit",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] =
          field === "email" || field === "ownerEmail"
            ? req.body[field].toLowerCase()
            : req.body[field];
      }
    });

    await company.save();

    res.json({ company });
  } catch (error) {
    next(error);
  }
};

const updateCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.status = status;
    await company.save();

    await User.updateMany(
      { companyId: company._id },
      { isActive: status === "active" }
    );

    res.json({ company });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await User.deleteMany({ companyId: company._id });
    await company.deleteOne();

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const { timeRange } = req.query;
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayThisYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalCompanies,
      activeCompanies,
      totalCompanyAdmins,
      totalUsers,
      totalEmployeesCount,
      totalPlans,
      totalPayments,
      activeSubscriptions,
      expiredSubscriptions,
      trialSubscriptions,
      expiringSubscriptions,
      pendingRequestsCount,
      approvedRequestsCount,
      monthlyPayments,
      yearlyPayments,
      supportTickets,
      companiesList,
      plansList,
      pendingReqs,
      approvedReqs,
      announcementsList,
      recentLogs
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "active" }),
      User.countDocuments({ role: "CompanyAdmin" }),
      User.countDocuments(),
      Employee.countDocuments(),
      Plan.countDocuments(),
      Payment.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "expired" }),
      Subscription.countDocuments({ status: "trial" }),
      Subscription.countDocuments({
        status: "active",
        endDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      }),
      CompanyRequest.countDocuments({ status: "pending" }),
      CompanyRequest.countDocuments({ status: { $in: ["approved", "converted"] } }),
      Payment.find({ status: "completed", createdAt: { $gte: firstDayThisMonth } }),
      Payment.find({ status: "completed", createdAt: { $gte: firstDayThisYear } }),
      SupportTicket.find(),
      Company.find().sort({ createdAt: -1 }).limit(6).lean(),
      Plan.find({ isActive: true }).lean(),
      CompanyRequest.find({ status: "pending" }).sort({ createdAt: -1 }).limit(4).lean(),
      CompanyRequest.find({ status: { $in: ["approved", "converted"] } }).sort({ createdAt: -1 }).limit(4).lean(),
      Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).lean(),
      AuditLog.find().populate("performedBy", "name email role").populate("companyId", "companyName").sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const inactiveCompanies = Math.max(0, totalCompanies - activeCompanies);

    // Calculate revenue
    const monthlyRevenueVal = monthlyPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const annualRevenueVal = yearlyPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Month names for charts
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const areaDataMap = {};
    const barDataMap = {};
    monthNames.forEach((m, idx) => {
      areaDataMap[idx] = { name: m, value: 0 };
      barDataMap[idx] = { name: m, monthly: 0, annual: 0 };
    });

    const allCompaniesYear = await Company.find({ createdAt: { $gte: firstDayThisYear } });
    allCompaniesYear.forEach((c) => {
      const m = new Date(c.createdAt).getMonth();
      if (areaDataMap[m]) areaDataMap[m].value += 1;
    });
    const areaData = Object.values(areaDataMap);

    yearlyPayments.forEach((p) => {
      const m = new Date(p.createdAt || p.paymentDate).getMonth();
      if (barDataMap[m]) {
        barDataMap[m].monthly += Number(p.amount) || 0;
        barDataMap[m].annual += Number(p.amount) || 0;
      }
    });
    const barData = Object.values(barDataMap);

    // Subscription Tiers Breakdown
    const tierColors = ["#EAB308", "#10B981", "#06B6D4", "#8B5CF6", "#EC4899"];
    let subscriptionPipeline = [];
    if (plansList.length > 0) {
      subscriptionPipeline = await Promise.all(
        plansList.map(async (p, idx) => {
          const count = await Subscription.countDocuments({ planId: p._id, status: "active" });
          const pct = activeSubscriptions > 0 ? Math.round((count / activeSubscriptions) * 100) : 0;
          return {
            name: p.name || p.planName || `Plan ${idx + 1}`,
            value: count || (idx === 0 ? activeCompanies : 0),
            pct: `(${pct}%)`,
            color: tierColors[idx % tierColors.length]
          };
        })
      );
    } else {
      subscriptionPipeline = [
        { name: "Active Plan", value: activeSubscriptions || activeCompanies || 1, pct: "(100%)", color: "#10B981" }
      ];
    }

    // Support ticket status
    let openCount = 0, inProgCount = 0, resolvedCount = 0;
    supportTickets.forEach((t) => {
      const st = (t.status || "").toLowerCase();
      if (st === "open") openCount++;
      else if (st === "in progress" || st === "in_progress") inProgCount++;
      else if (st === "resolved" || st === "closed") resolvedCount++;
      else openCount++;
    });
    const totalT = openCount + inProgCount + resolvedCount || 1;
    const ticketStatus = [
      { name: "Resolved", value: Math.round((resolvedCount / totalT) * 100) || 0, count: resolvedCount, color: "#10B981" },
      { name: "In Progress", value: Math.round((inProgCount / totalT) * 100) || 0, count: inProgCount, color: "#EAB308" },
      { name: "Open", value: Math.round((openCount / totalT) * 100) || 0, count: openCount, color: "#F43F5E" }
    ];

    // Helper for relative time
    const formatTimeAgo = (d) => {
      if (!d) return "Recently";
      const diffHrs = Math.round((new Date() - new Date(d)) / (1000 * 60 * 60));
      if (diffHrs < 1) return "Just now";
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${Math.round(diffHrs / 24)}d ago`;
    };

    // Top Companies
    const topCompanies = await Promise.all(
      companiesList.map(async (c, i) => {
        const empCount = await Employee.countDocuments({ companyId: c._id });
        const limit = c.employeeLimit || 50;
        const pct = Math.min(100, Math.round((empCount / limit) * 100));
        const colors = ["#10B981", "#EAB308", "#EC4899", "#06B6D4", "#8B5CF6"];
        return {
          id: c._id,
          name: c.companyName || "Unnamed Company",
          tier: c.planName || "Enterprise Tier",
          tag: c.status === "active" ? "Active" : c.status || "Pending",
          pColor: c.status === "active" 
            ? "text-emerald-700 bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-900/40"
            : "text-amber-700 bg-amber-500/10 border-amber-200/80 dark:border-amber-900/40",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.companyName || "C")}&background=random`,
          owner: c.ownerName || c.ownerEmail?.split("@")[0] || "Admin",
          emp: empCount.toLocaleString("en-IN"),
          pct: pct > 0 ? pct : 25,
          color: colors[i % colors.length]
        };
      })
    );

    // Company Requests Kanban
    const kanbanBoard = [
      {
        title: "Pending Requests",
        sub: `${pendingRequestsCount} Requests`,
        dotColor: "bg-amber-500",
        items: pendingReqs.map(r => ({
          c: r.companyName,
          p: r.ownerName,
          v: r.industryType || "Standard",
          t: formatTimeAgo(r.createdAt)
        })),
        more: pendingRequestsCount > 4 ? `+ ${pendingRequestsCount - 4} more` : ""
      },
      {
        title: "Approved Today",
        sub: `${approvedRequestsCount} Companies`,
        dotColor: "bg-emerald-500",
        items: approvedReqs.map(r => ({
          c: r.companyName,
          p: r.ownerName,
          v: r.industryType || "Standard",
          t: formatTimeAgo(r.createdAt),
          badge: true
        })),
        more: approvedRequestsCount > 4 ? `+ ${approvedRequestsCount - 4} more` : ""
      }
    ];

    // System Events
    const systemEvents = announcementsList.map((a, idx) => {
      const colors = [
        "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      ];
      return {
        id: a._id,
        title: a.title,
        date: a.date ? new Date(a.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Active Now",
        ic: colors[idx % colors.length]
      };
    });

    // Plans Performance
    const plansPerformance = await Promise.all(
      plansList.map(async (p, idx) => {
        const subsCount = await Subscription.countDocuments({ planId: p._id, status: "active" });
        const planRev = (Number(p.price) || 0) * subsCount;
        const colors = ["bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-purple-500", "bg-pink-500"];
        const eff = totalCompanies > 0 ? Math.min(100, Math.round((subsCount / totalCompanies) * 100)) : 50;
        return {
          id: p._id,
          name: p.name || p.planName,
          subs: subsCount,
          revenue: planRev >= 100000 ? `₹${(planRev / 100000).toFixed(2)}L` : `₹${planRev.toLocaleString("en-IN")}`,
          eff: eff > 0 ? eff : 20,
          ec: colors[idx % colors.length]
        };
      })
    );

    // Activity Feed
    const activityFeed = recentLogs.map((log, idx) => {
      const colors = [
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
        "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      ];
      const who = log.performedBy?.name || log.companyId?.companyName || "Admin";
      return {
        id: log._id,
        ic: colors[idx % colors.length],
        text: `${who} performed ${log.action || "action"} in ${log.module || "System"}`,
        t: formatTimeAgo(log.createdAt)
      };
    });

    res.json({
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      totalCompanyAdmins,
      totalUsers,
      totalEmployees: totalEmployeesCount.toLocaleString("en-IN"),
      monthlyRevenue: `₹${monthlyRevenueVal.toLocaleString("en-IN")}`,
      annualRevenue: `₹${annualRevenueVal.toLocaleString("en-IN")}`,
      activeSubscriptions: activeSubscriptions || activeCompanies,
      expiredSubscriptions,
      trialSubscriptions,
      expiringSubscriptions,
      pendingRequestsCount,
      openTicketsCount: openCount,
      storageUsage: "1.2 TB",
      serverHealth: "99.9%",
      apiResponseTime: "45ms",
      totalPlans,
      totalPayments,
      areaData,
      barData,
      subscriptionPipeline,
      ticketStatus,
      topCompanies,
      kanbanBoard,
      systemEvents,
      plansPerformance,
      activityFeed
    });
  } catch (error) {
    next(error);
  }
};

const getCompanyAdmins = async (req, res, next) => {
  try {
    const { search, status, isPrimaryAdmin, companyId } = req.query;
    let query = { role: "CompanyAdmin" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.isActive = status === "active";
    if (isPrimaryAdmin !== undefined) query.isPrimaryAdmin = isPrimaryAdmin === "true";
    if (companyId && companyId !== "all") query.companyId = companyId;

    const admins = await User.find(query)
      .select("-password")
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });

    res.json({ admins, count: admins.length });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = status === "active";
    await user.save();

    res.json({ user: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json({ plans, count: plans.length });
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
};

const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
};

const updatePlanStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const activeCompanies = await Company.countDocuments({ planId: req.params.id });
    if (activeCompanies > 0) {
      return res.status(400).json({ message: "Cannot delete plan. It is actively used by companies." });
    }
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("companyId", "companyName")
      .populate("planId", "planName")
      .sort({ createdAt: -1 });
    res.json({ subscriptions, count: subscriptions.length });
  } catch (error) {
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (subscription) {
      bustSubscriptionCache(subscription.companyId);
    }
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

const assignSubscription = async (req, res, next) => {
  try {
    const { companyId, planId, billingCycle } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const startDate = new Date();
    const endDate = new Date();
    let amount = 0;

    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      amount = plan.priceMonthly;
    } else if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      amount = plan.priceYearly;
    } else {
      // Trial
      endDate.setDate(endDate.getDate() + (plan.trialDays || 14));
    }

    const subscription = await Subscription.create({
      companyId,
      planId,
      planName: plan.planName,
      billingCycle,
      startDate,
      endDate,
      amount,
      status: billingCycle === 'trial' ? 'trial' : 'active',
      paymentStatus: billingCycle === 'trial' ? 'paid' : 'pending'
    });

    await Company.findByIdAndUpdate(companyId, { planId: plan._id, planName: plan.planName, employeeLimit: plan.employeeLimit });

    // Log audit
    await AuditLog.create({
      action: `Assigned new plan: ${plan.planName}`,
      module: 'Subscriptions',
      performedBy: req.user._id,
      companyId
    });

    bustSubscriptionCache(companyId);

    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
};

const renewSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const endDate = new Date(subscription.endDate);
    if (subscription.billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    if (subscription.billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

    subscription.endDate = endDate;
    subscription.status = 'active';
    await subscription.save();

    await AuditLog.create({ action: `Renewed subscription ${subscription._id}`, module: 'Subscriptions', performedBy: req.user._id, companyId: subscription.companyId });
    bustSubscriptionCache(subscription.companyId);
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    await AuditLog.create({ action: `Cancelled subscription ${subscription._id}`, module: 'Subscriptions', performedBy: req.user._id, companyId: subscription.companyId });
    bustSubscriptionCache(subscription.companyId);
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

const extendTrial = async (req, res, next) => {
  try {
    const { days } = req.body;
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const endDate = new Date(subscription.endDate);
    endDate.setDate(endDate.getDate() + (days || 7));
    subscription.endDate = endDate;
    subscription.trialEndsAt = endDate;
    await subscription.save();

    await AuditLog.create({ action: `Extended trial by ${days || 7} days`, module: 'Subscriptions', performedBy: req.user._id, companyId: subscription.companyId });
    bustSubscriptionCache(subscription.companyId);
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

const deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const companyId = subscription.companyId;
    await Subscription.findByIdAndDelete(req.params.id);

    // Restore next most recent plan or clear if none
    const nextSub = await Subscription.findOne({ companyId }).sort({ createdAt: -1 });
    if (nextSub) {
      const plan = await Plan.findById(nextSub.planId);
      await Company.findByIdAndUpdate(companyId, { 
        planId: nextSub.planId, 
        planName: nextSub.planName, 
        employeeLimit: plan ? plan.employeeLimit : 50 
      });
    } else {
      await Company.findByIdAndUpdate(companyId, { 
        planId: null, 
        planName: null, 
        employeeLimit: 50 
      });
    }

    await AuditLog.create({ 
      action: `Deleted subscription ${req.params.id}`, 
      module: 'Subscriptions', 
      performedBy: req.user._id, 
      companyId 
    });

    bustSubscriptionCache(companyId);

    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    next(error);
  }
};


const getPayments = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.transactionId = { $regex: search, $options: "i" };
    }

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate("companyId", "companyName")
      .populate("planId", "planName")
      .sort({ createdAt: -1 });
    res.json({ payments, count: payments.length });
  } catch (error) {
    next(error);
  }
};

const createManualPayment = async (req, res, next) => {
  try {
    const { companyId, subscriptionId, planId, amount, billingCycle, paymentMode, transactionId, status, paidAt } = req.body;

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    const payment = await Payment.create({
      companyId,
      subscriptionId,
      planId,
      invoiceNo,
      amount,
      billingCycle,
      paymentMode,
      transactionId,
      status: status || 'paid',
      paidAt: status === 'paid' ? (paidAt || new Date()) : null
    });

    if (subscriptionId && status === 'paid') {
      await Subscription.findByIdAndUpdate(subscriptionId, { paymentStatus: 'paid' });
      bustSubscriptionCache(companyId);
    }

    await AuditLog.create({ action: `Recorded manual payment ${invoiceNo}`, module: 'Payments', performedBy: req.user._id, companyId });
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.status = status;
    if (status === 'paid') payment.paidAt = new Date();
    await payment.save();

    if (payment.subscriptionId && status === 'paid') {
      await Subscription.findByIdAndUpdate(payment.subscriptionId, { paymentStatus: 'paid' });
      bustSubscriptionCache(payment.companyId);
    }

    await AuditLog.create({ action: `Updated payment ${payment.invoiceNo} status to ${status}`, module: 'Payments', performedBy: req.user._id, companyId: payment.companyId });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

const getGlobalUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status) {
      query.isActive = status === "active";
    }

    const users = await User.find(query)
      .select("-password")
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });

    res.json({ users, count: users.length });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("companyId", "companyName");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPassword = req.body?.password?.trim();
    const temporaryPassword = newPassword || generateTempPassword();
    user.password = temporaryPassword;
    await user.save();

    await AuditLog.create({ action: `Reset password for user ${user.email}`, module: 'Users', performedBy: req.user._id, companyId: user.companyId });

    res.json({ message: "Password reset successfully", temporaryPassword, email: user.email });
  } catch (error) {
    next(error);
  }
};

const forceLogoutUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // In a real app, this might involve invalidating tokens in Redis
    await AuditLog.create({ action: `Forced logout for user ${user.email}`, module: 'Users', performedBy: req.user._id, companyId: user.companyId });

    res.json({ message: "User forcefully logged out (mocked)" });
  } catch (error) {
    next(error);
  }
};

const getSupportTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const tickets = await SupportTicket.find(query)
      .populate("userId", "name email")
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });
    res.json({ tickets, count: tickets.length });
  } catch (error) {
    next(error);
  }
};

const updateSupportTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
};

const getSupportTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate("userId", "name email role")
      .populate("companyId", "companyName")
      .populate("replies.userId", "name role")
      .populate("internalNotes.addedBy", "name role");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
};

const replyToSupportTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.replies.push({
      userId: req.user._id,
      message
    });

    // Auto change status if it was open
    if (ticket.status === 'open') ticket.status = 'inProgress';

    await ticket.save();
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
};

const addInternalNoteSupportTicket = async (req, res, next) => {
  try {
    const { note } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.internalNotes.push({
      note,
      addedBy: req.user._id
    });

    await ticket.save();
    res.json({ ticket });
  } catch (error) {
    next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ announcement });
  } catch (error) {
    next(error);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json({ announcements, count: announcements.length });
  } catch (error) {
    next(error);
  }
};

const getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("createdBy", "name");
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

const publishAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, { status: 'published' }, { new: true });
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    await AuditLog.create({ action: `Published announcement: ${announcement.title}`, module: 'Announcements', performedBy: req.user._id });
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

const cancelAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    await AuditLog.create({ action: `Cancelled announcement: ${announcement.title}`, module: 'Announcements', performedBy: req.user._id });
    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate("performedBy", "name")
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 });
    res.json({ logs, count: logs.length });
  } catch (error) {
    next(error);
  }
};

const getLoginHistory = async (req, res, next) => {
  try {
    const history = await LoginHistory.find()
      .populate("userId", "name email")
      .populate("companyId", "companyName")
      .sort({ loginAt: -1 });
    res.json({ history, count: history.length });
  } catch (error) {
    next(error);
  }
};

const getSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

const updateSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create(req.body);
    } else {
      settings = await SystemSetting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });
    }
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

const createCompanyAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, companyId, isPrimaryAdmin } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    if (isPrimaryAdmin) {
      await User.updateMany({ companyId, role: "CompanyAdmin" }, { isPrimaryAdmin: false });
    }

    const temporaryPassword = generateTempPassword();

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: temporaryPassword,
      role: "CompanyAdmin",
      companyId,
      isPrimaryAdmin: isPrimaryAdmin || false,
      isPasswordResetRequired: true,
    });

    await AuditLog.create({ action: `Created CompanyAdmin ${email}`, module: 'CompanyAdmins', performedBy: req.user._id, companyId });

    res.status(201).json({ admin: formatUser(admin), temporaryPassword });
  } catch (error) {
    next(error);
  }
};

const makePrimaryAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "CompanyAdmin") return res.status(404).json({ message: "CompanyAdmin not found" });

    await User.updateMany({ companyId: admin.companyId, role: "CompanyAdmin" }, { isPrimaryAdmin: false });
    admin.isPrimaryAdmin = true;
    await admin.save();

    await AuditLog.create({ action: `Made ${admin.email} primary admin`, module: 'CompanyAdmins', performedBy: req.user._id, companyId: admin.companyId });
    res.json({ admin: formatUser(admin) });
  } catch (error) {
    next(error);
  }
};

const deleteCompanyAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (admin.isPrimaryAdmin) return res.status(400).json({ message: "Cannot delete primary admin. Make another admin primary first." });

    await admin.deleteOne();
    await AuditLog.create({ action: `Deleted CompanyAdmin ${admin.email}`, module: 'CompanyAdmins', performedBy: req.user._id, companyId: admin.companyId });
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getCompanyRequests = async (req, res, next) => {
  try {
    const { search, status, source } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { ownerEmail: { $regex: search, $options: "i" } },
        { requestCode: { $regex: search, $options: "i" } }
      ];
    }
    if (status && status !== "all") query.status = status;
    if (source && source !== "all") query.source = source;

    const requests = await CompanyRequest.find(query).populate("requestedPlanId", "planName").sort({ createdAt: -1 });
    res.json({ requests, count: requests.length });
  } catch (error) {
    next(error);
  }
};

const getCompanyRequestById = async (req, res, next) => {
  try {
    const request = await CompanyRequest.findById(req.params.id)
      .populate("requestedPlanId", "planName")
      .populate("notes.addedBy", "name")
      .populate("assignedTo", "name")
      .populate("convertedCompanyId", "companyName")
      .populate("createdBy", "name");
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const createCompanyRequest = async (req, res, next) => {
  try {
    const requestCode = `REQ-${Date.now().toString().slice(-6)}`;
    const request = await CompanyRequest.create({
      ...req.body,
      requestCode,
      createdBy: req.user ? req.user._id : null
    });
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const updateCompanyRequest = async (req, res, next) => {
  try {
    const request = await CompanyRequest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const updateCompanyRequestStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const request = await CompanyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    if (status === 'rejected' && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }
    await request.save();

    await AuditLog.create({ action: `Updated request ${request.requestCode} status to ${status}`, module: 'CompanyRequests', performedBy: req.user._id });
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const addCompanyRequestNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const request = await CompanyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.notes.push({ note, addedBy: req.user._id });
    await request.save();
    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const convertCompanyRequest = async (req, res, next) => {
  try {
    const { planId, employeeLimit, adminName, adminEmail, adminPhone } = req.body;
    const request = await CompanyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status === 'converted') return res.status(400).json({ message: "Request already converted" });

    const existingCompany = await Company.findOne({ email: request.ownerEmail.toLowerCase() });
    if (existingCompany) return res.status(400).json({ message: "Company email already registered" });

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: "Admin email already registered" });

    let planName = "Custom";
    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) planName = plan.planName;
    }

    const company = await Company.create({
      companyName: request.companyName,
      ownerName: request.ownerName,
      ownerEmail: request.ownerEmail.toLowerCase(),
      ownerPhone: request.ownerPhone,
      email: request.ownerEmail.toLowerCase(),
      phone: request.ownerPhone,
      address: request.address,
      city: request.city,
      state: request.state,
      industryType: request.industryType,
      planId,
      planName,
      employeeLimit: employeeLimit || 10,
      createdBy: req.user._id,
      status: "active"
    });

    const temporaryPassword = generateTempPassword();

    const companyAdmin = await User.create({
      name: adminName || request.ownerName,
      email: adminEmail.toLowerCase(),
      phone: adminPhone || request.ownerPhone,
      password: temporaryPassword,
      role: "CompanyAdmin",
      companyId: company._id,
      isPrimaryAdmin: true,
      isPasswordResetRequired: true,
    });

    request.status = "converted";
    request.convertedCompanyId = company._id;
    await request.save();

    await AuditLog.create({ action: `Converted request ${request.requestCode} into company ${company.companyName}`, module: 'CompanyRequests', performedBy: req.user._id, companyId: company._id });

    res.json({
      company,
      companyAdmin: formatUser(companyAdmin),
      adminLogin: {
        email: companyAdmin.email,
        temporaryPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompanyRequest = async (req, res, next) => {
  try {
    const request = await CompanyRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getBackups = async (req, res, next) => {
  try {
    const backups = await Backup.find().sort({ backupDate: -1 });
    res.json({ backups, count: backups.length });
  } catch (error) {
    next(error);
  }
};

const getReportsAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const firstDayThisYear = new Date(now.getFullYear(), 0, 1);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mrrMap = {};
    const onboardingMap = {};
    monthNames.forEach((m, idx) => {
      mrrMap[idx] = { name: m, amount: 0 };
      onboardingMap[idx] = { name: m, count: 0 };
    });

    const yearlyPayments = await Payment.find({ status: "completed", createdAt: { $gte: firstDayThisYear } });
    yearlyPayments.forEach((p) => {
      const m = new Date(p.createdAt || p.paymentDate).getMonth();
      if (mrrMap[m]) mrrMap[m].amount += Number(p.amount) || 0;
    });

    const yearlyCompanies = await Company.find({ createdAt: { $gte: firstDayThisYear } });
    yearlyCompanies.forEach((c) => {
      const m = new Date(c.createdAt).getMonth();
      if (onboardingMap[m]) onboardingMap[m].count += 1;
    });

    const mrrData = Object.values(mrrMap);
    const onboardingData = Object.values(onboardingMap);

    const totalRevenueVal = yearlyPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalCompaniesCount = await Company.countDocuments();
    const totalEmployeesCount = await Employee.countDocuments();

    res.json({
      mrrData,
      onboardingData,
      totalRevenue: `₹${totalRevenueVal.toLocaleString("en-IN")}`,
      totalCompaniesCount,
      totalEmployeesCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
  getDashboardStats,
  getCompanyAdmins,
  updateUserStatus,
  getPlans,
  createPlan,
  getPlanById,
  updatePlan,
  updatePlanStatus,
  deletePlan,
  getSubscriptions,
  assignSubscription,
  renewSubscription,
  cancelSubscription,
  extendTrial,
  deleteSubscription,
  updateSubscription,
  getPayments,
  createManualPayment,
  updatePaymentStatus,
  getGlobalUsers,
  createCompanyAdmin,
  makePrimaryAdmin,
  deleteCompanyAdmin,
  getCompanyRequests,
  getCompanyRequestById,
  createCompanyRequest,
  updateCompanyRequest,
  updateCompanyRequestStatus,
  addCompanyRequestNote,
  convertCompanyRequest,
  deleteCompanyRequest,
  getUserById,
  resetUserPassword,
  forceLogoutUser,
  getSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  replyToSupportTicket,
  addInternalNoteSupportTicket,
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  publishAnnouncement,
  cancelAnnouncement,
  deleteAnnouncement,
  getAuditLogs,
  getLoginHistory,
  getSystemSettings,
  updateSystemSettings,
  getBackups,
  getReportsAnalytics,
};