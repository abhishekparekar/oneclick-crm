import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import { uploadSelfieToFirebase } from "../../utils/firebaseStorage";

const EmployeePunchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { refreshEmployeeDashboard } = useAppData();
  const { refreshDashboard: refreshManagerDashboard } = useManagerController();
  
  // Data & State
  const [loadingData, setLoadingData] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [action, setAction] = useState(null); // 'in', 'out', 'done'

  // GPS State
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [isPunchDisabled, setIsPunchDisabled] = useState(false);
  
  // Camera State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const cameraRef = useRef(null);

  const initData = async () => {
    try {
      setLoadingData(true);
      
      // Request Camera Perm
      let perm = cameraPermission;
      if (!perm || perm.status !== "granted") {
        perm = await requestCameraPermission();
      }
      if (!perm || perm.status !== "granted") {
        Alert.alert("Permission Denied", "Camera access is required.");
        navigation.goBack();
        return;
      }

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
          setAction("in"); // they are currently punched out, can punch in again
        }
      } else {
        // Legacy fallback
        if (!record.punchOutTime) setAction("out");
        else setAction("in"); // allow punch in again
      }

      // Fetch GPS
      setCapturingGps(true);
      const coords = await captureGPSLocation();
      if (coords) {
        setGpsCoords(coords);
        setGpsCaptured(true);
        const { data: res } = await validateLocationApi({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (res && res.success) {
          // Strictly block if outside area AND attendance is office_only (no admin bypass)
          const disabled = !res.data.insideArea && res.data.attendanceMode === "office_only";
          setIsPunchDisabled(disabled);
        }
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
    try {
      setCapturingSelfie(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
      });
      
      // Upload & Punch
      let finalSelfieUri = photo.uri;
      if (finalSelfieUri && finalSelfieUri.startsWith("file://")) {
        finalSelfieUri = await uploadSelfieToFirebase(finalSelfieUri, user?._id || "unknown");
      }

      const payload = {
        ...(action === "in" ? { punchInLocation: gpsCoords } : { punchOutLocation: gpsCoords }),
        ...(finalSelfieUri ? (action === "in" ? { punchInSelfie: finalSelfieUri } : { punchOutSelfie: finalSelfieUri }) : {}),
      };
      
      if (action === "in") {
        await punchInApi(payload);
        Alert.alert("Success", "Clocked In successfully!");
      } else {
        await punchOutApi(payload);
        Alert.alert("Success", "Clocked Out successfully!");
      }
      
      // Force refresh the dashboard data so the clock widget updates correctly
      try {
        if (user?.role === "Manager" || user?.role === "manager") {
          await refreshManagerDashboard();
        } else {
          await refreshEmployeeDashboard();
        }
      } catch (err) {
        console.log("Could not refresh dashboard data:", err);
      }
      
      navigation.goBack(); // Go back to dashboard immediately
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Punch Failed", err.response?.data?.message || "Failed to punch. Please try again.");
    } finally {
      setCapturingSelfie(false);
    }
  };

  const handleCameraPunchConfirm = async () => {
    if (!cameraRef.current) return;
    if (!gpsCaptured || !gpsCoords) {
      Alert.alert("Location Required", "Still fetching location, please wait a moment.");
      return;
    }
    if (isPunchDisabled) {
      Alert.alert("Locked", "You are outside the authorized office geo-fence.");
      return;
    }
    
    if (action === "out") {
      Alert.alert(
        "Warning: Early Leave Penalty",
        "If you punch out before your shift officially ends (including the grace period), the system will automatically mark today as a Half Day. Are you sure you want to punch out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Punch Out", style: "destructive", onPress: executePunch }
        ]
      );
    } else {
      await executePunch();
    }
  };

  if (loadingData || !cameraPermission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Preparing Camera...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Selfie for {action === 'in' ? 'Clock In' : 'Clock Out'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Circular Camera Preview */}
      <View style={styles.cameraWrapper}>
        <View style={[
          styles.cameraCircle, 
          { borderColor: (!gpsCaptured || capturingGps) ? '#334155' : (isPunchDisabled ? '#ef4444' : '#3b82f6') }
        ]}>
          <CameraView 
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        </View>
        <Text style={styles.cameraInstruction}>
          Please frame your face in the circle
        </Text>
      </View>
      
      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {capturingSelfie || capturingGps || (!gpsCaptured) ? (
          <View style={[styles.punchBtn, { backgroundColor: '#1e293b' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#3b82f6" size="small" style={{ marginRight: 12 }} />
              <Text style={[styles.punchBtnText, { color: '#94a3b8' }]}>
                {capturingSelfie ? "Capturing Selfie..." : "Getting Location..."}
              </Text>
            </View>
          </View>
        ) : isPunchDisabled ? (
          <View style={styles.outsideOfficeContainer}>
            <Ionicons name="warning" size={28} color="#ef4444" style={{ marginBottom: 8 }} />
            <Text style={styles.outsideOfficeText}>You are not in the office</Text>
            <Text style={styles.outsideOfficeSub}>Punching is not allowed outside the authorized office boundary.</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.punchBtn, 
              { backgroundColor: action === 'in' ? '#16a34a' : '#ea580c' }
            ]}
            onPress={handleCameraPunchConfirm}
            disabled={capturingSelfie || !gpsCaptured || capturingGps}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={action === 'in' ? "log-in" : "log-out"} 
                size={24} 
                color="#fff" 
                style={{ marginRight: 10 }} 
              />
              <Text style={styles.punchBtnText}>
                {action === 'in' ? 'Clock In Now' : 'Clock Out Now'}
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
    backgroundColor: "#0f172a", // Dark background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#0f172a",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
    borderWidth: 4,
    backgroundColor: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  camera: {
    flex: 1,
  },
  cameraInstruction: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 24,
    fontWeight: "500",
    textAlign: "center",
  },
  bottomControls: {
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  punchBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  punchBtnText: {
    color: "#fff",
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
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  outsideOfficeSub: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelBtnText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EmployeePunchScreen;
