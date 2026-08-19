import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import moment from "moment";

const ManagerNotificationDetailsScreen = () => {
  const route = useRoute();
  const { notification } = route.params || {};

  if (!notification) {
    return (
      <ManagerLayout title="Notification Details" showBack={true}>
        <Text style={styles.errorText}>Notification not found</Text>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="Notification Details" showBack={true}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons
              name={notification.type === "alert" ? "warning" : "notifications"}
              size={32}
              color="#0066cc"
            />
            <Text style={styles.date}>{moment(notification.createdAt).format("DD MMM YYYY, hh:mm A")}</Text>
          </View>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message}>{notification.body || notification.message || ""}</Text>
        </View>
      </ScrollView>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8", padding: 16 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 8, elevation: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  date: { fontSize: 14, color: "#999" },
  title: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 12 },
  message: { fontSize: 16, color: "#444", lineHeight: 24 },
  errorText: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerNotificationDetailsScreen;
