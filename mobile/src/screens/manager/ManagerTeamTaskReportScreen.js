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

const ManagerTeamTaskReportScreen = () => {
  const { fetchTeamTasksReport } = useManagerController();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchTeamTasksReport();
    setData(res || []);
    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.row}>
        <Text style={styles.assignee}>Assignee: {item.assignedTo?.fullName || "Unassigned"}</Text>
        <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.detail}>Priority: {item.priority}</Text>
        <Text style={styles.detail}>Due: {item.endDateTime ? moment(item.endDateTime).format("DD MMM YYYY") : "No due date"}</Text>
      </View>
    </View>
  );

  return (
    <ManagerLayout title="Team Task Report" showBackButton>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No tasks found.</Text>}
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
  title: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  assignee: { fontSize: 14, color: "#444" },
  status: (st) => ({
    fontSize: 12,
    fontWeight: "bold",
    color:
      st === "complete" || st === "re_complete" ? "#4CAF50"
      : st === "late_complete" || st === "re_late_complete" ? "#f97316"
      : st === "overdue" ? "#dc2626"
      : "#FF9800",
  }),
  detail: { fontSize: 12, color: "#666" },
  empty: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerTeamTaskReportScreen;
