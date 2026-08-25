import React, { useState } from "react";
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

const buildEmployeeSections = (hasPermission) => {
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");

  return [
    {
      title: "Work & Tasks",
      items: [
        {
          label: "Dashboard",
          screen: "EmployeeDashboard",
          icon: "grid-outline",
          activeIcon: "grid",
          color: "#2563EB",
        },
        {
          label: "My Tasks",
          screen: "Tasks",
          icon: "albums-outline",
          activeIcon: "albums",
          color: "#059669",
          module: "tasks",
        },
        {
          label: "My Projects",
          screen: "MyProjects",
          icon: "folder-open-outline",
          activeIcon: "folder-open",
          color: "#2563EB",
        },
        ...(canAccessLeads
          ? [
              {
                label: "Lead Management",
                screen: "LeadsEngine",
                icon: "magnet-outline",
                activeIcon: "magnet",
                color: "#7C3AED",
              },
            ]
          : []),
        {
          label: "Company Requests",
          screen: "CompanyRequests",
          icon: "chatbubbles-outline",
          activeIcon: "chatbubbles",
          color: "#0284C7",
        },
      ],
    },
    {
      title: "Attendance & Time Off",
      items: [
        {
          label: "My Attendance",
          screen: "Attendance",
          icon: "calendar-outline",
          activeIcon: "calendar",
          color: "#D97706",
          module: "attendance",
        },
        {
          label: "Leave Applications",
          screen: "Leave",
          icon: "time-outline",
          activeIcon: "time",
          color: "#EA580C",
          module: "leave",
        },
        {
          label: "My Payslips",
          screen: "Payslips",
          icon: "receipt-outline",
          activeIcon: "receipt",
          color: "#16A34A",
          module: "payroll",
        },
      ],
    },
    {
      title: "Account & Notices",
      items: [
        {
          label: "My Profile",
          screen: "EmployeeProfile",
          icon: "person-outline",
          activeIcon: "person",
          color: "#4F46E5",
        },
        {
          label: "My Documents",
          screen: "EmployeeDocuments",
          icon: "document-text-outline",
          activeIcon: "document-text",
          color: "#0891B2",
        },
        {
          label: "Announcements",
          screen: "Announcements",
          icon: "megaphone-outline",
          activeIcon: "megaphone",
          color: "#E11D48",
        },
        {
          label: "Notifications",
          screen: "Notifications",
          icon: "notifications-outline",
          activeIcon: "notifications",
          color: "#8B5CF6",
        },
      ],
    },
  ];
};

const EmployeeDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const [imgError, setImgError] = useState(false);

  const sections = buildEmployeeSections(hasPermission);

  const getActiveRouteName = (navState) => {
    if (!navState) return null;
    let route = navState.routes[navState.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return route.name;
  };

  const activeRouteName = getActiveRouteName(state) || "EmployeeDashboard";

  const handleNavigate = (item) => {
    const screenName = typeof item === "string" ? item : item.screen;
    const itemParams = typeof item === "object" && item.params ? item.params : {};

    const bottomTabs = [
      "EmployeeDashboard", "Attendance", "Tasks", "Leave", "EmployeeProfile", "LeadsEngine", "EmployeeLeads"
    ];

    if (screenName === "LeadsEngine" || screenName === "EmployeeLeads") {
      navigation.navigate("EmployeeStack", {
        screen: "MainTabs",
        params: { screen: "LeadsEngine", params: itemParams },
      });
      navigation.closeDrawer();
      return;
    }

    if (bottomTabs.includes(screenName)) {
      navigation.navigate("EmployeeStack", {
        screen: "MainTabs",
        params: { screen: screenName, params: itemParams },
      });
    } else {
      navigation.navigate("EmployeeStack", { screen: screenName, params: itemParams });
    }
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
    if (!name) return "EM";
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
            {user?.photo && !imgError ? (
              <Image
                source={{ uri: user.photo }}
                style={styles.avatarImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.headerUserInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Employee"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || user?.companyName || "Organization"}
            </Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>Team Member</Text>
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
        {sections.map((section) => {
          const visibleItems = section.items;
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

export default EmployeeDrawerContent;
