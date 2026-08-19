import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import HRHeader from "../../components/HRHeader";
import { getMyNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from "../../api/notificationService";

const HRNotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getMyNotificationsApi();
      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationReadApi(id);
      fetchNotifications(true);
    } catch (err) {
      console.warn("Failed to mark notification as read:", err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsReadApi();
      Alert.alert("Success", "All notifications marked as read");
      fetchNotifications(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to mark all as read");
      setLoading(false);
    }
  };

  const handleNotificationTap = async (item) => {
    if (!item.isRead) {
      handleMarkAsRead(item._id);
    }

    const type = (item.type || "").toLowerCase();
    let data = item.data || {};
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (e) { }
    }

    const taskId = data.taskId || data.id || item.taskId;
    const leaveId = data.leaveId || data.id || item.leaveId;
    const projectId = data.projectId || data.id || item.projectId;

    if (type.includes("task") || taskId) {
      if (taskId && navigation) navigation.navigate("HRTaskDetails", { taskId });
      else if (navigation) navigation.navigate("HRTaskBoard");
    } else if (type.includes("leave") || leaveId) {
      if (navigation) navigation.navigate("HRLeaveRequests");
    } else if (type.includes("project") || projectId) {
      if (projectId && navigation) navigation.navigate("HRProjectDetails", { projectId });
      else if (navigation) navigation.navigate("HRProjectList");
    } else if (type.includes("attendance") || type.includes("punch")) {
      if (navigation) navigation.navigate("HRManageAttendance");
    } else if (type.includes("announcement")) {
      if (navigation) navigation.navigate("HRAnnouncements");
    }
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item.isRead;
    const dateStr = new Date(item.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBg, isUnread ? styles.iconBgUnread : styles.iconBgRead]}>
            <Ionicons
              name={isUnread ? "notifications" : "notifications-outline"}
              size={18}
              color={isUnread ? "#2563eb" : "#64748b"}
            />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.titleUnread]}>{item.title}</Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message}>{item.message || item.body}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <HRHeader title="Notifications" />

      {notifications.length > 0 && unreadCount > 0 ? (
        <View style={styles.actionHeader}>
          <Text style={styles.unreadText}>{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</Text>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color="#2563eb" />
            <Text style={styles.markAllBtnText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>All caught up! No notifications.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  unreadText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardUnread: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    elevation: 3,
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgUnread: {
    backgroundColor: "#dbeafe",
  },
  iconBgRead: {
    backgroundColor: "#f1f5f9",
  },
  textCol: {
    marginLeft: 12,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#64748b",
  },
  titleUnread: {
    color: "#1e293b",
    fontWeight: "800",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563eb",
  },
  message: {
    fontSize: 12.5,
    color: "#334155",
    marginTop: 4,
    lineHeight: 18,
    fontWeight: "500",
  },
  date: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 6,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
});

export default HRNotificationsScreen;
