import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import HRHeader from "../../components/HRHeader";
import { getHRLeavesApi, approveHRLeaveApi, rejectHRLeaveApi } from "../../api/hrService";
import AppButton from "../../components/AppButton";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { useAuth } from "../../context/AuthContext";

const HRLeaveRequestsScreen = () => {
  const { user, hasPermission } = useAuth();
  const canApproveReject = user?.role === "CompanyAdmin" || (hasPermission && hasPermission("leaves", "approveReject"));
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchLeaves = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getHRLeavesApi();
      if (response.data && response.data.leaves) {
        setLeaves(response.data.leaves);
        applyFilters(response.data.leaves, searchText);
      } else {
        setLeaves([]);
        setFilteredLeaves([]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeaves();
    }, [])
  );

  const applyFilters = (list, text) => {
    if (!text) {
      setFilteredLeaves(list);
      return;
    }
    const cleanText = text.toLowerCase().trim();
    const filtered = list.filter((item) => {
      const empName = item.employeeId
        ? `${item.employeeId.firstName} ${item.employeeId.lastName}`.toLowerCase()
        : "";
      const code = item.employeeId?.employeeCode ? item.employeeId.employeeCode.toLowerCase() : "";
      const reason = (item.reason || "").toLowerCase();
      const status = (item.status || "").toLowerCase();
      return empName.includes(cleanText) || code.includes(cleanText) || reason.includes(cleanText) || status.includes(cleanText);
    });
    setFilteredLeaves(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    applyFilters(leaves, text);
  };

  const handleApprove = async (id) => {
    Alert.alert(
      "Approve Leave",
      "Are you sure you want to approve this leave request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setLoading(true);
              await approveHRLeaveApi(id);
              Alert.alert("Success", "Leave request has been approved successfully");
              fetchLeaves(true);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to approve leave");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenRejectModal = (id) => {
    setSelectedLeaveId(id);
    setRejectionReason("");
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejecting the leave request");
      return;
    }

    try {
      setRejecting(true);
      await rejectHRLeaveApi(selectedLeaveId, rejectionReason.trim());
      Alert.alert("Success", "Leave request has been rejected successfully");
      setRejectModalVisible(false);
      fetchLeaves(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to reject leave");
    } finally {
      setRejecting(false);
      setSelectedLeaveId(null);
    }
  };

  const getStatusBadge = (status) => {
    let color = "#16a34a";
    let bg = "#dcfce7";
    if (status === "pending") {
      color = "#d97706";
      bg = "#fef3c7";
    } else if (status === "rejected") {
      color = "#dc2626";
      bg = "#fef2f2";
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const renderLeaveCard = ({ item }) => {
    const empName = item.employeeId
      ? `${item.employeeId.firstName} ${item.employeeId.lastName}`
      : "Workforce Member";
    const empCode = item.employeeId?.employeeCode || "N/A";
    const startStr = formatDateToDDMMYYYY(item.startDate);
    const endStr = formatDateToDDMMYYYY(item.endDate);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="document-text-outline" size={20} color="#d97706" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.empName}>{empName}</Text>
            <Text style={styles.empCode}>Code: {empCode} • Type: {item.leaveType}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.divider} />

        <View style={styles.descBlock}>
          <Text style={styles.descLabel}>Duration</Text>
          <Text style={styles.durationVal}>
            {startStr} to {endStr} ({item.daysCount} {item.daysCount > 1 ? "days" : "day"})
          </Text>
        </View>

        <View style={[styles.descBlock, { marginTop: 8 }]}>
          <Text style={styles.descLabel}>Reason</Text>
          <Text style={styles.reasonText}>{item.reason || "No reason submitted"}</Text>
        </View>

        {item.rejectionReason && (
          <View style={[styles.descBlock, styles.rejectionBlock]}>
            <Text style={[styles.descLabel, { color: "#b91c1c" }]}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}

        {item.status === "pending" && canApproveReject && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleOpenRejectModal(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
              <Text style={[styles.actionBtnText, { color: "#16a34a" }]}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HRHeader title="Leave Requests" />

      {/* Search Header Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leaves by employee or reason..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={handleSearchChange}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching company leave records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeaves}
          keyExtractor={(item) => item._id}
          renderItem={renderLeaveCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchLeaves(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No leave requests recorded</Text>
            </View>
          }
        />
      )}

      {/* Reject Reason input Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalBgDim}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Leave Request</Text>
            <Text style={styles.modalSubtitle}>Please specify the reason for rejection:</Text>
            
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter rejection reason here..."
              placeholderTextColor="#94a3b8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                style={styles.cancelBtn}
                textStyle={{ color: "#475569" }}
                onPress={() => setRejectModalVisible(false)}
              />
              <AppButton
                title={rejecting ? "Rejecting..." : "Confirm Reject"}
                style={styles.confirmBtn}
                loading={rejecting}
                onPress={handleReject}
              />
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
  searchBarContainer: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  empName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  empCode: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  descBlock: {
    flexDirection: "column",
  },
  descLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  durationVal: {
    fontSize: 12.5,
    color: "#334155",
    marginTop: 2,
    fontWeight: "700",
  },
  reasonText: {
    fontSize: 12.5,
    color: "#475569",
    marginTop: 2,
    fontWeight: "500",
  },
  rejectionBlock: {
    marginTop: 8,
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#fecaca",
  },
  rejectionText: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 2,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    width: "48%",
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  approveBtn: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  modalBgDim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    color: "#1e293b",
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    width: "48%",
    height: 40,
  },
  confirmBtn: {
    backgroundColor: "#dc2626",
    width: "48%",
    height: 40,
  },
});

export default HRLeaveRequestsScreen;
