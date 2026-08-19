import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";
import {
  getCompanySettingsApi,
  updateCompanySettingsApi,
  getLeaveSettingsApi,
  updateLeaveSettingsApi,
} from "../../api/companyService";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const CompanySettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === "CompanyAdmin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  const [shiftEndTime, setShiftEndTime] = useState("18:00");
  const [lateMarkGraceMinutes, setLateMarkGraceMinutes] = useState("15");
  const [halfDayHours, setHalfDayHours] = useState("4");
  const [workingDays, setWorkingDays] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);

  // Leave Settings State
  const [defaultCasualLeaves, setDefaultCasualLeaves] = useState("0");
  const [defaultSickLeaves, setDefaultSickLeaves] = useState("0");
  const [defaultAnnualLeaves, setDefaultAnnualLeaves] = useState("0");
  const [defaultUnpaidLeaves, setDefaultUnpaidLeaves] = useState("0");
  const [allowPaidLeaveOverflowAsLWP, setAllowPaidLeaveOverflowAsLWP] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await getCompanySettingsApi();
      if (data && data.settings) {
        const s = data.settings;
        setShiftStartTime(s.shiftStartTime || "09:00");
        setShiftEndTime(s.shiftEndTime || "18:00");
        setLateMarkGraceMinutes(String(s.lateMarkGraceMinutes ?? 15));
        setHalfDayHours(String(s.halfDayHours ?? 4));
        setWorkingDays(s.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
      }
      
      const leaveRes = await getLeaveSettingsApi();
      if (leaveRes.data && leaveRes.data.settings) {
        const ls = leaveRes.data.settings;
        setDefaultCasualLeaves(String(ls.defaultCasualLeaves ?? 0));
        setDefaultSickLeaves(String(ls.defaultSickLeaves ?? 0));
        setDefaultAnnualLeaves(String(ls.defaultAnnualLeaves ?? 0));
        setDefaultUnpaidLeaves(String(ls.defaultUnpaidLeaves ?? 0));
        setAllowPaidLeaveOverflowAsLWP(ls.allowPaidLeaveOverflowAsLWP ?? true);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        Alert.alert(
          "Access Denied",
          "Warning: You do not have permission to view Company Settings.",
          [{ text: "OK", onPress: () => { if (navigation.canGoBack()) navigation.goBack(); } }]
        );
      } else {
        Alert.alert("Error", err.response?.data?.message || "Failed to load company settings");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleDay = (day) => {
    if (!isAdmin) return;
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      Alert.alert("Denied", "Only Company Administrators can modify settings");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        shiftStartTime,
        shiftEndTime,
        lateMarkGraceMinutes: parseInt(lateMarkGraceMinutes) || 0,
        halfDayHours: parseInt(halfDayHours) || 0,
        workingDays,
      };

      const leavePayload = {
        defaultCasualLeaves: parseInt(defaultCasualLeaves) || 0,
        defaultSickLeaves: parseInt(defaultSickLeaves) || 0,
        defaultAnnualLeaves: parseInt(defaultAnnualLeaves) || 0,
        defaultUnpaidLeaves: parseInt(defaultUnpaidLeaves) || 0,
        allowPaidLeaveOverflowAsLWP,
      };

      await updateCompanySettingsApi(payload);
      await updateLeaveSettingsApi(leavePayload);
      Alert.alert("Success", "Settings updated successfully");
      fetchSettings();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Settings"
      showSearch={false}
    >
      <View style={styles.screenHeader}>
        <Text style={styles.title}>System Settings</Text>
        <Text style={styles.subtitle}>
          Configure company shifts, rules, working days and payroll compliance policies
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading configurations...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 90) }]} showsVerticalScrollIndicator={false}>
          {/* Shift Rules Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Shift & Timings</Text>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Shift Start Time *</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={shiftStartTime}
                  onChangeText={setShiftStartTime}
                  placeholder="e.g. 09:00"
                  editable={isAdmin}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Shift End Time *</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={shiftEndTime}
                  onChangeText={setShiftEndTime}
                  placeholder="e.g. 18:00"
                  editable={isAdmin}
                />
              </View>
            </View>
          </View>

          {/* Attendance Rules Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="alert-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Attendance Policies</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Late Mark Grace Limit (Minutes) *</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                keyboardType="numeric"
                value={lateMarkGraceMinutes}
                onChangeText={setLateMarkGraceMinutes}
                placeholder="e.g. 15"
                editable={isAdmin}
              />
              <Text style={styles.fieldHelpText}>
                Employees arriving after this threshold will receive a Late Mark on their attendance.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Half-Day Attendance Limit (Hours) *</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                keyboardType="numeric"
                value={halfDayHours}
                onChangeText={setHalfDayHours}
                placeholder="e.g. 4"
                editable={isAdmin}
              />
              <Text style={styles.fieldHelpText}>
                Minimum hours needed inside active session to qualify for a complete half-day payout.
              </Text>
            </View>
          </View>

          {/* Geo-Fencing Settings Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="locate-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Office Location Settings</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Configure office GPS coordinates center and allowed perimeter radius lock for workforce clock activities.
            </Text>
            <TouchableOpacity
              style={styles.geoLinkBtn}
              onPress={() => navigation.navigate("AttendanceSettings")}
              activeOpacity={0.7}
            >
              <Text style={styles.geoLinkText}>Configure Office Location</Text>
              <Ionicons name="arrow-forward-outline" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Working Days Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Operational Working Days</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Select working days. Unselected days will automatically count as non-working holidays.
            </Text>

            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => {
                const isActive = workingDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, isActive && styles.dayChipActive, !isAdmin && styles.dayChipDisabled]}
                    onPress={() => toggleDay(day)}
                    disabled={!isAdmin}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Leave Structure Defaults Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Leave Structure (Defaults)</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>
              These default leave counts will be applied to newly added employees.
            </Text>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Casual Leaves</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={defaultCasualLeaves}
                  onChangeText={setDefaultCasualLeaves}
                  keyboardType="numeric"
                  editable={isAdmin}
                  placeholder="e.g. 12"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Sick Leaves</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={defaultSickLeaves}
                  onChangeText={setDefaultSickLeaves}
                  keyboardType="numeric"
                  editable={isAdmin}
                  placeholder="e.g. 10"
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Annual Leaves</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={defaultAnnualLeaves}
                  onChangeText={setDefaultAnnualLeaves}
                  keyboardType="numeric"
                  editable={isAdmin}
                  placeholder="e.g. 15"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Unpaid Leaves</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={defaultUnpaidLeaves}
                  onChangeText={setDefaultUnpaidLeaves}
                  keyboardType="numeric"
                  editable={isAdmin}
                  placeholder="e.g. 0"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Allow LWP Overflow</Text>
                <Text style={styles.switchSubLabel}>
                  Convert extra requested paid leaves to unpaid automatically
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
                thumbColor={allowPaidLeaveOverflowAsLWP ? "#ffffff" : "#f1f5f9"}
                onValueChange={setAllowPaidLeaveOverflowAsLWP}
                value={allowPaidLeaveOverflowAsLWP}
                disabled={!isAdmin}
              />
            </View>
          </View>

          {/* Action Row */}
          {isAdmin ? (
            <AppButton
              title={saving ? "Saving Policies..." : "Save Settings"}
              loading={saving}
              style={styles.saveBtn}
              onPress={handleSaveSettings}
            />
          ) : (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="shield-outline" size={18} color="#94a3b8" />
              <Text style={styles.readOnlyBannerText}>
                Viewing settings in Read-Only mode. Contact your administrator to adjust timings or policies.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCol: {
    width: "48%",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    borderColor: "#e2e8f0",
  },
  fieldHelpText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 15,
  },
  daysList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  dayChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  dayChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  dayChipDisabled: {
    opacity: 0.8,
  },
  dayIcon: {
    marginRight: 6,
  },
  dayText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "500",
  },
  dayTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  dayChipText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "500",
  },
  dayChipTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 8,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1e293b",
  },
  switchSubLabel: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    marginTop: 8,
  },
  readOnlyBanner: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    marginTop: 8,
  },
  readOnlyBannerText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  geoLinkBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  geoLinkText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default CompanySettingsScreen;
