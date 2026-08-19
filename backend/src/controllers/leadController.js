const Lead = require("../models/Lead");
const LeadStatus = require("../models/LeadStatus");
const LeadSource = require("../models/LeadSource");
const LeadTag = require("../models/LeadTag");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Notification = require("../models/Notification");

const getCompanyId = (req) => {
  return req.user?.companyId || req.user?._id || null;
};

const buildCompanyQuery = (req, base = {}) => {
  const companyId = getCompanyId(req);
  if (companyId) {
    return { ...base, $or: [{ companyId }, { companyId: null }] };
  }
  return base;
};

// ── Notification Helpers ─────────────────────────────────────
const notifyCompanyAdmins = async (companyId, excludeUserId, title, body, type = "lead", data = {}) => {
  try {
    if (!companyId) return;
    const adminUsers = await User.find({
      $or: [{ companyId }, { _id: companyId }],
      role: { $in: ["CompanyAdmin", "companyadmin", "HR", "hr"] },
      isActive: true,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    }).select("_id");

    for (const admin of adminUsers) {
      await Notification.create({
        companyId,
        userId: admin._id,
        title,
        body,
        type,
        data,
      });
    }
  } catch (err) {
    console.error("[notifyCompanyAdmins error]:", err.message);
  }
};

const notifyUserOrEmployee = async (companyId, targetId, title, body, type = "lead_assigned", data = {}) => {
  try {
    if (!companyId || !targetId) return;
    let targetUserId = targetId;

    const emp = await Employee.findById(targetId).select("userId");
    if (emp && emp.userId) {
      targetUserId = emp.userId;
    }

    await Notification.create({
      companyId,
      userId: targetUserId,
      title,
      body,
      type,
      data,
    });
  } catch (err) {
    console.error("[notifyUserOrEmployee error]:", err.message);
  }
};

// Helper to seed default statuses & sources if none exist
const seedDefaultsForCompany = async (companyId) => {
  const statusCount = await LeadStatus.countDocuments();
  if (statusCount === 0) {
    const defaultStatuses = [
      { name: "New", color: "#06B6D4", displayOrder: 1, isDefault: true },
      { name: "Contacted", color: "#3B82F6", displayOrder: 2, isDefault: false },
      { name: "In Progress", color: "#EAB308", displayOrder: 3, isDefault: false },
      { name: "Won", color: "#10B981", displayOrder: 4, isDefault: false },
      { name: "Lost", color: "#EF4444", displayOrder: 5, isDefault: false },
    ];
    await LeadStatus.insertMany(
      defaultStatuses.map((s) => ({ ...s, companyId }))
    );
  }

  const sourceCount = await LeadSource.countDocuments();
  if (sourceCount === 0) {
    const defaultSources = [
      "Walk-in",
      "Website Form",
      "Facebook Ad",
      "Google Search",
      "Referral",
      "Instagram Direct",
    ];
    await LeadSource.insertMany(
      defaultSources.map((name) => ({ name, companyId }))
    );
  }
};

// ── STATUSES ──
const getStatuses = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);

    const query = buildCompanyQuery(req, { isActive: true });
    const statuses = await LeadStatus.find(query).sort({ displayOrder: 1 });
    const formatted = statuses.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
      color: s.color,
      displayOrder: s.displayOrder,
      isDefault: s.isDefault,
      isActive: s.isActive,
    }));
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, color, displayOrder, isDefault } = req.body;
    const status = await LeadStatus.create({
      companyId,
      name,
      color: color || "#EAB308",
      displayOrder: displayOrder || 1,
      isDefault: isDefault || false,
    });
    return res.status(201).json({
      id: status._id.toString(),
      _id: status._id.toString(),
      name: status.name,
      color: status.color,
      displayOrder: status.displayOrder,
      isDefault: status.isDefault,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await LeadStatus.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Status not found" });
    return res.json({
      id: updated._id.toString(),
      _id: updated._id.toString(),
      name: updated.name,
      color: updated.color,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await LeadStatus.findByIdAndDelete(id);
    return res.json({ message: "Status deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── SOURCES ──
const getSources = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);
    const query = buildCompanyQuery(req);
    const sources = await LeadSource.find(query).sort({ name: 1 });
    const formatted = sources.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
    }));
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createSource = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name } = req.body;
    const source = await LeadSource.create({ companyId, name });
    return res.status(201).json({
      id: source._id.toString(),
      _id: source._id.toString(),
      name: source.name,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── TAGS ──
const getTags = async (req, res) => {
  try {
    const query = buildCompanyQuery(req);
    const tags = await LeadTag.find(query).sort({ name: 1 });
    const formatted = tags.map((t) => ({
      id: t._id.toString(),
      _id: t._id.toString(),
      name: t.name,
      color: t.color,
    }));
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createTag = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, color } = req.body;
    const tag = await LeadTag.create({ companyId, name, color: color || "#D97706" });
    return res.status(201).json({
      id: tag._id.toString(),
      _id: tag._id.toString(),
      name: tag.name,
      color: tag.color,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    await LeadTag.findByIdAndDelete(id);
    return res.json({ message: "Tag deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── LEADS ──
const getLeads = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const statusId = req.query.statusId || undefined;
    const source = req.query.source || undefined;
    const tagId = req.query.tagId || undefined;
    const optInState = req.query.optInState === "true" ? true : req.query.optInState === "false" ? false : undefined;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;

    const query = buildCompanyQuery(req, { deletedAt: null });

    // Strict role check: Employees can ONLY see their own created or assigned leads
    const isEmployee = req.user?.role?.toLowerCase() === "employee";
    if (isEmployee && req.user?._id) {
      const userIds = [req.user._id];
      if (req.user.employeeId) userIds.push(req.user.employeeId);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { createdBy: { $in: userIds } },
          { assignedTo: { $in: userIds } },
        ],
      });
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { whatsappPhone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { productService: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
        ],
      });
    }
    if (statusId) query.statusId = statusId;
    if (source) query.source = source;
    if (tagId) query.tags = tagId;
    if (optInState !== undefined) query.whatsappOptIn = optInState;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate("statusId", "name color")
      .populate("tags", "name color")
      .populate("assignedTo", "name email phone role")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedData = leads.map((l) => ({
      id: l._id.toString(),
      _id: l._id.toString(),
      name: l.name,
      whatsappPhone: l.whatsappPhone,
      phone: l.phone,
      email: l.email,
      company: l.company || l.productService || "",
      estimatedValue: l.estimatedValue || null,
      assignedTo: l.assignedTo
        ? {
            id: l.assignedTo._id ? l.assignedTo._id.toString() : l.assignedTo.toString(),
            _id: l.assignedTo._id ? l.assignedTo._id.toString() : l.assignedTo.toString(),
            name: l.assignedTo.name || "Employee",
            email: l.assignedTo.email || "",
            role: l.assignedTo.role || "Employee",
          }
        : null,
      assignedToId: l.assignedTo?._id?.toString() || (typeof l.assignedTo === "string" ? l.assignedTo : null),
      createdBy: l.createdBy
        ? {
            id: l.createdBy._id ? l.createdBy._id.toString() : l.createdBy.toString(),
            name: l.createdBy.name || "Admin",
            email: l.createdBy.email || "",
          }
        : null,
      source: l.source,
      productService: l.productService,
      dateOfBirth: l.dateOfBirth,
      anniversaryDate: l.anniversaryDate,
      address: l.address,
      city: l.city,
      notes: l.notes,
      whatsappOptIn: l.whatsappOptIn,
      createdAt: l.createdAt,
      statusId: l.statusId?._id?.toString() || l.statusId,
      status: l.statusId
        ? { id: l.statusId._id.toString(), name: l.statusId.name, color: l.statusId.color }
        : null,
      tags: Array.isArray(l.tags)
        ? l.tags.map((t) => ({ id: t._id.toString(), name: t.name, color: t.color }))
        : [],
    }));

    return res.json({
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createLead = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);

    const {
      name,
      whatsappPhone,
      phone,
      email,
      company,
      estimatedValue,
      assignedTo,
      statusId,
      source,
      productService,
      dateOfBirth,
      anniversaryDate,
      address,
      city,
      notes,
      whatsappOptIn,
      tagIds,
    } = req.body;

    let targetStatusId = statusId;
    if (!targetStatusId) {
      const defStatus =
        (await LeadStatus.findOne(buildCompanyQuery(req, { isDefault: true }))) ||
        (await LeadStatus.findOne(buildCompanyQuery(req)));
      targetStatusId = defStatus?._id;
    }

    const newLead = await Lead.create({
      companyId,
      name,
      whatsappPhone: whatsappPhone || phone || "9999999999",
      phone: phone || null,
      email: email || null,
      company: company || null,
      estimatedValue: estimatedValue ? Number(estimatedValue) : null,
      createdBy: req.user?._id || null,
      assignedTo: assignedTo || (req.user?.role?.toLowerCase() === "employee" ? req.user?._id : null),
      statusId: targetStatusId,
      source: source || "Walk-in",
      productService: productService || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
      address: address || null,
      city: city || null,
      notes: notes || null,
      whatsappOptIn: whatsappOptIn !== undefined ? whatsappOptIn : true,
      tags: Array.isArray(tagIds) ? tagIds : [],
    });

    const populated = await Lead.findById(newLead._id)
      .populate("statusId", "name color")
      .populate("tags", "name color");

    const formatted = {
      id: populated._id.toString(),
      _id: populated._id.toString(),
      name: populated.name,
      whatsappPhone: populated.whatsappPhone,
      phone: populated.phone,
      email: populated.email,
      source: populated.source,
      productService: populated.productService,
      whatsappOptIn: populated.whatsappOptIn,
      createdAt: populated.createdAt,
      statusId: populated.statusId?._id?.toString() || populated.statusId,
      status: populated.statusId
        ? { id: populated.statusId._id.toString(), name: populated.statusId.name, color: populated.statusId.color }
        : null,
      tags: Array.isArray(populated.tags)
        ? populated.tags.map((t) => ({ id: t._id.toString(), name: t.name, color: t.color }))
        : [],
    };

    // ── Dispatch notifications for newly captured lead ──
    const creatorName = req.user?.name || "Staff Member";
    const contactInfo = newLead.company
      ? `${newLead.company}`
      : newLead.whatsappPhone || newLead.phone || "No contact";

    // 1. Notify Company Admins & HR
    await notifyCompanyAdmins(
      companyId,
      req.user?._id,
      `🎯 New Lead Captured: ${newLead.name}`,
      `${creatorName} added a new lead "${newLead.name}" (${contactInfo}) via ${newLead.source || "Walk-in"}.`,
      "lead",
      { leadId: newLead._id, leadName: newLead.name }
    );

    // 2. If assigned to a specific staff member on creation, notify them
    if (newLead.assignedTo && newLead.assignedTo.toString() !== req.user?._id?.toString()) {
      await notifyUserOrEmployee(
        companyId,
        newLead.assignedTo,
        `📋 Lead Assigned: ${newLead.name}`,
        `You have been assigned a new lead "${newLead.name}" (${contactInfo}) by ${creatorName}.`,
        "lead_assigned",
        { leadId: newLead._id, leadName: newLead.name }
      );
    }

    return res.status(201).json(formatted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .populate("statusId", "name color")
      .populate("tags", "name color")
      .populate("assignedTo", "name email phone role")
      .populate("createdBy", "name email");
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    return res.json({
      id: lead._id.toString(),
      _id: lead._id.toString(),
      name: lead.name,
      whatsappPhone: lead.whatsappPhone,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      productService: lead.productService,
      company: lead.company || lead.productService || "",
      estimatedValue: lead.estimatedValue || null,
      notes: lead.notes,
      whatsappOptIn: lead.whatsappOptIn,
      createdAt: lead.createdAt,
      dateOfBirth: lead.dateOfBirth,
      anniversaryDate: lead.anniversaryDate,
      assignedTo: lead.assignedTo
        ? {
            id: lead.assignedTo._id ? lead.assignedTo._id.toString() : lead.assignedTo.toString(),
            _id: lead.assignedTo._id ? lead.assignedTo._id.toString() : lead.assignedTo.toString(),
            name: lead.assignedTo.name || "Employee",
            email: lead.assignedTo.email || "",
            role: lead.assignedTo.role || "Employee",
          }
        : null,
      assignedToId: lead.assignedTo?._id?.toString() || (typeof lead.assignedTo === "string" ? lead.assignedTo : null),
      statusId: lead.statusId?._id?.toString() || lead.statusId,
      status: lead.statusId
        ? { id: lead.statusId._id.toString(), name: lead.statusId.name, color: lead.statusId.color }
        : null,
      tags: Array.isArray(lead.tags)
        ? lead.tags.map((t) => ({ id: t._id.toString(), name: t.name, color: t.color }))
        : [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);
    const updateData = { ...req.body };
    if (updateData.assignedTo === "" || updateData.assignedTo === "unassigned") {
      updateData.assignedTo = null;
    }

    const prevLead = await Lead.findById(id).populate("statusId", "name");
    if (!prevLead) return res.status(404).json({ message: "Lead not found" });

    const updated = await Lead.findByIdAndUpdate(id, updateData, { new: true })
      .populate("statusId", "name color")
      .populate("tags", "name color")
      .populate("assignedTo", "name email phone role");
    if (!updated) return res.status(404).json({ message: "Lead not found" });

    // ── Check if Status Changed (Won, Closed, or Stage Update) ──
    if (updateData.statusId && prevLead.statusId?._id?.toString() !== updateData.statusId.toString()) {
      const newStatusName = updated.statusId?.name || "Updated";
      const isWon =
        newStatusName.toLowerCase().includes("won") ||
        newStatusName.toLowerCase().includes("closed") ||
        newStatusName.toLowerCase().includes("confirm");

      const title = isWon
        ? `🎉 Lead Won & Confirmed: ${updated.name}`
        : `📌 Lead Status Changed: ${updated.name} ➔ ${newStatusName}`;
      const body = isWon
        ? `${req.user?.name || "Staff Member"} marked lead "${updated.name}" as ${newStatusName}${updated.estimatedValue ? ` (Value: ₹${updated.estimatedValue})` : ""}.`
        : `${req.user?.name || "Staff Member"} updated status of lead "${updated.name}" to "${newStatusName}".`;

      // 1. Notify Company Admins & HR
      await notifyCompanyAdmins(companyId, req.user?._id, title, body, "lead_status", {
        leadId: updated._id,
        status: newStatusName,
      });

      // 2. Notify Assigned Staff if different from updater
      if (updated.assignedTo && updated.assignedTo._id?.toString() !== req.user?._id?.toString()) {
        await notifyUserOrEmployee(companyId, updated.assignedTo._id, title, body, "lead_status", {
          leadId: updated._id,
          status: newStatusName,
        });
      }
    }

    // ── Check if Lead was Assigned / Reassigned ──
    const prevAssigneeId = prevLead.assignedTo?.toString();
    const newAssigneeId = updateData.assignedTo ? updateData.assignedTo.toString() : null;

    if (newAssigneeId && prevAssigneeId !== newAssigneeId) {
      const assignedName = updated.assignedTo?.name || "Staff Member";
      const assignerName = req.user?.name || "Admin";

      // 1. Notify newly assigned user
      await notifyUserOrEmployee(
        companyId,
        newAssigneeId,
        `📋 Lead Assigned: ${updated.name}`,
        `You have been assigned lead "${updated.name}" (${updated.company || updated.whatsappPhone || ""}) by ${assignerName}.`,
        "lead_assigned",
        { leadId: updated._id, leadName: updated.name }
      );

      // 2. Notify Admins if assigner is not admin
      await notifyCompanyAdmins(
        companyId,
        req.user?._id,
        `🔄 Lead Assigned: ${updated.name}`,
        `Lead "${updated.name}" was assigned to ${assignedName} by ${assignerName}.`,
        "lead",
        { leadId: updated._id, leadName: updated.name, assignedTo: assignedName }
      );
    }

    return res.json({
      id: updated._id.toString(),
      _id: updated._id.toString(),
      name: updated.name,
      whatsappPhone: updated.whatsappPhone,
      phone: updated.phone,
      email: updated.email,
      source: updated.source,
      productService: updated.productService,
      company: updated.company || updated.productService || "",
      estimatedValue: updated.estimatedValue || null,
      assignedTo: updated.assignedTo
        ? {
            id: updated.assignedTo._id ? updated.assignedTo._id.toString() : updated.assignedTo.toString(),
            _id: updated.assignedTo._id ? updated.assignedTo._id.toString() : updated.assignedTo.toString(),
            name: updated.assignedTo.name || "Employee",
            email: updated.assignedTo.email || "",
            role: updated.assignedTo.role || "Employee",
          }
        : null,
      statusId: updated.statusId?._id?.toString() || updated.statusId,
      status: updated.statusId
        ? { id: updated.statusId._id.toString(), name: updated.statusId.name, color: updated.statusId.color }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getAssignableUsers = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const Employee = require("../models/Employee");
    const User = require("../models/User");

    const employees = await Employee.find({
      ...(companyId ? { companyId } : {}),
      status: { $ne: "inactive" },
    })
      .populate("departmentId", "name")
      .populate("userId", "name email role")
      .lean();

    const result = [];
    const addedUserIds = new Set();

    for (const emp of employees) {
      const uId = emp.userId?._id ? emp.userId._id.toString() : emp._id.toString();
      const uRole = (emp.userId?.role || emp.role || "employee").toLowerCase();
      if (uRole === "superadmin" || uRole === "companyadmin") continue;

      const deptName = emp.departmentId?.name || "";
      const empName =
        emp.fullName ||
        `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
        emp.userId?.name ||
        "Employee";

      if (!addedUserIds.has(uId)) {
        addedUserIds.add(uId);
        result.push({
          id: uId,
          _id: uId,
          name: empName,
          email: emp.email || emp.userId?.email || "",
          department: deptName,
          role: emp.role || emp.userId?.role || "Employee",
          label: deptName ? `${empName} (${deptName})` : `${empName} (${emp.role || "Employee"})`,
        });
      }
    }

    const users = await User.find({
      ...(companyId ? { companyId } : {}),
      role: { $nin: ["superadmin", "companyadmin"] },
    }).lean();

    for (const u of users) {
      const uId = u._id.toString();
      if (!addedUserIds.has(uId)) {
        addedUserIds.add(uId);
        result.push({
          id: uId,
          _id: uId,
          name: u.name,
          email: u.email || "",
          department: "",
          role: u.role || "Employee",
          label: `${u.name} (${u.role || "Staff"})`,
        });
      }
    }

    return res.json({ success: true, data: result, users: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndUpdate(id, { deletedAt: new Date() });
    return res.json({ message: "Lead deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const importLeads = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);

    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: "No valid leads provided" });
    }

    const defStatus =
      (await LeadStatus.findOne(buildCompanyQuery(req, { isDefault: true }))) ||
      (await LeadStatus.findOne(buildCompanyQuery(req)));

    let createdCount = 0;
    for (const item of leads) {
      let stId = item.statusId;
      if (!stId && item.statusName) {
        const found = await LeadStatus.findOne(buildCompanyQuery(req, { name: { $regex: item.statusName, $options: "i" } }));
        if (found) stId = found._id;
      }
      if (!stId) stId = defStatus?._id;

      await Lead.create({
        companyId,
        name: item.name,
        whatsappPhone: item.whatsappPhone,
        phone: item.phone || null,
        email: item.email || null,
        statusId: stId,
        source: item.source || "Walk-in",
        productService: item.productService || null,
        notes: item.notes || null,
        whatsappOptIn: item.whatsappOptIn !== undefined ? item.whatsappOptIn : true,
      });
      createdCount++;
    }

    return res.json({
      success: true,
      summary: {
        created: createdCount,
        restored: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const bulkStatus = async (req, res) => {
  try {
    const { leadIds, statusId } = req.body;
    const companyId = getCompanyId(req);
    await Lead.updateMany({ _id: { $in: leadIds } }, { statusId });
    const st = await LeadStatus.findById(statusId);
    const statusName = st?.name || "Updated";

    const isWon =
      statusName.toLowerCase().includes("won") ||
      statusName.toLowerCase().includes("closed") ||
      statusName.toLowerCase().includes("confirm");

    const title = isWon
      ? `🎉 ${leadIds.length} Leads Marked as Won & Confirmed`
      : `📌 ${leadIds.length} Leads Updated to "${statusName}"`;
    const body = `${req.user?.name || "Staff Member"} updated ${leadIds.length} lead(s) to status "${statusName}".`;

    await notifyCompanyAdmins(companyId, req.user?._id, title, body, "lead_status", {
      count: leadIds.length,
      status: statusName,
    });

    return res.json({ updated: leadIds.length, statusName });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const bulkTags = async (req, res) => {
  try {
    const { leadIds, tagId, action } = req.body;
    if (action === "add") {
      await Lead.updateMany({ _id: { $in: leadIds } }, { $addToSet: { tags: tagId } });
    } else {
      await Lead.updateMany({ _id: { $in: leadIds } }, { $pull: { tags: tagId } });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { leadIds } = req.body;
    await Lead.updateMany({ _id: { $in: leadIds } }, { deletedAt: new Date() });
    return res.json({ success: true, deleted: leadIds.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const bulkAssign = async (req, res) => {
  try {
    const { leadIds, assignedTo } = req.body;
    const companyId = getCompanyId(req);
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "leadIds array is required" });
    }

    const updateData = { assignedTo: assignedTo || null };
    await Lead.updateMany({ _id: { $in: leadIds } }, { $set: updateData });

    if (assignedTo) {
      const assigneeUser =
        (await User.findById(assignedTo)) || (await Employee.findById(assignedTo));
      const assigneeName = assigneeUser?.name || assigneeUser?.fullName || "Staff Member";

      // 1. Notify newly assigned user
      await notifyUserOrEmployee(
        companyId,
        assignedTo,
        `📋 ${leadIds.length} Leads Assigned to You`,
        `You have been assigned ${leadIds.length} lead(s) by ${req.user?.name || "Admin"}.`,
        "lead_assigned",
        { count: leadIds.length }
      );

      // 2. Notify Admins
      await notifyCompanyAdmins(
        companyId,
        req.user?._id,
        `🔄 Bulk Lead Assignment`,
        `${req.user?.name || "Staff"} assigned ${leadIds.length} lead(s) to ${assigneeName}.`,
        "lead",
        { count: leadIds.length, assignedTo: assigneeName }
      );
    }

    return res.json({
      success: true,
      updated: leadIds.length,
      message: `Successfully assigned ${leadIds.length} lead(s)`,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getOptInCounts = async (req, res) => {
  try {
    const query = buildCompanyQuery(req, { deletedAt: null, whatsappOptIn: true });
    const total = await Lead.countDocuments(query);
    return res.json({ total, byStatus: {} });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── FALLBACK MODULE HANDLERS FOR FLOWS, TEMPLATES, CAMPAIGNS, REMINDERS, ORG ──
const getFlows = async (req, res) => res.json({ flows: [] });
const createFlow = async (req, res) => res.status(201).json({ id: "flow-1", name: req.body.name || "Flow", isActive: true });
const toggleFlow = async (req, res) => res.json({ message: "Flow toggled" });

const getTemplates = async (req, res) => res.json({ templates: [] });
const createTemplate = async (req, res) => res.status(201).json({ id: "temp-1", name: req.body.name || "Template", status: "APPROVED" });

const getCampaigns = async (req, res) => res.json({ campaigns: [], broadcasts: [] });
const createCampaign = async (req, res) => res.status(201).json({ id: "camp-1", name: req.body.name || "Campaign" });

const getReminders = async (req, res) => res.json({ reminders: [] });
const createReminder = async (req, res) => res.status(201).json({ id: "rem-1", name: req.body.title || "Reminder" });
const runReminderScheduler = async (req, res) => res.json({ message: "Reminders processed" });

const getPublicToken = async (req, res) => res.json({ publicFormToken: "oneclick_lead_form_token_2026" });
const getBusiness = async (req, res) => res.json({ companyName: "ONE CLICK CRM", provider: "THIRD_PARTY" });
const getEngagementSettings = async (req, res) => res.json({ wishesEnabled: true });

const addLeadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, size } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: "Document name and url are required" });
    }

    const docObj = {
      name,
      url,
      type: type || "document",
      size: size || "",
      uploadedBy: req.user?._id || null,
      uploadedAt: new Date(),
    };

    const lead = await Lead.findByIdAndUpdate(
      id,
      { $push: { documents: docObj } },
      { new: true }
    );

    return res.status(201).json({ success: true, message: "Document attached", lead, document: docObj });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteLeadDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const lead = await Lead.findByIdAndUpdate(
      id,
      { $pull: { documents: { _id: docId } } },
      { new: true }
    );
    return res.json({ success: true, message: "Document removed", lead });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getLeadStats = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await seedDefaultsForCompany(companyId);

    const query = buildCompanyQuery(req, { deletedAt: null });
    const isEmployee = req.user?.role?.toLowerCase() === "employee";
    if (isEmployee && req.user?._id) {
      const userIds = [req.user._id];
      if (req.user.employeeId) userIds.push(req.user.employeeId);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { createdBy: { $in: userIds } },
          { assignedTo: { $in: userIds } },
        ],
      });
    }

    const [totalContacts, optedInCount, statuses, tags, recentLeads] = await Promise.all([
      Lead.countDocuments(query),
      Lead.countDocuments({ ...query, whatsappOptIn: true }),
      LeadStatus.find(buildCompanyQuery(req, { isActive: true })).sort({ displayOrder: 1 }),
      LeadTag.find(buildCompanyQuery(req)),
      Lead.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const statusCounts = await Lead.aggregate([
      { $match: query },
      { $group: { _id: "$statusId", count: { $sum: 1 } } },
    ]);

    const statusMap = {};
    statusCounts.forEach((sc) => {
      if (sc._id) statusMap[sc._id.toString()] = sc.count;
    });

    const newStatus = statuses.find((s) => s.name?.toLowerCase().includes("new") || s.isDefault);
    const newLeadsCount = newStatus ? (statusMap[newStatus._id.toString()] || 0) : recentLeads;

    return res.json({
      success: true,
      totalContacts,
      optedInCount,
      newLeadsCount,
      pipelineStagesCount: statuses.length,
      activeTagsCount: tags.length,
      statusCounts: statusMap,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStatuses, createStatus, updateStatus, deleteStatus,
  getSources, createSource,
  getTags, createTag, deleteTag,
  getLeads, createLead, getLeadById, updateLead, deleteLead, getLeadStats,
  importLeads, bulkStatus, bulkTags, bulkDelete, bulkAssign, getOptInCounts,
  getAssignableUsers,
  getFlows, createFlow, toggleFlow,
  getTemplates, createTemplate,
  getCampaigns, createCampaign,
  getReminders, createReminder, runReminderScheduler,
  getPublicToken, getBusiness, getEngagementSettings,
  addLeadDocument, deleteLeadDocument,
};
