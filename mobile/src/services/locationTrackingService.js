import Geolocation from "@react-native-community/geolocation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform, AppState, Alert, Linking } from "react-native";
import notifee, { AndroidImportance, AndroidForegroundServiceType } from "@notifee/react-native";
import api from "../api/api";
import { isValidGpsPoint } from "../utils/locationUtils";

const QUEUE_STORAGE_KEY = "@hrms_offline_location_queue";
const TRACKING_STATE_KEY = "@hrms_location_tracking_active";
const NOTIFICATION_CHANNEL_ID = "location_tracking_channel";
const NOTIFICATION_ID = "employee_location_tracking_notif";

// GPS points are collected every 2 seconds on bike/car and synced online every 5 minutes.
const BATCH_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between cloud uploads
const GPS_HEARTBEAT_INTERVAL_MS = 2000;        // 2 seconds between GPS polls

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
  timeout: 5000,
  maximumAge: 2000, // 2-second fresh cache allows streaming bike/car movement without dropping
  distanceFilter: 2, // Sensitive to real-world bike/car steps (2 meters)
  interval: 2000, // Android poll interval: 2 seconds
  fastestInterval: 1500, // Android fastest interval: 1.5 seconds
};

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.isLoopRunning = false;
    this.lastAcceptedPoint = null;
    this.isSyncing = false;
    this.appStateSubscription = null;
    this.syncIntervalTimer = null; // Dedicated 5-minute online sync timer
    // Holds the Notifee foreground service Promise resolve() function.
    // We NEVER call this until stopLocationTracking() so Android keeps the
    // native foreground service process alive indefinitely (Doze-proof).
    this.foregroundServiceResolver = null;
    // Timestamp of the last successful cloud upload.
    this.lastSyncTime = Date.now();
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
            "⚙️ अचूक ट्रॅकिंगसाठी २ महत्त्वाच्या परवानग्या",
            "स्क्रीन बंद असताना किंवा फोन खिशात असताना प्रवास अचूक मोजण्यासाठी खालील २ सोप्या पायऱ्या करा:\n\n" +
            "१. 'Battery' (किंवा App battery usage) वर क्लिक करा ➔ 'Unrestricted' (अप्रतिबंधित) निवडा.\n\n" +
            "२. 'Permissions' ➔ 'Location' वर क्लिक करा ➔ 'Allow all the time' (नेहमी अनुमती द्या) निवडा.",
            [
              { text: "नंतर (Later)", style: "cancel" },
              {
                text: "सेटिंग्ज उघडा (Open Settings)",
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (_) {
                    await notifee.openBatteryOptimizationSettings().catch(() => {});
                  }
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

      const isAppActive = AppState.currentState === "active";

      // Try as foreground service if app is active
      if (isAppActive) {
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
          return;
        } catch (fgsErr) {
          console.warn("[LocationService] Foreground service notification fallback:", fgsErr?.message);
        }
      }

      // Safe fallback: Standard ongoing notification if app is in background or OS disallows FGS
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

    // CRITICAL FIX: try/catch is INSIDE the while loop.
    // A transient GPS timeout, network error, or async exception will be caught
    // here and the loop will simply continue to the next iteration after a
    // brief pause — the loop can NEVER be killed by a single bad iteration.
    while (this.isTracking) {
      try {
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

        // 4. Sync queued batch to backend every 5 minutes.
        //    GPS points accumulate in AsyncStorage locally every 2 seconds.
        const now = Date.now();
        const msSinceLastSync = now - this.lastSyncTime;
        if (msSinceLastSync >= BATCH_SYNC_INTERVAL_MS) {
          console.log(`[LocationService] 5-min batch upload triggered (${Math.round(msSinceLastSync / 60000)} min since last sync)`);
          await this.syncQueuedLocations();
        }

        // 5. Sleep 2 seconds before next hardware GPS poll (takes location every 2s on bike/car)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (iterErr) {
        // Log the error but DO NOT break the loop — tracking must continue
        console.warn("[LocationService] Tracking iteration error (continuing):", iterErr?.message);
        // Brief pause before retrying so we don't spam errors in a tight loop
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    this.isLoopRunning = false;
    console.log("[LocationService] Background tracking loop exited cleanly");
  }

  /**
   * Acquire fresh GPS location with high accuracy and fallback
   */
  async pollCurrentGpsLocationAsync() {
    return new Promise((resolve) => {
      if (!this.isTracking) return resolve();

      // Safety timeout: 6s so loop is never blocked
      const safetyTimer = setTimeout(() => {
        console.warn("[LocationService] GPS poll safety timeout fired — continuing loop");
        resolve();
      }, 6000);

      const done = () => { clearTimeout(safetyTimer); resolve(); };

      // Attempt 1: High Accuracy GPS (4s timeout, 2s cache so Android hardware delivers continuous bike points)
      Geolocation.getCurrentPosition(
        (pos) => {
          if (pos && pos.coords) {
            this.handleNewGpsPoint(pos.coords);
          }
          done();
        },
        (err) => {
          // Attempt 2: Fallback to Network/Cell/WiFi location
          Geolocation.getCurrentPosition(
            (fallbackPos) => {
              if (fallbackPos && fallbackPos.coords) {
                this.handleNewGpsPoint(fallbackPos.coords);
              }
              done();
            },
            () => done(),
            { enableHighAccuracy: false, timeout: 3000, maximumAge: 3000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 2000 }
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

    // Start dedicated 5-minute cloud sync timer
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
    }
    this.syncIntervalTimer = setInterval(() => {
      if (this.isTracking) {
        console.log("[LocationService] ⏰ Dedicated 5-minute cloud sync timer fired!");
        this.syncQueuedLocations().catch(() => {});
      }
    }, BATCH_SYNC_INTERVAL_MS);

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

    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    await AsyncStorage.removeItem(TRACKING_STATE_KEY);

    // Flush any remaining queued locations before stopping
    await this.syncQueuedLocations();

    // CRITICAL: Resolve the Notifee foreground service Promise so Android
    // cleanly destroys the native foreground service process. This MUST be
    // called after sync so we don't lose in-flight data.
    if (this.foregroundServiceResolver) {
      try { this.foregroundServiceResolver(); } catch (_) {}
      this.foregroundServiceResolver = null;
    }

    await this.hideForegroundNotification();

    console.log("[LocationService] Location tracking stopped cleanly");
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

      // Issue 3 Fix: If background loop is already running (Notifee foreground service kept
      // JS alive after app swipe), do NOT call startLocationTracking again — this prevents
      // the duplicate "Tracking restarted" notification every time the user opens the app.
      if (active === "true" && this.isLoopRunning) {
        console.log("[LocationService] Background loop already running — skipping auto-resume (no duplicate start).");
        return;
      }

      // Check if employee has tracking enabled in stored profile
      const userRaw = await AsyncStorage.getItem("@auth_user");
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          if (u.isLocationTrackingEnabled === false) {
            console.log("[LocationService] Employee tracking is disabled by admin. Clearing tracking state.");
            await AsyncStorage.removeItem(TRACKING_STATE_KEY);
            return;
          }
        } catch (_) {}
      }

      if (active === "true" && !this.isTracking) {
        // Verify with backend that employee is actually on duty today.
        // IMPORTANT: Check the LAST session in punchLog, not the root punchOutTime field
        // which may be stale from an earlier session today.
        try {
          const res = await api.get("/attendance/my-today");
          const att = res.data?.attendance;

          // Determine duty status from last punchLog session
          let isOnDuty = false;
          if (att && Array.isArray(att.punchLog) && att.punchLog.length > 0) {
            const lastSession = att.punchLog[att.punchLog.length - 1];
            isOnDuty = Boolean(lastSession.punchInTime && !lastSession.punchOutTime);
          } else if (att && att.punchInTime && !att.punchOutTime) {
            // Fallback to root fields if punchLog is absent
            isOnDuty = true;
          }

          if (!isOnDuty) {
            console.log("[LocationService] Duty not active for today. Clearing tracking state.");
            await AsyncStorage.removeItem(TRACKING_STATE_KEY);
            return;
          }
        } catch (apiErr) {
          // Network offline — don't clear state, let it resume tracking
          // (tracking will self-stop when backend confirms punch-out on next sync)
          console.log("[LocationService] Could not verify today duty status (offline — continuing):", apiErr?.message);
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

      // Keep max 2000 points locally (covers ~2 hrs at 3.5s interval if network is down)
      if (queue.length > 2000) {
        queue.shift();
      }

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // Auto-trigger sync if 5 minutes have elapsed, or if 150+ points (~5 mins at 2s) have accumulated
      const now = Date.now();
      if ((now - this.lastSyncTime >= BATCH_SYNC_INTERVAL_MS || queue.length >= 150) && !this.isSyncing) {
        this.syncQueuedLocations().catch(() => {});
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
      let queue = [];
      if (raw) {
        try { queue = JSON.parse(raw); } catch (_) { queue = []; }
      }
      if (!Array.isArray(queue)) queue = [];

      // If queue is empty (e.g. employee was stationary for past 5 mins),
      // capture a fresh live location point so the server is guaranteed to update every 5 minutes!
      if (queue.length === 0 && this.isTracking) {
        try {
          const freshCoord = await this.getCurrentLocation();
          if (freshCoord && freshCoord.latitude && freshCoord.longitude) {
            queue.push({
              latitude: Number(freshCoord.latitude.toFixed(6)),
              longitude: Number(freshCoord.longitude.toFixed(6)),
              accuracy: Number(freshCoord.accuracy ? freshCoord.accuracy.toFixed(1) : 0),
              speed: freshCoord.speed && freshCoord.speed > 0 ? Number(freshCoord.speed.toFixed(2)) : 0,
              heading: freshCoord.heading && freshCoord.heading > 0 ? Number(freshCoord.heading.toFixed(1)) : 0,
              timestamp: new Date().toISOString(),
            });
            console.log("[LocationService] Captured 5-min live heartbeat point for empty queue");
          }
        } catch (hbErr) {
          console.warn("[LocationService] Heartbeat location capture notice:", hbErr?.message);
        }
      }

      if (queue.length === 0) return;

      this.isSyncing = true;
      console.log(`[LocationService] Starting batch upload of ${queue.length} GPS points to server...`);

      // Upload all queued points in chunks of 200 per API call
      // (prevents request body from being too large)
      const CHUNK_SIZE = 200;
      let totalSynced = 0;
      let shouldStop = false;

      for (let offset = 0; offset < queue.length; offset += CHUNK_SIZE) {
        const chunk = queue.slice(offset, offset + CHUNK_SIZE);
        try {
          const response = await api.post("/locations/sync", {
            locations: chunk,
          });

          if (response.data && response.data.success) {
            totalSynced += chunk.length;
            // If server says employee punched out, stop tracking cleanly
            if (response.data.trackingAllowed === false) {
              console.log("[LocationService] Duty ended (punched out). Stopping tracking...");
              shouldStop = true;
              break;
            }
          }
        } catch (chunkErr) {
          // Network failed mid-batch — stop uploading, keep remaining points for next sync
          console.warn("[LocationService] Chunk upload failed (network), will retry next batch:", chunkErr?.message);
          break;
        }
      }

      if (totalSynced > 0) {
        // Remove successfully uploaded points from local queue
        const remaining = queue.slice(totalSynced);
        if (remaining.length === 0 || shouldStop) {
          await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
        } else {
          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
        }
        console.log(`[LocationService] ✅ Batch upload complete: ${totalSynced} points sent, ${remaining.length} remaining locally`);
      }

      // Update timestamp so next scheduled sync fires from now
      this.lastSyncTime = Date.now();

      if (shouldStop) {
        await this.stopLocationTracking();
      }
    } catch (err) {
      console.warn("[LocationService] Batch sync failed (offline or network error), will retry next batch:", err?.message);
      // Still update lastSyncTime to prevent hammering the server on repeated failures
      this.lastSyncTime = Date.now();
    } finally {
      this.isSyncing = false;
    }
  }
}

// Export singleton instance
const locationTrackingService = new LocationTrackingService();

// Register Notifee Foreground Service task.
// As long as the Promise is pending, Android keeps the native Foreground Service
// worker process alive (immune to Doze mode and task-swipe).
try {
  notifee.registerForegroundService((notification) => {
    return new Promise((resolve) => {
      console.log("[LocationService] Native foreground service worker started — keeping alive");
      if (locationTrackingService) {
        locationTrackingService.foregroundServiceResolver = resolve;
        locationTrackingService.runBackgroundTrackingLoop().catch((err) => {
          console.warn("[LocationService] Background loop unexpected exit:", err?.message);
        });
      } else {
        resolve();
      }
    });
  });
} catch (err) {
  console.log("[LocationService] Foreground service registration notice:", err?.message);
}

export default locationTrackingService;
