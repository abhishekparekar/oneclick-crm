import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import Loader from "../../components/Loader";
import StatusBadge from "../../components/StatusBadge";
import { getCompanyAttendanceApi } from "../../api/attendanceService";

const CompanyAttendanceScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await getCompanyAttendanceApi({ date: today });
      setRecords(data.attendance || []);
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

  if (loading && records.length === 0) return <Loader />;

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Attendance"
      showSearch={false}
    >
      <View style={styles.container}>
        <FlatList
          data={records}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate("AttendanceDetails", { record: item })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.employeeId?.firstName} {item.employeeId?.lastName}
                </Text>
                <Text style={styles.meta}>
                  {item.employeeId?.employeeCode} · {item.employeeId?.designationId?.name || "-"}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No records for today</Text>}
        />
      </View>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 12 },
  item: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { marginTop: 3, color: "#6b7280", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 30, color: "#6b7280" },
});

export default CompanyAttendanceScreen;
