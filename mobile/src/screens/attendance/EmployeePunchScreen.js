import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Image,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { launchCamera } from "react-native-image-picker";
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

const EmployeePunchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { refreshEmployeeDashboard } = useAppData();
  const { refreshDashboard: refreshManagerDashboard } = useManagerController();

  // Data & State
  const [loadingData, setLoadingData] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [action, setAction] = useState(null); // 'in', 'out'

  // GPS State
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [isPunchDisabled, setIsPunchDisabled] = useState(false);

  // Selfie State
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);

  const requestCameraAndGpsPerms = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn("Permission request error:", err);
        return false;
      }
    }
    return true;
  };

  const handleOpenNativeCamera = async () => {
    try {
      const hasPerm = await requestCameraAndGpsPerms();
      if (!hasPerm) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access to take your punch selfie.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: handleOpenNativeCamera },
          ]
        );
        return;
      }

      const result = await launchCamera({
        mediaType: "photo",
        cameraType: "front",
        quality: 0.6,
        saveToPhotos: false,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        console.warn("Camera error:", result.errorMessage);
        Alert.alert("Camera Error", result.errorMessage || "Could not open camera");
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedSelfie(uri);
      }
    } catch (err) {
      console.error("Failed to launch camera:", err);
      Alert.alert("Error", "Could not start camera: " + (err.message || err));
    }
  };

  const initData = async () => {
    try {
      setLoadingData(true);

      // Fetch Today Record
      const todayRes = await getMyTodayApi();
      let record = null;
      if (todayRes.data && todayRes.data.success) {
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

      // Fetch GPS
      setCapturingGps(true);
      const coords = await captureGPSLocation();
      if (coords) {
        setGpsCoords(coords);
        setGpsCaptured(true);
        try {
          const { data: res } = await validateLocationApi({
            latitude: coords.latitude,
            longitude: coords.longitude,
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
      } else {
        const fallback = {
          latitude: 18.5204,
          longitude: 73.8567,
          address: "Main Office Location",
        };
        setGpsCoords(fallback);
        setGpsCaptured(true);
      }
    } catch (err) {
      console.error("Init Error:", err);
    } finally {
      setCapturingGps(false);
      setLoadingData(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      initData();
    }, [])
  );

  const executePunch = async () => {
    let selfieToUse = capturedSelfie;

    if (!selfieToUse) {
      // Prompt camera first if not snapped yet
      await handleOpenNativeCamera();
      return;
    }

    try {
      setCapturingSelfie(true);

      // Upload to Firebase if local file uri
      if (selfieToUse && selfieToUse.startsWith("file://")) {
        try {
          selfieToUse = await uploadSelfieToFirebase(selfieToUse, user?._id || "unknown");
        } catch (fbErr) {
          console.warn("Firebase upload error, continuing with punch payload:", fbErr);
        }
      }

      const activeCoords = gpsCoords || {
        latitude: 18.5204,
        longitude: 73.8567,
        address: "Main Office Location",
      };

      const payload = {
        ...(action === "in"
          ? { punchInLocation: activeCoords }
          : { punchOutLocation: activeCoords }),
        ...(selfieToUse
          ? action === "in"
            ? { punchInSelfie: selfieToUse }
            : { punchOutSelfie: selfieToUse }
          : {}),
      };

      if (action === "in") {
        await punchInApi(payload);
        Alert.alert("Success", "Clocked In successfully!");
      } else {
        await punchOutApi(payload);
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
      Alert.alert("Locked", "You are outside the authorized office geo-fence.");
      return;
    }

    if (!capturedSelfie) {
      handleOpenNativeCamera();
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

  if (loadingData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1268D9" />
        <Text style={{ color: "#0F172A", marginTop: 12, fontWeight: "600" }}>
          Preparing Attendance System...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#082B52" />

      {/* Royal Blue Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Selfie for {action === "in" ? "Clock In" : "Clock Out"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Circular Camera & Selfie Preview */}
      <View style={styles.cameraWrapper}>
        <TouchableOpacity
          style={[
            styles.cameraCircle,
            {
              borderColor: capturedSelfie
                ? "#10B981"
                : !gpsCaptured || capturingGps
                ? "#CBD5E1"
                : isPunchDisabled
                ? "#EF4444"
                : "#1268D9",
            },
          ]}
          onPress={handleOpenNativeCamera}
          activeOpacity={0.85}
        >
          {capturedSelfie ? (
            <Image source={{ uri: capturedSelfie }} style={styles.selfieImage} />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={42} color="#FFFFFF" />
              </View>
              <Text style={styles.tapToTakeText}>Tap to Open Camera</Text>
              <Text style={styles.tapToTakeSub}>Take a quick front selfie</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.cameraInstruction}>
          {capturedSelfie
            ? "✓ Selfie captured! Tap Clock In below to confirm"
            : "Please tap the circle above to take your selfie"}
        </Text>

        {capturedSelfie ? (
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={handleOpenNativeCamera}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse-outline" size={16} color="#1268D9" style={{ marginRight: 6 }} />
            <Text style={styles.retakeBtnText}>Retake Photo</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {capturingSelfie || capturingGps || !gpsCaptured ? (
          <View style={[styles.punchBtn, { backgroundColor: "#F1F5F9" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#1268D9" size="small" style={{ marginRight: 12 }} />
              <Text style={[styles.punchBtnText, { color: "#64748B" }]}>
                {capturingSelfie ? "Submitting Punch..." : "Validating Location..."}
              </Text>
            </View>
          </View>
        ) : isPunchDisabled ? (
          <View style={styles.outsideOfficeContainer}>
            <Ionicons name="warning" size={26} color="#EF4444" style={{ marginBottom: 6 }} />
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
                backgroundColor: !capturedSelfie
                  ? "#1268D9"
                  : action === "in"
                  ? "#10B981"
                  : "#EA580C",
              },
            ]}
            onPress={handleCameraPunchConfirm}
            disabled={capturingSelfie || !gpsCaptured || capturingGps}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={!capturedSelfie ? "camera-outline" : action === "in" ? "log-in" : "log-out"}
                size={22}
                color="#FFFFFF"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.punchBtnText}>
                {!capturedSelfie
                  ? "Take Selfie"
                  : action === "in"
                  ? "Clock In Now"
                  : "Clock Out Now"}
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 44 : 54,
    paddingBottom: 16,
    backgroundColor: "#082B52",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cameraCircle: {
    width: 270,
    height: 270,
    borderRadius: 135,
    overflow: "hidden",
    borderWidth: 4,
    backgroundColor: "#082B52",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#082B52",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  selfieImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cameraPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  cameraIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tapToTakeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  tapToTakeSub: {
    color: "#93C5FD",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  cameraInstruction: {
    color: "#475569",
    fontSize: 13.5,
    marginTop: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 14,
  },
  retakeBtnText: {
    color: "#1268D9",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomControls: {
    padding: 20,
    paddingBottom: Platform.OS === "android" ? 28 : 40,
    alignItems: "center",
  },
  punchBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  punchBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  outsideOfficeContainer: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  outsideOfficeText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  outsideOfficeSub: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EmployeePunchScreen;
