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
      <Ionicons name={icon} size={22} color="#2563eb" />
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
                  <Text style={styles.statusText}>System Operational</Text>
                </View>
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#dc2626" />
                <Text style={styles.error}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Compact Statistics Grid */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <DashboardStatCard
                title="Total Companies"
                value={stats?.totalCompanies ?? 0}
                color="#2563eb"
                icon="business"
              />
              <DashboardStatCard
                title="Active Companies"
                value={stats?.activeCompanies ?? 0}
                color="#16a34a"
                icon="checkmark-circle"
              />
              <DashboardStatCard
                title="Inactive / Suspended"
                value={stats?.inactiveCompanies ?? 0}
                color="#dc2626"
                icon="close-circle"
              />
              <DashboardStatCard
                title="Company Admins"
                value={stats?.totalCompanyAdmins ?? 0}
                color="#7c3aed"
                icon="people"
              />
            </View>

            {/* Quick Actions Matrix */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Reports"
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
                title="Settings"
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
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greeting: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.4)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
    marginRight: 6,
  },
  statusText: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});

export default SuperAdminDashboard;
