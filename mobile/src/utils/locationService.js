import Geolocation from '@react-native-community/geolocation';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

/**
 * Unified Location Service for One Click Mobile
 * Captures GPS coordinates, handles permissions and fallbacks gracefully.
 * 
 * @returns {Promise<{latitude: number, longitude: number, address: string} | null>}
 */
export const captureGPSLocation = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'One Click needs access to your location for attendance verification.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return new Promise((resolve) => {
          Alert.alert(
            'Location Permission Denied',
            'Permission to access device GPS location was denied. Falling back to simulated office perimeter coordinates.',
            [
              {
                text: 'Use Simulated GPS',
                onPress: () => {
                  resolve({
                    latitude: Number((18.5204 + Math.random() * 0.01).toFixed(6)),
                    longitude: Number((73.8567 + Math.random() * 0.01).toFixed(6)),
                    address: 'iCoded HQ, Sector 5, Pune, Maharashtra (Simulated Coords)',
                  });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(null),
              },
            ]
          );
        });
      }
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          resolve({
            latitude: lat,
            longitude: lng,
            address: `Lat: ${lat}, Long: ${lng}`,
          });
        },
        (error) => {
          console.log('Native GPS error:', error);
          resolve({
            latitude: Number((18.5204 + Math.random() * 0.01).toFixed(6)),
            longitude: Number((73.8567 + Math.random() * 0.01).toFixed(6)),
            address: 'iCoded HQ, Sector 5, Pune, Maharashtra (Fallback Coords)',
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  } catch (err) {
    console.log('GPS capture error', err);
    return {
      latitude: Number((18.5204 + Math.random() * 0.01).toFixed(6)),
      longitude: Number((73.8567 + Math.random() * 0.01).toFixed(6)),
      address: 'iCoded HQ, Sector 5, Pune, Maharashtra (Simulated Coords)',
    };
  }
};
