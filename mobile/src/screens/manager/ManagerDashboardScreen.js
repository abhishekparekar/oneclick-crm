import React, { useCallback, useState, useEffect } from "react";
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
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, G } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import { useAuth } from "../../context/AuthContext";
import useManagerController from "../../controllers/managerController";
import { getMyTodayApi } from "../../api/attendanceService";
import FollowUpPopup from "../../components/FollowUpPopup";

const { width } = Dimensions.get("window");
const HP = 14;

// ─── SVG Donut Chart ────────────────────────────────
const DonutChart = ({ data, size = 80, stroke = 9, centerLabel, centerSub }) => {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        {total > 0 &&
          data.map((seg, i) => {
            if (!seg.value) return null;
            const dash = (seg.value / total) * circ;
            const rot = -90 + (acc / total) * 360;
            acc += seg.value;
            return (
              <G key={i} rotation={rot} origin={`${cx},${cy}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                />
              </G>
            );
          })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }}>{centerLabel}</Text>
        <Text style={{ fontSize: 7.5, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 }}>{centerSub}</Text>
      </View>
    </View>
  );
};

const formatHours = (h) => {
  if (!h || isNaN(h)) return "0h 0m";
  const hrs = Math.floor(h);
  let mins = Math.round((h - hrs) * 60);
  if (mins === 60) return `${hrs + 1}h 0m`;
  return `${hrs}h ${mins}m`;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

// ─────────────────────────────────────────────────────
  const { user, hasPermission } = useAuth();
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessProjects = hasPermission("projects", "view") || hasPermission("projects");
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessReports = hasPermission("reports", "view") || hasPermission("reports");

  const { dashboardData, loadingDashboard, dashboardError, fetchDashboard, refreshDashboard } = useManagerController();

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const { data: res } = await getMyTodayApi();
      if (res?.success) setTodayRecord(res.attendance || null);
    } catch (e) {
      console.log("Attendance:", e.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const params = selectedDeptId ? { departmentId: selectedDeptId } : {};
      fetchDashboard(false, params);
      fetchTodayAttendance();
    }, [selectedDeptId, fetchDashboard])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDashboard(selectedDeptId ? { departmentId: selectedDeptId } : {});
      await fetchTodayAttendance();
    } finally {
      setRefreshing(false);
    }
  };

  const data = dashboardData || {};
  const manager = data.manager || {};
  const teamSummary = data.teamSummary || {};
  const attendanceSummary = data.attendanceSummary || {};
  const leaveSummary = data.leaveSummary || {};
  const taskSummary = data.taskSummary || {};
  const projectSummary = data.projectSummary || {};
  const recentTasks = data.recentTasks || [];
  const latestNotifs = data.latestNotifications || [];
  const unreadCount = latestNotifs.filter((n) => !n.isRead).length;

  const departmentsList = React.useMemo(() => {
    const list = [];
    if (manager?.departmentId) {
      list.push({
        _id: manager.departmentId?._id || manager.departmentId,
        name: manager.departmentId?.name || manager.department || "My Dept",
      });
    }
    if (Array.isArray(manager?.accessibleDepartments)) {
      manager.accessibleDepartments.forEach((d) => {
        const id = typeof d === "object" ? d?._id : d;
        const name = typeof d === "object" ? d?.name || "Dept" : "Dept";
        if (id && !list.some((x) => x._id?.toString() === id.toString())) list.push({ _id: id, name });
      });
    }
    return list;
  }, [manager]);

  if (loadingDashboard && !dashboardData) {
    return (
      <ManagerLayout navigation={navigation} title="Dashboard">
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1268D9" />
          <Text style={styles.loaderText}>Loading dashboard metrics...</Text>
        </View>
      </ManagerLayout>
    );
  }

  if (dashboardError && !dashboardData) {
    return (
      <ManagerLayout navigation={navigation} title="Dashboard">
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline-outline" size={44} color="#94A3B8" />
          <Text style={styles.errorText}>{dashboardError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDashboard(true)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ManagerLayout>
    );
  }

  // ── Punch in state (Untouched as requested) ──
  let isPunchedIn = false;
  let punchInTimeStr = "--:--";
  let punchSub = "Not clocked in today";
  if (todayRecord) {
    if (todayRecord.punchLog?.length > 0) {
      const last = todayRecord.punchLog[todayRecord.punchLog.length - 1];
      if (!last.punchOutTime) {
        isPunchedIn = true;
        punchInTimeStr = new Date(last.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        punchSub = `In since ${punchInTimeStr}`;
      } else {
        punchSub = `Out · ${formatHours(todayRecord.totalHours)}`;
      }
    } else if (todayRecord.punchInTime && !todayRecord.punchOutTime) {
      isPunchedIn = true;
      punchInTimeStr = new Date(todayRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      punchSub = `In since ${punchInTimeStr}`;
    }
  }

  // ── Attendance Metrics ──
  const present = attendanceSummary.presentToday || 0;
  const absent = attendanceSummary.absentToday || 0;
  const halfDay = attendanceSummary.halfDayToday || 0;
  const onLeave = leaveSummary.onLeaveToday || 0;
  const staffTotal = teamSummary.teamCount || (present + absent + halfDay + onLeave) || 0;
  const pct = (v) => (staffTotal > 0 ? `${Math.round((v / staffTotal) * 100)}%` : "0%");
  
  const donutData = [
    { label: "Present", value: present, color: "#10B981" },
    { label: "Absent", value: absent, color: "#EF4444" },
    { label: "Half Day", value: halfDay, color: "#F59E0B" },
    { label: "Leave", value: onLeave, color: "#3B82F6" },
  ];

  const userName = user?.firstName || user?.name?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Manager";
  const dateString = liveTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const clockStr = liveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const pendingLeavesCount = leaveSummary.pendingLeaveRequests || 0;
  const overdueTasksCount = taskSummary.overdueTeamTasks || 0;

  return (
    <ManagerLayout navigation={navigation} title="Dashboard" unreadCount={unreadCount}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} tintColor="#1268D9" />}
      >
        {/* ── TOP SECTION: GREETING & UNTOUCHED PUNCH CARD ── */}
        <View style={styles.topSection}>
          {/* Greeting Header */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}, {userName} 👋</Text>
              <Text style={styles.dateSubText}>{dateString}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#1268D9" />
              <Text style={styles.roleBadgeText}>MANAGER</Text>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════
              ROYAL BLUE PUNCH CARD (PRESERVED AS REQUESTED)
          ═══════════════════════════════════════════════════════ */}
          <LinearGradient
            colors={["#082B52", "#1268D9", "#1D7DF2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.punchCardFull}
          >
            <View
              style={{
                position: "absolute",
                right: -65,
                top: -35,
                width: 210,
                height: 210,
                borderRadius: 105,
                backgroundColor: "rgba(6, 18, 37, 0.48)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
              pointerEvents="none"
            />
            <View
              style={{
                position: "absolute",
                right: -30,
                bottom: -45,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "rgba(0, 0, 0, 0.22)",
              }}
              pointerEvents="none"
            />

            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Ionicons
                name="time"
                size={90}
                color="rgba(255,255,255,0.08)"
                style={{ position: "absolute", right: 10, top: 10 }}
              />
            </View>
            
            <View style={styles.shiftBadge}>
              <View style={[styles.dot, { backgroundColor: isPunchedIn ? "#4ADE80" : "#fff" }]} />
              <Text style={styles.shiftText}>{isPunchedIn ? "ACTIVE SHIFT" : "SHIFT INACTIVE"}</Text>
            </View>

            <View style={styles.punchRow}>
              <View>
                <Text style={styles.punchClock}>{clockStr}</Text>
                <Text style={styles.punchSub}>{punchSub}</Text>
              </View>
              <View style={styles.punchRight}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                  <Ionicons name="timer-outline" size={12} color="rgba(255,255,255,0.85)" style={{ marginRight: 3 }} />
                  <Text style={styles.punchInLbl}>Punch In</Text>
                </View>
                <Text style={styles.punchInTime}>{isPunchedIn ? punchInTimeStr : "--:--"}</Text>
                {canAccessAttendance && (
                  <TouchableOpacity
                    style={styles.punchBtn}
                    onPress={() => navigation.navigate("CheckInCheckOut")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={isPunchedIn ? "log-out-outline" : "log-in-outline"}
                      size={13}
                      color="#1268D9"
                      style={{ marginRight: 3 }}
                    />
                    <Text style={styles.punchBtnText}>{isPunchedIn ? "Punch Out" : "Punch In"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── MAIN DASHBOARD BODY ── */}
        <View style={styles.bodySection}>
          
          {/* Department Filter Pills (if multiple accessible depts) */}
          {departmentsList.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
              {["All Departments", ...departmentsList.map((d) => d.name)].map((name, i) => {
                const deptId = i === 0 ? "" : departmentsList[i - 1]._id;
                const active = selectedDeptId === deptId;
                return (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setSelectedDeptId(deptId)}
                    style={[styles.deptPill, active && styles.deptPillActive]}
                  >
                    <Text style={[styles.deptPillText, active && styles.deptPillTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── 1. ACTION REQUIRED ALERTS (Pending leaves or overdue tasks) ── */}
          {((canAccessLeaves && pendingLeavesCount > 0) || (canAccessTasks && overdueTasksCount > 0)) && (
            <View style={styles.alertBannerCard}>
              <View style={styles.alertHeaderRow}>
                <View style={styles.alertBadge}>
                  <Ionicons name="alert-circle" size={14} color="#DC2626" />
                  <Text style={styles.alertBadgeText}>ATTENTION REQUIRED</Text>
                </View>
                <Text style={styles.alertDateHint}>Today's Priority</Text>
              </View>

              <View style={styles.alertItemsRow}>
                {canAccessLeaves && pendingLeavesCount > 0 && (
                  <TouchableOpacity
                    style={styles.alertActionChip}
                    onPress={() => navigation.navigate("ManagerTeamLeaves")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.alertIconBox, { backgroundColor: "#FEF2F2" }]}>
                      <Ionicons name="calendar-clear" size={14} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertChipTitle}>{pendingLeavesCount} Leave Request{pendingLeavesCount > 1 ? "s" : ""}</Text>
                      <Text style={styles.alertChipSub}>Awaiting your review</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}

                {canAccessTasks && overdueTasksCount > 0 && (
                  <TouchableOpacity
                    style={styles.alertActionChip}
                    onPress={() => navigation.navigate("ManagerTasks")}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.alertIconBox, { backgroundColor: "#FFFBEB" }]}>
                      <Ionicons name="time" size={14} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertChipTitle}>{overdueTasksCount} Overdue Task{overdueTasksCount > 1 ? "s" : ""}</Text>
                      <Text style={styles.alertChipSub}>Needs follow-up</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ── 2. QUICK SHORTCUTS GRID (COMPACT 1-TAP WORKFLOWS) ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
            <Text style={styles.sectionHint}>One-tap navigation</Text>
          </View>

          <View style={styles.shortcutsGrid}>
            {[
              {
                label: "Assign Task",
                icon: "add-circle",
                c: "#1268D9",
                bg: "#EFF6FF",
                border: "#BFDBFE",
                module: "tasks",
                action: "create",
                onPress: () => navigation.navigate("ManagerCreateTask"),
              },
              {
                label: "Team Attendance",
                icon: "calendar",
                c: "#10B981",
                bg: "#ECFDF5",
                border: "#A7F3D0",
                module: "attendance",
                onPress: () => navigation.navigate("ManagerTeamAttendance"),
              },
              {
                label: "Lead Engine",
                icon: "magnet",
                c: "#8B5CF6",
                bg: "#F5F3FF",
                border: "#DDD6FE",
                module: "leads",
                onPress: () => navigation.navigate("LeadsEngine", { screen: "LeadsDashboard" }),
              },
              {
                label: "Team Leaves",
                icon: "airplane",
                c: "#F59E0B",
                bg: "#FEF3C7",
                border: "#FDE68A",
                module: "leaves",
                onPress: () => navigation.navigate("ManagerTeamLeaves"),
              },
              {
                label: "Projects",
                icon: "folder-open",
                c: "#0284C7",
                bg: "#E0F2FE",
                border: "#BAE6FD",
                module: "projects",
                onPress: () => navigation.navigate("ManagerProjects"),
              },
              {
                label: "My Team",
                icon: "people",
                c: "#EC4899",
                bg: "#FDF2F8",
                border: "#FBCFE8",
                onPress: () => navigation.navigate("ManagerTeam"),
              },
              {
                label: "Regularize",
                icon: "shield-checkmark",
                c: "#6366F1",
                bg: "#EEF2FF",
                border: "#C7D2FE",
                module: "attendance",
                onPress: () => navigation.navigate("ManagerRegularization"),
              },
              {
                label: "Reports",
                icon: "bar-chart",
                c: "#475569",
                bg: "#F1F5F9",
                border: "#CBD5E1",
                module: "reports",
                onPress: () => navigation.navigate("ManagerReports"),
              },
            ]
              .filter((sc) => {
                if (!sc.module) return true;
                return hasPermission(sc.module, sc.action || "view") || hasPermission(sc.module);
              })
              .map((sc) => (
                <TouchableOpacity
                  key={sc.label}
                  style={[styles.shortcutBtn, { borderColor: sc.border }]}
                  onPress={sc.onPress}
                  activeOpacity={0.75}
                >
                  <View style={[styles.shortcutIconBox, { backgroundColor: sc.bg }]}>
                    <Ionicons name={sc.icon} size={20} color={sc.c} />
                  </View>
                  <Text style={styles.shortcutLabel} numberOfLines={1}>
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* ── 3. WORK & PERFORMANCE METRIC MATRIX (COMPACT 2x3 TILES) ── */}
          <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ManagerTasks")} activeOpacity={0.7}>
              <Text style={styles.sectionLink}>View All Tasks</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.kpiGrid}>
            {/* My Tasks */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#10B981" }]}
              onPress={() => navigation.navigate("ManagerTasks", { filter: "my" })}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.kpiLabel}>My Tasks</Text>
              </View>
              <Text style={styles.kpiValue}>{taskSummary.myPendingTasks ?? 0}</Text>
              <Text style={styles.kpiSub}>Pending Action</Text>
            </TouchableOpacity>

            {/* Team Tasks */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#8B5CF6" }]}
              onPress={() => navigation.navigate("ManagerTasks")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#8B5CF6" }]} />
                <Text style={styles.kpiLabel}>Team Tasks</Text>
              </View>
              <Text style={styles.kpiValue}>{taskSummary.openTeamTasks ?? 0}</Text>
              <Text style={styles.kpiSub}>Active & Open</Text>
            </TouchableOpacity>

            {/* Overdue */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#EF4444" }]}
              onPress={() => navigation.navigate("ManagerTasks", { status: "overdue" })}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#EF4444" }]} />
                <Text style={styles.kpiLabel}>Overdue</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#DC2626" }]}>{taskSummary.overdueTeamTasks ?? 0}</Text>
              <Text style={styles.kpiSub}>Urgent Followup</Text>
            </TouchableOpacity>

            {/* Team Present */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#059669" }]}
              onPress={() => navigation.navigate("ManagerTeamAttendance")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#059669" }]} />
                <Text style={styles.kpiLabel}>Present Today</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#059669" }]}>{present}</Text>
              <Text style={styles.kpiSub}>Active at work</Text>
            </TouchableOpacity>

            {/* On Leave */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#3B82F6" }]}
              onPress={() => navigation.navigate("ManagerTeamLeaves")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.kpiLabel}>On Leave</Text>
              </View>
              <Text style={[styles.kpiValue, { color: "#2563EB" }]}>{onLeave}</Text>
              <Text style={styles.kpiSub}>Approved today</Text>
            </TouchableOpacity>

            {/* Active Projects */}
            <TouchableOpacity
              style={[styles.kpiBox, { borderLeftColor: "#F59E0B" }]}
              onPress={() => navigation.navigate("ManagerProjects")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.kpiLabel}>Projects</Text>
              </View>
              <Text style={styles.kpiValue}>{projectSummary.activeProjects ?? 0}</Text>
              <Text style={styles.kpiSub}>In Execution</Text>
            </TouchableOpacity>
          </View>

          {/* ── 4. TEAM ATTENDANCE TODAY PULSE CARD ── */}
          {canAccessAttendance && (
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="pulse" size={16} color="#1268D9" style={{ marginRight: 6 }} />
                  <Text style={styles.attendanceCardTitle}>Team Attendance Today</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("ManagerTeamAttendance")}
                  style={styles.cardHeaderBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardHeaderBtnText}>Inspect Team</Text>
                  <Ionicons name="chevron-forward" size={12} color="#1268D9" />
                </TouchableOpacity>
              </View>

              <View style={styles.donutContainer}>
                <DonutChart data={donutData} size={84} stroke={10} centerLabel={staffTotal} centerSub="STAFF" />
                <View style={styles.legendGrid}>
                  {donutData.map((d) => (
                    <View key={d.label} style={styles.legendTile}>
                      <View style={[styles.legendTileDot, { backgroundColor: d.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendTileLabel}>{d.label}</Text>
                        <Text style={styles.legendTileValue}>
                          {d.value} <Text style={styles.legendTilePct}>({pct(d.value)})</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── 5. UPCOMING DEADLINES & TASK HIGHLIGHTS ── */}
          {canAccessTasks && (
            <View style={styles.tasksSectionCard}>
              <View style={styles.tasksCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={16} color="#1268D9" style={{ marginRight: 6 }} />
                  <Text style={styles.tasksCardTitle}>Upcoming Deadlines</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("ManagerTasks")}
                  style={styles.cardHeaderBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardHeaderBtnText}>View All ({recentTasks.length})</Text>
                  <Ionicons name="chevron-forward" size={12} color="#1268D9" />
                </TouchableOpacity>
              </View>

              {recentTasks.length === 0 ? (
                <View style={styles.emptyTasksBox}>
                  <Ionicons name="checkmark-done-circle-outline" size={32} color="#10B981" />
                  <Text style={styles.emptyTasksText}>All team deadlines are on track!</Text>
                </View>
              ) : (
                recentTasks.slice(0, 4).map((t, idx) => {
                  const isOverdue = t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed");
                  return (
                    <TouchableOpacity
                      key={t._id || idx}
                      style={styles.taskListItem}
                      onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTaskDetails", params: { taskId: t._id } })}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.taskIconBox, { backgroundColor: isOverdue ? "#FEF2F2" : "#EFF6FF" }]}>
                        <Ionicons
                          name={isOverdue ? "alert-circle" : "clipboard-outline"}
                          size={16}
                          color={isOverdue ? "#EF4444" : "#1268D9"}
                        />
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.taskItemTitle} numberOfLines={1}>
                          {t.title || "Task Assignment"}
                        </Text>
                        <Text style={styles.taskItemProject} numberOfLines={1}>
                          {t.projectId?.name || t.departmentName || "General Project"} • {t.assignedTo?.name || "Team"}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.taskItemDate, isOverdue && { color: "#DC2626", fontWeight: "800" }]}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                        </Text>
                        <View style={[styles.priorityPill, { backgroundColor: t.priority === "high" ? "#FEF2F2" : "#F1F5F9" }]}>
                          <Text style={[styles.priorityPillText, { color: t.priority === "high" ? "#DC2626" : "#64748B" }]}>
                            {(t.priority || "Normal").toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

        </View>
      </ScrollView>

      <FollowUpPopup />
    </ManagerLayout>
  );
};

// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { paddingBottom: 110 },

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, minHeight: 300 },
  loaderText: { marginTop: 12, fontSize: 13, color: "#64748B", fontWeight: "600" },
  errorText: { marginTop: 12, fontSize: 13, color: "#EF4444", fontWeight: "700", textAlign: "center" },
  retryBtn: { marginTop: 12, backgroundColor: "#1268D9", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // ── TOP SECTION ──
  topSection: {
    backgroundColor: "#F8FAFC",
    paddingTop: 8,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: HP,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  dateSubText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1268D9",
    letterSpacing: 0.5,
  },

  // ── PUNCH CARD (PRESERVED) ──
  punchCardFull: {
    marginHorizontal: HP,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: HP,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  shiftText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.7 },
  punchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  punchClock: { fontSize: 30, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  punchSub: { fontSize: 10.5, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  punchRight: { alignItems: "flex-end" },
  punchInLbl: { fontSize: 10.5, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  punchInTime: { fontSize: 13.5, fontWeight: "800", color: "#fff", marginBottom: 7 },
  punchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  punchBtnText: { fontSize: 12, fontWeight: "800", color: "#1268D9" },

  // ── BODY SECTION ──
  bodySection: {
    paddingHorizontal: HP,
    paddingTop: 4,
  },

  // Dept filter
  deptPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deptPillActive: { backgroundColor: "#1268D9", borderColor: "#1268D9" },
  deptPillText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  deptPillTextActive: { color: "#FFFFFF" },

  // ── Alert Banner ──
  alertBannerCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alertBadgeText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  alertDateHint: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  alertItemsRow: {
    flexDirection: "column",
    gap: 6,
  },
  alertActionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  alertIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  alertChipTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  alertChipSub: {
    fontSize: 10,
    color: "#64748B",
  },

  // ── Headers ──
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#94A3B8",
  },
  sectionLink: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1268D9",
  },

  // ── Shortcuts Grid (4 cols) ──
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  shortcutBtn: {
    width: (width - HP * 2 - 24) / 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  shortcutLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.1,
  },

  // ── KPI Grid (3 cols) ──
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  kpiBox: {
    width: (width - HP * 2 - 16) / 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 3.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  kpiDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  kpiSub: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 1,
  },

  // ── Attendance Card ──
  attendanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  attendanceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  attendanceCardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  cardHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardHeaderBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1268D9",
  },
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: 14,
    gap: 8,
  },
  legendTile: {
    width: "46%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  legendTileDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  legendTileLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
  },
  legendTileValue: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F172A",
  },
  legendTilePct: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },

  // ── Tasks Deadlines Card ──
  tasksSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tasksCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tasksCardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  emptyTasksBox: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyTasksText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    marginTop: 4,
  },
  taskListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  taskIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  taskItemTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  taskItemProject: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  taskItemDate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  priorityPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
  },
  priorityPillText: {
    fontSize: 8,
    fontWeight: "900",
  },
});

export default ManagerDashboardScreen;
