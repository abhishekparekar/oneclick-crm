import { View, Text, StyleSheet, ScrollView } from "react-native";
import StatusBadge from "../../components/StatusBadge";

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value ?? "-"}</Text>
  </View>
);

const AttendanceDetailsScreen = ({ route }) => {
  const { record } = route.params || {};

  if (!record) {
    return (
      <View style={styles.center}>
        <Text>No record available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Row label="Date" value={record.date} />
      <Row
        label="Team Member"
        value={
          record.employeeId
            ? `${record.employeeId.firstName || ""} ${record.employeeId.lastName || ""}`.trim()
            : "-"
        }
      />
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status</Text>
        <StatusBadge status={record.status} />
      </View>
      <Row
        label="Check-in"
        value={record.checkInTime ? new Date(record.checkInTime).toLocaleString() : "-"}
      />
      <Row
        label="Check-out"
        value={record.checkOutTime ? new Date(record.checkOutTime).toLocaleString() : "-"}
      />
      <Row label="Total hours" value={String(record.totalHours || 0)} />
      <Row
        label="Check-in location"
        value={
          record.checkInLocation?.address ||
          `${record.checkInLocation?.latitude || "-"}, ${record.checkInLocation?.longitude || "-"}`
        }
      />
      <Row
        label="Check-out location"
        value={
          record.checkOutLocation?.address ||
          `${record.checkOutLocation?.latitude || "-"}, ${record.checkOutLocation?.longitude || "-"}`
        }
      />
      <Row label="Regularization" value={record.regularizationStatus} />
      <Row label="Reason" value={record.regularizationReason} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { marginBottom: 12 },
  label: { color: "#6b7280", fontSize: 12 },
  value: { marginTop: 2, color: "#111827", fontSize: 15 },
  statusRow: { marginBottom: 12 },
});

export default AttendanceDetailsScreen;
