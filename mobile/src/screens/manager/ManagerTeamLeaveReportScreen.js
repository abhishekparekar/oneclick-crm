import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import moment from "moment";

const ManagerTeamLeaveReportScreen = () => {
  const { fetchTeamLeavesReport } = useManagerController();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchTeamLeavesReport();
    setData(res || []);
    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.employeeId?.fullName || "Unknown"}</Text>
        <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.detail}>Type: {item.leaveType}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>From: {moment(item.startDate).format("DD MMM YYYY")}</Text>
        <Text style={styles.detail}>To: {moment(item.endDate).format("DD MMM YYYY")}</Text>
      </View>
      <Text style={styles.detail}>Days: {item.totalDays}</Text>
    </View>
  );

  return (
    <ManagerLayout title="Team Leave Report" showBackButton>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No leaves found.</Text>}
          />
        )}
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  status: (st) => ({
    fontSize: 12,
    fontWeight: "bold",
    color: st === "approved" ? "#4CAF50" : st === "rejected" ? "#F44336" : "#FF9800",
  }),
  detail: { fontSize: 14, color: "#666" },
  empty: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerTeamLeaveReportScreen;
