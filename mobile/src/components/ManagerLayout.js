import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, DrawerActions, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getMyNotificationsApi } from "../api/notificationService";
import { useLayout } from "../context/LayoutContext";

const MANAGER_PRIMARY = "#1268D9";
const MANAGER_AVATAR_BG = "#1268D9";

// Map of screen names to which tab they "belong to"
const SCREEN_TO_TAB = {
  ManagerDashboard: "Home",
  ManagerDashboardScreen: "Home",
  ManagerTeam: "Home",
  ManagerTeamMemberDetails: "Home",
  ManagerTeamOrgView: "Home",
  LeadsEngine: "Leads",
  LeadsDashboard: "Leads",
  LeadsDashboardScreen: "Leads",
  LeadsList: "Leads",
  LeadDetails: "Leads",
  LeadReminders: "Leads",
  LeadCampaigns: "Leads",
  LeadSettings: "Leads",
  ManagerTasks: "Tasks",
  ManagerTasksScreen: "Tasks",
  ManagerMyTasks: "Tasks",
  ManagerTeamTasks: "Tasks",
  ManagerTaskDetails: "Tasks",
  ManagerCreateTask: "Tasks",
  ManagerProjects: "My Projects",
  ManagerProjectDetails: "My Projects",
  ManagerCreateProject: "My Projects",
  ManagerProfile: "Profile",
  ManagerProfileScreen: "Profile",
  ManagerEditProfileScreen: "Profile",
  ManagerSettings: "Profile",
  ManagerAttendance: "Attendance",
  ManagerAttendanceScreen: "Attendance",
  ManagerMyAttendance: "Attendance",
  ManagerTeamAttendance: "Attendance",
  ManagerTeamAttendanceScreen: "Attendance",
  ManagerTeamAttendanceDetails: "Attendance",
  ManagerTeamAttendanceDetailsScreen: "Attendance",
  ManagerRegularization: "Attendance",
  ManagerTeamLeaves: "Attendance",
  ManagerTeamLeavesScreen: "Attendance",
};

const BOTTOM_TABS = [
  { label: "Home", screen: "ManagerDashboard", icon: "home-outline", activeIcon: "home" },
  { label: "Leads", screen: "LeadsEngine", icon: "magnet-outline", activeIcon: "magnet", module: "leads" },
  { label: "CenterAdd", isCenter: true },
  { label: "Tasks", screen: "ManagerTasks", icon: "checkbox-outline", activeIcon: "checkbox", module: "tasks" },
  { label: "Attendance", screen: "ManagerTeamAttendance", icon: "calendar-outline", activeIcon: "calendar", module: "attendance" }
];

const HIDE_BOTTOM_NAV_SCREENS = [
  "ManagerCreateTask",
  "ManagerTaskDetails",
  "ManagerCreateProject",
  "ManagerProjectDetails",
  "ManagerRegularization",
  "ManagerTeamLeaveDetails",
  "ManagerNotifications",
  "ManagerNotificationDetailsScreen",
  "ManagerAnnouncements",
  "ManagerAnnouncementDetailsScreen",
  "ManagerSettings",
  "ManagerEditProfileScreen",
];

const ManagerLayout = ({
  children,
  navigation: propNavigation,
  title = "Manager",
  subtitle = null,
  unreadCount = 0,
  activeTabOverride = null,
  showBack = false,
  showBackButton = false,
  rightActionType = "default", // "default", "profile", "none"
  onRightActionPress = {},
  showSearch = false,
  searchValue = "",
  onSearchChange = null,
  searchPlaceholder = "Search...",
  showFilter = false,
  onFilterPress = null,
  filterActive = false,
  hideFab = false,
}) => {
  const { user, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const parentLayout = useLayout();

  const [fabVisible, setFabVisible] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Cached notification query (zero re-render thrashing on route changes)
  const { data: notifData } = useQuery({
    queryKey: ["myNotifications"],
    queryFn: async () => {
      const res = await getMyNotificationsApi().catch(() => ({ data: { unreadCount: 0 } }));
      return res.data || { unreadCount: 0 };
    },
    staleTime: 60000,
  });

  const displayUnread = unreadCount > 0 ? unreadCount : (notifData?.unreadCount || 0);
  const unreadAnnouncementsCount = notifData?.unreadAnnouncements || 0;

  let currentRouteName = null;
  try {
    const route = useRoute();
    currentRouteName = route?.name || null;
  } catch (_) { }

  // Resolve the active tab label with full fallback & fuzzy detection
  let activeTabLabel = "Home";
  if (activeTabOverride) {
    const overrideMatch = BOTTOM_TABS.find(
      t => t.screen === activeTabOverride ||
           t.label === activeTabOverride ||
           t.label.toLowerCase() === String(activeTabOverride).toLowerCase() ||
           t.screen.toLowerCase() === String(activeTabOverride).toLowerCase()
    );
    if (overrideMatch) {
      activeTabLabel = overrideMatch.label;
    } else {
      activeTabLabel = SCREEN_TO_TAB[activeTabOverride] || activeTabOverride || "Home";
    }
  } else if (currentRouteName) {
    activeTabLabel = SCREEN_TO_TAB[currentRouteName] ||
      (currentRouteName.includes("Lead") ? "Leads" :
       currentRouteName.includes("Task") ? "Tasks" :
       currentRouteName.includes("Attendance") || currentRouteName.includes("Leave") ? "Attendance" :
       currentRouteName.includes("Project") ? "Home" : "Home");
  }

  // Sync activeTabLabel to LayoutContext safely
  React.useEffect(() => {
    if (parentLayout?.updateConfig && parentLayout.activeTab !== activeTabLabel) {
      parentLayout.updateConfig({ activeTab: activeTabLabel });
    }
  }, [activeTabLabel]);

  const getInitials = (name) => {
    if (!name) return "MG";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navigateToTab = (screen) => {
    if (screen === "OpenDrawer") {
      navigation.dispatch(DrawerActions.openDrawer());
      return;
    }
    if (screen === "ManagerDashboard" || screen === "Home") {
      navigation.navigate("ManagerDashboard");
      return;
    }
    if (screen === "LeadsEngine" || screen === "LeadsDashboard" || screen === "Leads") {
      navigation.navigate("LeadsEngine", { screen: "LeadsDashboard" });
      return;
    }
    if (screen === "ManagerTasks" || screen === "Tasks") {
      navigation.navigate("ManagerTasks");
      return;
    }
    if (screen === "ManagerTeamAttendance" || screen === "ManagerAttendance" || screen === "Attendance") {
      navigation.navigate("ManagerTeamAttendance");
      return;
    }
    if (screen === "ManagerTeam" || screen === "My Team") {
      navigation.navigate("ManagerTeam");
      return;
    }
    if (screen === "ManagerProfile" || screen === "Profile") {
      navigation.navigate("ManagerProfile");
      return;
    }
    navigation.navigate(screen);
  };

  const navigateToScreen = (screen) => {
    setFabVisible(false);
    navigation.navigate("ManagerStack", { screen });
  };

  const shouldShowBack = showBack || showBackButton;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header Bar ──────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            minHeight: 62 + Math.max(insets.top, 12),
            paddingTop: Math.max(insets.top, 12) + 4,
            paddingBottom: 10,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          {shouldShowBack ? (
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("ManagerTabs", { screen: "ManagerDashboard" });
                }
              }}
              style={styles.menuBtn}
              activeOpacity={0.7}
              accessibilityLabel="Go Back"
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={styles.menuBtn}
              activeOpacity={0.7}
              accessibilityLabel="Open Manager Menu"
            >
              <Ionicons name="menu-outline" size={26} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title === "Manager" ? "Dashboard" : title}</Text>
            <Text style={styles.companySubtitle} numberOfLines={1}>
              {subtitle || user?.companyName || "Oneclick"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {rightActionType === "profile" ? (
            <View style={styles.headerActionRow}>
              {onRightActionPress.onSettings && (
                <TouchableOpacity onPress={onRightActionPress.onSettings} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="settings-outline" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}
              {onRightActionPress.onEdit && (
                <TouchableOpacity onPress={onRightActionPress.onEdit} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="create-outline" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}
            </View>
          ) : rightActionType === "none" ? null : (
            <>
              {showSearch && (
                <TouchableOpacity
                  onPress={() => setIsSearchExpanded(!isSearchExpanded)}
                  style={{ marginRight: 12, padding: 4 }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="search-outline" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}

              {showFilter && (
                <TouchableOpacity
                  onPress={onFilterPress}
                  style={[
                    { marginRight: 12, padding: 6, borderRadius: 8, position: "relative" },
                    filterActive ? { backgroundColor: "#1268D9", borderWidth: 1, borderColor: "#ffffff" } : { padding: 4 }
                  ]}
                  activeOpacity={0.6}
                >
                  <Ionicons name={filterActive ? "funnel" : "funnel-outline"} size={filterActive ? 18 : 22} color={filterActive ? "#ffffff" : "#0F172A"} />
                  {filterActive && (
                    <View style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 9,
                      height: 9,
                      borderRadius: 4.5,
                      backgroundColor: "#ef4444",
                      borderWidth: 1.5,
                      borderColor: "#ffffff"
                    }} />
                  )}
                </TouchableOpacity>
              )}

              {unreadAnnouncementsCount > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerAnnouncements" })}
                  style={[styles.bellBtn, { marginRight: 8 }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="megaphone-outline" size={24} color="#0F172A" />
                  <View style={[styles.badge, { borderColor: "#FFFFFF", backgroundColor: "#1268D9" }]}>
                    <Text style={styles.badgeText}>
                      {unreadAnnouncementsCount > 9 ? "9+" : unreadAnnouncementsCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerNotifications" })}
                style={styles.bellBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={24} color="#0F172A" />
                {displayUnread > 0 && (
                  <View style={[styles.badge, { borderColor: "#FFFFFF", backgroundColor: "#EF4444" }]}>
                    <Text style={styles.badgeText}>{displayUnread > 9 ? "9+" : displayUnread}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatar}
                onPress={() => navigation.navigate("ManagerTabs", { screen: "ManagerProfile" })}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Sub Header for Search */}
      {showSearch && isSearchExpanded && (
        <View style={styles.searchBarSubHeader}>
          <View style={styles.searchContainerFull}>
            <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInputFull}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94a3b8"
              value={searchValue}
              onChangeText={onSearchChange}
              autoFocus={true}
            />
          </View>
        </View>
      )}

      {/* ── Content Area ───────────────────────────────── */}
      <View style={styles.content}>{children}</View>

      {/* ── Bottom Navigation Bar ──────────────────────── */}
      {!HIDE_BOTTOM_NAV_SCREENS.includes(currentRouteName) && (
        <View
          style={[
            styles.bottomNavContainer,
            { height: 60 + insets.bottom, paddingBottom: insets.bottom }
          ]}
        >
          {BOTTOM_TABS.filter((item) => {
            if (!item.module) return true;
            return hasPermission(item.module, "view") || hasPermission(item.module);
          }).map((item, index) => {
            if (item.isCenter) {
              return (
                <TouchableOpacity
                  key="center-add"
                  style={styles.centerAddBtn}
                  activeOpacity={0.85}
                  onPress={() => setFabVisible(true)}
                >
                  <Ionicons name="leaf" size={24} color="#ffffff" />
                </TouchableOpacity>
              );
            }

            const isActive = activeTabLabel === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.bottomNavItem}
                onPress={() => navigateToTab(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22}
                    color={isActive ? "#1268D9" : "#64748B"}
                  />
                </View>
                <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Floating action button (FAB) when bottom nav is hidden */}
      {!hideFab && HIDE_BOTTOM_NAV_SCREENS.includes(currentRouteName) && (
        <TouchableOpacity
          style={[styles.floatingFabBtn, { bottom: Math.max(24, insets.bottom + 20) }]}
          activeOpacity={0.85}
          onPress={() => setFabVisible(true)}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* FAB Action Sheet Modal */}
      <Modal
        visible={fabVisible}
        transparent={true}
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
            <Text style={styles.modalTitle}>Manager Quick Actions</Text>

            {(hasPermission("leads", "create") || hasPermission("leads")) && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabVisible(false);
                  navigation.navigate("ManagerStack", {
                    screen: "LeadsEngine",
                    params: { screen: "LeadsList", params: { openAddModal: true } },
                  });
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person-add-outline" size={20} color="#1268D9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Add New Lead</Text>
                  <Text style={styles.modalOptionSub}>Register new client inquiry or deal</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {(hasPermission("tasks", "create") || hasPermission("tasks")) && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => navigateToScreen("ManagerCreateTask")}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="checkbox-outline" size={20} color="#1268D9" />
                </View>
                <Text style={styles.modalOptionText}>Create New Task</Text>
              </TouchableOpacity>
            )}

            {(hasPermission("projects", "create") || hasPermission("projects")) && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => navigateToScreen("ManagerCreateProject")}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="folder-open-outline" size={20} color="#1268D9" />
                </View>
                <Text style={styles.modalOptionText}>Add New Project</Text>
              </TouchableOpacity>
            )}

            {(hasPermission("tasks", "create") || hasPermission("tasks")) && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabVisible(false);
                  navigation.navigate("ManagerCreateTask", { isRecurring: true });
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#fdf4ff' }]}>
                  <Ionicons name="repeat-outline" size={20} color="#9333ea" />
                </View>
                <Text style={styles.modalOptionText}>Setup Recurring Task</Text>
              </TouchableOpacity>
            )}

            {(hasPermission("attendance", "regularize") || hasPermission("attendance")) && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => navigateToScreen("ManagerRegularization")}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="time-outline" size={20} color="#16a34a" />
                </View>
                <Text style={styles.modalOptionText}>Regularize Attendance</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setFabVisible(false)}
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
    backgroundColor: "#F4F7FB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  menuBtn: { padding: 6, marginRight: 8 },
  titleBlock: { flex: 1 },
  headerTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  companySubtitle: {
    color: "#1268D9",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellBtn: { padding: 6, position: "relative" },
  badge: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#ffffff", fontSize: 9, fontWeight: "700" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MANAGER_AVATAR_BG,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#1268D9",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatarText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },

  content: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  // Clean White Bottom Navigation
  bottomNavContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
  },
  bottomNavTextActive: {
    color: "#1268D9",
    fontWeight: "700",
  },
  centerAddBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    marginBottom: 28,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    padding: 6,
    marginLeft: 12,
  },
  floatingFabBtn: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MANAGER_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: MANAGER_PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
  },
  searchBarSubHeader: {
    backgroundColor: MANAGER_PRIMARY,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d9488",
  },
  searchContainerFull: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputFull: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#0f172a",
    padding: 0,
  },
});

export default ManagerLayout;
