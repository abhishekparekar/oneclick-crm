/**
 * Calculates the distance between two points in meters using the Haversine formula.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null ||
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return null;
  }

  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
};

module.exports = {
  calculateDistance,
};
