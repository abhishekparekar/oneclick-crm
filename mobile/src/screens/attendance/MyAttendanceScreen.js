import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  SafeAreaView,
  Image,
  PermissionsAndroid,
  Platform,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import {
  punchInApi,
  punchOutApi,
  getMyMonthlyApi,
  regularizationRequestApi,
  getMyTodayApi,
  validateLocationApi,
} from "../../api/attendanceService";
import AppButton from "../../components/AppButton";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { captureGPSLocation } from "../../utils/locationService";
import * as ImagePicker from "expo-image-picker";
import { uploadSelfieToFirebase } from "../../utils/firebaseStorage";

const { width } = Dimensions.get("window");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_PADDING = 12;

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "0 hr 0 min";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

const MyAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { attendance, refreshAttendance } = useAppData();

  // Tab State: "punch" | "activity" | "account"
  const [activeTab, setActiveTab] = useState("activity"); // Default to Activity Calendar as per screenshot

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);

  // Month Picker State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Bottom Sheet/Modal Details State
  const [selectedDay, setSelectedDay] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [zoomSelfieUri, setZoomSelfieUri] = useState(null);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);

  // Regularization Modal State
  const [regModalVisible, setRegModalVisible] = useState(false);
  const [regReason, setRegReason] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);

  // Punch actions state
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [selfieChecked, setSelfieChecked] = useState(false);
  const [selfieUri, setSelfieUri] = useState(null);   // actual base64 URI
  const [capturingSelfie, setCapturingSelfie] = useState(false);

  // Geo-fencing states
  const [proximityValidated, setProximityValidated] = useState(false);
  const [insideArea, setInsideArea] = useState(true);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [allowedRadius, setAllowedRadius] = useState(100);
  const [attMode, setAttMode] = useState("office_only");
  const [checkingProximity, setCheckingProximity] = useState(false);
  const [requireSelfie, setRequireSelfie] = useState(false);
  // Ref mirror so punch handlers always read latest value (avoids stale closure)
  const requireSelfieRef = React.useRef(false);

  const fetchAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Check request-level active context cache
      let monthlyDataPayload = null;
      if (!isRefresh && attendance && attendance.month === currentMonth && attendance.year === currentYear) {
        console.log("CONTEXT HIT: MyAttendanceScreen monthlyData");
        monthlyDataPayload = attendance;
      } else {
        const { data: monthlyRes } = await getMyMonthlyApi({
          month: currentMonth,
          year: currentYear,
        });
        if (monthlyRes && monthlyRes.success) {
          monthlyDataPayload = monthlyRes.data;
          refreshAttendance({ month: currentMonth, year: currentYear });
        }
      }

      const todayRes = await getMyTodayApi();

      if (monthlyDataPayload) {
        setMonthlyData(monthlyDataPayload);
      }

      if (todayRes.data && todayRes.data.success) {
        setTodayRecord(todayRes.data.attendance || null);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to fetch attendance summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [currentMonth, currentYear])
  );

  useEffect(() => {
    if (activeTab === "punch" && !gpsCaptured && !capturingGps) {
      handleCaptureGPS();
    }
  }, [activeTab]);

  const validateProximity = async (coords) => {
    if (!coords) return { requireSelfie: false };
    try {
      setCheckingProximity(true);
      const { data: res } = await validateLocationApi({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (res && res.success) {
        setInsideArea(res.data.insideArea);
        setCurrentDistance(res.data.distance);
        setAllowedRadius(res.data.allowedRadius);
        setAttMode(res.data.attendanceMode);
        const selfieRequired = res.data.requireSelfie || false;
        setRequireSelfie(selfieRequired);
        requireSelfieRef.current = selfieRequired; // keep ref in sync
        setProximityValidated(true);
        return { requireSelfie: selfieRequired };
      }
      return { requireSelfie: false };
    } catch (err) {
      console.log("Failed to validate proximity:", err);
      return { requireSelfie: false };
    } finally {
      setCheckingProximity(false);
    }
  };

  // Camera selfie capture — shows native Android permission dialog directly in app
  const handleCaptureSelfie = async () => {
    try {
      setCapturingSelfie(true);

      // Step 1: Native Android permission request — shows "Allow/Deny" popup in app
      if (Platform.OS === "android") {
        const already = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (!already) {
          const permResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Camera Permission",
              message: "OneClick needs camera access to capture your attendance selfie.",
              buttonPositive: "Allow",
              buttonNegative: "Deny",
            }
          );
          if (permResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            Alert.alert(
              "Camera Permission Blocked",
              "Camera access is permanently denied. Please enable it in Settings → Apps → OneClick → Permissions → Camera.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
            setCapturingSelfie(false);
            return null;
          }
          if (permResult !== PermissionsAndroid.RESULTS.GRANTED) {
            setCapturingSelfie(false);
            return null;
          }
        }
      } else {
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
        const asset = result.assets[0];
        const fileUri = asset.uri;
        setSelfieUri(fileUri);
        setSelfieChecked(true);
        setCapturingSelfie(false);
        return fileUri;
      }
      setCapturingSelfie(false);
      return null;
    } catch (err) {
      console.log("Camera capture error:", err);
      if (!err?.message?.toLowerCase().includes("cancel")) {
        Alert.alert("Camera Error", "Could not open camera. Please try again.");
      }
      setCapturingSelfie(false);
      return null;
    }
  };

  // Unified GPS Location coordinates capturing with permissions
  const handleCaptureGPS = async () => {
    try {
      setCapturingGps(true);
      const coords = await captureGPSLocation();
      if (coords) {
        setGpsCoords(coords);
        setGpsCaptured(true);
        setCapturingGps(false);
        // Get fresh requireSelfie from the server and return it alongside coords
        const proximity = await validateProximity(coords);
        return { coords, requireSelfie: proximity?.requireSelfie || false };
      }
      setCapturingGps(false);
      return null;
    } catch (err) {
      console.log("GPS capture error:", err);
      setCapturingGps(false);
      return null;
    }
  };

  // ─── Punch In ────────────────────────────────────────────────────────────────
  const handlePunchIn = async () => {
    let currentCoords = gpsCoords;
    // Read latest requireSelfie from ref (avoids stale closure)
    let currentRequireSelfie = requireSelfieRef.current;

    // Step 1: Capture GPS if not already done
    if (!gpsCaptured || !currentCoords) {
      setLoading(true);
      const result = await handleCaptureGPS();
      if (!result) {
        setLoading(false);
        return;
      }
      currentCoords = result.coords;
      currentRequireSelfie = result.requireSelfie;
      requireSelfieRef.current = currentRequireSelfie;
    }

    // Step 2: If selfie is required and not yet captured — auto-open camera
    let activeSelfieUri = selfieUri;
    if (currentRequireSelfie && !activeSelfieUri) {
      const captured = await handleCaptureSelfie();
      if (!captured) {
        Alert.alert("Cancelled", "Selfie is required to clock in.");
        setLoading(false);
        return;
      }
      activeSelfieUri = captured;
    }

    // Step 3: Confirmation dialog before submitting
    await doPunchIn(currentCoords, activeSelfieUri);
  };

  const doPunchIn = async (coords, selfie) => {
    try {
      setLoading(true);

      let finalSelfieUri = selfie;
      if (selfie && selfie.startsWith("file://")) {
        finalSelfieUri = await uploadSelfieToFirebase(selfie, user?._id || "unknown");
      }

      const payload = {
        punchInLocation: coords,
        ...(finalSelfieUri ? { punchInSelfie: finalSelfieUri } : {}),
      };
      await punchInApi(payload);
      Alert.alert("✅ Clocked In!", "You have successfully punched in. Have a great day!");
      setGpsCaptured(false);
      setGpsCoords(null);
      setSelfieUri(null);
      setSelfieChecked(false);
      fetchAttendance(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Punch In failed");
      setLoading(false);
    }
  };

  // ─── Punch Out ───────────────────────────────────────────────────────────────
  const handlePunchOut = async () => {
    let currentCoords = gpsCoords;
    let currentRequireSelfie = requireSelfieRef.current;

    // Step 1: Capture GPS if not already done
    if (!gpsCaptured || !currentCoords) {
      setLoading(true);
      const result = await handleCaptureGPS();
      if (!result) {
        setLoading(false);
        return;
      }
      currentCoords = result.coords;
      currentRequireSelfie = result.requireSelfie;
      requireSelfieRef.current = currentRequireSelfie;
    }

    // Step 2: If selfie is required and not yet captured — auto-open camera
    let activeSelfieUri = selfieUri;
    if (currentRequireSelfie && !activeSelfieUri) {
      const captured = await handleCaptureSelfie();
      if (!captured) {
        Alert.alert("Cancelled", "Selfie is required to clock out.");
        setLoading(false);
        return;
      }
      activeSelfieUri = captured;
    }

    // Step 3: Confirmation dialog before submitting
    await doPunchOut(currentCoords, activeSelfieUri);
  };

  const doPunchOut = async (coords, selfie) => {
    try {
      setLoading(true);

      let finalSelfieUri = selfie;
      if (selfie && selfie.startsWith("file://")) {
        finalSelfieUri = await uploadSelfieToFirebase(selfie, user?._id || "unknown");
      }

      const payload = {
        punchOutLocation: coords,
        ...(finalSelfieUri ? { punchOutSelfie: finalSelfieUri } : {}),
      };
      await punchOutApi(payload);
      Alert.alert("✅ Clocked Out!", "You have successfully punched out. See you tomorrow!");
      setGpsCaptured(false);
      setGpsCoords(null);
      setSelfieUri(null);
      setSelfieChecked(false);
      fetchAttendance(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Punch Out failed");
      setLoading(false);
    }
  };

  const handleLaunchRegularization = (day) => {
    setSelectedDay(day);
    setDetailsModalVisible(false);
    setRegReason("");
    setRegModalVisible(true);
  };

  const handleSubmitRegularization = async () => {
    if (!regReason.trim()) {
      Alert.alert("Error", "Please input a regularization reason.");
      return;
    }

    try {
      setSubmittingReg(true);
      const payload = {
        attendanceId: selectedDay?._id,
        date: selectedDay?.date,
        reason: regReason.trim(),
      };
      await regularizationRequestApi(payload);
      Alert.alert("Success", "Regularization request submitted successfully!");
      setRegModalVisible(false);
      fetchAttendance(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmittingReg(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Status color mapping: absent=red, present/late=green, half-day=yellow
  const getStatusColor = (status) => {
    switch (status) {
      case "present": return "#16a34a";
      case "late": return "#ea580c";
      case "half-day":
      case "half_day": return "#d97706";
      case "absent": return "#dc2626";
      case "paid_leave": return "#2563eb";
      case "unpaid_leave": return "#db2777";
      case "holiday":
      case "weekly_off": return "#64748b";
      default: return "#cbd5e1";
    }
  };

  const getStatusPastel = (status) => {
    switch (status) {
      case "present": return "#dcfce7";
      case "late": return "#ffedd5";
      case "half-day":
      case "half_day": return "#fef3c7";
      case "absent": return "#fee2e2";
      case "paid_leave": return "#eff6ff";
      case "unpaid_leave": return "#fdf2f8";
      case "holiday":
      case "weekly_off": return "#f8fafc";
      default: return "#ffffff";
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case "present": return "#16a34a";
      case "late": return "#ea580c";
      case "half-day":
      case "half_day": return "#d97706";
      case "absent": return "#dc2626";
      case "paid_leave": return "#2563eb";
      case "unpaid_leave": return "#db2777";
      case "holiday":
      case "weekly_off": return "#475569";
      default: return "#94a3b8";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Unmarked";
    return status.replace("_", " ").toUpperCase();
  };

  const getSolidColor = (status) => {
    switch (status) {
      case "present": return "#10b981";
      case "late": return "#f59e0b";
      case "half-day":
      case "half_day": return "#f59e0b";
      case "absent": return "#ef4444";
      case "paid_leave": return "#3b82f6";
      case "unpaid_leave": return "#ec4899";
      case "holiday":
      case "weekly_off": return "#9ca3af";
      default: return "#9ca3af";
    }
  };

  const renderCalendar = () => {
    const days = monthlyData?.days || [];
    const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
    const startOffset = firstDayDate.getDay(); // Weekday index for day 1

    const calendarGrid = [];

    // Push empty offset pads
    for (let i = 0; i < startOffset; i++) {
      calendarGrid.push(<View key={`pad-${i}`} style={styles.dayCellWrapper} />);
    }

    // Push days
    days.forEach((day, index) => {
      const isToday = day.date === getLocalDateString();
      const solidBg = getSolidColor(day.status);

      calendarGrid.push(
        <TouchableOpacity
          key={`day-${index}`}
          onPress={() => {
            setSelectedDay(day);
            setDetailsModalVisible(true);
          }}
          style={styles.dayCellWrapper}
          activeOpacity={0.7}
        >
          <View style={[styles.calendarDayCell, { backgroundColor: solidBg }, isToday && styles.todayCell]}>
            <Text style={styles.calendarDayText}>
              {day.day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });

    return <View style={styles.calendarGridContainer}>{calendarGrid}</View>;
  };

  const summary = monthlyData?.summary;
  const isPunchDisabled = proximityValidated && !insideArea && attMode === "office_only" && !(user?.role === "CompanyAdmin");

  return (
    <View style={styles.container}>
      {/* Visual Header - Dark Navy Steel Blue */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || "Rameshwar chate"}</Text>
        </View>
        {(user?.role === "HR" || user?.role === "CompanyAdmin") && (
          <TouchableOpacity
            style={styles.manageStaffBtn}
            onPress={() => {
              if (user?.role === "HR") {
                navigation.navigate("HRManageAttendance");
              } else {
                navigation.navigate("CompanyAttendance");
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.manageStaffText}>Manage Staff</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Select Panel (Month Banner) - Light Cyan Banner */}
      {activeTab !== "punch" && (
        <View style={styles.dateSelectorPanel}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={20} color="#F97316" />
          </TouchableOpacity>
          <Text style={styles.monthHeading}>
            {new Date(currentYear, currentMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={20} color="#F97316" />
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Top Segmented Toggle (Completely replaces screen-level bottom bar) */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentItem, activeTab === "punch" && styles.segmentItemActive]}
          onPress={() => setActiveTab("punch")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "punch" ? "finger-print" : "finger-print-outline"}
            size={15}
            color={activeTab === "punch" ? "#F97316" : "#64748b"}
          />
          <Text style={[styles.segmentLabel, activeTab === "punch" && styles.segmentLabelActive]}>
            Punch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentItem, activeTab === "activity" && styles.segmentItemActive]}
          onPress={() => setActiveTab("activity")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "activity" ? "calendar" : "calendar-outline"}
            size={15}
            color={activeTab === "activity" ? "#F97316" : "#64748b"}
          />
          <Text style={[styles.segmentLabel, activeTab === "activity" && styles.segmentLabelActive]}>
            Activity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentItem, activeTab === "account" && styles.segmentItemActive]}
          onPress={() => setActiveTab("account")}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === "account" ? "person" : "person-outline"}
            size={15}
            color={activeTab === "account" ? "#F97316" : "#64748b"}
          />
          <Text style={[styles.segmentLabel, activeTab === "account" && styles.segmentLabelActive]}>
            Account
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Synchronizing Attendance Ledger...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchAttendance(true)} />
            }
          >
            {/* TAB 1: PUNCH INTERFACE */}
            {activeTab === "punch" && (
              <View>
                {/* Selfie Camera mock */}
                <View style={styles.punchCard}>
                  <Text style={styles.punchDateStr}>
                    {new Date().toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>

                  {/* Punch Status banner */}
                  <View style={styles.todayPunchStatusRow}>
                    <Text style={styles.punchStatusLabel}>CLOCK IN STATUS:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(todayRecord?.status) + "22" }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(todayRecord?.status) }]}>
                        {getStatusLabel(todayRecord?.status || "absent")}
                      </Text>
                    </View>
                  </View>

                  {/* GPS and Selfie Verification */}
                  <View style={styles.verifyContainer}>
                    <TouchableOpacity
                      style={[styles.verifyRow, gpsCaptured && styles.verifyRowActive]}
                      onPress={handleCaptureGPS}
                      disabled={capturingGps}
                    >
                      <Ionicons
                        name={gpsCaptured ? "location" : "location-outline"}
                        size={20}
                        color={gpsCaptured ? "#10b981" : "#64748b"}
                      />
                      <Text style={[styles.verifyText, gpsCaptured && styles.verifyTextActive]}>
                        {capturingGps ? "Capturing coordinates..." : gpsCaptured ? "GPS Coordinates Captured" : "Capture Location GPS"}
                      </Text>
                      {gpsCaptured && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
                    </TouchableOpacity>

                    {gpsCaptured && gpsCoords && (
                      <Text style={styles.coordsText} numberOfLines={1}>
                        Lat: {gpsCoords.latitude} • Long: {gpsCoords.longitude} • Address: {gpsCoords.address}
                      </Text>
                    )}

                    {/* Selfie Capture Card — shown before punch in (required or optional based on admin setting) */}
                    {!todayRecord?.punchInTime && (
                      <View style={[styles.selfieCard, requireSelfie && !selfieChecked && styles.selfieCardRequired]}>
                        <View style={styles.selfieCardHeader}>
                          <Ionicons name="camera-outline" size={18} color={requireSelfie ? "#dc2626" : "#2563eb"} style={{ marginRight: 6 }} />
                          <Text style={[styles.selfieCardTitle, requireSelfie && { color: "#dc2626" }]}>
                            Attendance Selfie {requireSelfie ? "(Required ✱)" : "(Optional)"}
                          </Text>
                          {selfieChecked && <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: "auto" }} />}
                        </View>

                        {selfieUri ? (
                          <View style={styles.selfiePreviewBox}>
                            <Image source={{ uri: selfieUri }} style={styles.selfiePreviewImg} />
                            <TouchableOpacity
                              style={styles.selfieRetakeBtn}
                              onPress={handleCaptureSelfie}
                              disabled={capturingSelfie}
                            >
                              <Ionicons name="refresh-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                              <Text style={styles.selfieRetakeText}>Retake Selfie</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.selfieCaptureBtn, requireSelfie && styles.selfieCaptureBtnRequired]}
                            onPress={handleCaptureSelfie}
                            disabled={capturingSelfie}
                            activeOpacity={0.75}
                          >
                            {capturingSelfie ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                                <Text style={styles.selfieCaptureBtnText}>
                                  {requireSelfie ? "📸 Capture Required Selfie" : "📸 Capture Selfie"}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Punch-Out selfie card — shown after punch in but before punch out */}
                    {todayRecord?.punchInTime && !todayRecord?.punchOutTime && (
                      <View style={[styles.selfieCard, requireSelfie && !selfieChecked && styles.selfieCardRequired]}>
                        <View style={styles.selfieCardHeader}>
                          <Ionicons name="camera-outline" size={18} color={requireSelfie ? "#dc2626" : "#7c3aed"} style={{ marginRight: 6 }} />
                          <Text style={[styles.selfieCardTitle, { color: requireSelfie ? "#dc2626" : "#7c3aed" }]}>
                            Clock-Out Selfie {requireSelfie ? "(Required ✱)" : "(Optional)"}
                          </Text>
                          {selfieChecked && <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: "auto" }} />}
                        </View>

                        {selfieUri ? (
                          <View style={styles.selfiePreviewBox}>
                            <Image source={{ uri: selfieUri }} style={styles.selfiePreviewImg} />
                            <TouchableOpacity
                              style={styles.selfieRetakeBtn}
                              onPress={handleCaptureSelfie}
                              disabled={capturingSelfie}
                            >
                              <Ionicons name="refresh-outline" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
                              <Text style={[styles.selfieRetakeText, { color: "#7c3aed" }]}>Retake Selfie</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.selfieCaptureBtn, { backgroundColor: requireSelfie ? "#dc2626" : "#7c3aed" }]}
                            onPress={handleCaptureSelfie}
                            disabled={capturingSelfie}
                            activeOpacity={0.75}
                          >
                            {capturingSelfie ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                                <Text style={styles.selfieCaptureBtnText}>
                                  {requireSelfie ? "📸 Capture Required Selfie" : "📸 Capture Selfie"}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Proximity / Geo-Fencing feedback banner */}
                  {checkingProximity ? (
                    <View style={styles.proximityCheckingContainer}>
                      <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} />
                      <Text style={styles.proximityCheckingText}>Checking geo-fencing proximity boundaries...</Text>
                    </View>
                  ) : proximityValidated ? (
                    !insideArea && attMode === "office_only" ? (
                      <View style={styles.warningContainer}>
                        <Ionicons name="alert-circle" size={20} color="#dc2626" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.warningTitle}>You are outside the authorized attendance area.</Text>
                          <Text style={styles.warningSubtitle}>
                            Current distance: {currentDistance}m (Allowed: {allowedRadius}m)
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.successContainer}>
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.successTitle}>Inside authorized boundary</Text>
                          <Text style={styles.successSubtitle}>
                            You are inside the office geo-fence range ({currentDistance}m away).
                          </Text>
                        </View>
                      </View>
                    )
                  ) : null}

                  {/* Clock Actions */}
                  <View style={styles.punchBtnWrapper}>
                    {!todayRecord?.punchInTime ? (
                      <AppButton
                        title="Clock In (Punch In)"
                        loading={loading}
                        disabled={isPunchDisabled}
                        onPress={handlePunchIn}
                        style={[styles.punchInBtn, isPunchDisabled && styles.disabledPunchBtn]}
                      />
                    ) : !todayRecord?.punchOutTime ? (
                      <AppButton
                        title="Clock Out (Punch Out)"
                        loading={loading}
                        disabled={isPunchDisabled}
                        onPress={handlePunchOut}
                        style={[styles.punchOutBtn, isPunchDisabled && styles.disabledPunchBtn]}
                      />
                    ) : (
                      <View style={styles.punchedCard}>
                        <Ionicons name="checkmark-done-circle" size={44} color="#10b981" />
                        <Text style={styles.punchedTitle}>Attendance Completed Today</Text>
                        <Text style={styles.punchedHours}>Total Worked: {todayRecord.totalHours ? formatWorkingHours(todayRecord.totalHours) : "0 hr 0 min"}</Text>
                      </View>
                    )}
                  </View>

                  {/* View History Button */}
                  <TouchableOpacity
                    style={styles.viewHistoryBtn}
                    onPress={() => setActiveTab("activity")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={styles.viewHistoryText}>View Calendar / History</Text>
                  </TouchableOpacity>

                  {/* Time breakdown row */}
                  {todayRecord?.punchInTime && (
                    <View style={styles.timeBreakdownRow}>
                      <View style={styles.timeBox}>
                        <Text style={styles.timeLabel}>PUNCH IN</Text>
                        <Text style={styles.timeVal}>
                          {new Date(todayRecord.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.timeBox}>
                        <Text style={styles.timeLabel}>PUNCH OUT</Text>
                        <Text style={styles.timeVal}>
                          {todayRecord.punchOutTime
                            ? new Date(todayRecord.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "--:--"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: ACTIVITY CALENDAR (Clean Calendar with NO legend items below) */}
            {activeTab === "activity" && (
              <View>
                {/* Dark Stats Capsule Card at the Top */}
                <View style={styles.statsCapsuleCard}>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#22c55e" }]}>Present</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#22c55e" }]}>{summary?.present || 0}</Text>
                  </View>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#f97316" }]}>Late</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#f97316" }]}>{summary?.late || 0}</Text>
                  </View>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#ef4444" }]}>Absent</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#ef4444" }]}>{summary?.absent || 0}</Text>
                  </View>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#eab308" }]}>Half Days</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#eab308" }]}>{summary?.halfDays || 0}</Text>
                  </View>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#3b82f6" }]}>Paid</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#3b82f6" }]}>{summary?.paidLeaves || 0}</Text>
                  </View>
                  <View style={styles.statsCapsuleItem}>
                    <Text style={[styles.statsCapsuleLabel, { color: "#ec4899" }]}>Unpaid</Text>
                    <Text style={[styles.statsCapsuleVal, { color: "#ec4899" }]}>{summary?.unpaidLeaves || 0}</Text>
                  </View>
                </View>

                {/* Day headers Sun-Sat */}
                <View style={styles.weekHeaders}>
                  {WEEKDAYS.map((w, index) => (
                    <Text key={w} style={[styles.weekHeaderVal, index === 0 && styles.sundayHeaderVal]}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Grid map */}
                {renderCalendar()}
              </View>
            )}

            {/* TAB 3: ACCOUNT STATS */}
            {activeTab === "account" && (
              <View style={styles.infoCard}>
                <Text style={styles.statsCardTitle}>Monthly Ledger Totals</Text>

                <View style={styles.statsGrid}>
                  <View style={[styles.statsCell, { backgroundColor: "#22c55e15" }]}>
                    <Text style={[styles.statsVal, { color: "#22c55e" }]}>{summary?.present || 0}</Text>
                    <Text style={styles.statsLabel}>Present Days</Text>
                  </View>

                  <View style={[styles.statsCell, { backgroundColor: "#f9731615" }]}>
                    <Text style={[styles.statsVal, { color: "#f97316" }]}>{summary?.late || 0}</Text>
                    <Text style={styles.statsLabel}>Late Days</Text>
                  </View>

                  <View style={[styles.statsCell, { backgroundColor: "#ef444415" }]}>
                    <Text style={[styles.statsVal, { color: "#ef4444" }]}>{summary?.absent || 0}</Text>
                    <Text style={styles.statsLabel}>Absent Days</Text>
                  </View>

                  <View style={[styles.statsCell, { backgroundColor: "#eab30815" }]}>
                    <Text style={[styles.statsVal, { color: "#eab308" }]}>{summary?.halfDays || 0}</Text>
                    <Text style={styles.statsLabel}>Half Days</Text>
                  </View>

                  <View style={[styles.statsCell, { backgroundColor: "#3b82f615" }]}>
                    <Text style={[styles.statsVal, { color: "#3b82f6" }]}>{summary?.paidLeaves || 0}</Text>
                    <Text style={styles.statsLabel}>Paid Leaves</Text>
                  </View>

                  <View style={[styles.statsCell, { backgroundColor: "#ec489915" }]}>
                    <Text style={[styles.statsVal, { color: "#ec4899" }]}>{summary?.unpaidLeaves || 0}</Text>
                    <Text style={styles.statsLabel}>Unpaid LWP</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Date Details Dialog modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalBgDim}>
          <View style={styles.detailsModalContent}>
            {/* Premium Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="calendar" size={20} color="#1b2a47" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Attendance Insights</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedDay && (
              <ScrollView
                contentContainerStyle={styles.detailsModalScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Clicked Date Subheading */}
                <View style={styles.modalDateBanner}>
                  <Text style={styles.modalDateText}>
                    {new Date(selectedDay.date).toLocaleDateString("en-IN", {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusPastel(selectedDay.status), borderColor: getStatusColor(selectedDay.status) }]}>
                    <Text style={[styles.statusBadgeTextLarge, { color: getStatusTextColor(selectedDay.status) }]}>
                      {getStatusLabel(selectedDay.status)}
                    </Text>
                  </View>
                </View>

                {/* Double Clock Cards */}
                <View style={styles.clockCardsContainer}>
                  {/* Punch In Card */}
                  <View style={styles.clockCard}>
                    <View style={styles.clockCardHeader}>
                      <View style={styles.clockCardHeaderLeft}>
                        <Ionicons name="log-in" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                        <Text style={styles.clockCardTitle}>CLOCK IN</Text>
                      </View>
                      <Text style={[styles.clockCardTime, { color: "#16a34a" }]}>
                        {selectedDay.punchInTime
                          ? new Date(selectedDay.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "N/A"}
                      </Text>
                    </View>

                    <View style={styles.clockCardBody}>
                      {/* Selfie Thumbnail */}
                      <View style={styles.cardSelfieSection}>
                        {selectedDay.punchInSelfie ? (
                          <TouchableOpacity
                            onPress={() => {
                              setZoomSelfieUri(selectedDay.punchInSelfie);
                              setZoomModalVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: selectedDay.punchInSelfie }}
                              style={[styles.modalSelfieThumb, { borderColor: "#16a34a" }]}
                            />
                            <View style={styles.zoomBadge}>
                              <Ionicons name="scan-outline" size={10} color="#ffffff" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.modalSelfiePlaceholder}>
                            <Ionicons name="camera-outline" size={20} color="#94a3b8" />
                            <Text style={styles.placeholderLabel}>No photo</Text>
                          </View>
                        )}
                        <Text style={styles.selfieCaption}>Selfie Photo</Text>
                      </View>

                      {/* Location Details */}
                      <View style={styles.cardLocationSection}>
                        <Ionicons name="location-sharp" size={14} color="#64748b" style={{ marginTop: 2, marginRight: 4 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationTitle}>Punch Location</Text>
                          <Text style={styles.locationAddr} numberOfLines={2}>
                            {selectedDay.punchInLocation?.address ||
                              (selectedDay.punchInLocation?.latitude ? `Lat: ${selectedDay.punchInLocation.latitude.toFixed(4)}, Lng: ${selectedDay.punchInLocation.longitude.toFixed(4)}` : "No GPS tracked")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Punch Out Card */}
                  <View style={styles.clockCard}>
                    <View style={styles.clockCardHeader}>
                      <View style={styles.clockCardHeaderLeft}>
                        <Ionicons name="log-out" size={16} color="#ea580c" style={{ marginRight: 6 }} />
                        <Text style={styles.clockCardTitle}>CLOCK OUT</Text>
                      </View>
                      <Text style={[styles.clockCardTime, { color: selectedDay.punchOutTime ? "#ea580c" : "#94a3b8" }]}>
                        {selectedDay.punchOutTime
                          ? new Date(selectedDay.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "N/A"}
                      </Text>
                    </View>

                    <View style={styles.clockCardBody}>
                      {/* Selfie Thumbnail */}
                      <View style={styles.cardSelfieSection}>
                        {selectedDay.punchOutSelfie ? (
                          <TouchableOpacity
                            onPress={() => {
                              setZoomSelfieUri(selectedDay.punchOutSelfie);
                              setZoomModalVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri: selectedDay.punchOutSelfie }}
                              style={[styles.modalSelfieThumb, { borderColor: "#ea580c" }]}
                            />
                            <View style={styles.zoomBadge}>
                              <Ionicons name="scan-outline" size={10} color="#ffffff" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.modalSelfiePlaceholder}>
                            <Ionicons name="camera-outline" size={20} color="#94a3b8" />
                            <Text style={styles.placeholderLabel}>No photo</Text>
                          </View>
                        )}
                        <Text style={styles.selfieCaption}>Selfie Photo</Text>
                      </View>

                      {/* Location Details */}
                      <View style={styles.cardLocationSection}>
                        <Ionicons name="location-sharp" size={14} color="#64748b" style={{ marginTop: 2, marginRight: 4 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationTitle}>Punch Location</Text>
                          <Text style={styles.locationAddr} numberOfLines={2}>
                            {selectedDay.punchOutLocation?.address ||
                              (selectedDay.punchOutLocation?.latitude ? `Lat: ${selectedDay.punchOutLocation.latitude.toFixed(4)}, Lng: ${selectedDay.punchOutLocation.longitude.toFixed(4)}` : "No GPS tracked")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Telemetry and Metrics Card */}
                <View style={styles.telemetryCard}>
                  <Text style={styles.telemetryTitle}>VERIFICATION & METRICS</Text>

                  <View style={styles.telemetryRow}>
                    <View style={styles.telemetryItem}>
                      <Ionicons name="time" size={16} color="#2563eb" />
                      <View style={styles.telemetryTextCol}>
                        <Text style={styles.telemetryLabel}>Total Duration</Text>
                        <Text style={styles.telemetryVal}>{selectedDay.totalHours ? formatWorkingHours(selectedDay.totalHours) : "0 hr 0 min"}</Text>
                      </View>
                    </View>

                    <View style={styles.telemetryItem}>
                      <Ionicons name="git-branch" size={16} color="#8b5cf6" />
                      <View style={styles.telemetryTextCol}>
                        <Text style={styles.telemetryLabel}>Ledger Source</Text>
                        <Text style={[styles.telemetryVal, { textTransform: "capitalize" }]}>{selectedDay.source || "system"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.telemetryRow, { borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 10, marginTop: 10 }]}>
                    <View style={styles.telemetryItem}>
                      <Ionicons name="git-compare" size={16} color="#C2410C" />
                      <View style={styles.telemetryTextCol}>
                        <Text style={styles.telemetryLabel}>Office Proximity</Text>
                        <Text style={styles.telemetryVal}>
                          {selectedDay.distanceFromOffice !== null && selectedDay.distanceFromOffice !== undefined
                            ? `${selectedDay.distanceFromOffice}m away`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.telemetryItem}>
                      <Ionicons name="shield-checkmark" size={16} color={selectedDay.gpsValidated ? "#16a34a" : "#64748b"} />
                      <View style={styles.telemetryTextCol}>
                        <Text style={styles.telemetryLabel}>GPS Validation</Text>
                        <Text style={[styles.telemetryVal, { color: selectedDay.gpsValidated ? "#16a34a" : "#64748b" }]}>
                          {selectedDay.gpsValidated ? "Validated" : "Not Validated"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {selectedDay.regularizationStatus && selectedDay.regularizationStatus !== "none" && (
                  <View style={styles.regStatusCard}>
                    <Ionicons name="document-text" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.regCardTitle}>REGULARIZATION REQUEST</Text>
                      <Text style={styles.regCardStatus}>
                        Status: <Text style={{ fontWeight: "800", color: "#2563eb" }}>{selectedDay.regularizationStatus.toUpperCase()}</Text>
                      </Text>
                    </View>
                  </View>
                )}

                {/* Regularization launcher */}
                {selectedDay.status !== "present" && selectedDay.status !== "late" && (!selectedDay.regularizationStatus || selectedDay.regularizationStatus === "none") && (
                  <TouchableOpacity
                    style={styles.modalRegularizationBtn}
                    onPress={() => handleLaunchRegularization(selectedDay)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="build" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalRegularizationText}>Request Regularization</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Selfie Zoom Modal */}
      <Modal visible={zoomModalVisible} transparent animationType="fade">
        <View style={styles.zoomModalBg}>
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setZoomModalVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={38} color="#ffffff" />
          </TouchableOpacity>
          {zoomSelfieUri && (
            <Image
              source={{ uri: zoomSelfieUri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Regularize reason capture Modal */}
      <Modal visible={regModalVisible} transparent animationType="fade">
        <View style={styles.modalBgDim}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Regularization</Text>
            <Text style={styles.modalSubtitle}>Date: {selectedDay?.date}</Text>

            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Provide a valid explanation for regularization (e.g. Forgot checking out)..."
              placeholderTextColor="#94a3b8"
              value={regReason}
              onChangeText={setRegReason}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                style={styles.cancelBtn}
                textStyle={{ color: "#475569" }}
                onPress={() => setRegModalVisible(false)}
              />
              <AppButton
                title={submittingReg ? "Submitting..." : "Submit Request"}
                style={styles.confirmBtn}
                loading={submittingReg}
                onPress={handleSubmitRegularization}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eff3f6", // Light soft gray matching user screenshot background
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#1b2a47", // Solid Steel / Slate Navy Blue
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  manageStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  manageStaffText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  dateSelectorPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "#e0f2fe", // Light turquoise blue/teal background
  },
  monthArrow: {
    padding: 8,
  },
  monthHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0369a1", // Dark blue-teal shade
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0", // Light elegant gray track under the month picker
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: "#ffffff", // Pure white sliding tab
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginLeft: 6,
  },
  segmentLabelActive: {
    color: "#1b2a47",
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24, // Standard padding since screen-level bottom bar is completely removed
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 120,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  punchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  punchDateStr: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  todayPunchStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  punchStatusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  verifyContainer: {
    marginBottom: 16,
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  verifyRowActive: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  verifyText: {
    fontSize: 12.5,
    color: "#475569",
    marginLeft: 10,
    flex: 1,
    fontWeight: "600",
  },
  verifyTextActive: {
    color: "#10b981",
  },
  coordsText: {
    fontSize: 10,
    color: "#64748b",
    marginLeft: 12,
    marginBottom: 10,
    fontWeight: "500",
  },
  punchBtnWrapper: {
    alignItems: "center",
    marginVertical: 12,
  },
  punchInBtn: {
    width: "100%",
    backgroundColor: "#2563eb",
    height: 48,
  },
  punchOutBtn: {
    width: "100%",
    backgroundColor: "#ea580c",
    height: 48,
  },
  punchedCard: {
    alignItems: "center",
    paddingVertical: 16,
  },
  punchedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#10b981",
    marginTop: 8,
  },
  punchedHours: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
  timeBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
    marginTop: 12,
  },
  timeBox: {
    width: "48%",
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 9.5,
    color: "#94a3b8",
    fontWeight: "700",
  },
  timeVal: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 4,
  },
  statsCapsuleCard: {
    backgroundColor: "#1b2a47", // Dark Navy Capsule Background
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statsCapsuleItem: {
    alignItems: "center",
    width: "30%",
    marginBottom: 8,
  },
  statsCapsuleLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  statsCapsuleVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  weekHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  weekHeaderVal: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  sundayHeaderVal: {
    color: "#ef4444", // bold Red for Sun
  },
  calendarGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  dayCellWrapper: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  calendarDayCell: {
    marginVertical: 3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "700",
  },
  calendarDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
  },
  todayCell: {
    borderWidth: 2,
    borderColor: "#1b2a47", // bold deep navy border
  },
  unmarkedCell: {
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statsCell: {
    width: "48%",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  statsVal: {
    fontSize: 22,
    fontWeight: "800",
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  modalBgDim: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)", // deep soft charcoal dim
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  detailsModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: "95%",
    maxHeight: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1b2a47",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDateBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalDateText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
    flex: 1,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeTextLarge: {
    fontSize: 11,
    fontWeight: "800",
  },
  clockCardsContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 14,
  },
  clockCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
  clockCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
    marginBottom: 8,
  },
  clockCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  clockCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  clockCardTime: {
    fontSize: 14,
    fontWeight: "800",
  },
  clockCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardSelfieSection: {
    alignItems: "center",
    position: "relative",
  },
  modalSelfieThumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  zoomBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1b2a47",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSelfiePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  placeholderLabel: {
    fontSize: 8.5,
    color: "#94a3b8",
    fontWeight: "600",
  },
  selfieCaption: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 4,
  },
  cardLocationSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
  },
  locationTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  locationAddr: {
    fontSize: 10.5,
    color: "#334155",
    fontWeight: "500",
    lineHeight: 13,
    marginTop: 1,
  },
  telemetryCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 14,
  },
  telemetryTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  telemetryItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  telemetryTextCol: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "600",
  },
  telemetryVal: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 1,
  },
  regStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  regCardTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2563eb",
  },
  regCardStatus: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    marginTop: 1,
  },
  modalRegularizationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  modalRegularizationText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
  },
  zoomModalBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  zoomImage: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  detailsModalScroll: {
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 12.5,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "700",
  },
  regStatusBox: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modalActionBtn: {
    marginTop: 20,
    backgroundColor: "#2563eb",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    color: "#1e293b",
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    width: "48%",
    height: 40,
  },
  confirmBtn: {
    backgroundColor: "#2563eb",
    width: "48%",
    height: 40,
  },
  viewHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 8,
  },
  viewHistoryText: {
    fontSize: 12.5,
    color: "#2563eb",
    fontWeight: "700",
  },
  proximityCheckingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  proximityCheckingText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  warningSubtitle: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
    fontWeight: "500",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  successSubtitle: {
    fontSize: 11,
    color: "#22c55e",
    marginTop: 2,
    fontWeight: "500",
  },
  disabledPunchBtn: {
    backgroundColor: "#94a3b8",
    opacity: 0.65,
  },
  selfieCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginTop: 10,
    marginBottom: 2,
  },
  selfieCardRequired: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
  },
  selfieCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  selfieCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
    flex: 1,
  },
  selfieCaptureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selfieCaptureBtnRequired: {
    backgroundColor: "#dc2626",
  },
  selfieCaptureBtnText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
  },
  selfiePreviewBox: {
    alignItems: "center",
  },
  selfiePreviewImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#10b981",
    marginBottom: 10,
  },
  selfieRetakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  selfieRetakeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
});

export default MyAttendanceScreen;
