import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";

const { width } = Dimensions.get("window");
const CALENDAR_PADDING = 12;
const CELL_WIDTH = (width - CALENDAR_PADDING * 2 - 32) / 7;

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const ManagerTeamAttendanceDetailsScreen = ({ route, navigation }) => {
  const { employeeId, employeeName } = route.params || {};
  const { getTeamMemberMonthlyAttendance } = useManagerController();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const data = await getTeamMemberMonthlyAttendance(employeeId, currentMonth, currentYear);
    setMonthlyData(data || []);

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [employeeId, currentMonth, currentYear, getTeamMemberMonthlyAttendance]);

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [fetchAttendance])
  );

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Status Colors
  const getStatusColor = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#16a34a"; // Green
      case "half_day":
        return "#ca8a04"; // Yellow
      case "absent":
        return "#dc2626"; // Red
      case "paid_leave":
        return "#2563eb"; // Blue
      case "unpaid_leave":
        return "#db2777"; // Pink
      default:
        return "#94a3b8"; // Gray
    }
  };

  const getStatusPastel = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#dcfce7";
      case "half_day":
        return "#fef3c7";
      case "absent":
        return "#fee2e2";
      case "paid_leave":
        return "#eff6ff";
      case "unpaid_leave":
        return "#fdf2f8";
      default:
        return "#f1f5f9";
    }
  };

  const renderCalendar = () => {
    // Basic calendar rendering
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
    const startOffset = firstDayDate.getDay();

    const calendarGrid = [];

    // Pads
    for (let i = 0; i < startOffset; i++) {
      calendarGrid.push(<View key={`pad-${i}`} style={styles.calendarDayPad} />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const record = monthlyData.find((r) => r.date === dateStr);
      
      const pastelBg = record?.status ? getStatusPastel(record.status) : "#fff";
      const textColor = record?.status ? getStatusColor(record.status) : "#64748b";
      
      calendarGrid.push(
        <View
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            { backgroundColor: pastelBg },
          ]}
        >
          <Text style={[styles.calendarDayText, { color: textColor }]}>
            {d}
          </Text>
        </View>
      );
    }

    return <View style={styles.calendarGridContainer}>{calendarGrid}</View>;
  };

  return (
    <ManagerLayout navigation={navigation} title="Member Attendance">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{employeeName || "Team Member"}</Text>
      </View>

      <View style={styles.dateSelectorPanel}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={20} color={TEAL} />
        </TouchableOpacity>
        <Text style={styles.monthHeading}>
          {new Date(currentYear, currentMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAttendance(true)} colors={[TEAL]} />}
      >
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        ) : (
          <AppCard style={styles.card}>
            <View style={styles.calendarHeaderRow}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <Text key={day} style={styles.calendarHeaderDay}>{day}</Text>
              ))}
            </View>
            {renderCalendar()}
          </AppCard>
        )}
      </ScrollView>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  dateSelectorPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: TEAL_LIGHT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccfbf1",
  },
  monthArrow: { padding: 4 },
  monthHeading: { fontSize: 15, fontWeight: "700", color: TEAL },

  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },
  
  card: { padding: CALENDAR_PADDING, backgroundColor: "#fff" },
  calendarHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  calendarHeaderDay: { width: CELL_WIDTH, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#94a3b8" },
  
  calendarGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  calendarDayPad: { width: CELL_WIDTH, height: 44, marginBottom: 8 },
  calendarDayCell: { width: CELL_WIDTH, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 8, marginBottom: 8 },
  calendarDayText: { fontSize: 14, fontWeight: "700" },
});

export default ManagerTeamAttendanceDetailsScreen;
