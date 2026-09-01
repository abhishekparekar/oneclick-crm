import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { FONTS } from "../theme/tokens";

const buildManagerSections = (hasPermission) => {
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessProjects = hasPermission("projects", "view") || hasPermission("projects");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessReports = hasPermission("reports", "view") || hasPermission("reports");

  return [
    {
      title: "Operations & Work",
      items: [
        {
          label: "Dashboard",
          screen: "ManagerDashboard",
          icon: "grid-outline",
          activeIcon: "grid",
          color: "#2563EB",
        },
        ...(canAccessTasks
          ? [
              {
                label: "My Tasks",
                screen: "ManagerTasks",
                icon: "albums-outline",
                activeIcon: "albums",
                color: "#059669",
                module: "tasks",
              },
            ]
          : []),
        ...(canAccessLeads
          ? [
              {
                label: "Lead Engine CRM",
                screen: "LeadsEngine",
                targetScreen: "LeadsDashboard",
                icon: "magnet-outline",
                activeIcon: "magnet",
                color: "#7C3AED",
                module: "leads",
              },
            ]
          : []),
        ...(canAccessProjects
          ? [
              {
                label: "All Projects",
                screen: "ManagerProjects",
                icon: "folder-open-outline",
                activeIcon: "folder-open",
                color: "#0891B2",
                module: "projects",
              },
            ]
          : []),
        {
          label: "Company Requests",
          screen: "CompanyRequests",
          icon: "chatbubbles-outline",
          activeIcon: "chatbubbles",
          color: "#6366F1",
        },
      ],
    },
    {
      title: "Team & Attendance",
      items: [
        {
          label: "My Team",
          screen: "ManagerTeam",
          icon: "people-outline",
          activeIcon: "people",
          color: "#4F46E5",
        },
        ...(canAccessAttendance
          ? [
              {
                label: "Team Attendance",
                screen: "ManagerTeamAttendance",
                icon: "calendar-outline",
                activeIcon: "calendar",
                color: "#D97706",
                module: "attendance",
              },
              {
                label: "Regularization",
                screen: "ManagerRegularization",
                icon: "create-outline",
                activeIcon: "create",
                color: "#0D9488",
                module: "attendance",
              },
              {
                label: "My Attendance",
                screen: "ManagerAttendance",
                icon: "time-outline",
                activeIcon: "time",
                color: "#0284C7",
                module: "attendance",
              },
            ]
          : []),
      ],
    },
    {
      title: "Leaves & Reports",
      items: [
        ...(canAccessLeaves
          ? [
              {
                label: "Team Leave Requests",
                screen: "ManagerTeamLeaves",
                icon: "document-text-outline",
                activeIcon: "document-text",
                color: "#EA580C",
                module: "leave",
                permission: { module: "leaves", action: "approveReject" },
              },
              {
                label: "My Leave",
                screen: "ManagerMyLeave",
                icon: "calendar-clear-outline",
                activeIcon: "calendar-clear",
                color: "#E11D48",
                module: "leave",
              },
            ]
          : []),
        ...(canAccessReports
          ? [
              {
                label: "Reports & Analytics",
                screen: "ManagerReports",
                icon: "bar-chart-outline",
                activeIcon: "bar-chart",
                color: "#8B5CF6",
                module: "reports",
              },
            ]
          : []),
        {
          label: "Announcements",
          screen: "ManagerAnnouncements",
          icon: "megaphone-outline",
          activeIcon: "megaphone",
          color: "#DB2777",
        },
      ],
    },
  ];
};

const ManagerDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();

  const MANAGER_SECTIONS = buildManagerSections(hasPermission);

  const getActiveRouteName = (navState) => {
    if (!navState) return null;
    let route = navState.routes[navState.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return route.name;
  };

  const activeRouteName = getActiveRouteName(state);

  const handleNavigate = (item) => {
    const screenName = typeof item === "string" ? item : item.screen;
    const targetScreen = typeof item === "object" ? item.targetScreen : null;
    navigation.closeDrawer();

    if (screenName === "LeadsEngine") {
      navigation.navigate("ManagerStack", {
        screen: "LeadsEngine",
        params: { screen: targetScreen || "LeadsDashboard" },
      });
      return;
    }

    const tabScreens = ["ManagerDashboard", "ManagerTasks", "ManagerTeam", "ManagerTeamLeaves", "ManagerProfile"];
    if (tabScreens.includes(screenName)) {
      navigation.navigate("ManagerStack", {
        screen: "ManagerTabs",
        params: { screen: screenName },
      });
      return;
    }

    // Direct screen navigation in ManagerStack
    navigation.navigate("ManagerStack", {
      screen: screenName,
      params: targetScreen ? { screen: targetScreen } : undefined,
    });
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
    if (!name) return "MG";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isItemVisible = (item) => {
    if (item.permission) {
      const { module, action } = item.permission;
      return action ? hasPermission(module, action) : hasPermission(module);
    }
    return true;
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
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.headerUserInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Manager"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || user?.companyName || "Organization"}
            </Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>Team Lead / Manager</Text>
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
        {MANAGER_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;
          return (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              {visibleItems.map((item) => {
                const active = activeRouteName === item.screen;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleNavigate(item)}
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
          );
        })}

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
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1D4ED8",
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

export default ManagerDrawerContent;
