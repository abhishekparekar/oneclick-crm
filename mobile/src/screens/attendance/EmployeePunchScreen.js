import React, { useCallback, useState, useEffect } from "react";
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
  Image,
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
  const [action, setAction] = useState("in"); // 'in', 'out'

  // GPS State
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [isPunchDisabled, setIsPunchDisabled] = useState(false);

  // Selfie State
  const [capturedSelfie, setCapturedSelfie] = useState(null);
  const [submittingPunch, setSubmittingPunch] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "One Click CRM needs camera access to take your punch selfie.",
            buttonPositive: "Allow",
            buttonNegative: "Cancel",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn("Camera permission request error:", err);
        return false;
      }
    }
    return true;
  };

  const handleCaptureSelfie = async (auto = false) => {
    try {
      const hasPerm = await requestCameraPermission();
      if (!hasPerm) {
        if (!auto) {
          Alert.alert(
            "Camera Permission Required",
            "Please grant camera access to take your attendance selfie.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Try Again", onPress: () => handleCaptureSelfie(false) },
            ]
          );
        }
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
        if (!auto) {
          Alert.alert("Camera Error", result.errorMessage || "Could not open camera");
        }
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedSelfie(uri);
      }
    } catch (err) {
      console.error("Failed to launch camera:", err);
      if (!auto) {
        Alert.alert("Error", "Could not start camera: " + (err.message || err));
      }
    }
  };

  const initData = async () => {
    try {
      setLoadingData(true);

      // Fetch Today Record safely
      try {
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
      } catch (recErr) {
        console.warn("Could not fetch today record:", recErr);
        setAction("in");
      }

      // Fetch GPS safely
      setCapturingGps(true);
      try {
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
      } catch (gpsErr) {
        console.warn("GPS error:", gpsErr);
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

  // Auto trigger front camera once initial loading is done
  useEffect(() => {
    if (!loadingData && !capturedSelfie) {
      const t = setTimeout(() => {
        handleCaptureSelfie(true);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loadingData]);

  const executePunch = async () => {
    let selfieToUse = capturedSelfie;

    if (!selfieToUse) {
      await handleCaptureSelfie(false);
      return;
    }

    try {
      setSubmittingPunch(true);

      // Upload to Firebase if local file uri
      if (selfieToUse && selfieToUse.startsWith("file://")) {
        try {
          selfieToUse = await uploadSelfieToFirebase(
            selfieToUse,
            user?._id || "unknown"
          );
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
      setSubmittingPunch(false);
    }
  };

  const handleCameraPunchConfirm = async () => {
    if (isPunchDisabled) {
      Alert.alert(
        "Location Notice",
        "You appear to be outside the authorized office boundary. Do you want to submit attendance anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Proceed", onPress: executePunch },
        ]
      );
      return;
    }

    if (!capturedSelfie) {
      handleCaptureSelfie(false);
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
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#FFFFFF", marginTop: 12, fontWeight: "600" }}>
          Preparing Attendance System...
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

      {/* Circular Camera / Selfie Preview */}
      <View style={styles.cameraWrapper}>
        <TouchableOpacity
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
          onPress={() => handleCaptureSelfie(false)}
          activeOpacity={0.9}
        >
          {capturedSelfie ? (
            <Image source={{ uri: capturedSelfie }} style={styles.selfieImage} />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={44} color="#3B82F6" />
              </View>
              <Text style={styles.tapToTakeText}>Tap to Take Selfie</Text>
              <Text style={styles.tapToTakeSub}>Frame your face in the circle</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.cameraInstruction}>
          {capturedSelfie
            ? "Please frame your face in the circle"
            : "Please tap the circle to capture your selfie"}
        </Text>

        {capturedSelfie ? (
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => handleCaptureSelfie(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
            <Text style={styles.retakeBtnText}>Retake Photo</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {submittingPunch || capturingGps || !gpsCaptured ? (
          <View style={[styles.punchBtn, { backgroundColor: "#1E293B" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="#3B82F6" size="small" style={{ marginRight: 12 }} />
              <Text style={[styles.punchBtnText, { color: "#94A3B8" }]}>
                {submittingPunch ? "Submitting Attendance..." : "Validating Location..."}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.punchBtn,
              {
                backgroundColor: !capturedSelfie
                  ? "#2563EB"
                  : action === "in"
                  ? "#16A34A"
                  : "#EA580C",
              },
            ]}
            onPress={handleCameraPunchConfirm}
            disabled={submittingPunch || !gpsCaptured || capturingGps}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={!capturedSelfie ? "camera" : action === "in" ? "log-in" : "log-out"}
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
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tapToTakeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  tapToTakeSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  cameraInstruction: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 24,
    fontWeight: "500",
    textAlign: "center",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    marginTop: 16,
  },
  retakeBtnText: {
    color: "#3B82F6",
    fontSize: 13,
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
