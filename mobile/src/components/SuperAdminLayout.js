import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useNavigationState, DrawerActions } from "@react-navigation/native";
import { useLayout } from "../context/LayoutContext";
import NotificationBell from "./NotificationBell";

const BOTTOM_NAV_ITEMS = [
  { label: "Dashboard", screen: "SuperAdminDashboard", icon: "home-outline", activeIcon: "home" },
  { label: "Companies", screen: "Companies", icon: "business-outline", activeIcon: "business" },
  { label: "Plans", screen: "SubscriptionPlans", icon: "card-outline", activeIcon: "card" },
  { label: "Payments", screen: "Payments", icon: "cash-outline", activeIcon: "cash" },
  { label: "Reports", screen: "ReportsDashboard", icon: "analytics-outline", activeIcon: "analytics" },
];

const ROUTE_TO_TAB = {
  SuperAdminDashboard: "Dashboard",
  Companies: "Companies",
  SubscriptionPlans: "Plans",
  Payments: "Payments",
  ReportsDashboard: "Reports",
};

const SuperAdminLayout = ({
  children,
  navigation: propNavigation,
  activeTab,
  isOuterShell = false,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const parentLayout = useLayout();
  const { width: windowWidth } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && windowWidth >= 768;

  // Determine if this instance should act as a nested layout bypass
  const isNested = parentLayout && !isOuterShell;

  // 1. Sync properties with parent layout context if we are a nested page layout
  useEffect(() => {
    if (isNested) {
      parentLayout.updateConfig({
        activeTab,
        showSearch: false,
        unreadNotifications: 0,
      });
    }
  }, [isNested, activeTab]);

  // If we are nested, bypass the shell completely and only render screen content
  if (isNested) {
    return <View style={styles.nestedContainer}>{children}</View>;
  }

  // 2. Safely capture navigation state inside the outer shell to highlight active tabs dynamically
  const currentRouteName = useNavigationState((state) => {
    if (!state) return null;
    let route = state.routes[state.index];
    while (route.state) {
      route = route.state.routes[route.state.index];
    }
    return route.name;
  });

  const activeTabVal = parentLayout
    ? parentLayout.activeTab
    : (ROUTE_TO_TAB[currentRouteName] || activeTab || "Dashboard");

  const getInitials = (name) => {
    if (!name) return "SA";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleQuickNav = (screen) => {
    if (isOuterShell) {
      navigation.navigate("DashboardStack", { screen });
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.layoutWrapper}>
        {/* Left Sidebar - Desktop/Web Only */}
        {isDesktop && (
          <View style={styles.sidebar}>
            {/* Brand Header */}
            <View style={styles.sidebarBrand}>
              <Ionicons name="shield-checkmark" size={24} color="#f59e0b" />
              <Text style={styles.sidebarBrandText} numberOfLines={1}>
                One Click Admin
              </Text>
            </View>

            {/* User Profile Summary */}
            <View style={styles.sidebarUser}>
              <View style={styles.sidebarAvatar}>
                <Text style={styles.sidebarAvatarText}>{getInitials(user?.name)}</Text>
              </View>
              <View style={styles.sidebarUserInfo}>
                <Text style={styles.sidebarUserName} numberOfLines={1}>
                  {user?.name || "Super Admin"}
                </Text>
                <Text style={styles.sidebarUserRole} numberOfLines={1}>
                  System Administrator
                </Text>
              </View>
            </View>

            {/* Sidebar Navigation */}
            <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
              {BOTTOM_NAV_ITEMS.map((item) => {
                const isActive = activeTabVal === item.label;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleQuickNav(item.screen)}
                    style={[styles.sidebarNavItem, isActive && styles.sidebarNavItemActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isActive ? item.activeIcon : item.icon}
                      size={20}
                      color={isActive ? "#f59e0b" : "#94a3b8"}
                      style={styles.sidebarNavIcon}
                    />
                    <Text style={[styles.sidebarNavText, isActive && styles.sidebarNavTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Right Area (Header + Main Content + Mobile Bottom Nav) */}
        <View style={styles.mainContainer}>
          {/* Top Header */}
          <View
            style={[
              styles.header,
              { height: 60 + insets.top, paddingTop: insets.top },
              isDesktop && styles.desktopHeaderAdjustment,
            ]}
          >
            <View style={styles.headerLeft}>
              {!isDesktop ? (
                <TouchableOpacity
                  onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                  style={styles.menuBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="menu-outline" size={26} color="#f8fafc" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 8 }} />
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>
                One Click SuperAdmin
              </Text>
            </View>

            <View style={styles.headerRight}>
              <NotificationBell
                unreadCount={0}
                onPress={() => handleQuickNav("Notifications")}
              />
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => handleQuickNav("SuperAdminProfile")}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.content}>{children}</View>

          {/* Bottom Navigation Bar - Mobile/Tablet Only */}
          {!isDesktop && (
            <View style={[styles.bottomNavContainer, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
              {BOTTOM_NAV_ITEMS.map((item) => {
                const isActive = activeTabVal === item.label;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleQuickNav(item.screen)}
                    style={styles.bottomNavItem}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isActive ? item.activeIcon : item.icon}
                      size={22}
                      color={isActive ? "#f59e0b" : "#94a3b8"}
                    />
                    <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  nestedContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  mainContainer: {
    flex: 1,
    height: "100%",
    flexDirection: "column",
    backgroundColor: "#0f172a",
  },
  sidebar: {
    width: 240,
    backgroundColor: "#1e293b",
    borderRightWidth: 1,
    borderRightColor: "#334155",
    height: "100%",
    paddingTop: 20,
    display: Platform.OS === "web" ? "flex" : "none",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sidebarBrandText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f8fafc",
    marginLeft: 10,
    flex: 1,
  },
  sidebarUser: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    marginBottom: 20,
  },
  sidebarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  sidebarAvatarText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  sidebarUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#f8fafc",
  },
  sidebarUserRole: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
    fontWeight: "600",
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarNavItemActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  sidebarNavIcon: {
    marginRight: 12,
  },
  sidebarNavText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#94a3b8",
  },
  sidebarNavTextActive: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  header: {
    backgroundColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  desktopHeaderAdjustment: {
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "50%",
  },
  menuBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomNavContainer: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderTopWidth: 1,
    borderTopColor: "#334155",
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
  bottomNavText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 4,
  },
  bottomNavTextActive: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
});

export default SuperAdminLayout;
