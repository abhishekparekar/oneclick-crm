import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getMyMonthlyApi } from "../../api/attendanceService";

const { width } = Dimensions.get("window");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_PADDING = 12;

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EmployeeMonthlyAttendanceScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);

  // Month Picker State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchMonthlyData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: res } = await getMyMonthlyApi({
        month: currentMonth,
        year: currentYear,
      });

      if (res && res.success) {
        setMonthlyData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch monthly attendance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMonthlyData();
    }, [currentMonth, currentYear])
  );

  const handleRefresh = () => fetchMonthlyData(true);

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

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#16a34a"; // Green
      case "half-day":
      case "half_day":
        return "#eab308"; // Yellow
      case "absent":
        return "#ef4444"; // Red
      case "paid_leave":
        return "#3b82f6"; // Blue
      case "unpaid_leave":
        return "#ec4899"; // Pink
      case "holiday":
      case "weekly_off":
        return "#64748b"; // Gray for rest days
      default:
        return "#cbd5e1"; // Silver for unmarked/future days
    }
  };

  const getStatusPastel = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#f0fdf4"; // Soft green
      case "half-day":
      case "half_day":
        return "#fefde8"; // Soft yellow
      case "absent":
        return "#fef2f2"; // Soft red
      case "paid_leave":
        return "#eff6ff"; // Soft blue
      case "unpaid_leave":
        return "#fdf2f8"; // Soft pink
      case "holiday":
      case "weekly_off":
        return "#f8fafc"; // Soft slate/grey
      default:
        return "#ffffff"; // White for unmarked/future
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#15803d"; // Dark green
      case "half-day":
      case "half_day":
        return "#a16207"; // Dark gold
      case "absent":
        return "#b91c1c"; // Dark red
      case "paid_leave":
        return "#1d4ed8"; // Dark blue
      case "unpaid_leave":
        return "#be185d"; // Dark pink
      case "holiday":
      case "weekly_off":
        return "#334155"; // Dark slate
      default:
        return "#64748b"; // slate for unmarked
    }
  };

  const getDayCellStyle = (status, isToday, isFuture) => {
    switch (status) {
      case "present":
        return { bg: "#10b981", text: "#ffffff", border: "#10b981" };
      case "late":
        return { bg: "#f59e0b", text: "#ffffff", border: "#f59e0b" };
      case "half-day":
      case "half_day":
        return { bg: "#eab308", text: "#ffffff", border: "#eab308" };
      case "absent":
        return { bg: "#ef4444", text: "#ffffff", border: "#ef4444" };
      case "paid_leave":
        return { bg: "#3b82f6", text: "#ffffff", border: "#3b82f6" };
      case "unpaid_leave":
        return { bg: "#ec4899", text: "#ffffff", border: "#ec4899" };
      case "holiday":
        return { bg: "#8b5cf6", text: "#ffffff", border: "#8b5cf6" };
      case "weekly_off":
        return { bg: "#94a3b8", text: "#ffffff", border: "#94a3b8" };
      default:
        return {
          bg: isToday ? "#e0e7ff" : "#f1f5f9",
          text: isToday ? "#1d4ed8" : (isFuture ? "#94a3b8" : "#334155"),
          border: isToday ? "#3b82f6" : "#e2e8f0",
        };
    }
  };

  const renderCalendar = () => {
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
    const startOffset = firstDayDate.getDay();
    const todayStr = getLocalDateString();

    const dataMap = new Map();
    if (monthlyData?.days && Array.isArray(monthlyData.days)) {
      monthlyData.days.forEach((d) => {
        if (d.day) dataMap.set(Number(d.day), d);
        if (d.date) dataMap.set(d.date, d);
      });
    }

    const calendarGrid = [];

    // Push empty offset pads
    for (let i = 0; i < startOffset; i++) {
      calendarGrid.push(<View key={`pad-${i}`} style={styles.dayCellWrapper} />);
    }

    // Always render all days in the month (1 to totalDaysInMonth)
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayData = dataMap.get(dayNum) || dataMap.get(dateStr);
      const status = dayData?.status || "";
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const cellStyle = getDayCellStyle(status, isToday, isFuture);

      calendarGrid.push(
        <TouchableOpacity
          key={`day-${dayNum}`}
          onPress={() => {
            navigation.navigate("AttendanceDetails", { date: dateStr });
          }}
          style={styles.dayCellWrapper}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.calendarDayCell,
              { backgroundColor: cellStyle.bg, borderColor: cellStyle.border, borderWidth: isToday ? 2 : 1 },
              isToday && styles.todayCell,
            ]}
          >
            <Text style={[styles.calendarDayText, { color: cellStyle.text }]}>
              {dayNum}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return <View style={styles.calendarGridContainer}>{calendarGrid}</View>;
  };

  const summary = monthlyData?.summary || { present: 0, late: 0, absent: 0, halfDays: 0 };

  return (
    <EmployeeLayout navigation={navigation} title="Attendance Calendar">
      <View style={styles.container}>
        {/* Month Selector Banner */}
        <View style={styles.dateSelectorPanel}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.monthHeading}>
            {new Date(currentYear, currentMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loaderText}>Assembling Calendar Grid...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {/* Calendar Container (No Card) */}
            <View style={styles.calendarContainer}>
              {/* Weekday Labels row */}
              <View style={styles.weekdaysHeaderRow}>
                {WEEKDAYS.map((day, idx) => (
                  <Text key={idx} style={[styles.weekdayLabel, idx === 0 && styles.sundayLabel]}>{day}</Text>
                ))}
              </View>

              {/* Day Grid */}
              {renderCalendar()}
            </View>



            {/* Summary statistics summary */}
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle}>Month Summary Stats</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: "#16a34a" }]}>{summary.present || 0}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: "#d97706" }]}>{summary.late || 0}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: "#dc2626" }]}>{summary.absent || 0}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: "#7c3aed" }]}>{summary.halfDays ?? summary.halfDay ?? 0}</Text>
                <Text style={styles.statLabel}>Half Day</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  dateSelectorPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  monthArrow: {
    padding: 6,
  },
  monthHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  loaderText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  calendarContainer: {
    paddingTop: 10,
    marginBottom: 16,
  },
  weekdaysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  weekdayLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  sundayLabel: {
    color: "#ef4444", // bold Red for Sun
  },
  calendarGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },
  dayCellWrapper: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  todayCell: {
    borderColor: "#1b2a47",
    borderWidth: 2,
  },

  summaryTitleRow: {
    marginTop: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
});

export default EmployeeMonthlyAttendanceScreen;
