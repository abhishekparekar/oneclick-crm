import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getMyTodayApi, getMyMonthlyApi } from "../../api/attendanceService";

const EmployeeAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({ present: 0, late: 0, absent: 0, halfDay: 0 });
  const [recentLogs, setRecentLogs] = useState([]);

  const loadData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [todayRes, monthlyRes] = await Promise.all([
        getMyTodayApi(),
        getMyMonthlyApi({ month: currentMonth, year: currentYear }),
      ]);

      if (todayRes.data && todayRes.data.success) {
        setTodayRecord(todayRes.data.attendance || null);
      }

      if (monthlyRes.data && monthlyRes.data.success) {
        const stats = monthlyRes.data.data?.summary || { present: 0, late: 0, absent: 0, halfDay: 0 };
        setMonthlySummary(stats);
        
        // Take the last 5 days from the monthly days ledger for history, reversed so latest is top
        const allDays = monthlyRes.data.data?.days || [];
        const pastDays = allDays
          .filter(d => d.status)
          .slice(-5)
          .reverse();
        setRecentLogs(pastDays);
      }
    } catch (err) {
      console.error("Failed to load attendance dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => loadData(true);

  // Punch display styling
  let clockText = "PUNCHED OUT";
  let clockColor = "#ef4444";
  let clockIcon = "log-out-outline";
  let clockTimeDetail = "Log your attendance for today";

  if (todayRecord) {
    if (todayRecord.punchInTime && !todayRecord.punchOutTime) {
      clockText = "PUNCHED IN";
      clockColor = "#16a34a";
      clockIcon = "log-in-outline";
      const time = new Date(todayRecord.punchInTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      clockTimeDetail = `Clocked in today at ${time}`;
    } else if (todayRecord.punchInTime && todayRecord.punchOutTime) {
      clockText = "COMPLETED";
      clockColor = "#2563eb";
      clockIcon = "checkmark-done-circle-outline";
      const inTime = new Date(todayRecord.punchInTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const outTime = new Date(todayRecord.punchOutTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      clockTimeDetail = `In: ${inTime}  |  Out: ${outTime}`;
    }
  }

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
      case "weekly_off": return "#475569";
      default: return "#94a3b8";
    }
  };

  const getStatusBgColor = (status) => {
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
      default: return "#f1f5f9";
    }
  };

  return (
    <EmployeeLayout navigation={navigation} title="Attendance Dashboard">
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Syncing attendance records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Today's Punch Widget Removed as requested */}

          {/* Monthly Attendance summary grid */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Month Summary</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EmployeeMonthlyAttendance")}>
              <Text style={styles.viewAllLink}>View Calendar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
              <Text style={[styles.summaryVal, { color: "#16a34a" }]}>{monthlySummary.present || 0}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#fffbeb", borderColor: "#fef3c7" }]}>
              <Text style={[styles.summaryVal, { color: "#d97706" }]}>{monthlySummary.late || 0}</Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <Text style={[styles.summaryVal, { color: "#dc2626" }]}>{monthlySummary.absent || 0}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
              <Text style={[styles.summaryVal, { color: "#7c3aed" }]}>{monthlySummary.halfDay || 0}</Text>
              <Text style={styles.summaryLabel}>Half Day</Text>
            </View>
          </View>

          {/* Recent History Ledger */}
          <Text style={styles.sectionTitleHistory}>Recent Logs</Text>
          {recentLogs.length === 0 ? (
            <Text style={styles.emptyText}>No recent attendance logs recorded</Text>
          ) : (
            recentLogs.map((log, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyRow}
                onPress={() => navigation.navigate("AttendanceDetails", { date: log.date })}
                activeOpacity={0.7}
              >
                <View style={styles.historyLeft}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(log.status) }]} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {new Date(log.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                    <Text style={styles.historyTime}>
                      {log.punchInTime ? new Date(log.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"} 
                      {" - "}
                      {log.punchOutTime ? new Date(log.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.historyBadge, { backgroundColor: getStatusBgColor(log.status) }]}>
                  <Text style={[styles.historyBadgeText, { color: getStatusColor(log.status) }]}>
                    {log.status?.toUpperCase()?.replace("_", " ")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
  },
  loaderText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
    fontWeight: "600",
  },
  punchCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  punchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  dateLabel: {
    fontSize: 12.5,
    color: "#64748b",
    fontWeight: "600",
  },
  timeDetailText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 12,
  },
  hoursText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
    fontWeight: "600",
  },
  actionBtn: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  sectionTitleHistory: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 20,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#2563eb",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
    paddingLeft: 4,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  historyInfo: {
    flexDirection: "column",
  },
  historyDate: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  historyTime: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 1,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});

export default EmployeeAttendanceScreen;
