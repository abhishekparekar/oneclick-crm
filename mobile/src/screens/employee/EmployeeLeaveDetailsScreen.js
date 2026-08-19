import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getLeaveDetailsApi, cancelLeaveApi } from "../../api/leaveService";

const EmployeeLeaveDetailsScreen = ({ route, navigation }) => {
  const { leaveId } = route.params || {};

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchLeaveDetails = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getLeaveDetailsApi(leaveId);
      if (res.data && res.data.success) {
        setLeave(res.data.leave || null);
      }
    } catch (err) {
      console.error("Failed to load leave details:", err);
      Alert.alert("Error", "Could not load leave request details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (leaveId) {
      fetchLeaveDetails();
    }
  }, [leaveId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaveDetails(false);
  };

  const handleCancelLeave = () => {
    Alert.alert(
      "Cancel Leave Request",
      "Are you sure you want to cancel this leave application?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const res = await cancelLeaveApi(leaveId);
              if (res.data && res.data.success) {
                Alert.alert("Request Cancelled", "Your leave application has been removed.");
                navigation.navigate("Leave");
              }
            } catch (err) {
              console.error("Failed cancellation:", err);
              Alert.alert("Error", "Could not cancel request.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return { bg: "#ecfdf5", text: "#10b981", icon: "checkmark-circle" };
      case "rejected":
        return { bg: "#fef2f2", text: "#ef4444", icon: "close-circle" };
      default:
        return { bg: "#fffbeb", text: "#d97706", icon: "hourglass-outline" };
    }
  };

  if (loading) {
    return (
      <EmployeeLayout navigation={navigation} title="Leave Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </EmployeeLayout>
    );
  }

  if (!leave) {
    return (
      <EmployeeLayout navigation={navigation} title="Leave Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Leave request details not found.</Text>
        </View>
      </EmployeeLayout>
    );
  }

  const statusColors = getStatusColor(leave.status);
  const isPending = leave.status === "pending";

  return (
    <EmployeeLayout navigation={navigation} title="Leave Details" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Request Overview</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Main Info Card */}
          <AppCard style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.leaveTitle}>{leave.leaveType} Leave</Text>
                <Text style={styles.leaveDuration}>
                  {leave.numberOfDays} Day{leave.numberOfDays > 1 ? "s" : ""} Requested
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Ionicons name={statusColors.icon} size={14} color={statusColors.text} style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {leave.status?.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.dateBlock}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>FROM DATE</Text>
                <Text style={styles.dateVal}>
                  {new Date(leave.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>TO DATE</Text>
                <Text style={styles.dateVal}>
                  {new Date(leave.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.reasonLabel}>REASON SPECIFIED</Text>
            <Text style={styles.reasonText}>{leave.reason || "No reason specified."}</Text>

            {/* Rejection Cause if Rejected */}
            {leave.status === "rejected" && leave.rejectionReason && (
              <View style={styles.rejectionBox}>
                <View style={styles.rejectionHeader}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                  <Text style={styles.rejectionTitle}>REJECTION REASON</Text>
                </View>
                <Text style={styles.rejectionText}>{leave.rejectionReason}</Text>
              </View>
            )}
          </AppCard>

          {/* Cancellation Option for Pending items */}
          {isPending && (
            <AppButton
              title="Cancel Leave Request"
              onPress={handleCancelLeave}
              loading={cancelling}
              style={styles.cancelBtn}
              icon="trash-outline"
            />
          )}
        </ScrollView>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailsCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  leaveTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e293b",
  },
  leaveDuration: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  dateBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 16,
  },
  dateCol: {
    alignItems: "center",
    flex: 1,
  },
  dateLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  dateVal: {
    fontSize: 13,
    fontWeight: "750",
    color: "#334155",
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 14,
  },
  reasonLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
  },
  rejectionBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
    marginTop: 16,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  rejectionTitle: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#ef4444",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  rejectionText: {
    fontSize: 12.5,
    color: "#b91c1c",
    lineHeight: 18,
  },
  cancelBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
  },
});

export default EmployeeLeaveDetailsScreen;
