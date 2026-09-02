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
  Alert,
  Image,
  Modal,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import HRHeader from "../../components/HRHeader";
import { getHRDashboardApi } from "../../api/hrService";
import { getMyTodayApi } from "../../api/attendanceService";
import leadsService from "../../api/leadsService";
import { FONTS } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import Svg, { G, Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 24 - CARD_MARGIN) / 2;

// ── Pure SVG Donut Chart Component ─────────────────────────────
const DonutChart = ({ total, present, absent, leave, halfDay }) => {
  const size = 90;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = total || 1;
  const pPct = (present / safeTotal) * circumference;
  const aPct = (absent / safeTotal) * circumference;
  const lPct = (leave / safeTotal) * circumference;
  const hPct = (halfDay / safeTotal) * circumference;

  return (
    <View style={styles.donutContainer}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {present > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${pPct} ${circumference - pPct}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
          {absent > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              strokeDasharray={`${aPct} ${circumference - aPct}`}
              strokeDashoffset={-pPct}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
          {leave > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeDasharray={`${lPct} ${circumference - lPct}`}
              strokeDashoffset={-(pPct + aPct)}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
          {halfDay > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#8b5cf6"
              strokeWidth={strokeWidth}
              strokeDasharray={`${hPct} ${circumference - hPct}`}
              strokeDashoffset={-(pPct + aPct + lPct)}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
        </G>
      </Svg>
      <View style={styles.donutCenterLabel}>
        <Text style={styles.donutCenterCount}>{total}</Text>
        <Text style={styles.donutCenterText}>Total</Text>
      </View>
    </View>
  );
};

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

const HRDashboardScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessEmployees = hasPermission("employees", "view") || hasPermission("employees") || hasPermission("teamMembers");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessProjects = hasPermission("projects", "view") || hasPermission("projects");
  const canAccessPayroll = hasPermission("payroll", "view") || hasPermission("payroll");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [todayRecord, setTodayRecord] = useState(null);
  const [leadsList, setLeadsList] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);

  // Floating Action Button & Modals State
  const [fabOpen, setFabOpen] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    notes: "",
  });

  const fetchTodayAttendance = async () => {
    try {
      const { data: res } = await getMyTodayApi();
      if (res && res.success) {
        setTodayRecord(res.attendance || null);
      }
    } catch (err) {
      console.log("Failed to fetch user's today attendance for dashboard:", err);
    }
  };

  const fetchLeads = async () => {
    if (!canAccessLeads) return;
    try {
      const [leadsRes, statusesRes] = await Promise.allSettled([
        leadsService.getLeads(),
        leadsService.getStatuses(),
      ]);

      if (leadsRes.status === "fulfilled") {
        const arr = Array.isArray(leadsRes.value) ? leadsRes.value : leadsRes.value?.data || [];
        setLeadsList(arr);
      }

      if (statusesRes.status === "fulfilled") {
        const sArr = Array.isArray(statusesRes.value) ? statusesRes.value : statusesRes.value?.data || [];
        setLeadStatuses(sArr.filter((s) => s?.name && s.name.trim().toLowerCase() !== "aa"));
      }
    } catch (_) {}
  };

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await getHRDashboardApi();
      if (response.data && response.data.success) {
        setData(response.data);
      } else {
        setError("Failed to parse dashboard data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to retrieve dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      fetchTodayAttendance();
      if (canAccessLeads) {
        fetchLeads();
      }
    }, [canAccessLeads])
  );

  const stats = data?.stats;

  // Lead metrics
  const leadStats = {
    total: leadsList.length,
    contacted: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("contact")).length,
    inProgress: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("progress") || (l.status?.name || "").toLowerCase().includes("qualif")).length,
    won: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("won")).length,
  };

  const handleSaveLead = async () => {
    if (!newLeadForm.name.trim()) {
      Alert.alert("Required", "Please enter lead name");
      return;
    }
    if (!newLeadForm.phone.trim()) {
      Alert.alert("Required", "Please enter phone number");
      return;
    }

    setSavingLead(true);
    try {
      const activeStatusId = newLeadForm.statusId || (leadStatuses[0] ? (leadStatuses[0].id || leadStatuses[0]._id) : undefined);
      const payload = {
        name: newLeadForm.name.trim(),
        phone: newLeadForm.phone.trim(),
        whatsappPhone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim(),
        company: newLeadForm.company.trim(),
        productService: newLeadForm.productService.trim(),
        source: newLeadForm.source || "Walk-in",
        statusId: activeStatusId,
        estimatedValue: newLeadForm.estimatedValue ? Number(newLeadForm.estimatedValue) : undefined,
        notes: newLeadForm.notes.trim(),
        whatsappOptIn: true,
      };

      await leadsService.createLead(payload);
      Alert.alert("Success", "Lead added successfully!");
      setShowAddLeadModal(false);
      setNewLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Walk-in",
        statusId: "",
        estimatedValue: "",
        notes: "",
      });
      fetchLeads();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save lead");
    } finally {
      setSavingLead(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <HRHeader title="HR Dashboard" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1268D9" />
          <Text style={styles.loadingText}>Loading HR Insights...</Text>
        </View>
      </View>
    );
  }

  let isCurrentlyPunchedIn = false;
  let clockTimeDetail = "No records logged today";

  if (todayRecord) {
    if (todayRecord.punchLog && todayRecord.punchLog.length > 0) {
      const lastSession = todayRecord.punchLog[todayRecord.punchLog.length - 1];
      if (!lastSession.punchOutTime) {
        isCurrentlyPunchedIn = true;
        const time = new Date(lastSession.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `In at ${time}`;
      } else {
        isCurrentlyPunchedIn = false;
        const time = new Date(lastSession.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `Last out at ${time} (Total: ${todayRecord.totalHours ? formatWorkingHours(todayRecord.totalHours) : "0 hr 0 min"})`;
      }
    } else {
      if (todayRecord.punchInTime && !todayRecord.punchOutTime) {
        isCurrentlyPunchedIn = true;
        const time = new Date(todayRecord.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `In at ${time}`;
      } else if (todayRecord.punchInTime && todayRecord.punchOutTime) {
        isCurrentlyPunchedIn = false;
        const time = new Date(todayRecord.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        clockTimeDetail = `Last out at ${time} (Total: ${todayRecord.totalHours ? formatWorkingHours(todayRecord.totalHours) : "0 hr 0 min"})`;
      }
    }
  }

  return (
    <View style={styles.container}>
      <HRHeader title="HR Dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchDashboard(true);
              fetchTodayAttendance();
              fetchLeads();
            }}
            tintColor="#1268D9"
            colors={["#1268D9"]}
          />
        }
      >
        <View style={styles.topBackgroundEffect} />

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color="#e11d48" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={["#082B52", "#1268D9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkInCard}
        >
          <Ionicons 
            name="time-outline" 
            size={130} 
            color="rgba(255, 255, 255, 0.05)" 
            style={styles.leafWatermark} 
          />

          <View style={styles.checkInLeft}>
            <Text style={styles.checkInLabel}>
              {isCurrentlyPunchedIn ? "Clocked In" : "Clocked Out"}
            </Text>
            
            <Text style={styles.checkInTime}>
              {todayRecord && isCurrentlyPunchedIn && todayRecord.punchLog?.length > 0
                ? new Date(todayRecord.punchLog[todayRecord.punchLog.length - 1].punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>

            <Text style={styles.checkInDetail}>
              {clockTimeDetail}
            </Text>

            <Text style={styles.checkInDate}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short"
              })}
            </Text>
          </View>

          {canAccessAttendance && (
            <TouchableOpacity 
              style={[
                styles.checkInBtn,
                isCurrentlyPunchedIn && { backgroundColor: "#EF4444", borderColor: "#EF4444" },
              ]} 
              onPress={() => navigation.navigate("CheckInCheckOut")} 
              activeOpacity={0.9}
            >
              {isCurrentlyPunchedIn ? (
                <>
                  <Ionicons name="log-out-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.checkInBtnText, { color: "#FFFFFF" }]}>Punch Out</Text>
                </>
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={14} color="#1268D9" style={{ marginRight: 4 }} />
                  <Text style={[styles.checkInBtnText, { color: "#1268D9" }]}>Punch In</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.overviewHeaderLeft}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <Text style={styles.overviewSubDate}>
              {new Date().toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                weekday: "short"
              })}
            </Text>
          </View>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
        </View>

        <View style={styles.todayGrid}>
          <View style={styles.todayMiniCard}>
            <View style={[styles.todayIconBg, { backgroundColor: "rgba(15, 118, 110, 0.06)" }]}>
              <Ionicons name="people-outline" size={14} color="#C2410C" />
            </View>
            <Text style={styles.todayCardCount}>{stats?.totalEmployees || 0}</Text>
            <Text style={styles.todayCardLabel} numberOfLines={1}>Staff</Text>
          </View>

          <View style={styles.todayMiniCard}>
            <View style={[styles.todayIconBg, { backgroundColor: "#ecfdf5" }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
            </View>
            <Text style={styles.todayCardCount}>{stats?.presentToday || 0}</Text>
            <Text style={styles.todayCardLabel} numberOfLines={1}>Present</Text>
          </View>

          <View style={styles.todayMiniCard}>
            <View style={[styles.todayIconBg, { backgroundColor: "#fffbeb" }]}>
              <Ionicons name="calendar-outline" size={14} color="#d97706" />
            </View>
            <Text style={styles.todayCardCount}>{stats?.approvedLeavesThisMonth || 0}</Text>
            <Text style={styles.todayCardLabel} numberOfLines={1}>On Leave</Text>
          </View>

          <View style={styles.todayMiniCard}>
            <View style={[styles.todayIconBg, { backgroundColor: "#f5f3ff" }]}>
              <Ionicons name="person-add-outline" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.todayCardCount}>{data?.recentEmployees?.length || 0}</Text>
            <Text style={styles.todayCardLabel} numberOfLines={1}>New Joiners</Text>
          </View>
        </View>

        {/* ── 3. Lead CRM & Pipeline Widget ───────────────── */}
        {canAccessLeads && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="magnet-outline" size={15} color="#1268D9" />
                <Text style={styles.sectionTitle}>Lead CRM &amp; Pipeline</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("LeadsEngine")} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.seeAllText, { color: "#1268D9" }]}>Pipeline</Text>
                <Ionicons name="chevron-forward" size={12} color="#1268D9" />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.leadStatsRow}>
                <View style={[styles.leadStatBox, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                  <Text style={[styles.leadStatNum, { color: "#1268D9" }]}>{leadStats.total}</Text>
                  <Text style={styles.leadStatLabel}>Total</Text>
                </View>
                <View style={[styles.leadStatBox, { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }]}>
                  <Text style={[styles.leadStatNum, { color: "#7c3aed" }]}>{leadStats.contacted}</Text>
                  <Text style={styles.leadStatLabel}>Contacted</Text>
                </View>
                <View style={[styles.leadStatBox, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                  <Text style={[styles.leadStatNum, { color: "#d97706" }]}>{leadStats.inProgress}</Text>
                  <Text style={styles.leadStatLabel}>In Progress</Text>
                </View>
                <View style={[styles.leadStatBox, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
                  <Text style={[styles.leadStatNum, { color: "#059669" }]}>{leadStats.won}</Text>
                  <Text style={styles.leadStatLabel}>Won</Text>
                </View>
              </View>

              {leadsList.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.recentProspectsHeader}>Recent Prospects (1-Click Contact)</Text>
                  {leadsList.slice(0, 3).map((lead, lIdx) => {
                    const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

                    return (
                      <View key={lIdx} style={styles.prospectItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.prospectName}>{lead.name}</Text>
                          <Text style={styles.prospectCompany} numberOfLines={1}>
                            {lead.company || lead.productService || "General Lead"}
                          </Text>
                        </View>

                        <View style={styles.prospectActions}>
                          {lead.estimatedValue && (
                            <Text style={styles.prospectValue}>₹{Number(lead.estimatedValue).toLocaleString("en-IN")}</Text>
                          )}
                          {cleanPhone ? (
                            <TouchableOpacity
                              style={styles.actionIconBtn}
                              onPress={() => Linking.openURL(`https://wa.me/${cleanPhone}?text=Hello ${encodeURIComponent(lead.name || "")}, connecting from HR.`)}
                            >
                              <Ionicons name="logo-whatsapp" size={14} color="#10b981" />
                            </TouchableOpacity>
                          ) : null}
                          {cleanPhone ? (
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { backgroundColor: "#eff6ff" }]}
                              onPress={() => Linking.openURL(`tel:${cleanPhone}`)}
                            >
                              <Ionicons name="call" size={13} color="#3b82f6" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowAddLeadModal(true)} style={styles.addLeadPromptBtn}>
                  <Ionicons name="add-circle-outline" size={16} color="#1268D9" />
                  <Text style={styles.addLeadPromptText}>+ Add First Lead / Prospect</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {canAccessAttendance && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Attendance Distribution</Text>
            </View>

            <View style={[styles.card, styles.attendanceOverviewCard]}>
              <DonutChart 
                total={stats?.activeEmployees || stats?.totalEmployees || 0}
                present={stats?.presentToday || 0}
                absent={stats?.absentToday || 0}
                leave={stats?.approvedLeavesThisMonth || 0}
                halfDay={stats?.lateToday || 0}
              />

              <View style={styles.legendContainer}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>Present</Text>
                  <Text style={styles.legendValue}>
                    {stats?.presentToday || 0} ({stats?.activeEmployees || stats?.totalEmployees ? (((stats?.presentToday || 0) / (stats?.activeEmployees || stats?.totalEmployees || 1)) * 100).toFixed(0) + "%" : "0%"})
                  </Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>Absent</Text>
                  <Text style={styles.legendValue}>{stats?.absentToday || 0}</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>Leave</Text>
                  <Text style={styles.legendValue}>{stats?.approvedLeavesThisMonth || 0}</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: "#8b5cf6" }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>Late/Half</Text>
                  <Text style={styles.legendValue}>{stats?.lateToday || 0}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Departments Overview</Text>
          <TouchableOpacity onPress={() => navigation.navigate("HRDepartments")}>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.cardBody}>
            {data?.departmentsBreakdown && data?.departmentsBreakdown.length > 0 ? (
              data.departmentsBreakdown.slice(0, 4).map((dept, idx) => {
                const totalDeptStaff = stats?.totalEmployees || 1;
                const percentage = Math.min(100, Math.round(((dept.employeeCount || 0) / totalDeptStaff) * 100));
                return (
                  <View key={idx} style={styles.progressRow}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>{dept.departmentName || "General"}</Text>
                      <Text style={styles.progressValue}>
                        {dept.employeeCount || 0} Staff <Text style={styles.progressPct}>({percentage}%)</Text>
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyCardText}>No departments configured.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Holidays</Text>
        </View>
        <View style={[styles.card, { marginBottom: 80 }]}>
          <View style={styles.listContainer}>
            {data?.upcomingHolidays?.length > 0 ? (
              data.upcomingHolidays.map((hol, idx) => {
                const dateObj = new Date(hol.date);
                const day = dateObj.getDate();
                const month = dateObj.toLocaleDateString("en-US", { month: "short" });
                return (
                  <View key={idx} style={[styles.listItem, idx !== data.upcomingHolidays.length - 1 && styles.listItemBorder]}>
                    <View style={styles.dateBox}>
                      <Text style={styles.dateBoxMonth}>{month.toUpperCase()}</Text>
                      <Text style={styles.dateBoxDay}>{day}</Text>
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{hol.name}</Text>
                      <Text style={styles.listItemSub}>Official Company Holiday</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyCardText}>No upcoming holidays.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── FLOATING ACTION BUTTON (FAB) ─────── */}
      <TouchableOpacity
        style={styles.floatingFabBtn}
        activeOpacity={0.85}
        onPress={() => setFabOpen(true)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* ── HR QUICK ACTIONS MODAL SHEET (Same as Manager) ── */}
      <Modal
        visible={fabOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFabOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitle}>HR Quick Actions</Text>

            {/* Option 1: Add New Lead */}
            {canAccessLeads && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  setShowAddLeadModal(true);
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#fff7ed" }]}>
                  <Ionicons name="magnet-outline" size={20} color="#f97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Add New Lead</Text>
                  <Text style={styles.modalOptionSub}>Register new client inquiry or deal</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 2: Create New Task */}
            {canAccessTasks && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate("HRCreateTask");
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="checkbox-outline" size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Create New Task</Text>
                  <Text style={styles.modalOptionSub}>Assign work to employees & track progress</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 3: Add New Employee */}
            {canAccessEmployees && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate("HRAddEmployee");
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#f0fdfa" }]}>
                  <Ionicons name="person-add-outline" size={20} color="#0d9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Add New Employee</Text>
                  <Text style={styles.modalOptionSub}>Onboard staff member with profile & salary</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 4: Leave Requests */}
            {canAccessLeaves && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate("Leaves");
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#fdf2f8" }]}>
                  <Ionicons name="calendar-clear-outline" size={20} color="#db2777" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Review Leave Requests</Text>
                  <Text style={styles.modalOptionSub}>Approve or reject time-off applications</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 5: Regularization */}
            {canAccessAttendance && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate("HRRegularizationApproval");
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons name="time-outline" size={20} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Regularize Attendance</Text>
                  <Text style={styles.modalOptionSub}>Review attendance correction requests</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 6: Generate Payroll */}
            {canAccessPayroll && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate("HRPayrollGenerate");
                }}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: "#f5f3ff" }]}>
                  <Ionicons name="cash-outline" size={20} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Generate Salary & Payroll</Text>
                  <Text style={styles.modalOptionSub}>Process monthly payroll cycle & slips</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Option 7: Company Requests (Always accessible) */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate("CompanyRequests");
              }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#eef2ff" }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Company Requests</Text>
                <Text style={styles.modalOptionSub}>Review employee queries & tickets</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Option 8: Post Announcement */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate("HRAnnouncements");
              }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: "#fffbeb" }]}>
                <Ionicons name="megaphone-outline" size={20} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionText}>Post Announcement</Text>
                <Text style={styles.modalOptionSub}>Broadcast update to entire workforce</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setFabOpen(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── QUICK ADD LEAD MODAL ─────────────────────────────────────── */}
      <Modal
        visible={showAddLeadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddLeadModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.todayIconBg, { backgroundColor: "#fff7ed" }]}>
                  <Ionicons name="magnet" size={18} color="#f97316" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Add New Lead</Text>
                  <Text style={styles.modalSubtitle}>Direct Prospect Capture</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAddLeadModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.65 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prospect Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Rahul Sharma"
                  value={newLeadForm.name}
                  onChangeText={(val) => setNewLeadForm((p) => ({ ...p, name: val }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>WhatsApp / Phone Number *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={newLeadForm.phone}
                  onChangeText={(val) => setNewLeadForm((p) => ({ ...p, phone: val }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.formLabel}>Company</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Tech Corp"
                    value={newLeadForm.company}
                    onChangeText={(val) => setNewLeadForm((p) => ({ ...p, company: val }))}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.formLabel}>Requirement</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. HRMS"
                    value={newLeadForm.productService}
                    onChangeText={(val) => setNewLeadForm((p) => ({ ...p, productService: val }))}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.formLabel}>Deal Value (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 50000"
                    keyboardType="numeric"
                    value={newLeadForm.estimatedValue}
                    onChangeText={(val) => setNewLeadForm((p) => ({ ...p, estimatedValue: val }))}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="rahul@domain.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newLeadForm.email}
                    onChangeText={(val) => setNewLeadForm((p) => ({ ...p, email: val }))}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Pipeline Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row" }}>
                  {leadStatuses.map((st) => {
                    const stId = st.id || st._id;
                    const isSelected = newLeadForm.statusId === stId || (!newLeadForm.statusId && st === leadStatuses[0]);
                    return (
                      <TouchableOpacity
                        key={stId}
                        onPress={() => setNewLeadForm((p) => ({ ...p, statusId: stId }))}
                        style={[
                          styles.statusChip,
                          isSelected && { backgroundColor: "#f97316", borderColor: "#f97316" }
                        ]}
                      >
                        <View style={[styles.statusChipDot, { backgroundColor: isSelected ? "#ffffff" : (st.color || "#f97316") }]} />
                        <Text style={[styles.statusChipText, isSelected && { color: "#ffffff" }]}>
                          {st.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 60, textAlignVertical: "top" }]}
                  placeholder="Meeting notes or requirement..."
                  multiline
                  numberOfLines={3}
                  value={newLeadForm.notes}
                  onChangeText={(val) => setNewLeadForm((p) => ({ ...p, notes: val }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddLeadModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveLead}
                disabled={savingLead}
              >
                <LinearGradient
                  colors={["#f97316", "#ea580c"]}
                  style={styles.modalSubmitGradient}
                >
                  {savingLead ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Save Lead</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  topBackgroundEffect: {
    backgroundColor: "#C2410C",
    height: 90,
    width: "100%",
    position: "absolute",
    top: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffe4e6",
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#e11d48",
    fontSize: 12,
    marginLeft: 8,
    fontWeight: "600",
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  checkInCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#C2410C",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  leafWatermark: {
    position: "absolute",
    right: -15,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  checkInLeft: {
    flex: 1,
  },
  checkInLabel: {
    fontFamily: FONTS.bodyBold,
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkInTime: {
    fontFamily: FONTS.displayBold,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 2,
  },
  checkInDetail: {
    fontFamily: FONTS.bodyMedium,
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 12,
    marginBottom: 2,
  },
  checkInDate: {
    fontFamily: FONTS.bodyMedium,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
  },
  checkInBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  checkInBtnText: {
    fontFamily: FONTS.bodyBold,
    color: "#C2410C",
    fontSize: 11.5,
  },
  overviewHeaderLeft: {
    flexDirection: "column",
  },
  overviewSubDate: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  todayGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 4,
  },
  todayMiniCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  todayIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  todayCardCount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },
  todayCardLabel: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 1,
    fontWeight: "700",
  },
  attendanceOverviewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  donutContainer: {
    position: "relative",
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterCount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  donutCenterText: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "700",
  },
  legendContainer: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
    width: 50,
  },
  legendValue: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1,
    textAlign: "right",
  },
  quickActionsGrid: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 0.5,
  },
  quickActionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 6,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: "750",
    color: "#C2410C",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardBody: {
    gap: 8,
  },
  progressRow: {
    marginBottom: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  progressValue: {
    fontSize: 11,
    fontWeight: "850",
    color: "#1e293b",
  },
  progressPct: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C2410C",
    borderRadius: 2.5,
  },
  payrollGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
  },
  payrollCol: {
    flex: 1,
    alignItems: "center",
  },
  payrollColDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e2e8f0",
  },
  payrollLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  payrollValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  listContainer: {
    flexDirection: "column",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 118, 110, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C2410C",
  },
  listItemContent: {
    flex: 1,
    marginRight: 10,
  },
  listItemTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  listItemSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
    fontWeight: "500",
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  bgSuccess: { backgroundColor: "#d1fae5" },
  textSuccess: { color: "#059669" },
  bgWarning: { backgroundColor: "#fef3c7" },
  textWarning: { color: "#d97706" },
  bgDanger: { backgroundColor: "#ffe4e6" },
  textDanger: { color: "#e11d48" },
  dateBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  dateBoxMonth: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0ea5e9",
  },
  dateBoxDay: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0369a1",
  },
  emptyCardText: {
    fontSize: 11.5,
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },

  // ── Lead CRM Widget Styles ───────────────────
  leadStatsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  leadStatBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  leadStatNum: {
    fontSize: 15,
    fontWeight: "900",
  },
  leadStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 1,
  },
  recentProspectsHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  prospectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  prospectName: {
    fontSize: 12,
    fontWeight: "750",
    color: "#1e293b",
  },
  prospectCompany: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  prospectActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prospectValue: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10b981",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  addLeadPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  addLeadPromptText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1268D9",
  },

  // ── Floating Action Button (FAB) ─
  floatingFabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
  },

  // ── Quick Action Sheet Modal Styles (Manager Style) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "85%",
  },
  modalHeaderIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalOptionSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 13,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  // ── Lead Add Modal Styles ─────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  formGroup: {
    marginBottom: 11,
  },
  formRow: {
    flexDirection: "row",
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "750",
    color: "#334155",
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    color: "#0f172a",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    marginRight: 6,
  },
  statusChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "750",
    color: "#475569",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modalSubmitBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  modalSubmitGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#ffffff",
  },
});

export default HRDashboardScreen;
