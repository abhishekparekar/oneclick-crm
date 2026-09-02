import Geolocation from "@react-native-community/geolocation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform, AppState } from "react-native";
import notifee, { AndroidImportance } from "@notifee/react-native";
import api from "../api/api";
import { isValidGpsPoint } from "../utils/locationUtils";

const QUEUE_STORAGE_KEY = "@hrms_offline_location_queue";
const TRACKING_STATE_KEY = "@hrms_location_tracking_active";
const NOTIFICATION_CHANNEL_ID = "location_tracking_channel";
const NOTIFICATION_ID = "employee_location_tracking_notif";

const BATCH_SYNC_INTERVAL_MS = 30000; // 30 seconds
const GPS_HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 5, // Meters
};

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.syncIntervalId = null;
    this.isTracking = false;
    this.lastAcceptedPoint = null;
    this.isSyncing = false;
    this.appStateSubscription = null;
  }

  /**
   * Request required foreground, background, and notification permissions
   */
  async requestPermissions() {
    if (Platform.OS !== "android") return true;

    try {
      // 1. Notification Permission (Android 13+)
      if (Platform.Version >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      // 2. Foreground Location Permission
      const fineGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "One Click needs high accuracy location to track work travel and attendance.",
          buttonPositive: "Allow",
        }
      );

      if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn("[LocationService] Fine location permission denied");
        return false;
      }

      // 3. Background Location Permission (Android 10+ / API 29+)
      if (Platform.Version >= 29) {
        const bgGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );

        if (!bgGranted) {
          const bgRequest = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: "Background Location Access",
              message: "Allow background location so attendance and route tracking works when the app is minimized.",
              buttonPositive: "Allow All The Time",
            }
          );
          console.log("[LocationService] Background location result:", bgRequest);
        }
      }

      return true;
    } catch (err) {
      console.error("[LocationService] Error requesting permissions:", err);
      return false;
    }
  }

  /**
   * Setup Android Foreground Notification Channel & Display Status
   */
  async showForegroundNotification() {
    try {
      await notifee.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: "Employee Location Tracking",
        importance: AndroidImportance.LOW,
        vibration: false,
        lights: false,
      });

      await notifee.displayNotification({
        id: NOTIFICATION_ID,
        title: "Employee Location Tracking Active",
        body: "One Click is recording your real-time travel and duty location.",
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          asForegroundService: true,
          ongoing: true,
          pressAction: {
            id: "default",
          },
          smallIcon: "ic_launcher",
        },
      });
    } catch (err) {
      console.warn("[LocationService] Notification display notice:", err.message);
    }
  }

  /**
   * Remove Foreground Service Notification
   */
  async hideForegroundNotification() {
    try {
      await notifee.stopForegroundService();
      await notifee.cancelNotification(NOTIFICATION_ID);
    } catch (_) {}
  }

  /**
   * Start Location Tracking
   */
  async startLocationTracking() {
    if (this.isTracking) {
      console.log("[LocationService] Tracking is already active");
      return { success: true, message: "Tracking already running" };
    }

    const hasPerm = await this.requestPermissions();
    if (!hasPerm) {
      return { success: false, message: "Location permission denied" };
    }

    this.isTracking = true;
    await AsyncStorage.setItem(TRACKING_STATE_KEY, "true");

    // Display persistent notification
    await this.showForegroundNotification();

    // Start GPS Watcher
    this.watchId = Geolocation.watchPosition(
      (position) => {
        this.handleNewGpsPoint(position.coords);
      },
      (error) => {
        console.warn("[LocationService] GPS watch error:", error.message);
      },
      GPS_HIGH_ACCURACY_OPTIONS
    );

    // Start periodic batch sync timer
    this.syncIntervalId = setInterval(() => {
      this.syncQueuedLocations();
    }, BATCH_SYNC_INTERVAL_MS);

    // Handle AppState changes
    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active" && this.isTracking) {
          this.syncQueuedLocations();
        }
      });
    }

    console.log("[LocationService] Location tracking started successfully");
    return { success: true };
  }

  /**
   * Stop Location Tracking
   */
  async stopLocationTracking() {
    if (!this.isTracking) {
      return { success: true };
    }

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isTracking = false;
    await AsyncStorage.removeItem(TRACKING_STATE_KEY);
    await this.hideForegroundNotification();

    // Flush any remaining queued locations
    await this.syncQueuedLocations();

    console.log("[LocationService] Location tracking stopped");
    return { success: true };
  }

  /**
   * Check if Location Tracking is Active
   */
  isLocationTrackingActive() {
    return this.isTracking;
  }

  /**
   * Get Current Location on-demand
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  /**
   * Handle incoming raw GPS coordinate from device
   */
  async handleNewGpsPoint(coords) {
    if (!coords) return;

    const point = {
      latitude: Number(coords.latitude.toFixed(6)),
      longitude: Number(coords.longitude.toFixed(6)),
      accuracy: Number(coords.accuracy ? coords.accuracy.toFixed(1) : 0),
      altitude: coords.altitude ? Number(coords.altitude.toFixed(1)) : null,
      speed: coords.speed && coords.speed > 0 ? Number(coords.speed.toFixed(2)) : 0,
      heading: coords.heading && coords.heading > 0 ? Number(coords.heading.toFixed(1)) : 0,
      timestamp: new Date().toISOString(),
    };

    // Apply quality filters
    if (!isValidGpsPoint(point, this.lastAcceptedPoint)) {
      return;
    }

    this.lastAcceptedPoint = point;
    await this.enqueuePoint(point);

    console.log(`[LocationService] Queued GPS point: ${point.latitude}, ${point.longitude} (acc: ${point.accuracy}m)`);
  }

  /**
   * Add valid GPS point to offline local queue in AsyncStorage
   */
  async enqueuePoint(point) {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(point);

      // Keep max 200 points in local storage if offline for hours
      if (queue.length > 200) {
        queue.shift();
      }

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // If queue has 5 or more points, trigger immediate sync
      if (queue.length >= 5 && !this.isSyncing) {
        this.syncQueuedLocations();
      }
    } catch (err) {
      console.warn("[LocationService] Enqueue error:", err.message);
    }
  }

  /**
   * Batch Upload queued locations to backend
   */
  async syncQueuedLocations() {
    if (this.isSyncing) return;

    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return;

      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      this.isSyncing = true;
      const batchToSend = queue.slice(0, 30); // Send up to 30 points per batch

      const response = await api.post("/locations/sync", {
        locations: batchToSend,
      });

      if (response.data && response.data.success) {
        // Remove successfully synced points from queue
        const remaining = queue.slice(batchToSend.length);
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
        console.log(`[LocationService] Synced ${batchToSend.length} points to server, ${remaining.length} remaining in queue`);
      }
    } catch (err) {
      console.warn("[LocationService] Batch sync failed (offline or network error), will retry:", err.message);
    } finally {
      this.isSyncing = false;
    }
  }
}

// Export singleton instance
const locationTrackingService = new LocationTrackingService();
export default locationTrackingService;
