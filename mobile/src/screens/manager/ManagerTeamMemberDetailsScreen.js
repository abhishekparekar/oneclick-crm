import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";
import { useAuth } from "../../context/AuthContext";
import { patchEmployeeStatusApi } from "../../api/employeeService";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const StatusBadge = ({ status }) => {
  const map = {
    present: { bg: "#dcfce7", text: "#16a34a" },
    late: { bg: "#ffedd5", text: "#ea580c" },
    absent: { bg: "#fee2e2", text: "#dc2626" },
    half_day: { bg: "#fef3c7", text: "#d97706" },
    "half-day": { bg: "#fef3c7", text: "#d97706" },
    paid_leave: { bg: "#eff6ff", text: "#2563eb" },
    unpaid_leave: { bg: "#fdf2f8", text: "#db2777" },
    holiday: { bg: "#f8fafc", text: "#475569" },
    weekly_off: { bg: "#f8fafc", text: "#475569" },
    active: { bg: "#dcfce7", text: "#16a34a" },
    inactive: { bg: "#f1f5f9", text: "#64748b" },
    terminated: { bg: "#fee2e2", text: "#dc2626" },
  };
  const style = map[status?.toLowerCase()] || { bg: "#f1f5f9", text: "#64748b" };
  const text = status ? status.replace(/_/g, " ").toUpperCase() : "UNKNOWN";
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{text}</Text>
    </View>
  );
};

const SectionHeader = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color="#64748b" />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>
      {value || "—"}
    </Text>
  </View>
);

const ManagerTeamMemberDetailsScreen = ({ route, navigation }) => {
  const { employeeId } = route.params || {};
  const { fetchTeamMember } = useManagerController();
  const { hasPermission } = useAuth();

  const canEdit = hasPermission && hasPermission("teamMembers", "edit");
  const canToggleStatus = hasPermission && hasPermission("teamMembers", "activeInactive");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (force = false) => {
    if (!employeeId) return;
    try {
      const res = await fetchTeamMember(employeeId, force);
      if (res) {
        setData(res);
        setError(null);
      } else {
        setError("Failed to load employee data.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, fetchTeamMember]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const getInitials = (name) => {
    if (!name) return "EMP";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading && !refreshing) {
    return (
      <ManagerLayout navigation={navigation} title="Team Member">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </ManagerLayout>
    );
  }

  if (error || !data) {
    return (
      <ManagerLayout navigation={navigation} title="Team Member">
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error || "Not found."}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ManagerLayout>
    );
  }

  const {
    employee,
    todayAttendance,
    monthlyAttendanceSummary,
    taskSummary,
    recentTasks,
    activeProjects,
    leaveBalance,
  } = data;

  const handleEmail = () => {
    if (employee.email) Linking.openURL(`mailto:${employee.email}`);
  };

  const handlePhone = () => {
    if (employee.phone) Linking.openURL(`tel:${employee.phone}`);
  };

  const handleToggleStatus = () => {
    const currentStatus = employee.status;
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    const label = nextStatus === "active" ? "Activate" : "Deactivate";
    Alert.alert(
      `${label} Employee`,
      `Are you sure you want to set ${employee.fullName} as ${nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          onPress: async () => {
            try {
              const res = await patchEmployeeStatusApi(employeeId, nextStatus);
              if (res.data?.employee) {
                setData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, status: nextStatus }
                }));
                Alert.alert("Success", `Employee marked as ${nextStatus}.`);
              }
            } catch (err) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to update status");
            }
          },
        },
      ]
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="Team Member">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[TEAL]} />
        }
      >
        {/* Profile Card */}
        <AppCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {employee.photo ? (
              <Image source={{ uri: employee.photo }} style={styles.avatarBig} />
            ) : (
              <View style={styles.avatarFallbackBig}>
                <Text style={styles.avatarFallbackTextBig}>
                  {getInitials(employee.fullName)}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{employee.fullName}</Text>
              <Text style={styles.profileCode}>{employee.employeeCode}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge status={employee.status} />
                <View style={{ width: 8 }} />
                <StatusBadge status={todayAttendance?.status} />
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handlePhone}>
              <Ionicons name="call" size={16} color={TEAL} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
              <Ionicons name="mail" size={16} color={TEAL} />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
            {canEdit && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("ManagerStack", {
                    screen: "ManagerEditEmployee",
                    params: { employeeId },
                  })
                }
              >
                <Ionicons name="pencil-outline" size={16} color="#4f46e5" />
                <Text style={[styles.actionText, { color: "#4f46e5" }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {canToggleStatus && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: employee.status === "active" ? "#fff7ed" : "#f0fdf4" }]}
                onPress={handleToggleStatus}
              >
                <Ionicons
                  name={employee.status === "active" ? "pause-circle-outline" : "play-circle-outline"}
                  size={16}
                  color={employee.status === "active" ? "#d97706" : "#16a34a"}
                />
                <Text style={[styles.actionText, { color: employee.status === "active" ? "#d97706" : "#16a34a" }]}>
                  {employee.status === "active" ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </AppCard>

        {/* Work Details */}
        <AppCard style={styles.infoCard}>
          <SectionHeader title="Work Details" icon="briefcase-outline" />
          <View style={styles.grid}>
            <DetailRow label="Department" value={employee.departmentId?.name} />
            <DetailRow label="Designation" value={employee.designationId?.name} />
            <DetailRow label="Branch" value={employee.branchId?.branchName || employee.branchName} />
            <DetailRow label="Work Mode" value={employee.workMode} />
            <DetailRow label="Employment" value={employee.employmentType} />
            <DetailRow
              label="Joining Date"
              value={
                employee.joiningDate
                  ? new Date(employee.joiningDate).toLocaleDateString()
                  : ""
              }
            />
          </View>
        </AppCard>

        {/* Contact Info */}
        <AppCard style={styles.infoCard}>
          <SectionHeader title="Contact Info" icon="call-outline" />
          <View style={styles.grid}>
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Phone" value={employee.phone} />
          </View>
        </AppCard>

        {/* Month Attendance Summary */}
        <Text style={styles.subHeading}>Attendance (This Month)</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: "#16a34a" }]}>{monthlyAttendanceSummary?.present || 0}</Text>
            <Text style={styles.statLab}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: "#dc2626" }]}>
              {monthlyAttendanceSummary?.absent || 0}
            </Text>
            <Text style={styles.statLab}>Absent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: "#ea580c" }]}>
              {monthlyAttendanceSummary?.late || 0}
            </Text>
            <Text style={styles.statLab}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: "#2563eb" }]}>
              {monthlyAttendanceSummary?.paid_leave || 0}
            </Text>
            <Text style={styles.statLab}>Leaves</Text>
          </View>
        </View>

        {/* Tasks Summary */}
        <Text style={styles.subHeading}>Tasks & Projects</Text>
        <AppCard style={styles.infoCard}>
          <View style={styles.taskStats}>
            <View style={styles.taskStatItem}>
              <Text style={styles.taskStatVal}>{taskSummary?.total || 0}</Text>
              <Text style={styles.taskStatLab}>Total Tasks</Text>
            </View>
            <View style={styles.taskStatItem}>
              <Text style={[styles.taskStatVal, { color: "#2563eb" }]}>
                {taskSummary?.todo + taskSummary?.["in-progress"] || 0}
              </Text>
              <Text style={styles.taskStatLab}>Active</Text>
            </View>
            <View style={styles.taskStatItem}>
              <Text style={[styles.taskStatVal, { color: "#16a34a" }]}>
                {taskSummary?.done || 0}
              </Text>
              <Text style={styles.taskStatLab}>Done</Text>
            </View>
            <View style={styles.taskStatItem}>
              <Text style={[styles.taskStatVal, { color: "#dc2626" }]}>
                {taskSummary?.overdue || 0}
              </Text>
              <Text style={styles.taskStatLab}>Overdue</Text>
            </View>
          </View>

          {activeProjects?.length > 0 && (
            <View style={styles.projectList}>
              <Text style={styles.projectListTitle}>Active Projects</Text>
              {activeProjects.map((p) => (
                <View key={p._id} style={styles.projRow}>
                  <View style={styles.projDot} />
                  <Text style={styles.projText}>{p.name}</Text>
                  <Text style={styles.projProg}>{p.progress || 0}%</Text>
                </View>
              ))}
            </View>
          )}
        </AppCard>

      </ScrollView>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { marginTop: 12, color: "#dc2626", fontWeight: "600" },
  retryBtn: { marginTop: 16, backgroundColor: TEAL, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "700" },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },

  profileCard: { padding: 16, marginBottom: 16 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatarBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: TEAL_LIGHT, marginRight: 16 },
  avatarFallbackBig: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: TEAL_LIGHT,
    alignItems: "center", justifyContent: "center", marginRight: 16,
    borderWidth: 2, borderColor: "#ccfbf1",
  },
  avatarFallbackTextBig: { color: TEAL, fontSize: 22, fontWeight: "800" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  profileCode: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "600" },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  actionsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, backgroundColor: TEAL_LIGHT, borderRadius: 8, marginHorizontal: 4 },
  actionText: { marginLeft: 6, fontSize: 12, fontWeight: "700", color: TEAL },

  infoCard: { padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#475569", marginLeft: 8, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 },
  detailRow: { width: "50%", paddingHorizontal: 8, marginBottom: 12 },
  detailLabel: { fontSize: 10, color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  detailValue: { fontSize: 13, color: "#0f172a", fontWeight: "500" },

  subHeading: { fontSize: 13, fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },

  statsRow: { flexDirection: "row", marginBottom: 16, marginHorizontal: -4 },
  statBox: { flex: 1, backgroundColor: "#fff", marginHorizontal: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  statVal: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  statLab: { fontSize: 10, fontWeight: "600", color: "#64748b", marginTop: 4, textTransform: "uppercase" },

  taskStats: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 16, marginBottom: 12 },
  taskStatItem: { flex: 1, alignItems: "center" },
  taskStatVal: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  taskStatLab: { fontSize: 10, fontWeight: "600", color: "#64748b", marginTop: 2 },

  projectList: { paddingTop: 4 },
  projectListTitle: { fontSize: 11, fontWeight: "700", color: "#64748b", marginBottom: 8, textTransform: "uppercase" },
  projRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  projDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEAL, marginRight: 8 },
  projText: { flex: 1, fontSize: 13, color: "#1e293b", fontWeight: "500" },
  projProg: { fontSize: 12, fontWeight: "700", color: TEAL },
});

export default ManagerTeamMemberDetailsScreen;
