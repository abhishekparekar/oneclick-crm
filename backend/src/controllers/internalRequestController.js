const InternalRequest = require("../models/InternalRequest");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Notification = require("../models/Notification");
const { resolveToUserIds } = require("../utils/notificationHelper");
const path = require("path");
const fs = require("fs");

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

// @desc    Get all available target options (Departments & Employees) for broadcasting request
// @route   GET /api/internal-requests/target-options
// @access  Private (All Roles: Employee, Manager, HR, Admin)
const getTargetOptions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const [departments, employees] = await Promise.all([
      Department.find({ companyId }).select("_id name code description").sort({ name: 1 }).lean(),
      Employee.find({
        companyId,
        status: { $regex: /^active$/i },
      })
        .select("_id userId employeeCode firstName lastName fullName email phone departmentId role photo profileImage")
        .populate("userId", "_id name email role profileImage")
        .populate("departmentId", "_id name")
        .sort({ firstName: 1 })
        .lean(),
    ]);

    const formattedEmployees = employees.map((emp) => {
      const name =
        emp.fullName ||
        `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
        emp.userId?.name ||
        "Staff Member";
      const uId = emp.userId?._id
        ? emp.userId._id.toString()
        : emp.userId
        ? emp.userId.toString()
        : emp._id.toString();
      return {
        _id: emp._id.toString(),
        userId: uId,
        name,
        employeeCode: emp.employeeCode || "",
        email: emp.email || emp.userId?.email || "",
        role: emp.role || emp.userId?.role || "Employee",
        departmentId: emp.departmentId?._id
          ? emp.departmentId._id.toString()
          : emp.departmentId
          ? emp.departmentId.toString()
          : null,
        departmentName: emp.departmentId?.name || "",
        avatar: emp.photo || emp.profileImage || emp.userId?.profileImage || null,
      };
    });

    return res.json({
      success: true,
      departments: departments || [],
      employees: formattedEmployees || [],
    });
  } catch (err) {
    console.error("[InternalRequest] getTargetOptions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
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
      const deptList = (employee?.departmentIds || []).map((id) => (id?._id || id).toString());
      const accList = (employee?.accessibleDepartments || []).map((id) => (id?._id || id).toString());
      const allMyDeptIds = Array.from(new Set([userDeptId?.toString(), ...deptList, ...accList].filter(Boolean)));

      const targetEmpMatch = [userId];
      if (employee?._id) targetEmpMatch.push(employee._id);

      query.$or = [
        { targetType: "ALL_EMPLOYEES" },
        { targetEmployeeIds: { $in: targetEmpMatch } },
        ...(allMyDeptIds.length > 0 ? [{ targetDepartmentId: { $in: allMyDeptIds } }] : []),
      ];
    } else if (tab === "resolved") {
      query.status = { $in: ["Resolved", "Closed"] };
    }

    // Role-based visibility scoping for standard Employee role on general views
    const userRole = (req.user?.role || "").toLowerCase();
    if (userRole === "employee" && tab !== "sent_by_me") {
      const employee = await Employee.findOne({ userId });
      const userDeptId = employee?.departmentId;
      const deptList = (employee?.departmentIds || []).map((id) => (id?._id || id).toString());
      const accList = (employee?.accessibleDepartments || []).map((id) => (id?._id || id).toString());
      const allMyDeptIds = Array.from(new Set([userDeptId?.toString(), ...deptList, ...accList].filter(Boolean)));

      const targetEmpMatch = [userId];
      if (employee?._id) targetEmpMatch.push(employee._id);

      const visibilityClause = [
        { requesterId: userId },
        { targetType: "ALL_EMPLOYEES" },
        { targetEmployeeIds: { $in: targetEmpMatch } },
      ];
      if (allMyDeptIds.length > 0) {
        visibilityClause.push({ targetDepartmentId: { $in: allMyDeptIds } });
      }

      if (!query.$and) query.$and = [];
      query.$and.push({ $or: visibilityClause });
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
      .populate("responses.senderId", "name email role profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate Summary Stats
    const statsQuery = { companyId, deletedAt: null };

    const empDoc = await Employee.findOne({ userId });
    const uDeptId = empDoc?.departmentId;
    const dList = (empDoc?.departmentIds || []).map((id) => (id?._id || id).toString());
    const aList = (empDoc?.accessibleDepartments || []).map((id) => (id?._id || id).toString());
    const deptIdsForStats = Array.from(new Set([uDeptId?.toString(), ...dList, ...aList].filter(Boolean)));

    const assignedClause = [
      { targetType: "ALL_EMPLOYEES" },
      { targetEmployeeIds: userId },
      ...(deptIdsForStats.length > 0 ? [{ targetDepartmentId: { $in: deptIdsForStats } }] : []),
    ];

    const [totalCount, openCount, inProgressCount, resolvedCount, sentByMeCount, assignedToMeCount] = await Promise.all([
      InternalRequest.countDocuments(statsQuery),
      InternalRequest.countDocuments({ ...statsQuery, status: "Open" }),
      InternalRequest.countDocuments({ ...statsQuery, status: "In Progress" }),
      InternalRequest.countDocuments({ ...statsQuery, status: { $in: ["Resolved", "Closed"] } }),
      InternalRequest.countDocuments({ ...statsQuery, requesterId: userId }),
      InternalRequest.countDocuments({
        ...statsQuery,
        requesterId: { $ne: userId },
        $or: assignedClause,
      }),
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
        assignedToMe: assignedToMeCount,
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
      .populate("resolvedBy", "name role")
      .populate("responses.senderId", "name email role profileImage");

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

    // Resolve target employee IDs into clean User ObjectIds
    let cleanTargetUserIds = [];
    if (targetType === "SPECIFIC_EMPLOYEES" && Array.isArray(targetEmployeeIds) && targetEmployeeIds.length > 0) {
      cleanTargetUserIds = await resolveToUserIds(targetEmployeeIds, companyId);
      if (cleanTargetUserIds.length === 0) {
        cleanTargetUserIds = await resolveToUserIds(targetEmployeeIds);
      }
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
      targetEmployeeIds: cleanTargetUserIds,
      status: "Open",
      responses: [],
    });

    // ── Dispatch targeted notifications with Mobile FCM Push & Deduplication ──
    try {
      let recipientUserIds = [];
      let notifTitle = `📢 New Request: ${newRequest.title}`;
      let notifBody = `${req.user?.name || "A team member"} requested info/feedback (${newRequest.requestCode}): "${newRequest.description.slice(0, 80)}..."`;

      if (targetType === "ALL_EMPLOYEES") {
        const usersToNotify = await User.find({
          companyId,
          _id: { $ne: userId },
          isActive: { $ne: false },
        }).select("_id").lean();
        recipientUserIds = usersToNotify.map((u) => u._id.toString());
      } else if (targetType === "DEPARTMENT" && targetDepartmentId) {
        notifTitle = `📁 Dept Request (${targetDepartmentName || "Department"}): ${newRequest.title}`;
        notifBody = `${req.user?.name || "A team member"} requested data/feedback (${newRequest.requestCode}) for the ${targetDepartmentName || "department"}.`;

        const mongoose = require("mongoose");
        const deptObjIds = [];
        if (mongoose.Types.ObjectId.isValid(targetDepartmentId)) {
          deptObjIds.push(new mongoose.Types.ObjectId(targetDepartmentId));
        }
        deptObjIds.push(targetDepartmentId.toString());

        const deptQueryOr = [
          { departmentId: { $in: deptObjIds } },
          { departmentIds: { $in: deptObjIds } },
          { accessibleDepartments: { $in: deptObjIds } },
        ];
        if (targetDepartmentName && targetDepartmentName.trim()) {
          deptQueryOr.push({ departmentName: new RegExp(`^${targetDepartmentName.trim()}$`, "i") });
        }

        const deptEmployees = await Employee.find({
          companyId,
          $or: deptQueryOr,
          status: { $nin: ["inactive", "terminated"] },
        }).select("_id userId").lean();

        const rawUserIds = [];
        const empIds = [];
        deptEmployees.forEach((e) => {
          if (e.userId) {
            rawUserIds.push((e.userId._id || e.userId).toString());
          }
          if (e._id) {
            empIds.push(e._id);
          }
        });

        // Also resolve users whose employeeId points to these employees
        if (empIds.length > 0) {
          const usersByEmp = await User.find({
            companyId,
            employeeId: { $in: empIds },
            isActive: { $ne: false },
          }).select("_id").lean();
          usersByEmp.forEach((u) => rawUserIds.push(u._id.toString()));
        }

        recipientUserIds = Array.from(new Set(rawUserIds)).filter(
          (uid) => uid && uid !== userId.toString()
        );
      } else if (targetType === "SPECIFIC_EMPLOYEES") {
        notifTitle = `👤 Direct Request: ${newRequest.title}`;
        notifBody = `${req.user?.name || "A team member"} assigned a company request (${newRequest.requestCode}) directly to you.`;

        let targetUids = cleanTargetUserIds;
        if (!targetUids || targetUids.length === 0) {
          targetUids = await resolveToUserIds(targetEmployeeIds, companyId);
        }
        recipientUserIds = (targetUids || []).filter((uid) => uid && uid.toString() !== userId.toString());
      }

      recipientUserIds = Array.from(new Set(recipientUserIds.filter(Boolean)));

      if (recipientUserIds.length > 0) {
        await Promise.allSettled(
          recipientUserIds.map((targetUid) =>
            Notification.createDeduplicated({
              companyId,
              userId: targetUid,
              title: notifTitle,
              body: notifBody,
              type: "company_request",
              data: {
                requestId: newRequest._id.toString(),
                requestCode: newRequest.requestCode,
              },
              idempotencyKey: `req_notif_${newRequest._id}_${targetUid}`,
            })
          )
        );
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
      .populate("resolvedBy", "name role")
      .populate("responses.senderId", "name email role profileImage");

    // ── Dispatch Notification to Requester with Push Notification ──
    try {
      if (existing.requesterId && existing.requesterId.toString() !== user._id.toString()) {
        await Notification.createDeduplicated({
          companyId: existing.companyId,
          userId: existing.requesterId,
          title: `💬 New Feedback on ${existing.requestCode}`,
          body: `${user.name || "A team member"} (${departmentName || user.role || "Staff"}) submitted response: "${message.slice(0, 80)}..."`,
          type: "company_request",
          data: { requestId: existing._id.toString(), requestCode: existing.requestCode },
          idempotencyKey: `req_reply_${existing._id}_${Date.now()}`,
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

    // ── Dispatch Status Change Notification to Requester ──
    try {
      if (updated && updated.requesterId && (updated.requesterId._id || updated.requesterId).toString() !== req.user?._id?.toString()) {
        await Notification.createDeduplicated({
          companyId: updated.companyId,
          userId: updated.requesterId._id || updated.requesterId,
          title: `🔄 Request Status Updated (${status}): ${updated.title}`,
          body: `${req.user?.name || "A team member"} updated the status of request (${updated.requestCode}) to "${status}".`,
          type: "company_request",
          data: {
            requestId: updated._id.toString(),
            requestCode: updated.requestCode,
            status,
          },
          idempotencyKey: `req_status_${updated._id}_${status}_${Date.now()}`,
        });
      }
    } catch (notifErr) {
      console.error("[InternalRequest] Status update notification error:", notifErr);
    }

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

// @desc    Upload file attachment for internal request
// @route   POST /api/internal-requests/upload
// @access  Private
const uploadRequestAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    let fileUrl;
    try {
      const { uploadFileToFirebase } = require("../services/firebaseService");
      fileUrl = await uploadFileToFirebase(req.file.buffer, req.file.originalname, "internal-requests");
    } catch (fbErr) {
      console.warn("Firebase upload failed, saving locally:", fbErr.message);
      const uploadDir = path.join(__dirname, "../../uploads/internal-requests");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname);
      const baseName = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${ext}`;
      const filePath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/internal-requests/${uniqueName}`;
    }

    const fileMeta = {
      name: req.file.originalname,
      url: fileUrl,
      type: req.file.mimetype || "application/octet-stream",
      size: req.file.size ? `${(req.file.size / 1024).toFixed(1)} KB` : "",
    };

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: fileMeta,
    });
  } catch (err) {
    console.error("[InternalRequest] uploadRequestAttachment error:", err);
    return res.status(500).json({ success: false, message: err.message || "File upload failed" });
  }
};

// @desc    Get count of unread/actionable company requests for current user
// @route   GET /api/internal-requests/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { since } = req.query;

    if (!companyId || !userId) {
      return res.json({ success: true, count: 0 });
    }

    // Determine cutoff timestamp
    let lastSeen = null;
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) lastSeen = sinceDate;
    }
    if (!lastSeen) {
      const user = await User.findById(userId).select("lastSeenRequestsAt");
      lastSeen = user?.lastSeenRequestsAt || null;
    }

    const query = {
      companyId,
      deletedAt: null,
      status: { $in: ["Open", "In Progress"] },
      requesterId: { $ne: userId }, // Don't notify about self-created requests
    };

    // Role-based targeting check
    if (userRole === "Employee" || userRole === "Manager") {
      const employee = await Employee.findOne({ userId }).select("departmentId");
      const userDeptId = employee?.departmentId;

      query.$or = [
        { targetType: "ALL_EMPLOYEES" },
        { targetEmployeeIds: userId },
        ...(userDeptId ? [{ targetDepartmentId: userDeptId }] : []),
      ];
    }

    // Only count items updated/created after lastSeen
    if (lastSeen) {
      query.$and = [
        {
          $or: [
            { createdAt: { $gt: lastSeen } },
            {
              responses: {
                $elemMatch: {
                  createdAt: { $gt: lastSeen },
                  senderId: { $ne: userId },
                },
              },
            },
          ],
        },
      ];
    }

    const count = await InternalRequest.countDocuments(query);
    return res.json({ success: true, count });
  } catch (err) {
    console.error("[InternalRequest] getUnreadCount error:", err);
    return res.status(500).json({ success: false, count: 0, message: err.message });
  }
};

// @desc    Mark company requests as seen by user
// @route   POST /api/internal-requests/mark-seen
// @access  Private
const markRequestsSeen = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await User.findByIdAndUpdate(userId, { lastSeenRequestsAt: new Date() });
    }
    return res.json({ success: true, message: "Company requests marked as seen" });
  } catch (err) {
    console.error("[InternalRequest] markRequestsSeen error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRequests,
  getRequestById,
  getTargetOptions,
  createRequest,
  replyToRequest,
  updateRequestStatus,
  deleteRequest,
  uploadRequestAttachment,
  getUnreadCount,
  markRequestsSeen,
};
