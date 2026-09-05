const { validationResult } = require("express-validator");
const User = require("../models/User");
const Employee = require("../models/Employee");
const AuditLog = require("../models/AuditLog");
const Designation = require("../models/Designation");
const Branch = require("../models/Branch");
const LeaveBalance = require("../models/LeaveBalance");
const CompanyLeaveSettings = require("../models/CompanyLeaveSettings");
const Company = require("../models/Company");
const {
  findCompanyResource,
  validateDepartmentBelongsToCompany,
} = require("../utils/companyScope");
const generateNextEmployeeCode = require("../utils/generateNextEmployeeCode");
const tempPasswordFromPhone = require("../utils/tempPasswordFromPhone");
const { notifyUser } = require("../utils/notificationHelper");

const populateEmployee = [
  { path: "userId", select: "role" },
  { path: "departmentId", select: "name" },
  { path: "designationId", select: "name" },
  { path: "branchId", select: "branchName" },
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
    return true;
  }
  return false;
};

const syncUserFromEmployeeStatus = async (employee) => {
  if (!employee?.userId) return;
  const isActive = employee.status === "active";
  await User.findByIdAndUpdate(employee.userId, { isActive });
};

const validateRefsForCompany = async (body, companyId) => {
  if (body.departmentId) {
    const dept = await validateDepartmentBelongsToCompany(
      body.departmentId,
      companyId
    );
    if (!dept) return "Invalid department for this company";
  }

  if (body.designationId) {
    const des = await findCompanyResource(
      Designation,
      body.designationId,
      companyId
    );
    if (!des) return "Invalid designation for this company";
    if (body.departmentId) {
      if (des.departmentId.toString() !== body.departmentId.toString()) {
        return "Designation does not belong to the selected department";
      }
    }
  }

  if (body.branchId) {
    const branch = await findCompanyResource(Branch, body.branchId, companyId);
    if (!branch) return "Invalid branch for this company";
  }

  return null;
};

const buildEmployeeFilter = (req) => {
  const {
    search,
    departmentId,
    designationId,
    branchId,
    employmentType,
    status,
    module: moduleFilter,
  } = req.query;

  const filter = { companyId: req.companyId };

  if (departmentId) filter.departmentId = departmentId;
  if (designationId) filter.designationId = designationId;
  if (branchId) filter.branchId = branchId;
  if (employmentType) filter.employmentType = employmentType;
  if (status) filter.status = status;
  if (moduleFilter) filter.assignedModules = moduleFilter;

  if (search && String(search).trim()) {
    const q = String(search).trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
      { employeeCode: regex },
    ];
  }

  return filter;
};

const getModuleUsage = async (req, res, next) => {
  try {
    const companyId = req.companyId || req.user.companyId;
    const company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).json({ message: "Company not found" });

    const activeEmployees = await Employee.find({ companyId, status: "active" })
      .select("firstName lastName email employeeCode assignedModules")
      .lean();
    const totalActiveEmployees = activeEmployees.length;

    // Collect all modules from subscribed list and moduleLimits
    const rawSubscribed = Array.isArray(company.subscribedModules) && company.subscribedModules.length > 0
      ? company.subscribedModules
      : ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads", "mobileApp", "webAdmin"];
    
    // Normalize module names to unique keys
    const moduleSet = new Set(rawSubscribed.map(m => String(m).toLowerCase().trim()));
    if (company.moduleLimits) {
      Object.keys(company.moduleLimits).forEach(k => moduleSet.add(k.toLowerCase().trim()));
    }
    // Always include core modules
    ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"].forEach(k => moduleSet.add(k));

    const moduleLimits = company.moduleLimits || {};
    const companyPlanLimit = company.employeeLimit || 10;

    const MODULE_METADATA = {
      attendance: { label: "Attendance & Time Tracker", desc: "GPS clock-in, geofence, shifts & regularization", category: "Core HR" },
      leave: { label: "Leave & Absence Management", desc: "Paid leave balances, approvals & holiday calendar", category: "Core HR" },
      payroll: { label: "Payroll & Compensation", desc: "Salary slips, tax calculations, advances & EPF/ESI", category: "Finance" },
      tasks: { label: "Workforce Tasks & Delegation", desc: "Daily work assignment, subtasks & task priority", category: "Productivity" },
      projects: { label: "Projects & Milestone Board", desc: "Team collaboration, project tracking & progress", category: "Productivity" },
      reports: { label: "Analytics & Detailed Reports", desc: "HR analytics, attendance summaries & payroll reports", category: "Analytics" },
      leads: { label: "Lead CRM & WhatsApp Engine", desc: "Lead pipeline, automated followup & WhatsApp CRM", category: "Sales & CRM" },
      mobileapp: { label: "Mobile App Access", desc: "Native iOS / Android app login & attendance punch", category: "Platform" },
      webadmin: { label: "Web Portal Access", desc: "Desktop web dashboard and portal workspace", category: "Platform" },
    };

    const usage = {};
    const detailedBreakdown = [];

    for (const mod of Array.from(moduleSet)) {
      const modLower = mod.toLowerCase();
      const meta = MODULE_METADATA[modLower] || {
        label: mod.charAt(0).toUpperCase() + mod.slice(1),
        desc: "Module access and feature set",
        category: "General"
      };

      // Count employees who have this module assigned
      const assignedEmps = activeEmployees.filter(e => {
        if (!Array.isArray(e.assignedModules) || e.assignedModules.length === 0) {
          // Default suite modules for legacy/standard employees
          return ["attendance", "leave", "payroll", "reports"].includes(modLower);
        }
        return e.assignedModules.some(m => String(m).toLowerCase().trim() === modLower);
      });

      const used = assignedEmps.length;
      const customLimitVal = moduleLimits[modLower] ?? moduleLimits[mod];
      const hasCustomLimit = customLimitVal !== undefined && customLimitVal > 0;
      const limit = hasCustomLimit ? customLimitVal : companyPlanLimit;
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

      usage[modLower] = {
        key: modLower,
        label: meta.label,
        subscribed: true,
        limit,
        used,
        remaining,
        percentage,
        isUnlimited: !hasCustomLimit && limit >= companyPlanLimit,
        isFull: remaining <= 0,
      };

      detailedBreakdown.push({
        key: modLower,
        label: meta.label,
        description: meta.desc,
        category: meta.category,
        limit,
        used,
        remaining,
        percentage,
        isFull: remaining <= 0,
        employees: assignedEmps.map(e => ({
          _id: e._id,
          name: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email,
          email: e.email,
          employeeCode: e.employeeCode || "",
        }))
      });
    }

    res.json({
      success: true,
      companyLimit: companyPlanLimit,
      totalActiveEmployees,
      subscribedModules: Array.from(moduleSet),
      moduleLimits,
      usage,
      detailedBreakdown
    });
  } catch (error) {
    next(error);
  }
};

const getMyEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.user.employeeId,
      companyId: req.companyId,
    })
      .populate(populateEmployee)
      .populate("createdBy", "name email");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ employee });
  } catch (error) {
    next(error);
  }
};

const getEmployees = async (req, res, next) => {
  try {
    console.log("DB QUERY: getEmployees");
    const filter = buildEmployeeFilter(req);
    const employees = await Employee.find(filter)
      .select("employeeCode firstName lastName fullName email phone photo documents gender dateOfBirth departmentId departmentIds designationId branchId status role userId managerAccessLevel accessibleDepartments permissions assignedModules joiningDate createdAt")
      .populate([
        { path: "userId", select: "role profileImage name email assignedModules" },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
        { path: "accessibleDepartments", select: "name" },
      ])
      .lean();

    const normalized = employees.map((emp) => {
      const resolvedPhoto = emp.photo || emp.documents?.photo || emp.userId?.profileImage || "";
      return {
        ...emp,
        photo: resolvedPhoto,
      };
    });

    normalized.sort((a, b) => {
      const ma = /^EMP-(\d+)$/i.exec(a.employeeCode || "");
      const mb = /^EMP-(\d+)$/i.exec(b.employeeCode || "");
      const na = ma ? parseInt(ma[1], 10) : 0;
      const nb = mb ? parseInt(mb[1], 10) : 0;
      return na - nb;
    });

    res.json({ employees: normalized, count: normalized.length });
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    })
      .populate([
        { path: "userId", select: "role profileImage name email" },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
        { path: "branchId", select: "branchName" },
        { path: "accessibleDepartments", select: "name" },
      ])
      .populate("createdBy", "name email");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const empObj = employee.toObject();
    empObj.photo = empObj.photo || empObj.documents?.photo || empObj.userId?.profileImage || "";

    res.json({ employee: empObj });
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const companyId = req.companyId;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const employeeCount = await User.countDocuments({ 
      companyId, 
      isActive: true, 
      role: { $in: ["Employee", "Manager", "HR"] } 
    });

    if (employeeCount >= (company.employeeLimit || 50)) {
      return res.status(400).json({ 
        message: `Active employee limit reached (${company.employeeLimit || 50}). Please upgrade your subscription plan to add more employees.` 
      });
    }

    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      photo,
      gender,
      dateOfBirth,
      joiningDate,
      confirmationDate,
      departmentId,
      departmentIds,
      designationId,
      branchId,
      employmentType,
      workMode,
      salary,
      address,
      permanentAddress,
      emergencyContact,
      emergencyContactName,
      emergencyContactPhone,
      documents,
      loginRole,
      managerAccessLevel,
      accessibleDepartments,
      allowRemotePunch,
      reportingManagerId,
      leaveBalance,
      permissions,
      salaryDetails,
      bankDetails,
      aadhaarNumber,
      panNumber,
      maritalStatus,
      noticePeriod,
      password: reqPassword,
    } = req.body;

    // Support multi-department: use first departmentId from array if departmentId not set
    const resolvedDeptId = departmentId ||
      (Array.isArray(departmentIds) && departmentIds.length > 0 ? departmentIds[0] : null);

    const emailLower = email.toLowerCase();
    let effectiveDeptId = resolvedDeptId;
    let effectiveDesigId = designationId;

    if (effectiveDesigId && !effectiveDeptId) {
      const des = await findCompanyResource(
        Designation,
        effectiveDesigId,
        companyId
      );
      if (des) {
        effectiveDeptId = des.departmentId;
      }
    }

    const refErr = await validateRefsForCompany(
      {
        departmentId: effectiveDeptId,
        designationId: effectiveDesigId,
        branchId,
      },
      companyId
    );
    if (refErr) {
      return res.status(400).json({ message: refErr });
    }

    // Manager Department check
    if (req.user && req.user.role === "Manager") {
      // Manager can only create Employee (Team Member)
      const requestedRole = loginRole || "Employee";
      if (requestedRole !== "Employee") {
        return res.status(403).json({ message: "Forbidden: Managers can only create Team Members" });
      }

      const managerEmp = await Employee.findOne({ userId: req.user._id, companyId }).lean();
      if (managerEmp) {
        const primaryDeptId = managerEmp.departmentId;
        const allowedDeptIds = (managerEmp.accessibleDepartments || []).map(id => id.toString());
        
        const managerDeptIds = [];
        if (primaryDeptId) managerDeptIds.push(primaryDeptId.toString());
        allowedDeptIds.forEach(id => {
          if (id) managerDeptIds.push(id);
        });

        const resolvedDeptStr = effectiveDeptId ? effectiveDeptId.toString() : null;
        if (!resolvedDeptStr || !managerDeptIds.includes(resolvedDeptStr)) {
          return res.status(403).json({ message: "Forbidden: You can only add employees to your own department(s)" });
        }
      }
    }

    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingEmployeeEmail = await Employee.findOne({
      companyId,
      email: emailLower,
    });
    if (existingEmployeeEmail) {
      return res.status(400).json({ message: "Employee email already exists" });
    }

    const role = loginRole && ["Employee", "Manager", "HR", "CompanyAdmin"].includes(loginRole)
      ? loginRole
      : "Employee";

    const temporaryPassword = (reqPassword && reqPassword.trim().length >= 6)
      ? reqPassword.trim()
      : tempPasswordFromPhone(phone || "000000");
    const employeeCode = await generateNextEmployeeCode(companyId);

    const fullName = [firstName?.trim(), middleName?.trim(), lastName?.trim()].filter(Boolean).join(" ");

    // Module allocation check against plan limits
    const rawSubscribed = Array.isArray(company.subscribedModules) && company.subscribedModules.length > 0
      ? company.subscribedModules
      : ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"];
    const subscribed = rawSubscribed.map(m => String(m).toLowerCase().trim());
    const limits = company.moduleLimits || {};

    let finalAssignedModules = req.body.assignedModules;
    if (!Array.isArray(finalAssignedModules) || finalAssignedModules.length === 0) {
      finalAssignedModules = subscribed;
    } else {
      finalAssignedModules = finalAssignedModules.map(m => String(m).toLowerCase().trim());
    }

    for (const mod of finalAssignedModules) {
      if (!subscribed.includes(mod)) {
        return res.status(400).json({
          message: `Module "${mod}" is not included in the company's active subscription plan.`
        });
      }
      // Check per-module seat cap if a custom limit is set (0 = unlimited)
      if (limits[mod] && limits[mod] > 0) {
        const usedCount = await Employee.countDocuments({
          companyId,
          status: "active",
          assignedModules: mod
        });
        if (usedCount >= limits[mod]) {
          return res.status(400).json({
            message: `Seat quota for "${mod}" module reached (${limits[mod]} seats). Please upgrade your plan to assign more employees to this module.`
          });
        }
      }
    }

    const user = await User.create({
      name: fullName,
      email: emailLower,
      phone,
      password: temporaryPassword,
      role,
      companyId,
      isPasswordResetRequired: true,
      assignedModules: finalAssignedModules,
    });

    let finalPermissions = permissions;
    if (!finalPermissions || Object.keys(finalPermissions).length === 0) {
      if (role === "HR") {
        finalPermissions = {
          tasks: { create: true, edit: true, shift: true, cancel: true, reopen: true },
          leaves: { approveReject: true },
          teamMembers: { add: true, edit: true, activeInactive: true },
          announcementsHolidays: true,
        };
      } else if (role === "Manager") {
        finalPermissions = {
          tasks: { create: true, edit: true, shift: true, cancel: false, reopen: true },
          leaves: { approveReject: true },
          teamMembers: { add: false, edit: false, activeInactive: false },
          announcementsHolidays: false,
        };
      } else {
        finalPermissions = {
          tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false },
          leaves: { approveReject: false },
          teamMembers: { add: false, edit: false, activeInactive: false },
          announcementsHolidays: false,
        };
      }
    }

    let employee = null;

    try {
      employee = await Employee.create({
        companyId,
        userId: user._id,
        employeeCode,
        firstName,
        middleName: middleName || "",
        lastName: lastName || "",
        email: emailLower,
        phone,
        photo,
        gender,
        role,
        assignedModules: finalAssignedModules,
        dateOfBirth: dateOfBirth || null,
        joiningDate: joiningDate || null,
        confirmationDate: confirmationDate || null,
        departmentId: effectiveDeptId || null,
        departmentIds: Array.isArray(departmentIds) && departmentIds.length > 0
          ? departmentIds
          : (effectiveDeptId ? [effectiveDeptId] : []),
        designationId: effectiveDesigId || null,
        branchId: branchId || null,
        employmentType,
        workMode,
        allowRemotePunch: allowRemotePunch === true,
        salary: salary !== undefined && salary !== "" ? Number(salary) : null,
        salaryDetails: salaryDetails || undefined,
        // Map frontend address {street, city, state, pincode, country} → currentAddress schema
        currentAddress: address ? {
          addressLine1: address.street || address.addressLine1 || "",
          city: address.city || "",
          state: address.state || "",
          pincode: address.pincode || "",
          country: address.country || "India",
        } : undefined,
        // Map permanentAddress (same structure)
        permanentAddress: permanentAddress ? {
          sameAsCurrent: permanentAddress.sameAsCurrent || false,
          addressLine1: permanentAddress.street || permanentAddress.addressLine1 || "",
          city: permanentAddress.city || "",
          state: permanentAddress.state || "",
          pincode: permanentAddress.pincode || "",
          country: permanentAddress.country || "India",
        } : undefined,
        // emergencyContact object from frontend
        emergencyContact: emergencyContact ? {
          name: emergencyContact.name || emergencyContactName || "",
          relationship: emergencyContact.relationship || "",
          phone: emergencyContact.phone || emergencyContactPhone || "",
        } : (emergencyContactName ? {
          name: emergencyContactName,
          phone: emergencyContactPhone || "",
        } : undefined),
        bankDetails: bankDetails || undefined,
        aadhaarNumber: aadhaarNumber || undefined,
        panNumber: panNumber || undefined,
        maritalStatus: maritalStatus || undefined,
        noticePeriod: noticePeriod || undefined,
        documents: (documents && !Array.isArray(documents) && typeof documents === "object") ? documents : {},
        status: "active",
        managerAccessLevel: managerAccessLevel || "team",
        accessibleDepartments: accessibleDepartments || [],
        reportingManagerId: reportingManagerId || null,
        permissions: finalPermissions || {},
        createdBy: req.user._id,
      });

      user.employeeId = employee._id;
      if (photo || documents?.photo) {
        user.profileImage = photo || documents?.photo;
      }
      await user.save();

      // Create initial leave balance
      let settings = null;
      if (!leaveBalance) {
        settings = await CompanyLeaveSettings.findOne({ companyId });
        if (!settings) {
          settings = await CompanyLeaveSettings.create({ companyId });
        }
      }

      await LeaveBalance.create({
        companyId,
        employeeId: employee._id,
        casual: leaveBalance && leaveBalance.casual !== undefined ? Number(leaveBalance.casual) : (settings ? settings.defaultCasualLeaves : 0),
        sick: leaveBalance && leaveBalance.sick !== undefined ? Number(leaveBalance.sick) : (settings ? settings.defaultSickLeaves : 0),
        annual: leaveBalance && leaveBalance.annual !== undefined ? Number(leaveBalance.annual) : (settings ? settings.defaultAnnualLeaves : 0),
        lop: leaveBalance && leaveBalance.lop !== undefined ? Number(leaveBalance.lop) : (settings ? settings.defaultUnpaidLeaves : 0),
      });
    } catch (err) {
      await User.findByIdAndDelete(user._id);
      if (employee && employee._id) {
        await Employee.findByIdAndDelete(employee._id);
      }
      if (err.code === 11000) {
        return res.status(400).json({ message: "Duplicate employee or employee code" });
      }
      throw err;
    }

    await syncUserFromEmployeeStatus(employee);

    // Notify employee of their new account
    try {
      await notifyUser(
        user._id,
        companyId,
        "Welcome to HRMS!",
        `Your account has been created. Login with your email.`,
        "profile",
        { employeeId: employee._id.toString() }
      );
    } catch (err) {
      console.error("Error sending welcome notification:", err);
    }

    const populated = await Employee.findById(employee._id).populate(populateEmployee);

    res.status(201).json({
      employee: populated,
      login: {
        email: user.email,
        temporaryPassword,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    console.log("UPDATE EMPLOYEE PAYLOAD PERMISSIONS:", JSON.stringify(req.body.permissions));
    if (handleValidation(req, res)) return;

    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let user = null;
    if (employee.userId) {
      user = await User.findById(employee.userId);
    }
    if (!user && employee.email) {
      user = await User.findOne({ email: employee.email.toLowerCase() });
    }

    // Manager Department check for update
    if (req.user && req.user.role === "Manager") {
      // Manager cannot edit another Manager or HR
      if (employee.role !== "Employee") {
        return res.status(403).json({ message: "Forbidden: You do not have permission to manage this role" });
      }

      // Manager cannot change someone's role to Manager/HR
      if (req.body.loginRole && req.body.loginRole !== "Employee") {
        return res.status(403).json({ message: "Forbidden: Managers can only assign the Team Member role" });
      }

      const managerEmp = await Employee.findOne({ userId: req.user._id, companyId: req.companyId }).lean();
      if (managerEmp) {
        const primaryDeptId = managerEmp.departmentId;
        const allowedDeptIds = (managerEmp.accessibleDepartments || []).map(id => id.toString());
        
        const managerDeptIds = [];
        if (primaryDeptId) managerDeptIds.push(primaryDeptId.toString());
        allowedDeptIds.forEach(id => {
          if (id) managerDeptIds.push(id);
        });

        // 1. Check if the employee currently belongs to the manager's authorized departments
        const targetEmpDeptId = employee.departmentId ? employee.departmentId.toString() : null;
        if (!targetEmpDeptId || !managerDeptIds.includes(targetEmpDeptId)) {
          return res.status(403).json({ message: "Forbidden: You can only manage employees belonging to your own department(s)" });
        }

        // 2. Check if the manager is trying to change the employee's department to an unauthorized one
        if (req.body.departmentId && !managerDeptIds.includes(req.body.departmentId.toString())) {
          return res.status(403).json({ message: "Forbidden: You can only assign employees to your own department(s)" });
        }
      }
    }

    const oldData = {};
    const newData = {};
    let hasChanges = false;

    // Normalize common enum/string formats
    if (req.body.gender !== undefined) {
      req.body.gender = req.body.gender ? String(req.body.gender).toLowerCase().trim() : "";
    }
    if (req.body.workMode !== undefined) {
      req.body.workMode = req.body.workMode ? String(req.body.workMode).toLowerCase().trim() : "office";
    }
    if (req.body.employmentType !== undefined && typeof req.body.employmentType === "string") {
      const et = req.body.employmentType.toLowerCase().trim().replace("_", "-");
      req.body.employmentType = et === "internship" ? "intern" : et;
    }

    // Standard scalar fields
    const fieldsToCheck = [
      "firstName", "lastName", "middleName", "phone", "alternateMobile", "photo", "gender", 
      "dateOfBirth", "joiningDate", "confirmationDate", "noticePeriod", "departmentId", "designationId", 
      "branchId", "employmentType", "workMode", "allowRemotePunch", "status", "skills", "certifications", 
      "reportingManagerId", "managerAccessLevel", "accessibleDepartments", "permissions",
      "bloodGroup", "maritalStatus", "aadhaarNumber", "panNumber", "personalEmail"
    ];
    
    for (const field of fieldsToCheck) {
      if (req.body[field] !== undefined) {
        let newVal = req.body[field];
        if (newVal === "") newVal = null;

        let oldVal = employee[field];
        if (oldVal === undefined) oldVal = null;
        
        // Handle array comparison for skills/certifications
        if (Array.isArray(newVal)) {
           const oldArr = Array.isArray(oldVal) ? oldVal : [];
           if (JSON.stringify(newVal) !== JSON.stringify(oldArr)) {
             oldData[field] = oldArr;
             newData[field] = newVal;
             employee[field] = newVal;
             hasChanges = true;
           }
        } 
        // Handle object/Mixed comparison (like permissions)
        else if (field === "permissions" || (newVal !== null && typeof newVal === "object")) {
           const oldObj = (oldVal && typeof oldVal === "object") ? oldVal : {};
           if (JSON.stringify(newVal) !== JSON.stringify(oldObj)) {
             oldData[field] = oldObj;
             newData[field] = newVal;
             employee[field] = newVal;
             employee.markModified(field);
             hasChanges = true;
           }
        }
        // Handle normal scalar values
        else {
          const newStr = newVal !== null ? newVal.toString() : null;
          const oldStr = oldVal !== null ? oldVal.toString() : null;
          
          if (newStr !== oldStr) {
            oldData[field] = oldVal;
            newData[field] = newVal;
            
            // Reference fields
            if (field === "departmentId" || field === "designationId" || field === "branchId" || field === "reportingManagerId") {
              employee[field] = newVal || null;
              if (field === "branchId") {
                if (newVal) {
                  const Branch = require("../models/Branch");
                  const branchObj = await Branch.findById(newVal).lean();
                  employee.branchName = branchObj ? branchObj.branchName : "";
                } else {
                  employee.branchName = "";
                }
              }
              if (field === "departmentId") {
                if (newVal) {
                  const Department = require("../models/Department");
                  const deptObj = await Department.findById(newVal).lean();
                  employee.departmentName = deptObj ? deptObj.name : "";
                } else {
                  employee.departmentName = "";
                }
              }
            } else {
              employee[field] = newVal;
            }
            hasChanges = true;
          }
        }
      }
    }
    
    // Address objects
    const addressFields = ["currentAddress", "permanentAddress", "emergencyContact", "bankDetails"];
    for (const addrField of addressFields) {
      if (req.body[addrField] !== undefined) {
        const oldObj = employee[addrField] ? employee[addrField].toObject() : {};
        const newObj = { ...oldObj, ...req.body[addrField] };
        
        if (JSON.stringify(oldObj) !== JSON.stringify(newObj)) {
          oldData[addrField] = oldObj;
          newData[addrField] = newObj;
          employee[addrField] = newObj;
          hasChanges = true;
        }
      }
    }

    // Salary Details
    if (req.body.salaryDetails !== undefined) {
      const oldObj = employee.salaryDetails ? employee.salaryDetails.toObject() : {};
      const newObj = { ...oldObj, ...req.body.salaryDetails };
      
      // cleanup nulls/empty for comparison
      Object.keys(newObj).forEach(k => { if (newObj[k] === "" || newObj[k] === null) newObj[k] = null; else newObj[k] = Number(newObj[k]); });
      
      if (JSON.stringify(oldObj) !== JSON.stringify(newObj)) {
        oldData.salaryDetails = oldObj;
        newData.salaryDetails = newObj;
        employee.salaryDetails = newObj;
        hasChanges = true;
      }
    }

    if (!user && employee.userId) {
      user = await User.findById(employee.userId);
    }
    if (!user) {
      return res.status(400).json({ message: "Linked user not found" });
    }

    if (req.body.email !== undefined) {
      const emailLower = req.body.email.toLowerCase();
      if (emailLower !== employee.email) {
        const taken = await User.findOne({ email: emailLower });
        if (taken && taken._id.toString() !== user._id.toString()) {
          return res.status(400).json({ message: "Email already in use" });
        }
        oldData.email = employee.email;
        newData.email = emailLower;
        user.email = emailLower;
        employee.email = emailLower;
        hasChanges = true;
      }
    }

    const targetRole = req.body.loginRole || req.body.role;
    if (targetRole && ["Employee", "Manager", "HR", "CompanyAdmin"].includes(targetRole)) {
      if (user.role !== targetRole || employee.role !== targetRole) {
        oldData.role = user.role;
        newData.role = targetRole;
        user.role = targetRole;
        employee.role = targetRole;
        hasChanges = true;
      }
    }

    if (req.body.documents && typeof req.body.documents === "object") {
      const docObj =
        typeof employee.documents?.toObject === "function"
          ? employee.documents.toObject()
          : { ...(employee.documents || {}) };
      
      const newDocObj = { ...docObj, ...req.body.documents };
      if (JSON.stringify(docObj) !== JSON.stringify(newDocObj)) {
        oldData.documents = docObj;
        newData.documents = newDocObj;
        employee.documents = newDocObj;
        hasChanges = true;
      }
    }

    if (req.body.assignedModules !== undefined && Array.isArray(req.body.assignedModules)) {
      const Company = require("../models/Company");
      const company = await Company.findById(req.companyId).lean();
      const rawSubscribed = Array.isArray(company?.subscribedModules) && company.subscribedModules.length > 0
        ? company.subscribedModules
        : ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"];
      const subscribed = rawSubscribed.map(m => String(m).toLowerCase().trim());
      const limits = company?.moduleLimits || {};

      const sanitizedModules = req.body.assignedModules.map(m => String(m).toLowerCase().trim());

      for (const mod of sanitizedModules) {
        if (!subscribed.includes(mod)) {
          return res.status(400).json({
            message: `Module "${mod}" is not included in the company's active subscription plan.`
          });
        }
        // Check per-module seat cap (0 = unlimited)
        if (limits[mod] && limits[mod] > 0) {
          const usedCount = await Employee.countDocuments({
            companyId: req.companyId,
            status: "active",
            _id: { $ne: employee._id },
            assignedModules: mod
          });
          if (usedCount >= limits[mod]) {
            return res.status(400).json({
              message: `Seat quota for "${mod}" module reached (${limits[mod]} seats). Please upgrade your plan to assign more employees to this module.`
            });
          }
        }
      }

      const oldModules = (employee.assignedModules || []).map(m => String(m).toLowerCase().trim());
      const sortedOld = [...oldModules].sort();
      const sortedNew = [...sanitizedModules].sort();

      if (JSON.stringify(sortedOld) !== JSON.stringify(sortedNew)) {
        oldData.assignedModules = oldModules;
        newData.assignedModules = sanitizedModules;
        employee.assignedModules = sanitizedModules;
        employee.markModified("assignedModules");
        if (user) {
          user.assignedModules = sanitizedModules;
          user.markModified("assignedModules");
        }

        // Keep permissions object in sync so older/cloud backends also see view: true
        const curPerm = employee.permissions || {};
        const suiteMods = ["leads", "payroll", "projects", "reports", "tasks", "attendance", "leaves"];
        for (const sm of suiteMods) {
          const isAssigned = sanitizedModules.includes(sm) || (sm === "leaves" && (sanitizedModules.includes("leave") || sanitizedModules.includes("leaves")));
          if (typeof curPerm[sm] === "object" && curPerm[sm] !== null) {
            curPerm[sm].view = isAssigned;
          } else if (isAssigned) {
            curPerm[sm] = { view: true };
          }
        }
        employee.permissions = curPerm;
        employee.markModified("permissions");

        hasChanges = true;
      }
    }

    if (!hasChanges) {
      console.log("NO CHANGES DETECTED: updateEmployee");
      const populated = await Employee.findById(employee._id).populate(populateEmployee).lean();
      return res.json({ success: true, message: "No changes detected", employee: populated });
    }

    // Validation for refs
    const effectiveDeptId = employee.departmentId;
    const effectiveDesigId = employee.designationId;

    let deptForValidation = effectiveDeptId;
    let desigForValidation = effectiveDesigId;

    if (desigForValidation && !deptForValidation) {
      const des = await findCompanyResource(Designation, desigForValidation, req.companyId);
      if (des) deptForValidation = des.departmentId;
    }

    const refsToValidate = {};
    if (newData.departmentId !== undefined || newData.designationId !== undefined) {
      refsToValidate.departmentId = deptForValidation;
      refsToValidate.designationId = desigForValidation;
    }
    if (newData.branchId !== undefined) {
      refsToValidate.branchId = employee.branchId;
    }

    const refErr = Object.keys(refsToValidate).length > 0 ? await validateRefsForCompany(
      refsToValidate,
      req.companyId
    ) : null;
    
    if (refErr) {
      return res.status(400).json({ message: refErr });
    }

    if (newData.firstName !== undefined || newData.middleName !== undefined || newData.lastName !== undefined) {
      employee.fullName = `${employee.firstName || ""} ${employee.middleName || ""} ${employee.lastName || ""}`.replace(/\s+/g, " ").trim();
      if (user) {
        user.name = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim();
      }
    }
    if (newData.phone !== undefined && user) {
      user.phone = employee.phone;
    }
    if (req.body.photo !== undefined || req.body.documents?.photo !== undefined) {
      const photoVal = req.body.photo || req.body.documents?.photo || "";
      if (user) {
        user.profileImage = photoVal;
      }
      employee.photo = photoVal;
    }

    // Auto calculate profile completion
    let filledFields = 0;
    const requiredProfileFields = ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth', 'address', 'bloodGroup', 'maritalStatus'];
    requiredProfileFields.forEach(f => {
      if (employee[f] || (employee.currentAddress && employee.currentAddress.addressLine1)) filledFields++;
    });
    employee.profileCompletionPercentage = Math.round((filledFields / requiredProfileFields.length) * 100);

    if (user) {
      await user.save();
    }
    await employee.save();
    await syncUserFromEmployeeStatus(employee);

    // Create Audit Log
    await AuditLog.create({
      action: "UPDATE",
      module: "Employee",
      performedBy: req.user._id,
      companyId: req.companyId,
      entityId: employee._id,
      oldData,
      newData,
      ipAddress: req.ip,
    });

    const populated = await Employee.findById(employee._id).populate(populateEmployee);

    res.json({ employee: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate field value" });
    }
    next(error);
  }
};

const patchEmployeeStatus = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.status = req.body.status;
    await employee.save();
    await syncUserFromEmployeeStatus(employee);

    const populated = await Employee.findById(employee._id).populate(populateEmployee);

    res.json({ employee: populated });
  } catch (error) {
    next(error);
  }
};

const resetEmployeePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!employee) {
      employee = await Employee.findOne({
        userId: req.params.id,
        companyId: req.companyId,
      });
    }

    if (!employee || !employee.userId) {
      return res.status(404).json({ message: "Employee user account not found" });
    }

    const user = await User.findById(employee.userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    user.password = newPassword;
    user.isPasswordResetRequired = false;
    await user.save();

    await AuditLog.create({
      action: "UPDATE",
      module: "Employee",
      performedBy: req.user._id,
      companyId: req.companyId,
      entityId: employee._id,
      newData: { resetPassword: true },
      ipAddress: req.ip,
    });

    res.json({ message: `Password for ${employee.firstName || user.name} reset successfully` });
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const userId = employee.userId;
    await employee.deleteOne();
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyEmployee,
  getEmployees,
  getEmployeeById,
  getModuleUsage,
  createEmployee,
  updateEmployee,
  patchEmployeeStatus,
  resetEmployeePassword,
  deleteEmployee,
};
