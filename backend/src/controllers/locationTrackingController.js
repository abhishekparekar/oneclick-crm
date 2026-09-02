const EmployeeLocation = require("../models/EmployeeLocation");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * Sync batch of employee GPS locations from mobile device
 * @route POST /api/locations/sync
 */
const syncBatchLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ success: false, message: "No location points provided" });
    }

    const companyId = req.user.companyId || (req.user.company && (req.user.company._id || req.user.company));
    const userId = req.user._id;

    // Determine employeeId
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const emp = await Employee.findOne({ userId, companyId }).select("_id");
      if (emp) {
        employeeId = emp._id;
      }
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "No associated employee record found for user" });
    }

    // Filter and sanitize valid points
    const validPoints = [];
    for (const pt of locations) {
      const lat = Number(pt.latitude);
      const lng = Number(pt.longitude);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        (lat !== 0 || lng !== 0)
      ) {
        validPoints.push({
          companyId,
          employeeId,
          userId,
          latitude: lat,
          longitude: lng,
          accuracy: Number(pt.accuracy) || 0,
          altitude: pt.altitude !== undefined ? Number(pt.altitude) : null,
          speed: Number(pt.speed) || 0,
          heading: Number(pt.heading) || 0,
          batteryLevel: pt.batteryLevel !== undefined ? Number(pt.batteryLevel) : null,
          address: pt.address || "",
          timestamp: pt.timestamp ? new Date(pt.timestamp) : new Date(),
        });
      }
    }

    if (validPoints.length > 0) {
      // Bulk insert into history
      await EmployeeLocation.insertMany(validPoints, { ordered: false }).catch((err) => {
        console.warn("[LocationSync] Partial insert notice:", err.message);
      });

      // Update Employee latest location snapshot
      const latestPoint = validPoints[validPoints.length - 1];
      await Employee.findByIdAndUpdate(employeeId, {
        $set: {
          "lastLocation.latitude": latestPoint.latitude,
          "lastLocation.longitude": latestPoint.longitude,
          "lastLocation.accuracy": latestPoint.accuracy,
          "lastLocation.speed": latestPoint.speed,
          "lastLocation.heading": latestPoint.heading,
          "lastLocation.updatedAt": latestPoint.timestamp,
          "lastLocation.isTrackingActive": true,
        },
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synced ${validPoints.length} location points`,
      syncedCount: validPoints.length,
    });
  } catch (error) {
    console.error("[LocationSync] Error syncing locations:", error);
    return res.status(500).json({ success: false, message: "Internal server error syncing locations" });
  }
};

/**
 * Get live location snapshot for all active employees of the company
 * @route GET /api/locations/live
 */
const getLiveEmployeeLocations = async (req, res) => {
  try {
    const companyId = req.user.companyId || (req.user.company && (req.user.company._id || req.user.company));
    const isManager = req.user.role === "Manager" || req.user.role === "manager";

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID not found in user session" });
    }

    let employeeQuery = {
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      status: { $ne: "terminated" },
    };

    // If Manager, filter to their managed department or team if applicable
    if (isManager) {
      const managerEmp = await Employee.findOne({ userId: req.user._id, companyId });
      if (managerEmp) {
        if (managerEmp.departmentId) {
          employeeQuery.departmentId = managerEmp.departmentId;
        } else if (managerEmp.departmentName) {
          employeeQuery.departmentName = managerEmp.departmentName;
        }
      }
    }

    const employees = await Employee.find(employeeQuery)
      .select(
        "firstName lastName fullName email phone designationName departmentName photo avatar employeeCode lastLocation status"
      )
      .lean();

    // Fetch today's attendance for these employees to get punch in/out coords as backup
    const todayStr = new Date().toISOString().slice(0, 10);
    const employeeIds = employees.map((e) => e._id);

    const attendances = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: todayStr,
    }).lean();

    const attendanceMap = new Map();
    attendances.forEach((att) => {
      attendanceMap.set(att.employeeId.toString(), att);
    });

    // Map into clean live tracking format
    const liveTrackList = employees.map((emp) => {
      const lastLoc = emp.lastLocation || {};
      const todayAtt = attendanceMap.get(emp._id.toString());

      // Check if location is from GPS tracking (recent ping)
      const isRecent =
        lastLoc.updatedAt && new Date() - new Date(lastLoc.updatedAt) < 20 * 60 * 1000; // within 20 min

      let latitude = lastLoc.latitude || null;
      let longitude = lastLoc.longitude || null;
      let lastUpdated = lastLoc.updatedAt || null;
      let speed = lastLoc.speed || 0;
      let accuracy = lastLoc.accuracy || 0;

      // Fallback to today's punch location if no continuous GPS yet
      if (!latitude && todayAtt) {
        const punchLoc = todayAtt.punchInLocation || todayAtt.punchOutLocation;
        if (punchLoc && punchLoc.latitude && punchLoc.longitude) {
          latitude = punchLoc.latitude;
          longitude = punchLoc.longitude;
          lastUpdated = todayAtt.punchInTime || todayAtt.createdAt;
        }
      }

      const displayName =
        emp.fullName ||
        (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.firstName || "Employee");

      const isOnline = Boolean(isRecent && latitude);

      return {
        _id: emp._id,
        name: displayName,
        email: emp.email,
        phone: emp.phone,
        department: emp.departmentName || "General",
        designation: emp.designationName || "Staff",
        avatar: emp.photo || emp.avatar || "",
        employeeCode: emp.employeeCode || "",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        accuracy: accuracy,
        speed: speed,
        heading: lastLoc.heading || 0,
        lastUpdated: lastUpdated,
        isOnline: isOnline,
        isTrackingActive: Boolean(lastLoc.isTrackingActive && isRecent),
        attendanceStatus: todayAtt ? todayAtt.status : "absent",
      };
    });

    return res.status(200).json({
      success: true,
      data: liveTrackList,
    });
  } catch (error) {
    console.error("[LocationTracking] Live locations error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch live employee locations" });
  }
};

/**
 * Get location trail history for a specific employee on a specific date
 * @route GET /api/locations/trail/:employeeId
 */
const getEmployeeLocationTrail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; // YYYY-MM-DD or today
    const companyId = req.user.companyId || (req.user.company && (req.user.company._id || req.user.company));

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trail = await EmployeeLocation.find({
      employeeId,
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ timestamp: 1 })
      .select("latitude longitude accuracy speed heading batteryLevel timestamp address")
      .lean();

    // Calculate approximate distance traveled in km using Haversine
    let totalDistanceKm = 0;
    for (let i = 1; i < trail.length; i++) {
      const p1 = trail[i - 1];
      const p2 = trail[i];
      const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c; // Earth radius in KM
      if (dist > 0.01 && dist < 10) {
        // filter out GPS jumps
        totalDistanceKm += dist;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        trail,
        totalPoints: trail.length,
        distanceKm: Number(totalDistanceKm.toFixed(2)),
        startLocation: trail[0] || null,
        endLocation: trail[trail.length - 1] || null,
      },
    });
  } catch (error) {
    console.error("[LocationTracking] Trail history error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch employee location trail" });
  }
};

module.exports = {
  syncBatchLocations,
  getLiveEmployeeLocations,
  getEmployeeLocationTrail,
};
