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

// GPS points sync online to backend every 5 minutes.
const BATCH_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// Configure Play Services location provider once
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
  timeout: 30000, // 30s timeout so watchPosition does not throw continuous error 3 timeouts when stopped
  maximumAge: 5000, // 5-second cache avoids dropping streaming movement
  distanceFilter: 3, // Sensitive to 3 meters movement - captures every curve, corner, and street turn
  interval: 3000, // Android hardware poll interval: 3 seconds
  fastestInterval: 2000, // Android fastest interval: 2 seconds
};

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.isLoopRunning = false;
    this.isPollingGps = false; // Mutex to prevent overlapping/concurrent getCurrentPosition calls
    this.lastAcceptedPoint = null;
    this.lastPointReceivedTime = Date.now();
    this.isSyncing = false;
    this.appStateSubscription = null;
    this.syncIntervalTimer = null;
    this.foregroundServiceResolver = null;
    this.lastSyncTime = Date.now();
    this.memoryQueue = [];
    this.queueLoaded = false;
    this.saveDiskTimer = null;
  }

  /**
   * Request required foreground, background, and notification permissions
   */
  async requestPermissions() {
    if (Platform.OS !== "android") return true;

    try {
      // 1. Notification Permission (Android 13+)
      if (Platform.Version >= 33) {
        try {
          const hasNotif = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          if (!hasNotif) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }
        } catch (_) {}
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
        try {
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
        } catch (bgErr) {
          console.warn("[LocationService] Background location permission check notice (non-fatal):", bgErr?.message);
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

      const androidOptions = {
        channelId: NOTIFICATION_CHANNEL_ID,
        asForegroundService: true,
        ongoing: true,
        autoCancel: false,
        pressAction: {
          id: "default",
        },
        smallIcon: "ic_notification",
      };

      if (
        AndroidForegroundServiceType &&
        AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION !== undefined
      ) {
        androidOptions.foregroundServiceTypes = [
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION,
        ];
      }

      await notifee.displayNotification({
        id: NOTIFICATION_ID,
        title: "OneClick HRMS • Duty Tracking Active",
        body: "Field duty active: Your route is being logged.",
        android: androidOptions,
      });
      console.log("[LocationService] Native Foreground Service notification active");
    } catch (err) {
      console.warn("[LocationService] Notification display error (non-fatal):", err?.message);
    }
  }

  /**
   * Remove Foreground Service Notification
   */
  async hideForegroundNotification() {
    try {
      await notifee.stopForegroundService();
    } catch (_) {}
    try {
      await notifee.cancelNotification(NOTIFICATION_ID);
    } catch (_) {}
  }

  /**
   * Ensure offline queue is loaded into memory
   */
  async ensureQueueLoaded() {
    if (this.queueLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryQueue = parsed;
        }
      }
    } catch (_) {}
    this.queueLoaded = true;
  }

  /**
   * Debounced save of memory queue to AsyncStorage (avoids heavy SQLite disk writes on every GPS tick)
   */
  saveQueueToDiskThrottled() {
    if (this.saveDiskTimer) return;
    this.saveDiskTimer = setTimeout(async () => {
      this.saveDiskTimer = null;
      try {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.memoryQueue));
      } catch (err) {
        console.warn("[LocationService] Disk queue persist notice:", err?.message);
      }
    }, 4000);
  }

  /**
   * Continuous background supervisor loop running inside Android Foreground Service
   * Runs a calm 15-second heartbeat tick (NO 2-second tight polling loops that crash Google Play Services)
   */
  async runBackgroundTrackingLoop() {
    if (this.isLoopRunning) {
      console.log("[LocationService] Background tracking loop already running");
      return;
    }
    this.isLoopRunning = true;
    this.isTracking = true;
    console.log("[LocationService] Background tracking engine active (15s supervisor tick)");

    while (this.isTracking) {
      try {
        // 1. Verify tracking state from AsyncStorage
        try {
          const active = await AsyncStorage.getItem(TRACKING_STATE_KEY);
          if (active === "false") {
            console.log("[LocationService] Storage indicates tracking explicitly stopped. Halting loop.");
            this.isTracking = false;
            break;
          }
        } catch (storageErr) {
          console.warn("[LocationService] AsyncStorage read notice (relying on memory state):", storageErr?.message);
        }

        // 2. Late-Night Auto-Stop Check (Cut off after 12:00 AM / Midnight local time)
        const currentHour = new Date().getHours();
        if (currentHour < 5) {
          console.log(`[LocationService] Late night hour detected (${currentHour}:00). Auto-stopping tracking.`);
          await this.stopLocationTracking();
          break;
        }

        // 3. Stoppage Heartbeat: ONLY IF no new GPS coordinate has arrived from watchPosition for > 3 minutes (180s)
        // (e.g. employee stationary inside shop/building where watchPosition distanceFilter hasn't triggered)
        const now = Date.now();
        const msSinceLastPoint = now - this.lastPointReceivedTime;
        if (msSinceLastPoint > 180000 && !this.isPollingGps) {
          console.log(`[LocationService] Stoppage detected (${Math.round(msSinceLastPoint / 1000)}s silent) - running single safe heartbeat poll`);
          this.pollCurrentGpsLocationAsync().catch(() => {});
        }

        // 4. Batch Upload queued points to cloud every 5 minutes OR if 100+ points accumulated
        const msSinceLastSync = now - this.lastSyncTime;
        if ((msSinceLastSync >= BATCH_SYNC_INTERVAL_MS || this.memoryQueue.length >= 100) && !this.isSyncing) {
          console.log(`[LocationService] 5-min batch upload triggered (${Math.round(msSinceLastSync / 60000)} min since sync, ${this.memoryQueue.length} points)`);
          this.syncQueuedLocations().catch(() => {});
        }

        // 5. Sleep 15 seconds before next supervisor heartbeat
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } catch (iterErr) {
        console.warn("[LocationService] Tracking iteration notice (continuing):", iterErr?.message);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    this.isLoopRunning = false;
    console.log("[LocationService] Background tracking loop exited cleanly");
  }

  /**
   * Acquire single fresh GPS location with strict mutex guarding
   * NEVER launches overlapping getCurrentPosition requests into Google Play Services!
   */
  async pollCurrentGpsLocationAsync() {
    if (!this.isTracking || this.isPollingGps) return;
    this.isPollingGps = true;

    return new Promise((resolve) => {
      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          this.isPollingGps = false;
          resolve();
        }
      };

      const safetyTimer = setTimeout(() => {
        console.warn("[LocationService] GPS poll safety timeout - continuing loop");
        finish();
      }, 12000);

      try {
        Geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(safetyTimer);
            if (pos && pos.coords) {
              this.handleNewGpsPoint(pos.coords);
            }
            finish();
          },
          (err) => {
            clearTimeout(safetyTimer);
            console.warn("[LocationService] Heartbeat GPS poll notice:", err?.message);
            finish();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      } catch (e) {
        clearTimeout(safetyTimer);
        finish();
      }
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
    this.lastPointReceivedTime = Date.now();
    await AsyncStorage.setItem(TRACKING_STATE_KEY, "true");

    // Display persistent notification with foreground service
    await this.showForegroundNotification();

    // Check battery optimization settings
    this.requestBatteryOptimizationExemption(true).catch(() => {});

    // Ensure offline queue is in memory
    await this.ensureQueueLoaded();

    // Start background supervisor loop
    this.runBackgroundTrackingLoop().catch(() => {});

    // Continuous watcher for instant movement updates (bike, car, walking)
    try {
      if (this.watchId !== null) {
        try { Geolocation.clearWatch(this.watchId); } catch (_) {}
        this.watchId = null;
      }
      this.watchId = Geolocation.watchPosition(
        (position) => {
          if (position && position.coords) {
            this.handleNewGpsPoint(position.coords);
          }
        },
        (error) => {
          // Log non-fatal notice. DO NOT clear and re-create watchPosition in loop!
          console.warn("[LocationService] GPS watch notice:", error?.message);
        },
        GPS_HIGH_ACCURACY_OPTIONS
      );
    } catch (watchErr) {
      console.warn("[LocationService] watchPosition init notice:", watchErr);
    }

    // Handle AppState changes: when returning to foreground, trigger batch sync
    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener("change", (nextState) => {
        try {
          if (nextState === "active" && this.isTracking) {
            this.syncQueuedLocations().catch(() => {});
          }
        } catch (stateErr) {
          console.warn("[LocationService] AppState change notice:", stateErr?.message);
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
    this.pollCurrentGpsLocationAsync().catch(() => {});
  }

  /**
   * Stop Location Tracking
   */
  async stopLocationTracking() {
    try {
      this.isTracking = false;
      this.isLoopRunning = false;
      this.isPollingGps = false;

      if (this.syncIntervalTimer) {
        clearInterval(this.syncIntervalTimer);
        this.syncIntervalTimer = null;
      }

      if (this.saveDiskTimer) {
        clearTimeout(this.saveDiskTimer);
        this.saveDiskTimer = null;
      }

      if (this.watchId !== null) {
        try { Geolocation.clearWatch(this.watchId); } catch (_) {}
        this.watchId = null;
      }

      if (this.appStateSubscription) {
        try { this.appStateSubscription.remove(); } catch (_) {}
        this.appStateSubscription = null;
      }

      await AsyncStorage.removeItem(TRACKING_STATE_KEY).catch(() => {});

      // Flush any remaining queued locations before stopping
      try {
        await this.syncQueuedLocations();
      } catch (syncErr) {
        console.warn("[LocationService] Pre-stop sync notice:", syncErr?.message);
      }

      // Resolve the Notifee foreground service Promise so Android cleanly destroys the native process
      if (this.foregroundServiceResolver) {
        try { this.foregroundServiceResolver(); } catch (_) {}
        this.foregroundServiceResolver = null;
      }

      await this.hideForegroundNotification();

      console.log("[LocationService] Location tracking stopped cleanly");
      return { success: true };
    } catch (stopErr) {
      console.warn("[LocationService] Stop tracking error (handled):", stopErr?.message);
      return { success: false, error: stopErr?.message };
    }
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

      if (active === "true" && (this.isLoopRunning || this.isTracking)) {
        console.log("[LocationService] Background loop already running — skipping auto-resume (no duplicate start).");
        return;
      }

      // Check if employee has tracking enabled in stored profile (support both user storage keys)
      const userRaw = (await AsyncStorage.getItem("hrms_user")) || (await AsyncStorage.getItem("@auth_user"));
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          if (u && u.isLocationTrackingEnabled === false) {
            console.log("[LocationService] Employee tracking is disabled by admin. Clearing tracking state.");
            await AsyncStorage.removeItem(TRACKING_STATE_KEY);
            return;
          }
        } catch (_) {}
      }

      if (active === "true" && !this.isTracking) {
        try {
          const res = await api.get("/attendance/my-today");
          const att = res.data?.attendance;

          let isPunchedOut = false;
          if (att && Array.isArray(att.punchLog) && att.punchLog.length > 0) {
            const lastSession = att.punchLog[att.punchLog.length - 1];
            isPunchedOut = Boolean(lastSession.punchInTime && lastSession.punchOutTime);
          } else if (att && att.punchInTime && att.punchOutTime) {
            isPunchedOut = true;
          }

          if (isPunchedOut) {
            console.log("[LocationService] Duty confirmed completed for today (punched out). Clearing tracking state.");
            await AsyncStorage.removeItem(TRACKING_STATE_KEY);
            return;
          }
        } catch (apiErr) {
          console.log("[LocationService] Could not verify today duty status (continuing tracking):", apiErr?.message);
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
   * Get Current Location on-demand with clean callback termination
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      let isDone = false;
      const finish = (coords, err) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeoutId);
          if (coords) resolve(coords);
          else reject(err || new Error("Location unavailable"));
        }
      };

      const timeoutId = setTimeout(() => {
        finish(null, new Error("Location acquisition timed out"));
      }, 15000);

      try {
        Geolocation.getCurrentPosition(
          (pos) => finish(pos?.coords, null),
          (err) => {
            try {
              Geolocation.getCurrentPosition(
                (fallbackPos) => finish(fallbackPos?.coords, null),
                (fallbackErr) => finish(null, fallbackErr || err),
                { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
              );
            } catch (fbEx) {
              finish(null, fbEx);
            }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      } catch (ex) {
        finish(null, ex);
      }
    });
  }

  /**
   * Handle incoming raw GPS coordinate from device
   */
  async handleNewGpsPoint(coords) {
    if (!coords) return;
    this.lastPointReceivedTime = Date.now();

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
   * Add valid GPS point to offline local queue with throttled disk persistence
   */
  async enqueuePoint(point) {
    try {
      await this.ensureQueueLoaded();

      this.memoryQueue.push(point);

      // Keep max 2000 points locally in queue
      if (this.memoryQueue.length > 2000) {
        this.memoryQueue.shift();
      }

      this.saveQueueToDiskThrottled();

      // Auto-trigger sync if 5 minutes have elapsed, or if 100+ points have accumulated
      const now = Date.now();
      if ((now - this.lastSyncTime >= BATCH_SYNC_INTERVAL_MS || this.memoryQueue.length >= 100) && !this.isSyncing) {
        this.syncQueuedLocations().catch(() => {});
      }
    } catch (err) {
      console.warn("[LocationService] Enqueue error:", err?.message);
    }
  }

  /**
   * Batch Upload queued locations to backend
   */
  async syncQueuedLocations() {
    if (this.isSyncing) return;

    try {
      await this.ensureQueueLoaded();

      // If queue is empty (e.g. employee was stationary for past 5 mins), capture a live heartbeat point
      if (this.memoryQueue.length === 0 && this.isTracking && !this.isPollingGps) {
        try {
          const freshCoord = await this.getCurrentLocation();
          if (freshCoord && freshCoord.latitude && freshCoord.longitude) {
            this.memoryQueue.push({
              latitude: Number(freshCoord.latitude.toFixed(6)),
              longitude: Number(freshCoord.longitude.toFixed(6)),
              accuracy: Number(freshCoord.accuracy ? freshCoord.accuracy.toFixed(1) : 0),
              speed: freshCoord.speed && freshCoord.speed > 0 ? Number(freshCoord.speed.toFixed(2)) : 0,
              heading: freshCoord.heading && freshCoord.heading > 0 ? Number(freshCoord.heading.toFixed(1)) : 0,
              timestamp: new Date().toISOString(),
            });
            this.lastPointReceivedTime = Date.now();
            console.log("[LocationService] Captured 5-min live heartbeat point for empty queue");
          }
        } catch (hbErr) {
          console.warn("[LocationService] Heartbeat location capture notice:", hbErr?.message);
        }
      }

      if (this.memoryQueue.length === 0) {
        this.lastSyncTime = Date.now();
        return;
      }

      this.isSyncing = true;
      const snapshot = [...this.memoryQueue];
      console.log(`[LocationService] Starting batch upload of ${snapshot.length} GPS points to server...`);

      const CHUNK_SIZE = 150;
      let totalSynced = 0;
      let shouldStop = false;

      for (let offset = 0; offset < snapshot.length; offset += CHUNK_SIZE) {
        const chunk = snapshot.slice(offset, offset + CHUNK_SIZE);
        try {
          const response = await api.post("/locations/sync", {
            locations: chunk,
          });

          if (response.data && response.data.success) {
            totalSynced += chunk.length;
            if (response.data.hasPunchedOut === true) {
              console.log("[LocationService] Duty confirmed ended (punched out). Stopping tracking...");
              shouldStop = true;
              break;
            }
          }
        } catch (chunkErr) {
          console.warn("[LocationService] Chunk upload failed (network), will retry next batch:", chunkErr?.message);
          break;
        }
      }

      if (totalSynced > 0) {
        // Remove successfully uploaded points from memory queue
        this.memoryQueue = this.memoryQueue.slice(totalSynced);
        try {
          if (this.memoryQueue.length === 0 || shouldStop) {
            await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
          } else {
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.memoryQueue));
          }
        } catch (_) {}
        console.log(`[LocationService] ✅ Batch upload complete: ${totalSynced} points sent, ${this.memoryQueue.length} remaining locally`);
      }

      this.lastSyncTime = Date.now();

      if (shouldStop) {
        await this.stopLocationTracking();
      }
    } catch (err) {
      console.warn("[LocationService] Batch sync failed (offline or network error), will retry next batch:", err?.message);
      this.lastSyncTime = Date.now();
    } finally {
      this.isSyncing = false;
    }
  }
}

// Export singleton instance
const locationTrackingService = new LocationTrackingService();

// Register Notifee Foreground Service task
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
