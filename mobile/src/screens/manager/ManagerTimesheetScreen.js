import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useManagerController from "../../controllers/managerController";

const TEAL = "#C2410C";
const BORDER = "#e2e8f0";

const ManagerTimesheetScreen = ({ navigation }) => {
  const {
    myTimesheetData,
    teamTimesheetData,
    fetchMyTimesheet,
    fetchTeamTimesheet,
    approveTimesheetData,
    taskPermissions,
    fetchTaskPermissions,
  } = useManagerController();

  const [activeTab, setActiveTab] = useState("my"); // 'my' or 'team'
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    await Promise.all([
      fetchTaskPermissions(),
      fetchMyTimesheet(),
      fetchTeamTimesheet(),
    ]);
    if (!force) setLoading(false);
  }, [fetchTaskPermissions, fetchMyTimesheet, fetchTeamTimesheet]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  const handleApprove = async (id) => {
    try {
      setApproving(id);
      await approveTimesheetData(id);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setApproving(null);
    }
  };

  const renderTimesheet = ({ item }) => {
    const isApproved = item.description?.includes("[Approved]");
    return (
      <View style={styles.card}>
        {activeTab === "team" && (
          <View style={styles.cardHeaderRow}>
            <View style={styles.assigneeRow}>
              <Ionicons name="person-circle-outline" size={16} color="#64748b" />
              <Text style={styles.assigneeText}>{item.employeeId?.fullName}</Text>
            </View>
            {taskPermissions?.allowManagerApproveTimesheet && !isApproved && (
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApprove(item._id)}
                disabled={approving === item._id}
              >
                {approving === item._id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.approveBtnText}>Approve</Text>
                )}
              </TouchableOpacity>
            )}
            {isApproved && (
              <View style={styles.approvedBadge}>
                <Text style={styles.approvedBadgeText}>Approved</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.taskTitle}>{item.taskId?.title || "Manual Work"}</Text>
        </View>

        {item.projectId && (
          <Text style={styles.projectText}>Project: {item.projectId.name}</Text>
        )}
        
        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Start</Text>
            <Text style={styles.timeVal}>{new Date(item.startTime).toLocaleString()}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>End</Text>
            <Text style={styles.timeVal}>{item.endTime ? new Date(item.endTime).toLocaleString() : "Running..."}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Duration</Text>
            <Text style={styles.timeVal}>{item.durationMinutes || 0} min</Text>
          </View>
        </View>
        
        {item.description ? (
          <Text style={styles.descText}>{item.description}</Text>
        ) : null}
      </View>
    );
  };

  const data = activeTab === "my" ? myTimesheetData : teamTimesheetData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my" && styles.activeTab]}
          onPress={() => setActiveTab("my")}
        >
          <Text style={[styles.tabText, activeTab === "my" && styles.activeTabText]}>My Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "team" && styles.activeTab]}
          onPress={() => setActiveTab("team")}
        >
          <Text style={[styles.tabText, activeTab === "team" && styles.activeTabText]}>Team Log</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(t) => t._id}
        renderItem={renderTimesheet}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No timesheets found.</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color={TEAL} />
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  list: { padding: 16 },

  tabContainer: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: TEAL },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  activeTabText: { color: TEAL, fontWeight: "800" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  assigneeRow: { flexDirection: "row", alignItems: "center" },
  assigneeText: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginLeft: 6 },
  
  approveBtn: { backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  approveBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  approvedBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  approvedBadgeText: { color: "#16a34a", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  taskTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  projectText: { fontSize: 12, color: "#64748b", marginBottom: 12 },

  timeRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 12 },
  timeBox: { flex: 1 },
  timeLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 },
  timeVal: { fontSize: 12, fontWeight: "600", color: "#0f172a" },

  descText: { fontSize: 13, color: "#475569", fontStyle: "italic" },

  empty: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: "#64748b" },
});

export default ManagerTimesheetScreen;
