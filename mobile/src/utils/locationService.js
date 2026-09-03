import Geolocation from '@react-native-community/geolocation';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

// Ensure Google Play Services Fused Location is initialized
try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: "always",
    enableBackgroundLocationUpdates: true,
    locationProvider: "playServices",
  });
} catch (e) {
  console.warn("[LocationService] RNConfiguration notice:", e?.message);
}

/**
 * Unified Location Service for One Click Mobile
 * Captures GPS coordinates, handles permissions and fallbacks gracefully.
 * 
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, address: string} | null>}
 */
export const captureGPSLocation = async () => {
  try {
    if (Platform.OS === 'android') {
      try {
        const fineGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        const coarseGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );

        if (!fineGranted && !coarseGranted) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);

          const fineResult = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
          const coarseResult = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

          if (
            fineResult !== PermissionsAndroid.RESULTS.GRANTED &&
            coarseResult !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            return null;
          }
        }
      } catch (permErr) {
        console.warn('Android location permission check error:', permErr);
      }
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = position.coords.accuracy ? Number(position.coords.accuracy.toFixed(1)) : 0;
          resolve({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            address: `Lat: ${lat}, Long: ${lng}`,
          });
        },
        (error) => {
          console.log('[captureGPSLocation] High accuracy attempt failed, falling back:', error?.message || error);
          // Fallback to coarse / cached fix if GPS satellite lock takes too long indoors
          Geolocation.getCurrentPosition(
            (fallbackPos) => {
              const lat = Number(fallbackPos.coords.latitude.toFixed(6));
              const lng = Number(fallbackPos.coords.longitude.toFixed(6));
              const acc = fallbackPos.coords.accuracy ? Number(fallbackPos.coords.accuracy.toFixed(1)) : 0;
              resolve({
                latitude: lat,
                longitude: lng,
                accuracy: acc,
                address: `Lat: ${lat}, Long: ${lng}`,
              });
            },
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 }
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  } catch (err) {
    console.log('GPS capture error', err);
    return null;
  }
};

