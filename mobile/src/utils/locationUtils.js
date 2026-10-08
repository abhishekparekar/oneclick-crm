/**
 * Location Utilities for Distance, Quality Filtering & Coordinate Sanitization
 */

/**
 * Calculate distance in kilometers between two GPS coordinates using Haversine formula
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of Earth in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(4));
};

/**
 * Calculate distance in meters between two GPS coordinates
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  return calculateDistanceKm(lat1, lon1, lat2, lon2) * 1000;
};

/**
 * Validates whether a GPS point satisfies high-accuracy thresholds
 * @param {Object} point - { latitude, longitude, accuracy, timestamp }
 * @param {Object|null} previousPoint - last accepted GPS point
 * @returns {boolean}
 */
export const isValidGpsPoint = (point, previousPoint = null) => {
  if (!point) return false;

  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  const accuracy = Number(point.accuracy);

  // 1. Boundary & numeric checks
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  // 2. Compute dynamic movement metrics if previous point exists
  let calculatedSpeedKmh = 0;
  let distMeters = 0;
  let timeDiffSeconds = 5;
  let isResumingFromStoppage = false;

  if (previousPoint && previousPoint.latitude && previousPoint.longitude) {
    distMeters = calculateDistanceMeters(
      previousPoint.latitude,
      previousPoint.longitude,
      lat,
      lng
    );

    timeDiffSeconds =
      point.timestamp && previousPoint.timestamp
        ? Math.max(0.5, Math.abs(new Date(point.timestamp) - new Date(previousPoint.timestamp)) / 1000)
        : 5;

    // A. Long Stoppage Check (> 2 minutes gap):
    // When stopped at a location for a long time (e.g. 1.5 hours at a shop/office),
    // require true displacement (>= 25 meters) before treating as movement resumption
    if (timeDiffSeconds > 120) {
      if (distMeters >= 25.0) {
        // User has started moving after stoppage (e.g. bike/walk started)
        isResumingFromStoppage = true;
        calculatedSpeedKmh = Math.min(60.0, (distMeters / timeDiffSeconds) * 3.6);
      } else {
        // User is still stationary at the same place.
        // Accept ONE stoppage anchor point every 5 minutes (300s) to keep server & lastAcceptedPoint alive
        if (timeDiffSeconds >= 300) {
          if (!isNaN(accuracy) && accuracy <= 35) {
            return true;
          }
        }
        // Discard stationary jitter (< 25m) while halted
        return false;
      }
    } else {
      // Normal continuous movement (< 2 minutes between points)
      calculatedSpeedKmh = (distMeters / timeDiffSeconds) * 3.6;

      // Discard stationary indoor GPS drift & multipath jitter (< 20 meters when stationary or low speed)
      const reportedSpeedKmh = (Number(point.speed) || 0) * 3.6;
      const effectiveSpeedKmh = Math.max(reportedSpeedKmh, calculatedSpeedKmh);
      if (distMeters < 20 && effectiveSpeedKmh < 3.8) {
        return false;
      }

      // Teleportation & impossible jump filter (e.g. > 85 km/h in city/suburban)
      if (distMeters > 35 && calculatedSpeedKmh > 85) {
        return false;
      }
    }
  }

  // 3. Dynamic speed evaluation for Bike/Car vs Walking
  const hardwareSpeedKmh = (Number(point.speed) || 0) * 3.6;
  const effectiveSpeedKmh = Math.max(hardwareSpeedKmh, calculatedSpeedKmh);

  // Strict Hardware Satellite GPS Filter: Phone GPS satellite chip gives <= 25 meters accuracy.
  // Cell Tower triangulation produces 50m - 1500m which causes wild jumps across town.
  // Drop all cell tower points completely!
  const PURE_GPS_MAX_ACCURACY = 25.0;
  if (!isNaN(accuracy) && accuracy > PURE_GPS_MAX_ACCURACY) {
    return false;
  }

  return true;
};

/**
 * Format timestamp into readable localized time
 */
export const formatLocationTime = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};
