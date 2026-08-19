import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { regularizationRequestApi } from "../../api/attendanceService";

const RegularizationRequestScreen = () => {
  const [attendanceId, setAttendanceId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!attendanceId.trim() || !reason.trim()) {
      setMessage("Attendance ID and reason are required");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await regularizationRequestApi(attendanceId.trim(), reason.trim());
      setMessage("Regularization request submitted");
      setReason("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Regularization Request</Text>
      <AppInput
        label="Attendance ID"
        value={attendanceId}
        onChangeText={setAttendanceId}
        placeholder="Paste attendance record ID"
      />
      <AppInput
        label="Reason"
        value={reason}
        onChangeText={setReason}
        placeholder="Why regularization is needed"
        multiline
      />
      <AppButton title="Submit request" onPress={submit} loading={loading} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#111827" },
  message: { marginTop: 12, color: "#2563eb" },
});

export default RegularizationRequestScreen;
