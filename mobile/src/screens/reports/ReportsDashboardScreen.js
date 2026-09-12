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
            <Text style={styles.subtitle}>Executive overview and analytics directory</Text>
          </View>
        </View>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderLeftColor: "#2563EB", borderLeftWidth: 3.5 }]}>
            <Text style={styles.statLabel}>COMPANIES</Text>
            <Text style={[styles.statValue, { color: "#0F172A" }]}>{summary?.totalCompanies ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: "#10B981", borderLeftWidth: 3.5 }]}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={[styles.statValue, { color: "#10B981" }]}>{summary?.activeCompanies ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: "#C2410C", borderLeftWidth: 3.5 }]}>
            <Text style={styles.statLabel}>EMPLOYEES</Text>
            <Text style={[styles.statValue, { color: "#0F172A" }]}>{summary?.totalEmployees ?? "-"}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: "#7C3AED", borderLeftWidth: 3.5 }]}>
            <Text style={styles.statLabel}>REVENUE</Text>
            <Text style={[styles.statValue, { color: "#7C3AED" }]}>₹{summary?.totalRevenue?.toLocaleString("en-IN") ?? 0}</Text>
          </View>
        </View>

        <Text style={styles.section}>AVAILABLE REPORTS</Text>

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
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 14, paddingBottom: 40 },
  headerRow: { marginBottom: 14 },
  title: { fontSize: 20, fontFamily: FONTS.displayBold, color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", fontFamily: FONTS.bodyMedium, marginTop: 2 },
  error: { color: "#DC2626", marginBottom: 12, fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statLabel: { fontSize: 9.5, color: "#64748B", fontFamily: FONTS.bodyBold, marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontFamily: FONTS.displayBold },
  
  section: { fontSize: 11, fontFamily: FONTS.bodyBold, color: "#64748B", letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  menuTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
});

export default ReportsDashboardScreen;
