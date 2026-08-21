import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";

const EmployeeLayout = ({
  children,
  navigation: propNavigation,
  title = "One Click",
  rightActionType = "default", // "default", "tasks", "projects", "profile", "none"
  onRightActionPress = {}, // callbacks: { onSearch, onFilter, onPlus, onEdit }
  headerRightElement = null,
  hideFab = false,
  onAddLeadPress = null,
}) => {
  const { user, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const { employeeDashboard } = useAppData();
  const [imgError, setImgError] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const canCreateLead = hasPermission("leads", "create") || hasPermission("leads");

  const getProfileScreenForRole = (role) => {
    switch (role?.toLowerCase()) {
      case "superadmin":
        return "SuperAdminProfile";
      case "companyadmin":
        return "CompanyProfile";
      case "hr":
        return "HRProfile";
      case "manager":
        return "ManagerProfile";
      case "employee":
      default:
        return "EmployeeProfile";
    }
  };

  const getInitials = (name) => {
    if (!name) return "EE";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good Morning";
    if (hrs < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const unreadNotificationsVal = employeeDashboard?.unreadNotificationsCount || 0;
  const unreadAnnouncementsCount = employeeDashboard?.announcements?.filter(a => !a.isRead)?.length || 0;

  const photoUrl = employeeDashboard?.employee?.photo?.trim() || "";
  const showPlaceholder = !photoUrl || imgError;

  const isDashboard = title === "Home" || title === "Dashboard";

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { height: (isDashboard ? 75 : 60) + insets.top, paddingTop: insets.top },
          { backgroundColor: "#0F172A" }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={26} color="#ffffff" />
          </TouchableOpacity>
          {isDashboard ? (
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.greetingText, { color: "#94A3B8" }]}>{getGreeting()}</Text>
              <Text style={[styles.nameText, { color: "#ffffff" }]}>
                {employeeDashboard?.employee?.fullName || employeeDashboard?.employee?.firstName || user?.name || "Team Member"} 👋
              </Text>
            </View>
          ) : (
            <Text style={[styles.headerTitle, { color: "#ffffff" }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {rightActionType === "tasks" ? (
            <View style={styles.headerActionRow}>
              {onRightActionPress.onSearch && (
                <TouchableOpacity onPress={onRightActionPress.onSearch} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="search-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {onRightActionPress.onFilter && (
                <TouchableOpacity
                  onPress={onRightActionPress.onFilter}
                  style={[
                    styles.headerActionBtn,
                    onRightActionPress.filterActive ? { backgroundColor: "#F97316", padding: 6, borderRadius: 8 } : null
                  ]}
                  activeOpacity={0.6}
                >
                  <Ionicons name={onRightActionPress.filterActive ? "funnel" : "funnel-outline"} size={onRightActionPress.filterActive ? 18 : 22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {onRightActionPress.onPlus && (
                <TouchableOpacity onPress={onRightActionPress.onPlus} style={[styles.headerPlusBtn, { backgroundColor: "#F97316" }]} activeOpacity={0.6}>
                  <Ionicons name="add" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          ) : rightActionType === "projects" ? (
            <View style={styles.headerActionRow}>
              {onRightActionPress.onSearch && (
                <TouchableOpacity onPress={onRightActionPress.onSearch} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="search-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {onRightActionPress.onPlus && (
                <TouchableOpacity onPress={onRightActionPress.onPlus} style={[styles.headerPlusBtn, { backgroundColor: "#F97316" }]} activeOpacity={0.6}>
                  <Ionicons name="add" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          ) : rightActionType === "profile" ? (
            <View style={styles.headerActionRow}>
              {onRightActionPress.onSettings && (
                <TouchableOpacity onPress={onRightActionPress.onSettings} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="settings-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
              {onRightActionPress.onEdit && (
                <TouchableOpacity onPress={onRightActionPress.onEdit} style={styles.headerActionBtn} activeOpacity={0.6}>
                  <Ionicons name="create-outline" size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          ) : rightActionType === "none" ? null : (
            <>
              {headerRightElement}
              {unreadAnnouncementsCount > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Announcements")}
                  style={[styles.bellBtn, { marginRight: 8 }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="megaphone-outline" size={24} color="#ffffff" />
                  <View style={[styles.badge, { borderColor: "#0F172A", backgroundColor: "#F97316" }]}>
                    <Text style={styles.badgeText}>
                      {unreadAnnouncementsCount > 9 ? "9+" : unreadAnnouncementsCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {unreadNotificationsVal > 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Notifications")}
                  style={styles.bellBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                  <View style={[styles.badge, { borderColor: "#0F172A", backgroundColor: "#EF4444" }]}>
                    <Text style={styles.badgeText}>
                      {unreadNotificationsVal > 9 ? "9+" : unreadNotificationsVal}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.avatar}
                onPress={() => navigation.navigate(getProfileScreenForRole(user?.role))}
                activeOpacity={0.7}
              >
                {showPlaceholder ? (
                  <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
                ) : (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImage}
                    onError={() => setImgError(true)}
                  />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>
      {/* Global FAB Menu */}
      {!hideFab && (
        <View style={[styles.fabWrapper, { bottom: Math.max(24, insets.bottom + 20) }]}>
          {fabOpen && (
            <View style={styles.fabMenu}>
              {canCreateLead && (
                <TouchableOpacity
                  style={styles.fabMenuItem}
                  onPress={() => {
                    setFabOpen(false);
                    if (onAddLeadPress) {
                      onAddLeadPress();
                    } else {
                      const params = { openAddModal: true, timestamp: Date.now() };
                      try {
                        navigation.navigate("EmployeeLeads", params);
                      } catch (_) {
                        navigation.navigate("LeadsEngine", params);
                      }
                    }
                  }}
                >
                  <Text style={styles.fabMenuText}>Add Lead</Text>
                  <View style={[styles.fabMenuIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="person-add" size={16} color="#F97316" />
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabOpen(false); navigation.navigate('EmployeeCreateTask'); }}>
                <Text style={styles.fabMenuText}>Add Task</Text>
                <View style={styles.fabMenuIcon}><Ionicons name="briefcase" size={16} color="#F97316" /></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setFabOpen(false); navigation.navigate('EmployeeApplyLeave'); }}>
                <Text style={styles.fabMenuText}>Apply Leave</Text>
                <View style={styles.fabMenuIcon}><Ionicons name="calendar" size={16} color="#F97316" /></View>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.fabBtn, fabOpen && { transform: [{ rotate: '45deg' }] }]}
            activeOpacity={0.8}
            onPress={() => setFabOpen(!fabOpen)}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "70%",
  },
  menuBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerTitleContainer: {
    marginLeft: 4,
    justifyContent: "center",
  },
  greetingText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nameText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  designationText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "500",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bellBtn: {
    padding: 6,
    position: "relative",
  },
  badge: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    padding: 6,
    marginLeft: 10,
  },
  headerPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 9999,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabMenu: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fabMenuText: {
    color: '#0F172A',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export default EmployeeLayout;
