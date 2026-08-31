import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";

const TEAL = "#C2410C";

const ManagerProjectsScreen = ({ navigation }) => {
  const { projects, loadingProjects, fetchProjects } = useManagerController();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleCreateProject = () => {
    navigation.navigate("ManagerCreateProject");
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects(true);
    setRefreshing(false);
  };

  const filteredProjects = projects.filter((p) => {
    return p.name?.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate Metrics based on project status
  const totalProjectsCount = projects.length;
  const inProjectsCount = projects.filter(
    (p) => p.status === "active" || p.status === "working" || p.status === "deployment" || p.status === "review"
  ).length;
  const completedProjectsCount = projects.filter(
    (p) => p.status === "completed" || p.status === "done"
  ).length;
  const onHoldProjectsCount = projects.filter(
    (p) => p.status === "on-hold" || p.status === "planning"
  ).length;

  const completedPercentage =
    totalProjectsCount > 0
      ? Math.round((completedProjectsCount / totalProjectsCount) * 100)
      : 0;

  const inProjectsPercentage =
    totalProjectsCount > 0
      ? Math.round((inProjectsCount / totalProjectsCount) * 100)
      : 0;

  const onHoldPercentage =
    totalProjectsCount > 0
      ? Math.round((onHoldProjectsCount / totalProjectsCount) * 100)
      : 0;

  const getInitials = (firstName, lastName) => {
    return `${(firstName || "P")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
  };

  const renderRingChart = (percentage) => {
    const size = 64;
    const strokeWidth = 5.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View
        style={{
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={TEAL}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#1e293b" }}>
            {percentage}%
          </Text>
        </View>
      </View>
    );
  };

  const getProjectIconConfig = (status) => {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", color: "#059669", icon: "checkmark-done-circle" };
      case "planning":
      case "on-hold":
        return { bg: "#fef3c7", color: "#d97706", icon: "pause-circle" };
      case "review":
      case "deployment":
        return { bg: "#f3e8ff", color: "#7c3aed", icon: "construct" };
      case "active":
      case "working":
      default:
        return { bg: "#e0f2fe", color: "#0284c7", icon: "folder" };
    }
  };

  const renderProjectItem = ({ item }) => {
    const memberList = item.members || [];
    const formattedEndDate = item.endDate
      ? new Date(item.endDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Open";

    const totalMilestones = item.milestones?.length || 0;
    const completedMilestones =
      item.milestones?.filter((m) => m.status === "completed").length || 0;
    const progress =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : item.status === "completed"
        ? 100
        : item.status === "active" || item.status === "working"
        ? 60
        : 40;

    const iconConfig = getProjectIconConfig(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("ManagerProjectDetails", { projectId: item._id })
        }
      >
        <View style={styles.projectCard}>
        {/* Project Card Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.projectIconContainer, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.icon} size={18} color={iconConfig.color} />
          </View>

          <View style={styles.projectTitleContainer}>
            <Text style={styles.projectNameText} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {/* Status pill badge */}
          <View style={styles.cardActionsRow}>
            <View style={[styles.statusBadge, { backgroundColor: iconConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: iconConfig.color }]}>
                {item.status === "active" || item.status === "working"
                  ? "In Progress"
                  : (item.status || "Open").charAt(0).toUpperCase() +
                    (item.status || "open").slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Progress Bar */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.endDateTimeText}>Due: {formattedEndDate}</Text>

          <View style={styles.avatarOverlayRow}>
            {memberList.slice(0, 3).map((member, index) => {
              const initials =
                typeof member === "object"
                  ? getInitials(member.firstName, member.lastName)
                  : "M";
              return (
                <View key={index} style={[styles.avatarBubble, { zIndex: 10 - index }]}>
                  <Text style={styles.avatarBubbleText}>{initials}</Text>
                </View>
              );
            })}
            {memberList.length > 3 && (
              <View style={[styles.avatarBubble, styles.avatarBubblePlus]}>
                <Text style={styles.avatarBubblePlusText}>
                  +{memberList.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ManagerLayout navigation={navigation} title="My Projects" activeTabOverride="ManagerProjects">
      <LinearGradient colors={['rgba(239, 246, 255, 0.8)', '#ffffff', 'rgba(238, 242, 255, 0.8)']} style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TEAL}
            />
          }
        >
          {/* Header Area */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>My Projects</Text>
              <Text style={styles.sectionSubtitle}>
                Track your team's assigned projects
              </Text>
            </View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreateProject}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Horizontal summary metric cards */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Assigned</Text>
              <Text style={styles.metricValue}>{totalProjectsCount}</Text>
              <Text style={styles.metricUnit}>Projects</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>In Projects</Text>
              <Text style={styles.metricValue}>{inProjectsCount}</Text>
              <Text style={styles.metricUnit}>Projects</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Completed</Text>
              <Text style={styles.metricValue}>{completedProjectsCount}</Text>
              <Text style={styles.metricUnit}>Projects</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>On Hold</Text>
              <Text style={styles.metricValue}>{onHoldProjectsCount}</Text>
              <Text style={styles.metricUnit}>Projects</Text>
            </View>
          </View>

          {/* Overall Progress donut section */}
          <View style={styles.progressBox}>
            <Text style={styles.progressBoxTitle}>Overall Progress</Text>
            <View style={styles.progressBoxContent}>
              <View style={styles.chartContainer}>
                {renderRingChart(completedPercentage)}
              </View>
              <View style={styles.progressLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.legendText}>
                    Completed:{" "}
                    <Text style={styles.legendBold}>
                      {completedProjectsCount} ({completedPercentage}%)
                    </Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#0284c7" }]} />
                  <Text style={styles.legendText}>
                    In Progress:{" "}
                    <Text style={styles.legendBold}>
                      {inProjectsCount} ({inProjectsPercentage}%)
                    </Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#d97706" }]} />
                  <Text style={styles.legendText}>
                    On Hold:{" "}
                    <Text style={styles.legendBold}>
                      {onHoldProjectsCount} ({onHoldPercentage}%)
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* FlatList container title */}
          <View style={styles.listSectionHeader}>
            <Text style={styles.listSectionTitle}>Project Portfolio</Text>
          </View>

          {/* Project List */}
          {loadingProjects && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={TEAL} />
              <Text style={styles.loadingText}>Loading project portfolio...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProjects}
              keyExtractor={(item) => item._id}
              renderItem={renderProjectItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="folder-open-outline" size={48} color="#94a3b8" />
                  <Text style={styles.emptyText}>No projects found</Text>
                </View>
              }
            />
          )}
        </ScrollView>
      </LinearGradient>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricUnit: {
    fontSize: 8.5,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 2,
  },
  progressBox: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
    overflow: "hidden",
  },
  progressBoxTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  progressBoxContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartContainer: {
    marginRight: 16,
  },
  progressLegend: {
    flex: 1,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11.5,
    color: "#475569",
  },
  legendBold: {
    fontWeight: "700",
    color: "#0f172a",
  },
  listSectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  projectCard: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  projectIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  projectTitleContainer: {
    flex: 1,
    marginRight: 6,
  },
  projectNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  progressBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 2.5,
    overflow: "hidden",
    marginRight: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: TEAL,
    borderRadius: 2.5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  avatarOverlayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    marginRight: -6,
  },
  avatarBubblePlus: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  avatarBubbleText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  avatarBubblePlusText: {
    color: "#64748b",
    fontSize: 8,
    fontWeight: "800",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },
});

export default ManagerProjectsScreen;
