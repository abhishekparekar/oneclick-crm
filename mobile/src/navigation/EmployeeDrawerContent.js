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
import { useAppData } from "../context/AppDataContext";
import { FONTS } from "../theme/tokens";

const buildEmployeeSections = (hasPermission) => {
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");

  return [
    {
      title: "Core Dashboard",
      items: [
        { label: "Dashboard", screen: "EmployeeDashboard", icon: "grid-outline" },
        { label: "Company Requests", screen: "CompanyRequests", icon: "chatbubbles-outline" },
        ...(canAccessLeads ? [
          { label: "Lead Management", screen: "LeadsEngine", icon: "magnet-outline" }
        ] : []),
        { label: "My Profile", screen: "EmployeeProfile", icon: "person-outline" },
        { label: "My Documents", screen: "EmployeeDocuments", icon: "document-text-outline" },
      ],
    },
    ...(canAccessLeads ? [
      {
        title: "Lead Engine CRM",
        items: [
          { label: "Leads Pipeline", screen: "LeadsEngine", icon: "magnet-outline" },
        ],
      }
    ] : []),
    {
      title: "Staff & Work",
      items: [
        { label: "My Attendance", screen: "Attendance", icon: "calendar-outline", module: "attendance" },
        { label: "My Tasks", screen: "Tasks", icon: "albums-outline", module: "tasks" },
        { label: "Leave", screen: "Leave", icon: "document-text-outline", module: "leave" },
        { label: "Payslips", screen: "Payslips", icon: "receipt-outline", module: "payroll" },
      ],
    },
    {
      title: "Support & Communication",
      items: [
        { label: "Notifications", screen: "Notifications", icon: "notifications-outline" },
        { label: "Announcements", screen: "Announcements", icon: "megaphone-outline" },
        { label: "Settings", screen: "Settings", icon: "settings-outline" },
      ],
    },
  ];
};

const EmployeeDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout, hasPermission } = useAuth();
  const { employeeDashboard } = useAppData();
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
    const targetScreen = typeof item === "object" && item.targetScreen ? item.targetScreen : null;
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
    if (!name) return "EE";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get department / designation from cached dashboard profile
  const profile = employeeDashboard?.employee;
  const subtitle = profile
    ? `${profile.designationId?.name || ""} (${profile.departmentId?.name || ""})`
    : user?.role || "Team Member";

  const photoUrl = profile?.photo?.trim() || user?.photo || user?.avatar || user?.profilePicture || "";
  const showPlaceholder = !photoUrl || imgError;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Profile Header Card */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          {showPlaceholder ? (
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          ) : (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: "100%", height: "100%", borderRadius: 26 }}
              onError={() => setImgError(true)}
            />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || "Team Member"}
          </Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {user?.companyName || "One Click Business"}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {subtitle.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sections.map((section) => {
          const visibleItems = section.items;

          if (!visibleItems || visibleItems.length === 0) return null;

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              {visibleItems.map((item) => {
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
                      size={20}
                      color={isActive ? "#C2410C" : "#475569"}
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
          <Ionicons name="log-out-outline" size={22} color="#dc2626" style={styles.menuIcon} />
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
    backgroundColor: "#0F172A",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#0F172A",
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
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
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
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "left",
  },
  roleBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    color: "#F97316",
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 10.5,
    color: "#F97316",
    marginLeft: 16,
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 1.2,
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
    backgroundColor: "#FFF7ED",
    borderLeftWidth: 3,
    borderLeftColor: "#F97316",
  },
  menuIcon: {
    marginRight: 12,
    width: 22,
    textAlign: "center",
  },
  menuText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13.5,
    color: "#64748B",
  },
  menuTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#F97316",
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  logoutText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#EF4444",
  },
});

export default EmployeeDrawerContent;
