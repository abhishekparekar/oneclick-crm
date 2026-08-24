import React, { useState, useEffect } from "react";
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
import { useLayout } from "../context/LayoutContext";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../theme/tokens";

const SIDEBAR_SECTIONS = [
  {
    title: "Core Dashboard",
    items: [
      { label: "Dashboard", screen: "CompanyDashboard", icon: "grid-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Projects", screen: "ProjectList", icon: "folder-open-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Company Requests", screen: "CompanyRequests", icon: "chatbubbles-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Lead Engine CRM", screen: "LeadsEngine", targetScreen: "LeadsDashboard", icon: "magnet-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Company Attendance", screen: "CompanyAttendance", icon: "calendar-outline", roles: ["CompanyAdmin", "HR"], module: "attendance" },
      { label: "Task Board", screen: "TaskBoard", icon: "albums-outline", roles: ["CompanyAdmin", "HR"], module: "tasks" },
      { label: "Company Profile", screen: "CompanyProfile", icon: "business-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Send Document", screen: "UploadDocument", icon: "document-attach-outline", roles: ["CompanyAdmin", "HR"] },
    ]
  },
  {
    title: "Projects & Work",
    items: [
      { label: "All Projects", screen: "ProjectList", icon: "folder-open-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Create Project", screen: "CompanyCreateProject", icon: "add-circle-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Task Board", screen: "TaskBoard", icon: "albums-outline", roles: ["CompanyAdmin", "HR"], module: "tasks" },
      { label: "Create Task", screen: "CompanyCreateTask", icon: "checkbox-outline", roles: ["CompanyAdmin", "HR"], module: "tasks" },
    ]
  },
  {
    title: "Lead Engine & WhatsApp",
    items: [
      { label: "Leads Pipeline", screen: "LeadsEngine", targetScreen: "LeadsDashboard", icon: "magnet-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "WhatsApp Drips", screen: "LeadsEngine", targetScreen: "LeadCampaigns", icon: "water-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "WhatsApp Campaigns", screen: "LeadsEngine", targetScreen: "LeadCampaigns", icon: "logo-whatsapp", roles: ["CompanyAdmin", "HR"] },
      { label: "Service Reminders", screen: "LeadsEngine", targetScreen: "LeadReminders", icon: "alarm-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Lead Settings", screen: "LeadsEngine", targetScreen: "LeadSettings", icon: "settings-outline", roles: ["CompanyAdmin", "HR"] },
    ]
  },
  {
    title: "Organization Setup",
    items: [
      { label: "Departments", screen: "DepartmentList", icon: "git-branch-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Designations", screen: "DesignationList", icon: "ribbon-outline", roles: ["HR"] },
      { label: "Branches", screen: "BranchList", icon: "map-outline", roles: ["CompanyAdmin", "HR"] },
    ]
  },
  {
    title: "Staff Management",
    items: [
      { label: "Employees List", screen: "EmployeeList", icon: "people-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Add Employee", screen: "AddEmployee", icon: "person-add-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Regularization Approvals", screen: "RegularizationApproval", icon: "checkmark-done-circle-outline", roles: ["CompanyAdmin", "HR"], module: "attendance" },
    ]
  },
  {
    title: "Time Off & Holidays",
    items: [
      { label: "Leave Requests", screen: "LeaveRequests", icon: "document-text-outline", roles: ["CompanyAdmin", "HR"], module: "leave" },
      { label: "Leave Balances", screen: "LeaveBalance", icon: "hourglass-outline", roles: ["CompanyAdmin", "HR"], module: "leave" },
      { label: "Holiday Calendar", screen: "HolidayList", icon: "flag-outline", roles: ["CompanyAdmin", "HR"], module: "leave" },
    ]
  },
  {
    title: "Payroll & Compensation",
    items: [
      { label: "Salary Structures", screen: "SalaryStructureList", icon: "cash-outline", roles: ["CompanyAdmin", "HR"], module: "payroll" },
      { label: "Payroll History", screen: "PayrollList", icon: "receipt-outline", roles: ["CompanyAdmin", "HR"], module: "payroll" },
      { label: "Generate Payroll", screen: "GeneratePayroll", icon: "calculator-outline", roles: ["CompanyAdmin", "HR"], module: "payroll" },
    ]
  },
  {
    title: "Communication & Control",
    items: [
      { label: "Announcements", screen: "CompanyAnnouncements", icon: "megaphone-outline", roles: ["CompanyAdmin", "HR"] },
      { label: "Office Location Settings", screen: "AttendanceSettings", icon: "locate-outline", roles: ["CompanyAdmin", "HR"], module: "attendance" },
      { label: "Access & Control", screen: "AccessControl", icon: "shield-outline", roles: ["CompanyAdmin"] },
      { label: "System Settings", screen: "CompanySettings", icon: "settings-outline", roles: ["CompanyAdmin"] },
      { label: "Audit Logs", screen: "CompanyAuditLogs", icon: "shield-checkmark-outline", roles: ["CompanyAdmin"] },
    ]
  },
  {
    title: "Reports & Analytics",
    items: [
      { label: "Reports Dashboard", screen: "CompanyReportsDashboard", icon: "pie-chart-outline", roles: ["CompanyAdmin", "HR"], module: "reports" },
      { label: "Performance Report", screen: "PerformanceReport", icon: "trending-up-outline", roles: ["CompanyAdmin", "HR"], module: "reports" },
    ]
  }
];

const CompanyDrawerContent = (props) => {
  const { navigation } = props;
  const { user, logout } = useAuth();
  const layout = useLayout();

  const userRole = user?.role || "CompanyAdmin";
  const insets = useSafeAreaInsets();

  const activeTabVal = layout ? layout.activeTab : "Dashboard";

  const isItemActive = (item) => {
    return activeTabVal === item.label ||
           activeTabVal === item.screen ||
           (activeTabVal === "Team Members" && item.label === "Employees List") ||
           (activeTabVal === "Attendance" && item.label === "Company Attendance") ||
           (activeTabVal === "Leaves" && item.label === "Leave Requests") ||
           (activeTabVal === "Tasks" && item.label === "Task Board") ||
           (activeTabVal === "Projects" && item.label === "Projects");
  };

  const [expandedSections, setExpandedSections] = useState({
    "Core Dashboard": true,
    "Lead Engine & WhatsApp": true,
  });

  useEffect(() => {
    SIDEBAR_SECTIONS.forEach(section => {
      const containsActive = section.items.some(item => isItemActive(item));
      if (containsActive) {
        setExpandedSections(prev => ({
          ...prev,
          [section.title]: true
        }));
      }
    });
  }, [activeTabVal]);

  const toggleSection = (title) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleNavigate = (item) => {
    const screenName = typeof item === "string" ? item : item.screen;
    const targetScreen = typeof item === "object" ? item.targetScreen : null;

    if (screenName === "LeadsEngine") {
      navigation.navigate("DashboardStack", {
        screen: "LeadsEngine",
        params: { screen: targetScreen || "LeadsDashboard" },
      });
    } else {
      navigation.navigate("DashboardStack", { screen: screenName });
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
    if (!name) return "CA";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Dark Obsidian Hero Header */}
      <LinearGradient
        colors={['#071A2F', '#082B52']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) + 10 }]}
      >
        <View style={styles.headerTopRow}>
          {/* Avatar with Glow Circle */}
          <View style={styles.avatarGlow}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Company Admin"}
            </Text>
            <Text style={styles.userCompany} numberOfLines={1}>
              {user?.companyName || "Organization"}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Menu List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SIDEBAR_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(item =>
            item.roles.includes(userRole)
          );
          
          if (visibleItems.length === 0) return null;

          const isExpanded = !!expandedSections[section.title];

          return (
            <View key={section.title} style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeaderBtn}
                activeOpacity={0.7}
                onPress={() => toggleSection(section.title)}
              >
                <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={14}
                  color="#1268D9"
                />
              </TouchableOpacity>
              
              {isExpanded && visibleItems.map((item) => {
                const isActive = isItemActive(item);

                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleNavigate(item)}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    activeOpacity={0.8}
                  >
                    {isActive && <View style={styles.activePillBar} />}
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? "#1268D9" : "#64748B"}
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

        {/* Logout Row */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" style={styles.menuIcon} />
          <Text style={styles.logoutText}>Logout Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGlow: {
    marginRight: 14,
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#1268D9",
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: FONTS.displayBold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  userCompany: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 1,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 104, 217, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(18, 104, 217, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    color: "#2F8BFF",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    color: "#475569",
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 3,
    position: "relative",
  },
  menuItemActive: {
    backgroundColor: "rgba(18, 104, 217, 0.08)",
  },
  activePillBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    backgroundColor: "#1268D9",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  menuIcon: {
    marginRight: 10,
    width: 20,
    textAlign: "center",
  },
  menuText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#475569",
  },
  menuTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#1268D9",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: "#EF4444",
  },
});

export default CompanyDrawerContent;
