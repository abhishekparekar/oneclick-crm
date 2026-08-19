import { View, Text, StyleSheet } from "react-native";

const StatusBadge = ({ status }) => {
  const variant =
    status === "active" ? "active" : status === "terminated" ? "terminated" : "inactive";
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  active: { backgroundColor: "#dcfce7" },
  inactive: { backgroundColor: "#fee2e2" },
  terminated: { backgroundColor: "#e5e7eb" },
  text: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#374151",
  },
});

export default StatusBadge;
