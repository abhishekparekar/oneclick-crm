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

const ManagerTeamAttendanceReportScreen = () => {
  const { fetchTeamAttendanceReport } = useManagerController();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchTeamAttendanceReport();
    setData(res || []);
    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.employeeId?.fullName}</Text>
        <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.date}>{moment(item.date).format("DD MMM YYYY")}</Text>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>In: {item.punchInTime ? moment(item.punchInTime).format("hh:mm A") : "--:--"}</Text>
        <Text style={styles.timeText}>Out: {item.punchOutTime ? moment(item.punchOutTime).format("hh:mm A") : "--:--"}</Text>
        <Text style={styles.timeText}>Hrs: {item.totalHours || 0}</Text>
      </View>
    </View>
  );

  return (
    <ManagerLayout title="Team Attendance Report" showBackButton>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No attendance records found.</Text>}
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  status: (st) => ({
    fontSize: 12,
    fontWeight: "bold",
    color: st === "present" ? "#4CAF50" : st === "absent" ? "#F44336" : "#FF9800",
  }),
  date: { fontSize: 14, color: "#666", marginVertical: 4 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  timeText: { fontSize: 12, color: "#555" },
  empty: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerTeamAttendanceReportScreen;
