import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Pressable,
  Animated,
  Vibration,
  Platform,
  StatusBar,
  Image,
  PermissionsAndroid,
  Modal,
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraType } from "react-native-camera-kit";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import {
  punchInApi,
  punchOutApi,
  startBreakApi,
  endBreakApi,
  getMyTodayApi,
  validateLocationApi,
} from "../../api/attendanceService";
import { captureGPSLocation } from "../../utils/locationService";
import { promptEnableLocation } from "../../utils/locationEnabler";
import { uploadSelfieToFirebase } from "../../utils/firebaseStorage";
import locationTrackingService from "../../services/locationTrackingService";

const EmployeePunchScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { refreshEmployeeDashboard } = useAppData();

  const initialAction = route?.params?.initialAction || "in";
  // Data & State (instant render - no blocking loader!)
  const [loadingData, setLoadingData] = useState(false);
  const [todayRecord, setTodayRecord] = useState(route?.params?.todayRecord || null);
  const [action, setAction] = useState(initialAction); // 'in', 'out'

  // GPS State
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [isPunchDisabled, setIsPunchDisabled] = useState(false);
  const [matchedLocationName, setMatchedLocationName] = useState("");
  const [locationStatusMsg, setLocationStatusMsg] = useState("");

  // Camera & Live In-App Selfie State
  const [hasCameraPerm, setHasCameraPerm] = useState(false);
  const [selfieUri, setSelfieUri] = useState(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const [pressedIn, setPressedIn] = useState(false);
  const punchScaleAnim = useRef(new Animated.Value(1)).current;
  const lastPressRef = useRef(0); // debounce double-tap
  const cameraRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFocused = useIsFocused();

  // Break System State
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [submittingBreak, setSubmittingBreak] = useState(false);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);
  const [breaksSettings, setBreaksSettings] = useState(null);

  const triggerDashboardRefresh = () => {
    try {
      if (typeof refreshEmployeeDashboard === "function") {
        refreshEmployeeDashboard();
      }
    } catch (_) {}
  };

  // Stopwatch timer for active break
  useEffect(() => {
    let interval = null;
    if (todayRecord?.isOnBreak && todayRecord?.currentBreakStartTime) {
      const updateElapsed = () => {
        const diffSecs = Math.max(
          0,
          Math.floor((Date.now() - new Date(todayRecord.currentBreakStartTime).getTime()) / 1000)
        );
        setBreakElapsedSeconds(diffSecs);
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    } else {
      setBreakElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todayRecord?.isOnBreak, todayRecord?.currentBreakStartTime]);

  // Auto-open break modal when directed from Dashboard
  useEffect(() => {
    if (route?.params?.openBreakModal && !todayRecord?.isOnBreak) {
      setBreakModalVisible(true);
    }
  }, [route?.params?.openBreakModal, todayRecord?.isOnBreak]);

  const formatElapsed = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m ${secs < 10 ? "0" : ""}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const handleStartBreak = async (breakType) => {
    try {
      setSubmittingBreak(true);
      const res = await startBreakApi({ breakType });
      if (res?.data?.success) {
        setTodayRecord(res.data.attendance);
        setBreakModalVisible(false);
        triggerDashboardRefresh();
        Alert.alert(
          "Break Started",
          `${breakType === "lunch" ? "Lunch" : "Tea"} break started. Have a nice break!`
        );
      }
    } catch (err) {
      Alert.alert("Break Notice", err.response?.data?.message || "Failed to start break");
    } finally {
      setSubmittingBreak(false);
    }
  };

  const handleEndBreak = async () => {
    Alert.alert(
      "End Break Confirmation",
      "Ready to end your break and resume work?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Break",
          style: "default",
          onPress: async () => {
            try {
              setSubmittingBreak(true);
              const res = await endBreakApi();
              if (res?.data?.success) {
                setTodayRecord(res.data.attendance);
                triggerDashboardRefresh();
                Alert.alert("Welcome Back", "Your break has ended. Productive work resumed!");
              }
            } catch (err) {
              Alert.alert("Break Error", err.response?.data?.message || "Failed to end break");
            } finally {
              setSubmittingBreak(false);
            }
          },
        },
      ]
    );
  };

  // Animate punch button scale on press
  const animatePressIn = () => {
    Animated.spring(punchScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  const animatePressOut = () => {
    Animated.spring(punchScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const checkCameraPermission = async () => {
    try {
      if (Platform.OS === "android") {
        const check = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (check) {
          setHasCameraPerm(true);
          return true;
        }
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs camera access to take your attendance selfie.",
            buttonPositive: "OK",
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasCameraPerm(isGranted);
        return isGranted;
      }
      setHasCameraPerm(true);
      return true;
    } catch (err) {
      console.warn("Camera permission error:", err);
      return false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    checkCameraPermission();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initData = async () => {
    try {
      // 1. Fetch today record silently in background
      getMyTodayApi().then((todayRes) => {
        let record = null;
        if (todayRes?.data?.success) {
          record = todayRes.data.attendance;
          setTodayRecord(record);
          if (todayRes.data.breaksSettings) {
            setBreaksSettings(todayRes.data.breaksSettings);
          }
        }

        if (!record || !record.punchInTime) {
          setAction("in");
        } else if (record.punchLog && record.punchLog.length > 0) {
          const lastPunch = record.punchLog[record.punchLog.length - 1];
          if (!lastPunch.punchOutTime) {
            setAction("out");
          } else {
            setAction("in");
          }
        } else {
          if (!record.punchOutTime) setAction("out");
          else setAction("in");
        }
      }).catch((recErr) => {
        console.warn("Could not fetch today record:", recErr);
      });

      // 2. Capture GPS Location and validate office/branch boundary smoothly in background
      verifyLocation();
    } catch (err) {
      console.error("Init Error:", err);
      setCapturingGps(false);
      setGpsCaptured(true);
    }
  };

  const verifyLocation = async (userInitiated = false) => {
    try {
      setCapturingGps(true);
      setLocationStatusMsg("");

      // On Android, prompt to turn on Google Location Accuracy dialog (Image 2)
      if (Platform.OS === "android") {
        await promptEnableLocation();
      }

      const coords = await captureGPSLocation(true);

      if (!coords || !coords.latitude || !coords.longitude) {
        setGpsCoords(null);
        setGpsCaptured(false);
        setCapturingGps(false);
        setIsPunchDisabled(true);
        setLocationStatusMsg("Location is OFF. Please turn ON Location/GPS to punch attendance.");
        return;
      }

      setGpsCoords(coords);
      setGpsCaptured(true);
      setCapturingGps(false);

      try {
        const { data: res } = await validateLocationApi({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (res && res.success) {
          const isInside = res.data.insideArea;
          const isRestricted =
            !isInside &&
            res.data.attendanceMode === "office_only" &&
            !res.data.isRemoteAllowed;

          setIsPunchDisabled(isRestricted);

          if (isInside) {
            const locName = res.data.matchedBranch?.branchName || res.data.officeName || "Office Area";
            setMatchedLocationName(locName);
            setLocationStatusMsg("");
          } else {
            const dist = Math.round(res.data.distance || 0);
            const allowed = res.data.allowedRadius || 100;
            const nearest = res.data.officeName || "Office";
            setLocationStatusMsg(`You are ${dist}m away from ${nearest} (Allowed: ${allowed}m)`);
          }
        } else {
          setIsPunchDisabled(false);
        }
      } catch (valErr) {
        console.log("Location validation error:", valErr);
        setIsPunchDisabled(false);
      }
    } catch (gpsErr) {
      console.warn("GPS verification error:", gpsErr);
      setCapturingGps(false);
      setIsPunchDisabled(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initData();
    }, [])
  );

  const captureFromNativeCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraSide: "front",
        cameraType: "front",
        quality: 0.5,
        allowsEditing: false,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    } catch (pickerErr) {
      console.warn("[Camera] Native camera picker error:", pickerErr);
    }
    return null;
  };

  const handleCaptureSelfie = async (forceNative = false) => {
    if (capturingSelfie || submittingPunch) return null;
    try {
      setCapturingSelfie(true);

      let perm = hasCameraPerm;
      if (!perm) {
        perm = await checkCameraPermission();
        if (!perm) {
          Alert.alert(
            "Camera Permission Needed",
            "Please allow camera access to take your attendance selfie."
          );
          setCapturingSelfie(false);
          return null;
        }
      }

      // If user explicitly chose system camera
      if (forceNative) {
        const nativeUri = await captureFromNativeCamera();
        if (nativeUri) {
          setSelfieUri(nativeUri);
          setCapturingSelfie(false);
          return nativeUri;
        }
        setCapturingSelfie(false);
        return null;
      }

      // 1. Fast in-app camera capture attempt with 1500ms safety timeout to prevent hanging
      let capturedUri = null;
      if (cameraRef.current && typeof cameraRef.current.capture === "function") {
        try {
          const capturePromise = cameraRef.current.capture();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("In-app capture timeout")), 1500)
          );
          const photo = await Promise.race([capturePromise, timeoutPromise]);
          if (photo && photo.uri) {
            capturedUri = photo.uri;
          }
        } catch (captureErr) {
          console.log("[Camera] In-app camera capture notice:", captureErr?.message || captureErr);
        }
      }

      // 2. If in-app camera succeeded, use it
      if (capturedUri) {
        setSelfieUri(capturedUri);
        setCapturingSelfie(false);
        return capturedUri;
      }

      // 3. Fallback to native system camera (rock-solid on all devices)
      console.log("[Camera] In-app capture not available, launching system camera...");
      const fallbackUri = await captureFromNativeCamera();
      if (fallbackUri) {
        setSelfieUri(fallbackUri);
        setCapturingSelfie(false);
        return fallbackUri;
      }

      setCapturingSelfie(false);
      return null;
    } catch (err) {
      console.warn("Capture error:", err);
      setCapturingSelfie(false);
      return null;
    }
  };

  const executePunch = async (activeSelfie) => {
    try {
      setSubmittingPunch(true);

      let finalSelfieUri = activeSelfie || selfieUri;

      // Upload to Firebase if local file uri with 3-second timeout to prevent hanging
      if (finalSelfieUri && (finalSelfieUri.startsWith("file://") || finalSelfieUri.startsWith("/"))) {
        try {
          const uploadPromise = uploadSelfieToFirebase(
            finalSelfieUri,
            user?._id || "unknown"
          );
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firebase upload timeout")), 3000)
          );
          const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
          if (uploadedUrl) {
            finalSelfieUri = uploadedUrl;
          }
        } catch (fbErr) {
          console.warn("Firebase upload timeout/error, continuing with punch:", fbErr?.message || fbErr);
        }
      }

      let activeCoords = gpsCoords;
      if (!activeCoords || !activeCoords.latitude) {
        activeCoords = await captureGPSLocation();
        if (activeCoords) {
          setGpsCoords(activeCoords);
          setGpsCaptured(true);
        }
      }

      if (!activeCoords || !activeCoords.latitude) {
        Alert.alert(
          "GPS Location Required",
          "Please turn ON Location/GPS on your device so the app can verify your attendance."
        );
        setSubmittingPunch(false);
        return;
      }

      const payload = {
        ...(action === "in"
          ? { punchInLocation: activeCoords }
          : { punchOutLocation: activeCoords }),
        ...(finalSelfieUri
          ? action === "in"
            ? { punchInSelfie: finalSelfieUri }
            : { punchOutSelfie: finalSelfieUri }
          : {}),
      };

      if (action === "in") {
        const punchRes = await punchInApi(payload);
        triggerDashboardRefresh();

        const trackingEnabled =
          punchRes?.data?.isLocationTrackingEnabled ??
          punchRes?.data?.data?.isLocationTrackingEnabled ??
          user?.isLocationTrackingEnabled ??
          false;

        if (trackingEnabled) {
          console.log("[Punch] Activating live location tracking...");
          locationTrackingService.startLocationTracking().catch((trkErr) => {
            console.warn("[Punch] Tracking start notice:", trkErr);
          });
        } else {
          console.log("[Punch] Location tracking is not enabled for this user. Tracking omitted.");
        }

        Alert.alert(
          "Success",
          "Clocked In successfully!" + (trackingEnabled ? "\n\n📍 Live Route Tracking Active" : ""),
          [
            {
              text: "OK",
              onPress: () => {
                if (isMountedRef.current && navigation && navigation.canGoBack && navigation.canGoBack()) {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else {
        try {
          // Flush any pending GPS trip points with 1s timeout to prevent UI delay
          await Promise.race([
            locationTrackingService.syncQueuedLocations(),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        } catch (syncErr) {
          console.warn("[Punch] Pre-punch-out sync notice:", syncErr?.message);
        }
        await punchOutApi(payload);
        triggerDashboardRefresh();
        locationTrackingService.stopLocationTracking().catch((trkErr) => {
          console.warn("[Punch] Tracking stop notice:", trkErr);
        });
        Alert.alert("Success", "Clocked Out successfully!", [
          {
            text: "OK",
            onPress: () => {
              if (isMountedRef.current && navigation && navigation.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]);
      }
    } catch (err) {
      console.error("Punch error:", err);
      Alert.alert(
        "Punch Failed",
        err.response?.data?.message || "Failed to complete punch. Please try again."
      );
    } finally {
      if (isMountedRef.current) {
        setSubmittingPunch(false);
      }
    }
  };

  const handleCameraPunchConfirm = async () => {
    // Debounce: block if called within 800ms of last press
    const now = Date.now();
    if (now - lastPressRef.current < 800) return;
    lastPressRef.current = now;

    if (submittingPunch || capturingSelfie) return;

    if (isPunchDisabled) {
      Vibration.vibrate(120);
      Alert.alert("Locked", "You are outside the authorized office boundary.");
      return;
    }

    // Haptic feedback on valid press
    Vibration.vibrate(30);

    let activeSelfie = selfieUri;
    if (!activeSelfie) {
      activeSelfie = await handleCaptureSelfie(false);
      if (!activeSelfie) {
        Alert.alert(
          "Selfie Required",
          "A selfie photo is required to complete attendance. Please tap the camera button or 'Open Camera directly' to take your selfie."
        );
        return;
      }
    }

    if (action === "out") {
      Alert.alert(
        "Punch Out Confirmation",
        "Are you sure you want to punch out for the day?",
        [
          { text: "Cancel", style: "cancel", onPress: () => animatePressOut() },
          { text: "Yes, Punch Out", style: "destructive", onPress: () => executePunch(activeSelfie) },
        ]
      );
    } else {
      await executePunch(activeSelfie);
    }
  };

  const isWorking = submittingPunch || capturingSelfie;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Dark Navy Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Selfie for {action === "in" ? "Clock In" : "Clock Out"}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Center Selfie Capture Area */}
      <View style={styles.cameraWrapper}>
        <View
          style={[
            styles.cameraCircle,
            {
              borderColor: !gpsCaptured || capturingGps
                ? "#334155"
                : isPunchDisabled
                ? "#EF4444"
                : selfieUri
                ? "#10B981"
                : "#3B82F6",
            },
          ]}
        >
          {selfieUri ? (
            <View style={styles.selfieInner}>
              <Image source={{ uri: selfieUri }} style={styles.selfieImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.retakeOverlayBtn}
                onPress={() => setSelfieUri(null)}
                disabled={submittingPunch}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse" size={15} color="#FFFFFF" />
                <Text style={styles.retakeOverlayText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : submittingPunch ? (
            <View style={[styles.cameraContainer, { justifyContent: "center", alignItems: "center" }]}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: 13, fontWeight: "600" }}>Processing...</Text>
            </View>
          ) : hasCameraPerm && isFocused ? (
            <View style={styles.cameraContainer}>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                cameraType={CameraType.Front}
                flashMode="off"
                focusMode="on"
                zoomMode="on"
                shutterAnimationDuration={0}
              />
              {capturingSelfie ? (
                <View style={styles.cameraCapturingOverlay}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.cameraCapturingText}>Capturing selfie...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.snapInCircleBtn}
                  onPress={() => handleCaptureSelfie(false)}
                  disabled={capturingSelfie || submittingPunch}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : hasCameraPerm ? (
            <View style={[styles.cameraContainer, { justifyContent: "center", alignItems: "center" }]}>
              <Ionicons name="camera-outline" size={30} color="#64748B" />
              <Text style={{ color: "#94A3B8", marginTop: 4, fontSize: 11, fontWeight: "500" }}>Camera Standby</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptySelfieBtn}
              onPress={checkCameraPermission}
              activeOpacity={0.8}
            >
              <View style={styles.cameraIconBox}>
                <Ionicons name="camera" size={42} color="#3B82F6" />
              </View>
              <Text style={styles.snapSelfieTitle}>Allow Camera</Text>
              <Text style={styles.snapSelfieSub}>Tap to enable camera</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manual Native Camera Button when selfie is not yet taken */}
        {!selfieUri && (
          <TouchableOpacity
            style={styles.systemCameraFallbackBtn}
            onPress={() => handleCaptureSelfie(true)}
            disabled={capturingSelfie || submittingPunch}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse-outline" size={16} color="#60A5FA" />
            <Text style={styles.systemCameraFallbackText}>Open Camera directly</Text>
          </TouchableOpacity>
        )}

        {/* Status Pill */}
        <View style={styles.statusPillRow}>
          {selfieUri ? (
            <View style={[styles.infoBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.3)" }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.infoBadgeText, { color: "#10B981" }]}>Selfie Ready</Text>
            </View>
          ) : (
            <View style={[styles.infoBadge, { backgroundColor: "rgba(59, 130, 246, 0.15)", borderColor: "rgba(59, 130, 246, 0.3)" }]}>
              <Ionicons name="scan-outline" size={14} color="#3B82F6" />
              <Text style={[styles.infoBadgeText, { color: "#60A5FA" }]}>Frame face in circle</Text>
            </View>
          )}

          <View style={[styles.infoBadge, { backgroundColor: matchedLocationName ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.08)", borderColor: matchedLocationName ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.15)" }]}>
            <Ionicons name="location-outline" size={14} color={matchedLocationName ? "#10B981" : "#94A3B8"} />
            <Text style={[styles.infoBadgeText, { color: matchedLocationName ? "#10B981" : "#CBD5E1" }]}>
              {capturingGps
                ? "Capturing GPS..."
                : matchedLocationName
                ? `Inside ${matchedLocationName}`
                : gpsCoords
                ? `GPS ±${gpsCoords.accuracy || 15}m`
                : "GPS Ready"}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Controls       {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Active Break Banner (ALWAYS accessible when on break, even outside office boundary) */}
        {todayRecord?.isOnBreak ? (
          <View style={styles.activeBreakCard}>
            <View style={styles.activeBreakHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>
                  {todayRecord.currentBreakType === "lunch" ? "🍱" : "☕"}
                </Text>
                <View>
                  <Text style={styles.activeBreakTitle}>
                    On {todayRecord.currentBreakType === "lunch" ? "Lunch Break" : "Tea Break"}
                  </Text>
                  <Text style={styles.activeBreakSub}>Productive timer paused</Text>
                </View>
              </View>
              <View style={styles.timerBadge}>
                <Ionicons name="timer-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.timerText}>{formatElapsed(breakElapsedSeconds)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.endBreakActionBtn}
              onPress={handleEndBreak}
              disabled={submittingBreak}
              activeOpacity={0.8}
            >
              {submittingBreak ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.endBreakActionText}>End Break / Resume Work</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : action === "out" ? (
          /* Take Break Button when already punched in and not currently on break */
          <TouchableOpacity
            style={styles.takeBreakActionBtn}
            onPress={() => setBreakModalVisible(true)}
            disabled={isWorking}
            activeOpacity={0.8}
          >
            <Ionicons name="cafe" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.takeBreakActionText}>Take a Break (Lunch / Tea)</Text>
          </TouchableOpacity>
        ) : null}

        {/* Punch Clock In / Out Main Button */}
        {submittingPunch ? (
          <View style={[styles.punchBtn, { backgroundColor: "#1E293B" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#3B82F6" size="small" style={{ marginRight: 12 }} />
              <Text style={[styles.punchBtnText, { color: "#94A3B8" }]}>
                Processing Punch...
              </Text>
            </View>
          </View>
        ) : isPunchDisabled ? (
          <View style={styles.outsideOfficeContainer}>
            <Ionicons
              name={!gpsCoords ? "navigate-circle" : "warning"}
              size={30}
              color={!gpsCoords ? "#3B82F6" : "#EF4444"}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.outsideOfficeText, !gpsCoords && { color: "#60A5FA" }]}>
              {!gpsCoords ? "Turn ON Location / GPS" : "Out of Office Boundary"}
            </Text>
            <Text style={styles.outsideOfficeSub}>
              {locationStatusMsg || (!gpsCoords ? "Please turn ON Location Accuracy to punch attendance." : "Punching is not allowed outside the authorized office boundary.")}
            </Text>
            <TouchableOpacity
              style={[styles.retryGpsBtn, !gpsCoords && { backgroundColor: "#2563EB" }]}
              onPress={() => verifyLocation(true)}
              disabled={capturingGps}
              activeOpacity={0.8}
            >
              <Ionicons name={!gpsCoords ? "navigate" : "refresh"} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryGpsBtnText}>
                {capturingGps ? "Acquiring GPS..." : !gpsCoords ? "Turn ON Location Accuracy" : "Refresh / Re-check GPS"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Pressable
            style={styles.punchPressable}
            onPressIn={() => {
              if (isWorking) return;
              setPressedIn(true);
              animatePressIn();
            }}
            onPressOut={() => {
              setPressedIn(false);
              animatePressOut();
            }}
            onPress={handleCameraPunchConfirm}
            disabled={isWorking}
          >
            <Animated.View
              style={[
                styles.punchBtn,
                {
                  backgroundColor: pressedIn
                    ? action === "in" ? "#15803D" : "#DC2626"
                    : action === "in" ? "#16A34A" : "#EF4444",
                  transform: [{ scale: punchScaleAnim }],
                  shadowColor: action === "in" ? "#16A34A" : "#EF4444",
                  shadowOffset: { width: 0, height: pressedIn ? 2 : 6 },
                  shadowOpacity: pressedIn ? 0.2 : 0.45,
                  shadowRadius: pressedIn ? 4 : 12,
                  elevation: pressedIn ? 3 : 10,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Ionicons
                  name={action === "in" ? "log-in" : "log-out"}
                  size={22}
                  color="#FFFFFF"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.punchBtnText}>
                  {action === "in" ? "Clock In Now" : "Clock Out Now"}
                </Text>
              </View>
            </Animated.View>
          </Pressable>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={submittingPunch}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* ── MODAL: SELECT BREAK TYPE ── */}
      <Modal
        visible={breakModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBreakModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.breakModalBox}>
            <View style={styles.breakModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="cafe" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.breakModalTitle}>Choose Break Type</Text>
              </View>
              <TouchableOpacity onPress={() => setBreakModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.breakModalSub}>
              Select the break you are taking. Your work timer will pause while on break.
            </Text>

            {/* Lunch Break Option */}
            {(() => {
              const isLunchDisabled = breaksSettings?.lunchBreak?.enabled === false;
              const hasLunchToday = (todayRecord?.breaks || []).some((b) => b.breakType === "lunch");
              const isBlocked = submittingBreak || isLunchDisabled || hasLunchToday;

              return (
                <TouchableOpacity
                  style={[
                    styles.breakOptionCard,
                    (isLunchDisabled || hasLunchToday) && { opacity: 0.55, backgroundColor: "#f1f5f9" },
                  ]}
                  onPress={() => handleStartBreak("lunch")}
                  disabled={isBlocked}
                  activeOpacity={0.8}
                >
                  <View style={styles.breakOptionLeft}>
                    <View style={[styles.breakOptionIconBox, { backgroundColor: isBlocked ? "#E2E8F0" : "#FEF3C7" }]}>
                      <Text style={{ fontSize: 22 }}>🍱</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.breakOptionName, isBlocked && { color: "#64748B" }]}>Lunch Break</Text>
                      <Text style={styles.breakOptionMeta}>
                        {isLunchDisabled
                          ? "Disabled by company policy"
                          : hasLunchToday
                          ? "Already completed today (1/1)"
                          : `Allowed: ${breaksSettings?.lunchBreak?.durationMinutes || 45} mins`}
                      </Text>
                    </View>
                  </View>
                  {!isBlocked && <Ionicons name="chevron-forward" size={20} color="#D97706" />}
                </TouchableOpacity>
              );
            })()}

            {/* Tea Break Option */}
            {(() => {
              const isTeaDisabled = breaksSettings?.teaBreak?.enabled === false;
              const teaBreaksTaken = (todayRecord?.breaks || []).filter((b) => b.breakType === "tea").length;
              const maxTeaBreaks = breaksSettings?.teaBreak?.maxPerDay || 2;
              const isTeaLimitReached = teaBreaksTaken >= maxTeaBreaks;
              const isBlocked = submittingBreak || isTeaDisabled || isTeaLimitReached;

              return (
                <TouchableOpacity
                  style={[
                    styles.breakOptionCard,
                    (isTeaDisabled || isTeaLimitReached) && { opacity: 0.55, backgroundColor: "#f1f5f9" },
                  ]}
                  onPress={() => handleStartBreak("tea")}
                  disabled={isBlocked}
                  activeOpacity={0.8}
                >
                  <View style={styles.breakOptionLeft}>
                    <View style={[styles.breakOptionIconBox, { backgroundColor: isBlocked ? "#E2E8F0" : "#CCFBF1" }]}>
                      <Text style={{ fontSize: 22 }}>☕</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.breakOptionName, isBlocked && { color: "#64748B" }]}>Tea / Short Break</Text>
                      <Text style={styles.breakOptionMeta}>
                        {isTeaDisabled
                          ? "Disabled by company policy"
                          : isTeaLimitReached
                          ? `Daily limit reached (${teaBreaksTaken}/${maxTeaBreaks} taken)`
                          : `Allowed: ${breaksSettings?.teaBreak?.durationMinutes || 15} mins (${teaBreaksTaken}/${maxTeaBreaks} used)`}
                      </Text>
                    </View>
                  </View>
                  {!isBlocked && <Ionicons name="chevron-forward" size={20} color="#0D9488" />}
                </TouchableOpacity>
              );
            })()}

            <TouchableOpacity
              style={styles.breakModalCancelBtn}
              onPress={() => setBreakModalVisible(false)}
            >
              <Text style={styles.breakModalCancelText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 44 : 54,
    paddingBottom: 20,
    backgroundColor: "#0F172A",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cameraCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
    borderWidth: 4,
    backgroundColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  snapInCircleBtn: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  cameraCapturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraCapturingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  systemCameraFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  systemCameraFallbackText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "600",
  },
  selfieInner: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  selfieImage: {
    width: "100%",
    height: "100%",
  },
  retakeOverlayBtn: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  retakeOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptySelfieBtn: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cameraIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  snapSelfieTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  snapSelfieSub: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  statusPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  bottomControls: {
    padding: 24,
    paddingBottom: Platform.OS === "android" ? 32 : 44,
    alignItems: "center",
  },
  punchPressable: {
    width: "100%",
  },
  punchBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  punchBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  outsideOfficeContainer: {
    width: "100%",
    paddingVertical: 20,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  outsideOfficeText: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  outsideOfficeSub: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  retryGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  retryGpsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },
  /* Break Styles */
  activeBreakCard: {
    width: "100%",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  activeBreakHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  activeBreakTitle: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "800",
  },
  activeBreakSub: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  timerText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  endBreakActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  endBreakActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  takeBreakActionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  takeBreakActionText: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "800",
  },
  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  breakModalBox: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "android" ? 28 : 40,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  breakModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakModalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  breakModalSub: {
    color: "#94A3B8",
    fontSize: 12.5,
    marginBottom: 18,
    lineHeight: 18,
  },
  breakOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  breakOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  breakOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  breakOptionName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  breakOptionMeta: {
    color: "#94A3B8",
    fontSize: 11.5,
  },
  breakModalCancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  breakModalCancelText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default EmployeePunchScreen;
