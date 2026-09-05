const EmployeeLocation = require("../models/EmployeeLocation");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const mongoose = require("mongoose");
const https = require("https");

// Helper to calculate distance in meters between two lat/lon points
const getHaversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to format minutes into human readable Marathi/English friendly format
const formatStoppageDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "Just arrived";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const hrs = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (remMins === 0) return `${hrs} hr${hrs === 1 ? "" : "s"}`;
  return `${hrs}h ${remMins}m`;
};

/**
 * Snap raw GPS waypoints to real street road geometry via OSRM (OpenStreetMap Routing)
 * This guarantees lines follow streets around corners and NEVER slice through buildings/houses!
 */
const snapCoordinatesToRoads = (coordinates) => {
  return new Promise((resolve) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return resolve({ roadPoints: coordinates, roadDistanceKm: null });
    }

    // Limit to max 35 distinct waypoints per chunk to prevent long URL query strings
    const sampleLimit = 35;
    let sampled = coordinates;
    if (coordinates.length > sampleLimit) {
      const step = Math.ceil(coordinates.length / sampleLimit);
      sampled = coordinates.filter((_, idx) => idx % step === 0 || idx === coordinates.length - 1);
    }

    const waypointsStr = sampled
      .map((c) => `${Number(c[1]).toFixed(6)},${Number(c[0]).toFixed(6)}`)
      .join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;

    const req = https.get(url, { headers: { "User-Agent": "OneClickHRMS/1.0" }, timeout: 4000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.code === "Ok" && json.routes && json.routes[0]) {
            // OSRM returns coordinates as [lon, lat], convert back to { latitude, longitude } objects for Leaflet
            const roadPoints = json.routes[0].geometry.coordinates.map((c) => ({
              latitude: c[1],
              longitude: c[0],
            }));
            const roadDistanceKm = Number((json.routes[0].distance / 1000).toFixed(2));
            return resolve({ roadPoints, roadDistanceKm });
          }
        } catch (e) {}
        resolve({ roadPoints: coordinates, roadDistanceKm: null });
      });
    });

    req.on("error", () => resolve({ roadPoints: coordinates, roadDistanceKm: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ roadPoints: coordinates, roadDistanceKm: null });
    });
  });
};

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

    // ── Enforce Late-Night Cut-Off (12:00 AM / Midnight IST) ──
    const kolkataHour = parseInt(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );

    if (kolkataHour < 5) {
      return res.status(200).json({
        success: true,
        trackingAllowed: false,
        message: "Late night cut-off (12:00 AM): Location tracking automatically stopped",
      });
    }

    // ── Enforce Duty Hours Only (Employee must be actively punched in today) ──
    const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayUtc = new Date().toISOString().split("T")[0];
    const todayAtt = await Attendance.findOne({
      employeeId,
      companyId,
      date: { $in: [todayIst, todayUtc] },
    }).sort({ createdAt: -1 }).select("punchInTime punchOutTime punchLog");

    let isOnDuty = false;
    let hasPunchedIn = false;
    let hasPunchedOut = false;

    if (todayAtt) {
      if (Array.isArray(todayAtt.punchLog) && todayAtt.punchLog.length > 0) {
        const lastSession = todayAtt.punchLog[todayAtt.punchLog.length - 1];
        hasPunchedIn = Boolean(lastSession.punchInTime);
        hasPunchedOut = Boolean(lastSession.punchOutTime);
        isOnDuty = hasPunchedIn && !hasPunchedOut;
      } else {
        hasPunchedIn = Boolean(todayAtt.punchInTime);
        hasPunchedOut = Boolean(todayAtt.punchOutTime);
        isOnDuty = hasPunchedIn && !hasPunchedOut;
      }
    }

    if (!isOnDuty) {
      // Employee has not punched in today, or has already punched out!
      // Signal mobile device to immediately halt background tracking
      return res.status(200).json({
        success: true,
        trackingAllowed: false,
        message: hasPunchedOut
          ? "Duty ended: Employee has punched out for the day"
          : "Duty not started: Employee has not punched in yet",
      });
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
      // Sort points chronologically ascending
      validPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Bulk insert into history
      await EmployeeLocation.insertMany(validPoints, { ordered: false }).catch((err) => {
        console.warn("[LocationSync] Partial insert notice:", err.message);
      });

      // Update Employee latest location snapshot prioritizing high-accuracy fixes (<= 35m)
      const accuratePoints = validPoints.filter((p) => !p.accuracy || p.accuracy <= 35);
      const candidateList = accuratePoints.length > 0 ? accuratePoints : validPoints;
      const latestPoint = candidateList[candidateList.length - 1];

      // Calculate stoppage anchor
      const prevEmp = await Employee.findById(employeeId).select("lastLocation");
      const isNewer = !prevEmp?.lastLocation?.updatedAt || new Date(latestPoint.timestamp) >= new Date(prevEmp.lastLocation.updatedAt);

      if (isNewer) {
        let stationarySince = latestPoint.timestamp;
        const isMoving = (latestPoint.speed || 0) > 3.0;

        if (!isMoving && prevEmp?.lastLocation?.latitude) {
          const dist = getHaversineDistanceMeters(
            prevEmp.lastLocation.latitude,
            prevEmp.lastLocation.longitude,
            latestPoint.latitude,
            latestPoint.longitude
          );
          // If employee stayed within 45 meters, keep existing stationarySince timestamp
          if (dist <= 45 && prevEmp.lastLocation.stationarySince) {
            stationarySince = prevEmp.lastLocation.stationarySince;
          }
        }

        await Employee.findByIdAndUpdate(employeeId, {
        $set: {
          "lastLocation.latitude": latestPoint.latitude,
          "lastLocation.longitude": latestPoint.longitude,
          "lastLocation.accuracy": latestPoint.accuracy,
          "lastLocation.speed": latestPoint.speed,
          "lastLocation.heading": latestPoint.heading,
          "lastLocation.batteryLevel": latestPoint.batteryLevel,
          "lastLocation.address": latestPoint.address,
          "lastLocation.updatedAt": latestPoint.timestamp,
          "lastLocation.isTrackingActive": true,
          "lastLocation.stationarySince": isMoving ? null : stationarySince,
          "lastLocation.motionStatus": isMoving ? "moving" : "stationary",
        },
        }).catch(() => {});
      }
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
 * Get live location snapshot for all active employees of the company with stoppage analysis
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
    } else if (req.user.role === "Employee" || req.user.role === "employee") {
      // If Employee, show their own location so their tracking radar opens focused on themselves
      const ownEmp = await Employee.findOne({ userId: req.user._id, companyId });
      if (ownEmp) {
        employeeQuery._id = ownEmp._id;
      }
    }

    const employees = await Employee.find(employeeQuery)
      .select(
        "firstName lastName fullName email phone designationName departmentName photo avatar employeeCode lastLocation status"
      )
      .lean();

    const employeeIds = employees.map((e) => e._id);
    const todayIst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayUtc = new Date().toISOString().slice(0, 10);

    // 1. Fetch today's attendance records to know punch status (In/Out)
    const attendances = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: { $in: [todayIst, todayUtc] },
    }).lean();

    const attendanceMap = new Map();
    attendances.forEach((att) => {
      attendanceMap.set(att.employeeId.toString(), att);
    });

    // 2. Fetch today's continuous GPS trail history from EmployeeLocation for stoppage duration calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const recentLocationAgg = await EmployeeLocation.aggregate([
      {
        $match: {
          employeeId: { $in: employeeIds },
          timestamp: { $gte: startOfToday },
        },
      },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: "$employeeId",
          latestPoint: { $last: "$$ROOT" },
          allPoints: {
            $push: {
              latitude: "$latitude",
              longitude: "$longitude",
              speed: "$speed",
              accuracy: "$accuracy",
              timestamp: "$timestamp",
              batteryLevel: "$batteryLevel",
              address: "$address",
            },
          },
        },
      },
    ]);

    const locHistoryMap = new Map();
    recentLocationAgg.forEach((item) => {
      const allPts = Array.isArray(item.allPoints) ? item.allPoints : [];
      let todayDistanceMeters = 0;

      if (allPts.length >= 2) {
        let lastAcc = allPts[0];
        for (let i = 1; i < allPts.length; i++) {
          const cur = allPts[i];
          const dist = getHaversineDistanceMeters(lastAcc.latitude, lastAcc.longitude, cur.latitude, cur.longitude);
          const dtSeconds = Math.max(1, (new Date(cur.timestamp) - new Date(lastAcc.timestamp)) / 1000);
          const speedKmh = (dist / dtSeconds) * 3.6;

          // Skip teleport jump glitches (> 130 km/h)
          if (speedKmh > 130 && dist > 300) continue;

          // Skip micro-jitter (under 8 meters if stationary)
          const reportedSpeed = (cur.speed || 0) * 3.6;
          if (dist < 8 && reportedSpeed < 2.5) continue;

          todayDistanceMeters += dist;
          lastAcc = cur;
        }
      }

      // Ignore room flutter under 25 meters
      if (todayDistanceMeters < 25) todayDistanceMeters = 0;

      const todayDistanceKm = Number((todayDistanceMeters / 1000).toFixed(2));
      let todayDistanceText = "0 km";
      if (todayDistanceKm >= 1.0) {
        todayDistanceText = `${todayDistanceKm.toFixed(2)} km`;
      } else if (todayDistanceKm > 0) {
        todayDistanceText = `${Math.round(todayDistanceMeters)} m`;
      }

      locHistoryMap.set(item._id.toString(), {
        latest: item.latestPoint,
        trail: allPts.slice(-30).reverse(),
        todayDistanceMeters: Math.round(todayDistanceMeters),
        todayDistanceKm: todayDistanceKm,
        todayDistanceText: todayDistanceText,
      });
    });

    const now = new Date();

    // 3. Map each employee with tracking status and stoppage duration
    const liveTrackList = employees.map((emp) => {
      const empIdStr = emp._id.toString();
      const lastLoc = emp.lastLocation || {};
      const locData = locHistoryMap.get(empIdStr);
      const todayAtt = attendanceMap.get(empIdStr);

      // Determine best location point (EmployeeLocation table latest > lastLocation > punch coords)
      let latitude = null;
      let longitude = null;
      let lastUpdated = null;
      let speed = 0;
      let accuracy = 0;
      let heading = 0;
      let batteryLevel = null;
      let address = "";

      if (locData?.latest) {
        latitude = locData.latest.latitude;
        longitude = locData.latest.longitude;
        lastUpdated = locData.latest.timestamp;
        speed = locData.latest.speed || 0;
        accuracy = locData.latest.accuracy || 0;
        heading = locData.latest.heading || 0;
        batteryLevel = locData.latest.batteryLevel !== undefined ? locData.latest.batteryLevel : null;
        address = locData.latest.address || "";
      } else if (lastLoc.latitude) {
        latitude = lastLoc.latitude;
        longitude = lastLoc.longitude;
        lastUpdated = lastLoc.updatedAt;
        speed = lastLoc.speed || 0;
        accuracy = lastLoc.accuracy || 0;
        heading = lastLoc.heading || 0;
        batteryLevel = lastLoc.batteryLevel !== undefined ? lastLoc.batteryLevel : null;
        address = lastLoc.address || "";
      } else if (todayAtt) {
        const punchLoc = todayAtt.punchInLocation || todayAtt.punchOutLocation;
        if (punchLoc && punchLoc.latitude && punchLoc.longitude) {
          latitude = punchLoc.latitude;
          longitude = punchLoc.longitude;
          lastUpdated = todayAtt.punchInTime || todayAtt.createdAt;
          address = punchLoc.address || "";
        }
      }

      // Check if user is currently on duty today (must have punched in and not punched out)
      let hasPunchedIn = false;
      let isPunchedOut = false;
      let isOnDuty = false;

      if (todayAtt) {
        if (Array.isArray(todayAtt.punchLog) && todayAtt.punchLog.length > 0) {
          const lastSession = todayAtt.punchLog[todayAtt.punchLog.length - 1];
          hasPunchedIn = Boolean(lastSession.punchInTime);
          isPunchedOut = Boolean(lastSession.punchOutTime);
          isOnDuty = hasPunchedIn && !isPunchedOut;
        } else {
          hasPunchedIn = Boolean(todayAtt.punchInTime);
          isPunchedOut = Boolean(todayAtt.punchOutTime);
          isOnDuty = hasPunchedIn && !isPunchedOut;
        }
      }

      // Calculate time elapsed since last GPS transmission
      const minutesSinceLastPing = lastUpdated ? Math.max(0, Math.round((now - new Date(lastUpdated)) / 60000)) : null;

      // Late night check (12:00 AM / midnight IST cut-off: 00:00 to 05:00 IST)
      const kolkataHour = parseInt(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          hour12: false,
        }).format(now)
      );
      const isLateNight = kolkataHour < 5; // 12:00 AM (midnight) to 05:00 AM IST

      // ── Determine Tracking Status: "active" (चालू) | "stopped" (बंद) | "no_signal" ──
      // Rules:
      // 1. Employee tracking stays ACTIVE (चालू) as long as they are punched in and haven't punched out.
      // 2. Automatically stops when employee punches out or at late night 12:00 AM (midnight).
      let trackingStatus = "no_signal"; // "active" | "stopped" | "no_signal"
      let trackingStatusLabel = "No GPS Signal";
      let trackingStatusColor = "slate"; // "emerald" | "amber" | "rose" | "slate"
      let isOnline = false;

      if (!hasPunchedIn) {
        // Employee has NOT punched in today: Tracking MUST be OFF / STOPPED!
        trackingStatus = "stopped";
        trackingStatusLabel = "Not Punched In (Off Duty)";
        trackingStatusColor = "rose";
        isOnline = false;
        latitude = null;
        longitude = null;
      } else if (isPunchedOut) {
        // Employee has punched out for the day: Tracking MUST be OFF / STOPPED!
        trackingStatus = "stopped";
        trackingStatusLabel = "Tracking Stopped (Punched Out)";
        trackingStatusColor = "rose";
        isOnline = false;
      } else if (isLateNight) {
        // Auto-stop at late night 12:00 AM
        trackingStatus = "stopped";
        trackingStatusLabel = "Tracking Stopped (Late Night 12:00 AM)";
        trackingStatusColor = "rose";
        isOnline = false;
      } else if (!latitude || !lastUpdated) {
        trackingStatus = "no_signal";
        trackingStatusLabel = "Waiting for GPS Signal";
        trackingStatusColor = "slate";
        isOnline = false;
      } else {
        // Employee is on duty (punched in & not punched out) and before 12:00 AM:
        // Tracking stays ACTIVE (चालू)!
        trackingStatus = "active";
        trackingStatusLabel = "Live Tracking Active (चालू)";
        trackingStatusColor = "emerald";
        isOnline = true;
      }

      // ── Calculate Stoppage / Halt Duration (तो स्टाफ किती वेळ झाला तिथे थांबलाय) ──
      let motionStatus = "stationary"; // "moving" | "stationary"
      let stoppageDurationMinutes = 0;
      let stoppageText = "0 mins";
      let stoppedSince = lastUpdated;

      if (latitude && longitude) {
        const isMoving = trackingStatus === "active" && speed > 3.0;

        if (isMoving) {
          motionStatus = "moving";
          stoppageDurationMinutes = 0;
          stoppageText = `Moving (${Math.round(speed)} km/h)`;
          stoppedSince = null;
        } else {
          motionStatus = "stationary";
          let stoppageStartTime = new Date(lastUpdated || now);

          // Trace backward through recent GPS trail to find exact arrival time at this spot
          const trail = locData?.trail || [];
          if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
              const pt = trail[i];
              const dist = getHaversineDistanceMeters(latitude, longitude, pt.latitude, pt.longitude);
              // Within 45m GPS jitter and walking/stopped speed <= 3.5 km/h
              if (dist <= 45 && (pt.speed || 0) <= 3.5) {
                stoppageStartTime = new Date(pt.timestamp);
              } else {
                break; // previous point was on the move
              }
            }
          } else if (lastLoc.stationarySince) {
            stoppageStartTime = new Date(lastLoc.stationarySince);
          }

          stoppageDurationMinutes = Math.max(1, Math.round((now - stoppageStartTime) / 60000));
          stoppageText = formatStoppageDuration(stoppageDurationMinutes);
          stoppedSince = stoppageStartTime.toISOString();
        }
      }

      const displayName =
        emp.fullName ||
        (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.firstName || "Employee");

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
        heading: heading,
        batteryLevel: batteryLevel,
        address: address,
        lastUpdated: lastUpdated,
        minutesSinceLastPing: minutesSinceLastPing,
        isOnline: isOnline,
        isTrackingActive: trackingStatus === "active",
        trackingStatus: trackingStatus, // "active" | "idle" | "stopped" | "no_signal"
        trackingStatusLabel: trackingStatusLabel,
        trackingStatusColor: trackingStatusColor,
        motionStatus: motionStatus, // "moving" | "stationary"
        stoppageDurationMinutes: stoppageDurationMinutes,
        stoppageText: stoppageText,
        stoppedSince: stoppedSince,
        todayDistanceKm: locData?.todayDistanceKm || 0,
        todayDistanceMeters: locData?.todayDistanceMeters || 0,
        todayDistanceText: locData?.todayDistanceText || "0 km",
        attendanceStatus: todayAtt ? todayAtt.status : "absent",
        punchInTime: todayAtt ? todayAtt.punchInTime : null,
        punchOutTime: todayAtt ? todayAtt.punchOutTime : null,
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
/**
 * Get location trail history for a specific employee on a specific date with accurate actual distance & halts
 * @route GET /api/locations/trail/:employeeId
 */
const getEmployeeLocationTrail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; // YYYY-MM-DD or today
    const companyId = req.user.companyId || (req.user.company && (req.user.company._id || req.user.company));

    // Calculate exact IST day window (UTC + 5:30)
    let startOfDay, endOfDay;
    if (date && typeof date === "string" && date.includes("-")) {
      const [y, m, d] = date.split("-").map(Number);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - istOffsetMs);
      endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - istOffsetMs);
    } else {
      const now = new Date();
      // Get IST date string for today
      const istStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
      const [y, m, d] = istStr.split("-").map(Number);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - istOffsetMs);
      endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - istOffsetMs);
    }

    const rawTrail = await EmployeeLocation.find({
      employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ timestamp: 1 })
      .select("latitude longitude accuracy speed heading batteryLevel timestamp address")
      .lean();

    if (rawTrail.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          trail: [],
          cleanTrail: [],
          isStationaryAllDay: true,
          totalPoints: 0,
          distanceKm: 0,
          maxSpeed: 0,
          avgSpeed: 0,
          totalHaltTimeMinutes: 0,
          totalHaltTimeText: "0 mins",
          totalMovingTimeMinutes: 0,
          totalMovingTimeText: "0 mins",
          halts: [],
          haltCount: 0,
          startLocation: null,
          endLocation: null,
          startTime: null,
          endTime: null,
        },
      });
    }

    // 1. Filter out poor GPS fixes (accuracy > 55 meters)
    const validPoints = rawTrail.filter((p) => !p.accuracy || p.accuracy <= 55);
    const candidatePoints = validPoints.length >= 2 ? validPoints : rawTrail;

    // 2. Calculate accurate real-world cumulative distance
    let totalDistanceMeters = 0;
    let lastAccepted = candidatePoints[0];
    let maxSpeed = 0;
    const movingSpeeds = [];

    for (let i = 1; i < candidatePoints.length; i++) {
      const cur = candidatePoints[i];
      const spd = Number(cur.speed) || 0;
      if (spd > maxSpeed) maxSpeed = spd;

      const dist = getHaversineDistanceMeters(lastAccepted.latitude, lastAccepted.longitude, cur.latitude, cur.longitude);
      const dtSeconds = Math.max(1, (new Date(cur.timestamp) - new Date(lastAccepted.timestamp)) / 1000);
      const impliedSpeed = (dist / dtSeconds) * 3.6;

      // Skip teleport jump glitches (> 130 km/h)
      if (impliedSpeed > 130 && dist > 300) continue;

      // Skip micro-jitter (under 8 meters if stationary)
      const reportedSpeed = (cur.speed || 0) * 3.6;
      if (dist < 8 && reportedSpeed < 2.5) continue;

      totalDistanceMeters += dist;
      if (spd > 0) movingSpeeds.push(spd);
      lastAccepted = cur;
    }

    const firstTime = new Date(candidatePoints[0].timestamp);
    const lastTime = new Date(candidatePoints[candidatePoints.length - 1].timestamp);
    const totalDayMinutes = Math.max(1, Math.round((lastTime - firstTime) / 60000));

    // If total movement across the entire day is under 25 meters (e.g. at desk all day):
    if (totalDistanceMeters < 25) {
      const basePoint = candidatePoints[0];
      return res.status(200).json({
        success: true,
        data: {
          trail: [basePoint],
          cleanTrail: [basePoint],
          isStationaryAllDay: true,
          rawCount: rawTrail.length,
          cleanCount: 1,
          totalPoints: rawTrail.length,
          distanceKm: 0,
          distanceMeters: 0,
          distanceText: "0 km",
          todayDistanceText: "0 km",
          maxSpeed: 0,
          avgSpeed: 0,
          halts: [
            {
              latitude: basePoint.latitude,
              longitude: basePoint.longitude,
              startTime: candidatePoints[0].timestamp,
              endTime: candidatePoints[candidatePoints.length - 1].timestamp,
              durationMinutes: totalDayMinutes,
              durationText: formatStoppageDuration(totalDayMinutes),
              address: basePoint.address || "",
            },
          ],
          haltCount: 1,
          totalHaltTimeMinutes: totalDayMinutes,
          totalHaltTimeText: formatStoppageDuration(totalDayMinutes),
          totalMovingTimeMinutes: 0,
          totalMovingTimeText: "0 mins",
          startLocation: basePoint,
          endLocation: candidatePoints[candidatePoints.length - 1],
          startTime: candidatePoints[0].timestamp,
          endTime: candidatePoints[candidatePoints.length - 1].timestamp,
        },
      });
    }

    // ── Build Clean Trail & Detect Real Halts ──
    const ANCHOR_RADIUS_METERS = 25;
    let anchor = candidatePoints[0];
    const cleanTrail = [anchor];
    const halts = [];

    let currentHalt = {
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      startTime: anchor.timestamp,
      endTime: anchor.timestamp,
      address: anchor.address || "",
    };

    for (let i = 1; i < candidatePoints.length; i++) {
      const pt = candidatePoints[i];
      const spd = (Number(pt.speed) || 0) * 3.6;
      const distFromAnchor = getHaversineDistanceMeters(anchor.latitude, anchor.longitude, pt.latitude, pt.longitude);

      if (distFromAnchor < ANCHOR_RADIUS_METERS && spd < 3.0) {
        currentHalt.endTime = pt.timestamp;
        if (pt.address && !currentHalt.address) currentHalt.address = pt.address;
      } else {
        const prev = cleanTrail[cleanTrail.length - 1];
        const distFromPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
        const dtSeconds = Math.max(1, (new Date(pt.timestamp) - new Date(prev.timestamp)) / 1000);
        const impliedSpeed = (distFromPrev / dtSeconds) * 3.6;

        if (impliedSpeed > 130 && distFromPrev > 300) continue;

        const haltDurationMins = Math.round((new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000);
        if (haltDurationMins >= 3) {
          halts.push({
            latitude: currentHalt.latitude,
            longitude: currentHalt.longitude,
            startTime: currentHalt.startTime,
            endTime: currentHalt.endTime,
            durationMinutes: haltDurationMins,
            durationText: formatStoppageDuration(haltDurationMins),
            address: currentHalt.address || "",
          });
        }

        cleanTrail.push(pt);
        anchor = pt;
        currentHalt = {
          latitude: pt.latitude,
          longitude: pt.longitude,
          startTime: pt.timestamp,
          endTime: pt.timestamp,
          address: pt.address || "",
        };
      }
    }

    // Check final halt at destination
    const finalHaltMins = Math.round((new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000);
    if (finalHaltMins >= 3) {
      halts.push({
        latitude: currentHalt.latitude,
        longitude: currentHalt.longitude,
        startTime: currentHalt.startTime,
        endTime: currentHalt.endTime,
        durationMinutes: finalHaltMins,
        durationText: formatStoppageDuration(finalHaltMins),
        address: currentHalt.address || "",
      });
    }

    // Use the real-world clean GPS trail directly so out-and-back trips are 100% preserved
    // and no artificial OSRM car T-turns or loops are injected!
    const finalDistance = Number((totalDistanceMeters / 1000).toFixed(2));

    let distanceText = "0 km";
    if (finalDistance >= 1.0) {
      distanceText = `${finalDistance.toFixed(2)} km`;
    } else if (totalDistanceMeters > 0) {
      distanceText = `${Math.round(totalDistanceMeters)} m (${finalDistance.toFixed(2)} km)`;
    }

    const finalTrail = cleanTrail;

    const avgMovingSpeed = movingSpeeds.length > 0
      ? Math.round(movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length)
      : 0;

    const totalHaltMinutes = halts.reduce((sum, h) => sum + h.durationMinutes, 0);
    const movingMinutes = Math.max(0, totalDayMinutes - totalHaltMinutes);

    return res.status(200).json({
      success: true,
      data: {
        trail: finalTrail,
        cleanTrail: cleanTrail,
        isStationaryAllDay: false,
        rawCount: rawTrail.length,
        cleanCount: finalTrail.length,
        totalPoints: rawTrail.length,
        distanceKm: finalDistance,
        distanceMeters: Math.round(totalDistanceMeters),
        distanceText: distanceText,
        todayDistanceText: distanceText,
        maxSpeed: Math.round(maxSpeed),
        avgSpeed: avgMovingSpeed,
        halts: halts,
        haltCount: halts.length,
        totalHaltTimeMinutes: totalHaltMinutes,
        totalHaltTimeText: formatStoppageDuration(totalHaltMinutes),
        totalMovingTimeMinutes: movingMinutes,
        totalMovingTimeText: formatStoppageDuration(movingMinutes),
        startLocation: cleanTrail[0] || null,
        endLocation: cleanTrail[cleanTrail.length - 1] || null,
        startTime: candidatePoints[0]?.timestamp || null,
        endTime: candidatePoints[candidatePoints.length - 1]?.timestamp || null,
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
