import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import moment from "moment";

const ManagerNotificationDetailsScreen = ({ navigation: navProp }) => {
  const route = useRoute();
  const navHook = useNavigation();
  const navigation = navProp || navHook;

  let notification = null;
  try {
    notification = route?.params?.notification || null;
  } catch (e) {}

  const getIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("task")) return { name: "clipboard-outline", color: "#d97706" };
    if (t.includes("leave")) return { name: "calendar-outline", color: "#10b981" };
    if (t.includes("lead")) return { name: "magnet-outline", color: "#1268D9" };
    if (t.includes("project")) return { name: "folder-open-outline", color: "#06b6d4" };
    if (t.includes("payroll") || t.includes("payslip")) return { name: "cash-outline", color: "#7c3aed" };
    if (t.includes("attendance")) return { name: "time-outline", color: "#2563eb" };
    if (t.includes("announcement")) return { name: "megaphone-outline", color: "#f59e0b" };
    return { name: "notifications-outline", color: "#1268D9" };
  };

  if (!notification) {
    return (
      <ManagerLayout title="Notification Details" showBack={true} navigation={navigation}>
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
          <Text style={styles.errorText}>Notification not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => { try { navigation.goBack(); } catch (e) {} }}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ManagerLayout>
    );
  }

  const { name: iconName, color: iconColor } = getIcon(notification.type);
  const isAlert = notification.type === "alert";

  return (
    <ManagerLayout title="Notification Details" showBack={true} navigation={navigation}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: iconColor + "22" }]}>
              <Ionicons
                name={isAlert ? "warning-outline" : iconName}
                size={28}
                color={isAlert ? "#EF4444" : iconColor}
              />
            </View>
            <View style={styles.metaRight}>
              {Boolean(notification.type) && (
                <View style={[styles.typeBadge, { backgroundColor: iconColor + "18" }]}>
                  <Text style={[styles.typeText, { color: iconColor }]}>
                    {notification.type.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.date}>
                {notification.createdAt ? moment(notification.createdAt).format("DD MMM YYYY, hh:mm A") : ""}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{notification.title || "Notification"}</Text>

          {Boolean(notification.body || notification.message) && (
            <Text style={styles.message}>{notification.body || notification.message}</Text>
          )}

          <View style={styles.statusRow}>
            <Ionicons
              name={notification.isRead ? "checkmark-done" : "ellipse"}
              size={14}
              color={notification.isRead ? "#10b981" : "#1268D9"}
            />
            <Text style={[styles.statusText, { color: notification.isRead ? "#10b981" : "#1268D9" }]}>
              {notification.isRead ? "Read" : "Unread"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.goBackBtn}
          onPress={() => { try { navigation.goBack(); } catch (e) {} }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color="#1268D9" />
          <Text style={styles.goBackText}>Back to Notifications</Text>
        </TouchableOpacity>
      </ScrollView>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  metaRight: { flex: 1, justifyContent: "center" },
  typeBadge: {
    alignSelf: "flex-start", paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 6, marginBottom: 6,
  },
  typeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  date: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 10, lineHeight: 24 },
  message: { fontSize: 14, color: "#475569", lineHeight: 22, marginBottom: 16 },
  statusRow: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  statusText: { fontSize: 12, fontWeight: "700", marginLeft: 6 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { textAlign: "center", color: "#64748B", marginTop: 12, fontSize: 14 },
  backBtn: {
    marginTop: 16, backgroundColor: "#EFF6FF",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: "#1268D9", fontWeight: "700" },
  goBackBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#EFF6FF", padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  goBackText: { color: "#1268D9", fontWeight: "700", marginLeft: 8, fontSize: 14 },
});

export default ManagerNotificationDetailsScreen;

