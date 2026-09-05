import Geolocation from "@react-native-community/geolocation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform, AppState, Alert } from "react-native";
import notifee, { AndroidImportance, AndroidForegroundServiceType } from "@notifee/react-native";
import api from "../api/api";
import { isValidGpsPoint } from "../utils/locationUtils";

const QUEUE_STORAGE_KEY = "@hrms_offline_location_queue";
const TRACKING_STATE_KEY = "@hrms_location_tracking_active";
const NOTIFICATION_CHANNEL_ID = "location_tracking_channel";
const NOTIFICATION_ID = "employee_location_tracking_notif";

const BATCH_SYNC_INTERVAL_MS = 4000; // 4 seconds ultra-responsive sync
const GPS_HEARTBEAT_INTERVAL_MS = 3500; // 3.5 seconds active hardware poll

// Force Google Play Services FusedLocationProviderClient for high-precision sensor fusion (GPS + Wi-Fi + Cell)
try {
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: "always",
    enableBackgroundLocationUpdates: true,
    locationProvider: "playServices",
  });
} catch (e) {
  console.warn("[LocationService] setRNConfiguration notice:", e?.message);
}

const GPS_HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 7000,
  maximumAge: 3000, // 3-second fresh GPS cache prevents satellite dropouts on moving bike
  distanceFilter: 3, // Sensitive to real-world bike steps (3 meters)
  interval: 3500, // Android poll interval: 3.5 seconds
  fastestInterval: 2000, // Android fastest interval: 2 seconds
};

// Register Notifee Foreground Service task at file load
// This keeps the React Native JS thread awake when screen is off or app is minimized/closed
try {
  notifee.registerForegroundService((notification) => {
    return new Promise(async (resolve) => {
      console.log("[LocationService] Native foreground service worker running in background");
      if (locationTrackingService) {
        await locationTrackingService.runBackgroundTrackingLoop();
      }
      resolve();
    });
  });
} catch (err) {
  console.log("[LocationService] Foreground service registration notice:", err.message);
}

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.isLoopRunning = false;
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
          message: "One Click needs high accuracy location to track work travel and duty routes.",
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
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: "Background Location Access",
              message: "Please choose 'Allow all the time' so travel routes are recorded when screen is locked.",
              buttonPositive: "Allow All The Time",
            }
          );
        }
      }

      return true;
    } catch (err) {
      console.error("[LocationService] Error requesting permissions:", err);
      return false;
    }
  }

  /**
   * Check and prompt for Battery Optimization exemption (Unrestricted background)
   */
  async requestBatteryOptimizationExemption(showAlert = true) {
    if (Platform.OS !== "android") return;
    try {
      const isBatteryOptimized = await notifee.isBatteryOptimizationEnabled();
      if (isBatteryOptimized) {
        console.log("[LocationService] Battery optimization is active. Prompting user for Unrestricted...");
        if (showAlert) {
          Alert.alert(
            "🔋 Battery: 'Unrestricted' आवश्यक आहे",
            "बाईकवर प्रवास करताना फोन खिशात किंवा स्क्रीन बंद असताना ट्रॅकिंग सतत अचूक सुरू राहण्यासाठी, कृपया Battery Usage मध्ये 'Unrestricted' (कदापि थांबवू नका) निवडा.",
            [
              { text: "नंतर (Later)", style: "cancel" },
              {
                text: "सेटिंग्ज उघडा (Open Settings)",
                onPress: async () => {
                  try {
                    await notifee.openBatteryOptimizationSettings();
                  } catch (_) {}
                },
              },
            ],
            { cancelable: true }
          );
        }
      }
    } catch (err) {
      console.log("[LocationService] Battery optimization check notice:", err?.message);
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

      const foregroundTypes = [];
      if (AndroidForegroundServiceType && AndroidForegroundServiceType.LOCATION) {
        foregroundTypes.push(AndroidForegroundServiceType.LOCATION);
      }

      // Try as foreground service first with valid drawable icon
      try {
        await notifee.displayNotification({
          id: NOTIFICATION_ID,
          title: "Location Tracking Active",
          body: "Recording your real-time travel and duty location.",
          android: {
            channelId: NOTIFICATION_CHANNEL_ID,
            asForegroundService: true,
            ongoing: true,
            autoCancel: false,
            foregroundServiceTypes: foregroundTypes,
            pressAction: {
              id: "default",
            },
            smallIcon: "ic_notification",
          },
        });
      } catch (fgsErr) {
        console.warn("[LocationService] Foreground service notification fallback:", fgsErr?.message);
        // Fallback: Ongoing notification without foreground service flag if OS disallowed FGS start
        await notifee.displayNotification({
          id: NOTIFICATION_ID,
          title: "Location Tracking Active",
          body: "Recording your real-time travel and duty location.",
          android: {
            channelId: NOTIFICATION_CHANNEL_ID,
            ongoing: true,
            autoCancel: false,
            pressAction: {
              id: "default",
            },
            smallIcon: "ic_notification",
          },
        });
      }
    } catch (err) {
      console.warn("[LocationService] Notification display notice:", err?.message);
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
   * Continuous background tracking loop running inside Android Foreground Service
   * Survives app close, swipe away, and screen locks.
   */
  async runBackgroundTrackingLoop() {
    if (this.isLoopRunning) {
      console.log("[LocationService] Background tracking loop already running");
      return;
    }
    this.isLoopRunning = true;
    this.isTracking = true;
    console.log("[LocationService] Background tracking engine active");

    try {
      while (this.isTracking) {
        // 1. Verify tracking state from AsyncStorage
        const active = await AsyncStorage.getItem(TRACKING_STATE_KEY);
        if (active !== "true") {
          console.log("[LocationService] Storage indicates tracking inactive. Halting loop.");
          this.isTracking = false;
          break;
        }

        // 2. Late-Night Auto-Stop Check (Cut off after 12:00 AM / Midnight local time)
        const currentHour = new Date().getHours();
        if (currentHour < 5) {
          console.log(`[LocationService] Late night hour detected (${currentHour}:00). Auto-stopping tracking.`);
          await this.stopLocationTracking();
          break;
        }

        // 3. Force hardware GPS poll with high accuracy and network fallback
        await this.pollCurrentGpsLocationAsync();

        // 4. Sync queued batch to backend
        await this.syncQueuedLocations();

        // 5. Sleep 3.5 seconds before next hardware GPS poll (3-4 seconds frequency)
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }
    } catch (loopErr) {
      console.warn("[LocationService] Background tracking loop notice:", loopErr.message);
    } finally {
      this.isLoopRunning = false;
      console.log("[LocationService] Background tracking loop exited");
    }
  }

  /**
   * Acquire fresh GPS location with high accuracy and fallback
   */
  async pollCurrentGpsLocationAsync() {
    return new Promise((resolve) => {
      if (!this.isTracking) return resolve();

      // Attempt 1: High Accuracy GPS (10 seconds timeout)
      Geolocation.getCurrentPosition(
        (pos) => {
          if (pos && pos.coords) {
            this.handleNewGpsPoint(pos.coords);
          }
          resolve();
        },
        (err) => {
          // Attempt 2: Fallback to Network/Cell/WiFi location if satellite GPS timed out
          Geolocation.getCurrentPosition(
            (fallbackPos) => {
              if (fallbackPos && fallbackPos.coords) {
                this.handleNewGpsPoint(fallbackPos.coords);
              }
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /**
   * Start Location Tracking
   */
  async startLocationTracking() {
    // Check late-night cutoff (12:00 AM / Midnight)
    const currentHour = new Date().getHours();
    if (currentHour < 5) {
      console.log("[LocationService] Late night: Location tracking cannot be started");
      return { success: false, message: "Tracking cannot be started after 12:00 AM" };
    }

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

    // Display persistent notification with foreground service
    // This keeps the native process running even if the user swipes away the app
    await this.showForegroundNotification();

    // Check battery optimization settings so Android doesn't kill tracking when app is swiped away or phone screen is locked
    this.requestBatteryOptimizationExemption(true).catch(() => {});

    // Start background tracking worker loop
    this.runBackgroundTrackingLoop().catch(() => {});

    // Continuous watcher for instant movement updates
    try {
      this.watchId = Geolocation.watchPosition(
        (position) => {
          this.handleNewGpsPoint(position.coords);
        },
        (error) => {
          console.warn("[LocationService] GPS watch notice:", error.message);
        },
        GPS_HIGH_ACCURACY_OPTIONS
      );
    } catch (watchErr) {
      console.warn("[LocationService] watchPosition init notice:", watchErr);
    }

    // Handle AppState changes (when user opens app from background, trigger immediate sync)
    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active" && this.isTracking) {
          this.pollCurrentGpsLocationAsync();
          this.syncQueuedLocations();
        }
      });
    }

    console.log("[LocationService] Location tracking engine started successfully");
    return { success: true };
  }

  /**
   * Force-poll hardware GPS chip
   */
  pollCurrentGpsLocation() {
    this.pollCurrentGpsLocationAsync();
  }

  /**
   * Stop Location Tracking
   */
  async stopLocationTracking() {
    this.isTracking = false;
    this.isLoopRunning = false;

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

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
   * Auto-resume tracking if it was running before app was killed
   */
  async autoResumeTrackingIfActive() {
    try {
      const currentHour = new Date().getHours();
      if (currentHour < 5) {
        console.log("[LocationService] Late night hour detected (12:00 AM cut-off). Auto-resume aborted.");
        await AsyncStorage.removeItem(TRACKING_STATE_KEY);
        return;
      }

      const active = await AsyncStorage.getItem(TRACKING_STATE_KEY);
      if (active === "true" && !this.isTracking) {
        // Verify with backend that employee is actually on duty today
        try {
          const res = await api.get("/attendance/my-today");
          const att = res.data?.attendance;
          const isOnDuty = Boolean(att && att.punchInTime && !att.punchOutTime);
          if (!isOnDuty) {
            console.log("[LocationService] Duty not active for today. Clearing tracking state.");
            await AsyncStorage.removeItem(TRACKING_STATE_KEY);
            return;
          }
        } catch (apiErr) {
          console.log("[LocationService] Could not verify today duty status:", apiErr?.message);
        }

        console.log("[LocationService] Resuming background tracking session from storage state...");
        try {
          await this.startLocationTracking();
        } catch (startErr) {
          console.warn("[LocationService] Start tracking error during auto-resume:", startErr);
        }
      }
    } catch (err) {
      console.warn("[LocationService] Auto-resume check error:", err);
    }
  }

  /**
   * Get Current Location on-demand
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

    console.log(`[LocationService] Queued GPS point: ${point.latitude}, ${point.longitude} (acc: ${point.accuracy}m, spd: ${point.speed})`);
  }

  /**
   * Add valid GPS point to offline local queue in AsyncStorage
   */
  async enqueuePoint(point) {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(point);

      // Keep max 500 points in local storage if offline for hours
      if (queue.length > 500) {
        queue.shift();
      }

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // Trigger immediate sync for every new point (3-4 seconds real-time stream)
      if (queue.length >= 1 && !this.isSyncing) {
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
      const batchToSend = queue.slice(0, 40); // Send up to 40 points per batch

      const response = await api.post("/locations/sync", {
        locations: batchToSend,
      });

      if (response.data && response.data.success) {
        // If server says employee is not on duty (not punched in / punched out), immediately kill tracking
        if (response.data.trackingAllowed === false) {
          console.log("[LocationService] Duty hours inactive (not punched in / punched out). Shutting down tracking...");
          await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
          await this.stopLocationTracking();
          return;
        }

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
