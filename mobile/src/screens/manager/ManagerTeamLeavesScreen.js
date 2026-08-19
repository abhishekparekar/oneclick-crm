import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import dayjs from "dayjs";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  approved: { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0" },
  rejected: { bg: "#FEE2E2", text: "#EF4444", border: "#FCA5A5" },
  cancelled: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1" },
};

const ManagerTeamLeavesScreen = ({ navigation }) => {
  const {
    teamLeavesData,
    loadingTeamLeaves,
    fetchTeamLeaves,
    leavePermissions,
    dashboardData,
    approveTeamLeave,
    rejectTeamLeave,
  } = useManagerController();

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Quick Rejection modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const manager = dashboardData?.manager || {};

  const departmentsList = React.useMemo(() => {
    if (!manager.departmentId && (!manager.accessibleDepartments || manager.accessibleDepartments.length === 0)) {
      return [];
    }
    const list = [];
    if (manager.departmentId) {
      list.push({
        _id: manager.departmentId._id || manager.departmentId,
        name: manager.department || "My Department"
      });
    }
    if (manager.accessibleDepartments && manager.accessibleDepartments.length > 0) {
      manager.accessibleDepartments.forEach(d => {
        const id = typeof d === "object" ? d._id : d;
        const name = typeof d === "object" ? d.name : "Accessible Dept";
        if (id && !list.map(x => x._id.toString()).includes(id.toString())) {
          list.push({ _id: id, name });
        }
      });
    }
    return list;
  }, [manager]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTeamLeaves({ status: activeTab, page: 1, limit: 100, departmentId: selectedDeptId || undefined });
    });
    return unsubscribe;
  }, [navigation, fetchTeamLeaves, activeTab, selectedDeptId]);

  useEffect(() => {
    fetchTeamLeaves({ status: activeTab, page: 1, limit: 100, departmentId: selectedDeptId || undefined });
  }, [activeTab, selectedDeptId]);

  const onRefresh = () => {
    fetchTeamLeaves({ status: activeTab, page: 1, limit: 100, departmentId: selectedDeptId || undefined });
  };

  const leaves = teamLeavesData?.leaves || [];
  const summary = teamLeavesData?.summary || {};

  const renderLeaveCard = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const emp = item.employeeId || {};
    const initials = ((emp.firstName || "E")[0] + (emp.lastName || "")[0]).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("ManagerTeamLeaveDetails", { leaveId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            {emp.photo ? (
              <Image source={{ uri: emp.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Employee"}
              </Text>
              <Text style={styles.employeeCode}>
                {emp.employeeCode || "N/A"} • {emp.designationId?.name || emp.departmentId?.name || "Team Member"}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.leaveDetails}>
          <View style={styles.leaveTypeRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="calendar" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.leaveType}>
                {item.leaveType || "Leave"}
              </Text>
            </View>
            <View style={styles.daysBadge}>
              <Text style={styles.leaveDays}>
                {item.numberOfDays} {item.numberOfDays > 1 ? "Days" : "Day"}
              </Text>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.slateMuted} style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>
              {dayjs(item.startDate).format("DD MMM YYYY")}
              {item.startDate !== item.endDate && ` - ${dayjs(item.endDate).format("DD MMM YYYY")}`}
            </Text>
          </View>

          {item.reason ? (
            <Text style={styles.reasonText} numberOfLines={2}>
              "{item.reason}"
            </Text>
          ) : null}
        </View>

        {item.status === "pending" && leavePermissions?.allowManagerLeaveApproval !== false && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              disabled={processingId === item._id}
              onPress={() => {
                setSelectedLeaveId(item._id);
                setRejectionReason("");
                setRejectModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={processingId === item._id}
              onPress={() => {
                Alert.alert("Approve Leave", "Are you sure you want to approve this leave request?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Approve",
                    onPress: async () => {
                      setProcessingId(item._id);
                      try {
                        await approveTeamLeave(item._id);
                        fetchTeamLeaves({ status: activeTab, page: 1, limit: 100, departmentId: selectedDeptId || undefined });
                        Alert.alert("Success", "Leave request approved.");
                      } catch (err) {
                        Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to approve");
                      } finally {
                        setProcessingId(null);
                      }
                    },
                  },
                ]);
              }}
              activeOpacity={0.8}
            >
              {processingId === item._id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="Team Leave Requests">
      <View style={styles.container}>
        {/* Department Scoping Filter Bar */}
        {departmentsList.length > 1 && (
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => setSelectedDeptId("")}
                style={[styles.filterPill, selectedDeptId === "" && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, selectedDeptId === "" && styles.filterPillTextActive]}>
                  All Departments
                </Text>
              </TouchableOpacity>
              {departmentsList.map((dept) => {
                const isActive = selectedDeptId === dept._id;
                return (
                  <TouchableOpacity
                    key={dept._id}
                    onPress={() => setSelectedDeptId(dept._id)}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    activeOpacity={0.8}
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

        {leavePermissions?.allowManagerLeaveApproval === false && (
          <View style={styles.warningBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>
              Leave approval is managed by HR/Admin. You have read-only access.
            </Text>
          </View>
        )}

        {/* Summary Stat Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={18} color="#D97706" />
            </View>
            <Text style={[styles.summaryVal, { color: "#D97706" }]}>{summary.pending || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.summaryVal, { color: "#16A34A" }]}>{summary.approved || 0}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>

          <View style={styles.summaryBox}>
            <View style={[styles.summaryIconBox, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.summaryVal, { color: "#EF4444" }]}>{summary.rejected || 0}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loadingTeamLeaves && !teamLeavesData ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={leaves}
            keyExtractor={(item) => item._id}
            renderItem={renderLeaveCard}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loadingTeamLeaves} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No {activeTab} leave requests found.</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Reject Leave Request</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={18} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Provide a clear reason for rejecting this leave request.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Rejection reason (required)..."
              placeholderTextColor="#94A3B8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setRejectModalVisible(false);
                  setSelectedLeaveId(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnReject}
                onPress={async () => {
                  if (!rejectionReason.trim()) {
                    Alert.alert("Error", "Please provide a rejection reason.");
                    return;
                  }
                  setProcessingId(selectedLeaveId);
                  setRejectModalVisible(false);
                  try {
                    await rejectTeamLeave(selectedLeaveId, rejectionReason);
                    fetchTeamLeaves({ status: activeTab, page: 1, limit: 100, departmentId: selectedDeptId || undefined });
                    Alert.alert("Success", "Leave request rejected.");
                  } catch (err) {
                    Alert.alert("Error", err?.response?.data?.message || err?.message || "Failed to reject");
                  } finally {
                    setProcessingId(null);
                    setSelectedLeaveId(null);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnRejectText}>Reject Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  filterBar: {
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: COLORS.darkNavy,
    borderColor: COLORS.darkNavy,
  },
  filterPillText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  warningBanner: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE047",
  },
  warningText: {
    color: "#B45309",
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    flex: 1,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  summaryVal: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: COLORS.darkNavy,
    ...SHADOWS.sm,
  },
  tabText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkNavy,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  employeeName: {
    fontSize: 14.5,
    fontFamily: FONTS.displayBold,
    color: COLORS.darkNavy,
  },
  employeeCode: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  leaveDetails: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  leaveTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  leaveType: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
  },
  daysBadge: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  leaveDays: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primaryDark,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
  },
  reasonText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    fontStyle: "italic",
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectBtnText: {
    color: "#EF4444",
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justify: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 20,
    ...SHADOWS.md,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justify: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justify: "center",
  },
  modalSub: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.darkNavy,
    textAlignVertical: "top",
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalBtnCancelText: {
    color: COLORS.darkNavy,
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
  },
  modalBtnReject: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalBtnRejectText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
  },
});

export default ManagerTeamLeavesScreen;
