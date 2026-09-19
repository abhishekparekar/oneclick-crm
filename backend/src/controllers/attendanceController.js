const { validationResult } = require("express-validator");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Company = require("../models/Company");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const AuditLog = require("../models/AuditLog");
const CompanyAttendanceSettings = require("../models/CompanyAttendanceSettings");
const User = require("../models/User");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const Branch = require("../models/Branch");
const { calculateDistance } = require("../utils/geoUtils");
const { notifyUser, notifyRole, notifyDeptManagers, notifyAttendancePunch } = require("../utils/notificationHelper");

// Get date string (YYYY-MM-DD)
const getDateKey = (d = new Date()) => {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

// Calculate total hours between two Dates
const calcHours = (punchIn, punchOut) => {
  if (!punchIn || !punchOut) return 0;
  const ms = new Date(punchOut).getTime() - new Date(punchIn).getTime();
  if (ms <= 0) return 0;
  return Number((ms / (1000 * 60 * 60)).toFixed(2));
};

const formatTotalHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "0 hr 0 min";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

// Calculate total hours by summing up all valid sessions in the punch log
const calcTotalSessionHours = (punchLog) => {
  if (!punchLog || !Array.isArray(punchLog) || punchLog.length === 0) return 0;
  let totalMs = 0;
  for (const session of punchLog) {
    if (session.punchInTime && session.punchOutTime) {
      const ms = new Date(session.punchOutTime).getTime() - new Date(session.punchInTime).getTime();
      if (ms > 0) totalMs += ms;
    }
  }
  return Number((totalMs / (1000 * 60 * 60)).toFixed(2));
};

// Check if punch-in is late based on shiftStartTime and graceMinutes
const checkIsLate = (punchInTime, shiftStartTime, graceMinutes) => {
  const [shiftHours, shiftMinutes] = shiftStartTime.split(":").map(Number);
  
  const inHours = punchInTime.getHours();
  const inMinutes = punchInTime.getMinutes();
  
  const shiftTotalMinutes = shiftHours * 60 + shiftMinutes;
  const inTotalMinutes = inHours * 60 + inMinutes;
  
  return inTotalMinutes > shiftTotalMinutes + graceMinutes;
};


// Check if punch-out is early based on shiftEndTime and earlyGraceMinutes
const checkIsEarlyLeave = (punchOutTime, shiftEndTime, earlyGraceMinutes) => {
  if (!shiftEndTime) return false;
  const [shiftHours, shiftMinutes] = shiftEndTime.split(":").map(Number);
  
  const outHours = punchOutTime.getHours();
  const outMinutes = punchOutTime.getMinutes();
  
  const shiftTotalMinutes = shiftHours * 60 + shiftMinutes;
  const outTotalMinutes = outHours * 60 + outMinutes;
  
  // They left earlier than the allowed grace period
  return outTotalMinutes < (shiftTotalMinutes - earlyGraceMinutes);
};

// Locate matching employee document for req.user
const resolveEmployeeForUser = async (req) => {
  const companyId = req.companyId || req.user?.companyId || (req.user?.company && (req.user.company._id || req.user.company));
  let employee = null;

  if (req.user?.employeeId) {
    employee = await Employee.findOne({ _id: req.user.employeeId, companyId });
    if (employee) return employee;
  }

  if (req.user?._id) {
    employee = await Employee.findOne({ userId: req.user._id, companyId });
    if (employee) return employee;
  }

  if (req.user?.email) {
    employee = await Employee.findOne({
      email: new RegExp(`^${req.user.email.trim()}$`, "i"),
      companyId,
    });
    if (employee) return employee;
  }

  // Final fallback by userId without strict companyId
  if (req.user?._id) {
    employee = await Employee.findOne({ userId: req.user._id });
    if (employee) return employee;
  }

  return null;
};

const getCompanyAttendanceSettings = async (companyId) => {
  let settings = await CompanyAttendanceSettings.findOne({ companyId });
  if (!settings) {
    settings = await CompanyAttendanceSettings.create({
      companyId,
      officeName: "Main Office",
      latitude: null,
      longitude: null,
      allowedRadiusMeters: 100,
      attendanceMode: "office_only",
      requireGps: true,
      requireSelfie: false,
      allowAdminBypassGeoFencing: true,
      enableAttendanceModule: true,
    });
  }
  return settings;
};

/**
 * Match user GPS against all authorized branches and main office geofences.
 * Supports:
 * - Multi-branch companies (any company branch with valid lat/long).
 * - Employee-specific assigned branches (employee.branchId + employee.branchIds).
 * - Fallback to Main Office settings.
 */
const matchOfficeOrBranch = async ({ companyId, employee, latitude, longitude, geoSettings }) => {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return {
      insideArea: false,
      distanceFromOffice: null,
      matchedBranch: null,
      nearestOfficeName: geoSettings.officeName || "Office",
      allowedRadius: geoSettings.allowedRadiusMeters || 100,
    };
  }

  // 1. Gather all candidates: Active Branches + Main Office
  const branches = await Branch.find({
    companyId,
    status: "active",
    latitude: { $ne: null },
    longitude: { $ne: null },
  }).lean();

  const candidates = [];

  // Add branches with coordinates
  for (const b of branches) {
    if (b.latitude !== null && b.longitude !== null && b.latitude !== 0 && b.longitude !== 0) {
      candidates.push({
        _id: b._id,
        name: b.branchName || "Branch",
        latitude: b.latitude,
        longitude: b.longitude,
        allowedRadiusMeters: b.allowedRadiusMeters || geoSettings.allowedRadiusMeters || 100,
        isBranch: true,
      });
    }
  }

  // Add Main Office from geoSettings if configured
  if (geoSettings.latitude !== null && geoSettings.longitude !== null && geoSettings.latitude !== 0 && geoSettings.longitude !== 0) {
    candidates.push({
      _id: null,
      name: geoSettings.officeName || "Main Office",
      latitude: geoSettings.latitude,
      longitude: geoSettings.longitude,
      allowedRadiusMeters: geoSettings.allowedRadiusMeters || 100,
      isBranch: false,
    });
  }

  // If no geofence locations configured in the company at all
  if (candidates.length === 0) {
    return {
      insideArea: true,
      distanceFromOffice: 0,
      matchedBranch: null,
      officeName: geoSettings.officeName || "Main Office",
      allowedRadius: geoSettings.allowedRadiusMeters || 100,
      noGeofenceConfigured: true,
    };
  }

  // Determine allowed candidates for this employee
  let allowedCandidates = candidates;
  if (geoSettings.restrictToAssignedBranches && employee) {
    const assignedIds = new Set();
    if (employee.branchId) assignedIds.add(String(employee.branchId));
    if (Array.isArray(employee.branchIds)) {
      employee.branchIds.forEach((id) => id && assignedIds.add(String(id)));
    }
    if (assignedIds.size > 0) {
      const filtered = candidates.filter((c) => !c.isBranch || assignedIds.has(String(c._id)));
      if (filtered.length > 0) {
        allowedCandidates = filtered;
      }
    }
  }

  // 2. Evaluate distance to all candidate locations
  let matched = null;
  let minDistance = Infinity;
  let closestCandidate = allowedCandidates[0] || candidates[0];

  for (const cand of allowedCandidates) {
    const dist = calculateDistance(latitude, longitude, cand.latitude, cand.longitude);
    if (dist !== null) {
      if (dist < minDistance) {
        minDistance = dist;
        closestCandidate = cand;
      }
      if (dist <= cand.allowedRadiusMeters) {
        matched = {
          candidate: cand,
          distance: dist,
        };
        break; // Match found: inside this office boundary
      }
    }
  }

  if (matched) {
    return {
      insideArea: true,
      distanceFromOffice: Math.round(matched.distance),
      matchedBranch: matched.candidate.isBranch
        ? { _id: matched.candidate._id, branchName: matched.candidate.name }
        : null,
      officeName: matched.candidate.name,
      allowedRadius: matched.candidate.allowedRadiusMeters,
    };
  }

  return {
    insideArea: false,
    distanceFromOffice: minDistance !== Infinity ? Math.round(minDistance) : null,
    matchedBranch: null,
    nearestOfficeName: closestCandidate ? closestCandidate.name : (geoSettings.officeName || "Office"),
    allowedRadius: closestCandidate ? closestCandidate.allowedRadiusMeters : (geoSettings.allowedRadiusMeters || 100),
  };
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    return true;
  }
  return false;
};

// POST /api/attendance/punch-in
const checkIn = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    // Parallelize employee, settings, and company lookups
    const [employee, geoSettings, company] = await Promise.all([
      resolveEmployeeForUser(req),
      getCompanyAttendanceSettings(req.companyId),
      Company.findById(req.companyId).lean(),
    ]);

    if (!employee) {
      return res.status(403).json({ message: "Employee profile required for check-in" });
    }

    const now = new Date();
    const date = getDateKey(now);
    
    const existing = await Attendance.findOne({
      companyId: req.companyId,
      employeeId: employee._id,
      date,
    });

    if (existing) {
      if (existing.punchLog && existing.punchLog.length > 0) {
        const lastPunch = existing.punchLog[existing.punchLog.length - 1];
        if (!lastPunch.punchOutTime) {
          return res.status(400).json({ message: "Already punched in. Please punch out first." });
        }
      } else if (existing.punchInTime && !existing.punchOutTime) {
        return res.status(400).json({ message: "Already punched in. Please punch out first." });
      }
    }

    // Geo-fencing validation
    const punchLocation = req.body.punchInLocation || req.body.checkInLocation || {};
    const punchInSelfie = req.body.punchInSelfie || null;
    const { latitude, longitude } = punchLocation;

    // Check Selfie Requirement
    if (geoSettings.requireSelfie && !punchInSelfie) {
      return res.status(400).json({ message: "A selfie photo is required to Punch In" });
    }

    // Check GPS Requirement
    if (geoSettings.requireGps && (latitude === undefined || longitude === undefined || latitude === null || longitude === null)) {
      return res.status(400).json({ message: "GPS coordinates are required to Punch In" });
    }

    let distanceFromOffice = null;
    let locationType = "office";
    let gpsValidated = false;
    let matchedBranch = null;
    let matchedOfficeName = geoSettings.officeName || "Office";
    let matchedRadius = geoSettings.allowedRadiusMeters || 100;

    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      gpsValidated = true;
      const matchResult = await matchOfficeOrBranch({
        companyId: req.companyId,
        employee,
        latitude,
        longitude,
        geoSettings,
      });

      distanceFromOffice = matchResult.distanceFromOffice;
      matchedBranch = matchResult.matchedBranch;
      matchedOfficeName = matchResult.officeName || matchResult.nearestOfficeName || "Office";
      matchedRadius = matchResult.allowedRadius || 100;

      if (matchResult.insideArea) {
        locationType = "office";
        if (matchedBranch) {
          punchLocation.branchId = matchedBranch._id;
          punchLocation.branchName = matchedBranch.branchName;
        } else if (matchResult.officeName) {
          punchLocation.branchName = matchResult.officeName;
        }
      } else {
        locationType = "remote";
        
        const isRemoteAllowed = employee.allowRemotePunch || 
                                employee.workMode === "remote" || 
                                employee.workMode === "hybrid" || 
                                (geoSettings.allowAdminBypassGeoFencing && 
                                 (req.user.role === "CompanyAdmin" || req.user.role === "Manager" || req.user.role === "HR"));

        // Check if we should reject
        if (geoSettings.attendanceMode === "office_only" && !isRemoteAllowed) {
          const nearestMsg = matchResult.nearestOfficeName
            ? ` Nearest location is ${matchResult.nearestOfficeName} (${matchResult.distanceFromOffice?.toLocaleString() || 0}m away, allowed: ${matchResult.allowedRadius}m).`
            : "";
          return res.status(400).json({
            message: `You are not in the office. Punching is not allowed.${nearestMsg}`,
            distance: distanceFromOffice !== null ? distanceFromOffice : 0,
            allowedRadius: matchResult.allowedRadius,
            nearestOffice: matchResult.nearestOfficeName,
          });
        }
      }
    }

    if (geoSettings.enableAttendanceModule === false) {
      return res.status(403).json({ message: "Attendance module is currently disabled by Admin." });
    }

    const shiftStartTime = employee.shiftStartTime || company?.settings?.shiftStartTime || "09:30";
    const graceMinutes = geoSettings.gracePeriodMinutes !== undefined ? geoSettings.gracePeriodMinutes : 15;

    const isLate = checkIsLate(now, shiftStartTime, graceMinutes);
    let status = isLate ? "late" : "present";

    const attendance =
      existing ||
      new Attendance({
        companyId: req.companyId,
        employeeId: employee._id,
        userId: req.user._id,
        date,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        punchLog: [],
      });

    // Only set root properties if it's the very first punch-in of the day
    if (!attendance.punchInTime) {
      attendance.punchInTime = now;
      attendance.punchInLocation = punchLocation;
      attendance.source = "punch";
      attendance.isManuallyUpdated = false;

      // Geo snapshot fields
      attendance.distanceFromOffice = distanceFromOffice !== null ? Math.round(distanceFromOffice) : null;
      attendance.locationType = locationType;
      attendance.gpsValidated = gpsValidated;
      attendance.officeLocationSnapshot = {
        latitude: matchedBranch ? (matchedBranch.latitude || geoSettings.latitude) : geoSettings.latitude,
        longitude: matchedBranch ? (matchedBranch.longitude || geoSettings.longitude) : geoSettings.longitude,
        radius: matchedRadius,
      };
      if (punchInSelfie) attendance.punchInSelfie = punchInSelfie;
    }

    // Always reset status to present/late when punching in
    attendance.status = status;

    // Always push to punchLog
    if (!attendance.punchLog) attendance.punchLog = [];
    attendance.punchLog.push({
      punchInTime: now,
      punchOutTime: null,
      punchInLocation: punchLocation,
      punchInSelfie: punchInSelfie || null,
    });

    await attendance.save();

    // Activate location tracking on Punch In if company & employee allows it (works for Employee, HR & Manager)
    const companySubscribed = company?.subscribedModules || [];
    const isCompanyTrackingAllowed = companySubscribed.length === 0 || companySubscribed.includes("location_tracking") || companySubscribed.includes("location");
    const isEmployeeTrackingAllowed = isCompanyTrackingAllowed && Boolean(employee.isLocationTrackingEnabled);

    if (isEmployeeTrackingAllowed) {
      Employee.findByIdAndUpdate(employee._id, {
        $set: {
          "lastLocation.latitude": punchLocation?.latitude || null,
          "lastLocation.longitude": punchLocation?.longitude || null,
          "lastLocation.address": punchLocation?.address || "",
          "lastLocation.updatedAt": now,
          "lastLocation.isTrackingActive": true,
          "lastLocation.motionStatus": "stationary",
          "lastLocation.stationarySince": now,
        },
      }).catch(() => {});
    }

    // Single deduplicated asynchronous notification dispatch
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    notifyAttendancePunch({
      companyId: req.companyId,
      employee,
      action: "punch_in",
      timeStr,
      status,
      attendanceId: attendance._id
    }).catch((err) => console.error("[AttendanceNotify] Async punch-in notify error:", err));

    return res.status(201).json({
      success: true,
      attendance,
      isLocationTrackingEnabled: isEmployeeTrackingAllowed,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/punch-out
const checkOut = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;

    // Parallelize employee, settings, and company lookups
    const [employee, geoSettings, company] = await Promise.all([
      resolveEmployeeForUser(req),
      getCompanyAttendanceSettings(req.companyId),
      Company.findById(req.companyId).lean(),
    ]);

    if (!employee) {
      return res.status(403).json({ message: "Employee profile required for check-out" });
    }

    // Check for pending tasks today for Employee and Manager roles (fast existence check)
    if (req.user.role === "Employee" || req.user.role === "Manager") {
      const Task = require("../models/Task");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fast check: find at most 1 pending task without loading all
      const hasPendingTask = await Task.findOne({
        companyId: req.companyId,
        assignedTo: employee._id,
        status: { $in: ["pending", "re_pending"] },
        $or: [
          { nextFollowUpDate: { $gte: today, $lt: tomorrow } },
          {
            nextFollowUpDate: { $eq: null },
            startDateTime: { $gte: today, $lt: tomorrow }
          },
          {
            nextFollowUpDate: { $exists: false },
            startDateTime: { $gte: today, $lt: tomorrow }
          }
        ]
      }).select("_id").lean();

      if (hasPendingTask) {
        return res.status(400).json({ 
          message: "You have pending task(s) for today. Please update their status or add a next follow-up date before punching out."
        });
      }
    }

    const now = new Date();
    const date = getDateKey(now);

    const attendance = await Attendance.findOne({
      companyId: req.companyId,
      employeeId: employee._id,
      date,
    });

    if (!attendance) {
      return res.status(400).json({ message: "Punch-in is required before punch-out" });
    }

    let activeSessionIndex = -1;
    if (attendance.punchLog && attendance.punchLog.length > 0) {
      activeSessionIndex = attendance.punchLog.length - 1;
      if (attendance.punchLog[activeSessionIndex].punchOutTime) {
        return res.status(400).json({ message: "Already punched out. Please punch in first." });
      }
    } else {
      if (!attendance.punchInTime) {
        return res.status(400).json({ message: "Punch-in is required before punch-out" });
      }
      if (attendance.punchOutTime) {
        return res.status(400).json({ message: "Already punched out today" });
      }
    }

    // Geo-fencing validation
    const punchLocation = req.body.punchOutLocation || req.body.checkOutLocation || {};
    const punchOutSelfie = req.body.punchOutSelfie || null;
    const { latitude, longitude } = punchLocation;

    // Check Selfie Requirement
    if (geoSettings.requireSelfie && !punchOutSelfie) {
      return res.status(400).json({ message: "A selfie photo is required to Punch Out" });
    }

    // Check GPS Requirement
    if (geoSettings.requireGps && (latitude === undefined || longitude === undefined || latitude === null || longitude === null)) {
      return res.status(400).json({ message: "GPS coordinates are required to Punch Out" });
    }

    let distanceFromOffice = null;
    let locationType = "office";
    let gpsValidated = false;
    let matchedBranch = null;

    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      gpsValidated = true;
      const matchResult = await matchOfficeOrBranch({
        companyId: req.companyId,
        employee,
        latitude,
        longitude,
        geoSettings,
      });

      distanceFromOffice = matchResult.distanceFromOffice;
      matchedBranch = matchResult.matchedBranch;

      if (matchResult.insideArea) {
        locationType = "office";
        if (matchedBranch) {
          punchLocation.branchId = matchedBranch._id;
          punchLocation.branchName = matchedBranch.branchName;
        } else if (matchResult.officeName) {
          punchLocation.branchName = matchResult.officeName;
        }
      } else {
        locationType = "remote";
        
        const isRemoteAllowed = employee.allowRemotePunch || 
                                employee.workMode === "remote" || 
                                employee.workMode === "hybrid" || 
                                (geoSettings.allowAdminBypassGeoFencing && 
                                 (req.user.role === "CompanyAdmin" || req.user.role === "Manager" || req.user.role === "HR"));

        // Check if we should reject
        if (geoSettings.attendanceMode === "office_only" && !isRemoteAllowed) {
          const nearestMsg = matchResult.nearestOfficeName
            ? ` Nearest location is ${matchResult.nearestOfficeName} (${matchResult.distanceFromOffice?.toLocaleString() || 0}m away, allowed: ${matchResult.allowedRadius}m).`
            : "";
          return res.status(400).json({
            message: `You are not in the office. Punching is not allowed.${nearestMsg}`,
            distance: distanceFromOffice !== null ? distanceFromOffice : 0,
            allowedRadius: matchResult.allowedRadius,
            nearestOffice: matchResult.nearestOfficeName,
          });
        }
      }
    }

    if (geoSettings.enableAttendanceModule === false) {
      return res.status(403).json({ message: "Attendance module is currently disabled by Admin." });
    }

    const shiftStartTime = employee.shiftStartTime || company?.settings?.shiftStartTime || "09:30";
    const shiftEndTime = employee.shiftEndTime || company?.settings?.shiftEndTime || "18:30";
    const graceMinutes = geoSettings.gracePeriodMinutes !== undefined ? geoSettings.gracePeriodMinutes : 15;
    const earlyGraceMinutes = geoSettings.earlyLeaveGracePeriodMinutes !== undefined ? geoSettings.earlyLeaveGracePeriodMinutes : 10;

    // Update active session in punchLog if it exists
    if (activeSessionIndex >= 0) {
      attendance.punchLog[activeSessionIndex].punchOutTime = now;
      attendance.punchLog[activeSessionIndex].punchOutLocation = punchLocation;
      if (punchOutSelfie) {
        attendance.punchLog[activeSessionIndex].punchOutSelfie = punchOutSelfie;
      }
    }

    attendance.punchOutTime = now;
    attendance.punchOutLocation = punchLocation;
    
    // Calculate total hours from all completed sessions in punchLog
    let totalHours = calcTotalSessionHours(attendance.punchLog);
    // Fallback if punchLog is somehow empty or calculation fails
    if (totalHours === 0 && attendance.punchInTime && attendance.punchOutTime) {
      totalHours = calcHours(attendance.punchInTime, attendance.punchOutTime);
    }
    attendance.totalHours = totalHours;

    // Recalculate status
    let finalStatus = "present";
    const isLate = checkIsLate(attendance.punchInTime, shiftStartTime, graceMinutes);
    const isEarlyLeave = checkIsEarlyLeave(now, shiftEndTime, earlyGraceMinutes);

    // Get dynamic hours config
    const halfDayHours = company?.settings?.halfDayHours || 4;
    const fullDayHours = company?.settings?.fullDayHours || 8;

    // Hours completed override the strict penalties
    if (totalHours >= fullDayHours) {
      finalStatus = isLate ? "late" : "present";
    } else if (totalHours >= halfDayHours) {
      finalStatus = "half_day";
    } else {
      finalStatus = "absent";
    }

    attendance.status = finalStatus;

    // Geo snapshot fields
    attendance.distanceFromOffice = distanceFromOffice !== null ? Math.round(distanceFromOffice) : null;
    attendance.locationType = locationType;
    attendance.gpsValidated = gpsValidated;
    attendance.officeLocationSnapshot = {
      latitude: geoSettings.latitude,
      longitude: geoSettings.longitude,
      radius: geoSettings.allowedRadiusMeters,
    };
    if (punchOutSelfie) attendance.punchOutSelfie = punchOutSelfie;

    await attendance.save();

    // Deactivate location tracking on Punch Out
    Employee.findByIdAndUpdate(employee._id, {
      $set: {
        "lastLocation.isTrackingActive": false,
      },
    }).catch(() => {});

    // Single deduplicated asynchronous notification dispatch
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    notifyAttendancePunch({
      companyId: req.companyId,
      employee,
      action: "punch_out",
      timeStr,
      totalHours: formatTotalHours(totalHours),
      attendanceId: attendance._id
    }).catch((err) => console.error("[AttendanceNotify] Async punch-out notify error:", err));

    return res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/my-today
const myToday = async (req, res, next) => {
  try {
    console.log("DB QUERY: getMyToday");
    const employee = await resolveEmployeeForUser(req);
    if (!employee) {
      return res.json({ success: true, attendance: null });
    }
    const today = getDateKey(new Date());
    const attendance = await Attendance.findOne({
      companyId: req.companyId,
      employeeId: employee._id,
      date: today,
    }).lean();
    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/my-date/:date
const myDate = async (req, res, next) => {
  try {
    console.log("DB QUERY: getMyDate");
    const employee = await resolveEmployeeForUser(req);
    if (!employee) {
      return res.status(403).json({ message: "Employee profile required" });
    }
    const attendance = await Attendance.findOne({
      companyId: req.companyId,
      employeeId: employee._id,
      date: req.params.date,
    }).lean();
    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/my-monthly
const myMonthly = async (req, res, next) => {
  try {
    console.log("DB QUERY: getMyMonthly");
    const employee = await resolveEmployeeForUser(req);
    if (!employee) {
      return res.status(403).json({ message: "Employee profile required" });
    }

    const targetMonth = Number(req.query.month) || new Date().getMonth() + 1;
    const targetYear = Number(req.query.year) || new Date().getFullYear();
    const effectiveCompanyId = req.companyId || employee.companyId;

    // Fetch existing records for this month
    const records = await Attendance.find({
      companyId: effectiveCompanyId,
      employeeId: employee._id,
      month: targetMonth,
      year: targetYear,
    }).lean();

    const company = await Company.findById(effectiveCompanyId);
    const settings = company?.settings || {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    };
    const workingDays = settings.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // Fetch holidays
    const holidays = await Holiday.find({
      companyId: effectiveCompanyId,
      date: {
        $gte: new Date(targetYear, targetMonth - 1, 1),
        $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59),
      },
    });

    // Fetch approved leaves
    const leaves = await Leave.find({
      companyId: effectiveCompanyId,
      employeeId: employee._id,
      status: "approved",
      $or: [
        { startDate: { $lte: new Date(targetYear, targetMonth, 0) } },
        { endDate: { $gte: new Date(targetYear, targetMonth - 1, 1) } }
      ]
    });

    // Construct grid
    const totalDays = new Date(targetYear, targetMonth, 0).getDate();
    const daysGrid = [];
    const todayStr = getDateKey(new Date());

    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      halfDays: 0,
      paidLeaves: 0,
      unpaidLeaves: 0,
    };

    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(targetYear, targetMonth - 1, day);
      const dateStr = getDateKey(currentDate);

      // Check if future day
      const isFuture = dateStr > todayStr;

      // 1. Search database
      const dbRecord = records.find((r) => r.date === dateStr);

      if (dbRecord) {
        daysGrid.push({
          date: dateStr,
          day,
          status: dbRecord.status,
          punchInTime: dbRecord.punchInTime,
          punchOutTime: dbRecord.punchOutTime,
          totalHours: dbRecord.totalHours,
          source: dbRecord.source,
          regularizationStatus: dbRecord.regularizationStatus,
          punchInSelfie: dbRecord.punchInSelfie,
          punchOutSelfie: dbRecord.punchOutSelfie,
          punchInLocation: dbRecord.punchInLocation,
          punchOutLocation: dbRecord.punchOutLocation,
          distanceFromOffice: dbRecord.distanceFromOffice,
          locationType: dbRecord.locationType,
          gpsValidated: dbRecord.gpsValidated,
          _id: dbRecord._id,
        });

        // Add to summary
        if (dbRecord.status === "present") summary.present++;
        else if (dbRecord.status === "late") summary.late++;
        else if (dbRecord.status === "absent") summary.absent++;
        else if (dbRecord.status === "half_day") summary.halfDays++;
        else if (dbRecord.status === "paid_leave") summary.paidLeaves++;
        else if (dbRecord.status === "unpaid_leave") summary.unpaidLeaves++;
      } else {
        // 2. Default calculated status
        let calculatedStatus = "absent";
        
        if (isFuture) {
          calculatedStatus = ""; // Future days show blank / empty
        } else {
          // Check approved leaves
          const matchedLeave = leaves.find(l => {
            const start = new Date(l.startDate);
            start.setHours(0,0,0,0);
            const end = new Date(l.endDate);
            end.setHours(23,59,59,999);
            return currentDate >= start && currentDate <= end;
          });

          if (matchedLeave) {
            calculatedStatus = matchedLeave.leaveType === "LWP" || matchedLeave.leaveType === "unpaid" ? "unpaid_leave" : "paid_leave";
            if (calculatedStatus === "paid_leave") summary.paidLeaves++;
            else summary.unpaidLeaves++;
          } else {
            // Check holidays
            const isHoliday = holidays.find(h => getDateKey(new Date(h.date)) === dateStr);
            if (isHoliday) {
              calculatedStatus = "holiday";
            } else {
              // Check weekly off
              const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
              const isWorking = workingDays.includes(dayName);
              if (!isWorking) {
                calculatedStatus = "weekly_off";
              } else {
                summary.absent++;
              }
            }
          }
        }

        daysGrid.push({
          date: dateStr,
          day,
          status: calculatedStatus,
          punchInTime: null,
          punchOutTime: null,
          totalHours: 0,
          source: "system",
          regularizationStatus: "none",
        });
      }
    }

    res.json({
      success: true,
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
        },
        month: targetMonth,
        year: targetYear,
        summary,
        days: daysGrid,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/regularization
const regularizationRequest = async (req, res, next) => {
  try {
    if (handleValidation(req, res)) return;
    const employee = await resolveEmployeeForUser(req);
    if (!employee) {
      return res.status(403).json({ message: "Employee profile required" });
    }

    // Try to find by ID
    let attendance = await Attendance.findOne({
      _id: req.body.attendanceId,
      companyId: req.companyId,
      employeeId: employee._id,
    });

    // Fallback: If attendance doesn't exist yet (missed punch absent), create a dummy one
    if (!attendance && req.body.date) {
      const dateParts = req.body.date.split("-").map(Number);
      attendance = new Attendance({
        companyId: req.companyId,
        employeeId: employee._id,
        userId: req.user._id,
        date: req.body.date,
        month: dateParts[1] || new Date().getMonth() + 1,
        year: dateParts[0] || new Date().getFullYear(),
        status: "absent",
        source: "system",
      });
    }

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record or date not found" });
    }

    attendance.regularizationStatus = "pending";
    attendance.regularizationReason = req.body.reason;
    attendance.regularizationLocation = req.body.location || {};
    attendance.approvedBy = null;
    await attendance.save();

    // Notify HR
    await notifyRole(
      req.companyId,
      "HR",
      "Regularization Request",
      `${employee.firstName} ${employee.lastName} requested attendance regularization for ${attendance.date}`,
      "attendance",
      { attendanceId: attendance._id.toString() }
    );

    // Notify Manager
    if (employee.reportingManagerId) {
      const manager = await Employee.findById(employee.reportingManagerId).select("userId");
      if (manager && manager.userId) {
        await notifyUser(
          manager.userId,
          req.companyId,
          "Regularization Request",
          `${employee.firstName} ${employee.lastName} requested attendance regularization for ${attendance.date}`,
          "attendance",
          { attendanceId: attendance._id.toString() }
        );
      }
    }

    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// GET /api/company/attendance AND GET /api/hr/attendance
const companyAttendance = async (req, res, next) => {
  try {
    const { date, month, year, status, departmentId, search } = req.query;
    const filter = { companyId: req.companyId };

    if (date) filter.date = date;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    let employeesFilter = { companyId: req.companyId };
    if (departmentId) employeesFilter.departmentId = departmentId;
    if (search) {
      const regex = new RegExp(search, "i");
      employeesFilter.$or = [
        { firstName: regex },
        { lastName: regex },
        { employeeCode: regex }
      ];
    }

    const matchedEmployees = await Employee.find(employeesFilter).select("_id");
    const empIds = matchedEmployees.map((e) => e._id);
    filter.employeeId = { $in: empIds };

    const records = await Attendance.find(filter)
      .populate({
        path: "employeeId",
        select: "employeeCode firstName lastName photo documents departmentId designationId userId",
        populate: [
          { path: "designationId", select: "name" },
          { path: "departmentId", select: "name" },
          { path: "userId", select: "role profileImage" }
        ]
      })
      .sort({ date: -1, createdAt: -1 });

    const normalizedRecords = records.map((rec) => {
      const doc = rec.toObject ? rec.toObject() : { ...rec };
      if (doc.employeeId) {
        doc.employeeId.photo =
          doc.employeeId.photo ||
          doc.employeeId.documents?.photo ||
          doc.employeeId.userId?.profileImage ||
          "";
      }
      return doc;
    });

    res.json({ success: true, attendance: normalizedRecords, count: normalizedRecords.length });
  } catch (error) {
    next(error);
  }
};

// GET /api/company/attendance/:employeeId/monthly AND GET /api/hr/attendance/:employeeId/monthly
const employeeAttendance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const targetMonth = Number(req.query.month) || new Date().getMonth() + 1;
    const targetYear = Number(req.query.year) || new Date().getFullYear();

    const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const records = await Attendance.find({
      companyId: req.companyId,
      employeeId,
      month: targetMonth,
      year: targetYear,
    }).sort({ date: -1 });

    res.json({ success: true, attendance: records, count: records.length });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/company/attendance/:id/manual-update AND PATCH /api/hr/attendance/:id/manual-update
const manualUpdateAttendance = async (req, res, next) => {
  try {
    const { status, punchInTime, punchOutTime, manualReason, employeeId, date } = req.body;
    let attendance;
    
    const mongoose = require("mongoose");
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      attendance = await Attendance.findOne({ _id: req.params.id, companyId: req.companyId });
    }
    
    if (!attendance && employeeId && date) {
      attendance = await Attendance.findOne({
        companyId: req.companyId,
        employeeId,
        date,
      });
      
      if (!attendance) {
        const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
        const dateParts = date.split("-").map(Number);
        attendance = new Attendance({
          companyId: req.companyId,
          employeeId: employee._id,
          userId: employee.userId || req.user._id,
          date,
          month: dateParts[1] || new Date().getMonth() + 1,
          year: dateParts[0] || new Date().getFullYear(),
          status: "absent",
          source: "manual",
        });
      }
    }

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Role boundary checks for HR
    if (req.user.role === "HR") {
      // HR cannot edit own attendance
      if (attendance.userId.toString() === req.user._id.toString()) {
        return res.status(403).json({ message: "You cannot authorize or edit your own attendance. Please contact Company Admin." });
      }
      
      // HR cannot edit Admin attendance
      const targetUser = await User.findById(attendance.userId);
      if (targetUser && targetUser.role === "CompanyAdmin") {
        return res.status(403).json({ message: "HR cannot edit CompanyAdmin attendance records." });
      }
    }

    const oldData = { ...attendance.toObject() };

    // Format new times
    if (punchInTime) {
      const [h, m] = punchInTime.split(":");
      const inDate = attendance.punchInTime ? new Date(attendance.punchInTime) : new Date(attendance.date);
      inDate.setHours(Number(h), Number(m), 0, 0);
      attendance.punchInTime = inDate;
    }
    
    if (punchOutTime) {
      const [h, m] = punchOutTime.split(":");
      const outDate = attendance.punchOutTime ? new Date(attendance.punchOutTime) : new Date(attendance.date);
      outDate.setHours(Number(h), Number(m), 0, 0);
      attendance.punchOutTime = outDate;
    }

    if (attendance.punchInTime && attendance.punchOutTime) {
      attendance.totalHours = calcHours(attendance.punchInTime, attendance.punchOutTime);
    }

    attendance.status = status || attendance.status;
    attendance.source = "manual";
    attendance.isManuallyUpdated = true;
    attendance.manualStatus = status;
    attendance.manualReason = manualReason || "Admin manual correction";
    attendance.updatedBy = req.user._id;

    await attendance.save();

    // Create Audit Log
    await AuditLog.create({
      action: "MANUAL_CORRECTION",
      module: "ATTENDANCE",
      performedBy: req.user._id,
      companyId: req.companyId,
      oldData,
      newData: attendance.toObject(),
    });

    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/company/attendance/:id AND DELETE /api/hr/attendance/:id
const deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Role boundary checks for HR
    if (req.user.role === "HR") {
      if (attendance.userId.toString() === req.user._id.toString()) {
        return res.status(403).json({ message: "HR cannot delete own attendance logs." });
      }
      const targetUser = await User.findById(attendance.userId);
      if (targetUser && targetUser.role === "CompanyAdmin") {
        return res.status(403).json({ message: "HR cannot delete CompanyAdmin attendance logs." });
      }
    }

    const oldData = { ...attendance.toObject() };
    await Attendance.deleteOne({ _id: req.params.id });

    // Create Audit Log
    await AuditLog.create({
      action: "DELETE_RECORD",
      module: "ATTENDANCE",
      performedBy: req.user._id,
      companyId: req.companyId,
      oldData,
      newData: null,
    });

    res.json({ success: true, message: "Attendance record deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /api/company/attendance-settings
const getSettings = async (req, res, next) => {
  try {
    const settings = await getCompanyAttendanceSettings(req.companyId);
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// PUT /api/company/attendance-settings
const updateSettings = async (req, res, next) => {
  try {
    let settings = await CompanyAttendanceSettings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = new CompanyAttendanceSettings({ companyId: req.companyId });
    }

    const {
      officeName,
      latitude,
      longitude,
      allowedRadiusMeters,
      attendanceMode,
      requireGps,
      requireSelfie,
      allowAdminBypassGeoFencing,
      enableAttendanceModule,
      gracePeriodMinutes,
      autoHalfDayOnLate,
      earlyLeaveGracePeriodMinutes,
      autoHalfDayOnEarlyLeave
    } = req.body;

    if (officeName !== undefined) settings.officeName = officeName;
    if (latitude !== undefined) settings.latitude = latitude !== null ? Number(latitude) : null;
    if (longitude !== undefined) settings.longitude = longitude !== null ? Number(longitude) : null;
    if (allowedRadiusMeters !== undefined) settings.allowedRadiusMeters = Number(allowedRadiusMeters);
    if (attendanceMode !== undefined) settings.attendanceMode = attendanceMode;
    if (requireGps !== undefined) settings.requireGps = Boolean(requireGps);
    if (requireSelfie !== undefined) settings.requireSelfie = Boolean(requireSelfie);
    if (allowAdminBypassGeoFencing !== undefined) settings.allowAdminBypassGeoFencing = Boolean(allowAdminBypassGeoFencing);
    if (enableAttendanceModule !== undefined) settings.enableAttendanceModule = Boolean(enableAttendanceModule);
    if (gracePeriodMinutes !== undefined) settings.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (autoHalfDayOnLate !== undefined) settings.autoHalfDayOnLate = Boolean(autoHalfDayOnLate);
    if (earlyLeaveGracePeriodMinutes !== undefined) settings.earlyLeaveGracePeriodMinutes = Number(earlyLeaveGracePeriodMinutes);
    if (autoHalfDayOnEarlyLeave !== undefined) settings.autoHalfDayOnEarlyLeave = Boolean(autoHalfDayOnEarlyLeave);
    if (req.body.allowMultiBranchPunch !== undefined) settings.allowMultiBranchPunch = Boolean(req.body.allowMultiBranchPunch);
    if (req.body.restrictToAssignedBranches !== undefined) settings.restrictToAssignedBranches = Boolean(req.body.restrictToAssignedBranches);

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/validate-location
const validateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    
    const settings = await getCompanyAttendanceSettings(req.companyId);

    // If GPS is required but coordinates not provided
    if (settings.requireGps && (latitude === undefined || longitude === undefined || latitude === null || longitude === null)) {
      return res.status(400).json({
        success: false,
        message: "GPS coordinates are required for attendance location validation.",
      });
    }

    const employee = await resolveEmployeeForUser(req);
    const matchResult = await matchOfficeOrBranch({
      companyId: req.companyId,
      employee,
      latitude,
      longitude,
      geoSettings: settings,
    });

    let insideArea = matchResult.insideArea;
    const isRemoteAllowed = employee && (
      employee.allowRemotePunch || 
      employee.workMode === "remote" || 
      employee.workMode === "hybrid" || 
      (settings.allowAdminBypassGeoFencing && 
       (req.user.role === "CompanyAdmin" || req.user.role === "Manager" || req.user.role === "HR"))
    );

    if (isRemoteAllowed) {
      insideArea = true;
    }

    res.json({
      success: true,
      data: {
        insideArea,
        distance: matchResult.distanceFromOffice !== null ? matchResult.distanceFromOffice : 0,
        allowedRadius: matchResult.allowedRadius,
        matchedBranch: matchResult.matchedBranch,
        officeName: matchResult.officeName || matchResult.nearestOfficeName,
        attendanceMode: settings.attendanceMode,
        requireSelfie: settings.requireSelfie,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Regularization Approvals
const approveRegularization = async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Role boundary checks for HR
    if (req.user.role === "HR") {
      const targetUser = await User.findById(attendance.userId);
      if (targetUser && targetUser.role === "CompanyAdmin") {
        return res.status(403).json({ message: "HR cannot approve CompanyAdmin regularizations." });
      }
    }

    const settings = await CompanyAttendanceSettings.findOne({ companyId: req.companyId }).lean();
    const fullDayHours = settings?.fullDayHours || 8;

    attendance.regularizationStatus = "approved";
    attendance.status = "present"; // Automatically marks as present
    
    if (!attendance.totalHours || attendance.totalHours < fullDayHours) {
      attendance.totalHours = fullDayHours;
    }

    if (!attendance.punchInTime) {
      const shiftStartTime = settings?.shiftStartTime || "09:30";
      const [h, m] = shiftStartTime.split(":").map(Number);
      const inDate = new Date(attendance.date);
      inDate.setHours(h, m, 0, 0);
      attendance.punchInTime = inDate;
    }
    if (!attendance.punchOutTime && attendance.punchInTime) {
      const outDate = new Date(attendance.punchInTime);
      outDate.setHours(outDate.getHours() + fullDayHours);
      attendance.punchOutTime = outDate;
    }

    attendance.approvedBy = req.user._id;
    await attendance.save();

    // Notify Employee
    const employee = await Employee.findById(attendance.employeeId).select("userId");
    if (employee && employee.userId) {
      await notifyUser(
        employee.userId,
        req.companyId,
        "Regularization Approved",
        `Your attendance regularization request for ${attendance.date} was approved.`,
        "attendance",
        { attendanceId: attendance._id.toString() }
      );
    }

    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

const rejectRegularization = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const attendance = await Attendance.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Role boundary for HR
    if (req.user.role === "HR") {
      const targetUser = await User.findById(attendance.userId);
      if (targetUser && targetUser.role === "CompanyAdmin") {
        return res.status(403).json({ message: "HR cannot reject CompanyAdmin regularizations." });
      }
    }

    attendance.regularizationStatus = "rejected";
    attendance.regularizationRejectionReason = rejectionReason;
    attendance.approvedBy = req.user._id;
    await attendance.save();

    // Notify Employee
    const employee = await Employee.findById(attendance.employeeId).select("userId");
    if (employee && employee.userId) {
      await notifyUser(
        employee.userId,
        req.companyId,
        "Regularization Rejected",
        `Your attendance regularization request for ${attendance.date} was rejected. Reason: ${rejectionReason}`,
        "attendance",
        { attendanceId: attendance._id.toString() }
      );
    }

    res.json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

const getRegularizationRequests = async (req, res, next) => {
  try {
    const filter = { companyId: req.companyId, regularizationStatus: "pending" };
    const requests = await Attendance.find(filter)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeCode photo documents departmentId userId",
        populate: [
          { path: "departmentId", select: "name" },
          { path: "userId", select: "role profileImage" }
        ]
      })
      .sort({ updatedAt: -1 });

    const normalizedRequests = requests.map((reqDoc) => {
      const doc = reqDoc.toObject ? reqDoc.toObject() : { ...reqDoc };
      if (doc.employeeId) {
        doc.employeeId.photo =
          doc.employeeId.photo ||
          doc.employeeId.documents?.photo ||
          doc.employeeId.userId?.profileImage ||
          "";
      }
      return doc;
    });

    res.json({ success: true, requests: normalizedRequests });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  myToday,
  myDate,
  myMonthly,
  regularizationRequest,
  companyAttendance,
  employeeAttendance,
  manualUpdateAttendance,
  deleteAttendance,
  getSettings,
  updateSettings,
  approveRegularization,
  rejectRegularization,
  getRegularizationRequests,
  validateLocation,
};
