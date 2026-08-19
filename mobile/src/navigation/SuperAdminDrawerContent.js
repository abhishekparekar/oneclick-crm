import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../context/LayoutContext";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", screen: "SuperAdminDashboard", icon: "home-outline" },
  { label: "Companies", screen: "Companies", icon: "business-outline" },
  { label: "Add Company", screen: "AddCompany", icon: "add-circle-outline" },
  { label: "Company Admins", screen: "CompanyAdmins", icon: "people-outline" },
  { label: "Subscription Plans", screen: "SubscriptionPlans", icon: "card-outline" },
  { label: "Company Subscriptions", screen: "CompanySubscriptions", icon: "receipt-outline" },
  { label: "Payments", screen: "Payments", icon: "cash-outline" },
  { label: "Module Access Control", screen: "ModuleAccessControl", icon: "lock-closed-outline" },
  { label: "Global Users", screen: "GlobalUsers", icon: "globe-outline" },
  { label: "Support Tickets", screen: "SupportTickets", icon: "help-circle-outline" },
  { label: "Announcements", screen: "Announcements", icon: "megaphone-outline" },
  { label: "Reports & Analytics", screen: "ReportsDashboard", icon: "analytics-outline" },
  { label: "Audit Logs", screen: "AuditLogs", icon: "list-outline" },
  { label: "Login History", screen: "LoginHistory", icon: "log-in-outline" },
  { label: "System Settings", screen: "SystemSettings", icon: "settings-outline" },
  { label: "Backup & Logs", screen: "BackupLogs", icon: "cloud-upload-outline" },
  { label: "Profile", screen: "SuperAdminProfile", icon: "person-outline" },
];

const SuperAdminDrawerContent = (props) => {
  const { state, navigation } = props;
  const { user, logout } = useAuth();
  const layout = useLayout();

  // Use dynamic activeTab from LayoutContext with a safe fallback
  const activeTabVal = layout ? layout.activeTab : "Dashboard";
  
  // Custom navigation handler to support stack navigation states
  const handleNavigate = (screenName) => {
    navigation.navigate("DashboardStack", { screen: screenName });
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
    if (!name) return "SA";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || "Super Admin"}
          </Text>
          <Text style={styles.userRole}>Super Admin</Text>
        </View>
      </View>

      {/* Menu List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive =
            activeTabVal === item.label ||
            activeTabVal === item.screen ||
            (activeTabVal === "Dashboard" && item.label === "Dashboard") ||
            (activeTabVal === "Plans" && item.label === "Subscription Plans") ||
            (activeTabVal === "Reports" && item.label === "Reports & Analytics");

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => handleNavigate(item.screen)}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? "#2563eb" : "#4b5563"}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
            </TouchableOpacity>
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
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  userRole: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: "#eff6ff",
  },
  menuIcon: {
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  menuTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
});

export default SuperAdminDrawerContent;
