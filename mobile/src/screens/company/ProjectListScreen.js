import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getProjectsApi,
  deleteProjectApi,
} from "../../api/companyService";
import { getEmployeesApi } from "../../api/employeeService";

const ProjectListScreen = ({ navigation }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: projects = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['companyProjects'],
    queryFn: async () => {
      const [projRes] = await Promise.all([
        getProjectsApi(),
        getEmployeesApi({ status: "active" }),
      ]);
      return projRes.data?.projects || [];
    }
  });

  const filteredProjects = safeProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics based on project status
  const safeProjects = Array.isArray(projects) ? projects : [];
  const totalProjectsCount = safeProjects.length;
  const inProjectsCount = safeProjects.filter(p => p.status === 'active' || p.status === 'working').length;
  const completedProjectsCount = safeProjects.filter(p => p.status === 'completed' || p.status === 'done').length;
  const onHoldProjectsCount = safeProjects.filter(p => p.status === 'on-hold').length;

  const completedPercentage = totalProjectsCount > 0 
    ? Math.round((completedProjectsCount / totalProjectsCount) * 100) 
    : 68;

  const inProjectsPercentage = totalProjectsCount > 0
    ? Math.round((inProjectsCount / totalProjectsCount) * 100)
    : 34;

  const onHoldPercentage = totalProjectsCount > 0
    ? Math.round((onHoldProjectsCount / totalProjectsCount) * 100)
    : 0;

  const handleAddPress = () => {
    navigation.navigate("CompanyCreateProject");
  };

  const handleEditPress = (item) => {
    navigation.navigate("CompanyCreateProject", { editingProject: item });
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this project? All associated tasks may lose their project reference.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProjectApi(id);
              Alert.alert("Success", "Project deleted successfully");
              queryClient.invalidateQueries(['companyProjects']);
              queryClient.invalidateQueries(['companyDashboard']);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Deletion failed");
            }
          },
        },
      ]
    );
  };

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
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
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
            stroke="#2d6a74" // dark teal accent matching mockup
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#1e293b" }}>{percentage}%</Text>
        </View>
      </View>
    );
  };

  const getProjectIconConfig = (status) => {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", color: "#059669", icon: "checkmark-done-circle" };
      case "on-hold":
        return { bg: "#fffbeb", color: "#d97706", icon: "pause-circle" };
      case "planning":
        return { bg: "#f3e8ff", color: "#7c3aed", icon: "construct" };
      case "active":
      default:
        return { bg: "#e0f2fe", color: "#0284c7", icon: "folder" };
    }
  };

  const renderProjectItem = ({ item }) => {
    const memberList = item.members || [];
    const formattedEndDate = item.endDate
      ? new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Open";

    const totalMilestones = item.milestones?.length || 0;
    const completedMilestones = item.milestones?.filter(m => m.status === 'completed').length || 0;
    const progress = totalMilestones > 0 
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : (item.status === 'completed' ? 100 : item.status === 'active' ? 60 : 40);

    const iconConfig = getProjectIconConfig(item.status);

    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => navigation.navigate("CompanyProjectDetails", { projectId: item._id })}
      >
        <View style={styles.projectCard}>
          {/* Project Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.projectIconContainer, { backgroundColor: iconConfig.bg }]}>
              <Ionicons name={iconConfig.icon} size={18} color={iconConfig.color} />
            </View>
            <View style={styles.projectTitleContainer}>
              <Text style={styles.projectNameText} numberOfLines={1}>{item.name}</Text>
            </View>

          {/* Status pill badge and actions */}
          <View style={styles.cardActionsRow}>
            <View style={[styles.statusBadge, { backgroundColor: iconConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: iconConfig.color }]}>
                {item.status === "active" ? "In Progress" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.cardActionBtn}>
              <Ionicons name="create-outline" size={14} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.cardActionBtn}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
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
              const initials = typeof member === "object" ? getInitials(member.firstName, member.lastName) : "M";
              return (
                <View key={index} style={[styles.avatarBubble, { zIndex: 10 - index }]}>
                  <Text style={styles.avatarBubbleText}>{initials}</Text>
                </View>
              );
            })}
            {memberList.length > 3 && (
              <View style={[styles.avatarBubble, styles.avatarBubblePlus]}>
                <Text style={styles.avatarBubblePlusText}>+{memberList.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Projects"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search projects..."
      headerBg="#ffffff"
      headerTextColor="#1e293b"
      headerTitle="My Projects"
    >
      <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#C2410C" />}
        >
          {/* Stats bar */}
          <View style={styles.statsBar}>
            <View style={styles.statBarItem}>
              <Text style={styles.statBarValue}>{totalProjectsCount}</Text>
              <Text style={styles.statBarLabel}>TOTAL</Text>
            </View>
            <View style={styles.statBarDivider} />
            <View style={styles.statBarItem}>
              <Text style={[styles.statBarValue, { color: "#2563eb" }]}>{inProjectsCount}</Text>
              <Text style={styles.statBarLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statBarDivider} />
            <View style={styles.statBarItem}>
              <Text style={[styles.statBarValue, { color: "#10b981" }]}>{completedProjectsCount}</Text>
              <Text style={styles.statBarLabel}>DONE</Text>
            </View>
            <View style={styles.statBarDivider} />
            <View style={styles.statBarItem}>
              <Text style={[styles.statBarValue, { color: "#d97706" }]}>{onHoldProjectsCount}</Text>
              <Text style={styles.statBarLabel}>ON HOLD</Text>
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
                    Completed: <Text style={styles.legendBold}>{completedProjectsCount} ({completedPercentage}%)</Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#0284c7" }]} />
                  <Text style={styles.legendText}>
                    In Progress: <Text style={styles.legendBold}>{inProjectsCount} ({inProjectsPercentage}%)</Text>
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#d97706" }]} />
                  <Text style={styles.legendText}>
                    On Hold: <Text style={styles.legendBold}>{onHoldProjectsCount} ({onHoldPercentage}%)</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Task List header */}
          <View style={styles.listSectionHeader}>
            <Text style={styles.listSectionTitle}>PROJECT LIST</Text>
            <Text style={styles.listSectionCount}>{filteredProjects.length} projects</Text>
          </View>

          {/* Project List */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#C2410C" />
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
      </View>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 10,
  },
  statBarItem: {
    flex: 1,
    alignItems: "center",
  },
  statBarValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 22,
  },
  statBarLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.4,
    marginTop: 1,
  },
  statBarDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  addBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#C2410C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  progressBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  progressBoxTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  listSectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
  cardActionBtn: {
    padding: 4,
    marginLeft: 4,
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
    backgroundColor: "#0d9488", // teal progress bar fill
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
    backgroundColor: "#0d9488",
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

export default ProjectListScreen;
