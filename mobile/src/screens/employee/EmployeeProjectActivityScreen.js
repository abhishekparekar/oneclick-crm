import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getEmployeeProjectActivityApi } from "../../api/projectService";

const EmployeeProjectActivityScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjectActivity = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getEmployeeProjectActivityApi(projectId);
      if (res.data && res.data.success) {
        setActivities(res.data.activityLog || []);
      }
    } catch (error) {
      console.error("Error loading project activities:", error);
      Alert.alert("Error", "Could not load project activity stream.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectActivity();
    }
  }, [projectId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjectActivity(false);
  };

  return (
    <EmployeeLayout navigation={navigation} title="Project Stream" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Activity Stream</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : activities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="analytics-outline" size={36} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>No activity registered yet</Text>
              <Text style={styles.emptySubtext}>Team updates and scope changes will be visible here in a vertical timeline</Text>
            </View>
          ) : (
            <AppCard style={styles.timelineCard}>
              {activities.map((act, index) => {
                const date = new Date(act.createdAt);
                const isLast = index === activities.length - 1;

                return (
                  <View key={act._id || index} style={styles.timelineRow}>
                    <View style={styles.timelineIndicatorCol}>
                      <View style={styles.timelineDot} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContentCol}>
                      <Text style={styles.actionText}>{act.action}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="person-outline" size={11} color="#64748b" />
                        <Text style={styles.metaText}>{act.performedBy}</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Ionicons name="time-outline" size={11} color="#64748b" />
                        <Text style={styles.metaText}>
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </AppCard>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  timelineCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 65,
  },
  timelineIndicatorCol: {
    alignItems: "center",
    marginRight: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563eb",
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  timelineContentCol: {
    flex: 1,
    paddingBottom: 16,
  },
  actionText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#334155",
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 3,
    fontWeight: "600",
  },
  metaDivider: {
    marginHorizontal: 6,
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "750",
  },
  emptySubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});

export default EmployeeProjectActivityScreen;
