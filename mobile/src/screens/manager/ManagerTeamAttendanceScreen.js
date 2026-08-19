import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "0 hr 0 min";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

const StatusBadge = ({ status }) => {
  const map = {
    present: { bg: "#dcfce7", text: "#16a34a" },
    late: { bg: "#ffedd5", text: "#ea580c" },
    absent: { bg: "#fee2e2", text: "#dc2626" },
    half_day: { bg: "#fef3c7", text: "#d97706" },
    "half-day": { bg: "#fef3c7", text: "#d97706" },
    paid_leave: { bg: "#eff6ff", text: "#2563eb" },
    unpaid_leave: { bg: "#fdf2f8", text: "#db2777" },
    holiday: { bg: "#f8fafc", text: "#475569" },
    weekly_off: { bg: "#f8fafc", text: "#475569" },
  };
  const style = map[status?.toLowerCase()] || { bg: "#f1f5f9", text: "#94a3b8" };
  const text = status ? status.replace(/_/g, " ").toUpperCase() : "UNMARKED";
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{text}</Text>
    </View>
  );
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
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const manager = dashboardData?.manager || {};

  const departmentsList = React.useMemo(() => {
    if (!manager.departmentId && (!manager.accessibleDepartments || manager.accessibleDepartments.length === 0)) {
      return [];
    }
    const list = [];
    if (manager.departmentId) {
      list.push({
        _id: manager.departmentId._id || manager.departmentId,
        name: manager.department || "My Department"
      });
    }
    if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
      manager.accessibleDepartments.forEach(d => {
        const id = typeof d === "object" ? d._id : d;
        const name = typeof d === "object" ? d.name : "Accessible Dept";
        if (id && !list.map(x => x._id.toString()).includes(id.toString())) {
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
      departmentId: selectedDeptId || undefined
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

  const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }) => {
    const { employee, attendance } = item;
    const formatTime = (iso) => {
      if (!iso) return "--:--";
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("ManagerStack", {
            screen: "ManagerTeamAttendanceDetails",
            params: { employeeId: employee._id, employeeName: employee.fullName },
          })
        }
      >
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            {employee.photo ? (
              <Image source={{ uri: employee.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{getInitials(employee.fullName)}</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{employee.fullName}</Text>
              <Text style={styles.cardSub}>{employee.employeeCode} · {employee.designationId?.name}</Text>
            </View>
            <View style={styles.statusCol}>
              <StatusBadge status={attendance?.status} />
            </View>
          </View>
          <View style={styles.timeStrip}>
            <View style={styles.timeCol}>
              <Text style={styles.timeLab}>PUNCH IN</Text>
              <Text style={styles.timeVal}>{formatTime(attendance?.punchInTime)}</Text>
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.timeLab}>PUNCH OUT</Text>
              <Text style={styles.timeVal}>{formatTime(attendance?.punchOutTime)}</Text>
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.timeLab}>TOTAL</Text>
              <Text style={[styles.timeVal, { color: TEAL }]}>{attendance?.totalHours ? formatWorkingHours(attendance.totalHours) : "0 hr 0 min"}</Text>
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="Team Attendance">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Attendance</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search team..."
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Department Scoping Filter Bar */}
        {departmentsList.length > 1 && (
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => setSelectedDeptId("")}
                style={[styles.filterPill, selectedDeptId === "" && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, selectedDeptId === "" && styles.filterPillTextActive]}>
                  All Departments
                </Text>
              </TouchableOpacity>
              {departmentsList.map((dept) => {
                const isActive = selectedDeptId === dept._id;
                return (
                  <TouchableOpacity
                    key={dept._id}
                    onPress={() => setSelectedDeptId(dept._id)}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {loadingTeamAttendance && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading attendance...</Text>
          </View>
        ) : teamAttendanceData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySub}>No team attendance records match your search criteria.</Text>
          </View>
        ) : (
          <FlatList
            data={teamAttendanceData}
            keyExtractor={(item) => item.employee._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[TEAL]} />}
          />
        )}
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },
  container: {
    flex: 1,
  },
  filterBar: {
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  container: { flex: 1, backgroundColor: "#f8fafc" },
  
  searchWrap: { padding: 16, paddingBottom: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#0f172a" },
  clearBtn: { padding: 4 },

  listContent: { padding: 16, paddingBottom: 40 },

  card: { padding: 0, marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL_LIGHT, marginRight: 12 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12, borderWidth: 1, borderColor: "#ccfbf1" },
  avatarFallbackText: { color: TEAL, fontSize: 14, fontWeight: "800" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "750", color: "#0f172a" },
  cardSub: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  statusCol: { alignItems: "flex-end" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  timeStrip: { flexDirection: "row", paddingVertical: 10, backgroundColor: "#f8fafc" },
  timeCol: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: "#f1f5f9" },
  timeLab: { fontSize: 9, fontWeight: "700", color: "#94a3b8", marginBottom: 2 },
  timeVal: { fontSize: 12, fontWeight: "700", color: "#0f172a" },

  emptyCard: { margin: 16, alignItems: "center", padding: 32, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6 },
});

export default ManagerTeamAttendanceScreen;
