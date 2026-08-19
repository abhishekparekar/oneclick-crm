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
import { getEmployeeProjectDetailsApi, getEmployeeProjectTasksApi } from "../../api/projectService";
import { updateTaskStatusApi } from "../../api/taskService";

const STATUS_OPTIONS = [
  { label: "Todo", value: "pending", color: "#64748b" },
  { label: "In Progress", value: "in_process", color: "#2563eb" },
  { label: "Review", value: "review", color: "#ca8a04" },
  { label: "Done", value: "complete", color: "#16a34a" },
];

const EmployeeProjectDetailsScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjectDetails = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        getEmployeeProjectDetailsApi(projectId),
        getEmployeeProjectTasksApi(projectId)
      ]);
      if (projRes.data && projRes.data.success) {
        setProject(projRes.data.project || null);
      }
      if (tasksRes.data && tasksRes.data.success) {
        setTasks(tasksRes.data.tasks || []);
      }
    } catch (error) {
      console.error("Error loading project details or tasks:", error);
      Alert.alert("Error", "Could not load project details or tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const res = await updateTaskStatusApi(taskId, newStatus);
      if (res.data && res.data.success) {
        fetchProjectDetails(false);
      }
    } catch (error) {
      console.error("Failed to update task status:", error);
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjectDetails(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return { bg: "#fee2e2", text: "#ef4444", border: "#fca5a5" };
      case "medium":
        return { bg: "#fef3c7", text: "#f59e0b", border: "#fde047" };
      default:
        return { bg: "#ecfdf5", text: "#10b981", border: "#a7f3d0" };
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { bg: "#d1fae5", text: "#065f46" };
      case "active":
      case "working":
        return { bg: "#dbeafe", text: "#1e40af" };
      case "review":
        return { bg: "#fef3c7", text: "#92400e" };
      case "deployment":
        return { bg: "#e0f2fe", text: "#0369a1" };
      case "planning":
      default:
        return { bg: "#f1f5f9", text: "#475569" };
    }
  };

  if (loading) {
    return (
      <EmployeeLayout navigation={navigation} title="Project Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </EmployeeLayout>
    );
  }

  if (!project) {
    return (
      <EmployeeLayout navigation={navigation} title="Project Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Project was not found.</Text>
        </View>
      </EmployeeLayout>
    );
  }

  const priorityColors = getPriorityColor(project.priority || "medium");
  const statusColors = getStatusColor(project.status || "planning");
  const totalMembers = project.members?.length || 0;

  return (
    <EmployeeLayout navigation={navigation} title="Project Scope" backEnabled={true}>
      <View style={styles.container}>
        {/* Sub-Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Project Details</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {/* Main Hero Card */}
          <AppCard style={styles.heroCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {project.status?.toUpperCase()}
                </Text>
              </View>
              {project.isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>OVERDUE</Text>
                </View>
              )}
            </View>

            <Text style={styles.projectTitle}>{project.name}</Text>
            {project.description ? (
              <Text style={styles.projectDesc}>{project.description}</Text>
            ) : (
              <Text style={[styles.projectDesc, { fontStyle: "italic", color: "#94a3b8" }]}>
                No details provided.
              </Text>
            )}

            {/* Circular/Elegant Progress block */}
            <View style={styles.progressCardContainer}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressPercentText}>{project.progress || 0}%</Text>
                <Text style={styles.progressSubLabel}>Tasks Completed</Text>
              </View>
              <View style={styles.progressDetailRight}>
                <Text style={styles.progressTaskCount}>
                  {project.completedTasks} of {project.totalTasks} Completed
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${project.progress || 0}%` }]} />
                </View>
              </View>
            </View>
          </AppCard>

          {/* Timeline & Metadata */}
          <Text style={styles.sectionTitle}>Overview & Schedule</Text>
          <AppCard style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>START DATE</Text>
                  <Text style={styles.metaValue}>
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD"}
                  </Text>
                </View>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="flag-outline" size={18} color="#ef4444" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>DUE DATE</Text>
                  <Text style={styles.metaValue}>
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : "TBD"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-circle-outline" size={18} color="#8b5cf6" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>PROJECT MANAGER</Text>
                  <Text style={styles.metaValue}>
                    {project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : "Not Assigned"}
                  </Text>
                </View>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="shield-outline" size={18} color="#f59e0b" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>PRIORITY LEVEL</Text>
                  <View
                    style={[
                      styles.prioTag,
                      { backgroundColor: priorityColors.bg, borderColor: priorityColors.border, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.prioText, { color: priorityColors.text }]}>
                      {project.priority?.toUpperCase() || "MEDIUM"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </AppCard>

          {/* Action Menu Shortcuts */}
          <Text style={styles.sectionTitle}>Quick Initiatives Navigation</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionBtnCard}
              onPress={() => navigation.navigate("EmployeeProjectActivity", { projectId: project._id })}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="analytics" size={22} color="#16a34a" />
              </View>
              <Text style={styles.actionBtnTitle}>Activity Stream</Text>
              <Text style={styles.actionBtnDesc}>Historical team actions log</Text>
            </TouchableOpacity>
          </View>

          {/* Assigned Members Grid */}
          <Text style={styles.sectionTitle}>Initiative Team members ({totalMembers})</Text>
          <AppCard style={styles.membersCard}>
            {totalMembers === 0 ? (
              <Text style={styles.noItemsText}>No members allocated to this project.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
                {project.members.map((member, i) => {
                  const initial = member.firstName ? member.firstName.charAt(0) : "T";
                  return (
                    <View key={member._id || i} style={styles.memberProfileBubble}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                      <Text style={styles.memberNameText} numberOfLines={1}>
                        {member.firstName}
                      </Text>
                      <Text style={styles.memberRoleText} numberOfLines={1}>
                        {member.designationId?.name || "Staff"}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </AppCard>

          {/* Direct Tasks Display */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>My Project Tasks ({tasks.length})</Text>
          {tasks.length === 0 ? (
            <AppCard style={{ padding: 20, alignItems: "center" }}>
              <Ionicons name="checkmark-done-circle-outline" size={32} color="#94a3b8" />
              <Text style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>No tasks assigned.</Text>
            </AppCard>
          ) : (
            tasks.map((task) => {
              const taskPriorityColors = getPriorityColor(task.priority);
              const totalSub = task.subtasks?.length || 0;
              const completedSub = task.subtasks?.filter((s) => s.completed).length || 0;
              const pct = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;
              const isUpdating = updatingTaskId === task._id;

              return (
                <AppCard key={task._id} style={styles.taskCard}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("EmployeeTaskDetails", { taskId: task._id })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.priorityBadge, { backgroundColor: taskPriorityColors.bg }]}>
                        <Text style={[styles.priorityText, { color: taskPriorityColors.text }]}>
                          {task.priority?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.dateText}>
                        {task.endDateTime ? `Due: ${new Date(task.endDateTime).toLocaleDateString()}` : "No due date"}
                      </Text>
                    </View>

                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}

                    {totalSub > 0 && (
                      <View style={styles.progressRow}>
                        <View style={styles.progressBarBgSub}>
                          <View style={[styles.progressBarFillSub, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.progressPercentSub}>{pct}%</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.actionDivider} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.statusLabel}>Quick Status:</Text>
                    <View style={styles.statusButtonsRow}>
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        STATUS_OPTIONS.map((opt) => {
                          let isCurrent = task.status === opt.value;
                          if (opt.value === "in_process" && (task.status === "in_progress" || task.status === "in-progress")) isCurrent = true;
                          if (opt.value === "review" && task.status === "inReview") isCurrent = true;
                          if (opt.value === "pending" && task.status === "todo") isCurrent = true;
                          if (opt.value === "complete" && task.status === "done") isCurrent = true;

                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.statusBtn,
                                isCurrent && { backgroundColor: opt.color, borderColor: opt.color },
                              ]}
                              onPress={() => !isCurrent && handleUpdateStatus(task._id, opt.value)}
                              disabled={isCurrent}
                            >
                              <Text style={[styles.statusBtnText, isCurrent && { color: "#ffffff" }]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </View>
                </AppCard>
              );
            })
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
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  overdueBadge: {
    backgroundColor: "#ffe4e6",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overdueText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#e11d48",
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  projectDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 16,
  },
  progressCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  progressInfo: {
    alignItems: "center",
    marginRight: 14,
    width: 60,
  },
  progressPercentText: {
    fontSize: 20,
    fontWeight: "850",
    color: "#2563eb",
  },
  progressSubLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  progressDetailRight: {
    flex: 1,
  },
  progressTaskCount: {
    fontSize: 11.5,
    fontWeight: "750",
    color: "#334155",
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563eb",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaTextCol: {
    marginLeft: 10,
  },
  metaLabel: {
    fontSize: 8.5,
    fontWeight: "750",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 1,
  },
  prioTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  prioText: {
    fontSize: 8.5,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 14,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionBtnCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 14,
    marginRight: 8,
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionBtnTitle: {
    fontSize: 12.5,
    fontWeight: "750",
    color: "#1e293b",
  },
  actionBtnDesc: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
  membersCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  noItemsText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  membersScroll: {
    paddingVertical: 4,
  },
  memberProfileBubble: {
    alignItems: "center",
    marginRight: 16,
    width: 68,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  memberNameText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  memberRoleText: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 1,
    textAlign: "center",
  },
  taskCard: {
    padding: 14,
    backgroundColor: "#ffffff",
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 8.5,
    fontWeight: "850",
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  progressBarBgSub: {
    flex: 1,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFillSub: {
    height: "100%",
    backgroundColor: "#10b981",
  },
  progressPercentSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    marginLeft: 6,
  },
  actionDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 10.5,
    fontWeight: "750",
    color: "#64748b",
  },
  statusButtonsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "flex-end",
  },
  statusBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    marginLeft: 4,
  },
  statusBtnText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
});

export default EmployeeProjectDetailsScreen;
