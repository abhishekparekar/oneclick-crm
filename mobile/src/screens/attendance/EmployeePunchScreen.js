import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  PermissionsAndroid,
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
  getMyTodayApi,
  validateLocationApi,
} from "../../api/attendanceService";
import { captureGPSLocation } from "../../utils/locationService";
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
  const cameraRef = useRef(null);
  const isMountedRef = useRef(true);
  const isFocused = useIsFocused();

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

  const verifyLocation = async () => {
    try {
      setCapturingGps(true);
      setLocationStatusMsg("");
      const coords = await captureGPSLocation();

      if (!coords || !coords.latitude || !coords.longitude) {
        setGpsCoords(null);
        setGpsCaptured(false);
        setCapturingGps(false);
        setIsPunchDisabled(true);
        setLocationStatusMsg("Unable to detect GPS. Please turn ON Location/GPS in your phone settings.");
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

  const triggerDashboardRefresh = () => {
    try {
      if (refreshEmployeeDashboard) {
        refreshEmployeeDashboard();
      }
    } catch (_) {}
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
    if (submittingPunch || capturingSelfie) return;

    if (isPunchDisabled) {
      Alert.alert("Locked", "You are outside the authorized office boundary.");
      return;
    }

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
          { text: "Cancel", style: "cancel" },
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

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
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
            <Ionicons name="warning" size={28} color="#EF4444" style={{ marginBottom: 6 }} />
            <Text style={styles.outsideOfficeText}>Out of Office Boundary</Text>
            <Text style={styles.outsideOfficeSub}>
              {locationStatusMsg || "Punching is not allowed outside the authorized office boundary."}
            </Text>
            <TouchableOpacity
              style={styles.retryGpsBtn}
              onPress={verifyLocation}
              disabled={capturingGps}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryGpsBtnText}>
                {capturingGps ? "Checking GPS..." : "Refresh / Re-check GPS"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.punchBtn,
              {
                backgroundColor: action === "in" ? "#16A34A" : "#EF4444",
              },
            ]}
            onPress={handleCameraPunchConfirm}
            disabled={isWorking}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
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
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={submittingPunch}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
  punchBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
});

export default EmployeePunchScreen;
