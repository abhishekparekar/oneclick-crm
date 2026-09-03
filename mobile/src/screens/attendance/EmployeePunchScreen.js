import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraType } from "react-native-camera-kit";
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

  // Camera State
  const [hasCameraPerm, setHasCameraPerm] = useState(false);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const cameraRef = useRef(null);

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "One Click CRM needs camera access to capture your selfie.",
            buttonPositive: "Allow",
            buttonNegative: "Cancel",
          }
        );
        const hasCamera = cameraGranted === PermissionsAndroid.RESULTS.GRANTED;
        setHasCameraPerm(hasCamera);
        return hasCamera;
      } catch (err) {
        console.warn("Permission error:", err);
        return false;
      }
    }
    setHasCameraPerm(true);
    return true;
  };

  const initData = async () => {
    try {
      // 1. Check Camera Permission first
      const permitted = await requestPermissions();
      if (!permitted) {
        Alert.alert("Permission Denied", "Camera access is required for punch selfie.");
        navigation.goBack();
        return;
      }

      // Camera is ready: unblock camera and UI immediately!
      setLoadingData(false);

      // 2. Fetch today record and GPS location in parallel without blocking UI
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
      setLoadingData(false);
      setCapturingGps(false);
      setGpsCaptured(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initData();
    }, [])
  );

  const executePunch = async () => {
    try {
      setCapturingSelfie(true);
      let finalSelfieUri = null;

      if (cameraRef.current && typeof cameraRef.current.capture === "function") {
        try {
          const photo = await cameraRef.current.capture();
          if (photo && photo.uri) {
            finalSelfieUri = photo.uri;
          }
        } catch (captureErr) {
          console.warn("Camera capture error:", captureErr);
        }
      }

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
          console.warn("Firebase upload timeout/error, continuing with punch:", fbErr);
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
        locationTrackingService.startLocationTracking().catch(() => {});
        Alert.alert("Success", "Clocked In successfully!");
      } else {
        await punchOutApi(payload);
        locationTrackingService.stopLocationTracking().catch(() => {});
        Alert.alert("Success", "Clocked Out successfully!");
      }

      try {
        if (user?.role === "Manager" || user?.role === "manager") {
          await refreshManagerDashboard();
        } else {
          await refreshEmployeeDashboard();
        }
      } catch (err) {
        console.log("Could not refresh dashboard data:", err);
      }

      navigation.goBack();
    } catch (err) {
      console.error("Punch error:", err);
      Alert.alert(
        "Punch Failed",
        err.response?.data?.message || "Failed to complete punch. Please try again."
      );
    } finally {
      setCapturingSelfie(false);
    }
  };

  const handleCameraPunchConfirm = async () => {
    if (isPunchDisabled) {
      Alert.alert(
        "Locked",
        "You are outside the authorized office boundary."
      );
      return;
    }

    if (action === "out") {
      Alert.alert(
        "Punch Out Confirmation",
        "Are you sure you want to punch out for the day?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Punch Out", style: "destructive", onPress: executePunch },
        ]
      );
    } else {
      await executePunch();
    }
  };

  if (loadingData || !hasCameraPerm) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#FFFFFF", marginTop: 12, fontWeight: "600" }}>
          Preparing Camera...
        </Text>
      </View>
    );
  }

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

      {/* In-App Circular Live Camera Stream */}
      <View style={styles.cameraWrapper}>
        <View
          style={[
            styles.cameraCircle,
            {
              borderColor: !gpsCaptured || capturingGps
                ? "#334155"
                : isPunchDisabled
                ? "#EF4444"
                : "#3B82F6",
            },
          ]}
        >
          <Camera
            ref={cameraRef}
            style={styles.camera}
            cameraType={CameraType.Front}
            flashMode="off"
            resetFocusWhenMotionDetected={false}
          />
        </View>

        <Text style={styles.cameraInstruction}>
          Please frame your face in the circle
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {capturingSelfie || capturingGps || !gpsCaptured ? (
          <View style={[styles.punchBtn, { backgroundColor: "#1E293B" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#3B82F6" size="small" style={{ marginRight: 12 }} />
              <Text style={[styles.punchBtnText, { color: "#94A3B8" }]}>
                {capturingSelfie ? "Capturing Selfie..." : "Getting Location..."}
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
            disabled={capturingSelfie || !gpsCaptured || capturingGps}
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
          disabled={capturingSelfie}
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
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  cameraInstruction: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 24,
    fontWeight: "500",
    textAlign: "center",
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
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EmployeePunchScreen;
