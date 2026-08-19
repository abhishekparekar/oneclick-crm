import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import moment from "moment";

const ManagerAnnouncementDetailsScreen = () => {
  const route = useRoute();
  const { announcement } = route.params || {};
  const { readAnnouncement } = useManagerController();

  useEffect(() => {
    if (announcement?._id && !announcement?.isRead) {
      readAnnouncement(announcement._id);
    }
  }, [announcement]);

  if (!announcement) {
    return (
      <ManagerLayout title="Announcement Details" showBack={true}>
        <Text style={styles.errorText}>Announcement not found</Text>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout title="Announcement Details" showBack={true}>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="megaphone" size={32} color="#ff9800" />
            <Text style={styles.date}>
              {moment(announcement.publishedDate || announcement.createdAt).format("DD MMM YYYY")}
            </Text>
          </View>
          <Text style={styles.title}>{announcement.title}</Text>
          <Text style={styles.message}>{announcement.message}</Text>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Target: {announcement.targetType}</Text>
          </View>
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
  title: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 16 },
  content: { fontSize: 16, color: "#444", lineHeight: 24, marginBottom: 20 },
  footer: { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 },
  footerText: { fontSize: 12, color: "#999", fontStyle: "italic" },
  errorText: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerAnnouncementDetailsScreen;
