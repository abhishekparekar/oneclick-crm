import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS, SHADOWS, ROUNDING } from "../../theme/tokens";

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "—";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs}h ${mins}m`;
};

const STATUS_ITEMS = [
  {
    key: "present",
    label: "Present",
    sub: "Full Day Present",
    icon: "checkmark-circle",
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    key: "absent",
    label: "Absent",
    sub: "Unexcused Absence",
    icon: "close-circle",
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  {
    key: "half_day",
    label: "Half Day",
    sub: "Half Shift Active",
    icon: "time",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    key: "week_off",
    label: "Week Off",
    sub: "Scheduled Weekly Off",
    icon: "calendar",
    color: "#64748B",
    bg: "#F8FAFC",
    border: "#E2E8F0",
  },
  {
    key: "holiday",
    label: "Holiday",
    sub: "Company Public Holiday",
    icon: "sparkles",
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
  },
];

const LEAVE_ITEMS = [
  {
    key: "paid_leave",
    label: "Paid Leave",
    sub: "Approved Paid Time-Off",
    icon: "wallet",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    key: "unpaid_leave",
    label: "Unpaid Leave",
    sub: "Loss of Pay / Unpaid",
    icon: "card",
    color: "#EC4899",
    bg: "#FDF2F8",
    border: "#FBCFE8",
  },
];

const EmployeeDailyAttendanceScreen = ({ route, navigation }) => {
  const { employee = {}, date = new Date().toISOString(), record: initialRecord = null } = route.params || {};
  const { user } = useAuth();
  const isHR = user?.role === "HR";
  const insets = useSafeAreaInsets();

  const [currentRecord, setCurrentRecord] = useState(initialRecord);
  const [selectedStatus, setSelectedStatus] = useState(initialRecord?.status || "");
  const [loading, setLoading] = useState(false);

  // Manual Punch Modal State
  const [punchModalVisible, setPunchModalVisible] = useState(false);
  const [punchType, setPunchType] = useState("in"); // "in" or "out"
  const [punchTime, setPunchTime] = useState("");
  const [punchReason, setPunchReason] = useState("");
  const [submittingPunch, setSubmittingPunch] = useState(false);

  const topInsetPadding = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 24 : 44);

  // Format date display
  const dateObj = new Date(date);
  const formattedDay = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", { weekday: "long" })
    : "Day";
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : date;

  const empName = `${employee.firstName || "Employee"} ${employee.lastName || ""}`.trim();
  const empInitials = ((employee.firstName || "E")[0] + (employee.lastName || "")[0]).toUpperCase();
  const empCode = employee.employeeId || employee.customEmployeeId || employee.departmentId?.name || "Staff Member";

  const handleStatusChange = async (newStatus) => {
    if (selectedStatus === newStatus) return;
    setSelectedStatus(newStatus);

    try {
      setLoading(true);
      const payload = {
        employeeId: employee._id,
        date: date,
        status: newStatus,
        manualReason: "Admin override from Daily Details Screen",
      };

      const endpoint = isHR ? "/hr/attendance/manual-update" : "/company/attendance/manual-update";

      if (currentRecord?._id) {
        const res = await api.patch(`${isHR ? "/hr/attendance" : "/company/attendance"}/${currentRecord._id}/manual-update`, payload);
        if (res.data?.attendance) setCurrentRecord(res.data.attendance);
      } else {
        const res = await api.post(endpoint, payload);
        if (res.data?.attendance) setCurrentRecord(res.data.attendance);
      }

      Alert.alert("Success", `Status updated to ${newStatus.replace(/_/g, " ").toUpperCase()}`);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update attendance status.");
      setSelectedStatus(currentRecord?.status || "");
    } finally {
      setLoading(false);
    }
  };

  const openPunchModal = (type) => {
    setPunchType(type);
    const now = new Date();
    const defaultHours = String(type === "in" ? 9 : 18).padStart(2, "0");
    const defaultMins = "00";
    setPunchTime(`${defaultHours}:${defaultMins}`);
    setPunchReason("");
    setPunchModalVisible(true);
  };

  const handleSavePunch = async () => {
    if (!punchTime.trim() || !punchTime.includes(":")) {
      Alert.alert("Invalid Time", "Please enter time in HH:MM format (24-hr e.g. 09:30 or 18:00)");
      return;
    }

    try {
      setSubmittingPunch(true);
      const [hStr, mStr] = punchTime.split(":");
      const hours = parseInt(hStr, 10);
      const mins = parseInt(mStr, 10);

      if (isNaN(hours) || isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
        Alert.alert("Invalid Time", "Hours must be 0-23 and minutes 0-59.");
        return;
      }

      const punchDate = new Date(date);
      punchDate.setHours(hours, mins, 0, 0);

      const payload = {
        employeeId: employee._id,
        date: date,
        [punchType === "in" ? "punchInTime" : "punchOutTime"]: punchDate.toISOString(),
        manualReason: punchReason.trim() || `Manual ${punchType === "in" ? "Punch In" : "Punch Out"} added by Admin`,
      };

      const endpoint = isHR ? "/hr/attendance/manual-update" : "/company/attendance/manual-update";

      if (currentRecord?._id) {
        const res = await api.patch(`${isHR ? "/hr/attendance" : "/company/attendance"}/${currentRecord._id}/manual-update`, payload);
        if (res.data?.attendance) setCurrentRecord(res.data.attendance);
      } else {
        const res = await api.post(endpoint, payload);
        if (res.data?.attendance) setCurrentRecord(res.data.attendance);
      }

      Alert.alert("Success", `${punchType === "in" ? "Punch In" : "Punch Out"} recorded at ${punchTime}`);
      setPunchModalVisible(false);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to add punch entry.");
    } finally {
      setSubmittingPunch(false);
    }
  };

  const getStatusBadge = () => {
    if (!selectedStatus) {
      return {
        label: "No Record Found",
        color: "#64748B",
        bg: "#F1F5F9",
        border: "#CBD5E1",
        icon: "help-circle-outline",
      };
    }
    const allItems = [...STATUS_ITEMS, ...LEAVE_ITEMS];
    const found = allItems.find((i) => i.key === selectedStatus);
    if (found) return found;
    return {
      label: selectedStatus.replace(/_/g, " ").toUpperCase(),
      color: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
      icon: "information-circle-outline",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#082B52" translucent />

      {/* ── Executive Gradient Header with Notch Inset ── */}
      <LinearGradient
        colors={["#082B52", "#1268D9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInsetPadding + 8 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerProfileCenter}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{empInitials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerEmpName} numberOfLines={1}>
                {empName}
              </Text>
              <Text style={styles.headerEmpSub} numberOfLines={1}>
                {empCode}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => {
              const loc = currentRecord?.punchInLocation || currentRecord?.location;
              if (loc && (loc.latitude || loc.lat)) {
                Alert.alert("Recorded Location", `Lat: ${loc.latitude || loc.lat}\nLong: ${loc.longitude || loc.lng}`);
              } else {
                Alert.alert("GPS Info", "No GPS coordinates logged for this entry.");
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="location-sharp" size={13} color="#FFFFFF" />
            <Text style={styles.locationPillText}>Location</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Scrollable Body ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Date & Status Overview Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroCardTop}>
            <View>
              <Text style={styles.heroDayText}>{formattedDay}</Text>
              <Text style={styles.heroDateText}>{formattedDate}</Text>
            </View>

            <View style={[styles.statusBadgeCapsule, { backgroundColor: statusBadge.bg, borderColor: statusBadge.border }]}>
              <Ionicons name={statusBadge.icon || "radio-button-on"} size={14} color={statusBadge.color} style={{ marginRight: 5 }} />
              <Text style={[styles.statusBadgeCapsuleText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>

          {/* Time & Total Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCell}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="log-in-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.metricLabel}>PUNCH IN</Text>
              <Text style={[styles.metricVal, { color: currentRecord?.punchInTime ? "#0F172A" : "#94A3B8" }]}>
                {currentRecord?.punchInTime
                  ? new Date(currentRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </Text>
            </View>

            <View style={styles.metricSep} />

            <View style={styles.metricCell}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="log-out-outline" size={16} color="#EF4444" />
              </View>
              <Text style={styles.metricLabel}>PUNCH OUT</Text>
              <Text style={[styles.metricVal, { color: currentRecord?.punchOutTime ? "#0F172A" : "#94A3B8" }]}>
                {currentRecord?.punchOutTime
                  ? new Date(currentRecord.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </Text>
            </View>

            <View style={styles.metricSep} />

            <View style={styles.metricCell}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="time-outline" size={16} color="#2563EB" />
              </View>
              <Text style={styles.metricLabel}>TOTAL WORK</Text>
              <Text style={[styles.metricVal, { color: "#2563EB" }]}>
                {formatWorkingHours(currentRecord?.totalHours)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Daily Attendance Status Selection Grid ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderBar} />
          <Text style={styles.sectionTitle}>ATTENDANCE STATUS OVERRIDE</Text>
        </View>

        <View style={styles.statusGrid}>
          {STATUS_ITEMS.map((item) => {
            const isSelected = selectedStatus === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.statusCard,
                  { borderColor: isSelected ? item.color : "#E2E8F0" },
                  isSelected && { backgroundColor: item.bg, borderWidth: 2 },
                ]}
                onPress={() => handleStatusChange(item.key)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={[styles.statusCardIconBox, { backgroundColor: isSelected ? item.color : item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={isSelected ? "#FFFFFF" : item.color} />
                </View>
                <View style={styles.statusCardTextBox}>
                  <Text style={[styles.statusCardTitle, isSelected && { color: item.color, fontWeight: "700" }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.statusCardSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                {isSelected ? (
                  <View style={[styles.checkCircle, { backgroundColor: item.color }]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.uncheckCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Leave Classification Section ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={[styles.sectionHeaderBar, { backgroundColor: "#EC4899" }]} />
          <Text style={styles.sectionTitle}>LEAVE CLASSIFICATION</Text>
        </View>

        <View style={styles.statusGrid}>
          {LEAVE_ITEMS.map((item) => {
            const isSelected = selectedStatus === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.statusCard,
                  { borderColor: isSelected ? item.color : "#E2E8F0" },
                  isSelected && { backgroundColor: item.bg, borderWidth: 2 },
                ]}
                onPress={() => handleStatusChange(item.key)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={[styles.statusCardIconBox, { backgroundColor: isSelected ? item.color : item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={isSelected ? "#FFFFFF" : item.color} />
                </View>
                <View style={styles.statusCardTextBox}>
                  <Text style={[styles.statusCardTitle, isSelected && { color: item.color, fontWeight: "700" }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.statusCardSub} numberOfLines={1}>{item.sub}</Text>
                </View>
                {isSelected ? (
                  <View style={[styles.checkCircle, { backgroundColor: item.color }]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.uncheckCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#1268D9" />
            <Text style={styles.savingText}>Updating status on cloud...</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Floating Executive Action Bar ── */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.punchActionBtn, styles.punchInBtn]}
          onPress={() => openPunchModal("in")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.punchBtnGradient}
          >
            <Ionicons name="time-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.punchBtnText}>+ Add Punch In</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.punchActionBtn, styles.punchOutBtn]}
          onPress={() => openPunchModal("out")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#DC2626", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.punchBtnGradient}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.punchBtnText}>+ Add Punch Out</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Manual Punch Time Modal Dialog ── */}
      <Modal
        visible={punchModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPunchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={[styles.modalHeadIcon, { backgroundColor: punchType === "in" ? "#ECFDF5" : "#FEF2F2" }]}>
                <Ionicons
                  name={punchType === "in" ? "time" : "log-out"}
                  size={22}
                  color={punchType === "in" ? "#10B981" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>
                  {punchType === "in" ? "Add Punch In Time" : "Add Punch Out Time"}
                </Text>
                <Text style={styles.modalSub}>{formattedDate} · {empName}</Text>
              </View>
              <TouchableOpacity onPress={() => setPunchModalVisible(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Time (24-Hour Format HH:MM)</Text>
              <View style={styles.timeInputBox}>
                <Ionicons name="alarm-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.timeTextInput}
                  value={punchTime}
                  onChangeText={setPunchTime}
                  placeholder="09:30"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Reason / Remarks (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                value={punchReason}
                onChangeText={setPunchReason}
                placeholder="e.g. Employee forgot to punch on device"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.modalFoot}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPunchModalVisible(false)}
                disabled={submittingPunch}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: punchType === "in" ? "#10B981" : "#EF4444" },
                ]}
                onPress={handleSavePunch}
                disabled={submittingPunch}
              >
                {submittingPunch ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Punch</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfileCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  avatarMiniText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#082B52",
  },
  headerEmpName: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  headerEmpSub: {
    fontSize: 12,
    color: "#CBD5E1",
    marginTop: 1,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locationPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
    marginBottom: 20,
  },
  heroCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 14,
    marginBottom: 14,
  },
  heroDayText: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroDateText: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    marginTop: 2,
  },
  statusBadgeCapsule: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeCapsuleText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricCell: {
    flex: 1,
    alignItems: "center",
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#1268D9",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    letterSpacing: 0.6,
  },
  statusGrid: {
    gap: 10,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  statusCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCardTextBox: {
    flex: 1,
    marginLeft: 12,
  },
  statusCardTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
  },
  statusCardSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  uncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#64748B",
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    ...SHADOWS.lg,
  },
  punchActionBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginHorizontal: 5,
  },
  punchInBtn: {},
  punchOutBtn: {},
  punchBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  punchBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalHeadIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    marginBottom: 6,
  },
  timeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  timeTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  modalFoot: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    color: "#475569",
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
});

export default EmployeeDailyAttendanceScreen;
