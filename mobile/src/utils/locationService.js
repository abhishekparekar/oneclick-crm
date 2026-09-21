import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

// Use standard location provider to prevent PlayServicesLocationManager removeLocationUpdates NullPointerException
try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: "auto",
    enableBackgroundLocationUpdates: false,
    locationProvider: "auto",
  });
} catch (e) {
  console.warn("[LocationService] RNConfiguration notice:", e?.message);
}

/**
 * Unified Location Service for One Click Mobile
 * Captures accurate GPS coordinates with high accuracy and low accuracy fallback.
 * 
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, address: string}|null>}
 */
export const captureGPSLocation = async () => {
  try {
    if (Platform.OS === 'android') {
      try {
        const fineGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!fineGranted) {
          const res = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          const granted =
            res[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
            res[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          if (!granted) {
            console.warn("[LocationService] Location permissions denied by user");
            return null;
          }
        }
      } catch (permErr) {
        console.warn('Android location permission check error:', permErr);
      }
    }

    // Try High Accuracy first (GPS chip), with 7s timeout
    const getPos = (highAccuracy, timeout) =>
      new Promise((resolve, reject) => {
        try {
          Geolocation.getCurrentPosition(
            (position) => {
              if (position?.coords?.latitude && position?.coords?.longitude) {
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));
                const acc = position.coords.accuracy ? Number(position.coords.accuracy.toFixed(1)) : 10;
                resolve({
                  latitude: lat,
                  longitude: lng,
                  accuracy: acc,
                  address: `Lat: ${lat}, Long: ${lng}`,
                });
              } else {
                reject(new Error("Invalid coordinates"));
              }
            },
            (error) => reject(error),
            { enableHighAccuracy: highAccuracy, timeout, maximumAge: 10000 }
          );
        } catch (e) {
          reject(e);
        }
      });

    try {
      // 1. First attempt: High Accuracy GPS
      return await getPos(true, 7000);
    } catch (highErr) {
      console.warn("[LocationService] High accuracy GPS notice, trying network fallback:", highErr?.message);
      try {
        // 2. Fallback: Network / cell-tower location
        return await getPos(false, 4000);
      } catch (lowErr) {
        console.warn("[LocationService] Low accuracy GPS fallback error:", lowErr?.message);
        return null;
      }
    }
  } catch (err) {
    console.warn('GPS capture overall error:', err);
    return null;
  }
};
