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
import { LinearGradient } from "expo-linear-gradient";
import EmployeeLayout from "../../components/EmployeeLayout";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import { leadsService } from "../../api/leadsService";
import { COLORS, SHADOWS, ROUNDING, SPACING, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

// ── Oneclick Design Tokens ─────────────────────────────────────
const C = {
  primary: "#2875BD", // Master Primary Blue
  primaryDark: "#2174C6",
  primaryLight: "#74B4EE",
  darkNavy: "#333436",
  slateHeader: "#1E293B",
  accentPurple: "#8B5CF6",
  accentIndigo: "#6366F1",
  accentBlue: "#2875BD",
  accentEmerald: "#10B981",
  accentRose: "#EF4444",
  accentAmber: "#F59E0B",
  bg: "#F4F7FB", // Modern Crisp Slate Bg
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#333436",
  sub: "#475569",
  muted: "#94A3B8",

  // Status Colors
  green: "#10B981", greenBg: "#ECFDF5",
  red: "#EF4444", redBg: "#FEE2E2",
  amber: "#F59E0B", amberBg: "#FEF3C7",
  blue: "#2875BD", blueBg: "#EBF4FC",
  purple: "#8B5CF6", purpleBg: "#F5F3FF",
  teal: "#0D9488", tealBg: "#F0FDFA",
};

// ── Section Header (Compact) ──────────────────────────────────
const SectionHeader = ({ title, icon, onViewAll }) => (
  <View style={styles.sectionHeaderRow}>
    <View style={styles.sectionTitleGroup}>
      {icon && <Ionicons name={icon} size={14} color={C.primary} style={{ marginRight: 5 }} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn} activeOpacity={0.6}>
        <Text style={styles.viewAll}>View All</Text>
        <Ionicons name="chevron-forward" size={10} color={C.primary} style={{ marginLeft: 1 }} />
      </TouchableOpacity>
    )}
  </View>
);

export default function EmployeeDashboard({ navigation }) {
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const {
    employeeDashboard,
    loading,
    refreshEmployeeDashboard,
    getEmployeeDashboardCached
  } = useAppData();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [leadsList, setLeadsList] = useState([]);

  const loadData = async (force = false, currentDeptId = "") => {
    try {
      const params = currentDeptId ? { departmentId: currentDeptId } : {};
      if (force) {
        setRefreshing(true);
        await refreshEmployeeDashboard(params);
      } else {
        await getEmployeeDashboardCached(false, params);
      }

      if (canAccessLeads) {
        leadsService.getLeads().then((res) => {
          const arr = Array.isArray(res) ? res : res?.data || [];
          setLeadsList(arr);
        }).catch(() => { });
      }
    } catch (err) {
      console.error("Error loading dashboard summary data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const params = selectedDeptId ? { departmentId: selectedDeptId } : {};
      getEmployeeDashboardCached(false, params);
      if (canAccessLeads) {
        leadsService.getLeads().then((res) => {
          const arr = Array.isArray(res) ? res : res?.data || [];
          setLeadsList(arr);
        }).catch(() => { });
      }
    }, [selectedDeptId, canAccessLeads])
  );

  const handleRefresh = () => loadData(true, selectedDeptId);

  const data = employeeDashboard || {};
  const employee = data.employee || {};

  const departmentsList = React.useMemo(() => {
    const list = [];
    if (employee?.departmentId) {
      const dId = typeof employee.departmentId === "object" ? employee.departmentId?._id : employee.departmentId;
      const dName = typeof employee.departmentId === "object" ? (employee.departmentId?.name || "My Department") : "My Department";
      if (dId) {
        list.push({ _id: dId, name: dName });
      }
    }

    const addDepts = (deptArray) => {
      if (Array.isArray(deptArray) && deptArray.length > 0) {
        deptArray.forEach(d => {
          if (!d) return;
          const id = typeof d === "object" ? d?._id : d;
          const name = typeof d === "object" ? (d?.name || "Accessible Dept") : "Accessible Dept";
          if (id && !list.some(x => String(x?._id) === String(id))) {
            list.push({ _id: id, name });
          }
        });
      }
    };

    addDepts(employee?.departmentIds);
    addDepts(employee?.accessibleDepartments);

    return list;
  }, [employee]);

  const profileCompletion = data.profileCompletion || { isCompleted: false, percentage: 0 };
  const todayAttendance = data.todayAttendance || null;
  const attendanceSummary = data.attendanceSummary || { present: 0, late: 0, absent: 0, halfDay: 0 };
  const taskSummary = data.taskSummary || { assignedTasks: 0, pending: 0, dueToday: 0, overdue: 0, completedThisWeek: 0 };
  const projectSummary = data.projectSummary || { activeProjects: 0, completedProjects: 0, projectProgress: 0 };
  const leaveSummary = data.leaveSummary || { leaveBalance: { casual: 12, sick: 10, annual: 15, lop: 0 }, pendingRequests: 0, approvedLeaves: 0 };
  const announcements = data.announcements || [];
  const holidays = data.upcomingHolidays || [];

  // Lead CRM Stats Memo
  const leadStats = React.useMemo(() => {
    const total = leadsList.length;
    let won = 0;
    let contacted = 0;
    let inProgress = 0;

    leadsList.forEach((l) => {
      const sName = (l.status?.name || "").toLowerCase();
      if (sName.includes("won") || sName.includes("closed")) won++;
      else if (sName.includes("contact") || sName.includes("pitch")) contacted++;
      else if (sName.includes("proposal") || sName.includes("qualified") || sName.includes("negotiation") || sName.includes("progress")) inProgress++;
    });

    return { total, contacted, inProgress, won };
  }, [leadsList]);

  const getInitials = (name) => {
    if (!name) return "EE";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamic Business & Productivity Score computation
  const productivityScoreInfo = React.useMemo(() => {
    if (data.productivityScore && typeof data.productivityScore.score === "number") {
      const s = Math.max(0, Math.min(100, Math.round(data.productivityScore.score)));
      let rating = data.productivityScore.rating || "Good";
      let color = "#10B981";
      let badgeBg = "rgba(16, 185, 129, 0.15)";
      let trendIcon = "trending-up";
      let barGradient = ["#1268D9", "#10B981"];

      if (s >= 90) {
        rating = "Excellent";
        color = "#10B981";
        badgeBg = "rgba(16, 185, 129, 0.15)";
        trendIcon = "trending-up";
        barGradient = ["#F97316", "#10B981"];
      } else if (s >= 75) {
        rating = "Good";
        color = "#3B82F6";
        badgeBg = "rgba(59, 130, 246, 0.15)";
        trendIcon = "trending-up";
        barGradient = ["#F97316", "#3B82F6"];
      } else if (s >= 50) {
        rating = "Average";
        color = "#F59E0B";
        badgeBg = "rgba(245, 158, 11, 0.15)";
        trendIcon = "arrow-forward";
        barGradient = ["#EF4444", "#F59E0B"];
      } else {
        rating = "Needs Focus";
        color = "#EF4444";
        badgeBg = "rgba(239, 68, 68, 0.15)";
        trendIcon = "trending-down";
        barGradient = ["#EF4444", "#EA580C"];
      }

      return {
        score: s,
        rating,
        color,
        badgeBg,
        trendIcon,
        trendText: data.productivityScore.trend || "+0%",
        barGradient,
      };
    }

    const totalTasks = taskSummary.assignedTasks || 0;
    const completedTasks = taskSummary.completed || 0;
    const overdueTasks = taskSummary.overdue || 0;
    const completedThisWeek = taskSummary.completedThisWeek || 0;

    const taskScore = totalTasks > 0
      ? Math.max(0, Math.min(100, Math.round((completedTasks / totalTasks) * 100) - (overdueTasks * 5)))
      : 100;

    const presentDays = attendanceSummary.present || 0;
    const halfDays = attendanceSummary.halfDay || 0;
    const absentDays = attendanceSummary.absent || 0;
    const totalAttDays = presentDays + halfDays + absentDays;

    const attendanceScore = totalAttDays > 0
      ? Math.max(0, Math.min(100, Math.round(((presentDays + (halfDays * 0.5)) / totalAttDays) * 100)))
      : 100;

    const projectScore = projectSummary.projectProgress || 100;

    const calculatedScore = Math.max(0, Math.min(100, Math.round((taskScore * 0.50) + (attendanceScore * 0.35) + (projectScore * 0.15))));

    let rating = "Good";
    let color = "#10B981";
    let badgeBg = "rgba(16, 185, 129, 0.15)";
    let trendIcon = "trending-up";
    let barGradient = ["#1268D9", "#10B981"];

    if (calculatedScore >= 80) {
      rating = "Exceptional";
      color = "#10B981";
      badgeBg = "rgba(16, 185, 129, 0.15)";
      trendIcon = "trending-up";
      barGradient = ["#1268D9", "#10B981"];
    } else if (calculatedScore >= 50) {
      rating = "Consistent";
      color = "#1268D9";
      badgeBg = "rgba(18, 104, 217, 0.15)";
      trendIcon = "arrow-forward";
      barGradient = ["#1268D9", "#2F8BFF"];
    } else if (calculatedScore >= 75) {
      rating = "Good";
      color = "#3B82F6";
      badgeBg = "rgba(59, 130, 246, 0.15)";
      trendIcon = "trending-up";
      barGradient = ["#F97316", "#3B82F6"];
    } else if (calculatedScore >= 50) {
      rating = "Average";
      color = "#F59E0B";
      badgeBg = "rgba(245, 158, 11, 0.15)";
      trendIcon = "arrow-forward";
      barGradient = ["#EF4444", "#F59E0B"];
    } else {
      rating = "Needs Focus";
      color = "#EF4444";
      badgeBg = "rgba(239, 68, 68, 0.15)";
      trendIcon = "trending-down";
      barGradient = ["#EF4444", "#EA580C"];
    }

    const trendVal = totalTasks > 0 ? Math.round((completedThisWeek / Math.max(1, totalTasks)) * 100) : 0;
    const trendText = trendVal > 0 ? `+${trendVal}%` : "+0%";

    return {
      score: calculatedScore,
      rating,
      color,
      badgeBg,
      trendIcon,
      trendText,
      barGradient,
    };
  }, [data, taskSummary, attendanceSummary, projectSummary]);

  if (loading.employeeDashboard && !employeeDashboard) {
    return (
      <EmployeeLayout navigation={navigation} title="Home">
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loaderText}>Assembling your dashboard…</Text>
        </View>
      </EmployeeLayout>
    );
  }

  let clockTimeDetail = "No records logged today";
  let isCurrentlyPunchedIn = false;

  if (todayAttendance) {
    if (todayAttendance.punchLog && todayAttendance.punchLog.length > 0) {
      const lastSession = todayAttendance.punchLog[todayAttendance.punchLog.length - 1];
      if (!lastSession.punchOutTime) {
        isCurrentlyPunchedIn = true;
        const time = new Date(lastSession.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `In at ${time}`;
      } else {
        isCurrentlyPunchedIn = false;
        const time = new Date(lastSession.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `Out at ${time} · ${todayAttendance.totalHours ? todayAttendance.totalHours.toFixed(1) : "0.0"} hrs`;
      }
    } else {
      if (todayAttendance.punchInTime && !todayAttendance.punchOutTime) {
        isCurrentlyPunchedIn = true;
        const time = new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `In at ${time}`;
      } else if (todayAttendance.punchInTime && todayAttendance.punchOutTime) {
        isCurrentlyPunchedIn = false;
        clockTimeDetail = `Out · ${todayAttendance.totalHours ? todayAttendance.totalHours.toFixed(1) : "0.0"} hrs`;
      }
    }
  }

  return (
    <EmployeeLayout navigation={navigation} title="Home">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[C.primary]} />}
      >
        {/* ── Compact Department Scoping Filter Bar ── */}
        {departmentsList.length > 1 && (
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => setSelectedDeptId("")}
                style={[styles.filterPill, selectedDeptId === "" && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, selectedDeptId === "" && styles.filterPillTextActive]}>
                  All Depts
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

        {/* Profile incomplete stepper banner */}
        {!profileCompletion.isCompleted && (
          <LinearGradient
            colors={["#EFF6FF", "#DBEAFE"]}
            style={styles.incompleteBanner}
          >
            <View style={styles.bannerRow}>
              <Ionicons name="alert-circle" size={18} color="#1268D9" />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>Complete Your Profile</Text>
                <Text style={styles.bannerDesc}>{profileCompletion.percentage}% finished</Text>
              </View>
              <TouchableOpacity
                style={styles.bannerBtn}
                onPress={() => navigation.navigate("EmployeeStack", { screen: "CompleteProfile" })}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* ── Royal Blue Hero Active Shift & Productivity Card ───── */}
        <LinearGradient
          colors={["#082B52", "#1268D9", "#1D7DF2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroScoreCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroScoreLabel}>Business & Productivity Score</Text>
              <View style={styles.heroScoreValueRow}>
                <Text style={styles.heroScoreValue}>{productivityScoreInfo.score}%</Text>
                <Text style={[styles.heroScoreRating, { color: "#E0F2FE" }]}>
                  {productivityScoreInfo.rating}
                </Text>
                <View style={[styles.heroBadge, { backgroundColor: "rgba(255, 255, 255, 0.2)" }]}>
                  <Ionicons name={productivityScoreInfo.trendIcon} size={12} color="#FFFFFF" />
                  <Text style={[styles.heroBadgeText, { color: "#FFFFFF" }]}>
                    {productivityScoreInfo.trendText}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.heroPunchBtn}
              onPress={() => navigation.navigate("CheckInCheckOut")}
              activeOpacity={0.85}
            >
              <View style={styles.heroPunchWhiteBtn}>
                <Ionicons name={isCurrentlyPunchedIn ? "log-out-outline" : "log-in-outline"} size={16} color="#1268D9" style={{ marginRight: 4 }} />
                <Text style={styles.heroPunchWhiteText}>{isCurrentlyPunchedIn ? "Punch Out" : "Punch In"}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Glowing Line Visual / Sparkline Progress Bar */}
          <View style={styles.sparklineArea}>
            <View style={styles.sparklineTrack}>
              <LinearGradient
                colors={productivityScoreInfo.barGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.sparklineBar, { width: `${Math.max(5, Math.min(100, productivityScoreInfo.score))}%` }]}
              />
            </View>
            <View style={styles.sparklineMeta}>
              <Text style={styles.sparklineTime}>{clockTimeDetail}</Text>
              <Text style={styles.sparklineTarget}>Target: 95%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Today's Overview (Oneclick 4-Column Grid) ────────── */}
        <View style={styles.card}>
          <SectionHeader
            title="Today's Overview"
            icon="stats-chart"
            onViewAll={() => navigation.navigate("Tasks")}
          />
          <View style={styles.overviewGrid}>
            <TouchableOpacity
              style={styles.overviewTile}
              onPress={() => navigation.navigate("Tasks")}
              activeOpacity={0.75}
            >
              <Text style={styles.overviewLabel}>Tasks</Text>
              <Text style={styles.overviewNumber}>{taskSummary.pending ?? 28}</Text>
              <View style={[styles.trendPill, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[styles.trendText, { color: "#10B981" }]}>+15%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overviewTile}
              onPress={() => navigation.navigate("Attendance")}
              activeOpacity={0.75}
            >
              <Text style={styles.overviewLabel}>Attendance</Text>
              <Text style={styles.overviewNumber}>{attendanceSummary.present ?? 96}</Text>
              <View style={[styles.trendPill, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[styles.trendText, { color: "#10B981" }]}>+18%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overviewTile}
              onPress={() => navigation.navigate("Projects")}
              activeOpacity={0.75}
            >
              <Text style={styles.overviewLabel}>Projects</Text>
              <Text style={styles.overviewNumber}>{projectSummary.activeProjects ?? 14}</Text>
              <View style={[styles.trendPill, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.trendText, { color: "#3B82F6" }]}>+3%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.overviewTile}
              onPress={() => navigation.navigate("Leave")}
              activeOpacity={0.75}
            >
              <Text style={styles.overviewLabel}>Leaves</Text>
              <Text style={styles.overviewNumber}>{leaveSummary.leaveBalance?.casual ?? 12}</Text>
              <View style={[styles.trendPill, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.trendText, { color: "#F59E0B" }]}>Bal</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Oneclick Quick Actions Grid ────────────────────── */}
        <View style={styles.card}>
          <SectionHeader title="Quick Actions" icon="grid-outline" />
          <View style={styles.quickAccessGrid}>
            <View style={styles.quickAccessRow}>
              {canAccessLeads && (
                <TouchableOpacity
                  style={styles.quickAccessItem}
                  onPress={() => navigation.navigate("LeadsEngine")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIconBg, { backgroundColor: "#EFF6FF" }]}>
                    <Ionicons name="magnet" size={20} color="#1268D9" />
                  </View>
                  <Text style={styles.quickLabel}>Lead CRM</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("MyProjects")} activeOpacity={0.7}>
                <View style={[styles.quickIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="folder-open" size={20} color="#1268D9" />
                </View>
                <Text style={styles.quickLabel}>Projects</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("EmployeeCreateTask")} activeOpacity={0.7}>
                <View style={[styles.quickIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="briefcase" size={20} color="#1268D9" />
                </View>
                <Text style={styles.quickLabel}>Add Task</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("CheckInCheckOut")} activeOpacity={0.7}>
                <View style={[styles.quickIconBg, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="time" size={20} color="#10B981" />
                </View>
                <Text style={styles.quickLabel}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("Payslips")} activeOpacity={0.7}>
                <View style={[styles.quickIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="receipt" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.quickLabel}>Payslip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("EmployeeApplyLeave")} activeOpacity={0.7}>
                <View style={[styles.quickIconBg, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="calendar" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.quickLabel}>Apply Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Lead Management Overview & Shortcuts ────────── */}
        {canAccessLeads && (
          <View style={styles.card}>
            <SectionHeader
              title="Lead Management CRM"
              icon="magnet"
              onViewAll={() => navigation.navigate("LeadsEngine")}
            />

            {/* Quick 4 KPI Row */}
            <View style={styles.leadKpiRow}>
              <TouchableOpacity
                style={[styles.leadKpiTile, { borderLeftColor: "#1268D9" }]}
                onPress={() => navigation.navigate("LeadsEngine")}
                activeOpacity={0.75}
              >
                <Text style={styles.leadKpiNum}>{leadStats.total}</Text>
                <Text style={styles.leadKpiLabel}>Total Leads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.leadKpiTile, { borderLeftColor: "#8B5CF6" }]}
                onPress={() => navigation.navigate("LeadsEngine")}
                activeOpacity={0.75}
              >
                <Text style={styles.leadKpiNum}>{leadStats.contacted}</Text>
                <Text style={styles.leadKpiLabel}>Contacted</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.leadKpiTile, { borderLeftColor: "#EAB308" }]}
                onPress={() => navigation.navigate("LeadsEngine")}
                activeOpacity={0.75}
              >
                <Text style={styles.leadKpiNum}>{leadStats.inProgress}</Text>
                <Text style={styles.leadKpiLabel}>In Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.leadKpiTile, { borderLeftColor: "#10B981" }]}
                onPress={() => navigation.navigate("LeadsEngine")}
                activeOpacity={0.75}
              >
                <Text style={[styles.leadKpiNum, { color: "#10B981" }]}>{leadStats.won}</Text>
                <Text style={styles.leadKpiLabel}>Won</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Leads Preview */}
            {leadsList.length > 0 ? (
              <View style={styles.recentLeadsWrapper}>
                <Text style={styles.recentLeadHeader}>Recent Prospects</Text>
                {leadsList.slice(0, 3).map((lead) => {
                  const sName = lead.status?.name || "New";
                  const sColor = lead.status?.color || (sName.toLowerCase().includes("won") ? "#10B981" : sName.toLowerCase().includes("contact") ? "#3B82F6" : "#06B6D4");
                  return (
                    <TouchableOpacity
                      key={lead.id || lead._id || Math.random().toString()}
                      style={styles.recentLeadItem}
                      onPress={() => navigation.navigate("LeadsEngine")}
                      activeOpacity={0.75}
                    >
                      <View style={styles.recentLeadAvatar}>
                        <Text style={styles.recentLeadAvatarText}>
                          {(lead.name || "LD").slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.recentLeadMeta}>
                        <Text style={styles.recentLeadName} numberOfLines={1}>
                          {lead.name}
                        </Text>
                        <Text style={styles.recentLeadSub} numberOfLines={1}>
                          {lead.company || lead.productService || lead.phone || "Prospect"}
                        </Text>
                      </View>
                      <View style={[styles.recentLeadBadge, { backgroundColor: `${sColor}18` }]}>
                        <View style={[styles.recentLeadDot, { backgroundColor: sColor }]} />
                        <Text style={[styles.recentLeadBadgeText, { color: sColor }]}>{sName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Direct Open Button */}
            <TouchableOpacity
              style={styles.openLeadsPipelineBtn}
              onPress={() => navigation.navigate("LeadsEngine")}
              activeOpacity={0.8}
            >
              <Ionicons name="magnet-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.openLeadsPipelineText}>Open Leads Pipeline & CRM</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Leave Balance (Compact Card) ─────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            title="Leave Balance"
            icon="document-text-outline"
            onViewAll={() => navigation.navigate("Leave")}
          />
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="leaf-outline" size={14} color="#10b981" />
              </View>
              <Text style={styles.kpiValue}>
                {leaveSummary.leaveBalance?.casual ?? 12}
                <Text style={styles.kpiValueSub}>/{leaveSummary.leaveLimits?.casual ?? 12}</Text>
              </Text>
              <Text style={styles.kpiLabel}>Casual</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#fef2f2" }]}>
                <Ionicons name="medical-outline" size={14} color="#ef4444" />
              </View>
              <Text style={styles.kpiValue}>
                {leaveSummary.leaveBalance?.sick ?? 10}
                <Text style={styles.kpiValueSub}>/{leaveSummary.leaveLimits?.sick ?? 10}</Text>
              </Text>
              <Text style={styles.kpiLabel}>Sick</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconBox, { backgroundColor: "#f5f3ff" }]}>
                <Ionicons name="briefcase-outline" size={14} color="#8b5cf6" />
              </View>
              <Text style={styles.kpiValue}>
                {leaveSummary.leaveBalance?.annual ?? 15}
                <Text style={styles.kpiValueSub}>/{leaveSummary.leaveLimits?.annual ?? 15}</Text>
              </Text>
              <Text style={styles.kpiLabel}>Earned</Text>
            </View>
          </View>
        </View>

        {/* ── Upcoming Events / Announcements (Compact) ───── */}
        <View style={[styles.card, { marginBottom: 24 }]}>
          <SectionHeader
            title="Events & Announcements"
            icon="megaphone-outline"
            onViewAll={() => navigation.navigate("EmployeeHolidayCalendar")}
          />
          <View style={styles.eventsContainer}>
            {/* Real Announcements */}
            {announcements.slice(0, 3).map((ann, idx) => (
              <TouchableOpacity
                key={`ann-${idx}`}
                style={[styles.eventCard, idx < announcements.slice(0, 3).length - 1 && styles.eventCardBorder]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate("EmployeeAnnouncementDetails", { announcement: ann })}
              >
                <View style={[styles.eventDateBlock, { backgroundColor: "#fffbeb" }]}>
                  <Text style={[styles.eventDateDay, { color: "#d97706" }]}>
                    {ann.createdAt ? new Date(ann.createdAt).getDate() : "!"}
                  </Text>
                  <Text style={[styles.eventDateMonth, { color: "#b45309" }]}>
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "NEW"}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{ann.title}</Text>
                  <Text style={styles.eventTime} numberOfLines={1}>{ann.description || "Company Announcement"}</Text>
                </View>
                <View style={[styles.eventBadge, { backgroundColor: "#fffbeb" }]}>
                  <Text style={[styles.eventBadgeText, { color: "#d97706" }]}>Notice</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Real Holidays */}
            {holidays.slice(0, 3).map((holiday, idx) => (
              <TouchableOpacity
                key={`hol-${idx}`}
                style={[styles.eventCard, (idx < holidays.slice(0, 3).length - 1 || announcements.length > 0) && styles.eventCardBorder]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate("EmployeeHolidayDetails", { holiday })}
              >
                <View style={[styles.eventDateBlock, { backgroundColor: "#fef2f2" }]}>
                  <Text style={[styles.eventDateDay, { color: "#ef4444" }]}>
                    {new Date(holiday.date).getDate()}
                  </Text>
                  <Text style={[styles.eventDateMonth, { color: "#991b1b" }]}>
                    {new Date(holiday.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{holiday.name}</Text>
                  <Text style={styles.eventTime} numberOfLines={1}>Public Holiday</Text>
                </View>
                <View style={[styles.eventBadge, { backgroundColor: "#fef2f2" }]}>
                  <Text style={[styles.eventBadgeText, { color: "#ef4444" }]}>Holiday</Text>
                </View>
              </TouchableOpacity>
            ))}

            {announcements.length === 0 && holidays.length === 0 && (
              <Text style={styles.emptyText}>
                No upcoming events or announcements.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </EmployeeLayout>
  );
}

// ── Compact Premium Stylesheet ───────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    minHeight: 350,
  },
  loaderText: {
    marginTop: 8,
    fontSize: 12,
    color: C.sub,
    fontFamily: FONTS.bodyMedium,
  },

  // Filters (Compact)
  filterBar: {
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "750",
    color: "#64748b",
    fontFamily: FONTS.bodyMedium,
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontFamily: FONTS.bodyBold,
  },

  // Profile incomplete banner (Compact)
  incompleteBanner: {
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffedd5",
    shadowColor: "#ea580c",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  bannerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#9a3412",
  },
  bannerDesc: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10.5,
    color: "#c2410c",
    marginTop: 1,
  },
  bannerBtn: {
    backgroundColor: "#ea580c",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bannerBtnText: {
    fontFamily: FONTS.bodyBold,
    color: "#ffffff",
    fontSize: 11,
  },

  // Premium Punch Card (Compact)
  checkInCard: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#C2410C",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  leafWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-20deg" }],
  },
  checkInLeft: { flex: 1 },
  punchBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  checkInLabel: {
    fontFamily: FONTS.bodyBold,
    color: "#ffffff",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  checkInTime: {
    fontFamily: FONTS.displayBold,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
  },
  // ── Oneclick Hero Business Score Card Styles ──────────────
  heroScoreCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroScoreLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroScoreValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  heroScoreValue: {
    fontSize: 32,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  heroScoreRating: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
  },
  heroPunchBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  heroPunchWhiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroPunchWhiteText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#0B57D0",
    fontWeight: "700",
  },
  heroPunchGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroPunchText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  sparklineArea: {
    marginTop: 14,
  },
  sparklineTrack: {
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  sparklineBar: {
    height: "100%",
    width: "92%",
    borderRadius: 3,
  },
  sparklineMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sparklineTime: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  sparklineTarget: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: "#1268D9",
  },

  // ── Oneclick Overview Grid Styles ──────────────────────────
  overviewGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  overviewTile: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "flex-start",
  },
  overviewLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  overviewNumber: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    fontWeight: "bold",
    marginVertical: 2,
  },
  trendPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
  },

  // Upcoming Event Card Styles
  upcomingEventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  upcomingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  upcomingMeta: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  upcomingTime: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#94A3B8",
    marginTop: 2,
  },

  // Cards layout (Compact)
  card: {
    backgroundColor: C.card,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
    fontWeight: "bold",
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAll: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: C.primary,
  },

  // Attendance Grid (Compact)
  attendanceGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  attendanceMiniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  miniCardCount: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: C.text,
    fontWeight: "bold",
  },
  miniCardLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: C.sub,
    marginTop: 1,
  },

  // KPI Grid (Compact 3 columns)
  kpiGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 3.5,
    borderBottomColor: C.border,
  },
  kpiIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  kpiValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: C.text,
    fontWeight: "bold",
  },
  kpiValueSub: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: C.muted,
  },
  kpiLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9.5,
    color: C.sub,
    marginTop: 2,
    textAlign: "center",
  },

  // Quick Access Grid (Compact squircles)
  quickAccessGrid: {
    marginTop: 4,
  },
  quickAccessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAccessItem: {
    flex: 1,
    alignItems: "center",
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.01,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0.5,
    borderWidth: 1,
    borderColor: "#f9fafb",
  },
  quickLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9.5,
    color: C.sub,
    textAlign: "center",
  },

  // Event List (Compact)
  eventsContainer: {
    marginTop: 4,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  eventCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  eventDateBlock: {
    width: 36,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  eventDateDay: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    fontWeight: "bold",
  },
  eventDateMonth: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8.5,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: C.text,
  },
  eventTime: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    color: C.muted,
    marginTop: 1,
  },
  eventBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  eventBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8.5,
  },
  emptyText: {
    textAlign: "center",
    color: C.muted,
    paddingVertical: 16,
    fontSize: 11,
    fontStyle: "italic",
  },

  // ── Lead Management CRM Card Styles ─────────────────────────
  leadKpiRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  leadKpiTile: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  leadKpiNum: {
    fontSize: 15,
    fontFamily: FONTS.headerBold,
    color: "#0F172A",
  },
  leadKpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
    marginTop: 1,
  },
  recentLeadsWrapper: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  recentLeadHeader: {
    fontSize: 11,
    fontFamily: FONTS.headerSemiBold,
    color: "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  recentLeadItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  recentLeadAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  recentLeadAvatarText: {
    fontSize: 10,
    fontFamily: FONTS.headerBold,
    color: "#1268D9",
  },
  recentLeadMeta: {
    flex: 1,
    marginRight: 6,
  },
  recentLeadName: {
    fontSize: 12,
    fontFamily: FONTS.headerSemiBold,
    color: "#0F172A",
  },
  recentLeadSub: {
    fontSize: 10,
    fontFamily: FONTS.bodyRegular,
    color: "#94A3B8",
    marginTop: 1,
  },
  recentLeadBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  recentLeadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  recentLeadBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.headerSemiBold,
  },
  openLeadsPipelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1268D9",
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  openLeadsPipelineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.headerBold,
  },
});
