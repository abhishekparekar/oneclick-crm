import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import {
  markNotificationReadApi,
  deleteNotificationApi,
} from "../../api/notificationService";
import { useAppData } from "../../context/AppDataContext";

const EmployeeNotificationDetailsScreen = ({ route, navigation }) => {
  const { notification } = route.params || {};
  const [loading, setLoading] = useState(false);
  const { refreshEmployeeDashboard } = useAppData();

  useEffect(() => {
    const markAsRead = async () => {
      if (notification && !notification.isRead) {
        try {
          await markNotificationReadApi(notification._id);
          if (refreshEmployeeDashboard) {
            refreshEmployeeDashboard();
          }
        } catch (err) {
          console.error("Failed to mark notification as read:", err);
        }
      }
    };
    markAsRead();
  }, [notification]);

  if (!notification) {
    return (
      <EmployeeLayout navigation={navigation} title="Notification Details">
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Notification details not found.</Text>
          <AppButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.goBackBtn}
          />
        </View>
      </EmployeeLayout>
    );
  }

  const handleDelete = async () => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteNotificationApi(notification._id);
              if (refreshEmployeeDashboard) {
                refreshEmployeeDashboard();
              }
              Alert.alert("Success", "Notification deleted successfully.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete notification");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getIconAndColor = (type) => {
    switch (type?.toLowerCase()) {
      case "attendance":
        return { icon: "time-outline", color: "#3b82f6", bg: "#eff6ff" };
      case "leave":
        return { icon: "calendar-outline", color: "#10b981", bg: "#ecfdf5" };
      case "payroll":
      case "payslip":
        return { icon: "cash-outline", color: "#8b5cf6", bg: "#f5f3ff" };
      case "task":
        return { icon: "clipboard-outline", color: "#f59e0b", bg: "#fffbeb" };
      case "project":
        return { icon: "folder-open-outline", color: "#06b6d4", bg: "#ecfeff" };
      default:
        return { icon: "notifications-outline", color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const { icon, color, bg } = getIconAndColor(notification.type);

  return (
    <EmployeeLayout navigation={navigation} title="Notification Details">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>View Alert</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppCard style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={24} color={color} />
              </View>
              <View style={styles.titleWrapper}>
                <Text style={styles.notifTitle}>{notification.title}</Text>
                <Text style={[styles.notifType, { color }]}>{notification.type?.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.messageLabel}>MESSAGE</Text>
            <Text style={styles.messageText}>{notification.message}</Text>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>
                {new Date(notification.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </AppCard>

          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
          ) : (
            <AppButton
              title="Delete Notification"
              onPress={handleDelete}
              style={styles.deleteBtn}
              icon="trash-outline"
            />
          )}
        </ScrollView>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  goBackBtn: {
    minWidth: 150,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  titleWrapper: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    lineHeight: 22,
  },
  notifType: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 16,
  },
  messageLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginLeft: 6,
  },
  loader: {
    marginTop: 10,
  },
  deleteBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
  },
});

export default EmployeeNotificationDetailsScreen;
