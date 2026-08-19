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
import { getEmployeeProjectTasksApi } from "../../api/projectService";
import { updateTaskStatusApi } from "../../api/taskService";

const STATUS_OPTIONS = [
  { label: "Todo", value: "pending", color: "#64748b" },
  { label: "In Progress", value: "in_process", color: "#2563eb" },
  { label: "Review", value: "review", color: "#ca8a04" },
  { label: "Done", value: "complete", color: "#16a34a" },
];

const EmployeeProjectTasksScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const fetchProjectTasks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getEmployeeProjectTasksApi(projectId);
      if (res.data && res.data.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (error) {
      console.error("Error loading project tasks:", error);
      Alert.alert("Error", "Could not load project tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectTasks();
    }
  }, [projectId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProjectTasks(false);
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const res = await updateTaskStatusApi(taskId, newStatus);
      if (res.data && res.data.success) {
        fetchProjectTasks(false);
      }
    } catch (error) {
      console.error("Failed to update task status from project view:", error);
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return { bg: "#fee2e2", text: "#ef4444" };
      case "medium":
        return { bg: "#fef3c7", text: "#f59e0b" };
      default:
        return { bg: "#ecfdf5", text: "#10b981" };
    }
  };

  return (
    <EmployeeLayout navigation={navigation} title="Project Tasks" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Project Tasks</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="clipboard-outline" size={36} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>No assigned tasks in this project</Text>
              <Text style={styles.emptySubtext}>You don't have any tasks inside this project initiatives scope</Text>
            </View>
          ) : (
            tasks.map((task) => {
              const priorityColors = getPriorityColor(task.priority);
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
                      <View style={[styles.priorityBadge, { backgroundColor: priorityColors.bg }]}>
                        <Text style={[styles.priorityText, { color: priorityColors.text }]}>
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
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.progressPercent}>{pct}%</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
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
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10b981",
  },
  progressPercent: {
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
  },
});

export default EmployeeProjectTasksScreen;
