import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import { getMyLeavesApi, getLeaveBalanceApi, cancelLeaveApi } from "../../api/leaveService";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const ManagerMyLeaveScreen = ({ navigation }) => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({ casual: 10, sick: 8, annual: 15, lop: 0 });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const remainingLeaves = (balance?.casual || 0) + (balance?.sick || 0) + (balance?.annual || 0);
  const totalLeaves = balance?.totalAllowed || balance?.total || (remainingLeaves > 0 ? remainingLeaves + (balance?.used || 0) : 24);

  const isFetchingRef = useRef(false);
  const hasFetchedBalanceRef = useRef(false);

  const loadLeaveData = async (showLoading = true, forceBalance = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (showLoading) setLoading(true);
      
      const promises = [
        getMyLeavesApi().catch(() => ({ data: { leaves: [], success: false } })),
      ];

      if (!hasFetchedBalanceRef.current || forceBalance) {
        promises.push(getLeaveBalanceApi().catch(() => ({ data: { balance: null, success: false } })));
      }

      const results = await Promise.all(promises);
      const leavesRes = results[0];
      const balanceRes = results[1];

      if (leavesRes?.data?.success) {
        setLeaves(leavesRes.data.leaves || []);
      }
      if (balanceRes?.data?.success) {
        hasFetchedBalanceRef.current = true;
        setBalance(balanceRes.data.balance || balanceRes.data);
      }
    } catch (error) {
      console.error("Failed to load manager my leaves data:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaveData(false, true);
  };

  const displayedLeaves = useMemo(() => {
    if (!activeFilter) return leaves;
    return leaves.filter((l) => l.status?.toLowerCase() === activeFilter.toLowerCase());
  }, [leaves, activeFilter]);

  const handleCancelLeave = (id) => {
    Alert.alert("Cancel Leave", "Are you sure you want to cancel this leave application?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setCancellingId(id);
            const res = await cancelLeaveApi(id);
            if (res.data && res.data.success) {
              Alert.alert("Success", "Leave request cancelled.");
              loadLeaveData(false, true);
            } else {
              Alert.alert("Error", res.data?.message || "Failed to cancel leave.");
            }
          } catch (err) {
            console.error("Cancel leave error:", err);
            Alert.alert("Error", err.response?.data?.message || err.message || "Failed to cancel leave.");
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return { bg: "#ECFDF5", text: "#10B981", icon: "checkmark-circle" };
      case "rejected":
        return { bg: "#FEF2F2", text: "#EF4444", icon: "close-circle" };
      default:
        return { bg: "#FFFBEB", text: "#F59E0B", icon: "time-outline" };
    }
  };

  return (
    <ManagerLayout navigation={navigation} title="My Leaves">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} tintColor="#1268D9" />}
        >
          {/* ── 1. Top Compact Hero KPI Card ── */}
          <LinearGradient
            colors={["#082B52", "#1268D9", "#1D7DF2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroIconBox}>
                <Ionicons name="calendar" size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.heroTitle}>Leave Entitlement</Text>
                <Text style={styles.heroSubtitle}>Overview of your allocated balance</Text>
              </View>
            </View>

            <View style={styles.heroKpiRow}>
              <View style={styles.heroKpiCol}>
                <View style={styles.heroKpiLabelRow}>
                  <Ionicons name="pie-chart-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroKpiLabel}>Remaining</Text>
                </View>
                <Text style={styles.heroKpiValue}>{remainingLeaves} Days</Text>
              </View>

              <View style={styles.heroKpiDivider} />

              <View style={styles.heroKpiCol}>
                <View style={styles.heroKpiLabelRow}>
                  <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.heroKpiLabel}>Total Allowed</Text>
                </View>
                <Text style={styles.heroKpiValue}>{totalLeaves} Days</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── 2. Status Filter Tabs ── */}
          <View style={styles.statusTabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
              {STATUS_FILTERS.map((pill) => {
                const isActive = activeFilter === pill.value;
                return (
                  <TouchableOpacity
                    key={pill.value}
                    onPress={() => setActiveFilter(pill.value)}
                    style={[styles.statusPillTab, isActive && styles.statusPillTabActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── 3. Summary Balances Section ── */}
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.sectionTitle}>Summary Balances</Text>
            <View style={styles.asOnDateGroup}>
              <Text style={styles.asOnDateText}>As on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</Text>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={styles.balanceGrid}>
            {/* Casual Leaves */}
            <View style={[styles.balanceCard, { borderBottomColor: "#3B82F6", borderBottomWidth: 3 }]}>
              <View style={styles.balanceCardTop}>
                <View style={[styles.balanceIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="briefcase" size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.balanceNum, { color: "#3B82F6" }]}>{balance.casual ?? 10}</Text>
              </View>
              <Text style={styles.balanceName}>Casual Leaves</Text>
            </View>

            {/* Sick Leaves */}
            <View style={[styles.balanceCard, { borderBottomColor: "#10B981", borderBottomWidth: 3 }]}>
              <View style={styles.balanceCardTop}>
                <View style={[styles.balanceIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="medical" size={16} color="#10B981" />
                </View>
                <Text style={[styles.balanceNum, { color: "#10B981" }]}>{balance.sick ?? 8}</Text>
              </View>
              <Text style={styles.balanceName}>Sick Leaves</Text>
            </View>

            {/* Annual Leaves */}
            <View style={[styles.balanceCard, { borderBottomColor: "#8B5CF6", borderBottomWidth: 3 }]}>
              <View style={styles.balanceCardTop}>
                <View style={[styles.balanceIconBox, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="ribbon" size={16} color="#8B5CF6" />
                </View>
                <Text style={[styles.balanceNum, { color: "#8B5CF6" }]}>{balance.annual ?? 15}</Text>
              </View>
              <Text style={styles.balanceName}>Annual Leaves</Text>
            </View>
          </View>

          {/* ── 4. Primary Request Time Off Button ── */}
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => navigation.navigate("ManagerApplyLeave")}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#1268D9", "#0D50B8"]} style={styles.requestButtonGradient}>
              <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.requestButtonText}>Request Time Off</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── 5. My Leave Applications History Stream ── */}
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>My Leave Applications History</Text>
            <TouchableOpacity onPress={() => setActiveFilter("")} activeOpacity={0.7} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={12} color="#1268D9" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#1268D9" style={{ marginTop: 20 }} />
          ) : displayedLeaves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>No leave records found</Text>
              <Text style={styles.emptySubtext}>Try selecting another status filter tab</Text>
            </View>
          ) : (
            displayedLeaves.map((leave, idx) => {
              const statusColors = getStatusColor(leave.status);
              const leaveTypeLower = leave.leaveType?.toLowerCase() || "";
              let cardAccentColor = "#10B981";
              let iconName = "leaf";
              let iconBg = "#ECFDF5";
              let iconColor = "#10B981";

              if (leaveTypeLower.includes("sick")) {
                cardAccentColor = "#F97316";
                iconName = "thermometer";
                iconBg = "#FFF7ED";
                iconColor = "#F97316";
              } else if (leaveTypeLower.includes("annual")) {
                cardAccentColor = "#3B82F6";
                iconName = "airplane";
                iconBg = "#EFF6FF";
                iconColor = "#3B82F6";
              }

              return (
                <View
                  key={leave._id || `leave-${idx}`}
                  style={[styles.historyCard, { borderLeftColor: cardAccentColor, borderLeftWidth: 4 }]}
                >
                  {/* Top Row */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardLeftInfo}>
                      <View style={[styles.cardIconBox, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>
                      <View style={styles.cardTitleGroup}>
                        <Text style={styles.leaveTypeName}>{leave.leaveType} Leave</Text>
                        <Text style={styles.leaveDaysMeta}>
                          {leave.numberOfDays} Day{leave.numberOfDays > 1 ? "s" : ""} · Leave ID: {leave.leaveCode || `LV-2026-0${120 + idx}`}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Ionicons name={statusColors.icon} size={11} color={statusColors.text} style={{ marginRight: 3 }} />
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {leave.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Date Container */}
                  <View style={styles.dateContainer}>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>START DATE</Text>
                      <Text style={styles.dateVal}>
                        {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
                    <View style={styles.dateCol}>
                      <Text style={styles.dateLabel}>END DATE</Text>
                      <Text style={styles.dateVal}>
                        {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                  </View>

                  {/* Footer Row */}
                  <View style={styles.cardFooterRow}>
                    <Text style={styles.reasonText} numberOfLines={1}>
                      💬 Reason: {leave.reason || "N/A"}
                    </Text>
                    <Text style={styles.appliedDateText}>
                      Applied on {new Date(leave.createdAt || leave.startDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>

                  {/* Cancel Button if Pending */}
                  {leave.status === "pending" && (
                    <TouchableOpacity
                      style={styles.cancelRowBtn}
                      onPress={() => handleCancelLeave(leave._id)}
                      disabled={cancellingId === leave._id}
                      activeOpacity={0.8}
                    >
                      {cancellingId === leave._id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.cancelRowBtnText}>Cancel Leave</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("ManagerApplyLeave")}
          activeOpacity={0.85}
        >
          <LinearGradient colors={["#1268D9", "#0D50B8"]} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 100,
  },

  // ── Hero Card ──
  heroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroCalendarIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0B132B",
  },
  heroMiddleContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 10.5,
    color: "#E0F2FE",
    marginTop: 2,
  },
  heroActionsCol: {
    gap: 6,
  },
  heroPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 4,
  },
  heroPillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Status Pill Tabs ──
  statusTabsWrapper: {
    marginBottom: 14,
  },
  statusTabsScroll: {
    gap: 8,
    flexDirection: "row",
  },
  statusPillTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusPillTabActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
  },

  // ── Summary Balances ──
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  asOnDateGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  asOnDateText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  balanceGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  balanceCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  balanceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  balanceName: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },

  // ── Request Time Off Button ──
  requestButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  requestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Leave Applications History Stream ──
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1268D9",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleGroup: {
    flex: 1,
  },
  leaveTypeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  leaveDaysMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  dateCol: {
    alignItems: "center",
    flex: 1,
  },
  dateLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.4,
  },
  dateVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  reasonText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
    marginRight: 6,
  },
  appliedDateText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  cancelRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelRowBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },

  // ── Loading / Empty ──
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtext: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    elevation: 8,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: "hidden",
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ManagerMyLeaveScreen;
