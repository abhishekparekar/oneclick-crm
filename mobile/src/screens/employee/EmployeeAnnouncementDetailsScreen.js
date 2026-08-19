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
import { markAnnouncementReadApi } from "../../api/announcementService";
import { useAppData } from "../../context/AppDataContext";

const EmployeeAnnouncementDetailsScreen = ({ route, navigation }) => {
  const { announcement } = route.params || {};
  const { refreshEmployeeDashboard } = useAppData();
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const markAsRead = async () => {
      if (announcement && !announcement.isRead) {
        try {
          setMarking(true);
          await markAnnouncementReadApi(announcement._id);
          // Sync context dashboard unreads
          if (refreshEmployeeDashboard) {
            await refreshEmployeeDashboard();
          }
        } catch (err) {
          console.error("Failed to mark announcement as read:", err);
        } finally {
          setMarking(false);
        }
      }
    };
    markAsRead();
  }, [announcement]);

  if (!announcement) {
    return (
      <EmployeeLayout navigation={navigation} title="Announcement Details">
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Announcement details not found.</Text>
          <AppButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.goBackBtn}
          />
        </View>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout navigation={navigation} title="Announcement Details">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company News</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppCard style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Ionicons name="megaphone" size={24} color="#2563eb" />
              </View>
              <View style={styles.titleWrapper}>
                <Text style={styles.annTitle}>{announcement.title}</Text>
                <Text style={styles.annDate}>
                  Published: {new Date(announcement.createdAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.messageLabel}>ANNOUNCEMENT</Text>
            <Text style={styles.messageText}>{announcement.message}</Text>

            {announcement.targetRoles && announcement.targetRoles.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsLabel}>Target: </Text>
                {announcement.targetRoles.map((role, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{role}</Text>
                  </View>
                ))}
              </View>
            )}
          </AppCard>

          <AppButton
            title="Back to All News"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            icon="chevron-back"
          />
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
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  titleWrapper: {
    flex: 1,
  },
  annTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    lineHeight: 22,
  },
  annDate: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 16,
  },
  contentLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contentText: {
    fontSize: 14.5,
    color: "#334155",
    lineHeight: 23,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    flexWrap: "wrap",
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  tag: {
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  backButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
  },
});

export default EmployeeAnnouncementDetailsScreen;
