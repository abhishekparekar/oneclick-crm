import React, { useState, useCallback } from "react";
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
} from "../../api/companyService";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const LeaveRequestsScreen = ({ navigation }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  
  // Rejection Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const { data: leaves = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['companyLeaves', statusFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await getCompanyLeavesApi(params);
      return data?.leaves || [];
    }
  });

  const handleApprove = (id) => {
    Alert.alert(
      "Approve Leave",
      "Are you sure you want to approve this leave request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              const { data } = await approveLeaveApi(id);
              Alert.alert("Success", data.message || "Leave approved successfully");
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
    setModalVisible(true);
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
      setModalVisible(false);
      queryClient.invalidateQueries(['companyLeaves']);
      queryClient.invalidateQueries(['companyDashboard']);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Rejection failed");
    } finally {
      setSubmittingReject(false);
    }
  };

  const filteredLeaves = leaves.filter((item) => {
    const fullName = `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
      (item.employeeId?.employeeCode || "").toLowerCase().includes(search.toLowerCase()) ||
      item.leaveType.toLowerCase().includes(search.toLowerCase());
  });

  const renderLeaveItem = ({ item }) => {
    const employeeName = item.employeeId
      ? `${item.employeeId.firstName} ${item.employeeId.lastName}`
      : "Unknown Employee";
    const employeeCode = item.employeeId?.employeeCode || "N/A";
    
    const formattedStartDate = formatDateToDDMMYYYY(item.startDate);
    const formattedEndDate = formatDateToDDMMYYYY(item.endDate);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.employeeName}>{employeeName}</Text>
            <Text style={styles.employeeCode}>Code: {employeeCode}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="documents-outline" size={15} color={COLORS.text.light} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{item.leaveType.toUpperCase()}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={15} color={COLORS.text.light} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Dates:</Text>
            <Text style={styles.infoValue}>{formattedStartDate} - {formattedEndDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={15} color={COLORS.text.light} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{item.numberOfDays} Day(s)</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="chatbox-outline" size={15} color={COLORS.text.light} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{item.reason || "No reason provided"}</Text>
          </View>

          {item.status === "rejected" && item.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
            </View>
          )}
        </View>

        {item.status === "pending" && (
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
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Leaves"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search name, code, or type..."
    >
      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === "" && styles.filterTabActive]}
            onPress={() => setStatusFilter("")}
          >
            <Text style={[styles.filterTabText, statusFilter === "" && styles.filterTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === "pending" && styles.filterTabActive]}
            onPress={() => setStatusFilter("pending")}
          >
            <Text style={[styles.filterTabText, statusFilter === "pending" && styles.filterTabTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === "approved" && styles.filterTabActive]}
            onPress={() => setStatusFilter("approved")}
          >
            <Text style={[styles.filterTabText, statusFilter === "approved" && styles.filterTabTextActive]}>
              Approved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === "rejected" && styles.filterTabActive]}
            onPress={() => setStatusFilter("rejected")}
          >
            <Text style={[styles.filterTabText, statusFilter === "rejected" && styles.filterTabTextActive]}>
              Rejected
            </Text>
          </TouchableOpacity>
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
              <Ionicons name="document-text-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No leave requests found</Text>
            </View>
          }
        />
      )}

      {/* Rejection Reason Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Leave Request</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Provide reason for rejection..."
              placeholderTextColor="#94a3b8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <TouchableOpacity
                style={[styles.submitBtn, submittingReject && styles.submitBtnDisabled]}
                onPress={submitReject}
                disabled={submittingReject}
              >
                {submittingReject ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Reject Leave</Text>
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
  filterBar: {
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 6,
  },
  filterTabActive: {
    backgroundColor: "#f0fdfa", // light teal
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  filterTabText: {
    fontSize: 13,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  employeeCode: {
    fontSize: 12,
    color: COLORS.text.light,
    fontFamily: FONTS.body,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  cardBody: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.muted,
    width: 70,
  },
  infoValue: {
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    flex: 1,
  },
  rejectionBox: {
    backgroundColor: "#fef2f2",
    borderRadius: ROUNDING.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginTop: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.danger,
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: "#991b1b",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ROUNDING.sm,
    marginLeft: 8,
    borderWidth: 1,
  },
  rejectBtn: {
    backgroundColor: "#fff",
    borderColor: "#fca5a5",
  },
  rejectBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.danger,
    marginLeft: 4,
  },
  approveBtn: {
    backgroundColor: "#fff",
    borderColor: "#86efac",
  },
  approveBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.success,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: ROUNDING.lg,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalBtn: {
    width: 100,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
});

export default LeaveRequestsScreen;
