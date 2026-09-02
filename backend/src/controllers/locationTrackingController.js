const EmployeeLocation = require("../models/EmployeeLocation");
const Employee = require("../models/Employee");
const User = require("../models/User");

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

    // Determine employeeId and companyId
    let employeeId = req.user.employeeId;
    if (!employeeId) {
      const emp = await Employee.findOne({ userId: req.user._id, companyId: req.user.companyId }).select("_id");
      if (emp) {
        employeeId = emp._id;
      }
    }

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "No associated employee record found for user" });
    }

    const companyId = req.user.companyId;
    const userId = req.user._id;

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
    const companyId = req.user.companyId;
    const isManager = req.user.role === "Manager";

    let employeeQuery = { companyId, status: "active" };

    // If Manager, filter to department employees
    if (isManager) {
      const managerEmp = await Employee.findOne({ userId: req.user._id, companyId });
      if (managerEmp && managerEmp.department) {
        employeeQuery.department = managerEmp.department;
      }
    }

    const employees = await Employee.find(employeeQuery)
      .select("name email phone designation department avatar profilePicture lastLocation employeeCode")
      .lean();

    // Map into clean live tracking format
    const liveTrackList = employees.map((emp) => {
      const lastLoc = emp.lastLocation || {};
      const isRecent = lastLoc.updatedAt && (new Date() - new Date(lastLoc.updatedAt)) < 15 * 60 * 1000; // within 15 min

      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        avatar: emp.profilePicture || emp.avatar,
        employeeCode: emp.employeeCode,
        latitude: lastLoc.latitude || null,
        longitude: lastLoc.longitude || null,
        accuracy: lastLoc.accuracy || 0,
        speed: lastLoc.speed || 0,
        heading: lastLoc.heading || 0,
        lastUpdated: lastLoc.updatedAt || null,
        isOnline: Boolean(isRecent && lastLoc.latitude),
        isTrackingActive: Boolean(lastLoc.isTrackingActive && isRecent),
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

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trail = await EmployeeLocation.find({
      employeeId,
      companyId: req.user.companyId,
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
      if (dist > 0.01 && dist < 10) { // filter out GPS jumps
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
