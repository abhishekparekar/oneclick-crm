import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useNavigationState, DrawerActions } from "@react-navigation/native";
import { useLayout } from "../context/LayoutContext";
import { FONTS, COLORS } from "../theme/tokens";
import NotificationBell from "./NotificationBell";

const BOTTOM_NAV_ITEMS = [
  { label: "Dashboard", shortLabel: "Home", screen: "SuperAdminDashboard", icon: "home-outline", activeIcon: "home" },
  { label: "Companies", shortLabel: "Companies", screen: "Companies", icon: "business-outline", activeIcon: "business" },
  { label: "Plans", shortLabel: "Plans", screen: "SubscriptionPlans", icon: "card-outline", activeIcon: "card" },
  { label: "Payments", shortLabel: "Payments", screen: "Payments", icon: "cash-outline", activeIcon: "cash" },
  { label: "Reports", shortLabel: "Reports", screen: "ReportsDashboard", icon: "stats-chart-outline", activeIcon: "stats-chart" },
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
  headerTitle,
  headerBg = "#FFFFFF",
  headerStyle,
  unreadNotifications = 0,
  hideBottomNav = false,
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
        unreadNotifications,
      });
    }
  }, [isNested, activeTab, unreadNotifications]);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.layoutWrapper}>
        {/* Left Sidebar - Desktop/Web Only */}
        {isDesktop && (
          <View style={styles.sidebar}>
            {/* Brand Header */}
            <View style={styles.sidebarBrand}>
              <Ionicons name="shield-checkmark" size={24} color="#D97706" />
              <Text style={styles.sidebarBrandText} numberOfLines={1}>
                ONE CLICK
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
                      color={isActive ? "#D97706" : "#64748B"}
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
              {
                minHeight: 62 + Math.max(insets.top, 12),
                paddingTop: Math.max(insets.top, 12) + 4,
                paddingBottom: 10,
                backgroundColor: headerBg || "#FFFFFF",
              },
              headerStyle,
            ]}
          >
            {/* Header Left */}
            <View style={styles.headerLeft}>
              {!isDesktop ? (
                <TouchableOpacity
                  onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                  style={styles.menuBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="menu-outline" size={26} color="#0F172A" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 8 }} />
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerTitle || "Dashboard"}
                </Text>
                <Text style={styles.superSubtitle} numberOfLines={1}>
                  ONE CLICK SUPERADMIN
                </Text>
              </View>
            </View>

            {/* Header Right */}
            <View style={styles.headerRight}>
              <NotificationBell
                unreadCount={unreadNotifications}
                onPress={() => handleQuickNav("Notifications")}
              />
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => handleQuickNav("SuperAdminProfile")}
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

          {/* Main Content Area */}
          <View style={styles.content}>{children}</View>

          {/* Bottom Navigation Bar - Mobile/Tablet Only */}
          {!isDesktop && !hideBottomNav && (
            <View
              style={[
                styles.bottomNavContainer,
                { height: 62 + insets.bottom, paddingBottom: insets.bottom },
              ]}
            >
              {BOTTOM_NAV_ITEMS.map((item) => {
                const isActive = activeTabVal === item.label || activeTabVal === item.shortLabel;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleQuickNav(item.screen)}
                    style={styles.bottomNavItem}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={isActive ? item.activeIcon : item.icon}
                        size={22}
                        color={isActive ? "#D97706" : "#64748B"}
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
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  nestedContainer: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  mainContainer: {
    flex: 1,
    height: "100%",
    flexDirection: "column",
    backgroundColor: "#F4F7FB",
  },
  sidebar: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
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
    fontWeight: "900",
    color: "#0F172A",
    marginLeft: 10,
    flex: 1,
    letterSpacing: 0.5,
  },
  sidebarUser: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 20,
  },
  sidebarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  sidebarAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  sidebarUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  sidebarUserRole: {
    fontSize: 11,
    color: "#D97706",
    marginTop: 1,
    fontWeight: "700",
    textTransform: "uppercase",
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
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarNavItemActive: {
    backgroundColor: "rgba(217, 119, 6, 0.12)",
  },
  sidebarNavIcon: {
    marginRight: 12,
  },
  sidebarNavText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#64748B",
  },
  sidebarNavTextActive: {
    color: "#D97706",
    fontWeight: "800",
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
  menuBtn: {
    padding: 6,
    marginRight: 8,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  superSubtitle: {
    color: "#D97706",
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FDE68A",
    marginLeft: 10,
    elevation: 2,
    shadowColor: "#D97706",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    fontWeight: "800",
  },
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
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
    marginTop: 3,
  },
  bottomNavTextActive: {
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#D97706",
  },
  content: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
});

export default SuperAdminLayout;
