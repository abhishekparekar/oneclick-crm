import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import { useAuth } from "../../context/AuthContext";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  approved: { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0" },
  rejected: { bg: "#FEE2E2", text: "#EF4444", border: "#FCA5A5" },
  cancelled: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1" },
};

const ManagerTeamLeaveDetailsScreen = ({ navigation, route }) => {
  const { leaveId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { getTeamLeaveDetails, approveTeamLeave, rejectTeamLeave, leavePermissions } = useManagerController();
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (leaveId) {
      loadData();
    }
  }, [leaveId]);

  const loadData = async () => {
    setLoading(true);
    const res = await getTeamLeaveDetails(leaveId);
    if (res) {
      setData(res);
    } else {
      Alert.alert("Error", "Could not load leave details");
      navigation.goBack();
    }
    setLoading(false);
  };

  const handleApprove = () => {
    Alert.alert("Approve Leave", "Are you sure you want to approve this leave request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setProcessing(true);
          try {
            await approveTeamLeave(leaveId);
            Alert.alert("Success", "Leave request approved.");
            navigation.goBack();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || err.message || "Failed to approve");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Error", "Please provide a rejection reason.");
      return;
    }
    setProcessing(true);
    try {
      await rejectTeamLeave(leaveId, rejectionReason);
      Alert.alert("Success", "Leave request rejected.");
      setRejectModalVisible(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || "Failed to reject");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <ManagerLayout navigation={navigation} title="Leave Details" showBack>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, fontFamily: FONTS.bodyMedium, color: COLORS.text.muted }}>
            Loading leave details...
          </Text>
        </View>
      </ManagerLayout>
    );
  }

  const { leave, leaveBalance } = data;
  const statusColor = STATUS_COLORS[leave.status] || STATUS_COLORS.pending;
  const emp = leave.employeeId || {};
  const initials = ((emp.firstName || "E")[0] + (emp.lastName || "")[0]).toUpperCase();

  const canApprove =
    leave.status === "pending" &&
    leavePermissions?.allowManagerLeaveApproval !== false &&
    hasPermission("leaves", "approveReject");

  return (
    <ManagerLayout navigation={navigation} title="Leave Request Details" showBack>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Employee Info Header Card */}
          <View style={styles.headerCard}>
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
                <Text style={styles.employeeMeta} numberOfLines={1}>
                  {emp.employeeCode || "N/A"} • {emp.designationId?.name || "Team Member"}
                </Text>
                {emp.departmentId?.name && (
                  <Text style={styles.employeeDept} numberOfLines={1}>
                    Dept: {emp.departmentId.name}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {leave.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Leave Information */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="calendar" size={15} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Leave Request Details</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Leave Type</Text>
              <Text style={styles.infoValue}>
                {leave.leaveType || "Leave"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {dayjs(leave.startDate).format("DD MMM YYYY")} - {dayjs(leave.endDate).format("DD MMM YYYY")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Days</Text>
              <Text style={[styles.infoValue, { color: COLORS.primaryDark }]}>
                {leave.numberOfDays} {leave.numberOfDays > 1 ? "Days" : "Day"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Applied On</Text>
              <Text style={styles.infoValue}>
                {dayjs(leave.createdAt).format("DD MMM YYYY, hh:mm A")}
              </Text>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason for Leave</Text>
              <Text style={styles.reasonText}>{leave.reason || "No reason provided."}</Text>
            </View>

            {leave.status === "rejected" && leave.rejectionReason && (
              <View style={[styles.reasonBox, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", marginTop: 12 }]}>
                <Text style={[styles.reasonLabel, { color: "#EF4444" }]}>Rejection Reason</Text>
                <Text style={[styles.reasonText, { color: "#991B1B" }]}>{leave.rejectionReason}</Text>
              </View>
            )}
          </View>

          {/* Leave Balances Grid */}
          {leaveBalance && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Employee Leave Balances (Paid Leaves)</Text>
              </View>

              <View style={styles.balancesGrid}>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceVal}>{leaveBalance.casualLeave || 0}</Text>
                  <Text style={styles.balanceLabel}>Casual (CL)</Text>
                </View>

                <View style={styles.balanceCard}>
                  <Text style={styles.balanceVal}>{leaveBalance.sickLeave || 0}</Text>
                  <Text style={styles.balanceLabel}>Sick (SL)</Text>
                </View>

                <View style={styles.balanceCard}>
                  <Text style={styles.balanceVal}>{leaveBalance.earnedLeave || 0}</Text>
                  <Text style={styles.balanceLabel}>Earned (EL)</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Sticky Action Footer */}
        {canApprove && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.rejectFooterBtn]}
              onPress={() => setRejectModalVisible(true)}
              disabled={processing}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.rejectFooterBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, styles.approveFooterBtn]}
              onPress={handleApprove}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.approveFooterBtnText}>Approve Leave</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

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
                  onPress={() => setRejectModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalBtnReject} 
                  onPress={handleReject}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnRejectText}>Reject Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  container: { 
    padding: 16, 
    paddingBottom: 40 
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: ROUNDING.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  employeeInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1,
    marginRight: 10,
  },
  avatar: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    marginRight: 12 
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.darkNavy,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { 
    fontSize: 16, 
    fontFamily: FONTS.bodyBold, 
    color: "#FFFFFF" 
  },
  employeeName: { 
    fontSize: 15, 
    fontFamily: FONTS.displayBold, 
    color: COLORS.darkNavy 
  },
  employeeMeta: { 
    fontSize: 12, 
    fontFamily: FONTS.body, 
    color: COLORS.text.muted, 
    marginTop: 2 
  },
  employeeDept: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.primaryDark,
    marginTop: 1,
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10, 
    borderWidth: 1,
  },
  statusText: { 
    fontSize: 11, 
    fontFamily: FONTS.bodyBold 
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: ROUNDING.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 13, 
    fontFamily: FONTS.bodyBold, 
    color: COLORS.darkNavy, 
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  infoRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 9, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F1F5F9" 
  },
  infoLabel: { 
    fontSize: 13, 
    color: COLORS.text.muted, 
    fontFamily: FONTS.bodyMedium 
  },
  infoValue: { 
    fontSize: 13, 
    color: COLORS.darkNavy, 
    fontFamily: FONTS.bodyBold 
  },
  reasonBox: { 
    marginTop: 12, 
    backgroundColor: "#F8FAFC", 
    padding: 12, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reasonLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.slateMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  reasonText: { 
    fontSize: 13, 
    color: COLORS.text.primary, 
    fontFamily: FONTS.body, 
    lineHeight: 19 
  },
  balancesGrid: { 
    flexDirection: "row", 
    gap: 10 
  },
  balanceCard: { 
    flex: 1, 
    backgroundColor: "#F8FAFC", 
    padding: 12, 
    borderRadius: 12, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#E2E8F0" 
  },
  balanceVal: { 
    fontSize: 20, 
    fontFamily: FONTS.displayBold, 
    color: COLORS.primaryDark 
  },
  balanceLabel: { 
    fontSize: 11, 
    color: COLORS.text.muted, 
    marginTop: 3, 
    textAlign: "center", 
    fontFamily: FONTS.bodyMedium 
  },
  footer: { 
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF", 
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1, 
    borderTopColor: "#E2E8F0", 
    flexDirection: "row", 
    gap: 10,
    ...SHADOWS.md,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectFooterBtn: { 
    backgroundColor: "#FEE2E2", 
    borderWidth: 1, 
    borderColor: "#FCA5A5" 
  },
  rejectFooterBtnText: { 
    color: "#EF4444",
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  approveFooterBtn: { 
    backgroundColor: COLORS.primary,
  },
  approveFooterBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(15, 23, 42, 0.6)", 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20,
  },
  modalContent: { 
    width: "100%", 
    backgroundColor: "#FFFFFF", 
    borderRadius: ROUNDING.lg, 
    padding: 20,
    ...SHADOWS.md,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { 
    fontSize: 17, 
    fontFamily: FONTS.displayBold, 
    color: COLORS.darkNavy 
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
    marginBottom: 14 
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
    gap: 10 
  },
  modalBtnCancel: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalBtnCancelText: { 
    fontSize: 13.5, 
    fontFamily: FONTS.bodyBold, 
    color: COLORS.darkNavy 
  },
  modalBtnReject: { 
    backgroundColor: "#EF4444", 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10 
  },
  modalBtnRejectText: { 
    fontSize: 13.5, 
    fontFamily: FONTS.bodyBold, 
    color: "#FFFFFF" 
  },
});

export default ManagerTeamLeaveDetailsScreen;
