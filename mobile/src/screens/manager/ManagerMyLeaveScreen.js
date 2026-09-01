import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import ManagerLayout from "../../components/ManagerLayout";
import { getMyLeavesApi, getLeaveBalanceApi, cancelLeaveApi } from "../../api/leaveService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const ManagerMyLeaveScreen = ({ navigation }) => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({ casual: 10, sick: 8, annual: 15, lop: 0, used: 0, totalAllowed: 33 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const remainingLeaves = (balance?.casual || 0) + (balance?.sick || 0) + (balance?.annual || 0);
  const totalLeaves = balance?.totalAllowed || balance?.total || 33;
  const usedLeaves = balance?.used || Math.max(0, totalLeaves - remainingLeaves);
  const usedPct = totalLeaves > 0 ? Math.min(100, Math.round((usedLeaves / totalLeaves) * 100)) : 0;

  const isFetchingRef = useRef(false);

  const loadLeaveData = async (showLoading = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (showLoading) setLoading(true);

      const [leavesRes, balanceRes] = await Promise.all([
        getMyLeavesApi().catch(() => ({ data: { leaves: [], success: false } })),
        getLeaveBalanceApi().catch(() => ({ data: { balance: null, success: false } })),
      ]);

      if (leavesRes?.data?.leaves) {
        setLeaves(leavesRes.data.leaves);
      } else if (Array.isArray(leavesRes?.data)) {
        setLeaves(leavesRes.data);
      } else if (leavesRes?.data?.data && Array.isArray(leavesRes.data.data)) {
        setLeaves(leavesRes.data.data);
      }

      if (balanceRes?.data?.balance) {
        setBalance(balanceRes.data.balance);
      } else if (balanceRes?.data?.data) {
        setBalance(balanceRes.data.data);
      }
    } catch (error) {
      console.error("Failed to load manager my leaves data:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLeaveData(false);
    }, [])
  );

  useEffect(() => {
    loadLeaveData(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaveData(false);
  };

  const displayedLeaves = useMemo(() => {
    if (!activeFilter) return leaves;
    return leaves.filter((l) => l.status?.toLowerCase() === activeFilter.toLowerCase());
  }, [leaves, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: leaves.length,
      pending: leaves.filter((l) => l.status?.toLowerCase() === "pending").length,
      approved: leaves.filter((l) => l.status?.toLowerCase() === "approved").length,
      rejected: leaves.filter((l) => l.status?.toLowerCase() === "rejected").length,
    };
  }, [leaves]);

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
              Alert.alert("Success", "Leave request cancelled successfully.");
              loadLeaveData(false);
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

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return {
          bg: "#ECFDF5",
          border: "#A7F3D0",
          text: "#059669",
          icon: "checkmark-circle",
          label: "Approved",
        };
      case "rejected":
        return {
          bg: "#FEF2F2",
          border: "#FECACA",
          text: "#DC2626",
          icon: "close-circle",
          label: "Rejected",
        };
      default:
        return {
          bg: "#FFFBEB",
          border: "#FDE68A",
          text: "#D97706",
          icon: "time",
          label: "Pending",
        };
    }
  };

  const getLeaveTypeDetails = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("sick")) {
      return { label: "Sick Leave", color: "#10B981", bg: "#ECFDF5", icon: "medical" };
    }
    if (t.includes("annual")) {
      return { label: "Annual Leave", color: "#8B5CF6", bg: "#F5F3FF", icon: "ribbon" };
    }
    if (t.includes("lop") || t.includes("unpaid")) {
      return { label: "Unpaid Leave", color: "#EC4899", bg: "#FDF2F8", icon: "alert-circle" };
    }
    return { label: "Casual Leave", color: "#3B82F6", bg: "#EFF6FF", icon: "briefcase" };
  };

  return (
    <ManagerLayout navigation={navigation} title="My Leaves">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#1268D9"]}
              tintColor="#1268D9"
            />
          }
        >
          {/* ── 1. Executive Royal Blue Hero KPI Card ── */}
          <LinearGradient
            colors={["#061A36", "#0B3C7A", "#1268D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Background ambient decorative shapes */}
            <View style={styles.heroDecoCircle1} />
            <View style={styles.heroDecoCircle2} />

            <View style={styles.heroHeaderRow}>
              <View style={styles.heroIconBox}>
                <Ionicons name="calendar" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.heroTitleGroup}>
                <Text style={styles.heroTitle}>Leave Entitlement</Text>
                <Text style={styles.heroSubtitle}>Overview of your allocated balance</Text>
              </View>
              <TouchableOpacity
                style={styles.holidayPillBtn}
                onPress={() => navigation.navigate("EmployeeHolidayCalendar")}
                activeOpacity={0.8}
              >
                <Ionicons name="sunny-outline" size={13} color="#FDE047" />
                <Text style={styles.holidayPillText}>Holidays</Text>
              </TouchableOpacity>
            </View>

            {/* KPI Cards Row */}
            <View style={styles.kpiContainer}>
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiDot, { backgroundColor: "#60A5FA" }]} />
                  <Text style={styles.kpiCardLabel}>REMAINING</Text>
                </View>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiNumber}>{remainingLeaves}</Text>
                  <Text style={styles.kpiUnit}>Days</Text>
                </View>
                <Text style={styles.kpiHint}>Available to use</Text>
              </View>

              <View style={styles.kpiDivider} />

              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiDot, { backgroundColor: "#34D399" }]} />
                  <Text style={styles.kpiCardLabel}>TOTAL ALLOCATED</Text>
                </View>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiNumber}>{totalLeaves}</Text>
                  <Text style={styles.kpiUnit}>Days</Text>
                </View>
                <Text style={styles.kpiHint}>Annual entitlement</Text>
              </View>
            </View>

            {/* Utilization Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Annual Balance Utilized</Text>
                <Text style={styles.progressValue}>{usedPct}% ({usedLeaves} used)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${usedPct}%` }]} />
              </View>
            </View>
          </LinearGradient>

          {/* ── 2. Segmented Status Filter Tabs ── */}
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {STATUS_FILTERS.map((tab) => {
                const isActive = activeFilter === tab.value;
                const count =
                  tab.value === ""
                    ? counts.all
                    : tab.value === "pending"
                    ? counts.pending
                    : tab.value === "approved"
                    ? counts.approved
                    : counts.rejected;

                return (
                  <TouchableOpacity
                    key={tab.value}
                    onPress={() => setActiveFilter(tab.value)}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {tab.label}
                    </Text>
                    <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                      <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── 3. Summary Balances Section ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Summary Balances</Text>
            </View>
            <View style={styles.asOnBadge}>
              <Ionicons name="time-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.asOnDateText}>
                As on {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            {/* Casual Leaves */}
            <View style={[styles.balanceCard, { borderTopColor: "#3B82F6" }]}>
              <View style={[styles.balanceIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="briefcase" size={17} color="#3B82F6" />
              </View>
              <Text style={[styles.balanceNumber, { color: "#1E3A8A" }]}>{balance.casual ?? 10}</Text>
              <Text style={styles.balanceTitle}>Casual Leaves</Text>
              <Text style={styles.balanceSub}>Short breaks</Text>
            </View>

            {/* Sick Leaves */}
            <View style={[styles.balanceCard, { borderTopColor: "#10B981" }]}>
              <View style={[styles.balanceIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="medical" size={17} color="#10B981" />
              </View>
              <Text style={[styles.balanceNumber, { color: "#065F46" }]}>{balance.sick ?? 8}</Text>
              <Text style={styles.balanceTitle}>Sick Leaves</Text>
              <Text style={styles.balanceSub}>Medical recovery</Text>
            </View>

            {/* Annual Leaves */}
            <View style={[styles.balanceCard, { borderTopColor: "#8B5CF6" }]}>
              <View style={[styles.balanceIconWrap, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name="ribbon" size={17} color="#8B5CF6" />
              </View>
              <Text style={[styles.balanceNumber, { color: "#5B21B6" }]}>{balance.annual ?? 15}</Text>
              <Text style={styles.balanceTitle}>Annual Leaves</Text>
              <Text style={styles.balanceSub}>Vacation / Planned</Text>
            </View>
          </View>

          {/* ── 4. Primary Request Time Off Button ── */}
          <TouchableOpacity
            style={styles.requestCtaTouch}
            onPress={() => navigation.navigate("ManagerApplyLeave")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#082B52", "#1268D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestCtaGradient}
            >
              <View style={styles.requestCtaIconBox}>
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.requestCtaText}>Request Time Off</Text>
              <Ionicons name="arrow-forward" size={18} color="#93C5FD" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── 5. My Leave Applications History Stream ── */}
          <View style={styles.historyHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Leave Applications History</Text>
              <View style={styles.historyCountChip}>
                <Text style={styles.historyCountChipText}>{displayedLeaves.length}</Text>
              </View>
            </View>
            {activeFilter !== "" && (
              <TouchableOpacity
                onPress={() => setActiveFilter("")}
                activeOpacity={0.7}
                style={styles.clearFilterBtn}
              >
                <Text style={styles.clearFilterText}>Show All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#1268D9" />
              <Text style={styles.loadingText}>Fetching leave applications...</Text>
            </View>
          ) : displayedLeaves.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyStateTitle}>No Leave Applications</Text>
              <Text style={styles.emptyStateSub}>
                {activeFilter
                  ? `There are no ${activeFilter} leave requests to show.`
                  : "You haven't submitted any leave requests yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyApplyBtn}
                onPress={() => navigation.navigate("ManagerApplyLeave")}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyApplyBtnText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayedLeaves.map((leave, idx) => {
              const statusInfo = getStatusBadge(leave.status);
              const typeInfo = getLeaveTypeDetails(leave.leaveType);
              const isPending = leave.status?.toLowerCase() === "pending";
              const isCancelling = cancellingId === leave._id;

              const startDateStr = leave.startDate
                ? new Date(leave.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "N/A";
              const endDateStr = leave.endDate
                ? new Date(leave.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "N/A";

              return (
                <View key={leave._id || `leave-${idx}`} style={styles.historyCard}>
                  {/* Card Top Row */}
                  <View style={styles.historyCardTop}>
                    <View style={styles.historyTypeGroup}>
                      <View style={[styles.historyTypeIconBox, { backgroundColor: typeInfo.bg }]}>
                        <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
                      </View>
                      <View>
                        <Text style={styles.historyTypeName}>{typeInfo.label}</Text>
                        <Text style={styles.historyMetaId}>
                          {leave.numberOfDays || 1} {leave.numberOfDays === 1 ? "Day" : "Days"} • ID: {leave.leaveCode || `LV-${String(idx + 1).padStart(3, "0")}`}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
                      ]}
                    >
                      <Ionicons
                        name={statusInfo.icon}
                        size={12}
                        color={statusInfo.text}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Dates Box */}
                  <View style={styles.dateRangeBox}>
                    <View style={styles.dateCol}>
                      <Text style={styles.dateRangeLabel}>FROM DATE</Text>
                      <Text style={styles.dateRangeValue}>{startDateStr}</Text>
                    </View>

                    <View style={styles.dateArrowWrap}>
                      <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
                    </View>

                    <View style={styles.dateCol}>
                      <Text style={styles.dateRangeLabel}>TO DATE</Text>
                      <Text style={styles.dateRangeValue}>{endDateStr}</Text>
                    </View>
                  </View>

                  {/* Reason & Meta */}
                  {leave.reason ? (
                    <View style={styles.reasonWrap}>
                      <Ionicons name="chatbox-outline" size={13} color="#64748B" style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={styles.reasonText} numberOfLines={2}>
                        {leave.reason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Footer Action / Date */}
                  <View style={styles.historyCardFooter}>
                    <Text style={styles.appliedTimestamp}>
                      Applied on{" "}
                      {new Date(leave.createdAt || leave.startDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>

                    {isPending && (
                      <TouchableOpacity
                        style={styles.cancelActionBtn}
                        onPress={() => handleCancelLeave(leave._id)}
                        disabled={isCancelling}
                        activeOpacity={0.8}
                      >
                        {isCancelling ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                            <Text style={styles.cancelActionBtnText}>Cancel</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    padding: 16,
    paddingBottom: 60,
  },

  // ── Hero KPI Card ──
  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  heroDecoCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  heroDecoCircle2: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(18, 104, 217, 0.25)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  heroTitleGroup: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: FONTS.headerBold,
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: "#BAE6FD",
    marginTop: 2,
  },
  holidayPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 4,
  },
  holidayPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  // KPI Grid inside Hero
  kpiContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(7, 26, 47, 0.45)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    paddingHorizontal: 6,
  },
  kpiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  kpiCardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: "#E2E8F0",
    letterSpacing: 0.5,
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  kpiNumber: {
    fontFamily: FONTS.headerBold,
    fontSize: 24,
    color: "#FFFFFF",
  },
  kpiUnit: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: "#93C5FD",
  },
  kpiHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 8,
  },

  // Progress Bar
  progressContainer: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: "#E2E8F0",
  },
  progressValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#93C5FD",
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 3,
  },

  // ── Filter Section ──
  filterSection: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
    ...SHADOWS.sm,
  },
  filterPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  filterCountBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  filterCountText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: "#64748B",
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },

  // ── Section Header ──
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.headerBold,
    fontSize: 14,
    color: "#0F172A",
  },
  asOnBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  asOnDateText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: "#64748B",
  },

  // ── Balance Cards Row ──
  balanceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderTopWidth: 3,
    ...SHADOWS.sm,
  },
  balanceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  balanceNumber: {
    fontFamily: FONTS.headerBold,
    fontSize: 22,
    lineHeight: 26,
  },
  balanceTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#1E293B",
    marginTop: 2,
  },
  balanceSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 9.5,
    color: "#94A3B8",
    marginTop: 1,
  },

  // ── Request CTA Button ──
  requestCtaTouch: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    ...SHADOWS.md,
  },
  requestCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  requestCtaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  requestCtaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── History Header & Stream ──
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyCountChip: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  historyCountChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#334155",
  },
  clearFilterBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearFilterText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: "#1268D9",
  },

  // History Card
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyTypeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  historyTypeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyTypeName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#0F172A",
  },
  historyMetaId: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
  },

  // Date Range Box
  dateRangeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  dateCol: {
    flex: 1,
  },
  dateArrowWrap: {
    paddingHorizontal: 8,
  },
  dateRangeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  dateRangeValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: "#1E293B",
    marginTop: 2,
  },

  // Reason
  reasonWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  reasonText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },

  // Footer
  historyCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  appliedTimestamp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    color: "#94A3B8",
  },
  cancelActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelActionBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#DC2626",
  },

  // Empty & Loading States
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },
  emptyStateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 6,
    ...SHADOWS.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontFamily: FONTS.headerBold,
    fontSize: 15,
    color: "#0F172A",
  },
  emptyStateSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  emptyApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1268D9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyApplyBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#FFFFFF",
  },
});

export default ManagerMyLeaveScreen;
