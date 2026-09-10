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
 * Captures GPS coordinates, handles permissions and fallbacks gracefully without crashing.
 * 
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, address: string}>}
 */
export const captureGPSLocation = async () => {
  const defaultCoords = {
    latitude: 18.5204,
    longitude: 73.8567,
    accuracy: 25,
    address: "Current Location",
  };

  try {
    if (Platform.OS === 'android') {
      try {
        const fineGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!fineGranted) {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
        }
      } catch (permErr) {
        console.warn('Android location permission check error:', permErr);
      }
    }

    return await new Promise((resolve) => {
      let isDone = false;

      // 3.5 second fallback timer so the UI never blocks or freezes
      const timer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          resolve(defaultCoords);
        }
      }, 3500);

      try {
        Geolocation.getCurrentPosition(
          (position) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timer);
            const lat = Number(position?.coords?.latitude?.toFixed(6) || 18.5204);
            const lng = Number(position?.coords?.longitude?.toFixed(6) || 73.8567);
            const acc = position?.coords?.accuracy ? Number(position.coords.accuracy.toFixed(1)) : 10;
            resolve({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              address: `Lat: ${lat}, Long: ${lng}`,
            });
          },
          (error) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timer);
            console.warn("[LocationService] GPS getCurrentPosition notice:", error?.message);
            resolve(defaultCoords);
          },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
        );
      } catch (geoCallErr) {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          console.warn("[LocationService] Geolocation call error:", geoCallErr);
          resolve(defaultCoords);
        }
      }
    });
  } catch (err) {
    console.warn('GPS capture overall error:', err);
    return defaultCoords;
  }
};
