const EmployeeLocation = require("../models/EmployeeLocation");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Company = require("../models/Company");
const TrackingAllowance = require("../models/TrackingAllowance");
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

    // Determine employeeId and check tracking permission
    let employeeId = req.user.employeeId;
    let emp = null;
    if (!employeeId) {
      emp = await Employee.findOne({
        companyId,
        $or: [{ userId }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
      }).select("_id isLocationTrackingEnabled");
      if (emp) {
        employeeId = emp._id;
      }
    } else {
      emp = await Employee.findById(employeeId).select("_id isLocationTrackingEnabled");
      if (!emp) {
        emp = await Employee.findOne({
          companyId,
          $or: [{ userId }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
        }).select("_id isLocationTrackingEnabled");
        if (emp) employeeId = emp._id;
      }
    }

    if (!employeeId || !emp) {
      return res.status(400).json({ success: false, message: "No associated employee record found for user" });
    }

    // Check if employee has location tracking enabled by Company Admin
    if (emp.isLocationTrackingEnabled === false) {
      return res.status(200).json({
        success: true,
        trackingAllowed: false,
        message: "Location tracking is not enabled for this employee",
      });
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

      // Bulk insert into history - NEVER discard real travel points!
      await EmployeeLocation.insertMany(validPoints, { ordered: false }).catch((err) => {
        console.warn("[LocationSync] Partial insert notice:", err.message);
      });

      // Update Employee latest location snapshot prioritizing high-accuracy fixes (<= 45m)
      const accuratePoints = validPoints.filter((p) => !p.accuracy || p.accuracy <= 45);
      const candidateList = accuratePoints.length > 0 ? accuratePoints : validPoints;
      const latestPoint = candidateList[candidateList.length - 1];

      // Calculate stoppage anchor
      const prevEmp = await Employee.findById(employeeId).select("lastLocation");
      const isNewer = !prevEmp?.lastLocation?.updatedAt || new Date(latestPoint.timestamp) >= new Date(prevEmp.lastLocation.updatedAt);

      if (isNewer) {
        let stationarySince = latestPoint.timestamp;
        const isMoving = isOnDuty && (latestPoint.speed || 0) > 3.0;

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
            "lastLocation.isTrackingActive": isOnDuty,
            "lastLocation.stationarySince": isMoving ? null : stationarySince,
            "lastLocation.motionStatus": isMoving ? "moving" : "stationary",
          },
        }).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      trackingAllowed: isOnDuty,
      hasPunchedOut: Boolean(hasPunchedOut),
      hasPunchedIn: Boolean(hasPunchedIn),
      message: hasPunchedOut
        ? `Synced ${validPoints.length} points. Duty ended (punched out).`
        : !hasPunchedIn
        ? `Synced ${validPoints.length} points. Duty not started.`
        : `Successfully synced ${validPoints.length} location points`,
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

    // If Manager, filter to their managed department or team + include manager themselves
    if (isManager) {
      const managerEmp = await Employee.findOne({
        companyId,
        $or: [{ userId: req.user._id }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
      });
      if (managerEmp) {
        const deptFilter = managerEmp.departmentId
          ? { departmentId: managerEmp.departmentId }
          : managerEmp.departmentName
          ? { departmentName: managerEmp.departmentName }
          : {};
        employeeQuery.$or = [deptFilter, { _id: managerEmp._id }];
      }
    } else if (req.user.role === "Employee" || req.user.role === "employee") {
      // If Employee, show their own location so their tracking radar opens focused on themselves
      const ownEmp = await Employee.findOne({
        companyId,
        $or: [{ userId: req.user._id }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
      });
      if (ownEmp) {
        employeeQuery._id = ownEmp._id;
      }
    }
    // If CompanyAdmin or HR: employeeQuery matches all active staff (Employees, HR & Managers)

    const employees = await Employee.find(employeeQuery)
      .select(
        "firstName lastName fullName email phone designationName departmentName photo avatar employeeCode lastLocation status isLocationTrackingEnabled"
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
      let trackingStatus = "no_signal"; // "active" | "stopped" | "no_signal" | "disabled"
      let trackingStatusLabel = "No GPS Signal";
      let trackingStatusColor = "slate"; // "emerald" | "amber" | "rose" | "slate"
      let isOnline = false;

      if (!emp.isLocationTrackingEnabled) {
        // Location tracking is not enabled for this employee (e.g. Office Staff)
        trackingStatus = "disabled";
        trackingStatusLabel = "Tracking Not Assigned (Office Staff)";
        trackingStatusColor = "slate";
        isOnline = false;
        latitude = null;
        longitude = null;
      } else if (!hasPunchedIn) {
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
        isLocationTrackingEnabled: Boolean(emp.isLocationTrackingEnabled),
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
 * Perpendicular distance from a point to a line segment in meters
 */
function getPerpendicularDistance(pt, p1, p2) {
  const x = pt.longitude || pt.lng;
  const y = pt.latitude || pt.lat;
  const x1 = p1.longitude || p1.lng;
  const y1 = p1.latitude || p1.lat;
  const x2 = p2.longitude || p2.lng;
  const y2 = p2.latitude || p2.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return getHaversineDistanceMeters(y, x, y1, x1);
  }

  const num = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  const den = Math.sqrt(dy * dy + dx * dx);
  return (num / den) * 111000;
}

/**
 * Ramer-Douglas-Peucker simplification to extract key inflection waypoints
 */
function rdpSimplify(points, epsilonMeters = 15) {
  if (!Array.isArray(points) || points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = getPerpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilonMeters) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilonMeters);
    const right = rdpSimplify(points.slice(maxIdx), epsilonMeters);
    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

/**
 * Route GPS trail segments along actual road network using high-performance multi-waypoint batching
 * Guarantees routes follow real streets and lane turns, completely eliminating building-cutting straight lines
 */
async function alignTrailToRoadNetwork(cleanPoints) {
  if (!Array.isArray(cleanPoints) || cleanPoints.length < 2) {
    return { trail: cleanPoints, distanceMeters: 0 };
  }

  // 1. Distill raw points down to essential turn/inflection waypoints using RDP
  const waypoints = rdpSimplify(cleanPoints, 15);

  // 2. Batch route through OSRM in chunks of up to 25 waypoints per request
  const CHUNK_SIZE = 25;
  const roadTrail = [];
  let totalRoadDistance = 0;

  for (let i = 0; i < waypoints.length; i += CHUNK_SIZE - 1) {
    const chunk = waypoints.slice(i, i + CHUNK_SIZE);
    if (chunk.length < 2) continue;

    const coordsStr = chunk
      .map((p) => `${(p.longitude || p.lng).toFixed(6)},${(p.latitude || p.lat).toFixed(6)}`)
      .join(";");

    let routed = false;

    let chunkDirectDistance = 0;
    for (let k = 0; k < chunk.length - 1; k++) {
      chunkDirectDistance += getHaversineDistanceMeters(
        chunk[k].latitude || chunk[k].lat,
        chunk[k].longitude || chunk[k].lng,
        chunk[k + 1].latitude || chunk[k + 1].lat,
        chunk[k + 1].longitude || chunk[k + 1].lng
      );
    }

    // Try bike profile first (standard for two-wheelers/intra-city), fallback to driving
    for (const profile of ["bike", "driving"]) {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.code === "Ok" && data.routes && data.routes[0]?.geometry?.coordinates?.length >= 2) {
            const osrmDistance = Number(data.routes[0].distance) || 0;
            
            // If OSRM route is > 1.35x direct distance and adds > 40m, it's an artificial detour around a one-way block or alley
            if (chunkDirectDistance > 0 && osrmDistance > chunkDirectDistance * 1.35 && (osrmDistance - chunkDirectDistance) > 40) {
              // Reject artificial detour
              continue;
            }

            const coords = data.routes[0].geometry.coordinates.map((c) => ({
              latitude: c[1],
              longitude: c[0],
            }));
            if (roadTrail.length === 0) {
              roadTrail.push(...coords);
            } else {
              roadTrail.push(...coords.slice(1));
            }
            totalRoadDistance += osrmDistance;
            routed = true;
            break;
          }
        }
      } catch (err) {
        // Fallback to next profile or direct chunk
      }
    }

    if (!routed) {
      if (roadTrail.length === 0) {
        roadTrail.push(...chunk);
      } else {
        roadTrail.push(...chunk.slice(1));
      }
      totalRoadDistance += chunkDirectDistance;
    }
  }

  return { trail: roadTrail, distanceMeters: totalRoadDistance };
}

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

    // 1. Filter out poor GPS fixes (accuracy <= 55m eliminates coarse cell-tower and wake-up jumps)
    const validPoints = rawTrail.filter((p) => !p.accuracy || p.accuracy <= 55);
    let candidatePoints = validPoints.length >= 2 ? validPoints : rawTrail;

    // 1b. Discard cold-start cell-tower glitch at point[0]:
    // When an employee opens the app indoors, Android often returns a stale cell-tower position (200m-800m away)
    // before true GPS locks on at the actual starting location.
    if (candidatePoints.length >= 3) {
      const p0 = candidatePoints[0];
      const p1 = candidatePoints[1];
      const p2 = candidatePoints[2];
      const jump01 = getHaversineDistanceMeters(p0.latitude, p0.longitude, p1.latitude, p1.longitude);
      const cluster12 = getHaversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

      if (jump01 > 150 && cluster12 < 100) {
        candidatePoints = candidatePoints.slice(1);
      }
    }

    // 1c. Discard tail cell-tower glitch at the last point
    if (candidatePoints.length >= 3) {
      const pLast = candidatePoints[candidatePoints.length - 1];
      const pPrev = candidatePoints[candidatePoints.length - 2];
      const pPrev2 = candidatePoints[candidatePoints.length - 3];
      const jumpTail = getHaversineDistanceMeters(pPrev.latitude, pPrev.longitude, pLast.latitude, pLast.longitude);
      const clusterPrev = getHaversineDistanceMeters(pPrev2.latitude, pPrev2.longitude, pPrev.latitude, pPrev.longitude);

      if (jumpTail > 150 && clusterPrev < 100) {
        candidatePoints = candidatePoints.slice(0, -1);
      }
    }

    // 1d. V-Spike / Overshoot Outlier Filter:
    // Discards points that suddenly jump away and immediately snap back (e.g. temporary phone wake-up glitch)
    if (candidatePoints.length >= 3) {
      const filtered = [candidatePoints[0]];
      for (let i = 1; i < candidatePoints.length - 1; i++) {
        const prev = filtered[filtered.length - 1];
        const cur = candidatePoints[i];
        const next = candidatePoints[i + 1];

        const dPrevCur = getHaversineDistanceMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
        const dCurNext = getHaversineDistanceMeters(cur.latitude, cur.longitude, next.latitude, next.longitude);
        const dPrevNext = getHaversineDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);

        const dtCurNext = Math.max(0.5, (new Date(next.timestamp) - new Date(cur.timestamp)) / 1000);
        const speedCurNext = (dCurNext / dtCurNext) * 3.6;

        // If cur overshoots by > 25m and next returns back close to prev, or speed between cur and next is impossible (> 60 km/h)
        const isSpike = (dPrevCur > 20 && dCurNext > 20 && dPrevNext < dPrevCur * 0.75) ||
                        (speedCurNext > 60 && dCurNext > 25);

        if (isSpike) {
          console.log(`[TrailFilter] Suppressed V-spike overshoot point: ${cur.latitude}, ${cur.longitude} (spike: ${Math.round(dCurNext)}m in ${dtCurNext.toFixed(1)}s, acc: ${cur.accuracy}m)`);
          continue;
        }
        filtered.push(cur);
      }
      filtered.push(candidatePoints[candidatePoints.length - 1]);
      candidatePoints = filtered;
    }

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
    const HALT_ZONE_RADIUS_METERS = 35;
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
      const distFromHaltCenter = getHaversineDistanceMeters(
        currentHalt.latitude,
        currentHalt.longitude,
        pt.latitude,
        pt.longitude
      );

      if (distFromHaltCenter < HALT_ZONE_RADIUS_METERS && spd < 3.0) {
        // Stationary or drifting within the halt zone: absorb into current halt to prevent rooftop lines
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

    // Align trail segments to actual streets so the route runs on the road and never through buildings
    let finalTrail = cleanTrail;
    let actualRoadDistanceMeters = totalDistanceMeters;

    if (cleanTrail.length >= 2) {
      const roadAligned = await alignTrailToRoadNetwork(cleanTrail);
      if (roadAligned && Array.isArray(roadAligned.trail) && roadAligned.trail.length >= 2) {
        finalTrail = roadAligned.trail;
        if (roadAligned.distanceMeters > actualRoadDistanceMeters) {
          actualRoadDistanceMeters = roadAligned.distanceMeters;
        }
      }
    }

    const pureDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));
    const finalDistance = Number((actualRoadDistanceMeters / 1000).toFixed(2));
    let distanceText = "0 km";
    if (pureDistanceKm >= 1.0) {
      distanceText = `${pureDistanceKm.toFixed(2)} km`;
    } else if (totalDistanceMeters > 0) {
      distanceText = `${Math.round(totalDistanceMeters)} m`;
    }

    const avgMovingSpeed = movingSpeeds.length > 0
      ? Math.round(movingSpeeds.reduce((a, b) => a + b, 0) / movingSpeeds.length)
      : 0;

    const totalHaltMinutes = halts.reduce((sum, h) => sum + h.durationMinutes, 0);
    const movingMinutes = Math.max(0, totalDayMinutes - totalHaltMinutes);

    return res.status(200).json({
      success: true,
      data: {
        trail: finalTrail,
        cleanTrail: cleanTrail, // Pure filtered GPS trail without OSRM artificial detours
        roadTrail: finalTrail,
        rawSensorPoints: cleanTrail,
        isStationaryAllDay: false,
        rawCount: rawTrail.length,
        cleanCount: cleanTrail.length,
        totalPoints: rawTrail.length,
        distanceKm: pureDistanceKm,
        pureDistanceKm: pureDistanceKm,
        roadDistanceKm: finalDistance,
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

/**
 * @desc Get Daily/Period Tracking Allowance Report with verified GPS KM & amounts
 * @route GET /api/locations/allowance
 */
const getTrackingAllowanceReport = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date, startDate, endDate, employeeId, status } = req.query;

    const company = await Company.findById(companyId).lean();
    const defaultRate = company?.settings?.travelAllowanceRatePerKm || 4.0;
    const twoWheelerRate = company?.settings?.travelAllowanceTwoWheelerRate || defaultRate;
    const fourWheelerRate = company?.settings?.travelAllowanceFourWheelerRate || 8.0;

    // Determine target date range
    let queryStartDate, queryEndDate;
    if (startDate && endDate) {
      queryStartDate = startDate;
      queryEndDate = endDate;
    } else {
      const targetDate = date || new Date().toISOString().slice(0, 10);
      queryStartDate = targetDate;
      queryEndDate = targetDate;
    }

    // Build employees filter
    const empFilter = { companyId, status: "active" };
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      empFilter._id = employeeId;
    }

    const employees = await Employee.find(empFilter)
      .select("_id firstName lastName fullName email employeeCode designationName departmentName designation department photo avatar isLocationTrackingEnabled vehicleType")
      .lean();

    const empIds = employees.map((e) => e._id);

    // Fetch existing TrackingAllowance records in date range
    const savedRecords = await TrackingAllowance.find({
      companyId,
      employeeId: { $in: empIds },
      date: { $gte: queryStartDate, $lte: queryEndDate },
    }).lean();

    const savedMap = new Map();
    savedRecords.forEach((rec) => {
      savedMap.set(`${rec.employeeId.toString()}_${rec.date}`, rec);
    });

    // Date loop
    const dates = [];
    let curr = new Date(queryStartDate);
    const stop = new Date(queryEndDate);
    while (curr <= stop) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }

    const reportRows = [];
    let totalFleetKm = 0;
    let totalFleetPayable = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    for (const d of dates) {
      const startOfDay = new Date(`${d}T00:00:00.000Z`);
      const endOfDay = new Date(`${d}T23:59:59.999Z`);

      // Fetch location points for this date
      const locations = await EmployeeLocation.find({
        companyId,
        employeeId: { $in: empIds },
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ timestamp: 1 })
        .lean();

      // Group points by employeeId
      const empPointsMap = new Map();
      locations.forEach((pt) => {
        const idStr = pt.employeeId.toString();
        if (!empPointsMap.has(idStr)) empPointsMap.set(idStr, []);
        empPointsMap.get(idStr).push(pt);
      });

      for (const emp of employees) {
        const idStr = emp._id.toString();
        const key = `${idStr}_${d}`;
        const saved = savedMap.get(key);

        // Calculate GPS distance
        const pts = empPointsMap.get(idStr) || [];
        let distanceMeters = 0;
        if (pts.length >= 2) {
          let lastAcc = pts[0];
          for (let i = 1; i < pts.length; i++) {
            const cur = pts[i];
            const dist = getHaversineDistanceMeters(lastAcc.latitude, lastAcc.longitude, cur.latitude, cur.longitude);
            const dtSeconds = Math.max(1, (new Date(cur.timestamp) - new Date(lastAcc.timestamp)) / 1000);
            const speedKmh = (dist / dtSeconds) * 3.6;

            if (speedKmh > 130 && dist > 300) continue;
            const reportedSpeed = (cur.speed || 0) * 3.6;
            if (dist < 8 && reportedSpeed < 2.5) continue;

            distanceMeters += dist;
            lastAcc = cur;
          }
        }
        if (distanceMeters < 25) distanceMeters = 0;

        const calculatedKm = Number((distanceMeters / 1000).toFixed(2));
        const distanceKm = saved ? saved.distanceKm : calculatedKm;
        const vehicleType = saved?.vehicleType || emp.vehicleType || "two_wheeler";
        const ratePerKm = saved?.ratePerKm || (vehicleType === "four_wheeler" ? fourWheelerRate : twoWheelerRate);
        const totalAmount = saved ? saved.totalAmount : Number((distanceKm * ratePerKm).toFixed(2));
        const currentStatus = saved ? saved.status : "pending";

        // Filter by status if requested
        if (status && status !== "all" && currentStatus !== status) {
          continue;
        }

        totalFleetKm += distanceKm;
        totalFleetPayable += totalAmount;
        if (currentStatus === "approved") approvedCount++;
        else pendingCount++;

        const empName =
          emp.fullName ||
          [emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
          emp.email ||
          "Employee";
        const empAvatar = emp.photo || emp.avatar || null;
        const empDesignation = emp.designationName || emp.designation || "Staff";
        const empDepartment = emp.departmentName || emp.department || "General";

        reportRows.push({
          _id: saved?._id || `${idStr}_${d}`,
          employeeId: emp._id,
          name: empName,
          employeeCode: emp.employeeCode || "",
          designation: empDesignation,
          department: empDepartment,
          avatar: empAvatar,
          date: d,
          distanceKm: distanceKm,
          distanceMeters: Math.round(distanceMeters),
          ratePerKm: ratePerKm,
          totalAmount: totalAmount,
          vehicleType: vehicleType,
          status: currentStatus,
          approvedAt: saved?.approvedAt || null,
          remarks: saved?.remarks || "",
          isSaved: Boolean(saved),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRows: reportRows.length,
          totalDistanceKm: Number(totalFleetKm.toFixed(2)),
          totalPayableAmount: Number(totalFleetPayable.toFixed(2)),
          approvedCount,
          pendingCount,
          defaultRate,
          twoWheelerRate,
          fourWheelerRate,
          queryStartDate,
          queryEndDate,
        },
        records: reportRows,
      },
    });
  } catch (error) {
    console.error("[LocationTracking] Allowance report error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate tracking allowance report" });
  }
};

/**
 * @desc Update Company Travel Allowance Rate per KM
 * @route POST /api/locations/allowance/rate
 */
const updateTrackingAllowanceRate = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { ratePerKm, twoWheelerRate, fourWheelerRate } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    if (!company.settings) company.settings = {};
    if (ratePerKm !== undefined) company.settings.travelAllowanceRatePerKm = Number(ratePerKm);
    if (twoWheelerRate !== undefined) company.settings.travelAllowanceTwoWheelerRate = Number(twoWheelerRate);
    if (fourWheelerRate !== undefined) company.settings.travelAllowanceFourWheelerRate = Number(fourWheelerRate);

    await company.save();

    return res.status(200).json({
      success: true,
      message: "Travel allowance rates updated successfully",
      data: {
        ratePerKm: company.settings.travelAllowanceRatePerKm,
        twoWheelerRate: company.settings.travelAllowanceTwoWheelerRate,
        fourWheelerRate: company.settings.travelAllowanceFourWheelerRate,
      },
    });
  } catch (error) {
    console.error("[LocationTracking] Update allowance rate error:", error);
    return res.status(500).json({ success: false, message: "Failed to update allowance rate" });
  }
};

/**
 * @desc Approve or Reject Tracking Allowance claims
 * @route POST /api/locations/allowance/status
 */
const updateAllowanceStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { items, status, remarks } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No allowance items provided" });
    }

    const validStatus = ["approved", "rejected", "pending"].includes(status) ? status : "approved";
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { companyId, employeeId: item.employeeId, date: item.date },
        update: {
          $set: {
            companyId,
            employeeId: item.employeeId,
            date: item.date,
            distanceKm: Number(item.distanceKm || 0),
            ratePerKm: Number(item.ratePerKm || 4),
            totalAmount: Number(item.totalAmount || (item.distanceKm * item.ratePerKm) || 0),
            vehicleType: item.vehicleType || "two_wheeler",
            status: validStatus,
            approvedBy: validStatus === "approved" ? userId : null,
            approvedAt: validStatus === "approved" ? new Date() : null,
            remarks: remarks || item.remarks || "",
          },
        },
        upsert: true,
      },
    }));

    await TrackingAllowance.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${items.length} allowance record(s) to ${validStatus}`,
    });
  } catch (error) {
    console.error("[LocationTracking] Update allowance status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update allowance status" });
  }
};

module.exports = {
  syncBatchLocations,
  getLiveEmployeeLocations,
  getEmployeeLocationTrail,
  getTrackingAllowanceReport,
  updateTrackingAllowanceRate,
  updateAllowanceStatus,
};

