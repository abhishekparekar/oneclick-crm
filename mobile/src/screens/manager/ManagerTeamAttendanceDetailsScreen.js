import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
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
const TEAL_LIGHT = "#fff7ed";
const BORDER = "#e2e8f0";

const ManagerTeamAttendanceDetailsScreen = ({ route, navigation }) => {
  const { employeeId, employeeName } = route.params || {};
  const { getTeamMemberMonthlyAttendance } = useManagerController();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);

  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const data = await getTeamMemberMonthlyAttendance(employeeId, currentMonth, currentYear);
    setMonthlyData(Array.isArray(data) ? data : data?.days || []);

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

  // Calculate Monthly Summary Stats
  const summary = useMemo(() => {
    let present = 0, late = 0, absent = 0, halfDays = 0, leaves = 0, holidays = 0;
    (monthlyData || []).forEach((r) => {
      const st = (r.status || "").toLowerCase();
      if (st === "present") present++;
      else if (st === "late") late++;
      else if (st === "absent") absent++;
      else if (st === "half_day") halfDays++;
      else if (st.includes("leave")) leaves++;
      else if (st === "holiday" || st === "weekly_off") holidays++;
    });
    return { present, late, absent, halfDays, leaves, holidays };
  }, [monthlyData]);

  // Status Colors
  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#16a34a"; // Green
      case "late":
        return "#d97706"; // Amber
      case "half_day":
        return "#7c3aed"; // Purple
      case "absent":
        return "#dc2626"; // Red
      case "paid_leave":
      case "unpaid_leave":
      case "leave":
        return "#2563eb"; // Blue
      default:
        return "#64748b"; // Gray
    }
  };

  const getStatusPastel = (status) => {
    switch (status) {
      case "present":
        return "#dcfce7";
      case "late":
        return "#fef3c7";
      case "half_day":
        return "#f3e8ff";
      case "absent":
        return "#fee2e2";
      case "paid_leave":
      case "unpaid_leave":
      case "leave":
        return "#eff6ff";
      default:
        return "#f1f5f9";
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "--:--";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "--:--";
    }
  };

  const renderCalendar = () => {
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
      const record = monthlyData.find((r) => r.date === dateStr || r.day === d);
      
      const pastelBg = record?.status ? getStatusPastel(record.status) : "#fff";
      const textColor = record?.status ? getStatusColor(record.status) : "#64748b";
      
      calendarGrid.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            { backgroundColor: pastelBg },
          ]}
          onPress={() => setSelectedDayRecord(record || { date: dateStr, day: d, status: "unmarked" })}
          activeOpacity={0.7}
        >
          <Text style={[styles.calendarDayText, { color: textColor }]}>
            {d}
          </Text>
          {record?.status && (
            <View style={[styles.calendarDayDot, { backgroundColor: textColor }]} />
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.calendarGridContainer}>{calendarGrid}</View>;
  };

  return (
    <ManagerLayout navigation={navigation} title={employeeName || "Member Attendance"}>
      {/* Month Selector Bar */}
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
        {/* ── Monthly Overview Summary (Overview of Present, Absent, Late days) ── */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Text style={[styles.overviewVal, { color: "#16A34A" }]}>{summary.present}</Text>
            <Text style={styles.overviewLbl}>Present</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
            <Text style={[styles.overviewVal, { color: "#D97706" }]}>{summary.late}</Text>
            <Text style={styles.overviewLbl}>Late</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Text style={[styles.overviewVal, { color: "#DC2626" }]}>{summary.absent}</Text>
            <Text style={styles.overviewLbl}>Absent</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }]}>
            <Text style={[styles.overviewVal, { color: "#7C3AED" }]}>{summary.halfDays}</Text>
            <Text style={styles.overviewLbl}>Half Day</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Text style={[styles.overviewVal, { color: "#2563EB" }]}>{summary.leaves}</Text>
            <Text style={styles.overviewLbl}>Leave</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={{ marginTop: 10, fontSize: 13, color: "#64748B" }}>Loading attendance...</Text>
          </View>
        ) : (
          <>
            <AppCard style={styles.card}>
              <View style={styles.calendarHeaderRow}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <Text key={day} style={styles.calendarHeaderDay}>{day}</Text>
                ))}
              </View>
              {renderCalendar()}
            </AppCard>

            {/* Legend */}
            <AppCard style={styles.legendCard}>
              <Text style={styles.legendTitle}>LEGEND</Text>
              <View style={styles.legendGrid}>
                {[
                  { label: "Present", color: "#16a34a" },
                  { label: "Late",    color: "#d97706" },
                  { label: "Absent",  color: "#dc2626" },
                  { label: "Half Day",color: "#7c3aed" },
                  { label: "Leave",   color: "#2563eb" },
                  { label: "Holiday", color: "#64748b" },
                ].map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </AppCard>
          </>
        )}
      </ScrollView>

      {/* ── Day Details Inspection Modal ── */}
      <Modal visible={!!selectedDayRecord} transparent animationType="fade" onRequestClose={() => setSelectedDayRecord(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={20} color={TEAL} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Attendance Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDayRecord(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDayRecord && (
              <View style={{ marginTop: 12 }}>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalDateText}>
                    {selectedDayRecord.date ? new Date(selectedDayRecord.date).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `Day ${selectedDayRecord.day}`}
                  </Text>
                  <View style={[styles.modalBadge, { backgroundColor: getStatusPastel(selectedDayRecord.status), borderColor: getStatusColor(selectedDayRecord.status) }]}>
                    <Text style={[styles.modalBadgeText, { color: getStatusColor(selectedDayRecord.status) }]}>
                      {(selectedDayRecord.status || "UNMARKED").toUpperCase().replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatBox}>
                    <Ionicons name="log-in-outline" size={16} color="#16A34A" />
                    <Text style={styles.modalStatLbl}>Punch In</Text>
                    <Text style={styles.modalStatVal}>
                      {formatTime(selectedDayRecord.punchInTime || selectedDayRecord.inTime)}
                    </Text>
                  </View>

                  <View style={styles.modalStatBox}>
                    <Ionicons name="log-out-outline" size={16} color="#DC2626" />
                    <Text style={styles.modalStatLbl}>Punch Out</Text>
                    <Text style={styles.modalStatVal}>
                      {formatTime(selectedDayRecord.punchOutTime || selectedDayRecord.outTime)}
                    </Text>
                  </View>

                  <View style={styles.modalStatBox}>
                    <Ionicons name="time-outline" size={16} color="#2563EB" />
                    <Text style={styles.modalStatLbl}>Total Hours</Text>
                    <Text style={styles.modalStatVal}>
                      {selectedDayRecord.totalHours ? `${selectedDayRecord.totalHours} hrs` : "--"}
                    </Text>
                  </View>
                </View>

                {selectedDayRecord.remarks || selectedDayRecord.notes ? (
                  <View style={styles.modalRemarksBox}>
                    <Text style={styles.modalRemarksTitle}>Remarks / Notes:</Text>
                    <Text style={styles.modalRemarksText}>{selectedDayRecord.remarks || selectedDayRecord.notes}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: 40 },
  
  dateSelectorPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: TEAL_LIGHT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
  },
  monthArrow: { padding: 4 },
  monthHeading: { fontSize: 15, fontWeight: "800", color: TEAL },

  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 14, paddingBottom: 100 },
  
  overviewRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  overviewVal: {
    fontSize: 16,
    fontWeight: "900",
  },
  overviewLbl: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },

  card: { padding: CALENDAR_PADDING, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  calendarHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  calendarHeaderDay: { width: CELL_WIDTH, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#94a3b8" },
  
  calendarGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  calendarDayPad: { width: CELL_WIDTH, height: 44, marginBottom: 8 },
  calendarDayCell: { width: CELL_WIDTH, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, marginBottom: 8 },
  calendarDayText: { fontSize: 13, fontWeight: "800" },
  calendarDayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  legendCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  legendTitle: { fontSize: 10, fontWeight: "800", color: "#64748B", letterSpacing: 0.5, marginBottom: 8 },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: "700", color: "#475569" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  closeBtn: { padding: 4 },
  modalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalDateText: { fontSize: 13, fontWeight: "800", color: "#1E293B", flex: 1 },
  modalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBadgeText: { fontSize: 10.5, fontWeight: "800" },
  modalStatsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  modalStatLbl: { fontSize: 10, fontWeight: "700", color: "#64748B", marginTop: 4 },
  modalStatVal: { fontSize: 13, fontWeight: "800", color: "#0F172A", marginTop: 2 },
  modalRemarksBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalRemarksTitle: { fontSize: 10.5, fontWeight: "800", color: "#475569" },
  modalRemarksText: { fontSize: 12, color: "#1E293B", marginTop: 2 },
});

export default ManagerTeamAttendanceDetailsScreen;
