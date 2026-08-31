import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";
import { regularizationRequestApi } from "../../api/attendanceService";

const { width } = Dimensions.get("window");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_PADDING = 12;
const CELL_WIDTH = (width - CALENDAR_PADDING * 2 - 32) / 7;

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "—";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

// ── Color helpers ────────────────────────────────────────────
const getStatusColor = (status) => {
  switch (status) {
    case "present":
    case "late":   return "#16a34a";
    case "half-day":
    case "half_day": return "#eab308";
    case "absent":   return "#ef4444";
    case "paid_leave": return "#3b82f6";
    case "unpaid_leave": return "#ec4899";
    case "holiday":
    case "weekly_off": return "#64748b";
    default: return "#cbd5e1";
  }
};

const getStatusPastel = (status) => {
  switch (status) {
    case "present":
    case "late":   return "#f0fdf4";
    case "half-day":
    case "half_day": return "#fefde8";
    case "absent":   return "#fef2f2";
    case "paid_leave": return "#eff6ff";
    case "unpaid_leave": return "#fdf2f8";
    case "holiday":
    case "weekly_off": return "#f8fafc";
    default: return "#ffffff";
  }
};

const getStatusTextColor = (status) => {
  switch (status) {
    case "present":
    case "late":   return "#15803d";
    case "half-day":
    case "half_day": return "#a16207";
    case "absent":   return "#b91c1c";
    case "paid_leave": return "#1d4ed8";
    case "unpaid_leave": return "#be185d";
    case "holiday":
    case "weekly_off": return "#334155";
    default: return "#64748b";
  }
};

// ─────────────────────────────────────────────────────────────
const ManagerAttendanceScreen = ({ navigation }) => {
  const { getManagerMonthlyAttendance, getManagerTodayAttendance, ownTodayAttendance } =
    useManagerController();

  const [activeTab, setActiveTab] = useState("activity");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const result = await getManagerMonthlyAttendance(currentMonth, currentYear);
      // getManagerMonthlyAttendance returns the axios res.data = { success, data: { days, summary } }
      setMonthlyData(result?.data || result || null);
      await getManagerTodayAttendance(isRefresh);
    } catch (err) {
      console.error("Manager attendance fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [currentMonth, currentYear])
  );

  const handleRefresh = () => fetchData(true);

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const [selectedDayRecord, setSelectedDayRecord] = useState(null);

  // ── Calendar Render ──────────────────────────────────────────
  const renderCalendar = () => {
    const days = monthlyData?.days || [];
    const startOffset = new Date(currentYear, currentMonth - 1, 1).getDay();
    const grid = [];

    for (let i = 0; i < startOffset; i++) {
      grid.push(<View key={`pad-${i}`} style={styles.calendarDayPad} />);
    }

    days.forEach((day, index) => {
      const isToday = day.date === getLocalDateString();
      grid.push(
        <TouchableOpacity
          key={`day-${index}`}
          onPress={() => setSelectedDayRecord(day)}
          style={[
            styles.calendarDayCell,
            { backgroundColor: getStatusPastel(day.status) },
            isToday && styles.todayCell,
            !day.status && styles.unmarkedCell,
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.calendarDayText, { color: getStatusTextColor(day.status) }]}>
            {day.day}
          </Text>
          {day.status ? (
            <View style={[styles.calendarDayDot, { backgroundColor: getStatusColor(day.status) }]} />
          ) : null}
        </TouchableOpacity>
      );
    });

    return <View style={styles.calendarGridContainer}>{grid}</View>;
  };

  // ── Punch state from today record ─────────────────────────────
  const todayRecord = ownTodayAttendance?.attendance || ownTodayAttendance || null;
  let isCurrentlyPunchedIn = false;
  let punchInTime = null;
  let punchOutTime = null;
  let totalHours = 0;
  let todayStatus = "absent";

  if (todayRecord) {
    if (todayRecord.punchLog?.length > 0) {
      const last = todayRecord.punchLog[todayRecord.punchLog.length - 1];
      if (!last.punchOutTime) isCurrentlyPunchedIn = true;
    } else if (todayRecord.punchInTime && !todayRecord.punchOutTime) {
      isCurrentlyPunchedIn = true;
    }
    punchInTime = todayRecord.punchInTime;
    punchOutTime = todayRecord.punchOutTime;
    totalHours = todayRecord.totalHours || 0;
    todayStatus = todayRecord.status || "absent";
  }

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

  const summary = monthlyData?.summary || { present: 0, absent: 0, halfDays: 0, paidLeaves: 0 };

  return (
    <ManagerLayout navigation={navigation} title="Attendance">
      <View style={styles.container}>
        {/* Month Selector — visible only on Activity tab */}
        {activeTab === "activity" && (
          <View style={styles.dateSelectorPanel}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={22} color="#C2410C" />
            </TouchableOpacity>
            <Text style={styles.monthHeading}>
              {new Date(currentYear, currentMonth - 1).toLocaleString("en-US", {
                month: "long", year: "numeric",
              })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-forward" size={22} color="#C2410C" />
            </TouchableOpacity>
          </View>
        )}

        {/* Segmented Tabs — same as Employee */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentItem, activeTab === "punch" && styles.segmentItemActive]}
            onPress={() => setActiveTab("punch")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "punch" ? "finger-print" : "finger-print-outline"}
              size={15}
              color={activeTab === "punch" ? "#C2410C" : "#64748b"}
            />
            <Text style={[styles.segmentLabel, activeTab === "punch" && styles.segmentLabelActive]}>
              Punch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentItem, activeTab === "activity" && styles.segmentItemActive]}
            onPress={() => setActiveTab("activity")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "activity" ? "calendar" : "calendar-outline"}
              size={15}
              color={activeTab === "activity" ? "#C2410C" : "#64748b"}
            />
            <Text style={[styles.segmentLabel, activeTab === "activity" && styles.segmentLabelActive]}>
              Activity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentItem, activeTab === "links" && styles.segmentItemActive]}
            onPress={() => setActiveTab("links")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === "links" ? "grid" : "grid-outline"}
              size={15}
              color={activeTab === "links" ? "#C2410C" : "#64748b"}
            />
            <Text style={[styles.segmentLabel, activeTab === "links" && styles.segmentLabelActive]}>
              More
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#C2410C" />
            <Text style={styles.loaderText}>Loading attendance data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#C2410C"]} />}
          >
            {/* ── TAB: PUNCH ───────────────────────────────── */}
            {activeTab === "punch" && (
              <View>
                <AppCard style={styles.punchCard}>
                  {/* Date */}
                  <Text style={styles.punchDateStr}>
                    {new Date().toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </Text>

                  {/* Status Badge */}
                  <View style={styles.punchStatusRow}>
                    <Text style={styles.punchStatusLabel}>TODAY'S STATUS:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusPastel(todayStatus) }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(todayStatus) }]}>
                        {todayStatus.toUpperCase().replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>

                  {/* Punch Times */}
                  <View style={styles.timeRow}>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>PUNCH IN</Text>
                      <Text style={styles.timeVal}>{formatTime(punchInTime)}</Text>
                    </View>
                    <View style={styles.timeDivider} />
                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>PUNCH OUT</Text>
                      <Text style={styles.timeVal}>{formatTime(punchOutTime)}</Text>
                    </View>
                    <View style={styles.timeDivider} />
                    <View style={styles.timeBox}>
                      <Text style={styles.timeLabel}>TOTAL HRS</Text>
                      <Text style={styles.timeVal}>{totalHours ? formatWorkingHours(totalHours) : "--"}</Text>
                    </View>
                  </View>

                  {/* Punch Button — navigates to same selfie screen as Employee */}
                  {punchInTime && punchOutTime ? (
                    <View style={styles.completedBox}>
                      <Ionicons name="checkmark-done-circle" size={32} color="#16a34a" />
                      <Text style={styles.completedText}>Attendance Completed Today</Text>
                      <Text style={styles.completedHours}>
                        Total Worked: {totalHours ? formatWorkingHours(totalHours) : "0 hr 0 min"}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.punchBtn,
                        { backgroundColor: isCurrentlyPunchedIn ? "#dc2626" : "#C2410C" },
                      ]}
                      onPress={() => navigation.navigate("CheckInCheckOut")}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={isCurrentlyPunchedIn ? "log-out-outline" : "log-in-outline"}
                        size={20}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.punchBtnText}>
                        {isCurrentlyPunchedIn ? "PUNCH OUT" : "PUNCH IN"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* View History link */}
                  <TouchableOpacity
                    style={styles.viewHistoryBtn}
                    onPress={() => setActiveTab("activity")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={15} color="#C2410C" style={{ marginRight: 5 }} />
                    <Text style={styles.viewHistoryText}>View Calendar / History</Text>
                  </TouchableOpacity>
                </AppCard>
              </View>
            )}

            {/* ── TAB: ACTIVITY (Calendar) ─────────────────── */}
            {activeTab === "activity" && (
              <View>
                {/* Calendar Card */}
                <AppCard style={styles.calendarCard}>
                  <View style={styles.weekdaysHeaderRow}>
                    {WEEKDAYS.map((d, i) => (
                      <Text key={i} style={styles.weekdayLabel}>{d}</Text>
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
                      { label: "Leave",   color: "#3b82f6" },
                      { label: "Holiday", color: "#64748b" },
                    ].map((item) => (
                      <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </AppCard>

                {/* Summary Stats */}
                <Text style={styles.summaryTitle}>Month Summary</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: "#16a34a" }]}>{summary.present || 0}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: "#dc2626" }]}>{summary.absent || 0}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: "#7c3aed" }]}>{summary.halfDays || 0}</Text>
                    <Text style={styles.statLabel}>Half Day</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: "#3b82f6" }]}>{summary.paidLeaves || 0}</Text>
                    <Text style={styles.statLabel}>Leave</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── TAB: MORE / QUICK LINKS ──────────────────── */}
            {activeTab === "links" && (
              <View>
                <Text style={styles.quickLinksTitle}>Quick Links</Text>

                <TouchableOpacity
                  style={styles.linkCard}
                  onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerMyAttendance" })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.linkIcon, { backgroundColor: "#e0f2fe" }]}>
                    <Ionicons name="calendar-outline" size={20} color="#0284c7" />
                  </View>
                  <View style={styles.linkInfo}>
                    <Text style={styles.linkTitle}>Monthly Attendance</Text>
                    <Text style={styles.linkSub}>View full monthly calendar</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkCard}
                  onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTeamAttendance" })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.linkIcon, { backgroundColor: "#ccfbf1" }]}>
                    <Ionicons name="people-outline" size={20} color="#C2410C" />
                  </View>
                  <View style={styles.linkInfo}>
                    <Text style={styles.linkTitle}>Team Attendance</Text>
                    <Text style={styles.linkSub}>Manage team punch records</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>

              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Day Details Inspection Modal ── */}
      <Modal visible={!!selectedDayRecord} transparent animationType="fade" onRequestClose={() => setSelectedDayRecord(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={20} color="#C2410C" style={{ marginRight: 8 }} />
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

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f8fafc" },
  dateSelectorPanel: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  monthArrow:   { padding: 6 },
  monthHeading: { fontSize: 16, fontWeight: "800", color: "#1e293b" },

  // Segment tabs
  segmentContainer: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  segmentItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 5, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  segmentItemActive: { borderBottomColor: "#C2410C" },
  segmentLabel:      { fontSize: 12, fontWeight: "600", color: "#64748b" },
  segmentLabelActive:{ color: "#C2410C", fontWeight: "700" },

  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  loaderText:      { fontSize: 13, color: "#64748b", marginTop: 10 },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, paddingBottom: 110 },

  // Punch tab
  punchCard: { padding: 18, marginBottom: 16 },
  punchDateStr: { fontSize: 14, fontWeight: "700", color: "#334155", marginBottom: 14 },
  punchStatusRow: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 10 },
  punchStatusLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  timeRow: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f1f5f9",
    paddingTop: 16, marginBottom: 18,
  },
  detailTimeRow: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f1f5f9",
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
    paddingVertical: 14, marginBottom: 14,
  },
  timeBox:     { flex: 1, alignItems: "center" },
  timeDivider: { width: 1, backgroundColor: "#f1f5f9" },
  timeLabel:   { fontSize: 9, color: "#94a3b8", fontWeight: "800", letterSpacing: 0.5, marginBottom: 5 },
  timeVal:     { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  punchBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 15, borderRadius: 12, marginBottom: 12,
  },
  punchBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  completedBox: {
    alignItems: "center", backgroundColor: "#f0fdf4", borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: "#bbf7d0", marginBottom: 12,
  },
  completedText:  { fontSize: 15, fontWeight: "700", color: "#16a34a", marginTop: 8 },
  completedHours: { fontSize: 12, color: "#4ade80", marginTop: 4 },
  viewHistoryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10,
  },
  viewHistoryText: { fontSize: 13, color: "#C2410C", fontWeight: "600" },

  // Calendar
  calendarCard: { padding: 10, backgroundColor: "#fff", borderRadius: 16, marginBottom: 16 },
  weekdaysHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", marginBottom: 6,
  },
  weekdayLabel: {
    width: CELL_WIDTH, textAlign: "center", fontSize: 12, fontWeight: "700", color: "#94a3b8",
  },
  calendarGridContainer: { flexDirection: "row", flexWrap: "wrap" },
  calendarDayCell: {
    width: CELL_WIDTH, height: CELL_WIDTH + 8, marginVertical: 3,
    alignItems: "center", justifyContent: "center",
    borderRadius: 10, borderWidth: 1, borderColor: "#f1f5f9",
  },
  calendarDayPad: { width: CELL_WIDTH, height: CELL_WIDTH + 8, marginVertical: 3 },
  calendarDayText: { fontSize: 13, fontWeight: "700" },
  calendarDayDot:  { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  todayCell:    { borderColor: "#C2410C", borderWidth: 2 },
  unmarkedCell: { backgroundColor: "#ffffff", borderColor: "#f1f5f9" },

  // Legend
  legendCard:  { padding: 14, backgroundColor: "#fff", borderRadius: 16, marginBottom: 16 },
  legendTitle: { fontSize: 11, fontWeight: "800", color: "#94a3b8", letterSpacing: 1, marginBottom: 10 },
  legendGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem:  { flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontSize: 12, color: "#475569", fontWeight: "600" },

  // Summary
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginBottom: 10 },
  statsRow: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statBox:  { flex: 1, alignItems: "center" },
  statVal:  { fontSize: 22, fontWeight: "800" },
  statLabel:{ fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },

  // Quick Links
  quickLinksTitle: {
    fontSize: 13, fontWeight: "800", color: "#64748b",
    textTransform: "uppercase", marginBottom: 12,
  },
  linkCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  linkIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  linkInfo:  { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  linkSub:   { fontSize: 12, color: "#64748b", marginTop: 2 },

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

export default ManagerAttendanceScreen;
