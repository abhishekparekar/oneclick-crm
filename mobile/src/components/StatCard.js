import { View, Text, StyleSheet } from "react-native";
import AppCard from "./AppCard";

const StatCard = ({ title, value, color = "#2563eb" }) => {
  return (
    <AppCard style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48%",
    marginBottom: 12,
    paddingVertical: 16,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: "#6b7280",
  },
});

export default StatCard;
