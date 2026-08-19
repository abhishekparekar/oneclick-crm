import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getEmployeeAnnouncementsApi } from "../../api/announcementService";

const ANNOUNCEMENT_FILTERS = [
  { label: "All News", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const AnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchAnnouncements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data } = await getEmployeeAnnouncementsApi();
      if (data && data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements(true);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements(false);
  };

  const getFilteredAnnouncements = () => {
    switch (activeFilter) {
      case "unread":
        return announcements.filter((ann) => !ann.isRead);
      case "read":
        return announcements.filter((ann) => ann.isRead);
      default:
        return announcements;
    }
  };

  const filteredData = getFilteredAnnouncements();

  return (
    <EmployeeLayout navigation={navigation} title="Announcements">
      <View style={styles.container}>
        {/* Header Title Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Company Announcements</Text>
          <Text style={styles.subtitle}>Stay synchronized with corporate updates and policies</Text>
        </View>

        {/* Tab Filters */}
        <View style={styles.filtersWrapper}>
          {ANNOUNCEMENT_FILTERS.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count =
              tab.value === "all"
                ? announcements.length
                : tab.value === "unread"
                ? announcements.filter((a) => !a.isRead).length
                : announcements.filter((a) => a.isRead).length;

            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : filteredData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyText}>No announcements in this category.</Text>
            </View>
          ) : (
            filteredData.map((ann) => (
              <TouchableOpacity
                key={ann._id}
                onPress={() => navigation.navigate("EmployeeAnnouncementDetails", { announcement: ann })}
                activeOpacity={0.8}
              >
                <AppCard style={[styles.announcementCard, !ann.isRead && styles.unreadCard]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrapper, ann.isRead ? styles.iconRead : styles.iconUnread]}>
                      <Ionicons
                        name={ann.isRead ? "megaphone-outline" : "megaphone"}
                        size={20}
                        color={ann.isRead ? "#64748b" : "#2563eb"}
                      />
                    </View>
                    <View style={styles.titleWrapper}>
                      <View style={styles.titleRow}>
                        <Text style={styles.annTitle} numberOfLines={1}>
                          {ann.title}
                        </Text>
                        {!ann.isRead && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.annDate}>
                        {new Date(ann.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.annContent} numberOfLines={2}>
                    {ann.message}
                  </Text>
                  
                  <View style={styles.readMoreRow}>
                    <Text style={styles.readMoreText}>Read detail content</Text>
                    <Ionicons name="chevron-forward" size={14} color="#2563eb" />
                  </View>
                </AppCard>
              </TouchableOpacity>
            ))
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 3,
    fontWeight: "500",
  },
  filtersWrapper: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    justifyContent: "space-between",
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: {
    borderBottomColor: "#2563eb",
  },
  filterTabText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748b",
  },
  filterTabTextActive: {
    color: "#2563eb",
    fontWeight: "750",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    backgroundColor: "#eff6ff",
  },
  badgeInactive: {
    backgroundColor: "#f1f5f9",
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  badgeTextActive: {
    color: "#2563eb",
  },
  badgeTextInactive: {
    color: "#64748b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13.5,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 10,
  },
  announcementCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  unreadCard: {
    borderColor: "#bfdbfe",
    borderWidth: 1.2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRead: {
    backgroundColor: "#f1f5f9",
  },
  iconUnread: {
    backgroundColor: "#eff6ff",
  },
  titleWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  annTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#2563eb",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  newBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
  },
  annDate: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 2,
  },
  annContent: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 12,
  },
  readMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  readMoreText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563eb",
    marginRight: 4,
  },
});

export default AnnouncementsScreen;
