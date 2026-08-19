import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { getMyEmployeeApi, getEmployeesApi } from "../../api/employeeService";
import api from "../../api/api";
import { COLORS, SHADOWS, ROUNDING, SPACING, FONTS } from "../../theme/tokens";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import DashboardSkeleton from "../../components/DashboardSkeleton";

const HRManageAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHR = user?.role === "HR";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "CompanyAdmin";

  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchText, setSearchText] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [status, setStatus] = useState("present");
  const [punchInTime, setPunchInTime] = useState("09:30");
  const [punchOutTime, setPunchOutTime] = useState("18:30");
  const [manualReason, setManualReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch Manager Dept ID
  const { data: managerDeptId } = useQuery({
    queryKey: ['managerProfile'],
    queryFn: async () => {
      if (!isManager) return null;
      const { data } = await getMyEmployeeApi();
      return data?.employee?.departmentId?._id || data?.employee?.departmentId || null;
    },
    enabled: isManager,
  });

  // Fetch Attendance Roster
  const { data: roster = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['attendanceRoster', filterDate, managerDeptId],
    queryFn: async () => {
      const params = { date: filterDate };
      const endpoint = isHR ? "/hr/attendance" : "/company/attendance";
      
      const [attRes, empRes] = await Promise.all([
        api.get(endpoint, { params }).catch(() => ({ data: { attendance: [] } })),
        getEmployeesApi().catch(() => ({ data: { employees: [] } }))
      ]);

      let attendanceLogs = attRes.data?.attendance || [];
      let employees = empRes.data?.employees || [];

      // Filter out logged in user
      employees = employees.filter(emp => emp._id !== user?.employeeId && emp.userId?._id !== user?._id);

      // Manager scope filter
      if (isManager && managerDeptId) {
        employees = employees.filter(emp => {
          const dept = emp.departmentId?._id || emp.departmentId;
          return dept === managerDeptId;
        });
      }

      // Map employees to their attendance records
      return employees.map(emp => {
        const record = attendanceLogs.find(log => (log.employeeId?._id === emp._id) || (log.employeeId === emp._id));
        return {
          employee: emp,
          attendanceRecord: record || null,
          status: record?.status || "no_punch",
        };
      });
    }
  });

  const handleEditRecord = (item) => {
    navigation.navigate("EmployeeAttendanceCalendar", {
      employee: item.employee,
    });
  };

  const filteredRoster = roster.filter((item) => {
    if (!searchText) return true;
    const name = `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase();
    return name.includes(searchText.toLowerCase());
  });

  const inCount = filteredRoster.filter(r => r.status === "present" || r.status === "late" || r.status === "half_day").length;
  const outCount = filteredRoster.filter(r => r.status === "absent").length;
  const noPunchCount = filteredRoster.filter(r => r.status === "no_punch").length;
  const totalStaffCount = filteredRoster.length;

  const AVATAR_COLORS = ["#EF4444", "#8B5CF6", "#F59E0B", "#0EA5E9", "#10B981", "#EC4899", "#F97316"];
  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const renderRosterCard = ({ item }) => {
    const fullName = `${item.employee.firstName} ${item.employee.lastName}`;
    const initial = item.employee.firstName ? item.employee.firstName.charAt(0).toUpperCase() : "E";
    const avatarColor = getAvatarColor(fullName);
    
    const roleText = item.employee.designationId?.name || (item.employee.userId?.role || "Team Member");
    
    const record = item.attendanceRecord;
    const inTime = record?.punchInTime
      ? new Date(record.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--:--";
    const outTime = record?.punchOutTime
      ? new Date(record.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--:--";

    let statusText = "No Punch";
    let statusColor = "#EF4444";
    let statusBg = "#FEF2F2";
    let statusBorder = "#FCA5A5";

    if (item.status === "present") {
      statusText = "Present";
      statusColor = "#10B981";
      statusBg = "#ECFDF5";
      statusBorder = "#A7F3D0";
    } else if (item.status === "late" || item.status === "half_day") {
      statusText = item.status === "late" ? "Late In" : "Half Day";
      statusColor = "#F59E0B";
      statusBg = "#FFFBEB";
      statusBorder = "#FDE68A";
    } else if (item.status === "absent") {
      statusText = "Absent";
      statusColor = "#EF4444";
      statusBg = "#FEF2F2";
      statusBorder = "#FCA5A5";
    }

    return (
      <TouchableOpacity 
        style={styles.rosterCard} 
        onPress={() => handleEditRecord(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.rosterInfo}>
          <Text style={styles.rosterName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.rosterRole} numberOfLines={1}>{roleText}</Text>
        </View>

        <View style={styles.rosterRightBlock}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>

          <View style={styles.rosterTimesRow}>
            <Text style={styles.timeText}>In: {inTime}</Text>
            <Text style={styles.timeDivider}>|</Text>
            <Text style={styles.timeText}>Out: {outTime}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <CompanyAdminLayout navigation={navigation} activeTab="Attendance" showSearch={false} headerTitle="Staff Attendance" hideBottomNav={true}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.container}>
        {/* Top Dark Hero Banner */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={styles.topBanner}
        >
          <View style={styles.bannerHeader}>
            <View style={styles.bannerLocation}>
              <View style={styles.locationAvatar}>
                <Ionicons name="business" size={14} color="#FFFFFF" />
              </View>

              <View>
                <Text style={styles.locationText}>{user?.companyName || "Main Branch (HQ)"}</Text>
                <Text style={styles.bannerSubtext}>Today: {new Date(filterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => refetch()} activeOpacity={0.7} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Metrics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#10B981" }]}>{inCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#3B82F6" }]}>{outCount}</Text>
              <Text style={styles.statLabel}>On Leave</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#EF4444" }]}>{noPunchCount}</Text>
              <Text style={styles.statLabel}>No Punch</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.primary }]}>{totalStaffCount}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Action Shortcuts Row */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity 
            style={styles.shortcutBtn} 
            onPress={() => navigation.navigate("CompanyReportsDashboard")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.shortcutText}>Work Report</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shortcutBtn} 
            onPress={() => navigation.navigate("RegularizationApproval")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
            </View>
            <Text style={styles.shortcutText}>Regularize</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shortcutBtn} 
            onPress={() => navigation.navigate("LeaveRequests")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.shortcutText}>Leave Appr.</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.shortcutBtn} 
            onPress={() => navigation.navigate("CompanyReportsDashboard")}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconBox, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="bar-chart-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.shortcutText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee by name..."
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <FlatList
            data={filteredRoster}
            keyExtractor={(item) => item.employee._id}
            renderItem={renderRosterCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={42} color="#CBD5E1" />
                <Text style={styles.emptyText}>No employee records found</Text>
              </View>
            }
          />
        )}
      </View>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBanner: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...SHADOWS.sm,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bannerLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationText: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  bannerSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    textTransform: "uppercase",
  },
  statSep: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  shortcutsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 8,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  shortcutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  shortcutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    color: COLORS.darkNavy,
  },
  searchSection: {
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.darkNavy,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  rosterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  rosterInfo: {
    flex: 1,
    marginRight: 8,
  },
  rosterName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  rosterRole: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  rosterRightBlock: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
  },
  rosterTimesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    color: COLORS.text.muted,
  },
  timeDivider: {
    fontSize: 10,
    color: "#CBD5E1",
    marginHorizontal: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
    marginTop: 8,
  },
});

export default HRManageAttendanceScreen;
