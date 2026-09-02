import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getDashboardStatsApi, getCompaniesApi } from "../../api/superAdminService";
import { getMyNotificationsApi } from "../../api/notificationService";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import DashboardSkeleton from "../../components/DashboardSkeleton";
import { COLORS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

// ── KPI Metric Card Component ────────────────────────────────────────────────
const KPICard = ({ title, value, color, icon, trend = "+12%", isUp = true, onPress }) => (
  <TouchableOpacity
    style={styles.kpiCard}
    onPress={onPress}
    activeOpacity={onPress ? 0.75 : 1}
  >
    <View style={styles.kpiHeader}>
      <View style={[styles.kpiIconWrapper, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={[styles.trendBadge, { backgroundColor: isUp ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)" }]}>
        <Ionicons
          name={isUp ? "arrow-up" : "arrow-down"}
          size={10}
          color={isUp ? "#10B981" : "#EF4444"}
        />
        <Text style={[styles.trendText, { color: isUp ? "#10B981" : "#EF4444" }]}>{trend}</Text>
      </View>
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiTitle} numberOfLines={1}>{title}</Text>
  </TouchableOpacity>
);

// ── Quick Action Card Component ──────────────────────────────────────────────
const QuickActionCard = ({ title, icon, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.actionIconBox, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
  </TouchableOpacity>
);

const SuperAdminDashboard = ({ navigation }) => {
  const { user } = useAuth();

  // Fetch Dashboard Stats, Notifications & Recent Companies
  const {
    data: dashboardData,
    isLoading,
    error: queryError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["superAdminDashboardData"],
    queryFn: async () => {
      const [statsRes, notifRes, companiesRes] = await Promise.all([
        getDashboardStatsApi().catch(() => ({ data: {} })),
        getMyNotificationsApi().catch(() => ({ data: { unreadCount: 0 } })),
        getCompaniesApi({ limit: 5 }).catch(() => ({ data: { companies: [] } })),
      ]);

      return {
        stats: statsRes.data || {},
        unreadCount: notifRes.data?.unreadCount || 0,
        recentCompanies: companiesRes.data?.companies || companiesRes.data || [],
      };
    },
    staleTime: 1000 * 60 * 3,
  });

  const stats = dashboardData?.stats || {};
  const recentCompanies = Array.isArray(dashboardData?.recentCompanies) ? dashboardData.recentCompanies.slice(0, 5) : [];
  const errorMsg = queryError?.response?.data?.message || queryError?.message || "";

  const totalCompanies = stats.totalCompanies ?? 0;
  const activeCompanies = stats.activeCompanies ?? 0;
  const inactiveCompanies = stats.inactiveCompanies ?? 0;
  const totalAdmins = stats.totalCompanyAdmins ?? stats.totalAdmins ?? 0;
  const totalEmployees = stats.totalEmployees ?? "0";
  const monthlyRevenue = stats.monthlyRevenue || "₹0";

  // Format today's date
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isLoading ? {} : styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={["#1268D9"]} />
        }
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ── 1. Hero Welcome Card (Gradient Banner) ─────────────────── */}
            <LinearGradient
              colors={["#071A2F", "#0B2B52", "#1268D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroPillBadge}>
                  <View style={styles.heroPillDot} />
                  <Text style={styles.heroPillText}>Live System Telemetry</Text>
                </View>
                <Text style={styles.heroDate}>{currentDate}</Text>
              </View>

              <Text style={styles.heroSubtitle}>ONE CLICK ENTERPRISE</Text>
              <Text style={styles.heroTitle}>Welcome, {user?.name?.split(" ")[0] || "SuperAdmin"}! 👑</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{activeCompanies}</Text>
                  <Text style={styles.heroStatLabel}>Active Tenants</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{totalAdmins}</Text>
                  <Text style={styles.heroStatLabel}>Client Admins</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>99.9%</Text>
                  <Text style={styles.heroStatLabel}>SLA Uptime</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => navigation.navigate("AddCompany")}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={17} color="#071A2F" />
                <Text style={styles.heroActionBtnText}>Create New Company</Text>
              </TouchableOpacity>
            </LinearGradient>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.error}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* ── 2. Core Metrics KPI Grid ───────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview &amp; Metrics</Text>
              <TouchableOpacity onPress={() => navigation.navigate("ReportsDashboard")} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>View Analytics</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.kpiGrid}>
              <KPICard
                title="Total Companies"
                value={totalCompanies}
                color="#1268D9"
                icon="business-outline"
                trend="+14%"
                isUp={true}
                onPress={() => navigation.navigate("Companies")}
              />
              <KPICard
                title="Active Tenants"
                value={activeCompanies}
                color="#10B981"
                icon="checkmark-circle-outline"
                trend="+9%"
                isUp={true}
                onPress={() => navigation.navigate("Companies")}
              />
              <KPICard
                title="Suspended / Trial"
                value={inactiveCompanies}
                color="#EF4444"
                icon="close-circle-outline"
                trend="-2%"
                isUp={false}
                onPress={() => navigation.navigate("Companies")}
              />
              <KPICard
                title="Company Admins"
                value={totalAdmins}
                color="#8B5CF6"
                icon="people-outline"
                trend="+18%"
                isUp={true}
                onPress={() => navigation.navigate("GlobalUsers")}
              />
              <KPICard
                title="Total Employees"
                value={totalEmployees}
                color="#06B6D4"
                icon="id-card-outline"
                trend="+22%"
                isUp={true}
                onPress={() => navigation.navigate("GlobalUsers")}
              />
              <KPICard
                title="Subscriptions"
                value={monthlyRevenue}
                color="#F59E0B"
                icon="wallet-outline"
                trend="+15%"
                isUp={true}
                onPress={() => navigation.navigate("Payments")}
              />
            </View>

            {/* ── 3. Quick Action Management Hub ─────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Management Hub</Text>
            </View>

            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Add Company"
                icon="business"
                color="#1268D9"
                onPress={() => navigation.navigate("AddCompany")}
              />
              <QuickActionCard
                title="Subscription Plans"
                icon="card"
                color="#F59E0B"
                onPress={() => navigation.navigate("SubscriptionPlans")}
              />
              <QuickActionCard
                title="Billing & Invoices"
                icon="cash"
                color="#10B981"
                onPress={() => navigation.navigate("Payments")}
              />
              <QuickActionCard
                title="Reports & Logs"
                icon="analytics"
                color="#8B5CF6"
                onPress={() => navigation.navigate("ReportsDashboard")}
              />
              <QuickActionCard
                title="Global Users"
                icon="people"
                color="#06B6D4"
                onPress={() => navigation.navigate("GlobalUsers")}
              />
              <QuickActionCard
                title="Audit Trail"
                icon="shield-checkmark"
                color="#EC4899"
                onPress={() => navigation.navigate("AuditLogs")}
              />
            </View>

            {/* ── 4. Recent Companies Quick List ─────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Companies</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Companies")} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentCard}>
              {recentCompanies.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="business-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyText}>No registered companies yet</Text>
                </View>
              ) : (
                recentCompanies.map((c, idx) => {
                  const status = (c.status || "active").toLowerCase();
                  const isActive = status === "active";
                  const initial = (c.companyName || c.name || "C").charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={c._id || idx}
                      style={[
                        styles.companyRow,
                        idx !== recentCompanies.length - 1 && styles.companyRowBorder,
                      ]}
                      onPress={() => navigation.navigate("CompanyDetails", { companyId: c._id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.companyAvatar}>
                        <Text style={styles.companyAvatarText}>{initial}</Text>
                      </View>

                      <View style={styles.companyInfo}>
                        <Text style={styles.companyName} numberOfLines={1}>
                          {c.companyName || c.name || "Unnamed Company"}
                        </Text>
                        <Text style={styles.companyMeta} numberOfLines={1}>
                          {c.companyCode || c.domain || "Enterprise"} • {c.employeeCount || 0} seats
                        </Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)" }]}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? "#10B981" : "#EF4444" }]} />
                        <Text style={[styles.statusText, { color: isActive ? "#10B981" : "#EF4444" }]}>
                          {isActive ? "Active" : "Suspended"}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* ── 5. Cloud Infrastructure Telemetry Card ─────────────────── */}
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryHeader}>
                <View style={styles.telemetryTitleRow}>
                  <Ionicons name="server-outline" size={16} color="#1268D9" />
                  <Text style={styles.telemetryTitle}>System Infrastructure</Text>
                </View>
                <Text style={styles.telemetryStatus}>Operational</Text>
              </View>

              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>Database Cluster</Text>
                  <Text style={styles.telemetryValue}>MongoDB Primary</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>Cloud Storage</Text>
                  <Text style={styles.telemetryValue}>AWS S3 Active</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>API Latency</Text>
                  <Text style={[styles.telemetryValue, { color: "#10B981" }]}>24 ms</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>Environment</Text>
                  <Text style={styles.telemetryValue}>Production v2.5</Text>
                </View>
              </View>
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
    backgroundColor: "#F4F7FB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── Hero Banner ────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#082B52",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  heroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  heroPillText: {
    color: "#A7F3D0",
    fontSize: 10.5,
    fontWeight: "700",
  },
  heroDate: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    fontWeight: "600",
  },
  heroSubtitle: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 16,
  },
  heroStatItem: {
    alignItems: "center",
    flex: 1,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroActionBtnText: {
    color: "#071A2F",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // ── Section Headers ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1268D9",
  },

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  kpiCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  trendText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  kpiTitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },

  // ── Quick Actions Grid ─────────────────────────────────────────────────────
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionCard: {
    width: "31.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 14,
  },

  // ── Recent Companies Card ──────────────────────────────────────────────────
  recentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  companyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  companyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  companyAvatarText: {
    color: "#F59E0B",
    fontSize: 15,
    fontWeight: "800",
  },
  companyInfo: {
    flex: 1,
    marginRight: 8,
  },
  companyName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // ── Telemetry Card ─────────────────────────────────────────────────────────
  telemetryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  telemetryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  telemetryTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  telemetryStatus: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  telemetryItem: {
    width: "48%",
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },

  // ── Error Card ─────────────────────────────────────────────────────────────
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
});

export default SuperAdminDashboard;
