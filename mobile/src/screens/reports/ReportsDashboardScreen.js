import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import { useAuth } from "../../context/AuthContext";
import { getDashboardSummaryApi } from "../../api/reportService";
import { getMyNotificationsApi } from "../../api/notificationService";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const ReportsDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [{ data: reportData }, { data: notifData }] = await Promise.all([
        getDashboardSummaryApi(),
        getMyNotificationsApi(),
      ]);
      setSummary(reportData);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report dashboard");
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

  if (loading && !summary) {
    return <Loader />;
  }

  const reportItems = [
    {
      title: "Attendance Report",
      subtitle: "View attendance summary for your scope",
      icon: "calendar-outline",
      iconColor: "#10b981",
      route: "AttendanceReport"
    },
    {
      title: "Leave Report",
      subtitle: "View leave summary for your scope",
      icon: "briefcase-outline",
      iconColor: "#f59e0b",
      route: "LeaveReport"
    },
    {
      title: "Payroll Report",
      subtitle: "View payroll summary for your scope",
      icon: "cash-outline",
      iconColor: "#2563eb",
      route: "PayrollReport"
    },
    {
      title: "Task Report",
      subtitle: "View task summary for your scope",
      icon: "checkbox-outline",
      iconColor: "#8b5cf6",
      route: "TaskReport"
    },
    {
      title: "Project Report",
      subtitle: "View project summary for your scope",
      icon: "folder-outline",
      iconColor: "#ec4899",
      route: "ProjectReport"
    },
    {
      title: "Employee Report",
      subtitle: "View employee directory and status",
      icon: "people-outline",
      iconColor: "#C2410C",
      route: "EmployeeReport"
    },
    {
      title: "Performance Report",
      subtitle: "View employee performance rankings",
      icon: "bar-chart-outline",
      iconColor: "#f97316",
      route: "PerformanceReport"
    }
  ];

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Reports">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Reports & Analytics</Text>
            <Text style={styles.subtitle}>Summary and report links</Text>
          </View>
        </View>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderTopColor: "#2563eb" }]}>
            <Text style={styles.statLabel}>TOTAL COMPANIES</Text>
            <Text style={[styles.statValue, { color: "#2563eb" }]}>{summary?.totalCompanies ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#10b981" }]}>
            <Text style={styles.statLabel}>ACTIVE COMPANIES</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{summary?.activeCompanies ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#C2410C" }]}>
            <Text style={styles.statLabel}>TOTAL EMPLOYEES</Text>
            <Text style={[styles.statValue, { color: "#C2410C" }]}>{summary?.totalEmployees ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#7c3aed" }]}>
            <Text style={styles.statLabel}>TOTAL REVENUE</Text>
            <Text style={[styles.statValue, { color: "#7c3aed" }]}>₹{summary?.totalRevenue?.toLocaleString("en-IN") ?? 0}</Text>
          </View>
        </View>

        <Text style={styles.section}>Available Reports</Text>

        {/* Menu Cards */}
        {reportItems.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.menuCard} 
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontFamily: FONTS.displayBold, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", fontFamily: FONTS.bodyMedium, marginTop: 2 },
  error: { color: "#dc2626", marginBottom: 12, fontFamily: FONTS.bodySemiBold },
  
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderTopWidth: 4,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statLabel: { fontSize: 9, color: "#64748b", fontFamily: FONTS.bodyBold, marginBottom: 6, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontFamily: FONTS.displayBold },
  
  section: { fontSize: 15, fontFamily: FONTS.displayBold, color: "#0f172a", marginTop: 12, marginBottom: 12 },
  
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#0f172a",
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
  },
});

export default ReportsDashboardScreen;
