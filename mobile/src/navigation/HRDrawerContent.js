import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { FONTS } from "../theme/tokens";

const THEME_ACCENT = "#EA580C";
const ACCENT_LIGHT = "#FFF7ED";
const ACCENT_BORDER = "#FFEDD5";

const buildHRSections = (hasPermission) => [
  {
    title: "Core",
    items: [
      { label: "Dashboard", screen: "HRDashboard", icon: "grid-outline" },
      { label: "Leads Pipeline", screen: "LeadsEngine", targetScreen: "LeadsDashboard", icon: "magnet-outline" },
      { label: "Company Requests", screen: "CompanyRequests", icon: "chatbubbles-outline" },
      { label: "My Tasks", screen: "HRMyTasks", icon: "checkmark-circle-outline", module: "tasks" },
      { label: "Task Board", screen: "HRTaskBoard", icon: "albums-outline", module: "tasks" },
      { label: "Profile", screen: "HRProfile", icon: "person-outline" },
      { label: "My Documents", screen: "EmployeeDocuments", icon: "document-text-outline" },
    ],
  },
  {
    title: "Staff & Attendance",
    items: [
      { label: "Team Members", screen: "HREmployeeList", icon: "people-outline" },
      ...(hasPermission("teamMembers", "add")
        ? [{ label: "Add Employee", screen: "HRAddEmployee", icon: "person-add-outline" }]
        : []),
      { label: "Send Document", screen: "UploadDocument", icon: "document-attach-outline" },
      { label: "Team Attendance", screen: "HRAttendance", icon: "calendar-outline", module: "attendance" },
      { label: "Attendance Regularization", screen: "HRRegularizationApproval", icon: "checkmark-done-circle-outline", module: "attendance" },
    ],
  },
  {
    title: "Time Off & Holidays",
    items: [
      ...(hasPermission("leaves", "approveReject")
        ? [{ label: "Leave Requests", screen: "HRLeaveRequests", icon: "document-text-outline", module: "leave" }]
        : []),
      { label: "Leave Balance", screen: "HRLeaveBalance", icon: "hourglass-outline", module: "leave" },
      ...(hasPermission("announcementsHolidays")
        ? [{ label: "Holidays", screen: "HRHolidayList", icon: "flag-outline", module: "leave" }]
        : []),
    ],
  },
  {
    title: "Communication & Reports",
    items: [
      { label: "Announcements", screen: "HRAnnouncements", icon: "megaphone-outline" },
      { label: "Reports & Analytics", screen: "HRReportsDashboard", icon: "bar-chart-outline", module: "reports" },
      { label: "Audit Logs", screen: "HRAuditLogs", icon: "shield-checkmark-outline" },
    ],
  },
];

const HRDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();

  const HR_SECTIONS = buildHRSections(hasPermission);

  // Section expand/collapse state
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    HR_SECTIONS.forEach((s) => {
      initial[s.title] = true;
    });
    return initial;
  });

  const toggleSection = (title) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getActiveRouteName = (navState) => {
    if (!navState) return null;
    let route = navState.routes[navState.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return route.name;
  };

  const activeRouteName = getActiveRouteName(state) || "HRDashboard";

  const handleNavigate = (item) => {
    const bottomTabs = ["HRDashboard", "LeadsEngine", "HRTaskBoard", "HRLeaveRequests", "HRAttendance"];
    const screenName = typeof item === "string" ? item : item.screen;
    const targetScreen = typeof item === "object" ? item.targetScreen : null;

    if (screenName === "LeadsEngine") {
      navigation.navigate("HRStack", {
        screen: "LeadsEngine",
        params: { screen: targetScreen || "LeadsDashboard" },
      });
      navigation.closeDrawer();
      return;
    }

    if (bottomTabs.includes(screenName)) {
      navigation.navigate("MainTabs", {
        screen: screenName,
        params: targetScreen ? { screen: targetScreen } : undefined,
      });
    } else {
      navigation.navigate("HRStack", {
        screen: screenName,
        params: targetScreen ? { screen: targetScreen } : undefined,
      });
    }
    navigation.closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => logout() },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return "HR";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Profile Header Card */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.avatar}>
          {user?.photo || user?.avatar || user?.profilePicture ? (
            <Image
              source={{ uri: user.photo || user.avatar || user.profilePicture }}
              style={{ width: "100%", height: "100%", borderRadius: 24 }}
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || "HR Manager"}
          </Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {user?.companyName || "One Click Solutions"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>HR OPERATOR</Text>
          </View>
        </View>
      </View>

      {/* ── Menu List ── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {HR_SECTIONS.map((section) => {
          const isExpanded = !!expandedSections[section.title];
          const visibleItems = section.items;

          if (visibleItems.length === 0) return null;

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeaderButton}
                activeOpacity={0.7}
                onPress={() => toggleSection(section.title)}
              >
                <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={14}
                  color={THEME_ACCENT}
                  style={styles.sectionChevron}
                />
              </TouchableOpacity>

              {isExpanded &&
                visibleItems.map((item) => {
                  const isActive = activeRouteName === item.screen;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => handleNavigate(item)}
                      style={[styles.menuItem, isActive && styles.menuItemActive]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isActive ? THEME_ACCENT : "#64748B"}
                        style={styles.menuIcon}
                      />
                      <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          );
        })}

        {/* Logout Item */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutItem} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.menuIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(234, 88, 12, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: THEME_ACCENT,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.displayBold,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  companyName: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234, 88, 12, 0.18)",
    borderColor: "rgba(234, 88, 12, 0.4)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  roleText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#FB923C",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  sectionContainer: {
    marginBottom: 6,
  },
  sectionHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    letterSpacing: 0.8,
  },
  sectionChevron: {
    opacity: 0.8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    borderLeftWidth: 3,
    borderLeftColor: THEME_ACCENT,
  },
  menuIcon: {
    marginRight: 10,
    width: 20,
    textAlign: "center",
  },
  menuText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: "#94A3B8",
  },
  menuTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 14,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#F87171",
  },
});

export default HRDrawerContent;
