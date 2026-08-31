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
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";

const { width } = Dimensions.get("window");
const CALENDAR_PADDING = 12;
const CELL_WIDTH = (width - CALENDAR_PADDING * 2 - 32) / 7;

const THEME_PRIMARY = "#1268D9";
const BORDER = "#E2E8F0";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
    setMonthlyData(Array.isArray(data) ? data : data?.days || data?.attendance || []);

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

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const displayMonth = `${monthNames[currentMonth - 1]} ${currentYear}`;

  // ── Calculate Complete Monthly Stats with Accurate Absent Tracking ──
  const summary = useMemo(() => {
    let present = 0, late = 0, absent = 0, halfDays = 0, leaves = 0, holidays = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const isPastOrToday = dateObj <= todayMidnight;
      const isSunday = dateObj.getDay() === 0;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      const record = (monthlyData || []).find((r) => r.date === dateStr || (r.date && r.date.startsWith(dateStr)) || r.day === d);
      
      if (record?.status) {
        const st = record.status.toLowerCase();
        if (st === "present") present++;
        else if (st === "late") late++;
        else if (st === "absent") absent++;
        else if (st === "half_day" || st === "half-day") halfDays++;
        else if (st.includes("leave")) leaves++;
        else if (st === "holiday" || st === "weekly_off") holidays++;
      } else if (isPastOrToday && !isSunday) {
        // Past working day without punch is Absent
        absent++;
      } else if (isSunday) {
        holidays++;
      }
    }

    const paidDays = present + (halfDays * 0.5) + (late * 1);
    return { present, late, absent, halfDays, leaves, holidays, paidDays };
  }, [monthlyData, currentYear, currentMonth, daysInMonth]);

  // Status Styling
  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#10B981"; // Green
      case "late":
        return "#D97706"; // Amber
      case "half_day":
      case "half-day":
        return "#7C3AED"; // Purple
      case "absent":
        return "#EF4444"; // Red
      case "paid_leave":
      case "unpaid_leave":
      case "leave":
        return "#2563EB"; // Blue
      case "weekly_off":
      case "holiday":
        return "#64748B"; // Slate
      default:
        return "#94A3B8";
    }
  };

  const getStatusPastel = (status) => {
    switch (status) {
      case "present":
        return "#ECFDF5";
      case "late":
        return "#FFFBEB";
      case "half_day":
      case "half-day":
        return "#F5F3FF";
      case "absent":
        return "#FEF2F2";
      case "paid_leave":
      case "unpaid_leave":
      case "leave":
        return "#EFF6FF";
      case "weekly_off":
      case "holiday":
        return "#F8FAFC";
      default:
        return "#FFFFFF";
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case "present":
        return "#A7F3D0";
      case "late":
        return "#FDE68A";
      case "half_day":
      case "half-day":
        return "#DDD6FE";
      case "absent":
        return "#FECACA";
      case "paid_leave":
      case "unpaid_leave":
      case "leave":
        return "#BFDBFE";
      default:
        return "#E2E8F0";
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

  const handleDayClick = (record) => {
    setSelectedDayRecord(record);
  };

  const renderCalendar = () => {
    const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
    const startOffset = firstDayDate.getDay();
    const calendarGrid = [];

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Leading empty pads
    for (let i = 0; i < startOffset; i++) {
      calendarGrid.push(<View key={`pad-${i}`} style={styles.calendarDayPad} />);
    }

    // Days Grid
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const isPastOrToday = dateObj <= todayMidnight;
      const isSunday = dateObj.getDay() === 0;
      const isToday =
        now.getDate() === d &&
        now.getMonth() === currentMonth - 1 &&
        now.getFullYear() === currentYear;

      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rawRecord = (monthlyData || []).find((r) => r.date === dateStr || (r.date && r.date.startsWith(dateStr)) || r.day === d);

      let status = rawRecord?.status;
      if (!status) {
        if (isSunday) status = "weekly_off";
        else if (isPastOrToday) status = "absent";
        else status = "upcoming";
      }

      const effectiveRecord = rawRecord || { date: dateStr, day: d, status };
      const pastelBg = getStatusPastel(status);
      const textColor = getStatusColor(status);
      const borderColor = getStatusBorder(status);

      calendarGrid.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            { backgroundColor: pastelBg, borderColor },
            isToday && styles.todayCell,
          ]}
          onPress={() => handleDayClick(effectiveRecord)}
          activeOpacity={0.7}
        >
          <Text style={[styles.calendarDayText, { color: textColor }]}>
            {d}
          </Text>
          {status !== "upcoming" && (
            <View style={[styles.calendarDayDot, { backgroundColor: textColor }]} />
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.calendarGridContainer}>{calendarGrid}</View>;
  };

  return (
    <ManagerLayout navigation={navigation} title={employeeName || "Member Attendance"}>
      {/* ── Month Selector Bar ── */}
      <View style={styles.dateSelectorPanel}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.monthPill}>
          <Ionicons name="calendar-outline" size={16} color={THEME_PRIMARY} style={{ marginRight: 6 }} />
          <Text style={styles.monthPillText}>{displayMonth}</Text>
        </View>

        <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAttendance(true)} colors={[THEME_PRIMARY]} />}
      >
        {/* ── Monthly Overview Summary (Present, Absent, Late, Paid Days) ── */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
            <Text style={[styles.overviewVal, { color: "#10B981" }]}>{summary.present}</Text>
            <Text style={styles.overviewLbl}>Present</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Text style={[styles.overviewVal, { color: "#EF4444" }]}>{summary.absent}</Text>
            <Text style={styles.overviewLbl}>Absent</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
            <Text style={[styles.overviewVal, { color: "#D97706" }]}>{summary.halfDays + summary.late}</Text>
            <Text style={styles.overviewLbl}>Half / Late</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Text style={[styles.overviewVal, { color: "#2563EB" }]}>{summary.leaves}</Text>
            <Text style={styles.overviewLbl}>Leave</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }]}>
            <Text style={[styles.overviewVal, { color: "#0F172A" }]}>{summary.paidDays}</Text>
            <Text style={styles.overviewLbl}>Paid Days</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME_PRIMARY} />
            <Text style={{ marginTop: 10, fontSize: 13, color: "#64748B" }}>Loading attendance records...</Text>
          </View>
        ) : (
          <>
            {/* ── Calendar Card ── */}
            <AppCard style={styles.card}>
              <View style={styles.calendarHeaderRow}>
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, idx) => (
                  <Text
                    key={day}
                    style={[
                      styles.calendarHeaderDay,
                      (idx === 0 || idx === 6) && { color: "#EF4444" },
                    ]}
                  >
                    {day}
                  </Text>
                ))}
              </View>
              {renderCalendar()}
            </AppCard>

            {/* ── Legend ── */}
            <AppCard style={styles.legendCard}>
              <Text style={styles.legendTitle}>ATTENDANCE LEGEND</Text>
              <View style={styles.legendGrid}>
                {[
                  { label: "Present", color: "#10B981" },
                  { label: "Absent", color: "#EF4444" },
                  { label: "Half Day / Late", color: "#D97706" },
                  { label: "Leave", color: "#2563EB" },
                  { label: "Sunday / Off", color: "#64748B" },
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
                <Ionicons name="calendar" size={18} color={THEME_PRIMARY} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Daily Attendance Detail</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDayRecord(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDayRecord && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalDateText}>
                    {selectedDayRecord.date
                      ? new Date(selectedDayRecord.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : `Day ${selectedDayRecord.day}`}
                  </Text>
                  <View
                    style={[
                      styles.modalBadge,
                      {
                        backgroundColor: getStatusPastel(selectedDayRecord.status),
                        borderColor: getStatusBorder(selectedDayRecord.status),
                      },
                    ]}
                  >
                    <Text style={[styles.modalBadgeText, { color: getStatusColor(selectedDayRecord.status) }]}>
                      {(selectedDayRecord.status || "UNMARKED").toUpperCase().replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatBox}>
                    <Ionicons name="log-in-outline" size={18} color="#10B981" />
                    <Text style={styles.modalStatLbl}>Punch In</Text>
                    <Text style={styles.modalStatVal}>
                      {formatTime(selectedDayRecord.punchInTime || selectedDayRecord.inTime)}
                    </Text>
                  </View>

                  <View style={styles.modalStatBox}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    <Text style={styles.modalStatLbl}>Punch Out</Text>
                    <Text style={styles.modalStatVal}>
                      {formatTime(selectedDayRecord.punchOutTime || selectedDayRecord.outTime)}
                    </Text>
                  </View>

                  <View style={styles.modalStatBox}>
                    <Ionicons name="time-outline" size={18} color="#2563EB" />
                    <Text style={styles.modalStatLbl}>Total Hours</Text>
                    <Text style={styles.modalStatVal}>
                      {selectedDayRecord.totalHours ? `${selectedDayRecord.totalHours} hrs` : "--"}
                    </Text>
                  </View>
                </View>

                {selectedDayRecord.punchInLocation && (
                  <View style={styles.modalLocationBox}>
                    <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.modalLocationText}>
                      GPS: {selectedDayRecord.punchInLocation.latitude ? `${selectedDayRecord.punchInLocation.latitude.toFixed(4)}, ${selectedDayRecord.punchInLocation.longitude.toFixed(4)}` : "Recorded"}
                    </Text>
                  </View>
                )}

                {selectedDayRecord.remarks || selectedDayRecord.notes ? (
                  <View style={styles.modalRemarksBox}>
                    <Text style={styles.modalRemarksTitle}>Remarks / Notes:</Text>
                    <Text style={styles.modalRemarksText}>{selectedDayRecord.remarks || selectedDayRecord.notes}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.modalFullDetailsBtn}
                  onPress={() => {
                    const rec = selectedDayRecord;
                    setSelectedDayRecord(null);
                    navigation.navigate("AttendanceDetails", {
                      date: rec.date,
                      employeeId,
                      employeeName,
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalFullDetailsBtnText}>View Full Attendance Record</Text>
                </TouchableOpacity>
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
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  monthArrow: { padding: 8, borderRadius: 8, backgroundColor: "#F8FAFC" },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  monthPillText: { fontSize: 13.5, fontWeight: "900", color: THEME_PRIMARY },

  scroll: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 14, paddingBottom: 110 },
  
  overviewRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  overviewVal: {
    fontSize: 16,
    fontWeight: "900",
  },
  overviewLbl: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    marginTop: 1,
  },

  card: { padding: CALENDAR_PADDING, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  calendarHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  calendarHeaderDay: { width: CELL_WIDTH, textAlign: "center", fontSize: 10.5, fontWeight: "900", color: "#64748B" },
  
  calendarGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  calendarDayPad: { width: CELL_WIDTH, height: 44, marginBottom: 8 },
  calendarDayCell: {
    width: CELL_WIDTH,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  calendarDayText: { fontSize: 13, fontWeight: "800" },
  calendarDayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  todayCell: { borderWidth: 2, borderColor: THEME_PRIMARY },

  legendCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  legendTitle: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 0.5, marginBottom: 8 },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: "700", color: "#475569" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
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
  modalTitle: { fontSize: 14.5, fontWeight: "900", color: "#0F172A" },
  closeBtn: { padding: 4 },
  modalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalDateText: { fontSize: 12.5, fontWeight: "800", color: "#1E293B", flex: 1 },
  modalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBadgeText: { fontSize: 10.5, fontWeight: "900" },
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
  modalStatLbl: { fontSize: 9.5, fontWeight: "700", color: "#64748B", marginTop: 4 },
  modalStatVal: { fontSize: 12.5, fontWeight: "900", color: "#0F172A", marginTop: 2 },
  modalLocationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalLocationText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  modalRemarksBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalRemarksTitle: { fontSize: 10.5, fontWeight: "800", color: "#475569" },
  modalRemarksText: { fontSize: 12, color: "#1E293B", marginTop: 2 },
  modalFullDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  modalFullDetailsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default ManagerTeamAttendanceDetailsScreen;
