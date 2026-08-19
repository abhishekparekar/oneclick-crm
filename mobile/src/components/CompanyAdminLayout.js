import React, { useContext, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { isEmployeeRole, isManagerRole } from "../utils/roleHelpers";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, DrawerActions, useIsFocused } from "@react-navigation/native";
import { useLayout } from "../context/LayoutContext";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../theme/tokens";

const ADMIN_NAV_ITEMS = [
  {
    label: "Dashboard",
    shortLabel: "Home",
    screen: "CompanyDashboard",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    label: "Leads",
    shortLabel: "Leads",
    screen: "LeadsEngine",
    icon: "people-outline",
    activeIcon: "people",
    module: "leads",
  },
  {
    isCenter: true,
  },
  {
    label: "Tasks",
    shortLabel: "Tasks",
    screen: "TaskBoard",
    icon: "albums-outline",
    activeIcon: "albums",
    module: "tasks",
  },
  {
    label: "Attendance",
    shortLabel: "Attend",
    screen: "CompanyAttendance",
    icon: "calendar-outline",
    activeIcon: "calendar",
    module: "attendance",
  },
];

const ROUTE_TO_TAB = {
  CompanyDashboard: "Dashboard",
  LeadsEngine: "Leads",
  LeadsDashboard: "Leads",
  LeadsList: "Leads",
  LeadDetails: "Leads",
  LeadReminders: "Leads",
  LeadCampaigns: "Leads",
  LeadSettings: "Leads",
  TaskBoard: "Tasks",
  CompanyAttendance: "Attendance",
  ProjectList: "Projects",
  CompanySettings: "Settings",
  EmployeeList: "Team Members",
  LeaveRequests: "Leaves",
  Notifications: "Notifications",
  CompanyProfile: "Profile",
  DepartmentList: "Departments",
  DesignationList: "Designations",
  BranchList: "Branches",
};

const HIDE_BOTTOM_NAV_SCREENS = [
  "AddEmployee",
  "EmployeeDetails",
  "EditEmployee",
  "GeneratePayroll",
  "AttendanceSettings",
  "AccessControl",
  "CompanyAuditLogs",
  "CompanyReportsDashboard",
  "PerformanceReport",
  "UploadDocument",
  "CompanyTaskDetails",
  "CompanyCreateTask",
  "CompanyProjectDetails",
  "CompanyCreateProject",
  "LeadDetails",
  "LeadSettings",
  "LeadCampaigns",
  "LeadReminders",
];

const CompanyAdminLayout = ({
  children,
  navigation: propNavigation,
  activeTab,
  hideBottomNav: propHideBottomNav,
  searchValue = "",
  onSearchChange = null,
  searchPlaceholder = "Search...",
  showSearch = true,
  headerRightElement = null,
  unreadNotifications = 0,
  isOuterShell = false,
  headerTitle,
  headerBg,
  headerTextColor,
  headerStyle,
  onResetDashboard = null,
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);
  const [fabVisible, setFabVisible] = React.useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const parentLayout = useLayout();
  const isFocused = useIsFocused();

  const currentRouteName = useMemo(() => {
    try {
      const state = navigation.getState();
      if (!state) return null;
      let route = state.routes[state.index];
      while (route.state && route.state.index !== undefined) {
        route = route.state.routes[route.state.index];
      }
      return route.name;
    } catch (_) {
      return null;
    }
  }, [navigation, isFocused]);

  const activeTabVal = useMemo(() => {
    if (activeTab) return activeTab;
    if (currentRouteName && ROUTE_TO_TAB[currentRouteName]) {
      return ROUTE_TO_TAB[currentRouteName];
    }
    return "Dashboard";
  }, [activeTab, currentRouteName]);

  const updateConfigFn = parentLayout?.updateConfig;
  React.useEffect(() => {
    if (updateConfigFn) {
      updateConfigFn({ activeTab: activeTabVal });
    }
  }, [activeTabVal]);

  const getRoleScreen = (baseScreen, role) => {
    const normalized = (role || "").toLowerCase();
    if (normalized === "employee" || normalized === "team member") {
      switch (baseScreen) {
        case "CompanyDashboard":
        case "Dashboard":
          return "EmployeeDashboard";
        case "TaskBoard":
        case "CompanyTaskDetails":
          return "Tasks";
        case "CompanyAttendance":
        case "Attendance":
          return "Attendance";
        case "CompanyProfile":
          return "EmployeeProfile";
        case "CompanyAnnouncements":
          return "Announcements";
        case "CompanyCreateTask":
          return "EmployeeCreateTask";
        default:
          return baseScreen;
      }
    }
    if (normalized === "hr") {
      switch (baseScreen) {
        case "CompanyDashboard":
        case "Dashboard":
          return "HRDashboard";
        case "TaskBoard":
          return "HRTaskBoard";
        case "CompanyAttendance":
          return "HRAttendance";
        case "CompanyProfile":
          return "HRProfile";
        case "CompanyAnnouncements":
          return "HRAnnouncements";
        default:
          return baseScreen;
      }
    }
    if (normalized === "manager") {
      switch (baseScreen) {
        case "CompanyDashboard":
        case "Dashboard":
          return "ManagerDashboard";
        case "TaskBoard":
          return "ManagerTaskBoard";
        case "CompanyAttendance":
          return "ManagerAttendance";
        case "CompanyProfile":
          return "ManagerProfile";
        case "CompanyAnnouncements":
          return "ManagerAnnouncements";
        case "CompanyCreateTask":
          return "ManagerCreateTask";
        default:
          return baseScreen;
      }
    }
    return baseScreen;
  };

  const handleQuickNav = (screenName, params = {}) => {
    setFabVisible(false);
    if (screenName === "OpenDrawer") {
      try {
        navigation.dispatch(DrawerActions.toggleDrawer());
      } catch (_) {
        const parent = navigation.getParent?.();
        if (parent) parent.dispatch(DrawerActions.toggleDrawer());
      }
      return;
    }

    const role = (user?.role || "").toLowerCase();
    const target = getRoleScreen(screenName, user?.role);

    if (screenName === "CompanyDashboard" && typeof onResetDashboard === "function") {
      try {
        onResetDashboard();
      } catch (_) {}
    }

    if (screenName === "LeadsEngine") {
      const targetScreen = params?.screen || "LeadsDashboard";
      const targetParams = params?.params || {};

      const state = navigation.getState?.();
      if (state?.routeNames?.includes("LeadsEngine")) {
        navigation.navigate("LeadsEngine", { screen: targetScreen, params: targetParams });
        return;
      }
      if (state?.routeNames?.includes("LeadsDashboard")) {
        navigation.navigate(targetScreen, targetParams);
        return;
      }

      let p = navigation.getParent?.();
      while (p) {
        const pState = p.getState?.();
        if (pState?.routeNames?.includes("LeadsEngine")) {
          p.navigate("LeadsEngine", { screen: targetScreen, params: targetParams });
          return;
        }
        if (pState?.routeNames?.includes("DashboardStack")) {
          p.navigate("DashboardStack", {
            screen: "LeadsEngine",
            params: { screen: targetScreen, params: targetParams },
          });
          return;
        }
        if (pState?.routeNames?.includes("EmployeeStack") || pState?.routeNames?.includes("MainTabs")) {
          p.navigate("LeadsEngine", { screen: targetScreen, params: targetParams });
          return;
        }
        p = p.getParent?.();
      }

      try {
        const { navigationRef } = require("../navigation/AppNavigator");
        if (navigationRef.isReady()) {
          if (role === "employee" || role === "team member") {
            navigationRef.navigate("LeadsEngine", { screen: targetScreen, params: targetParams });
          } else if (role === "hr") {
            navigationRef.navigate("HRStack", { screen: "LeadsEngine", params: { screen: targetScreen, params: targetParams } });
          } else if (role === "manager") {
            navigationRef.navigate("ManagerStack", { screen: "LeadsEngine", params: { screen: targetScreen, params: targetParams } });
          } else {
            navigationRef.navigate("DashboardStack", {
              screen: "LeadsEngine",
              params: { screen: targetScreen, params: targetParams },
            });
          }
          return;
        }
      } catch (_) {}

      navigation.navigate("LeadsEngine", { screen: targetScreen, params: targetParams });
      return;
    }

    // Direct check in current navigator state
    const state = navigation.getState?.();
    if (state?.routeNames?.includes(target)) {
      navigation.navigate(target, params);
      return;
    }

    // Traverse parent navigators
    let p = navigation.getParent?.();
    while (p) {
      const pState = p.getState?.();
      if (pState?.routeNames?.includes(target)) {
        p.navigate(target, params);
        return;
      }
      if (role === "employee" || role === "team member") {
        if (pState?.routeNames?.includes("MainTabs")) {
          p.navigate("MainTabs", { screen: target, params });
          return;
        }
        if (pState?.routeNames?.includes("EmployeeStack")) {
          p.navigate("EmployeeStack", { screen: target, params });
          return;
        }
      } else if (role === "hr") {
        if (pState?.routeNames?.includes("HRStack")) {
          p.navigate("HRStack", { screen: target, params });
          return;
        }
      } else if (role === "manager") {
        if (pState?.routeNames?.includes("ManagerStack")) {
          p.navigate("ManagerStack", { screen: target, params });
          return;
        }
      } else {
        if (pState?.routeNames?.includes("DashboardStack")) {
          p.navigate("DashboardStack", { screen: target, params });
          return;
        }
      }
      p = p.getParent?.();
    }

    // Top-level navigationRef fallback
    try {
      const { navigationRef } = require("../navigation/AppNavigator");
      if (navigationRef.isReady()) {
        if (role === "employee" || role === "team member") {
          navigationRef.navigate(target, params);
          return;
        } else if (role === "hr") {
          navigationRef.navigate("HRStack", { screen: target, params });
          return;
        } else if (role === "manager") {
          navigationRef.navigate("ManagerStack", { screen: target, params });
          return;
        } else {
          navigationRef.navigate("DashboardStack", { screen: target, params });
          return;
        }
      }
    } catch (_) {}

    try {
      navigation.navigate(target, params);
    } catch (err) {
      console.warn("[CompanyAdminLayout] Navigation failed for:", target, err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return "CA";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userRole = (user?.role || "").toLowerCase();
  const isCompanyAdmin = userRole === "companyadmin" || userRole === "superadmin" || userRole === "admin";
  const hideBottomNav = propHideBottomNav !== undefined 
    ? propHideBottomNav 
    : (!isCompanyAdmin || HIDE_BOTTOM_NAV_SCREENS.includes(currentRouteName));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Header Bar */}
      <View
        style={[
          styles.header,
          {
            height: 60 + insets.top,
            paddingTop: insets.top,
            backgroundColor: headerBg || "#0F172A",
          },
          headerStyle,
        ]}
      >
        <View style={styles.headerLeft}>
          {hideBottomNav ? (
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("CompanyDashboard");
                }
              }}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="menu-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle || user?.companyName || "Nextact HRMS"}
            </Text>
            <Text style={styles.companySubtitle} numberOfLines={1}>
              {user?.role === "CompanyAdmin" ? "Company Administration" : "HR Operations Hub"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {headerRightElement}

          {showSearch && (
            <TouchableOpacity
              onPress={() => setIsSearchExpanded(!isSearchExpanded)}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleQuickNav("Notifications")}
            style={styles.bellBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => handleQuickNav("CompanyProfile")}
            activeOpacity={0.8}
          >
            {user?.photo || user?.avatar || user?.profilePicture ? (
              <Image
                source={{ uri: user.photo || user.avatar || user.profilePicture }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Expandable Sub-Header */}
      {showSearch && isSearchExpanded && (
        <View style={styles.searchSubHeader}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchValue}
              onChangeText={onSearchChange}
              autoFocus={true}
            />
            {searchValue ? (
              <TouchableOpacity onPress={() => onSearchChange && onSearchChange("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Main Body Content */}
      <View style={styles.content}>{children}</View>

      {/* Dark Navy Bottom Navigation Bar (Matches Manager Portal Design) */}
      {!hideBottomNav && (
        <View
          style={[
            styles.bottomNavContainer,
            { height: 60 + insets.bottom, paddingBottom: insets.bottom },
          ]}
        >
          {ADMIN_NAV_ITEMS.map((item) => {
            if (item.isCenter) {
              return (
                <TouchableOpacity
                  key="center-add-fab"
                  style={styles.centerAddBtn}
                  activeOpacity={0.85}
                  onPress={() => setFabVisible(true)}
                >
                  <Ionicons name="leaf" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              );
            }

            const isActive = activeTabVal === item.label || activeTabVal === item.shortLabel;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.bottomNavItem}
                onPress={() => handleQuickNav(item.screen)}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22}
                    color={isActive ? COLORS.primary : "#64748B"}
                  />
                </View>
                <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}>
                  {item.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Admin Quick Actions Modal Sheet */}
      <Modal
        visible={fabVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFabVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFabVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitle}>Admin Quick Actions</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickNav("LeadsEngine", { screen: "LeadsList", params: { openAddModal: true } })}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Add New Lead</Text>
                <Text style={styles.modalOptionSub}>Register new client inquiry or deal</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickNav("AddEmployee")}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="people-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Add New Employee</Text>
                <Text style={styles.modalOptionSub}>Onboard new staff or manager</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickNav("CompanyCreateTask")}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="checkbox-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Create New Task</Text>
                <Text style={styles.modalOptionSub}>Assign task to staff or department</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickNav("CompanyCreateProject")}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name="briefcase-outline" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Add New Project</Text>
                <Text style={styles.modalOptionSub}>Create project milestone or workspace</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickNav("RegularizationApproval")}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Regularize Attendance</Text>
                <Text style={styles.modalOptionSub}>Approve punch corrections</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setFabVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: COLORS.darkNavy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    ...SHADOWS.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  menuBtn: {
    padding: 6,
    marginRight: 8,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  companySubtitle: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    padding: 6,
    marginRight: 6,
  },
  bellBtn: {
    padding: 6,
    position: "relative",
    marginRight: 6,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.darkNavy,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
  },
  avatar: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    marginLeft: 6,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16.5,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  searchSubHeader: {
    backgroundColor: COLORS.darkNavy,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.body,
    padding: 0,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Dark Navy Bottom Navigation (Matches Manager Portal Design)
  bottomNavContainer: {
    flexDirection: "row",
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -3 },
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  iconContainer: {
    position: "relative",
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavText: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#D0D5DB",
    marginTop: 4,
  },
  bottomNavTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  centerAddBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalHeaderIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.darkNavy,
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
  },
  modalOptionSub: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  modalCancelButton: {
    marginTop: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
  },
});

export default CompanyAdminLayout;
