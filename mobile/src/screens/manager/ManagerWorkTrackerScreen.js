import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";

const TEAL = "#C2410C";

const ManagerWorkTrackerScreen = ({ navigation }) => (
  <ManagerLayout navigation={navigation} title="Work Tracker">
    <View style={styles.center}>
      <Ionicons name="stopwatch-outline" size={56} color="#99f6e4" />
      <Text style={styles.title}>Work Tracker</Text>
      <Text style={styles.sub}>Track active work sessions and time logs.</Text>
      <Text style={styles.coming}>Full module coming soon</Text>
    </View>
  </ManagerLayout>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginTop: 16 },
  sub: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 19 },
  coming: { marginTop: 16, fontSize: 12, color: TEAL, fontWeight: "700", backgroundColor: "#f0fdfa", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
});

export default ManagerWorkTrackerScreen;
