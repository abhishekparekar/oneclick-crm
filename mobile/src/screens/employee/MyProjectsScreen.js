import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getEmployeeProjectsApi } from "../../api/projectService";
import { FONTS } from "../../theme/tokens";

const STATUS_TABS = [
  { label: "All Projects", value: "" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on_hold" },
];

const getProjectDesignTokens = (project) => {
  const name = project.name?.toLowerCase() || "";
  if (name.includes("hrms") || name.includes("development")) {
    return {
      icon: "briefcase-outline",
      color: "#F97316",
      bgColor: "#FFF7ED",
      progressColor: "#F97316",
    };
  } else if (name.includes("mobile") || name.includes("app") || name.includes("redesign")) {
    return {
      icon: "phone-portrait-outline",
      color: "#7C3AED",
      bgColor: "#F3E8FF",
      progressColor: "#7C3AED",
    };
  } else if (name.includes("website") || name.includes("web") || name.includes("revamp")) {
    return {
      icon: "globe-outline",
      color: "#D97706",
      bgColor: "#FEF3C7",
      progressColor: "#D97706",
    };
  } else if (name.includes("performance") || name.includes("optimization") || name.includes("speed")) {
    return {
      icon: "speedometer-outline",
      color: "#0D9488",
      bgColor: "#CCFBF1",
      progressColor: "#0D9488",
    };
  } else if (name.includes("security") || name.includes("audit") || name.includes("update")) {
    return {
      icon: "shield-checkmark-outline",
      color: "#4F46E5",
      bgColor: "#E0E7FF",
      progressColor: "#4F46E5",
    };
  }
  // Default fallback
  return {
    icon: "folder-open-outline",
    color: "#F97316",
    bgColor: "#FFF7ED",
    progressColor: "#F97316",
  };
};

const getStatusLabelAndColors = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return { text: "Completed", bg: "#d1fae5", color: "#10b981" };
    case "active":
    case "working":
      return { text: "In Progress", bg: "rgba(15, 118, 110, 0.1)", color: "#C2410C" };
    case "planning":
      return { text: "Planning", bg: "#ffedd5", color: "#ea580c" };
    case "review":
    case "deployment":
    default:
      return { text: "On Hold", bg: "#f3f4f6", color: "#4b5563" };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TBD";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const ProgressRing = ({ progress }) => {
  return (
    <View style={styles.progressRingContainer}>
      <View style={styles.progressRingWrapper}>
        <View style={[
          styles.progressRingBg,
          {
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderTopColor: "#ffffff",
            borderRightColor: progress >= 25 ? "#ffffff" : "rgba(255, 255, 255, 0.15)",
            borderBottomColor: progress >= 50 ? "#ffffff" : "rgba(255, 255, 255, 0.15)",
            borderLeftColor: progress >= 75 ? "#ffffff" : "rgba(255, 255, 255, 0.15)",
            transform: [{ rotate: "-45deg" }]
          }
        ]} />
        <View style={styles.progressRingTextContainer}>
          <Text style={styles.progressRingText}>{progress}%</Text>
        </View>
      </View>
      <Text style={styles.progressRingSub}>Overall Progress</Text>
    </View>
  );
};

const MyProjectsScreen = ({ navigation }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");

  const fetchProjects = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;

      const res = await getEmployeeProjectsApi(params);
      if (res.data && res.data.success) {
        setAllProjects(res.data.projects || []);
      }
    } catch (error) {
      console.error("Error loading employee projects:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleSearch = () => {
    if (showSearch && searchQuery) {
      setSearchQuery("");
      fetchProjects();
    }
    setShowSearch(!showSearch);
  };

  const handleSearchSubmit = () => {
    fetchProjects();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjects(false);
  };

  const displayedProjects = useMemo(() => {
    if (!activeFilter) return allProjects;
    if (activeFilter === "in_progress") {
      return allProjects.filter(p => p.status === "active" || p.status === "working" || p.status === "deployment");
    }
    if (activeFilter === "completed") {
      return allProjects.filter(p => p.status === "completed");
    }
    if (activeFilter === "on_hold") {
      return allProjects.filter(p => p.status === "planning" || p.status === "review");
    }
    return allProjects;
  }, [allProjects, activeFilter]);

  // Calculations for Forest Green Summary Card
  const totalCount = allProjects.length;
  const atRiskCount = useMemo(() => {
    return allProjects.filter(p => p.isOverdue || (p.status !== "completed" && p.endDate && new Date(p.endDate) < new Date())).length;
  }, [allProjects]);
  const onTrackCount = Math.max(0, totalCount - atRiskCount);
  const overallProgress = useMemo(() => {
    if (totalCount === 0) return 0;
    const totalProgress = allProjects.reduce((sum, p) => sum + (p.progress || 0), 0);
    return Math.round(totalProgress / totalCount);
  }, [allProjects, totalCount]);

  const renderAssigneePile = (members = []) => {
    if (!members || members.length === 0) return null;
    const limit = 3;
    const displayed = members.slice(0, limit);
    const remaining = members.length - limit;

    return (
      <View style={styles.avatarPile}>
        {displayed.map((item, index) => {
          const photo = item.photo?.trim();
          const initials = `${item.firstName?.[0] || "?"}${item.lastName?.[0] || ""}`.toUpperCase();
          return (
            <View key={item._id || index} style={[styles.avatarBubble, { marginLeft: index > 0 ? -8 : 0 }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarTxt}>{initials}</Text>
              )}
            </View>
          );
        })}
        {remaining > 0 && (
          <View style={[styles.avatarBubble, styles.avatarMoreBubble, { marginLeft: -8 }]}>
            <Text style={styles.avatarMoreTxt}>+{remaining}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <EmployeeLayout
      navigation={navigation}
      title="My Projects"
      rightActionType="projects"
      onRightActionPress={{
        onSearch: toggleSearch,
        onPlus: () => Alert.alert(
          "Create Initiative",
          "Only HR Managers and Admins can create new initiatives. Please contact your administrator to request a new project."
        )
      }}
    >
      <LinearGradient colors={['rgba(239, 246, 255, 0.8)', '#ffffff', 'rgba(238, 242, 255, 0.8)']} style={styles.container}>
        {/* Search Section */}
        {showSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search initiatives..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(""); fetchProjects(); }}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#F97316"]}
            />
          }
        >
          {/* Forest Green Summary Card */}
          <BlurView intensity={80} tint="dark" style={styles.summaryCard}>
            {/* Total Projects Info (Left) */}
            <View style={styles.summaryLeftCol}>
              <Text style={styles.summaryLabel}>Total Projects</Text>
              <Text style={styles.summaryValue}>{String(totalCount).padStart(2, "0")}</Text>
              <View style={styles.calendarIconContainer}>
                <Ionicons name="calendar-outline" size={16} color="#ffffff" />
              </View>
            </View>

            {/* Circular Progress Ring (Center) */}
            <ProgressRing progress={overallProgress} />

            {/* Status Counts (Right) */}
            <View style={styles.summaryRightCol}>
              <Text style={styles.summaryLabel}>On Track</Text>
              <Text style={[styles.summaryStatusValue, { color: "#a7f3d0" }]}>
                {String(onTrackCount).padStart(2, "0")}
              </Text>
              <View style={styles.summaryDivider} />
              <Text style={styles.summaryLabel}>At Risk</Text>
              <Text style={[styles.summaryStatusValue, { color: "#fca5a5" }]}>
                {String(atRiskCount).padStart(2, "0")}
              </Text>
            </View>
          </BlurView>

          {/* Underlined Segmented Tabs */}
          <View style={styles.tabsContainer}>
            {STATUS_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  onPress={() => setActiveFilter(tab.value)}
                  style={[
                    styles.tabButton,
                    isActive && styles.activeTabButton
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText,
                    isActive && styles.activeTabText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Projects Card List */}
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
          ) : displayedProjects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="folder-open-outline" size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>No initiatives found</Text>
              <Text style={styles.emptySubtext}>You are not assigned to any projects in this scope</Text>
            </View>
          ) : (
            displayedProjects.map((project) => {
              const design = getProjectDesignTokens(project);
              const badge = getStatusLabelAndColors(project.status);
              const startVal = formatDate(project.startDate);
              const endVal = formatDate(project.endDate);

              return (
                <TouchableOpacity
                  key={project._id}
                  onPress={() => navigation.navigate("EmployeeProjectDetails", { projectId: project._id })}
                  activeOpacity={0.9}
                >
                  <BlurView intensity={70} tint="light" style={styles.projectCard}>
                    {/* Top Row: Icon + Name and Status Badge */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeftSection}>
                        <View style={[styles.iconBox, { backgroundColor: design.bgColor }]}>
                          <Ionicons name={design.icon} size={20} color={design.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.projectTitle} numberOfLines={1}>
                            {project.name}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>
                          {badge.text}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar Row */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressBarRow}>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${project.progress || 0}%`, backgroundColor: design.progressColor }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressPercentText}>{project.progress || 0}%</Text>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Bottom Row: Dates & Assignees */}
                    <View style={styles.cardFooter}>
                      <View style={styles.datesGrid}>
                        <View style={styles.dateRow}>
                          <Ionicons name="calendar-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <Text style={styles.dateText}>Start: {startVal}</Text>
                        </View>
                        <View style={styles.dateRow}>
                          <Ionicons name="calendar-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
                          <Text style={styles.dateText}>Due: {endVal}</Text>
                        </View>
                      </View>

                      {renderAssigneePile(project.members)}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.6)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    height: 38,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    fontFamily: FONTS.bodyMedium,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "rgba(15, 118, 110, 0.85)",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    overflow: "hidden",
  },
  summaryLeftCol: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  summaryRightCol: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: "#c5d0c5",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: FONTS.displayBold,
    color: "#ffffff",
    marginVertical: 4,
  },
  summaryStatusValue: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    marginVertical: 2,
  },
  calendarIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  summaryDivider: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginVertical: 6,
  },
  progressRingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingWrapper: {
    width: 80,
    height: 80,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  progressRingBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    position: "absolute",
  },
  progressRingTextContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  progressRingText: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: "#ffffff",
  },
  progressRingSub: {
    fontSize: 9,
    fontFamily: FONTS.bodyMedium,
    color: "#c5d0c5",
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    borderBottomWidth: 1.5,
    borderBottomColor: "#e2e8f0",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#C2410C",
  },
  tabText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
  },
  activeTabText: {
    color: "#C2410C",
    fontFamily: FONTS.bodyBold,
  },
  projectCard: {
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  projectTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarTrack: {
    flex: 1,
    height: 4.5,
    backgroundColor: "#f1f5f9",
    borderRadius: 2.5,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  progressPercentText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#334155",
    minWidth: 28,
    textAlign: "right",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datesGrid: {
    flexDirection: "column",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  dateText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
  },
  avatarPile: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    backgroundColor: "#C2410C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarTxt: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
  },
  avatarMoreBubble: {
    backgroundColor: "#f1f5f9",
    borderColor: "#ffffff",
  },
  avatarMoreTxt: {
    color: "#475569",
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "#334155",
    fontFamily: FONTS.bodyBold,
  },
  emptySubtext: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: FONTS.bodyMedium,
  },
});

export default MyProjectsScreen;
