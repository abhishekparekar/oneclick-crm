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
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Path, Polygon, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import { useAuth } from "../../context/AuthContext";
import useManagerController from "../../controllers/managerController";
import { getMyTodayApi } from "../../api/attendanceService";
import FollowUpPopup from "../../components/FollowUpPopup";

const { width } = Dimensions.get("window");
const HP = 14; // horizontal padding

// ─── SVG Donut ──────────────────────────────────────
const DonutChart = ({ data, size = 78, stroke = 9, centerLabel, centerSub }) => {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        {total > 0 && data.map((seg, i) => {
          if (!seg.value) return null;
          const dash = (seg.value / total) * circ;
          const rot = -90 + (acc / total) * 360;
          acc += seg.value;
          return (
            <G key={i} rotation={rot} origin={`${cx},${cy}`}>
              <Circle cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
            </G>
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 15, fontWeight: "900", color: "#0F172A" }}>{centerLabel}</Text>
        <Text style={{ fontSize: 7, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 }}>{centerSub}</Text>
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
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
};

// ─── 3-column KPI Row ───────────────────────────────
const KpiRow = ({ cards, navigation }) => {
  const cw = (width - HP * 2 - 8 * 2) / 3;
  return (
    <View style={{ flexDirection: "row", marginBottom: 8 }}>
      {cards.map((k, i) => (
        <TouchableOpacity
          key={k.label}
          style={[styles.kpiCard, { width: cw, borderBottomColor: k.accent }, i > 0 && { marginLeft: 8 }]}
          onPress={() => navigation.navigate(k.route)}
          activeOpacity={0.8}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: k.iBg }]}>
            <Ionicons name={k.icon} size={14} color={k.c} />
          </View>
          <Text style={styles.kpiVal}>{k.val}</Text>
          <Text style={styles.kpiLbl}>{k.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── 3D Perspective Hero Graphic (matches reference design) ───
function Hero3DGraphic() {
  return (
    <View style={{ width: 135, height: 95, justifyContent: "center", alignItems: "center" }}>
      <Svg width={135} height={95} viewBox="0 0 135 95">
        <Defs>
          <SvgGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1E293B" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#0F172A" stopOpacity="0.98" />
          </SvgGradient>
          <SvgGradient id="orangeGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#0D50B8" stopOpacity="1" />
            <Stop offset="1" stopColor="#1268D9" stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Ambient Sparkle / Glow Dots */}
        <Circle cx="8" cy="22" r="1.8" fill="#1268D9" opacity="0.9" />
        <Circle cx="128" cy="14" r="2.2" fill="#2F8BFF" opacity="0.8" />
        <Circle cx="68" cy="4" r="1.5" fill="#1268D9" opacity="0.7" />
        <Circle cx="132" cy="55" r="2" fill="#1268D9" opacity="0.85" />
        <Circle cx="4" cy="68" r="2.5" fill="#2F8BFF" opacity="0.75" />
        <Circle cx="120" cy="88" r="1.5" fill="#1268D9" opacity="0.9" />
        <Circle cx="50" cy="90" r="1.2" fill="#2F8BFF" opacity="0.6" />

        {/* Outer Glow Line */}
        <Polygon
          points="20,13 124,3 114,89 12,79"
          fill="none"
          stroke="#1268D9"
          strokeWidth="3.5"
          opacity="0.3"
        />

        {/* Main 3D Perspective Card */}
        <Polygon
          points="20,13 124,3 114,89 12,79"
          fill="url(#cardBg)"
          stroke="#1268D9"
          strokeWidth="1.6"
        />

        {/* Top Accent Bar */}
        <Path d="M 28,21 L 52,19" stroke="url(#orangeGrad)" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />

        {/* Vertical Bar Chart */}
        <Path d="M 30,52 L 30,42" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinecap="round" />
        <Path d="M 38,51 L 38,32" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinecap="round" />
        <Path d="M 46,50 L 46,38" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinecap="round" />
        <Path d="M 54,49 L 54,26" stroke="url(#orangeGrad)" strokeWidth="4" strokeLinecap="round" />

        {/* 92% Ring Gauge */}
        <G transform="translate(88, 38)">
          <Circle cx="0" cy="0" r="16" fill="none" stroke="rgba(249,115,22,0.2)" strokeWidth="3" />
          <Circle
            cx="0" cy="0" r="16" fill="none"
            stroke="url(#orangeGrad)" strokeWidth="3"
            strokeDasharray="92 100"
            strokeLinecap="round"
            transform="rotate(-90)"
          />
          <SvgText
            x="0" y="3.5"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="bold"
            textAnchor="middle"
          >
            92%
          </SvgText>
        </G>

        {/* Bottom Wave Line */}
        <Path
          d="M 26,67 Q 45,78 68,62 T 104,70"
          fill="none"
          stroke="url(#orangeGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────────
const ManagerDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
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
    } catch (e) { console.log("Attendance:", e.message); }
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
    try { await refreshDashboard(selectedDeptId ? { departmentId: selectedDeptId } : {}); }
    finally { setRefreshing(false); }
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
  const unreadCount = latestNotifs.filter(n => !n.isRead).length;

  const departmentsList = React.useMemo(() => {
    const list = [];
    if (manager.departmentId) list.push({ _id: manager.departmentId._id || manager.departmentId, name: manager.department || "My Dept" });
    manager.accessibleDepartments?.forEach(d => {
      const id = typeof d === "object" ? d._id : d;
      const name = typeof d === "object" ? (d.name || "Dept") : "Dept";
      if (id && !list.some(x => x._id?.toString() === id.toString())) list.push({ _id: id, name });
    });
    return list;
  }, [manager]);

  if (loadingDashboard && !dashboardData) {
    return (
      <ManagerLayout navigation={navigation} title="Dashboard">
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1268D9" />
          <Text style={styles.loaderText}>Loading…</Text>
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

  // Punch state
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

  // Donut data
  const present = attendanceSummary.presentToday || 1;
  const absent = attendanceSummary.absentToday || 2;
  const halfDay = attendanceSummary.halfDayToday || 0;
  const onLeave = leaveSummary.onLeaveToday || 0;
  const staffTotal = teamSummary.teamCount || (present + absent + halfDay + onLeave) || 3;
  const pct = v => staffTotal > 0 ? `${Math.round((v / staffTotal) * 100)}%` : "0%";
  const donutData = [
    { label: "Present", value: present, color: "#10B981" },
    { label: "Absent", value: absent, color: "#EF4444" },
    { label: "Half Day", value: halfDay, color: "#F59E0B" },
    { label: "Leave", value: onLeave, color: "#3B82F6" },
  ];

  const userName = user?.firstName || user?.name?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Manager";
  const dateString = liveTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const clockStr = liveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const kpiRow1 = [
    { label: "My Tasks", val: taskSummary.myPendingTasks ?? 0, icon: "clipboard-outline", iBg: "#ECFDF5", c: "#10B981", accent: "#10B981", route: "ManagerTasks" },
    { label: "Team Tasks", val: taskSummary.openTeamTasks ?? 13, icon: "file-tray-full-outline", iBg: "#F5F3FF", c: "#8B5CF6", accent: "#8B5CF6", route: "ManagerTasks" },
    { label: "Projects", val: projectSummary.activeProjects ?? 1, icon: "folder-open-outline", iBg: "#EFF6FF", c: "#3B82F6", accent: "#3B82F6", route: "ManagerProjects" },
  ];
  const kpiRow2 = [
    { label: "Overdue", val: taskSummary.overdueTeamTasks ?? 13, icon: "alert-circle-outline", iBg: "#FEF2F2", c: "#EF4444", accent: "#EF4444", route: "ManagerTasks" },
    { label: "Completed", val: taskSummary.completedTeamTasks ?? 6, icon: "checkmark-circle-outline", iBg: "#ECFDF5", c: "#10B981", accent: "#10B981", route: "ManagerTasks" },
    { label: "Team Members", val: teamSummary.teamCount ?? 3, icon: "people-outline", iBg: "#EFF6FF", c: "#1268D9", accent: "#1268D9", route: "ManagerTeam" },
  ];

  return (
    <ManagerLayout navigation={navigation} title="Dashboard" unreadCount={unreadCount}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} tintColor="#1268D9" />}
      >

        {/* ════════════════════════════════════════════
            TOP SECTION: Hero + Punch card
            background = #F4F7FB (Clean Light)
        ════════════════════════════════════════════ */}
        <View style={styles.topDarkSection}>

          {/* 1. GREETING + ANALYTICS GRAPHIC */}
          <View style={styles.heroContent}>
          </View>

          {/* 2. ROYAL BLUE PUNCH CARD */}
          <LinearGradient colors={["#082B52", "#1268D9", "#1D7DF2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.punchCardFull}>
            {/* Large dark navy semi-circle decorative background element on the right */}
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

            {/* Watermark */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Ionicons name="time" size={90} color="rgba(255,255,255,0.08)" style={{ position: "absolute", right: 10, top: 10 }} />
            </View>
            {/* Shift badge */}
            <View style={styles.shiftBadge}>
              <View style={[styles.dot, { backgroundColor: isPunchedIn ? "#4ADE80" : "#fff" }]} />
              <Text style={styles.shiftText}>{isPunchedIn ? "ACTIVE SHIFT" : "SHIFT INACTIVE"}</Text>
            </View>
            {/* Clock + Button */}
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
                <TouchableOpacity
                  style={styles.punchBtn}
                  onPress={() => navigation.navigate("CheckInCheckOut")}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isPunchedIn ? "log-out-outline" : "log-in-outline"} size={13} color="#1268D9" style={{ marginRight: 3 }} />
                  <Text style={styles.punchBtnText}>{isPunchedIn ? "Punch Out" : "Punch In"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ════════════════════════════════════════════
            LIGHT SECTION: Everything below punch card
        ════════════════════════════════════════════ */}
        <View style={styles.lightSection}>

          {/* Dept filter */}
          {departmentsList.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {["All", ...departmentsList.map(d => d.name)].map((name, i) => {
                const deptId = i === 0 ? "" : departmentsList[i - 1]._id;
                const active = selectedDeptId === deptId;
                return (
                  <TouchableOpacity key={name} onPress={() => setSelectedDeptId(deptId)} style={[styles.pill, active && styles.pillA]}>
                    <Text style={[styles.pillTxt, active && styles.pillTxtA]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 3. QUICK ACTIONS */}
          <View style={styles.secRow}>
            <Text style={styles.secTitle}>Quick Actions</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.linkBtn}>
              <Text style={styles.linkTxt}>Customize</Text>
              <Ionicons name="options-outline" size={11} color="#1268D9" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { label: "Projects", icon: "folder-open-outline", bg: "#EFF6FF", iBg: "#DBEAFE", c: "#1268D9", r: "ManagerProjects" },
                { label: "Attendance", icon: "calendar-outline", bg: "#EFF6FF", iBg: "#DBEAFE", c: "#1268D9", r: "ManagerTeamAttendance" },
                { label: "My Tasks", icon: "checkbox-outline", bg: "#ECFDF5", iBg: "#A7F3D0", c: "#059669", r: "ManagerTasks" },
                { label: "Leave", icon: "calendar-outline", bg: "#F5F3FF", iBg: "#DDD6FE", c: "#7C3AED", r: "ManagerTeamLeaves" },
                { label: "Payslip", icon: "receipt-outline", bg: "#EFF6FF", iBg: "#BFDBFE", c: "#2563EB", r: "Payslips" },
              ].map((q, i) => (
                <TouchableOpacity
                  key={q.label}
                  style={[styles.quickCard, { backgroundColor: q.bg, minWidth: 80 }]}
                  onPress={() => navigation.navigate(q.r)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickIconBox, { backgroundColor: q.iBg }]}>
                    <Ionicons name={q.icon} size={18} color={q.c} />
                  </View>
                  <Text style={styles.quickLabel}>{q.label}</Text>
                  <View style={[styles.quickArrow, { backgroundColor: q.c }]}>
                    <Ionicons name="chevron-forward" size={9} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 5. TEAM ATTENDANCE */}
          <View style={styles.card}>
            <View style={styles.secRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="pulse-outline" size={13} color="#1268D9" style={{ marginRight: 4 }} />
                <Text style={styles.secTitle}>Team Attendance Today</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("ManagerTeamAttendance")} style={styles.linkBtn} activeOpacity={0.7}>
                <Text style={styles.linkTxt}>View All</Text>
                <Ionicons name="chevron-forward" size={11} color="#1268D9" style={{ marginLeft: 1 }} />
              </TouchableOpacity>
            </View>
            <View style={styles.donutRow}>
              <DonutChart data={donutData} size={78} stroke={9} centerLabel={staffTotal} centerSub="STAFF" />
              <View style={styles.legend}>
                {donutData.map(d => (
                  <View key={d.label} style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={styles.legendLbl}>{d.label}</Text>
                    </View>
                    <Text style={styles.legendVal}>{d.value} <Text style={styles.legendPct}>({pct(d.value)})</Text></Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 6. UPCOMING + RECENT ACTIVITY */}
          <View style={{ flexDirection: "row" }}>
            {/* Upcoming Deadlines */}
            <View style={[styles.halfCard, { flex: 1, marginRight: 8 }]}>
              <View style={styles.halfHdr}>
                <Ionicons name="calendar-outline" size={11} color="#1268D9" style={{ marginRight: 3 }} />
                <Text style={styles.halfTitle}>Upcoming Deadlines</Text>
                <TouchableOpacity onPress={() => navigation.navigate("ManagerTasks")} style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }} activeOpacity={0.7}>
                  <Text style={styles.linkTxt}>View All</Text>
                  <Ionicons name="chevron-forward" size={10} color="#1268D9" />
                </TouchableOpacity>
              </View>
              {(recentTasks.length > 0 ? recentTasks.slice(0, 2) : [
                { _id: "1", title: "recurring", _pn: "General", _dt: "Jul 10" },
                { _id: "2", title: "recurring task", _pn: "General", _dt: "Jul 15" },
              ]).map((t, i) => (
                <View key={t._id || i} style={styles.dlRow}>
                  <View style={styles.dlIcon}><Ionicons name="refresh-outline" size={11} color="#10B981" /></View>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Text style={styles.dlTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.dlSub}>{t._pn || t.projectId?.name || "General"}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.dlDate}>{t._dt || (t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—")}</Text>
                    <View style={styles.medPill}><Text style={styles.medTxt}>Medium</Text></View>
                  </View>
                </View>
              ))}
            </View>

            {/* Recent Activity */}
            <View style={[styles.halfCard, { flex: 1 }]}>
              <View style={styles.halfHdr}>
                <Ionicons name="pulse-outline" size={11} color="#1268D9" style={{ marginRight: 3 }} />
                <Text style={styles.halfTitle}>Recent Activity</Text>
                <TouchableOpacity style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }} activeOpacity={0.7}>
                  <Text style={styles.linkTxt}>View All</Text>
                  <Ionicons name="chevron-forward" size={10} color="#1268D9" />
                </TouchableOpacity>
              </View>
              {[
                { icon: "checkmark-circle", bg: "#ECFDF5", c: "#10B981", text: "You completed \"UI Design\"", time: "2h ago" },
                { icon: "person", bg: "#F5F3FF", c: "#8B5CF6", text: "Rohit submitted leave", time: "3h ago" },
                { icon: "time-outline", bg: "#EFF6FF", c: "#3B82F6", text: "Meeting with Team", time: "10:30 AM" },
              ].map((a, i) => (
                <View key={i} style={styles.actRow}>
                  <View style={[styles.actIcon, { backgroundColor: a.bg }]}>
                    <Ionicons name={a.icon} size={11} color={a.c} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actText} numberOfLines={1}>{a.text}</Text>
                    <Text style={styles.actTime}>{a.time}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={10} color="#CBD5E1" />
                </View>
              ))}
            </View>
          </View>

        </View>{/* end lightSection */}
      </ScrollView>

      <FollowUpPopup />
    </ManagerLayout>
  );
};

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  // scroll bg = same as header → seamless dark hero transition
  // scroll: { flex: 1, backgroundColor: "#0F172A" },
  content: { paddingBottom: 30 },

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, minHeight: 300 },
  loaderText: { marginTop: 12, fontSize: 12, color: "#64748B", fontWeight: "600" },
  errorText: { marginTop: 12, fontSize: 13, color: "#EF4444", fontWeight: "700", textAlign: "center" },
  retryBtn: { marginTop: 2, backgroundColor: "#1268D9", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // // ── TOP LIGHT SECTION ──
  topDarkSection: {
    backgroundColor: "#F4F7FB",
  },

  // ── Hero ──
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HP,
    paddingTop: 10,
    paddingBottom: 1,
  },
  heroLeft: { flex: 1, paddingRight: 8 },
  heroName: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginBottom: 8 },
  datePill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 15, alignSelf: "flex-start",
  },
  datePillText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  // ── Punch Card ──
  punchCardFull: {
    marginHorizontal: HP,
    marginTop: 8,
    marginBottom: 12,
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
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 1, paddingVertical: 3,
    borderRadius: 8, marginBottom: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  shiftText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.7 },
  punchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  punchClock: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  punchSub: { fontSize: 10.5, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  punchRight: { alignItems: "flex-end" },
  punchInLbl: { fontSize: 10.5, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  punchInTime: { fontSize: 13.5, fontWeight: "800", color: "#fff", marginBottom: 7 },
  punchBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18,
    elevation: 3, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
  punchBtnText: { fontSize: 12, fontWeight: "800", color: "#1268D9" },

  // ── LIGHT SECTION ──
  lightSection: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: HP,
    paddingTop: 14,
    paddingBottom: 160,
  },

  // ── Dept filter ──
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0" },
  pillA: { backgroundColor: "#1268D9", borderColor: "#1268D9" },
  pillTxt: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  pillTxtA: { color: "#fff" },

  // ── Section headers ──
  secRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  secTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  linkBtn: { flexDirection: "row", alignItems: "center" },
  linkTxt: { fontSize: 11, fontWeight: "700", color: "#1268D9" },

  // ── Quick Actions ──
  quickCard: {
    flex: 1, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 5,
    alignItems: "center",
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  quickIconBox: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  quickLabel: { fontSize: 10, fontWeight: "700", color: "#1E293B", textAlign: "center", marginBottom: 1 },
  quickArrow: { width: 17, height: 17, borderRadius: 8.5, alignItems: "center", justifyContent: "center", marginTop: 4 },

  // ── KPI Cards (width computed in KpiRow component) ──
  kpiCard: {
    backgroundColor: "#fff",
    borderRadius: 12, padding: 11,
    borderBottomWidth: 2.5,
    elevation: 2, shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
  },
  kpiIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiVal: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  kpiLbl: { fontSize: 9.5, fontWeight: "700", color: "#64748B", marginTop: 1 },

  // ── Card ──
  card: {
    marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 14,
    padding: 12,
    elevation: 2, shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },

  // ── Donut ──
  donutRow: { flexDirection: "row", alignItems: "center", paddingTop: 4 },
  legend: { flex: 1, marginLeft: 14 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  legendLeft: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  legendLbl: { fontSize: 11, color: "#475569", fontWeight: "600" },
  legendVal: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  legendPct: { fontSize: 9.5, color: "#94A3B8" },

  // ── Two-column bottom ──
  halfCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 10,
    elevation: 2, shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  halfHdr: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  halfTitle: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  dlRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  dlIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 6 },
  dlTitle: { fontSize: 10.5, fontWeight: "700", color: "#0F172A" },
  dlSub: { fontSize: 9, color: "#94A3B8" },
  dlDate: { fontSize: 9, fontWeight: "700", color: "#64748B", marginBottom: 2 },
  medPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  medTxt: { fontSize: 8, fontWeight: "800", color: "#D97706" },
  actRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  actIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 6 },
  actText: { fontSize: 10.5, fontWeight: "700", color: "#0F172A" },
  actTime: { fontSize: 9, color: "#94A3B8" },

  // ── FAB ──
  fab: {
    position: "absolute", bottom: 26, right: 18,
    width: 50, height: 50, borderRadius: 25,
    elevation: 8, shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
    overflow: "hidden",
  },
  fabGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default ManagerDashboardScreen;
