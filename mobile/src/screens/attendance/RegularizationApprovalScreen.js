import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import {
  getCompanyAttendanceApi,
  approveRegularizationApi,
  rejectRegularizationApi,
} from "../../api/attendanceService";

const RegularizationApprovalScreen = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getCompanyAttendanceApi();
      setRecords((data.attendance || []).filter((r) => r.regularizationStatus === "pending"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const act = async (id, type) => {
    if (type === "approve") await approveRegularizationApi(id);
    else await rejectRegularizationApi(id);
    await load(true);
  };

  if (loading && records.length === 0) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.employeeId?.firstName} {item.employeeId?.lastName}
            </Text>
            <Text style={styles.meta}>Date: {item.date}</Text>
            <Text style={styles.meta}>Reason: {item.regularizationReason || "-"}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => act(item._id, "approve")}>
                <Text style={styles.approve}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => act(item._id, "reject")}>
                <Text style={styles.reject}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending regularization requests</Text>}
      />
      <AppButton title="Refresh" onPress={() => load(true)} variant="outline" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 12 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { color: "#6b7280", marginTop: 4 },
  actions: { marginTop: 10, flexDirection: "row", gap: 16 },
  approve: { color: "#16a34a", fontWeight: "700" },
  reject: { color: "#dc2626", fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 30, color: "#6b7280" },
});

export default RegularizationApprovalScreen;
