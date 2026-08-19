import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import moment from "moment";

const ManagerAnnouncementsScreen = () => {
  const { announcements, loadingAnnouncements, fetchAnnouncements, readAnnouncement } = useManagerController();

  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements(true);
    }, [fetchAnnouncements])
  );

  const handleRead = (item) => {
    if (!item.isRead) {
      readAnnouncement(item._id);
    }
    navigation.navigate("ManagerAnnouncementDetailsScreen", { announcement: item });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => handleRead(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="megaphone-outline"
          size={24}
          color={item.isRead ? "#999" : "#ff9800"}
        />
      </View>
      <View style={styles.message}>
        <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
        <Text style={styles.date}>Published: {moment(item.publishedDate).format("DD MMM YYYY")}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <ManagerLayout title="Announcements" showBackButton>
      <View style={styles.container}>
        {loadingAnnouncements ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No announcements.</Text>}
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
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    alignItems: "flex-start",
  },
  unreadCard: {
    backgroundColor: "#fff8e1",
  },
  iconContainer: { marginRight: 16, marginTop: 4 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 6 },
  unreadText: { fontWeight: "bold", color: "#000" },
  message: { fontSize: 14, color: "#666", marginBottom: 8, lineHeight: 20 },
  date: { fontSize: 12, color: "#999" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff9800", marginLeft: 8, marginTop: 10 },
  empty: { textAlign: "center", color: "#666", marginTop: 20 },
});

export default ManagerAnnouncementsScreen;
