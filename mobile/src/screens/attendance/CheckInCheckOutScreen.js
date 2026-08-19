import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppButton from "../../components/AppButton";
import { checkInApi, checkOutApi, getMyTodayApi } from "../../api/attendanceService";

const nowText = () => new Date().toLocaleString();

const CheckInCheckOutScreen = () => {
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [message, setMessage] = useState("");

  const loadToday = async () => {
    try {
      const { data } = await getMyTodayApi();
      setTodayRecord(data.attendance || null);
    } catch {
      setTodayRecord(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [])
  );

  const locationPlaceholder = {
    latitude: 0,
    longitude: 0,
    address: "GPS placeholder",
  };

  const onCheckIn = async () => {
    setLoading(true);
    setMessage("");
    try {
      await checkInApi({ punchInLocation: locationPlaceholder });
      setMessage(`Checked in at ${nowText()}`);
      await loadToday();
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const onCheckOut = async () => {
    setLoading(true);
    setMessage("");
    try {
      await checkOutApi({ punchOutLocation: locationPlaceholder });
      setMessage(`Checked out at ${nowText()}`);
      await loadToday();
    } catch (error) {
      setMessage(error.response?.data?.message || "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.info}>Date: {new Date().toLocaleDateString()}</Text>
      <Text style={styles.info}>Time: {new Date().toLocaleTimeString()}</Text>
      <Text style={styles.info}>GPS: lat 0, long 0 (placeholder)</Text>
      <Text style={styles.status}>Status: {todayRecord?.status || "absent"}</Text>
      <Text style={styles.status}>
        Check-in: {todayRecord?.punchInTime ? new Date(todayRecord.punchInTime).toLocaleTimeString() : "-"}
      </Text>
      <Text style={styles.status}>
        Check-out: {todayRecord?.punchOutTime ? new Date(todayRecord.punchOutTime).toLocaleTimeString() : "-"}
      </Text>
      <AppButton
        title="Check In"
        onPress={onCheckIn}
        loading={loading}
        disabled={!!todayRecord?.punchInTime}
        style={styles.btn}
      />
      <AppButton
        title="Check Out"
        onPress={onCheckOut}
        loading={loading}
        disabled={!todayRecord?.punchInTime || !!todayRecord?.punchOutTime}
        variant="outline"
        style={styles.btn}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, color: "#111827" },
  info: { color: "#374151", marginBottom: 6 },
  status: { color: "#111827", marginBottom: 8, fontWeight: "500" },
  btn: { marginTop: 12 },
  message: { marginTop: 16, color: "#2563eb" },
});

export default CheckInCheckOutScreen;
