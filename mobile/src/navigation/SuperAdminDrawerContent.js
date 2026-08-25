import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../context/LayoutContext";
import { FONTS } from "../theme/tokens";

const SUPER_ADMIN_SECTIONS = [
  {
    title: "Client & Organizations",
    items: [
      {
        label: "Dashboard",
        screen: "SuperAdminDashboard",
        icon: "grid-outline",
        activeIcon: "grid",
        color: "#2563EB",
      },
      {
        label: "All Companies",
        screen: "Companies",
        icon: "business-outline",
        activeIcon: "business",
        color: "#059669",
      },
      {
        label: "Add New Company",
        screen: "AddCompany",
        icon: "add-circle-outline",
        activeIcon: "add-circle",
        color: "#2563EB",
      },
      {
        label: "Company Admins",
        screen: "CompanyAdmins",
        icon: "people-outline",
        activeIcon: "people",
        color: "#4F46E5",
      },
    ],
  },
  {
    title: "Subscriptions & Billing",
    items: [
      {
        label: "Subscription Plans",
        screen: "SubscriptionPlans",
        icon: "card-outline",
        activeIcon: "card",
        color: "#7C3AED",
      },
      {
        label: "Tenant Subscriptions",
        screen: "CompanySubscriptions",
        icon: "receipt-outline",
        activeIcon: "receipt",
        color: "#0891B2",
      },
      {
        label: "Payments & Invoices",
        screen: "Payments",
        icon: "cash-outline",
        activeIcon: "cash",
        color: "#16A34A",
      },
    ],
  },
  {
    title: "Platform & Security",
    items: [
      {
        label: "Access Control",
        screen: "ModuleAccessControl",
        icon: "lock-closed-outline",
        activeIcon: "lock-closed",
        color: "#EA580C",
      },
      {
        label: "Reports & Analytics",
        screen: "ReportsDashboard",
        icon: "analytics-outline",
        activeIcon: "analytics",
        color: "#8B5CF6",
      },
      {
        label: "Support Tickets",
        screen: "SupportTickets",
        icon: "help-circle-outline",
        activeIcon: "help-circle",
        color: "#E11D48",
      },
      {
        label: "System Settings",
        screen: "SystemSettings",
        icon: "settings-outline",
        activeIcon: "settings",
        color: "#334155",
      },
      {
        label: "Audit Logs",
        screen: "AuditLogs",
        icon: "list-outline",
        activeIcon: "list",
        color: "#475569",
      },
    ],
  },
];

const SuperAdminDrawerContent = (props) => {
  const { navigation } = props;
  const { user, logout } = useAuth();
  const layout = useLayout();
  const insets = useSafeAreaInsets();

  const activeTabVal = layout ? layout.activeTab : "Dashboard";

  const isItemActive = (item) =>
    activeTabVal === item.label ||
    activeTabVal === item.screen ||
    (activeTabVal === "Dashboard" && item.label === "Dashboard") ||
    (activeTabVal === "Plans" && item.label === "Subscription Plans") ||
    (activeTabVal === "Reports" && item.label === "Reports & Analytics");

  const handleNavigate = (screenName) => {
    navigation.navigate("DashboardStack", { screen: screenName });
    navigation.closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          navigation.closeDrawer();
          logout();
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return "SA";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

      {/* ── COMPACT PROFILE HEADER ──────────────────────────────────── */}
      <LinearGradient
        colors={["#071A2F", "#0B2346", "#0E3260"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 14 }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarCircle, { backgroundColor: "#7C3AED" }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.headerUserInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Super Admin"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || "Global System Control"}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.35)" }]}>
              <View style={[styles.roleDot, { backgroundColor: "#A78BFA" }]} />
              <Text style={[styles.roleText, { color: "#A78BFA" }]}>Platform SuperAdmin</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.closeDrawer()}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── COMPACT NAVIGATION LIST ─────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SUPER_ADMIN_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            {section.items.map((item) => {
              const active = isItemActive(item);
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handleNavigate(item.screen)}
                  style={[styles.navItem, active && styles.navItemActive]}
                  activeOpacity={0.7}
                >
                  {active && <View style={[styles.activeBar, { backgroundColor: item.color }]} />}
                  <View
                    style={[
                      styles.iconBox,
                      active
                        ? { backgroundColor: item.color + "18" }
                        : { backgroundColor: "#F1F5F9" },
                    ]}
                  >
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={18}
                      color={active ? item.color : "#475569"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      active && { color: item.color, fontFamily: FONTS.bodyBold },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <View style={styles.logoutIconBox}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </View>
          <Text style={styles.logoutLabel}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>One Click HRMS  •  v2.4.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginLeft: 8,
  },
  avatarWrapper: {
    position: "relative",
    width: 52,
    height: 52,
    marginRight: 13,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontFamily: FONTS.displayBold, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#071A2F",
  },
  headerUserInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontFamily: FONTS.displayBold,
    fontWeight: "700",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  userEmail: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 1.5,
    marginBottom: 5,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(56,189,248,0.15)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
  },
  roleDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#38BDF8", marginRight: 5 },
  roleText: { fontFamily: FONTS.bodyBold, fontWeight: "700", fontSize: 10, color: "#38BDF8", letterSpacing: 0.3 },

  scrollContent: { paddingTop: 4, paddingBottom: 16 },
  section: { marginBottom: 2 },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8.5,
    paddingHorizontal: 16,
    position: "relative",
  },
  navItemActive: { backgroundColor: "#F0F6FF" },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  navLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    fontSize: 13.5,
    color: "#334155",
  },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 16, marginVertical: 6 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8.5,
    paddingHorizontal: 16,
  },
  logoutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    fontSize: 13.5,
    color: "#DC2626",
  },
  footer: { alignItems: "center", paddingTop: 12, paddingBottom: 6 },
  footerVersion: { fontFamily: FONTS.body, fontSize: 10.5, color: "#CBD5E1", letterSpacing: 0.2 },
});

export default SuperAdminDrawerContent;
