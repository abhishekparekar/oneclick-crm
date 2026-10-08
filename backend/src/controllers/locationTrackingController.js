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
/**
 * Vector angle helper: computes bearing between 2 points in degrees (0-360)
 */
const getBearingDegrees = (lat1, lon1, lat2, lon2) => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Robust GPS Trail Processor & Metrics Engine:
 * 1. High-accuracy & hardware GPS filtering
 * 2. Glitch, teleport & excursion suppression
 * 3. Robust 90th-percentile stationary premise detection (prevents 16+ km false indoor travel)
 * 4. Halt cluster collapsing (prevents green spider-web lines criss-crossing inside buildings)
 * 5. Vector angle anti-oscillation filter for true highway/street transit
 */
const processGpsTrailAndMetrics = (rawPoints) => {
  if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
    const base = rawPoints && rawPoints[0] ? rawPoints[0] : null;
    return {
      isStationaryAllDay: true,
      cleanTrail: base ? [base] : [],
      totalDistanceMeters: 0,
      distanceKm: 0,
      halts: base
        ? [
            {
              latitude: base.latitude,
              longitude: base.longitude,
              startTime: base.timestamp,
              endTime: base.timestamp,
              durationMinutes: 1,
              durationText: "0 mins",
              address: base.address || "",
            },
          ]
        : [],
      haltCount: base ? 1 : 0,
      totalHaltTimeMinutes: 0,
      totalHaltTimeText: "0 mins",
      totalMovingTimeMinutes: 0,
      totalMovingTimeText: "0 mins",
      maxSpeed: 0,
      avgSpeed: 0,
      startLocation: base,
      endLocation: base,
    };
  }

  // 1. Strict Satellite GPS Filter: require direct hardware GPS (accuracy <= 25m, drop cell-tower fixes)
  const highAccPts = rawPoints.filter((p) => p.accuracy && Number(p.accuracy) <= 25);
  let candidatePts =
    highAccPts.length >= Math.max(5, rawPoints.length * 0.2)
      ? highAccPts
      : rawPoints.filter((p) => !p.accuracy || Number(p.accuracy) <= 30);
  if (candidatePts.length < 2) candidatePts = rawPoints;

  // Sort chronologically
  candidatePts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Discard cold-start and tail cell-tower jumps
  if (candidatePts.length >= 3) {
    const p0 = candidatePts[0];
    const p1 = candidatePts[1];
    const p2 = candidatePts[2];
    const jump01 = getHaversineDistanceMeters(p0.latitude, p0.longitude, p1.latitude, p1.longitude);
    const cluster12 = getHaversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    if (jump01 > 100 && cluster12 < 70) {
      candidatePts = candidatePts.slice(1);
    }
  }
  if (candidatePts.length >= 3) {
    const pLast = candidatePts[candidatePts.length - 1];
    const pPrev = candidatePts[candidatePts.length - 2];
    const pPrev2 = candidatePts[candidatePts.length - 3];
    const jumpTail = getHaversineDistanceMeters(pPrev.latitude, pPrev.longitude, pLast.latitude, pLast.longitude);
    const clusterPrev = getHaversineDistanceMeters(pPrev2.latitude, pPrev2.longitude, pPrev.latitude, pPrev.longitude);
    if (jumpTail > 100 && clusterPrev < 70) {
      candidatePts = candidatePts.slice(0, -1);
    }
  }

  // Multi-pass Outlier / Ping-Pong Spike Elimination
  const cleaned = [candidatePts[0]];
  for (let i = 1; i < candidatePts.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const cur = candidatePts[i];
    const distFromPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    const dt = Math.max(0.5, (new Date(cur.timestamp) - new Date(prev.timestamp)) / 1000);
    const speed = (distFromPrev / dt) * 3.6;

    // Reject impossible sudden teleport / jump > 85 km/h in urban streets
    if (speed > 85 && distFromPrev > 35) continue;

    // Ping-pong spike test: point jumps out and subsequent point returns near prev
    let isPingPong = false;
    if (distFromPrev > 35) {
      for (let look = 1; look <= 4 && i + look < candidatePts.length; look++) {
        const next = candidatePts[i + look];
        const distToPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
        const distCurToNext = getHaversineDistanceMeters(cur.latitude, cur.longitude, next.latitude, next.longitude);
        const dtNext = (new Date(next.timestamp) - new Date(cur.timestamp)) / 1000;

        if (distToPrev < Math.max(30, distFromPrev * 0.4) && distCurToNext > 30 && dtNext < 120) {
          isPingPong = true;
          break;
        }
      }
    }
    if (isPingPong) continue;

    cleaned.push(cur);
  }

  if (cleaned.length < 2) {
    const base = cleaned[0] || candidatePts[0];
    return {
      isStationaryAllDay: true,
      cleanTrail: [base],
      totalDistanceMeters: 0,
      distanceKm: 0,
      halts: [
        {
          latitude: base.latitude,
          longitude: base.longitude,
          startTime: base.timestamp,
          endTime: base.timestamp,
          durationMinutes: 1,
          durationText: "0 mins",
          address: base.address || "",
        },
      ],
      haltCount: 1,
      totalHaltTimeMinutes: 0,
      totalHaltTimeText: "0 mins",
      totalMovingTimeMinutes: 0,
      totalMovingTimeText: "0 mins",
      maxSpeed: 0,
      avgSpeed: 0,
      startLocation: base,
      endLocation: base,
    };
  }

  const firstTime = new Date(cleaned[0].timestamp);
  const lastTime = new Date(cleaned[cleaned.length - 1].timestamp);
  const totalDayMinutes = Math.max(1, Math.round((lastTime - firstTime) / 60000));

  // 2. Global Centroid & Dispersion Analysis (Stationary Premises Check)
  let sumLat = 0;
  let sumLng = 0;
  for (const pt of cleaned) {
    sumLat += Number(pt.latitude);
    sumLng += Number(pt.longitude);
  }
  const centerLat = sumLat / cleaned.length;
  const centerLng = sumLng / cleaned.length;

  const distsFromCenter = cleaned.map((pt) =>
    getHaversineDistanceMeters(centerLat, centerLng, pt.latitude, pt.longitude)
  );
  const sortedDists = [...distsFromCenter].sort((a, b) => a - b);
  const p90Dist = sortedDists[Math.floor(sortedDists.length * 0.9)] || 0;
  const p95Dist = sortedDists[Math.floor(sortedDists.length * 0.95)] || 0;

  // Check if there is any true sustained transit trip (at least 3 consecutive points > 110m away from center moving at >= 4 km/h)
  let hasSustainedTrip = false;
  let consecutiveTripPoints = 0;
  for (let i = 1; i < cleaned.length; i++) {
    const pt = cleaned[i];
    const prev = cleaned[i - 1];
    const dCenter = distsFromCenter[i];
    const dPrev = getHaversineDistanceMeters(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
    const dt = Math.max(0.5, (new Date(pt.timestamp) - new Date(prev.timestamp)) / 1000);
    const speed = (dPrev / dt) * 3.6;

    if (dCenter > 110 && speed >= 4.0 && dPrev >= 20) {
      consecutiveTripPoints++;
      if (consecutiveTripPoints >= 3) {
        hasSustainedTrip = true;
        break;
      }
    } else {
      consecutiveTripPoints = 0;
    }
  }

  // If 90%+ points are within 95m of the centroid and no sustained trip occurred: employee was stationary all day!
  if (!hasSustainedTrip && p90Dist <= 95 && p95Dist <= 140) {
    const basePoint = {
      latitude: Number(centerLat.toFixed(6)),
      longitude: Number(centerLng.toFixed(6)),
      timestamp: cleaned[0].timestamp,
      address: cleaned[0].address || "",
    };
    return {
      isStationaryAllDay: true,
      cleanTrail: [basePoint],
      totalDistanceMeters: 0,
      distanceKm: 0,
      halts: [
        {
          latitude: basePoint.latitude,
          longitude: basePoint.longitude,
          startTime: cleaned[0].timestamp,
          endTime: cleaned[cleaned.length - 1].timestamp,
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
      maxSpeed: 0,
      avgSpeed: 0,
      startLocation: basePoint,
      endLocation: basePoint,
    };
  }

  // 3. Multi-Stop State Machine: Halt Cluster Collapsing & Transit Road Generation
  const HALT_RADIUS_METERS = 45;
  const HALT_MIN_MINUTES = 3;
  const BREAKOUT_DIST_METERS = 65;
  const BREAKOUT_MIN_SPEED_KMH = 4.0;

  let mode = "HALT"; // "HALT" | "TRANSIT"
  let currentHalt = {
    centerLat: cleaned[0].latitude,
    centerLng: cleaned[0].longitude,
    startTime: cleaned[0].timestamp,
    endTime: cleaned[0].timestamp,
    address: cleaned[0].address || "",
    count: 1,
  };

  const cleanTrail = [];
  const halts = [];
  const validMovingSpeeds = [];
  let totalDistanceMeters = 0;
  let lastTransitPoint = null;

  for (let i = 1; i < cleaned.length; i++) {
    const pt = cleaned[i];

    if (mode === "HALT") {
      const dCenter = getHaversineDistanceMeters(
        currentHalt.centerLat,
        currentHalt.centerLng,
        pt.latitude,
        pt.longitude
      );
      const dtHaltSec = Math.max(1, (new Date(pt.timestamp) - new Date(currentHalt.endTime)) / 1000);
      const impliedSpeed = (dCenter / dtHaltSec) * 3.6;
      const sensorSpeed = (Number(pt.speed) || 0) * 3.6;
      const effSpeed = Math.max(sensorSpeed, impliedSpeed);

      // Still stationary within halt radius
      if (dCenter <= HALT_RADIUS_METERS || (dCenter <= 65 && effSpeed < 3.5)) {
        currentHalt.endTime = pt.timestamp;
        currentHalt.centerLat =
          (currentHalt.centerLat * currentHalt.count + pt.latitude) / (currentHalt.count + 1);
        currentHalt.centerLng =
          (currentHalt.centerLng * currentHalt.count + pt.longitude) / (currentHalt.count + 1);
        currentHalt.count++;
        if (pt.address && !currentHalt.address) currentHalt.address = pt.address;
        continue; // Absorb jitter points into halt centroid: ZERO internal lines!
      }

      // Breakout check: user started moving away from the halt
      let isConfirmedBreakout = true;
      if (i + 1 < cleaned.length) {
        const nextPt = cleaned[i + 1];
        const dNextToHalt = getHaversineDistanceMeters(
          currentHalt.centerLat,
          currentHalt.centerLng,
          nextPt.latitude,
          nextPt.longitude
        );
        if (dNextToHalt < 40) {
          isConfirmedBreakout = false;
        }
      }

      if (dCenter >= BREAKOUT_DIST_METERS && effSpeed >= BREAKOUT_MIN_SPEED_KMH && isConfirmedBreakout) {
        // Finalize completed halt
        const haltMins = Math.round(
          (new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000
        );
        if (haltMins >= HALT_MIN_MINUTES) {
          halts.push({
            latitude: Number(currentHalt.centerLat.toFixed(6)),
            longitude: Number(currentHalt.centerLng.toFixed(6)),
            startTime: currentHalt.startTime,
            endTime: currentHalt.endTime,
            durationMinutes: haltMins,
            durationText: formatStoppageDuration(haltMins),
            address: currentHalt.address || "",
          });
        }

        // Add single halt departure waypoint
        const haltAnchor = {
          latitude: Number(currentHalt.centerLat.toFixed(6)),
          longitude: Number(currentHalt.centerLng.toFixed(6)),
          timestamp: currentHalt.endTime,
          address: currentHalt.address || "",
        };
        cleanTrail.push(haltAnchor);

        // Switch to TRANSIT
        mode = "TRANSIT";
        cleanTrail.push(pt);
        totalDistanceMeters += dCenter;
        lastTransitPoint = pt;

        if (effSpeed >= 3 && effSpeed <= 85) {
          validMovingSpeeds.push(effSpeed);
        }
      }
    } else {
      // In TRANSIT mode
      const distFromLast = getHaversineDistanceMeters(
        lastTransitPoint.latitude,
        lastTransitPoint.longitude,
        pt.latitude,
        pt.longitude
      );
      const dtSec = Math.max(0.5, (new Date(pt.timestamp) - new Date(lastTransitPoint.timestamp)) / 1000);
      const impliedSpeed = (distFromLast / dtSec) * 3.6;
      const sensorSpeed = (Number(pt.speed) || 0) * 3.6;
      const effSpeed = Math.max(sensorSpeed, impliedSpeed);

      if (impliedSpeed > 85 && distFromLast > 40) continue; // Outlier skip

      // Check if entering a new halt (slowed down and stopping)
      let isStopping = false;
      if (effSpeed < 3.2 && distFromLast < 40) {
        let stayNearCount = 0;
        let lookMins = 0;
        for (let look = 1; look <= 12 && i + look < cleaned.length; look++) {
          const future = cleaned[i + look];
          const dFut = getHaversineDistanceMeters(pt.latitude, pt.longitude, future.latitude, future.longitude);
          const dtFut = (new Date(future.timestamp) - new Date(pt.timestamp)) / 60000;
          if (dFut < 45) stayNearCount++;
          lookMins = dtFut;
          if (dtFut >= 2.0) break;
        }
        if (stayNearCount >= 3 || lookMins >= 2.0) {
          isStopping = true;
        }
      }

      if (isStopping) {
        mode = "HALT";
        currentHalt = {
          centerLat: pt.latitude,
          centerLng: pt.longitude,
          startTime: pt.timestamp,
          endTime: pt.timestamp,
          address: pt.address || "",
          count: 1,
        };
        cleanTrail.push(pt);
        lastTransitPoint = pt;
        continue;
      }

      if (distFromLast < 15) continue; // Skip sub-15m micro-steps

      // Anti-spiderweb oscillation filter: suppress rapid 180° back-and-forth ping-pong jumps
      if (cleanTrail.length >= 2 && distFromLast < 55) {
        const prevAnchor = cleanTrail[cleanTrail.length - 2];
        const bearing1 = getBearingDegrees(
          prevAnchor.latitude,
          prevAnchor.longitude,
          lastTransitPoint.latitude,
          lastTransitPoint.longitude
        );
        const bearing2 = getBearingDegrees(
          lastTransitPoint.latitude,
          lastTransitPoint.longitude,
          pt.latitude,
          pt.longitude
        );
        let angleDiff = Math.abs(bearing2 - bearing1);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        if (angleDiff > 135) {
          continue; // Reversing back on itself within 55m: skip bounce
        }
      }

      totalDistanceMeters += distFromLast;
      cleanTrail.push(pt);
      lastTransitPoint = pt;

      if (effSpeed >= 3 && effSpeed <= 85) {
        validMovingSpeeds.push(effSpeed);
      }
    }
  }

  // Finalize final halt if day ended in halt
  if (mode === "HALT") {
    const finalHaltMins = Math.round(
      (new Date(currentHalt.endTime) - new Date(currentHalt.startTime)) / 60000
    );
    if (finalHaltMins >= HALT_MIN_MINUTES || cleanTrail.length <= 1) {
      halts.push({
        latitude: Number(currentHalt.centerLat.toFixed(6)),
        longitude: Number(currentHalt.centerLng.toFixed(6)),
        startTime: currentHalt.startTime,
        endTime: currentHalt.endTime,
        durationMinutes: Math.max(1, finalHaltMins),
        durationText: formatStoppageDuration(Math.max(1, finalHaltMins)),
        address: currentHalt.address || "",
      });
    }
    if (cleanTrail.length > 0) {
      cleanTrail.push({
        latitude: Number(currentHalt.centerLat.toFixed(6)),
        longitude: Number(currentHalt.centerLng.toFixed(6)),
        timestamp: currentHalt.endTime,
        address: currentHalt.address || "",
      });
    }
  }

  // If total travel is negligible (< 150m), return clean stationary response
  if (totalDistanceMeters < 150 || cleanTrail.length <= 1) {
    const basePoint = cleanTrail[0] || cleaned[0];
    return {
      isStationaryAllDay: true,
      cleanTrail: [basePoint],
      totalDistanceMeters: 0,
      distanceKm: 0,
      halts: [
        {
          latitude: basePoint.latitude,
          longitude: basePoint.longitude,
          startTime: cleaned[0].timestamp,
          endTime: cleaned[cleaned.length - 1].timestamp,
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
      maxSpeed: 0,
      avgSpeed: 0,
      startLocation: basePoint,
      endLocation: basePoint,
    };
  }

  const totalHaltMinutes = halts.reduce((sum, h) => sum + h.durationMinutes, 0);
  const movingMinutes = Math.max(0, totalDayMinutes - totalHaltMinutes);

  // Safe speeds (exclude top 2% outlier spikes for maxSpeed, cap at 75 km/h for city)
  let maxSpeedVal = 0;
  let avgMovingSpeed = 0;
  if (validMovingSpeeds.length > 0) {
    const sorted = [...validMovingSpeeds].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    maxSpeedVal = Math.min(75, Math.round(sorted[p95Idx] || sorted[sorted.length - 1]));
    avgMovingSpeed = Math.round(validMovingSpeeds.reduce((a, b) => a + b, 0) / validMovingSpeeds.length);
  }

  const distanceKm = Number((totalDistanceMeters / 1000).toFixed(2));

  return {
    isStationaryAllDay: false,
    cleanTrail: cleanTrail,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    distanceKm: distanceKm,
    halts: halts,
    haltCount: halts.length,
    totalHaltTimeMinutes: totalHaltMinutes,
    totalHaltTimeText: formatStoppageDuration(totalHaltMinutes),
    totalMovingTimeMinutes: movingMinutes,
    totalMovingTimeText: formatStoppageDuration(movingMinutes),
    maxSpeed: maxSpeedVal,
    avgSpeed: avgMovingSpeed,
    startLocation: cleanTrail[0] || null,
    endLocation: cleanTrail[cleanTrail.length - 1] || null,
  };
};

/**
 * Calculate true travel distance from GPS points, filtering out stationary jitter (odometer creep).
 * If all points remain within stationary radius (< 95m), returns 0 meters.
 */
const calculateTrueGpsDistanceMeters = (pts) => {
  const result = processGpsTrailAndMetrics(pts);
  return result.isStationaryAllDay ? 0 : result.totalDistanceMeters;
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

      // Drop coarse network / cell-tower fixes (> 25m)
      if (acc > 25) {
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
      isLocationTrackingEnabled: true,
    };

    // If Manager, filter to their managed department or team + include manager themselves (only tracking-enabled)
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
        employeeQuery = {
          companyId: new mongoose.Types.ObjectId(companyId.toString()),
          status: { $ne: "terminated" },
          isLocationTrackingEnabled: true,
          $or: [deptFilter, { _id: managerEmp._id }],
        };
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
    const { date } = req.query;
    const now = new Date();
    const todayIstStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    let targetDateStr = todayIstStr;
    if (date === "yesterday") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      targetDateStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    } else if (date && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDateStr = date;
    }
    const isToday = targetDateStr === todayIstStr;

    // 1. Fetch attendance records for target date
    const targetDateUtc = new Date(targetDateStr).toISOString().slice(0, 10);
    const [attendances, attSettings, branches, companyDoc] = await Promise.all([
      Attendance.find({
        companyId: new mongoose.Types.ObjectId(companyId.toString()),
        employeeId: { $in: employeeIds },
        date: { $in: [targetDateStr, targetDateUtc] },
      }).sort({ createdAt: 1 }).lean(),
      CompanyAttendanceSettings.findOne({ companyId }).lean().catch(() => null),
      Branch.find({ companyId, status: "active" }).lean().catch(() => []),
      Company.findById(companyId).select("companyName address city state pincode").lean().catch(() => null),
    ]);

    // Build branch lookup map
    const branchMap = new Map();
    if (Array.isArray(branches)) {
      branches.forEach((b) => branchMap.set(b._id.toString(), b));
    }

    // Prioritize Branch location configured by admin with valid coordinates
    const branchWithCoords = Array.isArray(branches)
      ? branches.find((b) => b.latitude && b.longitude && Math.abs(b.latitude) > 10)
      : null;

    let officeLocation = null;
    if (branchWithCoords) {
      officeLocation = {
        _id: branchWithCoords._id,
        name: branchWithCoords.branchName || "Main Branch",
        latitude: Number(branchWithCoords.latitude),
        longitude: Number(branchWithCoords.longitude),
        address: branchWithCoords.address || (companyDoc?.address ? `${companyDoc.address}, ${companyDoc.city || ""}` : "Branch Office"),
        radius: branchWithCoords.allowedRadiusMeters || 100,
      };
    } else if (attSettings && attSettings.latitude && attSettings.longitude && Math.abs(attSettings.latitude) > 10) {
      officeLocation = {
        name: attSettings.officeName || "Main Office",
        latitude: Number(attSettings.latitude),
        longitude: Number(attSettings.longitude),
        address: attSettings.address || companyDoc?.address || "Main Office",
        radius: attSettings.allowedRadiusMeters || 100,
      };
    } else if (Array.isArray(branches) && branches.length > 0) {
      const primaryBranch = branches.find((b) => b.isMainBranch) || branches[0];
      officeLocation = {
        _id: primaryBranch._id,
        name: primaryBranch.branchName || "Main Branch",
        latitude: primaryBranch.latitude ? Number(primaryBranch.latitude) : null,
        longitude: primaryBranch.longitude ? Number(primaryBranch.longitude) : null,
        address: primaryBranch.address || companyDoc?.address || "Branch Office",
        radius: primaryBranch.allowedRadiusMeters || 100,
      };
    } else if (companyDoc) {
      officeLocation = {
        name: companyDoc.companyName || "Company Office",
        latitude: null,
        longitude: null,
        address: companyDoc.address || "Company Headquarters",
        radius: 100,
      };
    }

    const attendanceMap = new Map();
    attendances.forEach((att) => {
      attendanceMap.set(att.employeeId.toString(), att);
    });

    // 2. Fetch target date's continuous GPS trail history from EmployeeLocation
    // Calculate exact start and end of target date in IST (UTC+5:30)
    const [y, m, d] = targetDateStr.split("-").map(Number);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - istOffsetMs);
    const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - istOffsetMs);

    const recentLocationAgg = await EmployeeLocation.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId.toString()),
          employeeId: { $in: employeeIds },
          timestamp: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: "$employeeId",
          latestPoint: { $last: "$$ROOT" },
          firstPoint: { $first: "$$ROOT" },
          totalPoints: { $sum: 1 },
          maxSpeed: { $max: "$speed" },
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

      let targetDistanceMeters = 0;
      if (isToday) {
        // Today's duty distance: calculated if punched in
        if (att && att.punchInTime) {
          const punchInMs = new Date(att.punchInTime).getTime();
          let dutyPts = allPts.filter((p) => new Date(p.timestamp).getTime() >= punchInMs);
          if (att.punchOutTime) {
            const punchOutMs = new Date(att.punchOutTime).getTime();
            dutyPts = dutyPts.filter((p) => new Date(p.timestamp).getTime() <= punchOutMs);
          }
          targetDistanceMeters = calculateTrueGpsDistanceMeters(dutyPts);
        } else {
          targetDistanceMeters = calculateTrueGpsDistanceMeters(allPts);
        }
      } else {
        // Historical date: calculate full GPS distance of that day
        targetDistanceMeters = calculateTrueGpsDistanceMeters(allPts);
      }

      const targetDistanceKm = Number((targetDistanceMeters / 1000).toFixed(2));
      let targetDistanceText = "0 km";
      if (targetDistanceKm >= 1.0) {
        targetDistanceText = `${targetDistanceKm.toFixed(2)} km`;
      } else if (targetDistanceMeters > 0) {
        targetDistanceText = `${Math.round(targetDistanceMeters)} m`;
      }

      locHistoryMap.set(empIdStr, {
        latest: item.latestPoint,
        first: item.firstPoint,
        totalPoints: item.totalPoints || allPts.length,
        maxSpeed: item.maxSpeed || 0,
        trail: allPts.slice(-25).reverse(),
        todayDistanceMeters: Math.round(targetDistanceMeters),
        todayDistanceKm: targetDistanceKm,
        todayDistanceText: targetDistanceText,
      });
    });

    // 3. Map each employee with tracking status, coordinates, and metrics
    const liveTrackList = employees.map((emp) => {
      const empIdStr = emp._id.toString();
      const lastLoc = emp.lastLocation || {};
      const locData = locHistoryMap.get(empIdStr);
      const dayAtt = attendanceMap.get(empIdStr);

      const hasTrackingData = Boolean(locData && (locData.totalPoints > 0 || locData.latest));

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
      } else if (isToday && lastLoc.latitude && lastLoc.longitude) {
        latitude = lastLoc.latitude;
        longitude = lastLoc.longitude;
        lastUpdated = lastLoc.updatedAt;
        speed = lastLoc.speed || 0;
        accuracy = lastLoc.accuracy || 0;
        heading = lastLoc.heading || 0;
        batteryLevel = lastLoc.batteryLevel !== undefined ? lastLoc.batteryLevel : null;
        address = lastLoc.address || "";
      } else if (dayAtt) {
        const punchLoc = dayAtt.punchInLocation || dayAtt.punchOutLocation;
        if (punchLoc && punchLoc.latitude && punchLoc.longitude) {
          latitude = punchLoc.latitude;
          longitude = punchLoc.longitude;
          lastUpdated = dayAtt.punchInTime || dayAtt.createdAt;
          address = punchLoc.address || "";
        }
      }

      let hasPunchedIn = false;
      let isPunchedOut = false;
      let isOnDuty = false;

      if (dayAtt) {
        if (Array.isArray(dayAtt.punchLog) && dayAtt.punchLog.length > 0) {
          const lastSession = dayAtt.punchLog[dayAtt.punchLog.length - 1];
          hasPunchedIn = Boolean(lastSession.punchInTime);
          isPunchedOut = Boolean(lastSession.punchOutTime);
          isOnDuty = hasPunchedIn && !isPunchedOut;
        } else {
          hasPunchedIn = Boolean(dayAtt.punchInTime);
          isPunchedOut = Boolean(dayAtt.punchOutTime);
          isOnDuty = hasPunchedIn && !isPunchedOut;
        }
      }

      const minutesSinceLastPing = lastUpdated ? Math.max(0, Math.round((now - new Date(lastUpdated)) / 60000)) : null;

      let trackingStatus = "inactive";
      let trackingStatusLabel = "No GPS Tracked";
      let trackingStatusColor = "slate";
      let isOnline = false;
      let isTrackingActive = false;
      let motionStatus = "off_duty";
      let stoppageDurationMinutes = 0;
      let stoppageText = "";
      let stoppedSince = null;

      if (isToday) {
        // Today's Live Tracking Rules
        if (!emp.isLocationTrackingEnabled) {
          trackingStatus = "disabled";
          trackingStatusLabel = "Tracking Not Assigned";
          trackingStatusColor = "slate";
          isOnline = false;
          latitude = null;
          longitude = null;
        } else if (!hasPunchedIn) {
          trackingStatus = "stopped";
          trackingStatusLabel = "Not Punched In (Off Duty)";
          trackingStatusColor = "rose";
          isOnline = false;
          latitude = null;
          longitude = null;
        } else if (isPunchedOut) {
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
          trackingStatus = "active";
          trackingStatusLabel = "Live Tracking Active (चालू)";
          trackingStatusColor = "emerald";
          isOnline = true;
          isTrackingActive = true;
        }

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
            if (dayAtt && dayAtt.punchInTime) {
              const punchInMs = new Date(dayAtt.punchInTime).getTime();
              if (stoppageStartTime.getTime() < punchInMs) {
                stoppageStartTime = new Date(punchInMs);
              }
            }
            const trail = locData?.trail || [];
            if (trail.length > 1) {
              for (let i = 1; i < trail.length; i++) {
                const pt = trail[i];
                const dist = getHaversineDistanceMeters(latitude, longitude, pt.latitude, pt.longitude);
                if (dist <= 65 && (pt.speed || 0) <= 3.5) {
                  stoppageStartTime = new Date(pt.timestamp);
                } else {
                  break;
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
      } else {
        // Historical Past Date (3 days, 5 days ago, etc.)
        if (hasTrackingData) {
          isTrackingActive = true;
          trackingStatus = "active";
          trackingStatusLabel = `Tracked (${locData.totalPoints} GPS points)`;
          trackingStatusColor = "emerald";
          motionStatus = "completed";
          stoppageText = "Day Trip Completed";
          isOnline = true; // Mark true so counts and active flags recognize past tracked employees
        } else {
          isTrackingActive = false;
          trackingStatus = "inactive";
          trackingStatusLabel = hasPunchedIn ? "Punched In (No GPS Trail)" : "No Tracking Recorded";
          trackingStatusColor = "slate";
          motionStatus = "off_duty";
          stoppageText = "No GPS Data";
          isOnline = false;
          latitude = null;
          longitude = null;
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
        isTrackingActive: isTrackingActive,
        trackingStatus: trackingStatus,
        trackingStatusLabel: trackingStatusLabel,
        trackingStatusColor: trackingStatusColor,
        motionStatus: motionStatus,
        stoppageDurationMinutes: stoppageDurationMinutes,
        stoppageText: stoppageText,
        stoppedSince: stoppedSince,
        todayDistanceKm: locData?.todayDistanceKm || 0,
        todayDistanceMeters: locData?.todayDistanceMeters || 0,
        todayDistanceText: locData?.todayDistanceText || "0 km",
        totalPoints: locData?.totalPoints || 0,
        attendanceStatus: dayAtt ? dayAtt.status : "absent",
        punchInTime: dayAtt ? dayAtt.punchInTime : null,
        punchOutTime: dayAtt ? dayAtt.punchOutTime : null,
        isLocationTrackingEnabled: Boolean(emp.isLocationTrackingEnabled),
        branchName: emp.branchId && branchMap.get(emp.branchId.toString()) ? branchMap.get(emp.branchId.toString()).branchName : officeLocation?.name || "Main Branch",
        branchAddress: emp.branchId && branchMap.get(emp.branchId.toString()) ? (branchMap.get(emp.branchId.toString()).address || officeLocation?.address || "") : officeLocation?.address || "",
        displayLocation:
          latitude && longitude
            ? address || "Recorded Location"
            : (emp.branchId && branchMap.get(emp.branchId.toString()))
            ? `${branchMap.get(emp.branchId.toString()).branchName} (Branch Office)`
            : officeLocation
            ? `${officeLocation.name} (Branch Office)`
            : "Branch Office",
        displayAddress:
          latitude && longitude && address
            ? address
            : (emp.branchId && branchMap.get(emp.branchId.toString()) && branchMap.get(emp.branchId.toString()).address)
            ? branchMap.get(emp.branchId.toString()).address
            : officeLocation?.address || "Branch Office",
        officeLocation: officeLocation,
      };
    });

    return res.status(200).json({
      success: true,
      selectedDate: targetDateStr,
      isToday: isToday,
      officeLocation: officeLocation,
      stats: {
        total: liveTrackList.length,
        activeTracked: liveTrackList.filter((e) => e.isTrackingActive).length,
        inactive: liveTrackList.filter((e) => !e.isTrackingActive).length,
      },
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
 * Route GPS trail segments along actual road network via OSRM
 * Snaps waypoints to real streets, lanes, and turns; prevents straight lines slicing through buildings
 */
async function alignTrailToRoadNetwork(cleanPoints) {
  if (!Array.isArray(cleanPoints) || cleanPoints.length < 2) {
    return { trail: cleanPoints || [], distanceMeters: 0, distanceKm: 0 };
  }

  // Sample waypoints if dense (keep start, end, and representative corridor points)
  const maxWaypoints = 45;
  let keyPoints = cleanPoints;
  if (cleanPoints.length > maxWaypoints) {
    const step = Math.ceil(cleanPoints.length / maxWaypoints);
    keyPoints = cleanPoints.filter(
      (_, idx) => idx === 0 || idx === cleanPoints.length - 1 || idx % step === 0
    );
  }

  // Chunk to max 30 waypoints per OSRM query to prevent long URL query strings
  const chunkSize = 30;
  const chunks = [];
  for (let i = 0; i < keyPoints.length; i += chunkSize - 1) {
    chunks.push(keyPoints.slice(i, i + chunkSize));
  }

  const snappedRoadPoints = [];
  let totalRoadMeters = 0;

  for (const chunk of chunks) {
    if (chunk.length < 2) continue;
    const coordsStr = chunk
      .map((p) => `${Number(p.longitude).toFixed(6)},${Number(p.latitude).toFixed(6)}`)
      .join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    let success = false;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res && res.ok) {
        const json = await res.json();
        if (json.code === "Ok" && json.routes && json.routes[0]?.geometry?.coordinates?.length >= 2) {
          const roadCoords = json.routes[0].geometry.coordinates.map((c) => ({
            latitude: c[1],
            longitude: c[0],
          }));
          if (snappedRoadPoints.length === 0) {
            snappedRoadPoints.push(...roadCoords);
          } else {
            snappedRoadPoints.push(...roadCoords.slice(1));
          }
          totalRoadMeters += Number(json.routes[0].distance) || 0;
          success = true;
        }
      }
    } catch (_) {}

    if (!success) {
      if (snappedRoadPoints.length === 0) {
        snappedRoadPoints.push(...chunk);
      } else {
        snappedRoadPoints.push(...chunk.slice(1));
      }
      for (let j = 0; j < chunk.length - 1; j++) {
        totalRoadMeters += getHaversineDistanceMeters(
          chunk[j].latitude,
          chunk[j].longitude,
          chunk[j + 1].latitude,
          chunk[j + 1].longitude
        );
      }
    }
  }

  const finalDistanceKm = Number((totalRoadMeters / 1000).toFixed(2));
  return {
    trail: snappedRoadPoints.length >= 2 ? snappedRoadPoints : cleanPoints,
    distanceMeters: Math.round(totalRoadMeters),
    distanceKm: finalDistanceKm,
  };
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

    // Calculate exact IST day window (UTC + 5:30) supporting "today", "yesterday", and YYYY-MM-DD
    let targetDateStr;
    const now = new Date();
    const todayIstStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    if (date === "yesterday") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      targetDateStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    } else if (date && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDateStr = date;
    } else {
      targetDateStr = todayIstStr;
    }

    const [y, m, d] = targetDateStr.split("-").map(Number);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - istOffsetMs);
    const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - istOffsetMs);

    let rawTrail = await EmployeeLocation.find({
      employeeId: new mongoose.Types.ObjectId(targetEmployeeId.toString()),
      companyId: new mongoose.Types.ObjectId(companyId.toString()),
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ timestamp: 1 })
      .select("latitude longitude accuracy speed heading batteryLevel timestamp address")
      .lean();

    if (rawTrail.length === 0) {
      rawTrail = await EmployeeLocation.find({
        employeeId: new mongoose.Types.ObjectId(targetEmployeeId.toString()),
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ timestamp: 1 })
        .select("latitude longitude accuracy speed heading batteryLevel timestamp address")
        .lean();
    }

    if (rawTrail.length === 0) {
      const [attSettings, branches, companyDoc, targetEmp] = await Promise.all([
        CompanyAttendanceSettings.findOne({ companyId }).lean().catch(() => null),
        Branch.find({ companyId, status: "active" }).lean().catch(() => []),
        Company.findById(companyId).select("companyName address city state pincode").lean().catch(() => null),
        Employee.findById(targetEmployeeId).select("branchId firstName lastName").lean().catch(() => null),
      ]);

      const branchMap = new Map();
      if (Array.isArray(branches)) {
        branches.forEach((b) => branchMap.set(b._id.toString(), b));
      }

      // Check if target employee belongs to a specific branch with coordinates
      const empBranch = targetEmp?.branchId ? branchMap.get(targetEmp.branchId.toString()) : null;
      const branchWithCoords = empBranch && empBranch.latitude && empBranch.longitude && Math.abs(empBranch.latitude) > 10
        ? empBranch
        : Array.isArray(branches)
        ? branches.find((b) => b.latitude && b.longitude && Math.abs(b.latitude) > 10)
        : null;

      let officeLocation = null;
      if (branchWithCoords) {
        officeLocation = {
          _id: branchWithCoords._id,
          name: branchWithCoords.branchName || "Main Branch",
          latitude: Number(branchWithCoords.latitude),
          longitude: Number(branchWithCoords.longitude),
          address: branchWithCoords.address || (companyDoc?.address ? `${companyDoc.address}, ${companyDoc.city || ""}` : "Branch Office"),
          radius: branchWithCoords.allowedRadiusMeters || 100,
        };
      } else if (attSettings && attSettings.latitude && attSettings.longitude && Math.abs(attSettings.latitude) > 10) {
        officeLocation = {
          name: attSettings.officeName || "Main Office",
          latitude: Number(attSettings.latitude),
          longitude: Number(attSettings.longitude),
          address: attSettings.address || companyDoc?.address || "Main Office",
          radius: attSettings.allowedRadiusMeters || 100,
        };
      } else if (Array.isArray(branches) && branches.length > 0) {
        const primaryBranch = empBranch || branches.find((b) => b.isMainBranch) || branches[0];
        officeLocation = {
          _id: primaryBranch._id,
          name: primaryBranch.branchName || "Main Branch",
          latitude: primaryBranch.latitude ? Number(primaryBranch.latitude) : null,
          longitude: primaryBranch.longitude ? Number(primaryBranch.longitude) : null,
          address: primaryBranch.address || companyDoc?.address || "Branch Office",
          radius: primaryBranch.allowedRadiusMeters || 100,
        };
      } else if (companyDoc) {
        officeLocation = {
          name: companyDoc.companyName || "Company Office",
          latitude: null,
          longitude: null,
          address: companyDoc.address || "Company Headquarters",
          radius: 100,
        };
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

    // Process GPS points through robust filtering & anti-spiderweb state machine
    const metrics = processGpsTrailAndMetrics(rawTrail);

    if (metrics.isStationaryAllDay || metrics.cleanTrail.length <= 1) {
      const basePoint = metrics.cleanTrail[0] || rawTrail[0];
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
          halts: metrics.halts,
          haltCount: metrics.halts.length,
          totalHaltTimeMinutes: metrics.totalHaltTimeMinutes,
          totalHaltTimeText: metrics.totalHaltTimeText,
          totalMovingTimeMinutes: 0,
          totalMovingTimeText: "0 mins",
          startLocation: basePoint,
          endLocation: basePoint,
          startTime: rawTrail[0]?.timestamp || null,
          endTime: rawTrail[rawTrail.length - 1]?.timestamp || null,
        },
      });
    }

    // Align genuine travel legs to real road network via OSRM
    const roadResult = await alignTrailToRoadNetwork(metrics.cleanTrail);
    const finalTrail = roadResult.trail && roadResult.trail.length >= 2 ? roadResult.trail : metrics.cleanTrail;
    const finalDistanceKm = roadResult.distanceKm > 0 ? roadResult.distanceKm : metrics.distanceKm;
    const finalDistanceMeters = roadResult.distanceMeters > 0 ? roadResult.distanceMeters : metrics.totalDistanceMeters;

    let distanceText = "0 km";
    if (finalDistanceKm >= 1.0) {
      distanceText = `${finalDistanceKm.toFixed(2)} km`;
    } else if (finalDistanceMeters > 0) {
      distanceText = `${Math.round(finalDistanceMeters)} m`;
    }

    return res.status(200).json({
      success: true,
      data: {
        trail: finalTrail,
        cleanTrail: metrics.cleanTrail, // Filtered GPS trail without spider-webs
        roadTrail: finalTrail, // Snapped road trail following actual streets
        rawSensorPoints: metrics.cleanTrail,
        isStationaryAllDay: false,
        rawCount: rawTrail.length,
        cleanCount: finalTrail.length,
        totalPoints: rawTrail.length,
        distanceKm: finalDistanceKm,
        pureDistanceKm: metrics.distanceKm,
        roadDistanceKm: finalDistanceKm,
        distanceMeters: finalDistanceMeters,
        distanceText: distanceText,
        todayDistanceText: distanceText,
        maxSpeed: metrics.maxSpeed,
        avgSpeed: metrics.avgSpeed,
        halts: metrics.halts,
        haltCount: metrics.halts.length,
        totalHaltTimeMinutes: metrics.totalHaltTimeMinutes,
        totalHaltTimeText: metrics.totalHaltTimeText,
        totalMovingTimeMinutes: metrics.totalMovingTimeMinutes,
        totalMovingTimeText: metrics.totalMovingTimeText,
        startLocation: metrics.startLocation,
        endLocation: metrics.endLocation,
        startTime: rawTrail[0]?.timestamp || null,
        endTime: rawTrail[rawTrail.length - 1]?.timestamp || null,
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

    // Build employees filter (only staff with location tracking enabled)
    const empFilter = { companyId, status: "active", isLocationTrackingEnabled: true };
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

