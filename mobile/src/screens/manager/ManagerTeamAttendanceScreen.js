import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import AttendanceDatePickerModal from "../../components/AttendanceDatePickerModal";
import { COLORS, SHADOWS, ROUNDING, FONTS } from "../../theme/tokens";

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AVATAR_COLORS = [
  "#EF4444",
  "#8B5CF6",
  "#F59E0B",
  "#0EA5E9",
  "#10B981",
  "#EC4899",
  "#F97316",
];

const getAvatarColor = (name) => {
  let hash = 0;
  const str = name || "Employee";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const ManagerTeamAttendanceScreen = ({ navigation }) => {
  const {
    teamAttendanceData,
    loadingTeamAttendance,
    getTeamAttendanceList,
    dashboardData,
  } = useManagerController();

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" means all

  // Today by default
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const manager = dashboardData?.manager || {};

  const departmentsList = useMemo(() => {
    if (!manager.departmentId && (!manager.accessibleDepartments || manager.accessibleDepartments.length === 0)) {
      return [];
    }
    const list = [];
    if (manager.departmentId) {
      list.push({
        _id: manager.departmentId._id || manager.departmentId,
        name: manager.department || "My Department",
      });
    }
    if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
      manager.accessibleDepartments.forEach((d) => {
        const id = typeof d === "object" ? d._id : d;
        const name = typeof d === "object" ? d.name : "Accessible Dept";
        if (id && !list.map((x) => x._id.toString()).includes(id.toString())) {
          list.push({ _id: id, name });
        }
      });
    }
    return list;
  }, [manager]);

  const loadData = useCallback(async (force = false) => {
    await getTeamAttendanceList({ 
      date: selectedDate, 
      search: debouncedSearch, 
      status: statusFilter,
      departmentId: selectedDeptId || undefined,
    }, force);
  }, [selectedDate, debouncedSearch, statusFilter, selectedDeptId, getTeamAttendanceList]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Metrics summary matching Admin Screen
  const inCount = teamAttendanceData.filter((i) => {
    const s = i.attendance?.status?.toLowerCase();
    return s === "present" || s === "late" || s === "half_day" || s === "half-day";
  }).length;

  const leaveCount = teamAttendanceData.filter((i) => {
    const s = i.attendance?.status?.toLowerCase();
    return s && s.includes("leave");
  }).length;

  const noPunchCount = teamAttendanceData.filter((i) => {
    const s = i.attendance?.status?.toLowerCase();
    return !s || s === "absent" || s === "no_punch";
  }).length;

  const totalStaffCount = teamAttendanceData.length;

  const renderItem = ({ item }) => {
    const { employee, attendance } = item;
    const fullName = employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
    const initial = fullName ? fullName.charAt(0).toUpperCase() : "E";
    const avatarColor = getAvatarColor(fullName);
    const roleText = employee.designationId?.name || employee.employeeCode || "Team Member";

    const formatTime = (iso) => {
      if (!iso) return "--:--";
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const inTime = formatTime(attendance?.punchInTime);
    const outTime = formatTime(attendance?.punchOutTime);

    let statusText = "No Punch";
    let statusColor = "#EF4444";
    let statusBg = "#FEF2F2";
    let statusBorder = "#FCA5A5";

    const s = attendance?.status?.toLowerCase();
    if (s === "present") {
      statusText = "Present";
      statusColor = "#10B981";
      statusBg = "#ECFDF5";
      statusBorder = "#A7F3D0";
    } else if (s === "late" || s === "half_day" || s === "half-day") {
      statusText = s === "late" ? "Late In" : "Half Day";
      statusColor = "#F59E0B";
      statusBg = "#FFFBEB";
      statusBorder = "#FDE68A";
    } else if (s && s.includes("leave")) {
      statusText = s.includes("unpaid") ? "Unpaid Leave" : "On Leave";
      statusColor = "#2563EB";
      statusBg = "#EFF6FF";
      statusBorder = "#BFDBFE";
    } else if (s === "absent") {
      statusText = "Absent";
      statusColor = "#EF4444";
      statusBg = "#FEF2F2";
      statusBorder = "#FCA5A5";
    }

    return (
      <TouchableOpacity
        style={styles.rosterCard}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("ManagerStack", {
            screen: "ManagerTeamAttendanceDetails",
            params: { employeeId: employee._id, employeeName: fullName },
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.rosterInfo}>
          <Text style={styles.rosterName} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.rosterRole} numberOfLines={1}>
            {roleText}
          </Text>
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

          <TouchableOpacity
            style={styles.openMapBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              navigation.navigate("EmployeeLocationTracking", {
                employeeId: employee._id,
                employeeName: fullName,
                date: selectedDate,
                viewMode: "trail",
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={12} color="#1268D9" style={{ marginRight: 4 }} />
            <Text style={styles.openMapBtnText}>Open Map</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="Team Attendance" showBack={true}>
      <View style={styles.container}>
        {/* Top Royal Blue Hero Banner - Identical to Admin Screen */}
        <LinearGradient
          colors={["#082B52", "#1268D9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topBanner}
        >
          <View style={styles.bannerHeader}>
            <View style={styles.bannerLocation}>
              <View style={styles.locationAvatar}>
                <Ionicons name="business" size={14} color="#FFFFFF" />
              </View>

              <View>
                <Text style={styles.locationText}>
                  {manager.department || "My Team"}
                </Text>
                <TouchableOpacity
                  onPress={() => setCalendarModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bannerSubtext}>
                    {selectedDate === todayStr ? "Today: " : "Date: "}
                    {new Date(selectedDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Single Calendar Icon for Date Selection */}
              <TouchableOpacity
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.7}
                style={styles.refreshBtn}
                accessibilityLabel="Select Date"
              >
                <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRefresh}
                activeOpacity={0.7}
                style={styles.refreshBtn}
                accessibilityLabel="Refresh Attendance"
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#10B981" }]}>{inCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#93C5FD" }]}>{leaveCount}</Text>
              <Text style={styles.statLabel}>On Leave</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#FCA5A5" }]}>{noPunchCount}</Text>
              <Text style={styles.statLabel}>No Punch</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#FFFFFF" }]}>{totalStaffCount}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Department Scoping Filter Bar */}
        {departmentsList.length > 1 && (
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                onPress={() => setSelectedDeptId("")}
                style={[
                  styles.filterPill,
                  selectedDeptId === "" && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedDeptId === "" && styles.filterPillTextActive,
                  ]}
                >
                  All Departments
                </Text>
              </TouchableOpacity>
              {departmentsList.map((dept) => {
                const isActive = selectedDeptId === dept._id;
                return (
                  <TouchableOpacity
                    key={dept._id}
                    onPress={() => setSelectedDeptId(dept._id)}
                    style={[
                      styles.filterPill,
                      isActive && styles.filterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && styles.filterPillTextActive,
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Search Bar - Identical to Admin Screen */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search team member by name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loadingTeamAttendance && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1268D9" />
            <Text style={styles.loadingText}>Loading attendance records...</Text>
          </View>
        ) : teamAttendanceData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={42} color="#CBD5E1" />
            <Text style={styles.emptyText}>No team attendance records found</Text>
          </View>
        ) : (
          <FlatList
            data={teamAttendanceData}
            keyExtractor={(item) => item.employee._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#1268D9"]}
              />
            }
          />
        )}
      </View>

      {/* Date Picker Modal */}
      <AttendanceDatePickerModal
        visible={calendarModalVisible}
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate(date)}
        onClose={() => setCalendarModalVisible(false)}
      />
    </ManagerLayout>
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
  filterBar: {
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  filterPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
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
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 5,
  },
  openMapBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: "#1268D9",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#64748B",
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

export default ManagerTeamAttendanceScreen;
