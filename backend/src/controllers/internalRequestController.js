const InternalRequest = require("../models/InternalRequest");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Notification = require("../models/Notification");

// Helper to get companyId from req
const getCompanyId = (req) => {
  return req.user?.companyId || req.user?._id;
};

// Generate next request code e.g. REQ-1001
const generateRequestCode = async (companyId) => {
  const count = await InternalRequest.countDocuments({ companyId });
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${count + 1}-${randomSuffix}`;
};

// @desc    Get all company requests with filters & pagination
// @route   GET /api/internal-requests
// @access  Private (Employee, HR, Manager, Admin)
const getRequests = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?._id;
    const { tab, status, priority, category, departmentId, search, page = 1, limit = 50 } = req.query;

    const query = { companyId, deletedAt: null };

    if (status && status !== "all") {
      query.status = status;
    }
    if (priority && priority !== "all") {
      query.priority = priority;
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (departmentId && departmentId !== "all") {
      query.targetDepartmentId = departmentId;
    }

    // Tab Filtering
    if (tab === "sent_by_me") {
      query.requesterId = userId;
    } else if (tab === "assigned_to_me") {
      const employee = await Employee.findOne({ userId });
      const userDeptId = employee?.departmentId;

      query.$or = [
        { targetType: "ALL_EMPLOYEES" },
        { targetEmployeeIds: userId },
        ...(userDeptId ? [{ targetDepartmentId: userDeptId }] : []),
      ];
    } else if (tab === "resolved") {
      query.status = { $in: ["Resolved", "Closed"] };
    }

    // Search query
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { requestCode: regex },
        { category: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await InternalRequest.countDocuments(query);

    const requests = await InternalRequest.find(query)
      .populate("requesterId", "name email role profileImage")
      .populate("targetDepartmentId", "name")
      .populate("targetEmployeeIds", "name email role profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate Summary Stats
    const statsQuery = { companyId, deletedAt: null };
    const [totalCount, openCount, inProgressCount, resolvedCount, sentByMeCount] = await Promise.all([
      InternalRequest.countDocuments(statsQuery),
      InternalRequest.countDocuments({ ...statsQuery, status: "Open" }),
      InternalRequest.countDocuments({ ...statsQuery, status: "In Progress" }),
      InternalRequest.countDocuments({ ...statsQuery, status: { $in: ["Resolved", "Closed"] } }),
      InternalRequest.countDocuments({ ...statsQuery, requesterId: userId }),
    ]);

    return res.json({
      success: true,
      data: requests,
      stats: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        sentByMe: sentByMeCount,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[InternalRequest] getRequests error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single request by ID with full details & responses
// @route   GET /api/internal-requests/:id
// @access  Private
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await InternalRequest.findOne({ _id: id, deletedAt: null })
      .populate("requesterId", "name email role profileImage")
      .populate("targetDepartmentId", "name")
      .populate("targetEmployeeIds", "name email role profileImage")
      .populate("resolvedBy", "name role");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    return res.json({ success: true, data: request });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new internal request with instant targeted notifications
// @route   POST /api/internal-requests
// @access  Private
const createRequest = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?._id;
    const {
      title,
      category,
      priority = "Medium",
      description,
      attachments = [],
      targetType = "ALL_EMPLOYEES",
      targetDepartmentId,
      targetEmployeeIds = [],
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    let targetDepartmentName = "";
    if (targetDepartmentId) {
      const dept = await Department.findById(targetDepartmentId);
      if (dept) targetDepartmentName = dept.name;
    }

    const requestCode = await generateRequestCode(companyId);

    const newRequest = await InternalRequest.create({
      companyId,
      requestCode,
      title: title.trim(),
      category: category || "General Query",
      priority,
      description: description.trim(),
      attachments,
      requesterId: userId,
      requesterRole: req.user?.role || "Employee",
      targetType,
      targetDepartmentId: targetDepartmentId || null,
      targetDepartmentName,
      targetEmployeeIds: Array.isArray(targetEmployeeIds) ? targetEmployeeIds : [],
      status: "Open",
      responses: [],
    });

    // ── Dispatch targeted notifications ──
    try {
      if (targetType === "ALL_EMPLOYEES") {
        const usersToNotify = await User.find({
          companyId,
          _id: { $ne: userId },
          isActive: true,
        }).select("_id");

        const notifications = usersToNotify.map((u) => ({
          companyId,
          userId: u._id,
          title: `📢 New Request: ${newRequest.title}`,
          body: `${req.user?.name || "A team member"} requested info/feedback (${newRequest.requestCode}) from all company members: "${newRequest.description.slice(0, 80)}..."`,
          type: "company_request",
          data: { requestId: newRequest._id, requestCode: newRequest.requestCode },
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } else if (targetType === "DEPARTMENT" && targetDepartmentId) {
        const deptEmployees = await Employee.find({
          companyId,
          departmentId: targetDepartmentId,
          status: "Active",
        }).select("userId");

        const targetUserIds = deptEmployees
          .map((e) => e.userId)
          .filter((uid) => uid && uid.toString() !== userId.toString());

        const notifications = targetUserIds.map((uid) => ({
          companyId,
          userId: uid,
          title: `📁 Dept Request (${targetDepartmentName}): ${newRequest.title}`,
          body: `${req.user?.name || "A team member"} requested data/feedback (${newRequest.requestCode}) for the ${targetDepartmentName} department.`,
          type: "company_request",
          data: { requestId: newRequest._id, requestCode: newRequest.requestCode },
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } else if (targetType === "SPECIFIC_EMPLOYEES" && targetEmployeeIds?.length > 0) {
        const targetUserIds = targetEmployeeIds.filter(
          (uid) => uid && uid.toString() !== userId.toString()
        );

        const notifications = targetUserIds.map((uid) => ({
          companyId,
          userId: uid,
          title: `👤 Direct Request: ${newRequest.title}`,
          body: `${req.user?.name || "A team member"} assigned a request (${newRequest.requestCode}) directly to you.`,
          type: "company_request",
          data: { requestId: newRequest._id, requestCode: newRequest.requestCode },
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
    } catch (notifErr) {
      console.error("[InternalRequest] Notification creation error:", notifErr);
    }

    const populated = await InternalRequest.findById(newRequest._id)
      .populate("requesterId", "name email role profileImage")
      .populate("targetDepartmentId", "name")
      .populate("targetEmployeeIds", "name email role profileImage");

    return res.status(201).json({
      success: true,
      message: "Request broadcasted successfully with notifications sent!",
      data: populated,
    });
  } catch (err) {
    console.error("[InternalRequest] createRequest error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Reply / Submit Feedback / Provide Data in Request Thread
// @route   POST /api/internal-requests/:id/reply
// @access  Private
const replyToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [], isResolution = false } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const existing = await InternalRequest.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const employee = await Employee.findOne({ userId: user._id }).populate("departmentId", "name");
    const departmentName = employee?.departmentId?.name || "";

    const responseObj = {
      senderId: user._id,
      senderName: user.name || "Team Member",
      senderRole: user.role || "Employee",
      senderAvatar: user.profileImage || employee?.photo || null,
      department: departmentName,
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      isResolution: Boolean(isResolution),
      createdAt: new Date(),
    };

    const updateFields = {
      $push: { responses: responseObj },
    };

    if (isResolution) {
      updateFields.status = "Resolved";
      updateFields.resolvedAt = new Date();
      updateFields.resolvedBy = user._id;
    } else if (existing.status === "Open") {
      updateFields.status = "In Progress";
    }

    const updated = await InternalRequest.findByIdAndUpdate(id, updateFields, { new: true })
      .populate("requesterId", "name email role profileImage")
      .populate("targetDepartmentId", "name")
      .populate("targetEmployeeIds", "name email role profileImage")
      .populate("resolvedBy", "name role");

    // ── Dispatch Notification to Requester ──
    try {
      if (existing.requesterId && existing.requesterId.toString() !== user._id.toString()) {
        await Notification.create({
          companyId: existing.companyId,
          userId: existing.requesterId,
          title: `💬 New Feedback on ${existing.requestCode}`,
          body: `${user.name || "A team member"} (${departmentName || user.role || "Staff"}) submitted response: "${message.slice(0, 80)}..."`,
          type: "company_request",
          data: { requestId: existing._id, requestCode: existing.requestCode },
        });
      }
    } catch (notifErr) {
      console.error("[InternalRequest] Reply notification error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Feedback & response added to request",
      data: updated,
    });
  } catch (err) {
    console.error("[InternalRequest] replyToRequest error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update request status (Open, In Progress, Resolved, Closed)
// @route   PATCH /api/internal-requests/:id/status
// @access  Private
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Open", "In Progress", "Resolved", "Closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updateData = { status };
    if (status === "Resolved" || status === "Closed") {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user?._id;
    } else {
      updateData.resolvedAt = null;
      updateData.resolvedBy = null;
    }

    const updated = await InternalRequest.findByIdAndUpdate(id, updateData, { new: true })
      .populate("requesterId", "name email role profileImage")
      .populate("targetDepartmentId", "name")
      .populate("targetEmployeeIds", "name email role profileImage")
      .populate("resolvedBy", "name role");

    return res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete request
// @route   DELETE /api/internal-requests/:id
// @access  Private
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await InternalRequest.findByIdAndUpdate(id, { deletedAt: new Date() });
    return res.json({ success: true, message: "Request deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRequests,
  getRequestById,
  createRequest,
  replyToRequest,
  updateRequestStatus,
  deleteRequest,
};
