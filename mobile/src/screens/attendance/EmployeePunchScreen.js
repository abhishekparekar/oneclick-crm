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
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import useManagerController from "../../controllers/managerController";
import {
  punchInApi,
  punchOutApi,
  getMyTodayApi,
  validateLocationApi,
} from "../../api/attendanceService";
import { captureGPSLocation } from "../../utils/locationService";
import { uploadSelfieToFirebase } from "../../utils/firebaseStorage";
import locationTrackingService from "../../services/locationTrackingService";

const EmployeePunchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { refreshEmployeeDashboard } = useAppData();
  const { refreshDashboard: refreshManagerDashboard } = useManagerController();

  // Data & State
  const [loadingData, setLoadingData] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [action, setAction] = useState("in"); // 'in', 'out'

  // GPS State
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [isPunchDisabled, setIsPunchDisabled] = useState(false);

  // Selfie State
  const [selfieUri, setSelfieUri] = useState(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initData = async () => {
    try {
      setLoadingData(true);

      // Check battery optimization for uninterrupted background bike tracking
      locationTrackingService.requestBatteryOptimizationExemption(false).catch(() => {});

      // 1. Fetch today record
      const fetchTodayPromise = (async () => {
        try {
          const todayRes = await getMyTodayApi();
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
        } catch (recErr) {
          console.warn("Could not fetch today record:", recErr);
          setAction("in");
        }
      })();

      // 2. Capture GPS Location and validate office boundary
      const fetchGpsPromise = (async () => {
        setCapturingGps(true);
        try {
          const coords = await captureGPSLocation();
          const validCoords = coords || {
            latitude: 18.5204,
            longitude: 73.8567,
            address: "Office Location",
          };
          setGpsCoords(validCoords);
          setGpsCaptured(true);

          try {
            const { data: res } = await validateLocationApi({
              latitude: validCoords.latitude,
              longitude: validCoords.longitude,
            });
            if (res && res.success) {
              const disabled =
                !res.data.insideArea &&
                res.data.attendanceMode === "office_only" &&
                !res.data.isRemoteAllowed;
              setIsPunchDisabled(disabled);
            }
          } catch (valErr) {
            console.log("Location validation error:", valErr);
            setIsPunchDisabled(false);
          }
        } catch (gpsErr) {
          console.warn("GPS error:", gpsErr);
          setGpsCoords({
            latitude: 18.5204,
            longitude: 73.8567,
            address: "Office Location",
          });
          setGpsCaptured(true);
        } finally {
          setCapturingGps(false);
        }
      })();

      await Promise.allSettled([fetchTodayPromise, fetchGpsPromise]);
    } catch (err) {
      console.error("Init Error:", err);
      setCapturingGps(false);
      setGpsCaptured(true);
    } finally {
      setLoadingData(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initData();
    }, [])
  );

  const handleCaptureSelfie = async () => {
    if (capturingSelfie || submittingPunch) return null;
    try {
      setCapturingSelfie(true);

      // Step 1: Request camera permission using Android native dialog
      // This shows the "Allow / Deny" popup directly inside the app.
      if (Platform.OS === "android") {
        const already = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (!already) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Camera Permission",
              message: "OneClick needs camera access to capture your attendance selfie.",
              buttonPositive: "Allow",
              buttonNegative: "Deny",
            }
          );
          if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            // User clicked "Don't ask again" — only NOW show Settings button
            Alert.alert(
              "Camera Permission Blocked",
              "You have permanently denied camera access. Please enable it in Settings → Apps → OneClick → Permissions → Camera.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
            setCapturingSelfie(false);
            return null;
          }
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            setCapturingSelfie(false);
            return null;
          }
        }
      } else {
        // iOS: use expo permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          setCapturingSelfie(false);
          return null;
        }
      }

      // Step 2: Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
        cameraSide: "front",
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelfieUri(uri);
        setCapturingSelfie(false);
        return uri;
      }
      setCapturingSelfie(false);
      return null;
    } catch (err) {
      console.warn("Camera capture error:", err);
      // Only show error if it's truly unexpected (not a user cancel)
      if (!err?.message?.toLowerCase().includes("cancel")) {
        Alert.alert(
          "Camera Error",
          "Could not open camera. Please try again.",
          [{ text: "OK" }]
        );
      }
      setCapturingSelfie(false);
      return null;
    }
  };

  const triggerDashboardRefresh = () => {
    try {
      if (user?.role === "Manager" || user?.role === "manager") {
        refreshManagerDashboard && refreshManagerDashboard();
      } else {
        refreshEmployeeDashboard && refreshEmployeeDashboard();
      }
    } catch (_) {}
  };

  const executePunch = async (activeSelfie) => {
    try {
      setSubmittingPunch(true);

      let finalSelfieUri = activeSelfie || selfieUri;

      // Upload to Firebase if local file uri with 4-second timeout to prevent hanging
      if (finalSelfieUri && (finalSelfieUri.startsWith("file://") || finalSelfieUri.startsWith("/"))) {
        try {
          const uploadPromise = uploadSelfieToFirebase(
            finalSelfieUri,
            user?._id || "unknown"
          );
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firebase upload timeout")), 4000)
          );
          finalSelfieUri = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (fbErr) {
          console.warn("Firebase upload timeout/error, continuing with punch:", fbErr?.message || fbErr);
        }
      }

      const activeCoords = gpsCoords || {
        latitude: 18.5204,
        longitude: 73.8567,
        address: "Office Location",
      };

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
        await punchInApi(payload);
        triggerDashboardRefresh();
        try {
          await locationTrackingService.startLocationTracking();
        } catch (trkErr) {
          console.warn("[Punch] Tracking start notice:", trkErr);
        }
        Alert.alert("Success", "Clocked In successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await punchOutApi(payload);
        triggerDashboardRefresh();
        try {
          await locationTrackingService.stopLocationTracking();
        } catch (trkErr) {
          console.warn("[Punch] Tracking stop notice:", trkErr);
        }
        Alert.alert("Success", "Clocked Out successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
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
    if (submittingPunch) return;

    if (isPunchDisabled) {
      Alert.alert("Locked", "You are outside the authorized office boundary.");
      return;
    }

    let activeSelfie = selfieUri;
    if (!activeSelfie) {
      activeSelfie = await handleCaptureSelfie();
      if (!activeSelfie) return;
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

  if (loadingData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#FFFFFF", marginTop: 12, fontWeight: "600" }}>
          Loading Attendance Data...
        </Text>
      </View>
    );
  }

  const isWorking = submittingPunch || capturingSelfie || capturingGps || !gpsCaptured;

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
                onPress={handleCaptureSelfie}
                disabled={submittingPunch}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse" size={15} color="#FFFFFF" />
                <Text style={styles.retakeOverlayText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptySelfieBtn}
              onPress={handleCaptureSelfie}
              disabled={submittingPunch || capturingSelfie}
              activeOpacity={0.8}
            >
              {capturingSelfie ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                <>
                  <View style={styles.cameraIconBox}>
                    <Ionicons name="camera" size={42} color="#3B82F6" />
                  </View>
                  <Text style={styles.snapSelfieTitle}>Snap Selfie</Text>
                  <Text style={styles.snapSelfieSub}>Tap here to open front camera</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Status Pill */}
        <View style={styles.statusPillRow}>
          {selfieUri ? (
            <View style={[styles.infoBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.3)" }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.infoBadgeText, { color: "#10B981" }]}>Selfie Ready</Text>
            </View>
          ) : (
            <View style={[styles.infoBadge, { backgroundColor: "rgba(59, 130, 246, 0.15)", borderColor: "rgba(59, 130, 246, 0.3)" }]}>
              <Ionicons name="camera-outline" size={14} color="#3B82F6" />
              <Text style={[styles.infoBadgeText, { color: "#60A5FA" }]}>Face Photo Required</Text>
            </View>
          )}

          <View style={[styles.infoBadge, { backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.15)" }]}>
            <Ionicons name="location-outline" size={14} color="#94A3B8" />
            <Text style={[styles.infoBadgeText, { color: "#CBD5E1" }]}>
              {capturingGps ? "Capturing GPS..." : gpsCoords ? `GPS ±${gpsCoords.accuracy || 15}m` : "GPS Ready"}
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
            <Ionicons name="warning" size={28} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={styles.outsideOfficeText}>You are not in the office</Text>
            <Text style={styles.outsideOfficeSub}>
              Punching is not allowed outside the authorized office boundary.
            </Text>
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
    width: 260,
    height: 260,
    borderRadius: 130,
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
    fontSize: 14,
    fontWeight: "500",
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
