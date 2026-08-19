import React, { useState, useEffect, useContext } from "react";
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
import { getEmployeeTasksApi, updateTaskStatusApi } from "../../api/taskService";
import { COLORS, SPACING, SHADOWS, ROUNDING } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";

const COLUMNS = [
  { label: "Backlog", value: "backlog", icon: "cube-outline" },
  { label: "Todo", value: "todo", icon: "ellipse-outline" },
  { label: "Planning", value: "planning", icon: "compass-outline" },
  { label: "In Progress", value: "in-progress", icon: "arrow-forward-circle-outline" },
  { label: "Review", value: "review", icon: "eye-outline" },
  { label: "Testing", value: "testing", icon: "flask-outline" },
  { label: "Completed", value: "completed", icon: "checkmark-circle-outline" },
  { label: "Blocked", value: "blocked", icon: "alert-circle-outline" },
];

const EmployeeTaskBoardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket } = useSocket(user?.companyId);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeColumn, setActiveColumn] = useState("todo");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const fetchTasks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getEmployeeTasksApi();
      if (res.data && res.data.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks for board:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleTaskUpdate = () => fetchTasks(false);
      socket.on(`taskCreated_${user?.companyId}`, handleTaskUpdate);
      socket.on(`taskUpdated_${user?.companyId}`, handleTaskUpdate);
      return () => {
        socket.off(`taskCreated_${user?.companyId}`, handleTaskUpdate);
        socket.off(`taskUpdated_${user?.companyId}`, handleTaskUpdate);
      };
    }
  }, [socket, user?.companyId]);

  const handleMoveStatus = async (taskId, newStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const res = await updateTaskStatusApi(taskId, newStatus);
      if (res.data && res.data.success) {
        fetchTasks(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityConfig = (priority) => COLORS.priority[priority?.toLowerCase()] || COLORS.priority.low;
  const getStatusConfig = (status) => COLORS.status[status?.toLowerCase()] || COLORS.status.todo;

  const getColumnTasks = (colVal) => {
    return tasks.filter((t) => (t.status || "todo") === colVal);
  };

  return (
    <EmployeeLayout navigation={navigation} title="Task Board" backEnabled={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text.dark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Kanban Workspace</Text>
              <Text style={styles.subtitle}>Drag-free fast workflow status management</Text>
            </View>
          </View>
        </View>

        {/* Column Navigation Tabs */}
        <View style={styles.columnsNav}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {COLUMNS.map((col) => {
              const isActive = activeColumn === col.value;
              const count = getColumnTasks(col.value).length;
              const sColor = getStatusConfig(col.value);

              return (
                <TouchableOpacity
                  key={col.value}
                  style={[styles.colNavTab, isActive && { borderBottomColor: COLORS.primary, borderBottomWidth: 3, backgroundColor: "rgba(249, 115, 22, 0.08)" }]}
                  onPress={() => setActiveColumn(col.value)}
                >
                  <Ionicons name={col.icon} size={16} color={isActive ? COLORS.primary : COLORS.text.muted} />
                  <Text style={[styles.colNavTabText, isActive && { color: COLORS.primary, fontWeight: "800" }]}>
                    {col.label}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: isActive ? COLORS.primary : '#F1F5F9' }]}>
                    <Text style={[styles.countBadgeText, { color: isActive ? COLORS.white : COLORS.text.muted }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Column Cards Scroll */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(false); }} colors={[COLORS.accentBlue]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.accentBlue} style={{ marginTop: 40 }} />
          ) : getColumnTasks(activeColumn).length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done" size={32} color={COLORS.text.light} />
              </View>
              <Text style={styles.emptyText}>No tasks in {COLUMNS.find((c) => c.value === activeColumn).label}</Text>
            </View>
          ) : (
            getColumnTasks(activeColumn).map((task) => {
              const prioConfig = getPriorityConfig(task.priority);
              const isUpdating = updatingTaskId === task._id;

              return (
                <AppCard key={task._id} style={styles.taskCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: prioConfig.bg }]}>
                      <Text style={[styles.priorityText, { color: prioConfig.text }]}>
                        {task.priority?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {task.endDateTime ? new Date(task.endDateTime).toLocaleDateString() : "No due date"}
                    </Text>
                  </View>

                  <Text style={styles.taskTitle}>{task.title}</Text>
                  
                  {task.projectId && (
                    <View style={styles.projectTag}>
                      <Ionicons name="folder-outline" size={12} color={COLORS.accentBlue} />
                      <Text style={styles.projectTagText} numberOfLines={1}>{task.projectId?.name}</Text>
                    </View>
                  )}

                  <View style={styles.actionDivider} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.moveLabel}>Move to:</Text>
                    <View style={styles.moveButtonsRow}>
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={COLORS.accentBlue} />
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {COLUMNS.filter((c) => c.value !== activeColumn).map((col) => {
                            const sc = getStatusConfig(col.value);
                            return (
                              <TouchableOpacity
                                key={col.value}
                                style={[styles.moveBtn, { borderColor: sc.text, backgroundColor: sc.bg }]}
                                onPress={() => handleMoveStatus(task._id, col.value)}
                              >
                                <Text style={[styles.moveBtnText, { color: sc.text }]}>{col.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, backgroundColor: COLORS.white },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text.dark, letterSpacing: -0.5 },
  subtitle: { fontSize: 11.5, color: COLORS.text.muted, marginTop: 1 },
  columnsNav: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  colNavTab: { paddingHorizontal: SPACING.md, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  colNavTabText: { fontSize: 12, fontWeight: "600", color: COLORS.text.muted, marginLeft: 4 },
  countBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: ROUNDING.sm, marginLeft: 6 },
  countBadgeText: { fontSize: 10, fontWeight: "800" },
  scrollContent: { padding: SPACING.md, paddingBottom: 140 },
  taskCard: { padding: 14, backgroundColor: COLORS.white, marginBottom: 12, borderRadius: ROUNDING.md, borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 8.5, fontWeight: "800" },
  dateText: { fontSize: 11, color: COLORS.text.muted, fontWeight: "600" },
  taskTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text.dark, marginBottom: 8 },
  projectTag: { flexDirection: "row", alignItems: "center", backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, alignSelf: "flex-start", marginBottom: 8, maxWidth: "85%" },
  projectTagText: { fontSize: 11, fontWeight: "600", color: COLORS.accentBlue, marginLeft: 3 },
  actionDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moveLabel: { fontSize: 11, fontWeight: "700", color: COLORS.text.muted, marginRight: 8 },
  moveButtonsRow: { flexDirection: "row", flex: 1, justifyContent: "flex-end" },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: 6, marginLeft: 6 },
  moveBtnText: { fontSize: 10, fontWeight: "700" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyText: { fontSize: 14, color: COLORS.text.dark, fontWeight: "700" },
});

export default EmployeeTaskBoardScreen;
