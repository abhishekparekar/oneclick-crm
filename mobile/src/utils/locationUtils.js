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

  // 2. Accuracy check (reject poor / coarse accuracy > 55 meters)
  // Google Fused Location with high accuracy in city lanes typically gives 5m–45m.
  // Readings > 55m are coarse cellular/network guesses that create false location splits.
  if (!isNaN(accuracy) && accuracy > 55) {
    console.log(`[LocationFilter] Rejected GPS point due to poor accuracy: ${accuracy}m (> 55m limit)`);
    return false;
  }

  // 3. Teleportation, precision preservation & jitter check against previous point
  if (previousPoint && previousPoint.latitude && previousPoint.longitude) {
    const distMeters = calculateDistanceMeters(
      previousPoint.latitude,
      previousPoint.longitude,
      lat,
      lng
    );

    // If user has not moved noticeably (< 20m), do NOT overwrite a high-precision fix with a noisier one
    if (distMeters < 20 && previousPoint.accuracy && accuracy > (previousPoint.accuracy + 12)) {
      return false;
    }

    const timeDiffSeconds =
      point.timestamp && previousPoint.timestamp
        ? Math.abs(new Date(point.timestamp) - new Date(previousPoint.timestamp)) / 1000
        : 10;

    // Discard micro jitter (< 2 meters) if stationary
    if (distMeters < 2 && timeDiffSeconds < 10) {
      return false;
    }

    // Teleportation filter (traveling faster than 180 km/h = 50 m/s)
    if (timeDiffSeconds > 0) {
      const calculatedSpeed = distMeters / timeDiffSeconds;
      if (calculatedSpeed > 50 && distMeters > 500) {
        console.log(`[LocationFilter] Rejected impossible GPS jump: ${distMeters.toFixed(1)}m in ${timeDiffSeconds.toFixed(1)}s`);
        return false;
      }
    }
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
