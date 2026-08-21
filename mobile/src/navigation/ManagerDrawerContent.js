import React, { useState, useEffect } from "react";
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
import { useLayout } from "../context/LayoutContext";
import { FONTS } from "../theme/tokens";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const TEAL_BORDER = "#ccfbf1";

// ── Drawer Section Definitions (permission-aware, computed inside component) ──
const buildManagerSections = (hasPermission) => [
  {
    title: "Core",
    items: [
      { label: "Dashboard", screen: "ManagerDashboard", icon: "grid-outline", isTab: true },
      { label: "Company Requests", screen: "CompanyRequests", icon: "chatbubbles-outline" },
      { label: "Lead Engine CRM", screen: "LeadsEngine", targetScreen: "LeadsDashboard", icon: "magnet-outline" },
      { label: "My Tasks", screen: "ManagerTasks", icon: "albums-outline", isTab: true, module: "tasks" },
      { label: "My Team", screen: "ManagerTeam", icon: "people-outline", isTab: true },
    ],
  },
  {
    title: "Lead Engine & WhatsApp",
    items: [
      { label: "Leads Pipeline", screen: "LeadsEngine", targetScreen: "LeadsDashboard", icon: "magnet-outline" },
      { label: "WhatsApp Campaigns", screen: "LeadsEngine", targetScreen: "LeadCampaigns", icon: "logo-whatsapp" },
      { label: "Service Reminders", screen: "LeadsEngine", targetScreen: "LeadReminders", icon: "alarm-outline" },
      { label: "Lead Settings", screen: "LeadsEngine", targetScreen: "LeadSettings", icon: "settings-outline" },
    ],
  },
  {
    title: "Attendance",
    items: [
      { label: "Team Attendance", screen: "ManagerTeamAttendance", icon: "calendar-outline", module: "attendance" },
      { label: "Attendance Regularization", screen: "ManagerRegularization", icon: "create-outline", module: "attendance" },
      { label: "My Attendance", screen: "ManagerAttendance", icon: "time-outline", module: "attendance" },
    ],
  },
  {
    title: "Leave",
    items: [
      // Only show Team Leave Requests if the manager has leave approve/reject permission
      ...(hasPermission("leaves", "approveReject")
        ? [{ label: "Team Leave Requests", screen: "ManagerTeamLeaves", icon: "document-text-outline", isTab: true, module: "leave" }]
        : []),
      { label: "My Leave", screen: "ManagerMyLeave", icon: "calendar-clear-outline", module: "leave" },
    ],
  },
  {
    title: "Work",
    items: [
      // Only show Team Tasks if the manager has tasks create/edit/shift permission
      ...(hasPermission("tasks", "create") || hasPermission("tasks", "edit") || hasPermission("tasks", "shift")
        ? [{ label: "Team Tasks", screen: "ManagerTeamTasks", icon: "list-outline", module: "tasks" }]
        : []),
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        label: "Reports & Analytics",
        screen: "ManagerReports",
        icon: "bar-chart-outline",
        module: "reports",
        subItems: [
          { label: "Executive Summary", screen: "ManagerReports", params: { reportType: "executive" }, icon: "analytics-outline" },
          { label: "Attendance Report", screen: "ManagerReports", params: { reportType: "attendance" }, icon: "calendar-outline" },
          { label: "Leave Report", screen: "ManagerReports", params: { reportType: "leave" }, icon: "document-text-outline" },
          { label: "Payroll Report", screen: "ManagerReports", params: { reportType: "payroll" }, icon: "cash-outline" },
          { label: "Task Report", screen: "ManagerReports", params: { reportType: "tasks" }, icon: "checkbox-outline" },
          { label: "Employee & Productivity", screen: "ManagerReports", params: { reportType: "employee" }, icon: "people-outline" },
          { label: "Workload Report", screen: "ManagerReports", params: { reportType: "workload" }, icon: "stats-chart-outline" },
          { label: "Delayed Task Analysis", screen: "ManagerReports", params: { reportType: "delayed_tasks" }, icon: "time-outline" },
          { label: "Daily Work Report", screen: "ManagerReports", params: { reportType: "daily_work" }, icon: "today-outline" },
          { label: "Weekly Business Report", screen: "ManagerReports", params: { reportType: "weekly_business" }, icon: "trending-up-outline" },
          { label: "Monthly Business Report", screen: "ManagerReports", params: { reportType: "monthly_business" }, icon: "ribbon-outline" },
          { label: "Employee Ranking Report", screen: "ManagerReports", params: { reportType: "employee_ranking" }, icon: "trophy-outline" },
          { label: "Work Efficiency Report", screen: "ManagerReports", params: { reportType: "work_efficiency" }, icon: "speedometer-outline" },
        ]
      },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Company Requests", screen: "CompanyRequests", icon: "chatbubbles-outline" },
      { label: "Notifications", screen: "ManagerNotifications", icon: "notifications-outline" },
      // Announcements screen is always visible (for reading), but creating is gated inside the screen
      { label: "Announcements", screen: "ManagerAnnouncements", icon: "megaphone-outline" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Profile", screen: "ManagerProfile", icon: "person-outline", isTab: true },
      { label: "My Documents", screen: "EmployeeDocuments", icon: "document-text-outline" },
      { label: "Settings", screen: "ManagerSettings", icon: "settings-outline" },
    ],
  },
].filter(section => section.items.length > 0);

// Bottom tab screen names (navigated differently)
const BOTTOM_TAB_SCREENS = [
  "ManagerDashboard",
  "ManagerTeam",
  "ManagerTasks",
  "ManagerTeamLeaves",
  "ManagerProfile",
];

const ManagerDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();

  // Build permission-aware sections each render so they update when user permissions change
  const MANAGER_SECTIONS = buildManagerSections(hasPermission);

  const layout = useLayout();
  const activeTabVal = layout ? layout.activeTab : "Dashboard";

  const [expandedSubMenus, setExpandedSubMenus] = useState({
    "Reports & Analytics": false
  });

  // Resolve active route name and params
  const getActiveRouteNameAndParams = (navState) => {
    if (!navState) return { name: "ManagerDashboard", params: null };
    let route = navState.routes[navState.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return { name: route.name, params: route.params };
  };

  const { name: activeRouteName, params: activeRouteParams } = getActiveRouteNameAndParams(state);

  const isItemActive = (item) => {
    let isActive = activeRouteName === item.screen ||
      activeTabVal === item.label ||
      activeTabVal === item.screen ||
      (activeTabVal === "Home" && item.screen === "ManagerDashboard") ||
      (activeTabVal === "Daily Tasks" && item.screen === "ManagerTasks") ||
      (activeTabVal === "My Projects" && item.screen === "ManagerProjects") ||
      (activeTabVal === "More" && item.screen === "ManagerTeam");

    if (isActive && item.params && item.params.reportType) {
      isActive = activeRouteParams?.reportType === item.params.reportType;
    }
    return isActive;
  };

  const [expandedSections, setExpandedSections] = useState({
    "Core": true,
    "Lead Engine & WhatsApp": true,
  });

  // Auto-expand the section containing the active screen
  useEffect(() => {
    MANAGER_SECTIONS.forEach(section => {
      const containsActive = section.items.some(item => {
        if (item.subItems) {
          return item.subItems.some(sub => isItemActive(sub));
        }
        return isItemActive(item);
      });
      if (containsActive) {
        setExpandedSections(prev => ({
          ...prev,
          [section.title]: true
        }));

        // Also auto-expand sub-menus containing active items
        section.items.forEach(item => {
          if (item.subItems && item.subItems.some(sub => isItemActive(sub))) {
            setExpandedSubMenus(prev => ({
              ...prev,
              [item.label]: true
            }));
          }
        });
      }
    });
  }, [activeTabVal, activeRouteName, activeRouteParams]);

  const toggleSection = (title) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleNavigate = (item, extraParams = {}) => {
    const screenName = typeof item === "string" ? item : item.screen;
    const targetScreen = typeof item === "object" && item.targetScreen ? item.targetScreen : null;
    const itemParams = typeof item === "object" && item.params ? { ...item.params, ...extraParams } : extraParams;

    if (screenName === "LeadsEngine") {
      navigation.navigate("ManagerStack", {
        screen: "LeadsEngine",
        params: { screen: targetScreen || "LeadsDashboard", params: itemParams },
      });
      navigation.closeDrawer();
      return;
    }

    if (BOTTOM_TAB_SCREENS.includes(screenName)) {
      navigation.navigate("ManagerStack", {
        screen: "ManagerTabs",
        params: { screen: screenName, params: itemParams },
      });
    } else {
      navigation.navigate("ManagerStack", { screen: screenName, params: itemParams });
    }
    navigation.closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Profile Header Card */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          {user?.photo || user?.avatar || user?.profilePicture ? (
            <Image
              source={{ uri: user.photo || user.avatar || user.profilePicture }}
              style={{ width: "100%", height: "100%", borderRadius: 26 }}
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || "Manager"}
          </Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {user?.companyName || "One Click Business"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>MANAGER</Text>
          </View>
        </View>
      </View>

      {/* ── Menu ────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MANAGER_SECTIONS.map((section) => {
          const isExpanded = !!expandedSections[section.title];
          // Always show all items — backend blocks API calls if plan is inactive
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
                  color={TEAL}
                  style={styles.sectionChevron}
                />
              </TouchableOpacity>

              {isExpanded && visibleItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                if (hasSubItems) {
                  const isSubExpanded = !!expandedSubMenus[item.label];
                  const hasActiveChild = item.subItems.some(sub => isItemActive(sub));
                  return (
                    <View key={item.label}>
                      <TouchableOpacity
                        onPress={() => setExpandedSubMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                        style={[styles.menuItem, (isSubExpanded || hasActiveChild) && styles.menuItemActiveParent]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={(isSubExpanded || hasActiveChild) ? TEAL : "#475569"}
                          style={styles.menuIcon}
                        />
                        <Text
                          style={[styles.menuText, (isSubExpanded || hasActiveChild) && styles.menuTextActive]}
                        >
                          {item.label}
                        </Text>
                        <Ionicons
                          name={isSubExpanded ? "chevron-down" : "chevron-forward"}
                          size={14}
                          color={(isSubExpanded || hasActiveChild) ? TEAL : "#475569"}
                        />
                      </TouchableOpacity>
                      {isSubExpanded && item.subItems.map((sub) => {
                        const isChildActive = isItemActive(sub);
                        return (
                          <TouchableOpacity
                            key={sub.label}
                            onPress={() => handleNavigate(sub)}
                            style={[styles.subMenuChildItem, isChildActive && styles.menuItemActive]}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={sub.icon}
                              size={16}
                              color={isChildActive ? TEAL : "#64748b"}
                              style={styles.subMenuChildIcon}
                            />
                            <Text
                              style={[styles.subMenuChildText, isChildActive && styles.menuTextActive]}
                            >
                              {sub.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                }

                const isActive = isItemActive(item);
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleNavigate(item)}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isActive ? TEAL : "#475569"}
                      style={styles.menuIcon}
                    />
                    <Text
                      style={[styles.menuText, isActive && styles.menuTextActive]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* ── Logout ──────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutItem}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#dc2626"
            style={styles.menuIcon}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: TEAL,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: FONTS.displayBold,
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: "#ffffff",
    textAlign: "left",
  },
  companyName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
    textAlign: "left",
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  roleText: {
    color: "#ffffff",
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sectionContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    paddingBottom: 6,
  },
  sectionHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 10.5,
    color: TEAL,
    letterSpacing: 1.2,
  },
  sectionChevron: {
    marginRight: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 0,
  },
  menuItemActive: {
    backgroundColor: TEAL_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: TEAL,
  },
  menuItemActiveParent: {
    backgroundColor: TEAL_LIGHT + "40",
  },
  subMenuChildItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginLeft: 32,
    borderRadius: 8,
    marginBottom: 4,
  },
  subMenuChildIcon: {
    marginRight: 10,
    width: 18,
    textAlign: "center",
  },
  subMenuChildText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: "#64748b",
  },
  menuIcon: {
    marginRight: 12,
    width: 22,
    textAlign: "center",
  },
  menuText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13.5,
    color: "#64748b",
  },
  menuTextActive: {
    fontFamily: FONTS.bodyBold,
    color: TEAL,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
  },
  logoutText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#dc2626",
  },
});

export default ManagerDrawerContent;
