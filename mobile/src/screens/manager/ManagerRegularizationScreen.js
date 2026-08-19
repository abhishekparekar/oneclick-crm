import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const ManagerRegularizationScreen = ({ navigation }) => {
  const {
    regularizationRequests,
    loadingRegularization,
    getRegularizationRequestsList,
    approveRegularization,
    rejectRegularization,
  } = useManagerController();

  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadData = useCallback(async (force = false) => {
    await getRegularizationRequestsList(force);
  }, [getRegularizationRequestsList]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleApprove = (id) => {
    Alert.alert("Confirm Approval", "Are you sure you want to approve this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setProcessingId(id);
          try {
            await approveRegularization(id);
            Alert.alert("Success", "Request approved successfully.");
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to approve.");
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert("Confirm Rejection", "Are you sure you want to reject this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setProcessingId(id);
          try {
            // Ideally we'd prompt for reason, hardcoding default reason for simplicity in this template
            await rejectRegularization(id, "Rejected by Manager");
            Alert.alert("Success", "Request rejected.");
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to reject.");
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.split(" ");
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }) => {
    const isProcessing = processingId === item._id;
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          {item.employeeId?.photo ? (
            <Image source={{ uri: item.employeeId.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{getInitials(item.employeeId?.fullName)}</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.employeeId?.fullName}</Text>
            <Text style={styles.cardSub}>{item.employeeId?.employeeCode}</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Date:</Text> {item.date}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Reason:</Text> {item.regularizationReason}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.disabledBtn]}
            onPress={() => handleReject(item._id)}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator size="small" color="#dc2626" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.disabledBtn]}
            onPress={() => handleApprove(item._id)}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveBtnText}>Approve</Text>}
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="Regularization">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Requests</Text>
      </View>

      <View style={styles.container}>
        {loadingRegularization && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : regularizationRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>There are no pending regularization requests from your team.</Text>
          </View>
        ) : (
          <FlatList
            data={regularizationRequests}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[TEAL]} />}
          />
        )}
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },
  headerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  listContent: { padding: 16, paddingBottom: 40 },
  
  card: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL_LIGHT, marginRight: 12 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 12, borderWidth: 1, borderColor: "#ccfbf1" },
  avatarFallbackText: { color: TEAL, fontSize: 14, fontWeight: "800" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "750", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "500" },
  
  detailsBox: { backgroundColor: "#f1f5f9", padding: 12, borderRadius: 8, marginBottom: 16 },
  detailText: { fontSize: 13, color: "#334155", marginBottom: 4 },
  detailLabel: { fontWeight: "700", color: "#64748b" },

  actionRow: { flexDirection: "row", justifyContent: "flex-end" },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 12, minWidth: 90, alignItems: "center" },
  disabledBtn: { opacity: 0.6 },
  rejectBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#fca5a5" },
  rejectBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  approveBtn: { backgroundColor: TEAL },
  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  emptyCard: { margin: 16, alignItems: "center", padding: 32, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6 },
});

export default ManagerRegularizationScreen;
