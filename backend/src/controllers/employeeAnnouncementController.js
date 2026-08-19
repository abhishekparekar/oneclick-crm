const Employee = require("../models/Employee");
const Announcement = require("../models/Announcement");

// Helper to resolve employee profile
const getEmployeeProfile = async (req) => {
  const userId = req.user._id;
  const companyId = req.companyId;

  let employee = null;
  if (req.user.employeeId) {
    employee = await Employee.findOne({ _id: req.user.employeeId, companyId });
  }
  if (!employee) {
    employee = await Employee.findOne({ userId, companyId });
  }
  return employee;
};

// GET /api/employee/announcements
const getEmployeeAnnouncements = async (req, res, next) => {
  try {
    const employee = await getEmployeeProfile(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const companyId = req.companyId;
    const userRole = req.user.role || "Employee";
    const deptId = employee.departmentId;

    // Security Filter:
    // Published and matches company, role, department or all employees
    const filter = {
      status: "published",
      $or: [
        { targetType: "allEmployees" },
        { targetType: "selectedCompany", targetCompanies: companyId },
        { targetType: "roleBased", targetRoles: userRole },
      ]
    };

    if (deptId) {
      filter.$or.push({ targetType: "departmentBased", targetDepartments: deptId });
    }

    console.log("[getEmployeeAnnouncements] Fetching with filter:", JSON.stringify(filter, null, 2));
    
    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`[getEmployeeAnnouncements] Found ${announcements.length} announcements`);

    // Map isRead property based on readBy user list
    const enriched = announcements.map((ann) => {
      const readByList = ann.readBy || [];
      const isRead = readByList.map((id) => id.toString()).includes(req.user._id.toString());
      return {
        ...ann,
        isRead,
      };
    });

    res.json({ success: true, count: enriched.length, announcements: enriched });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/employee/announcements/:id/read
const markAnnouncementRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    // Push userId to readBy array if not already present
    if (!announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
      await announcement.save();
    }

    res.json({
      success: true,
      message: "Announcement marked as read",
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeAnnouncements,
  markAnnouncementRead,
};
