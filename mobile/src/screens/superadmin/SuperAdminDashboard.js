import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getDashboardStatsApi } from "../../api/superAdminService";
import { getMyNotificationsApi } from "../../api/notificationService";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import DashboardSkeleton from "../../components/DashboardSkeleton";

const DashboardStatCard = ({ title, value, color, icon }) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const QuickActionCard = ({ title, icon, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.actionIconWrapper}>
      <Ionicons name={icon} size={22} color="#f59e0b" />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

const SuperAdminDashboard = ({ navigation }) => {
  const { user } = useAuth();

  const { data: dashboardData, isLoading, error: queryError, refetch, isRefetching } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn: async () => {
      const [{ data }, notificationResponse] = await Promise.all([
        getDashboardStatsApi(),
        getMyNotificationsApi(),
      ]);
      return { stats: data, unreadCount: notificationResponse.data.unreadCount || 0 };
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });

  const stats = dashboardData?.stats;
  const errorMsg = queryError?.response?.data?.message || queryError?.message || "";

  // Format date like: "Monday, Jun 1, 2026"
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <ScrollView
        style={styles.container}
        contentContainerStyle={isLoading ? {} : styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Premium Header */}
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.dateText}>{currentDate}</Text>
                  <Text style={styles.greeting}>Welcome back, {user?.name}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Live Telemetry</Text>
                </View>
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#ef4444" />
                <Text style={styles.error}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Compact Statistics Grid */}
            <Text style={styles.sectionTitle}>Overview &amp; Metrics</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                title="Total Companies"
                value={stats?.totalCompanies ?? 0}
                color="#f59e0b"
                icon="business"
              />
              <DashboardStatCard
                title="Active Companies"
                value={stats?.activeCompanies ?? 0}
                color="#10b981"
                icon="checkmark-circle"
              />
              <DashboardStatCard
                title="Inactive / Suspended"
                value={stats?.inactiveCompanies ?? 0}
                color="#ef4444"
                icon="close-circle"
              />
              <DashboardStatCard
                title="Company Admins"
                value={stats?.totalCompanyAdmins ?? 0}
                color="#8b5cf6"
                icon="people"
              />
            </View>

            {/* Quick Actions Matrix */}
            <Text style={styles.sectionTitle}>Quick Management Hub</Text>
            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Add Company"
                icon="add-circle"
                onPress={() => navigation.navigate("AddCompany")}
              />
              <QuickActionCard
                title="Subscription Plans"
                icon="card"
                onPress={() => navigation.navigate("SubscriptionPlans")}
              />
              <QuickActionCard
                title="Reports & Analytics"
                icon="analytics"
                onPress={() => navigation.navigate("ReportsDashboard")}
              />
              <QuickActionCard
                title="Global Users"
                icon="globe"
                onPress={() => navigation.navigate("GlobalUsers")}
              />
              <QuickActionCard
                title="Audit Logs"
                icon="list"
                onPress={() => navigation.navigate("AuditLogs")}
              />
              <QuickActionCard
                title="System Settings"
                icon="settings"
                onPress={() => navigation.navigate("SystemSettings")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greeting: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  statusText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
    marginLeft: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "31%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  error: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default SuperAdminDashboard;
