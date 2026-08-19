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

const ManagerTeamWorkReportScreen = () => {
  const { fetchTeamWorkReport } = useManagerController();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchTeamWorkReport();
    setData(res || []);
    setLoading(false);
  };

  const renderItem = ({ item }) => {
    const hours = (item.durationMinutes / 60).toFixed(1);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.employeeId?.fullName || "Unknown"}</Text>
          <Text style={styles.hours}>{hours}h</Text>
        </View>
        {item.projectId && <Text style={styles.detail}>Project: {item.projectId.name}</Text>}
        {item.taskId && <Text style={styles.detail}>Task: {item.taskId.title}</Text>}
        <View style={styles.row}>
          <Text style={styles.detail}>Date: {moment(item.startTime).format("DD MMM YYYY")}</Text>
          <Text style={styles.detail}>{item.source}</Text>
        </View>
      </View>
    );
  };

  return (
    <ManagerLayout title="Team Work Report" showBackButton>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No work logs found.</Text>}
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
  hours: { fontSize: 16, fontWeight: "bold", color: "#0066cc" },
  detail: { fontSize: 14, color: "#666", marginBottom: 2 },
  empty: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerTeamWorkReportScreen;
