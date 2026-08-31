import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import StatusBadge from "../../components/StatusBadge";
import AppButton from "../../components/AppButton";
import {
  getCompanyLeavesApi,
  approveLeaveApi,
  rejectLeaveApi,
  getLeaveBalanceApi,
} from "../../api/companyService";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const LeaveRequestsScreen = ({ navigation }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  // Details Modal State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);

  // Rejection Modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const { data: leaves = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['companyLeaves'],
    queryFn: async () => {
      const { data } = await getCompanyLeavesApi({});
      return data?.leaves || [];
    }
  });

  // Calculate KPIs
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === "pending").length;
    const approved = leaves.filter(l => l.status === "approved").length;
    const rejected = leaves.filter(l => l.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  const handleCardPress = async (item) => {
    setSelectedLeave(item);
    setLeaveBalance(null);
    const empId = item.employeeId?._id || item.employeeId?.id || item.employeeId;
    if (empId) {
      try {
        setBalanceLoading(true);
        const res = await getLeaveBalanceApi(empId);
        setLeaveBalance(res.data?.leaveBalance || res.data || null);
      } catch (_) {
        setLeaveBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    }
  };

  const handleApprove = (id) => {
    Alert.alert(
      "Approve Leave Request",
      "Are you sure you want to approve this leave request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              const { data } = await approveLeaveApi(id);
              Alert.alert("Success", data.message || "Leave approved successfully");
              setSelectedLeave(null);
              queryClient.invalidateQueries(['companyLeaves']);
              queryClient.invalidateQueries(['companyDashboard']);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Approval failed");
            }
          },
        },
      ]
    );
  };

  const handleRejectPress = (id) => {
    setSelectedLeaveId(id);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Warning", "Please provide a rejection reason");
      return;
    }
    try {
      setSubmittingReject(true);
      const { data } = await rejectLeaveApi(selectedLeaveId, rejectReason);
      Alert.alert("Success", data.message || "Leave rejected successfully");
      setRejectModalVisible(false);
      setSelectedLeave(null);
      queryClient.invalidateQueries(['companyLeaves']);
      queryClient.invalidateQueries(['companyDashboard']);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Rejection failed");
    } finally {
      setSubmittingReject(false);
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const fullName = `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`.toLowerCase();
      const code = (item.employeeId?.employeeCode || "").toLowerCase();
      const type = (item.leaveType || "").toLowerCase();
      const dept = (item.employeeId?.departmentId?.name || item.employeeId?.departmentName || "").toLowerCase();
      const q = search.toLowerCase();
      return fullName.includes(q) || code.includes(q) || type.includes(q) || dept.includes(q);
    });
  }, [leaves, statusFilter, search]);

  const getLeaveTypeColor = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("sick")) return { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" };
    if (t.includes("casual")) return { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
    if (t.includes("annual") || t.includes("earned")) return { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" };
    return { bg: "#FAF5FF", text: "#9333EA", border: "#E9D5FF" };
  };

  const renderLeaveItem = ({ item }) => {
    const employeeName = item.employeeId
      ? `${item.employeeId.firstName || ""} ${item.employeeId.lastName || ""}`.trim()
      : "Employee";
    const employeeCode = item.employeeId?.employeeCode || "EMP";
    const deptName = item.employeeId?.departmentId?.name || item.employeeId?.departmentName || "General";
    
    const formattedStartDate = formatDateToDDMMYYYY(item.startDate);
    const formattedEndDate = formatDateToDDMMYYYY(item.endDate);
    const typeTheme = getLeaveTypeColor(item.leaveType);

    const isPending = item.status === "pending";
    const isApproved = item.status === "approved";
    const statusColor = isApproved ? "#10B981" : isPending ? "#F59E0B" : "#EF4444";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => handleCardPress(item)}
      >
        {/* Left Status Stripe */}
        <View style={[styles.statusStripe, { backgroundColor: statusColor }]} />

        <View style={styles.cardInner}>
          {/* Top Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.employeeId?.firstName?.[0] || "E").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.employeeName} numberOfLines={1}>{employeeName}</Text>
                <Text style={styles.employeeSub} numberOfLines={1}>
                  {employeeCode} • {deptName}
                </Text>
              </View>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeTheme.bg, borderColor: typeTheme.border }]}>
              <Text style={[styles.typeBadgeText, { color: typeTheme.text }]}>
                {item.leaveType}
              </Text>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color="#475569" style={{ marginRight: 3 }} />
              <Text style={styles.durationText}>{item.numberOfDays} {item.numberOfDays === 1 ? "Day" : "Days"}</Text>
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateBox}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.dateBoxText}>
              {formattedStartDate} {formattedStartDate !== formattedEndDate ? `to ${formattedEndDate}` : "(Single Day)"}
            </Text>
          </View>

          {/* Reason */}
          <Text style={styles.reasonText} numberOfLines={2}>
            <Text style={{ fontWeight: "800", color: "#334155" }}>Reason: </Text>
            {item.reason || "No reason provided"}
          </Text>

          {item.status === "rejected" && item.rejectionReason ? (
            <View style={styles.rejectionBox}>
              <Ionicons name="alert-circle" size={13} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.rejectionText} numberOfLines={2}>
                <Text style={{ fontWeight: "800" }}>Rejected: </Text>{item.rejectionReason}
              </Text>
            </View>
          ) : null}

          {/* Pending Action Buttons */}
          {isPending && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => handleRejectPress(item._id)}
                style={[styles.actionBtn, styles.rejectBtn]}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={15} color={COLORS.danger} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleApprove(item._id)}
                style={[styles.actionBtn, styles.approveBtn]}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Leaves"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search name, code, or department..."
    >
      {/* ── KPI Stat Overview (Matching Web) ── */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }]}>
          <Text style={styles.kpiLabel}>TOTAL</Text>
          <Text style={[styles.kpiValue, { color: "#0F172A" }]}>{stats.total}</Text>
          <Text style={styles.kpiSub}>All Requests</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
          <Text style={[styles.kpiLabel, { color: "#D97706" }]}>PENDING</Text>
          <Text style={[styles.kpiValue, { color: "#B45309" }]}>{stats.pending}</Text>
          <Text style={[styles.kpiSub, { color: "#D97706" }]}>Needs Action</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
          <Text style={[styles.kpiLabel, { color: "#16A34A" }]}>APPROVED</Text>
          <Text style={[styles.kpiValue, { color: "#15803D" }]}>{stats.approved}</Text>
          <Text style={[styles.kpiSub, { color: "#16A34A" }]}>Granted</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <Text style={[styles.kpiLabel, { color: "#DC2626" }]}>REJECTED</Text>
          <Text style={[styles.kpiValue, { color: "#B91C1C" }]}>{stats.rejected}</Text>
          <Text style={[styles.kpiSub, { color: "#DC2626" }]}>Declined</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
          {[
            { key: "all", label: `All (${stats.total})` },
            { key: "pending", label: `Pending (${stats.pending})` },
            { key: "approved", label: `Approved (${stats.approved})` },
            { key: "rejected", label: `Rejected (${stats.rejected})` },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching leave requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeaves}
          keyExtractor={(item) => item._id}
          renderItem={renderLeaveItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={54} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Leave Requests Found</Text>
              <Text style={styles.emptyText}>
                {search ? "No requests match your search criteria." : "No leave requests in this category."}
              </Text>
            </View>
          }
        />
      )}

      {/* ── LEAVE DETAILS & BALANCE INSPECTOR MODAL ── */}
      <Modal visible={!!selectedLeave} transparent animationType="slide" onRequestClose={() => setSelectedLeave(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Leave Request Details</Text>
                <Text style={styles.modalSubTitle}>Review employee application & leave quotas</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLeave(null)} style={styles.closeIconBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedLeave && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Employee Header */}
                <View style={styles.detailProfileCard}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {(selectedLeave.employeeId?.firstName?.[0] || "E").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailName}>
                      {selectedLeave.employeeId?.firstName || ""} {selectedLeave.employeeId?.lastName || ""}
                    </Text>
                    <Text style={styles.detailSub}>
                      Code: {selectedLeave.employeeId?.employeeCode || "N/A"} • {selectedLeave.employeeId?.departmentId?.name || selectedLeave.employeeId?.departmentName || "General"}
                    </Text>
                  </View>
                  <StatusBadge status={selectedLeave.status} />
                </View>

                {/* Request Specs */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>APPLICATION SUMMARY</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>Leave Type</Text>
                      <Text style={styles.detailItemValue}>{selectedLeave.leaveType}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>Total Duration</Text>
                      <Text style={styles.detailItemValue}>{selectedLeave.numberOfDays} Day(s)</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>Start Date</Text>
                      <Text style={styles.detailItemValue}>{formatDateToDDMMYYYY(selectedLeave.startDate)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailItemLabel}>End Date</Text>
                      <Text style={styles.detailItemValue}>{formatDateToDDMMYYYY(selectedLeave.endDate)}</Text>
                    </View>
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>REASON / REMARKS</Text>
                  <View style={styles.detailReasonBox}>
                    <Text style={styles.detailReasonText}>{selectedLeave.reason || "No detailed reason provided."}</Text>
                  </View>
                </View>

                {/* Live Balance Quotas (Matching Web) */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>EMPLOYEE LEAVE BALANCES</Text>
                  {balanceLoading ? (
                    <View style={{ padding: 12, alignItems: "center" }}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Loading balances...</Text>
                    </View>
                  ) : leaveBalance ? (
                    <View style={styles.balanceRow}>
                      <View style={[styles.balanceCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                        <Text style={[styles.balanceNum, { color: "#2563EB" }]}>{leaveBalance.casual ?? 0}</Text>
                        <Text style={styles.balanceLbl}>Casual</Text>
                      </View>
                      <View style={[styles.balanceCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                        <Text style={[styles.balanceNum, { color: "#DC2626" }]}>{leaveBalance.sick ?? 0}</Text>
                        <Text style={styles.balanceLbl}>Sick</Text>
                      </View>
                      <View style={[styles.balanceCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                        <Text style={[styles.balanceNum, { color: "#16A34A" }]}>{leaveBalance.annual ?? 0}</Text>
                        <Text style={styles.balanceLbl}>Annual</Text>
                      </View>
                      <View style={[styles.balanceCard, { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }]}>
                        <Text style={[styles.balanceNum, { color: "#9333EA" }]}>{leaveBalance.unpaid ?? 0}</Text>
                        <Text style={styles.balanceLbl}>Unpaid</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>No balance records configured.</Text>
                  )}
                </View>

                {/* Action Buttons in Modal */}
                {selectedLeave.status === "pending" && (
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalRejectBtn]}
                      onPress={() => {
                        const id = selectedLeave._id;
                        handleRejectPress(id);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.modalRejectText}>Reject Request</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalApproveBtn]}
                      onPress={() => handleApprove(selectedLeave._id)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.modalApproveText}>Approve Leave</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.rejectOverlay}>
          <View style={styles.rejectCard}>
            <View style={styles.rejectHeader}>
              <Ionicons name="close-circle" size={24} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.rejectTitle}>Reject Leave Request</Text>
            </View>
            <Text style={styles.rejectSub}>
              Please explain why this leave request is being declined.
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Project critical sprint / Short notice..."
              placeholderTextColor="#94a3b8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelRejectBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelRejectText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submittingReject && styles.submitBtnDisabled]}
                onPress={submitReject}
                disabled={submittingReject}
              >
                {submittingReject ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  kpiContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  kpiCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 1,
  },
  kpiSub: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },
  filterBar: {
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterTabActive: {
    backgroundColor: "#0F172A",
  },
  filterTabText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statusStripe: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  employeeSub: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateBoxText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  reasonText: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 16,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 11.5,
    color: "#991B1B",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#DC2626",
    marginLeft: 4,
  },
  approveBtn: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Details Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  detailName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailSub: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailItem: {
    flexBasis: "48%",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailItemLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailItemValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  detailReasonBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailReasonText: {
    fontSize: 12.5,
    color: "#1E293B",
    lineHeight: 18,
  },
  balanceRow: {
    flexDirection: "row",
    gap: 8,
  },
  balanceCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  balanceNum: {
    fontSize: 16,
    fontWeight: "900",
  },
  balanceLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalRejectBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
  modalApproveBtn: {
    backgroundColor: "#16A34A",
  },
  modalApproveText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Reject Overlay
  rejectOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  rejectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rejectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rejectTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  rejectSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    height: 80,
    textAlignVertical: "top",
    backgroundColor: "#F8FAFC",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelRejectBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelRejectText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  submitBtn: {
    flex: 1.5,
    backgroundColor: "#DC2626",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default LeaveRequestsScreen;
