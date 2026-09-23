const EmployeeLocation = require("../models/EmployeeLocation");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Company = require("../models/Company");
const CompanyAttendanceSettings = require("../models/CompanyAttendanceSettings");
const Branch = require("../models/Branch");
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
 * Calculate true travel distance from GPS points, filtering out stationary jitter (odometer creep).
 * If all points remain within stationary radius (< 75m), returns 0 meters.
 */
const calculateTrueGpsDistanceMeters = (pts) => {
  if (!Array.isArray(pts) || pts.length < 2) return 0;

  // 1. High-accuracy GPS filter (allows standard smartphone GPS fixes <= 70m)
  const accuratePts = pts.filter((p) => !p.accuracy || Number(p.accuracy) <= 70);
  const candidatePts = accuratePts.length >= 2 ? accuratePts : pts;
  if (candidatePts.length < 2) return 0;

  // 2. Excursion / Teleportation Filter: Suppress points that jump out and snap back within 90s
  const cleaned = [candidatePts[0]];
  for (let i = 1; i < candidatePts.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const cur = candidatePts[i];
    const distFromPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    const dt = Math.max(1, (new Date(cur.timestamp) - new Date(prev.timestamp)) / 1000);
    const speed = (distFromPrev / dt) * 3.6;

    let isExcursion = false;
    if (distFromPrev > 35) {
      for (let look = 1; look <= 45 && i + look < candidatePts.length; look++) {
        const next = candidatePts[i + look];
        const dtNext = (new Date(next.timestamp) - new Date(cur.timestamp)) / 1000;
        if (dtNext > 90) break;
        const distToPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
        if (distToPrev < 35) {
          isExcursion = true;
          break;
        }
      }
    }

    if (isExcursion || speed > 100) continue;
    cleaned.push(cur);
  }

  if (cleaned.length < 2) return 0;

  // 3. Spatial Displacement Check: If user stayed within premise radius (< 120m), return 0
  const origin = cleaned[0];
  let maxDisp = 0;
  let minLat = origin.latitude;
  let maxLat = origin.latitude;
  let minLng = origin.longitude;
  let maxLng = origin.longitude;

  for (const pt of cleaned) {
    const d = getHaversineDistanceMeters(origin.latitude, origin.longitude, pt.latitude, pt.longitude);
    if (d > maxDisp) maxDisp = d;
    if (pt.latitude < minLat) minLat = pt.latitude;
    if (pt.latitude > maxLat) maxLat = pt.latitude;
    if (pt.longitude < minLng) minLng = pt.longitude;
    if (pt.longitude > maxLng) maxLng = pt.longitude;
  }

  const boundingDiag = getHaversineDistanceMeters(minLat, minLng, maxLat, maxLng);

  // If user stayed at the same premises/office location (< 180m):
  if (maxDisp < 180 && boundingDiag < 300) {
    return 0;
  }

  // 4. True road travel calculation (Anchor-based stationary deadband = 90m)
  let totalDistMeters = 0;
  let anchor = cleaned[0];
  let isMoving = false;
  let lastMovingPt = anchor;

  for (let i = 1; i < cleaned.length; i++) {
    const cur = cleaned[i];
    const distFromAnchor = getHaversineDistanceMeters(anchor.latitude, anchor.longitude, cur.latitude, cur.longitude);
    const distFromLast = getHaversineDistanceMeters(lastMovingPt.latitude, lastMovingPt.longitude, cur.latitude, cur.longitude);
    const dtSec = Math.max(1, (new Date(cur.timestamp) - new Date(lastMovingPt.timestamp)) / 1000);
    const impliedSpeed = (distFromLast / dtSec) * 3.6;
    const sensorSpeed = (Number(cur.speed) || 0) * 3.6;
    const effSpeed = Math.max(sensorSpeed, impliedSpeed);

    if (!isMoving) {
      if (distFromAnchor >= 90 && effSpeed >= 6.0) {
        isMoving = true;
        if (impliedSpeed <= 100) {
          totalDistMeters += distFromAnchor;
          lastMovingPt = cur;
        }
        anchor = cur;
      }
    } else {
      if (impliedSpeed > 100 && distFromLast > 150) continue;
      if (distFromAnchor < 40 && effSpeed < 3.0) {
        isMoving = false;
        anchor = cur;
      } else if (distFromLast >= 25) {
        totalDistMeters += distFromLast;
        lastMovingPt = cur;
        anchor = cur;
      }
    }
  }

  return totalDistMeters < 150 ? 0 : Math.round(totalDistMeters);
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

    // ── Enforce Duty Hours Only (Tracking valid ONLY when actively punched in today; stops on Punch Out or 12:00 AM) ──
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
      // Duty ended or employee not punched in today: Deactivate tracking and do NOT record points
      await Employee.findByIdAndUpdate(employeeId, {
        $set: {
          "lastLocation.isTrackingActive": false,
        },
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        trackingAllowed: false,
        hasPunchedOut: Boolean(hasPunchedOut) || !hasPunchedIn,
        hasPunchedIn: Boolean(hasPunchedIn),
        message: hasPunchedOut
          ? "Duty ended (punched out). Location tracking is stopped."
          : "Duty inactive / not punched in for today. Location tracking remains OFF.",
        syncedCount: 0,
      });
    }

    // Filter and sanitize valid points
    const validPoints = [];
    for (const pt of locations) {
      const lat = Number(pt.latitude);
      const lng = Number(pt.longitude);
      const acc = Number(pt.accuracy) || 0;

      // Drop coarse network / cell-tower fixes (> 70m)
      if (acc > 70) {
        continue;
      }

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
        const hasAccess = Boolean(
          ownEmp.isLocationTrackingEnabled ||
          (Array.isArray(ownEmp.assignedModules) && ownEmp.assignedModules.some((m) => ["location", "locationtracking", "location_tracking", "tracking"].includes(String(m).toLowerCase()))) ||
          req.user.isLocationTrackingEnabled ||
          req.user.employee?.isLocationTrackingEnabled ||
          req.user.permissions?.locationTracking === true ||
          req.user.permissions?.location === true
        );
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: "Location tracking access is not enabled for your account" });
        }
        employeeQuery._id = ownEmp._id;
      } else {
        return res.status(404).json({ success: false, message: "Employee profile not found" });
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
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayIst = yesterdayDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const yesterdayUtc = yesterdayDate.toISOString().slice(0, 10);

    // 1. Fetch today's attendance records to know punch status (In/Out)
    // Also fetch Company Attendance Settings, Branches and Company info to resolve office location
    const [attendances, attSettings, branches, companyDoc] = await Promise.all([
      Attendance.find({
        employeeId: { $in: employeeIds },
        date: { $in: [todayIst, todayUtc] },
      }).sort({ createdAt: 1 }).lean(),
      CompanyAttendanceSettings.findOne({ companyId }).lean().catch(() => null),
      Branch.find({ companyId, status: "active" }).lean().catch(() => []),
      Company.findById(companyId).select("companyName address city state pincode").lean().catch(() => null),
    ]);

    let officeLocation = null;
    if (attSettings && attSettings.latitude && attSettings.longitude) {
      officeLocation = {
        name: attSettings.officeName || "Main Office",
        latitude: Number(attSettings.latitude),
        longitude: Number(attSettings.longitude),
        address: companyDoc?.address || "",
        radius: attSettings.allowedRadiusMeters || 100,
      };
    } else if (Array.isArray(branches) && branches.length > 0) {
      const branchWithCoords = branches.find((b) => b.latitude && b.longitude);
      if (branchWithCoords) {
        officeLocation = {
          name: branchWithCoords.branchName || "Main Branch",
          latitude: Number(branchWithCoords.latitude),
          longitude: Number(branchWithCoords.longitude),
          address: branchWithCoords.address || companyDoc?.address || "",
          radius: branchWithCoords.allowedRadiusMeters || 100,
        };
      }
    }

    const attendanceMap = new Map();
    attendances.forEach((att) => {
      attendanceMap.set(att.employeeId.toString(), att);
    });


    // 2. Fetch today's continuous GPS trail history from EmployeeLocation for stoppage duration calculation
    // Calculate exact start of today in IST (UTC+5:30) to NEVER leak yesterday's points into today's travel!
    const [y, m, d] = todayIst.split("-").map(Number);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const startOfTodayIst = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - istOffsetMs);
    const endOfTodayIst = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - istOffsetMs);

    const recentLocationAgg = await EmployeeLocation.aggregate([
      {
        $match: {
          employeeId: { $in: employeeIds },
          timestamp: { $gte: startOfTodayIst, $lte: endOfTodayIst },
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
      const empIdStr = item._id.toString();
      const allPts = Array.isArray(item.allPoints) ? item.allPoints : [];
      const att = attendanceMap.get(empIdStr);

      let todayDistanceMeters = 0;
      // Duty distance must ONLY be calculated if employee has punched in today
      // and only on points recorded on or after punchInTime!
      if (att && att.punchInTime) {
        const punchInMs = new Date(att.punchInTime).getTime();
        let dutyPts = allPts.filter((p) => new Date(p.timestamp).getTime() >= punchInMs);
        if (att.punchOutTime) {
          const punchOutMs = new Date(att.punchOutTime).getTime();
          dutyPts = dutyPts.filter((p) => new Date(p.timestamp).getTime() <= punchOutMs);
        }
        todayDistanceMeters = calculateTrueGpsDistanceMeters(dutyPts);
      } else {
        todayDistanceMeters = 0;
      }

      const todayDistanceKm = Number((todayDistanceMeters / 1000).toFixed(2));
      let todayDistanceText = "0 km";
      if (todayDistanceKm >= 1.0) {
        todayDistanceText = `${todayDistanceKm.toFixed(2)} km`;
      } else if (todayDistanceMeters > 0) {
        todayDistanceText = `${Math.round(todayDistanceMeters)} m`;
      }

      locHistoryMap.set(empIdStr, {
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
      } else if (lastLoc.latitude && lastLoc.longitude) {
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

      // ── Determine Tracking Status: "active" (चालू) | "stopped" (बंद) | "no_signal" ──
      // Rules:
      // 1. Employee tracking stays ACTIVE (चालू) as long as they are punched in and haven't punched out.
      // 2. Automatically stops when employee punches out.
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
      } else if (!latitude || !lastUpdated) {
        trackingStatus = "no_signal";
        trackingStatusLabel = "Waiting for GPS Signal";
        trackingStatusColor = "slate";
        isOnline = false;
      } else {
        // Employee is on duty (punched in & not punched out):
        // Tracking stays ACTIVE (चालू)!
        trackingStatus = "active";
        trackingStatusLabel = "Live Tracking Active (चालू)";
        trackingStatusColor = "emerald";
        isOnline = true;
      }

      // ── Calculate Stoppage / Halt Duration (तो स्टाफ किती वेळ झाला तिथे थांबलाय) ──
      let motionStatus = "off_duty"; // "moving" | "stationary" | "off_duty"
      let stoppageDurationMinutes = 0;
      let stoppageText = "";
      let stoppedSince = null;

      if (trackingStatus === "active" && latitude && longitude) {
        const isMoving = speed > 3.0;

        if (isMoving) {
          motionStatus = "moving";
          stoppageDurationMinutes = 0;
          stoppageText = `Moving (${Math.round(speed)} km/h)`;
          stoppedSince = null;
        } else {
          motionStatus = "stationary";
          let stoppageStartTime = new Date(lastUpdated || now);

          // Stoppage duration can never exceed today's punchIn duration
          if (todayAtt && todayAtt.punchInTime) {
            const punchInMs = new Date(todayAtt.punchInTime).getTime();
            if (stoppageStartTime.getTime() < punchInMs) {
              stoppageStartTime = new Date(punchInMs);
            }
          }

          // Trace backward through recent GPS trail to find exact arrival time at this spot
          const trail = locData?.trail || [];
          if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
              const pt = trail[i];
              const dist = getHaversineDistanceMeters(latitude, longitude, pt.latitude, pt.longitude);
              // Within 65m GPS jitter and walking/stopped speed <= 3.5 km/h
              if (dist <= 65 && (pt.speed || 0) <= 3.5) {
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
        todayDistanceKm: todayAtt && todayAtt.punchInTime ? locData?.todayDistanceKm || 0 : 0,
        todayDistanceMeters: todayAtt && todayAtt.punchInTime ? locData?.todayDistanceMeters || 0 : 0,
        todayDistanceText: todayAtt && todayAtt.punchInTime ? locData?.todayDistanceText || "0 km" : "0 km",
        attendanceStatus: todayAtt ? todayAtt.status : "absent",
        punchInTime: todayAtt ? todayAtt.punchInTime : null,
        punchOutTime: todayAtt ? todayAtt.punchOutTime : null,
        isLocationTrackingEnabled: Boolean(emp.isLocationTrackingEnabled),
        displayLocation: latitude && longitude ? address || "Current Location" : (officeLocation ? `${officeLocation.name} (Office)` : "NA"),
        displayAddress: address || (officeLocation ? officeLocation.address : "NA"),
        officeLocation: officeLocation,
      };
    });

    return res.status(200).json({
      success: true,
      officeLocation: officeLocation,
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
 * Get road path between two GPS coordinates using OpenStreetMap routing (bike/driving/foot)
 * Follows actual streets and lane turns instead of cutting straight through buildings
 */
async function getRoadPathBetweenPoints(pt1, pt2) {
  try {
    const start = `${pt1.longitude || pt1.lng},${pt1.latitude || pt1.lat}`;
    const end = `${pt2.longitude || pt2.lng},${pt2.latitude || pt2.lat}`;

    for (const profile of ["bike", "driving", "foot"]) {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.code === "Ok" && data.routes && data.routes[0]?.geometry?.coordinates?.length >= 2) {
          const coords = data.routes[0].geometry.coordinates.map((c) => ({
            latitude: c[1],
            longitude: c[0],
          }));
          return {
            points: coords,
            distanceMeters: Number(data.routes[0].distance) || 0,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[LocationTracking] Road routing segment notice:", err.message);
  }
  return null;
}

/**
 * Route GPS trail segments along actual road network
 * Replaces straight diagonal lines that cut through buildings with real road paths
 */
async function alignTrailToRoadNetwork(cleanPoints) {
  if (!Array.isArray(cleanPoints) || cleanPoints.length < 2) return { trail: cleanPoints, distanceMeters: 0 };

  const roadTrail = [];
  let totalRoadDistance = 0;

  for (let i = 0; i < cleanPoints.length - 1; i++) {
    const p1 = cleanPoints[i];
    const p2 = cleanPoints[i + 1];
    const straightDist = getHaversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

    if (straightDist < 25) {
      if (roadTrail.length === 0) roadTrail.push(p1);
      roadTrail.push(p2);
      totalRoadDistance += straightDist;
    } else {
      const roadPath = await getRoadPathBetweenPoints(p1, p2);
      if (roadPath && Array.isArray(roadPath.points) && roadPath.points.length >= 2) {
        if (roadTrail.length === 0) {
          roadTrail.push(...roadPath.points);
        } else {
          roadTrail.push(...roadPath.points.slice(1));
        }
        totalRoadDistance += roadPath.distanceMeters;
      } else {
        if (roadTrail.length === 0) roadTrail.push(p1);
        roadTrail.push(p2);
        totalRoadDistance += straightDist;
      }
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

    let targetEmployeeId = employeeId;
    const isEmployee = req.user.role === "Employee" || req.user.role === "employee";
    if (isEmployee) {
      const ownEmp = await Employee.findOne({
        companyId,
        $or: [{ userId: req.user._id }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
      });
      if (!ownEmp) {
        return res.status(404).json({ success: false, message: "Employee profile not found" });
      }
      const hasAccess = Boolean(
        ownEmp.isLocationTrackingEnabled ||
        (Array.isArray(ownEmp.assignedModules) && ownEmp.assignedModules.some((m) => ["location", "locationtracking", "location_tracking", "tracking"].includes(String(m).toLowerCase()))) ||
        req.user.isLocationTrackingEnabled ||
        req.user.employee?.isLocationTrackingEnabled ||
        req.user.permissions?.locationTracking === true ||
        req.user.permissions?.location === true
      );
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Location tracking access is not enabled for your account" });
      }
      // For Employee role, always safely scope to their own Employee record
      targetEmployeeId = ownEmp._id;
    }

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
      employeeId: new mongoose.Types.ObjectId(targetEmployeeId.toString()),
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ timestamp: 1 })
      .select("latitude longitude accuracy speed heading batteryLevel timestamp address")
      .lean();

    if (rawTrail.length === 0) {
      const [attSettings, branches, companyDoc] = await Promise.all([
        CompanyAttendanceSettings.findOne({ companyId }).lean().catch(() => null),
        Branch.find({ companyId, status: "active" }).lean().catch(() => []),
        Company.findById(companyId).select("companyName address city state pincode").lean().catch(() => null),
      ]);

      let officeLocation = null;
      if (attSettings && attSettings.latitude && attSettings.longitude) {
        officeLocation = {
          name: attSettings.officeName || "Main Office",
          latitude: Number(attSettings.latitude),
          longitude: Number(attSettings.longitude),
          address: companyDoc?.address || "",
          radius: attSettings.allowedRadiusMeters || 100,
        };
      } else if (Array.isArray(branches) && branches.length > 0) {
        const branchWithCoords = branches.find((b) => b.latitude && b.longitude);
        if (branchWithCoords) {
          officeLocation = {
            name: branchWithCoords.branchName || "Main Branch",
            latitude: Number(branchWithCoords.latitude),
            longitude: Number(branchWithCoords.longitude),
            address: branchWithCoords.address || companyDoc?.address || "",
            radius: branchWithCoords.allowedRadiusMeters || 100,
          };
        }
      }

      return res.status(200).json({
        success: true,
        officeLocation: officeLocation,
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

    // 1. GPS filter: hardware GPS provides accuracy <= 70m.
    const validPoints = rawTrail.filter((p) => !p.accuracy || Number(p.accuracy) <= 70);
    let candidatePoints = validPoints.length >= 2 ? validPoints : rawTrail;
    if (candidatePoints.length < 2) candidatePoints = rawTrail;

    // 1b. Discard cold-start cell-tower glitch at point[0]:
    // When an employee opens the app indoors, Android often returns a stale cell-tower position (200m-800m away)
    // before true GPS locks on at the actual starting location.
    if (candidatePoints.length >= 3) {
      const p0 = candidatePoints[0];
      const p1 = candidatePoints[1];
      const p2 = candidatePoints[2];
      const jump01 = getHaversineDistanceMeters(p0.latitude, p0.longitude, p1.latitude, p1.longitude);
      const cluster12 = getHaversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

      if (jump01 > 120 && cluster12 < 80) {
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

      if (jumpTail > 120 && clusterPrev < 80) {
        candidatePoints = candidatePoints.slice(0, -1);
      }
    }

    // 1d. Multi-point Outlier, Teleport Jump & Excursion Filter:
    // Discards points that jump off-road into buildings, impossible speed jumps, or temporary excursions
    if (candidatePoints.length >= 3) {
      const filtered = [candidatePoints[0]];
      for (let i = 1; i < candidatePoints.length; i++) {
        const prev = filtered[filtered.length - 1];
        const cur = candidatePoints[i];

        const dist = getHaversineDistanceMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
        const dt = Math.max(0.5, (new Date(cur.timestamp) - new Date(prev.timestamp)) / 1000);
        const speed = (dist / dt) * 3.6;

        // Reject impossible speed jumps (> 75 km/h for city street travel if jump > 35m)
        if (speed > 75 && dist > 35) {
          if (i + 1 < candidatePoints.length) {
            const next = candidatePoints[i + 1];
            const distPrevNext = getHaversineDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
            const dtNext = Math.max(0.5, (new Date(next.timestamp) - new Date(prev.timestamp)) / 1000);
            const speedPrevNext = (distPrevNext / dtNext) * 3.6;
            if (speedPrevNext <= 70) {
              console.log(`[TrailFilter] Suppressed impossible speed jump: ${dist.toFixed(1)}m in ${dt.toFixed(1)}s (${speed.toFixed(0)} km/h)`);
              continue;
            }
          }
        }

        // Teleport jump filter (> 200m jump where speed > 70 km/h)
        if (dist > 200 && speed > 70) {
          console.log(`[TrailFilter] Suppressed teleport jump: ${dist.toFixed(1)}m in ${dt.toFixed(1)}s (${speed.toFixed(0)} km/h)`);
          continue;
        }

        // Excursion loop filter: look ahead up to 45 points or 90s to see if path jumps away and returns
        let isExcursion = false;
        if (dist > 35) {
          for (let look = 1; look <= 45 && i + look < candidatePoints.length; look++) {
            const future = candidatePoints[i + look];
            const dtFuture = Math.max(1, (new Date(future.timestamp) - new Date(cur.timestamp)) / 1000);
            if (dtFuture > 90) break;
            const distFuture = getHaversineDistanceMeters(prev.latitude, prev.longitude, future.latitude, future.longitude);

            if (dist > 35 && distFuture < 35) {
              isExcursion = true;
              break;
            }
          }
        }
        if (isExcursion) {
          console.log(`[TrailFilter] Suppressed building excursion point: ${cur.latitude}, ${cur.longitude}`);
          continue;
        }

        filtered.push(cur);
      }
      if (filtered.length >= 2) {
        candidatePoints = filtered;
      }
    }

    // Fetch Attendance record to check punchInLocation
    const targetDateStr = date && typeof date === "string" && date.includes("-")
      ? date
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const attendanceRecord = await Attendance.findOne({
      employeeId: new mongoose.Types.ObjectId(targetEmployeeId.toString()),
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      date: targetDateStr,
    }).select("punchInTime punchOutTime punchInLocation").lean().catch(() => null);

    let punchInCoord = candidatePoints[0];
    if (attendanceRecord?.punchInLocation?.latitude && attendanceRecord?.punchInLocation?.longitude) {
      const punchLat = Number(attendanceRecord.punchInLocation.latitude);
      const punchLng = Number(attendanceRecord.punchInLocation.longitude);
      // Only trust punchInLocation if it is in the same vicinity (<= 1000m) of recorded GPS
      if (getHaversineDistanceMeters(punchLat, punchLng, candidatePoints[0].latitude, candidatePoints[0].longitude) <= 1000) {
        punchInCoord = { latitude: punchLat, longitude: punchLng };
      }
    }

    const firstTime = new Date(candidatePoints[0].timestamp);
    const lastTime = new Date(candidatePoints[candidatePoints.length - 1].timestamp);
    const totalDayMinutes = Math.max(1, Math.round((lastTime - firstTime) / 60000));

    // 2. Spatial Displacement Check: Detect if employee stayed at the same location after Punch In
    let maxDisplacementFromStart = 0;
    let minLat = candidatePoints[0].latitude;
    let maxLat = candidatePoints[0].latitude;
    let minLng = candidatePoints[0].longitude;
    let maxLng = candidatePoints[0].longitude;

    for (const pt of candidatePoints) {
      const d = getHaversineDistanceMeters(punchInCoord.latitude, punchInCoord.longitude, pt.latitude, pt.longitude);
      if (d > maxDisplacementFromStart) maxDisplacementFromStart = d;
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLng) minLng = pt.longitude;
      if (pt.longitude > maxLng) maxLng = pt.longitude;
    }

    const boundingDiagonalMeters = getHaversineDistanceMeters(minLat, minLng, maxLat, maxLng);

    // If employee stayed at the same location (all points within stationary/premise radius):
    if (maxDisplacementFromStart < 180 && boundingDiagonalMeters < 300) {
      const basePoint = candidatePoints[0];
      return res.status(200).json({
        success: true,
        data: {
          trail: [basePoint],
          cleanTrail: [basePoint],
          roadTrail: [basePoint],
          rawSensorPoints: [basePoint],
          isStationaryAllDay: true,
          rawCount: rawTrail.length,
          cleanCount: 1,
          totalPoints: rawTrail.length,
          distanceKm: 0,
          pureDistanceKm: 0,
          roadDistanceKm: 0,
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

    // ── Build Clean Trail & Detect Real Halts (Anchor-Based Deadband) ──
    const ANCHOR_STATIONARY_RADIUS = 90;
    let anchor = candidatePoints[0];
    const cleanTrail = [anchor];
    const halts = [];
    const movingSpeeds = [];
    let totalDistanceMeters = 0;
    let isMoving = false;
    let lastAcceptedMovingPoint = anchor;
    let maxSpeed = 0;

    let currentHalt = {
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      startTime: anchor.timestamp,
      endTime: anchor.timestamp,
      address: anchor.address || "",
    };

    for (let i = 1; i < candidatePoints.length; i++) {
      const pt = candidatePoints[i];
      const distFromAnchor = getHaversineDistanceMeters(anchor.latitude, anchor.longitude, pt.latitude, pt.longitude);
      const distFromLast = getHaversineDistanceMeters(lastAcceptedMovingPoint.latitude, lastAcceptedMovingPoint.longitude, pt.latitude, pt.longitude);
      const dtSeconds = Math.max(1, (new Date(pt.timestamp) - new Date(lastAcceptedMovingPoint.timestamp)) / 1000);
      const impliedSpeed = (distFromLast / dtSeconds) * 3.6;
      const sensorSpeed = (Number(pt.speed) || 0) * 3.6;
      const effectiveSpeed = Math.max(sensorSpeed, impliedSpeed);

      if (!isMoving) {
        if (distFromAnchor < ANCHOR_STATIONARY_RADIUS && effectiveSpeed < 4.0) {
          currentHalt.endTime = pt.timestamp;
          if (pt.address && !currentHalt.address) currentHalt.address = pt.address;
          continue; // Zero distance added during stationary halt
        }

        // Breakout detected: actual GPS movement initiated
        if (distFromAnchor >= ANCHOR_STATIONARY_RADIUS && effectiveSpeed >= 6.0) {
          isMoving = true;
          const haltMins = Math.round((new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000);
          if (haltMins >= 3) {
            halts.push({
              latitude: currentHalt.latitude,
              longitude: currentHalt.longitude,
              startTime: currentHalt.startTime,
              endTime: currentHalt.endTime,
              durationMinutes: haltMins,
              durationText: formatStoppageDuration(haltMins),
              address: currentHalt.address || "",
            });
          }

          if (impliedSpeed <= 120) {
            totalDistanceMeters += distFromAnchor;
            cleanTrail.push(pt);
            lastAcceptedMovingPoint = pt;
            const validSpeed = sensorSpeed > 0 ? sensorSpeed : impliedSpeed;
            if (validSpeed > 0 && validSpeed <= 120) {
              movingSpeeds.push(validSpeed);
              if (validSpeed > maxSpeed) maxSpeed = validSpeed;
            }
          }
          anchor = pt;
          currentHalt = {
            latitude: pt.latitude,
            longitude: pt.longitude,
            startTime: pt.timestamp,
            endTime: pt.timestamp,
            address: pt.address || "",
          };
        }
      } else {
        // In transit
        if (impliedSpeed > 120 && distFromLast > 250) continue;

        if (distFromAnchor < 45 && effectiveSpeed < 2.5) {
          currentHalt.endTime = pt.timestamp;
          const stopMins = Math.round((new Date(pt.timestamp) - new Date(currentHalt.startTime)) / 60000);
          if (stopMins >= 3) {
            isMoving = false;
            continue;
          }
        } else {
          if (distFromLast >= 15) {
            totalDistanceMeters += distFromLast;
            cleanTrail.push(pt);
            lastAcceptedMovingPoint = pt;
            const validSpeed = sensorSpeed > 0 ? sensorSpeed : (impliedSpeed <= 120 ? impliedSpeed : 0);
            if (validSpeed > 0 && validSpeed <= 120) {
              movingSpeeds.push(validSpeed);
              if (validSpeed > maxSpeed) maxSpeed = validSpeed;
            }
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
      }
    }

    // Check final halt at destination
    const finalHaltMins = Math.round((new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000);
    if (finalHaltMins >= 3 || cleanTrail.length <= 1) {
      halts.push({
        latitude: currentHalt.latitude,
        longitude: currentHalt.longitude,
        startTime: currentHalt.startTime,
        endTime: currentHalt.endTime,
        durationMinutes: Math.max(1, finalHaltMins),
        durationText: formatStoppageDuration(Math.max(1, finalHaltMins)),
        address: currentHalt.address || "",
      });
    }

    if (totalDistanceMeters < 150 || cleanTrail.length <= 1) {
      const basePoint = candidatePoints[0];
      return res.status(200).json({
        success: true,
        data: {
          trail: [basePoint],
          cleanTrail: [basePoint],
          roadTrail: [basePoint],
          rawSensorPoints: [basePoint],
          isStationaryAllDay: true,
          rawCount: rawTrail.length,
          cleanCount: 1,
          totalPoints: rawTrail.length,
          distanceKm: 0,
          pureDistanceKm: 0,
          roadDistanceKm: 0,
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
        cleanCount: finalTrail.length,
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
    if (req.user.role === "Employee" || req.user.role === "employee") {
      const ownEmp = await Employee.findOne({
        companyId,
        $or: [{ userId: req.user._id }, { email: req.user.email ? req.user.email.toLowerCase() : "" }],
      });
      if (!ownEmp) {
        return res.status(404).json({ success: false, message: "Employee profile not found" });
      }
      empFilter._id = ownEmp._id;
    } else if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
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
        const distanceMeters = calculateTrueGpsDistanceMeters(pts);

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
    if (req.user.role === "Employee" || req.user.role === "employee") {
      return res.status(403).json({ success: false, message: "Access denied. Employees cannot modify allowance rates." });
    }
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
    if (req.user.role === "Employee" || req.user.role === "employee") {
      return res.status(403).json({ success: false, message: "Access denied. Employees cannot approve or reject allowance claims." });
    }
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
  alignTrailToRoadNetwork,
  getRoadPathBetweenPoints,
};

