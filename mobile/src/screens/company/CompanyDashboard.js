import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Image,
  Modal,
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import DashboardSkeleton from "../../components/DashboardSkeleton";
import { useAuth } from "../../context/AuthContext";
import {
  getCompanyDashboardStatsApi,
  getDashboardAttendanceDetailsApi,
  getCompanyAuditLogsApi,
  getTasksApi,
  getProjectsApi
} from "../../api/companyService";
import leadsService from "../../api/leadsService";
import { getMyNotificationsApi } from "../../api/notificationService";
import { getMyTodayApi, punchInApi, punchOutApi } from "../../api/attendanceService";
import { captureGPSLocation } from "../../utils/locationService";
import { COLORS, SHADOWS, ROUNDING, SPACING, FONTS } from "../../theme/tokens";
import { useFocusEffect } from "@react-navigation/native";

const CompanyDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const isCompanyAdmin = user?.role === "CompanyAdmin";

  const [punchLoading, setPunchLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("this_month");
  const [filterVisible, setFilterVisible] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState({ visible: false, status: null });

  // Fetch Attendance (Only if not CompanyAdmin)
  const { data: todayRecord, refetch: refetchAttendance } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: async () => {
      const { data } = await getMyTodayApi();
      return data?.attendance || null;
    },
    enabled: !isCompanyAdmin,
  });

  // Fetch Attendance Details Modal
  const { data: attendanceDetails, isFetching: loadingDetails } = useQuery({
    queryKey: ['attendanceDetails', timeRange, attendanceModal.status],
    queryFn: async () => {
      if (!attendanceModal.status) return [];
      let dateToFetch = new Date().toISOString().slice(0, 10);
      if (timeRange === "yesterday") {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        dateToFetch = y.toISOString().slice(0, 10);
      }
      const res = await getDashboardAttendanceDetailsApi({ date: dateToFetch, status: attendanceModal.status });
      return res.data?.data || [];
    },
    enabled: attendanceModal.visible && !!attendanceModal.status
  });

  // Fetch Main Dashboard Data
  const { data: dashboardData, isLoading, error: queryError, refetch: refetchDashboard, isRefetching } = useQuery({
    queryKey: ['companyDashboard', timeRange],
    queryFn: async () => {
      const [statsRes, notifRes, logsRes, tasksRes, templatesRes, projsRes, leadsRes] = await Promise.all([
        getCompanyDashboardStatsApi({ timeRange }),
        getMyNotificationsApi(),
        getCompanyAuditLogsApi().catch(() => ({ data: [] })),
        getTasksApi().catch(() => ({ data: { tasks: [] } })),
        getTasksApi({ isTemplate: true }).catch(() => ({ data: { tasks: [] } })),
        getProjectsApi().catch(() => ({ data: { projects: [] } })),
        leadsService.getLeads({ limit: 20 }).catch(() => []),
      ]);

      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      switch (timeRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "yesterday":
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "last_7_days":
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_month":
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
      }

      const extractArray = (res, key) => {
        if (!res?.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (key && Array.isArray(res.data[key])) return res.data[key];
        if (Array.isArray(res.data.data)) return res.data.data;
        return [];
      };

      const rawLogs = extractArray(logsRes, "logs");
      const activityLogs = rawLogs.slice(0, 5);

      const tasksData = extractArray(tasksRes, "tasks");
      const templatesData = extractArray(templatesRes, "tasks");

      const rawTasks = [
        ...tasksData,
        ...templatesData.map((t) => ({ ...t, isTemplate: true })),
      ];
      const recentTasks = [...rawTasks]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

      const totalTasks = rawTasks.length;
      const completedTasks = rawTasks.filter(
        (t) => t.status === "complete" || t.status === "late_complete"
      ).length;
      const overdueTasks = rawTasks.filter(
        (t) =>
          t.endDateTime &&
          new Date(t.endDateTime) < new Date() &&
          t.status !== "complete" &&
          t.status !== "late_complete"
      ).length;
      const pendingTasks = totalTasks - completedTasks;
      const taskStatsObj = { totalTasks, pendingTasks, completedTasks, overdueTasks };

      const rawProjs = extractArray(projsRes, "projects");
      const recentProjects = [...rawProjs]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

      // Lead Engine stats
      const rawLeads = Array.isArray(leadsRes?.data) ? leadsRes.data : Array.isArray(leadsRes) ? leadsRes : [];
      const totalLeads = rawLeads.length;
      const wonLeads = rawLeads.filter(l => l.status?.name?.toLowerCase().includes("won")).length;
      const pipelineVal = rawLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);
      const leadStatsObj = {
        totalLeads,
        wonLeads,
        pipelineVal,
        winRatio: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
      };
      const recentLeads = rawLeads.slice(0, 3);

      return {
        stats: statsRes?.data || {},
        unreadCount: notifRes?.data?.unreadCount || 0,
        activityLogs,
        recentTasks,
        taskStatsObj,
        recentProjects,
        totalFilteredProjects: rawProjs.length,
        leadStatsObj,
        recentLeads,
      };
    },
  });

  const stats = dashboardData?.stats;
  const unreadCount = dashboardData?.unreadCount || 0;
  const activityLogs = dashboardData?.activityLogs || [];
  const recentTasks = dashboardData?.recentTasks || [];
  const taskStatsObj = dashboardData?.taskStatsObj || null;
  const recentProjects = dashboardData?.recentProjects || [];
  const totalFilteredProjects = dashboardData?.totalFilteredProjects || 0;
  const leadStatsObj = dashboardData?.leadStatsObj || { totalLeads: 0, wonLeads: 0, pipelineVal: 0, winRatio: 0 };
  const recentLeads = dashboardData?.recentLeads || [];
  const errorMsg = queryError?.response?.data?.message || queryError?.message || "";

  const handleRefresh = async () => {
    if (!isCompanyAdmin) refetchAttendance();
    await refetchDashboard();
  };

  useFocusEffect(
    useCallback(() => {
      if (!isCompanyAdmin) refetchAttendance();
      refetchDashboard();
    }, [])
  );

  const handleDashboardPunch = async (action) => {
    try {
      setPunchLoading(true);
      const coords = await captureGPSLocation();
      if (!coords) {
        setPunchLoading(false);
        return;
      }

      if (action === "in") {
        await punchInApi({ punchInLocation: coords });
        Alert.alert("Success", "Clocked-In successfully!");
      } else {
        await punchOutApi({ punchOutLocation: coords });
        Alert.alert("Success", "Clocked-Out successfully!");
      }
      queryClient.invalidateQueries(['todayAttendance']);
      queryClient.invalidateQueries(['companyDashboard']);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Punch action failed");
    } finally {
      setPunchLoading(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const totalEmp = stats?.totalEmployees || 0;
  const presentEmp = stats?.presentToday || 0;
  const absentEmp = stats?.absentToday || 0;
  const leaveEmp = stats?.onLeaveToday || 0;
  const pendingLeaves = stats?.pendingLeaveRequests || 0;

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      showSearch={false}
      unreadNotifications={unreadCount}
      headerTitle="Company Dashboard"
      headerRightElement={
        <TouchableOpacity
          onPress={() => setFilterVisible(true)}
          style={{ marginRight: 10, padding: 4 }}
          activeOpacity={0.7}
        >
          <Ionicons name="funnel-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
          >
            {errorMsg ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Hero Welcome Card */}
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              style={styles.heroCard}
            >
              <View style={styles.heroLeft}>
                <Text style={styles.heroSubtitle}>{user?.companyName || "Company Overview"}</Text>
                <Text style={styles.heroTitle}>Welcome, {user?.name?.split(" ")[0] || "Admin"}! 👋</Text>
                
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{totalEmp} Active Employees</Text>
                  </View>
                  <View style={[styles.heroBadge, { backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "rgba(16, 185, 129, 0.4)" }]}>
                    <Text style={[styles.heroBadgeText, { color: "#10B981" }]}>{presentEmp} Present Today</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.heroAddBtn} 
                onPress={() => navigation.navigate("DashboardStack", { screen: "AddEmployee" })}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Quick Action Shortcuts Grid */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => navigation.navigate("DashboardStack", { screen: "LeadsEngine", params: { screen: "LeadsDashboard" } })}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
                  <Ionicons name="magnet-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>Lead CRM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => navigation.navigate("DashboardStack", { screen: "AddEmployee" })}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="person-add-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>Add Staff</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => navigation.navigate("DashboardStack", { screen: "CompanyCreateTask" })}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="checkbox-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>New Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => navigation.navigate("DashboardStack", { screen: "CompanyAttendance" })}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="calendar-outline" size={18} color="#10B981" />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutBtn}
                onPress={() => navigation.navigate("DashboardStack", { screen: "LeaveRequests" })}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="document-text-outline" size={18} color="#EA580C" />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>Leaves</Text>
              </TouchableOpacity>
            </View>

            {/* Metrics Overview Section */}
            <Text style={styles.sectionHeaderTitle}>ORGANIZATION METRICS</Text>

            <View style={styles.metricsGrid}>
              {/* Total Staff */}
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate("DashboardStack", { screen: "EmployeeList" })}
                activeOpacity={0.85}
              >
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconBox, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
                    <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.metricValue}>{totalEmp}</Text>
                </View>
                <Text style={styles.metricLabel}>Total Employees</Text>
                <Text style={styles.metricSub}>Active workforce count</Text>
              </TouchableOpacity>

              {/* Present Today */}
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => setAttendanceModal({ visible: true, status: "present" })}
                activeOpacity={0.85}
              >
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconBox, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#10B981" }]}>{presentEmp}</Text>
                </View>
                <Text style={styles.metricLabel}>Present Today</Text>
                <Text style={styles.metricSub}>Clocked-in employees</Text>
              </TouchableOpacity>

              {/* On Leave */}
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate("DashboardStack", { screen: "LeaveRequests" })}
                activeOpacity={0.85}
              >
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconBox, { backgroundColor: "#EFF6FF" }]}>
                    <Ionicons name="airplane-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#2563EB" }]}>{leaveEmp}</Text>
                </View>
                <Text style={styles.metricLabel}>On Leave</Text>
                <Text style={styles.metricSub}>{pendingLeaves} pending approvals</Text>
              </TouchableOpacity>

              {/* Absent Today */}
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => setAttendanceModal({ visible: true, status: "absent" })}
                activeOpacity={0.85}
              >
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconBox, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#EF4444" }]}>{absentEmp}</Text>
                </View>
                <Text style={styles.metricLabel}>Absent Today</Text>
                <Text style={styles.metricSub}>Unaccounted staff</Text>
              </TouchableOpacity>
            </View>

            {/* Task Overview Card */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="albums-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.cardHeaderTitle}>Task Progress Summary</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("DashboardStack", { screen: "TaskBoard" })}>
                  <Text style={styles.cardHeaderLink}>View Board</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.taskStatsRow}>
                <View style={styles.taskStatCell}>
                  <Text style={styles.taskStatVal}>{taskStatsObj?.totalTasks || 0}</Text>
                  <Text style={styles.taskStatLbl}>Total Tasks</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#10B981" }]}>{taskStatsObj?.completedTasks || 0}</Text>
                  <Text style={styles.taskStatLbl}>Completed</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#2563EB" }]}>{taskStatsObj?.pendingTasks || 0}</Text>
                  <Text style={styles.taskStatLbl}>Pending</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#EF4444" }]}>{taskStatsObj?.overdueTasks || 0}</Text>
                  <Text style={styles.taskStatLbl}>Overdue</Text>
                </View>
              </View>
            </View>

            {/* Lead CRM Pipeline & Recent Inquiries Card */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="magnet-outline" size={18} color="#F97316" style={{ marginRight: 6 }} />
                  <Text style={styles.cardHeaderTitle}>Lead Pipeline Summary</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("DashboardStack", { screen: "LeadsEngine", params: { screen: "LeadsDashboard" } })}>
                  <Text style={styles.cardHeaderLink}>View CRM →</Text>
                </TouchableOpacity>
              </View>

              {/* Lead 4-Stat Metric Row */}
              <View style={styles.taskStatsRow}>
                <View style={styles.taskStatCell}>
                  <Text style={styles.taskStatVal}>{leadStatsObj?.totalLeads || 0}</Text>
                  <Text style={styles.taskStatLbl}>Total Leads</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#10B981" }]}>{leadStatsObj?.wonLeads || 0}</Text>
                  <Text style={styles.taskStatLbl}>Won Deals</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#B45309" }]}>
                    {leadStatsObj?.pipelineVal ? `₹${(leadStatsObj.pipelineVal / 100000).toFixed(1)}L` : "₹0"}
                  </Text>
                  <Text style={styles.taskStatLbl}>Valuation</Text>
                </View>
                <View style={styles.taskStatCell}>
                  <Text style={[styles.taskStatVal, { color: "#8B5CF6" }]}>{leadStatsObj?.winRatio || 0}%</Text>
                  <Text style={styles.taskStatLbl}>Win Ratio</Text>
                </View>
              </View>

              {/* Recent Inquiries Feed */}
              {recentLeads.length === 0 ? (
                <Text style={styles.emptyText}>No leads recorded yet.</Text>
              ) : (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {recentLeads.map((l, idx) => {
                    const statusColor = l.status?.color || "#F97316";
                    return (
                      <TouchableOpacity
                        key={l.id || l._id || idx}
                        style={styles.compactDashLeadCard}
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate("DashboardStack", {
                            screen: "LeadsEngine",
                            params: { screen: "LeadDetails", params: { leadId: l.id || l._id } },
                          })
                        }
                      >
                        <View style={[styles.dashLeadStrip, { backgroundColor: statusColor }]} />
                        <View style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={styles.dashLeadName} numberOfLines={1}>{l.name}</Text>
                            {l.estimatedValue ? (
                              <Text style={styles.dashLeadValue}>₹{Number(l.estimatedValue).toLocaleString()}</Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                            <Text style={styles.dashLeadMeta} numberOfLines={1}>
                              {l.company ? `${l.company} • ` : ""}{l.source || "Direct"}
                            </Text>
                            <View style={[styles.dashLeadBadge, { backgroundColor: statusColor + "15", borderColor: statusColor }]}>
                              <Text style={[styles.dashLeadBadgeText, { color: statusColor }]}>{l.status?.name || "New"}</Text>
                            </View>
                          </View>
                        </View>
                        {l.whatsappPhone ? (
                          <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 6, gap: 4 }}>
                            <TouchableOpacity
                              style={styles.dashLeadChatBtn}
                              onPress={() => {
                                const clean = l.whatsappPhone.replace(/[^0-9]/g, "");
                                Linking.openURL(`https://wa.me/${clean}?text=${encodeURIComponent("Hello " + (l.name || "") + ", thank you for connecting with OneClick HRMS!")}`);
                              }}
                            >
                              <Ionicons name="logo-whatsapp" size={12} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.dashLeadCallBtn}
                              onPress={() => Linking.openURL(`tel:${l.whatsappPhone}`)}
                            >
                              <Ionicons name="call" size={12} color="#2563EB" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Recent Audit Logs / System Activities */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="flash-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.cardHeaderTitle}>Recent System Activities</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("DashboardStack", { screen: "CompanyAuditLogs" })}>
                  <Text style={styles.cardHeaderLink}>View Logs</Text>
                </TouchableOpacity>
              </View>

              {activityLogs.length === 0 ? (
                <Text style={styles.emptyText}>No recent activity logs recorded.</Text>
              ) : (
                activityLogs.map((log, idx) => (
                  <View key={log._id || idx} style={styles.logRowItem}>
                    <View style={styles.logAvatar}>
                      <Text style={styles.logAvatarText}>
                        {(log.performedBy?.name?.[0] || "A").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logText} numberOfLines={1}>
                        {log.performedBy?.name || "System Admin"} {log.action?.replace(/_/g, " ").toLowerCase()}
                      </Text>
                      <Text style={styles.logTime}>{timeAgo(log.timestamp || log.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Time Filter Modal */}
          <Modal
            visible={filterVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFilterVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setFilterVisible(false)}
            >
              <View style={styles.filterModalCard}>
                <Text style={styles.filterModalTitle}>Filter Dashboard Time Range</Text>
                {[
                  { label: "Today", value: "today" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "Last 7 Days", value: "last_7_days" },
                  { label: "This Month", value: "this_month" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.filterOptionRow,
                      timeRange === item.value && styles.filterOptionRowActive,
                    ]}
                    onPress={() => {
                      setTimeRange(item.value);
                      setFilterVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        timeRange === item.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {timeRange === item.value && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Attendance Details Modal */}
          <Modal
            visible={attendanceModal.visible}
            transparent
            animationType="slide"
            onRequestClose={() => setAttendanceModal({ visible: false, status: null })}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.detailsModalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {attendanceModal.status === "present" ? "Present Staff Today" : "Absent Staff Today"}
                  </Text>
                  <TouchableOpacity onPress={() => setAttendanceModal({ visible: false, status: null })}>
                    <Ionicons name="close" size={20} color={COLORS.darkNavy} />
                  </TouchableOpacity>
                </View>

                {loadingDetails ? (
                  <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {(!attendanceDetails || attendanceDetails.length === 0) ? (
                      <Text style={styles.emptyText}>No record found for this category.</Text>
                    ) : (
                      (Array.isArray(attendanceDetails) ? attendanceDetails : []).map((emp, idx) => (
                        <View key={emp._id || idx} style={styles.staffDetailRow}>
                          <Text style={styles.staffDetailName}>{emp.name || emp.firstName}</Text>
                          <Text style={styles.staffDetailDept}>{emp.departmentName || emp.departmentId?.name || "General"}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
        </View>
      )}
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#EF4444",
  },
  heroCard: {
    borderRadius: ROUNDING.lg,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  heroLeft: {
    flex: 1,
  },
  heroSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: "#94A3B8",
  },
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
    marginTop: 2,
    letterSpacing: -0.2,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  heroBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: COLORS.primary,
  },
  heroAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    ...SHADOWS.sm,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  shortcutIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  shortcutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    color: COLORS.darkNavy,
    textAlign: "center",
  },
  sectionHeaderTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: COLORS.text.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    color: COLORS.darkNavy,
  },
  metricLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  metricSub: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  cardHeaderLink: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  taskStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  taskStatCell: {
    alignItems: "center",
  },
  taskStatVal: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: COLORS.darkNavy,
  },
  taskStatLbl: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  logRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  logAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
  logText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: COLORS.darkNavy,
  },
  logTime: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: "center",
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  filterModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  filterModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.darkNavy,
    marginBottom: 14,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterOptionRowActive: {
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  filterOptionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  filterOptionTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  detailsModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.darkNavy,
  },
  staffDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  staffDetailName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  staffDetailDept: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: COLORS.text.muted,
  },
  compactDashLeadCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
  },
  dashLeadStrip: {
    width: 3.5,
  },
  dashLeadName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.darkNavy,
  },
  dashLeadValue: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  dashLeadMeta: {
    fontSize: 10,
    color: "#64748B",
  },
  dashLeadBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  dashLeadBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  dashLeadChatBtn: {
    backgroundColor: "#10B981",
    padding: 5,
    borderRadius: 6,
  },
  dashLeadCallBtn: {
    backgroundColor: "#EFF6FF",
    padding: 5,
    borderRadius: 6,
  },
});

export default CompanyDashboard;
