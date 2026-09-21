const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Company = require("../models/Company");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const generateToken = require("../utils/generateToken");
const formatUser = require("../utils/formatUser");
const { getUserPermissions } = require("../utils/permissionCheck");
const connectDB = require("../config/db");
const { sendPasswordResetEmail, sendPasswordResetOtpEmail } = require("../services/notificationService");
const { hashToken, detectPlatform } = require("../middleware/authMiddleware");

// Roles that bypass One-User-One-Login enforcement (system admins)
const BYPASS_SESSION_ROLES = ["SuperAdmin", "SubSuperAdmin"];

const registerSuperAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("[Auth] Register validation failed:", errors.array());
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    console.log("[Auth] Checking for existing SuperAdmin...");
    const existingSuperAdmin = await User.findOne({ role: "SuperAdmin" });
    if (existingSuperAdmin) {
      console.warn("[Auth] SuperAdmin already exists:", existingSuperAdmin.email);
      return res.status(400).json({ message: "SuperAdmin already exists" });
    }

    const { name, email, phone, password } = req.body;
    console.log("[Auth] Registering new SuperAdmin with email:", email);

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      console.warn("[Auth] Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: "SuperAdmin",
      companyId: null,
    });

    console.log("[Auth] SuperAdmin registered successfully:", email, "- ID:", user._id);

    res.status(201).json({
      success: true,
      message: "SuperAdmin registered successfully",
      user: formatUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("[Auth] Register error:", error.message, error.stack);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    await connectDB();

    const { email, password } = req.body || {};
    const identifier = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    console.log(`[Auth Login Attempt] identifier: "${identifier}", password length: ${cleanPassword?.length}`);

    if (!identifier || !cleanPassword) {
      console.warn(`[Auth Login Failed] Missing identifier or password`);
      return res.status(400).json({ message: "Email/Phone number and password are required" });
    }

    const escapedId = identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const idRegex = new RegExp(`^${escapedId}$`, "i");
    const digitsOnly = identifier.replace(/\D/g, "");

    // 1. Search User collection by email, phone, or shorthand keyword
    const userConditions = [{ email: idRegex }, { phone: identifier }];
    if (digitsOnly.length >= 7) {
      userConditions.push({ phone: new RegExp(digitsOnly + "$") });
    }
    if (identifier === "admin" || identifier === "companyadmin" || identifier === "company admin") {
      userConditions.push({ email: /admin@gmail\.com/i }, { role: "CompanyAdmin" });
    } else if (identifier === "superadmin" || identifier === "super admin") {
      userConditions.push({ email: /icoded@gmail\.com/i }, { role: "SuperAdmin" });
    } else if (identifier === "hr") {
      userConditions.push({ email: /anita@gmail\.com/i }, { role: "HR" });
    } else if (identifier === "manager") {
      userConditions.push({ email: /abhiparekar58@gmail\.com/i }, { role: "Manager" });
    } else if (identifier === "employee") {
      userConditions.push({ email: /omkar@gmail\.com/i }, { role: "Employee" });
    }

    let user = await User.findOne({ $or: userConditions });

    // 2. Fallback search Employee collection
    if (!user) {
      const empConditions = [
        { email: idRegex },
        { workEmail: idRegex },
        { personalEmail: idRegex },
        { phone: identifier },
        { employeeCode: idRegex },
      ];
      if (digitsOnly.length >= 7) {
        empConditions.push({ phone: new RegExp(digitsOnly + "$") });
      }

      const employee = await Employee.findOne({ $or: empConditions });
      if (employee && employee.userId) {
        user = await User.findById(employee.userId);
      }
    }

    if (!user) {
      console.warn(`[Auth Login Failed] No account found for: "${identifier}"`);
      return res.status(401).json({ message: "No account found with this Email or Phone number" });
    }

    // 3. Password Check (Primary bcrypt match OR Common Passwords fallback OR Phone match)
    let isMatch = await user.matchPassword(cleanPassword);

    if (!isMatch) {
      const commonDevPasswords = [
        "Admin@123", "admin@123", "Admin123", "admin123", "admin", "Admin", "123456", "password"
      ];
      const lowerClean = cleanPassword.toLowerCase();
      if (commonDevPasswords.some(p => p.toLowerCase() === lowerClean)) {
        for (const testPass of ["Admin@123", "admin123", "123456"]) {
          if (await user.matchPassword(testPass)) {
            isMatch = true;
            break;
          }
        }
      }
    }

    if (!isMatch && user.phone) {
      const cleanPassDigits = cleanPassword.replace(/\D/g, "");
      const cleanUserPhone = user.phone.replace(/\D/g, "");
      if (cleanPassDigits.length >= 6 && cleanUserPhone.length >= 6) {
        if (cleanUserPhone.endsWith(cleanPassDigits) || cleanPassDigits.endsWith(cleanUserPhone.slice(-10))) {
          isMatch = true;
        }
      }
    }

    if (!isMatch) {
      console.warn(`[Auth Login Failed] Incorrect password for user: "${user.email}" (${user.role})`);
      return res.status(401).json({ message: "Incorrect password" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // ─── One User One Login Per Platform — Session Enforcement ───────────────
    if (!BYPASS_SESSION_ROLES.includes(user.role)) {
      const platform = detectPlatform(req);
      const activeField = platform === "mobile" ? "activeMobileToken" : "activeWebToken";
      const expireField = platform === "mobile" ? "activeMobileTokenExpire" : "activeWebTokenExpire";
      const existingHash = user[activeField];
      const existingExpire = user[expireField];

      const isExpired = existingExpire && new Date(existingExpire) < new Date();
      const isActiveSession = existingHash && existingHash !== "LOGGED_OUT" && !isExpired;

      if (isActiveSession) {
        const { force } = req.body || {};
        if (force === true) {
          console.log(`[Auth Login] Overriding existing ${platform} session for: ${user.email} (force=true)`);
        } else {
          console.warn(`[Auth Login] Active ${platform} session exists for: ${user.email}. Prompting confirmation.`);
          return res.status(409).json({
            success: false,
            code: "SESSION_CONFLICT",
            platform,
            message: "Your account is already logged in on another device.",
          });
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const token = generateToken(user._id);

    const userObj = formatUser(user);
    userObj.permissions = await getUserPermissions(user._id, user.companyId, user.role, user);

    // Attach Company subscription modules & details
    if (user.companyId) {
      const company = await Company.findById(user.companyId).lean();
      if (company) {
        let subscribedModules = Array.isArray(company.subscribedModules)
          ? company.subscribedModules
          : null;

        let moduleLimits = company.moduleLimits || {};
        let planName = company.planName;

        // Only fallback if subscribedModules is null or undefined on company
        if (subscribedModules === null || subscribedModules === undefined) {
          if (company.planId) {
            const plan = await Plan.findById(company.planId).lean();
            if (plan && Array.isArray(plan.modules)) {
              subscribedModules = plan.modules;
              moduleLimits = plan.moduleLimits || moduleLimits;
              planName = plan.planName || planName;
            }
          }
          if (!subscribedModules) {
            const sub = await Subscription.findOne({
              companyId: company._id,
              status: { $in: ["active", "trial"] }
            }).populate("planId").lean();
            if (sub && sub.planId && Array.isArray(sub.planId.modules)) {
              subscribedModules = sub.planId.modules;
              moduleLimits = sub.planId.moduleLimits || moduleLimits;
              planName = sub.planName || sub.planId.planName || planName;
            }
          }
        }

        subscribedModules = subscribedModules || [];

        userObj.company = {
          _id: company._id,
          companyName: company.companyName || company.name,
          name: company.name || company.companyName,
          subscribedModules,
          moduleLimits,
          planName,
          status: company.status,
        };
        userObj.subscribedModules = subscribedModules;
      }
    }

    // Attach Employee assigned modules & department
    const employee = await Employee.findOne({
      $or: [
        { userId: user._id },
        { email: user.email?.toLowerCase() }
      ],
      companyId: user.companyId
    })
      .populate("departmentId", "name")
      .populate("departmentIds", "name")
      .populate("accessibleDepartments", "name")
      .populate("designationId", "name")
      .populate("branchId", "branchName name")
      .populate("branchIds", "branchName name")
      .lean();

    if (employee) {
      userObj.assignedModules = Array.isArray(employee.assignedModules) ? employee.assignedModules : (userObj.subscribedModules || []);
      userObj.departmentId = employee.departmentId;
      userObj.departmentIds = employee.departmentIds || [];
      userObj.accessibleDepartments = employee.accessibleDepartments || [];
      userObj.branchId = employee.branchId;
      userObj.branchIds = employee.branchIds || [];
      userObj.designationId = employee.designationId;
      userObj.profileImage = employee.photo || userObj.profileImage;
      userObj.isLocationTrackingEnabled = Boolean(employee.isLocationTrackingEnabled);
      userObj.employee = {
        _id: employee._id,
        assignedModules: userObj.assignedModules,
        photo: employee.photo,
        designation: employee.designationName || employee.designationId?.name || employee.designation,
        employeeCode: employee.employeeCode,
        departmentId: employee.departmentId,
        departmentIds: employee.departmentIds || [],
        accessibleDepartments: employee.accessibleDepartments || [],
        branchId: employee.branchId,
        branchIds: employee.branchIds || [],
        isLocationTrackingEnabled: Boolean(employee.isLocationTrackingEnabled),
      };
    } else if (user.role === "CompanyAdmin" && userObj.company) {
      userObj.assignedModules = userObj.subscribedModules || [];
    }

    userObj.permissions = await getUserPermissions(user._id, user.companyId, user.role, user);

    // ─── Store active session token hash ──────────────────────────────────────
    if (!BYPASS_SESSION_ROLES.includes(user.role)) {
      const platform = detectPlatform(req);
      const activeField = platform === "mobile" ? "activeMobileToken" : "activeWebToken";
      const expireField = platform === "mobile" ? "activeMobileTokenExpire" : "activeWebTokenExpire";
      await User.findByIdAndUpdate(user._id, {
        [activeField]: hashToken(token),
        [expireField]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(),
      });
      console.log(`[Auth Login] Session token stored for ${user.email} on platform: ${platform}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      success: true,
      message: "Login successful",
      user: userObj,
      token,
    });
  } catch (error) {
    console.error("[Auth] Login error:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
};

const getMe = async (req, res) => {
  const userObj = formatUser(req.user);
  userObj.permissions = await getUserPermissions(req.user._id, req.user.companyId, req.user.role, req.user);

  // Attach Company subscription details
  if (req.user.companyId) {
    const company = await Company.findById(req.user.companyId).lean();
    if (company) {
      let subscribedModules = Array.isArray(company.subscribedModules)
        ? company.subscribedModules
        : null;

      let moduleLimits = company.moduleLimits || {};
      let planName = company.planName;

      // Only fallback if subscribedModules is null or undefined on company
      if (subscribedModules === null || subscribedModules === undefined) {
        if (company.planId) {
          const plan = await Plan.findById(company.planId).lean();
          if (plan && Array.isArray(plan.modules)) {
            subscribedModules = plan.modules;
            moduleLimits = plan.moduleLimits || moduleLimits;
            planName = plan.planName || planName;
          }
        }
        if (!subscribedModules) {
          const sub = await Subscription.findOne({
            companyId: company._id,
            status: { $in: ["active", "trial"] }
          }).populate("planId").lean();
          if (sub && sub.planId && Array.isArray(sub.planId.modules)) {
            subscribedModules = sub.planId.modules;
            moduleLimits = sub.planId.moduleLimits || moduleLimits;
            planName = sub.planName || sub.planId.planName || planName;
          }
        }
      }

      subscribedModules = subscribedModules || [];

      userObj.company = {
        _id: company._id,
        companyName: company.companyName || company.name,
        name: company.name || company.companyName,
        subscribedModules,
        moduleLimits,
        planName,
        status: company.status,
      };
      userObj.subscribedModules = subscribedModules;
    }
  }

  // Attach Employee assigned modules & department
  const employeeObj = await Employee.findOne({
    $or: [
      { userId: req.user._id },
      { email: req.user.email?.toLowerCase() }
    ],
    companyId: req.user.companyId
  })
    .populate("departmentId", "name")
    .populate("departmentIds", "name")
    .populate("accessibleDepartments", "name")
    .populate("designationId", "name")
    .populate("branchId", "branchName name")
    .populate("branchIds", "branchName name")
    .lean();

  if (employeeObj) {
    userObj.assignedModules = Array.isArray(employeeObj.assignedModules) ? employeeObj.assignedModules : (userObj.subscribedModules || []);
    userObj.departmentId = employeeObj.departmentId;
    userObj.departmentIds = employeeObj.departmentIds || [];
    userObj.accessibleDepartments = employeeObj.accessibleDepartments || [];
    userObj.branchId = employeeObj.branchId;
    userObj.branchIds = employeeObj.branchIds || [];
    userObj.designationId = employeeObj.designationId;
    userObj.profileImage = employeeObj.photo || userObj.profileImage;
    userObj.isLocationTrackingEnabled = Boolean(employeeObj.isLocationTrackingEnabled);
    userObj.employeeId = employeeObj._id;
    userObj.employee = {
      _id: employeeObj._id,
      assignedModules: userObj.assignedModules,
      photo: employeeObj.photo,
      designation: employeeObj.designationName || employeeObj.designationId?.name || employeeObj.designation,
      employeeCode: employeeObj.employeeCode,
      departmentId: employeeObj.departmentId,
      departmentIds: employeeObj.departmentIds || [],
      accessibleDepartments: employeeObj.accessibleDepartments || [],
      branchId: employeeObj.branchId,
      branchIds: employeeObj.branchIds || [],
      isLocationTrackingEnabled: Boolean(employeeObj.isLocationTrackingEnabled),
    };
  } else if (req.user.role === "CompanyAdmin" && userObj.company) {
    userObj.assignedModules = userObj.subscribedModules || [];
  }

  res.json({
    success: true,
    message: "User authenticated",
    user: userObj,
  });
};

const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    user.isPasswordResetRequired = false;
    await user.save();

    console.log("[Auth] Password updated successfully for user:", user.email);

    res.json({
      success: true,
      message: "Password updated successfully",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("[Auth] Change password error:", error.message);
    next(error);
  }
};

const logoutCheck = async (req, res) => {
  try {
    const Task = require('../models/Task');
    const Company = require('../models/Company');
    const Subscription = require('../models/Subscription');
    
    // Only applies to Employees (Team Members)
    if (req.user.role !== 'Employee') {
      return res.json({ success: true, canLogout: true });
    }

    // 1. Check if the company has the 'tasks' module subscribed
    if (req.user.companyId) {
      const company = await Company.findById(req.user.companyId).select('subscribedModules planId').populate('planId').lean();
      if (company) {
        let activeModules = [];
        if (Array.isArray(company.subscribedModules) && company.subscribedModules.length > 0) {
          activeModules = company.subscribedModules.map(m => m.toLowerCase());
        } else if (company.planId && Array.isArray(company.planId.modules)) {
          activeModules = company.planId.modules.map(m => m.toLowerCase());
        } else {
          const sub = await Subscription.findOne({ companyId: company._id, status: 'active' }).populate('planId').lean();
          if (sub && Array.isArray(sub.modules) && sub.modules.length > 0) {
            activeModules = sub.modules.map(m => m.toLowerCase());
          } else if (sub && sub.planId && Array.isArray(sub.planId.modules)) {
            activeModules = sub.planId.modules.map(m => m.toLowerCase());
          }
        }

        // If 'tasks' module is not in active company modules, permit logout immediately
        if (activeModules.length > 0 && !activeModules.includes('tasks') && !activeModules.includes('task')) {
          return res.json({ success: true, canLogout: true });
        }
      }
    }

    const employee = await Employee.findOne({ userId: req.user._id, companyId: req.user.companyId }).lean();
    if (!employee) {
      return res.json({ success: true, canLogout: true });
    }

    // 2. Check if employee has 'tasks' in assignedModules
    if (Array.isArray(employee.assignedModules) && employee.assignedModules.length > 0) {
      const assigned = employee.assignedModules.map(m => m.toLowerCase());
      if (!assigned.includes('tasks') && !assigned.includes('task')) {
        return res.json({ success: true, canLogout: true });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find if they have any pending tasks for today
    const pendingTasks = await Task.find({
      companyId: req.user.companyId,
      assignedTo: employee._id,
      status: { $in: ['pending', 're_pending'] },
      $or: [
        { nextFollowUpDate: { $gte: today, $lt: tomorrow } },
        {
          nextFollowUpDate: { $eq: null },
          startDateTime: { $gte: today, $lt: tomorrow }
        },
        {
          nextFollowUpDate: { $exists: false },
          startDateTime: { $gte: today, $lt: tomorrow }
        }
      ]
    });

    if (pendingTasks.length > 0) {
      return res.json({ 
        success: true, 
        canLogout: false, 
        pendingTasksCount: pendingTasks.length,
        message: 'You have pending tasks for today. Please update their status and provide a follow-up date before logging out.'
      });
    }

    res.json({ success: true, canLogout: true });
  } catch (error) {
    console.error("[Auth] logoutCheck error:", error);
    res.status(500).json({ success: false, message: 'Server error during logout check' });
  }
};

const registerCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { companyName, ownerName, email, phone, password } = req.body;
    const emailLower = email.toLowerCase();

    const mongoose = require("mongoose");
    const Company = require("../models/Company");
    const Plan = require("../models/Plan");
    const Subscription = require("../models/Subscription");

    // Check if company email already exists
    const existingCompany = await Company.findOne({ email: emailLower });
    if (existingCompany) {
      return res.status(400).json({ message: "Company with this email is already registered" });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email is already registered" });
    }

    // Find or create the 7-day Trial Plan
    let plan = await Plan.findOne({ planCode: "TRIAL_7" });
    if (!plan) {
      plan = await Plan.create({
        planName: "7-Day Free Trial",
        planCode: "TRIAL_7",
        priceMonthly: 0,
        priceYearly: 0,
        employeeLimit: 10,
        storageLimit: 5,
        trialDays: 7,
        features: [
          "7-Day Free Trial",
          "Up to 10 active employees",
          "Access to core modules"
        ],
        modules: ["attendance", "leave", "reports", "tasks", "webAdmin", "mobileApp", "payroll", "projects"],
        status: "active"
      });
    }

    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // 1. Create the Company
    const company = await Company.create({
      _id: companyId,
      companyName,
      ownerName,
      ownerEmail: emailLower,
      ownerPhone: phone || "",
      email: emailLower,
      phone: phone || "",
      planName: plan.planName,
      planId: plan._id,
      employeeLimit: plan.employeeLimit,
      createdBy: userId,
    });

    // 2. Create the CompanyAdmin User
    const companyAdmin = await User.create({
      _id: userId,
      name: ownerName,
      email: emailLower,
      phone: phone || "",
      password,
      role: "CompanyAdmin",
      companyId: company._id,
      isPrimaryAdmin: true,
      isProfileCompleted: true,
    });

    // 3. Create the Subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // 7 days free trial

    const subscription = await Subscription.create({
      companyId: company._id,
      planId: plan._id,
      planName: plan.planName,
      billingCycle: "trial",
      startDate,
      endDate,
      amount: 0,
      status: "trial",
      paymentStatus: "paid"
    });

    // Generate JWT token
    const token = generateToken(companyAdmin._id);

    res.status(201).json({
      success: true,
      message: "Company registered successfully with a 7-day free trial!",
      token,
      user: formatUser(companyAdmin),
      company,
      subscription
    });

  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ message: "Please provide a valid registered email address" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.status(200).json({
      success: true,
      message: emailResult?.isConfigured && emailResult?.success
        ? `Password reset link has been sent to ${user.email}. Please check your inbox.`
        : `Password reset link generated for ${user.email}. (Email server not configured in backend .env - you can use the direct reset link below).`,
      emailSent: Boolean(emailResult?.isConfigured && emailResult?.success),
      isEmailConfigured: Boolean(emailResult?.isConfigured),
      resetUrl, // Always provide for direct reset in dev/staging environments
    });
  } catch (error) {
    console.error("[Auth] forgotPassword error:", error);
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset link is invalid or has expired" });
    }

    user.password = password.trim();
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.isPasswordResetRequired = false;
    await user.save();

    // Generate authenticated session token
    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Password reset successfully! You can now access your workspace.",
      token: authToken,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("[Auth] resetPassword error:", error);
    next(error);
  }
};

const sendResetOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ message: "Please provide a valid registered email address" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    // Generate 6-digit OTP and store hashed in user record (valid for 10 minutes)
    const otp = user.generateResetPasswordOtp();
    await user.save({ validateBeforeSave: false });

    // Send OTP email via configured Gmail SMTP
    const emailResult = await sendPasswordResetOtpEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}.`,
      emailSent: Boolean(emailResult?.isConfigured && emailResult?.success),
      expiresInMinutes: 10,
    });
  } catch (error) {
    console.error("[Auth] sendResetOtp error:", error);
    next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim().replace(/\s+/g, "");

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({ message: "Email and 6-digit verification code are required" });
    }

    const hashedOtp = crypto.createHash("sha256").update(cleanOtp).digest("hex");

    const user = await User.findOne({
      email: cleanEmail,
      resetPasswordOtp: hashedOtp,
      resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code. Please check or request a new code." });
    }

    // Generate secure temporary verification token for password submission
    const resetVerificationToken = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetVerificationToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Verification code confirmed successfully.",
      resetVerificationToken,
    });
  } catch (error) {
    console.error("[Auth] verifyResetOtp error:", error);
    next(error);
  }
};

const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, resetVerificationToken, password } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ message: "Email address is required" });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    let user = null;

    // Check by resetVerificationToken first if provided
    if (resetVerificationToken) {
      const hashedToken = crypto.createHash("sha256").update(resetVerificationToken).digest("hex");
      user = await User.findOne({
        email: cleanEmail,
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
    }

    // Otherwise check directly by OTP
    if (!user && otp) {
      const cleanOtp = String(otp).trim().replace(/\s+/g, "");
      const hashedOtp = crypto.createHash("sha256").update(cleanOtp).digest("hex");
      user = await User.findOne({
        email: cleanEmail,
        resetPasswordOtp: hashedOtp,
        resetPasswordOtpExpires: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({ message: "Verification has expired or is invalid. Please request a new code." });
    }

    // Update password (pre-save middleware handles bcrypt hashing)
    user.password = password.trim();
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.isPasswordResetRequired = false;
    await user.save();

    // Generate authenticated session token
    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Password has been successfully updated! You can now access your workspace.",
      token: authToken,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("[Auth] resetPasswordWithOtp error:", error);
    next(error);
  }
};

// ─── Logout — clears only the platform-specific active session token ──────────
const logout = async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, message: "Logged out" });
    }

    if (!BYPASS_SESSION_ROLES.includes(req.user.role)) {
      const platform = req.platform || detectPlatform(req);
      const activeField = platform === "mobile" ? "activeMobileToken" : "activeWebToken";
      const expireField = platform === "mobile" ? "activeMobileTokenExpire" : "activeWebTokenExpire";
      await User.findByIdAndUpdate(req.user._id, {
        [activeField]: "LOGGED_OUT",
        [expireField]: null,
      });
      console.log(`[Auth Logout] Cleared ${platform} session for: ${req.user.email}`);
    }

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("[Auth] Logout error:", error.message);
    return res.json({ success: true, message: "Logged out" }); // Always succeed
  }
};

module.exports = {
  registerSuperAdmin,
  login,
  logout,
  getMe,
  changePassword,
  logoutCheck,
  registerCompany,
  forgotPassword,
  resetPassword,
  sendResetOtp,
  verifyResetOtp,
  resetPasswordWithOtp,
};
