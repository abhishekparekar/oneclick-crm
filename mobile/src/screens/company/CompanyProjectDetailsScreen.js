import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getProjectByIdApi, getTasksApi, addProjectNoticeApi } from "../../api/companyService";
import { FONTS } from "../../theme/tokens";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";

const STATUS_CONFIG = {
  planning:   { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", label: "Planning",   icon: "settings-outline" },
  active:     { bg: "#f0fdfa", text: "#C2410C", border: "#ccfbf1", label: "Active",     icon: "play-outline" },
  working:    { bg: "#fffbeb", text: "#b45309", border: "#fef3c7", label: "Working",    icon: "hammer-outline" },
  review:     { bg: "#faf5ff", text: "#7e22ce", border: "#f3e8ff", label: "Review",     icon: "eye-outline" },
  deployment: { bg: "#fff7ed", text: "#c2410c", border: "#ffedd5", label: "Deployment", icon: "rocket-outline" },
  completed:  { bg: "#f0fdf4", text: "#15803d", border: "#dcfce7", label: "Completed",  icon: "checkmark-outline" },
};

const PRIORITY_CONFIG = {
  high:   { text: "#ef4444", bg: "#fef2f2", border: "#fee2e2" },
  medium: { text: "#f59e0b", bg: "#fffbeb", border: "#fef3c7" },
  low:    { text: "#10b981", bg: "#f0fdf4", border: "#dcfce7" },
};

const CompanyProjectDetailsScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeSubTab, setActiveSubTab] = useState("tasks"); // "tasks" | "notices" | "members"
  const [newNotice, setNewNotice] = useState("");
  const [submittingNotice, setSubmittingNotice] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        getProjectByIdApi(projectId),
        getTasksApi({ projectId })
      ]);
      
      if (projRes.data && projRes.data.success) {
        setProject(projRes.data.project);
      }
      if (tasksRes.data && tasksRes.data.success) {
        const allTasks = tasksRes.data.tasks || [];
        const projectTasks = allTasks.filter(
          (t) => (t.projectId?._id || t.projectId) === projectId
        );
        setTasks(projectTasks);
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [projectId, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleAddNotice = async () => {
    if (!newNotice.trim()) return;
    try {
      setSubmittingNotice(true);
      await addProjectNoticeApi(projectId, newNotice.trim());
      setNewNotice("");
      await fetchData(); // Refresh
      Alert.alert("Success", "Notice posted successfully.");
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setSubmittingNotice(false);
    }
  };

  if (loading || !project) {
    return (
      <CompanyAdminLayout headerTitle="Project Details" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading project details…</Text>
        </View>
      </CompanyAdminLayout>
    );
  }

  const st = (project.status || "").toLowerCase();
  const currentStatus = STATUS_CONFIG[st] || STATUS_CONFIG["planning"];
  const priorityStyle = PRIORITY_CONFIG[project.priority?.toLowerCase()] || PRIORITY_CONFIG["medium"];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(t.status?.toLowerCase())).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <CompanyAdminLayout headerTitle="Project Details" navigation={navigation} showBackButton={true}>
      <KeyboardAwareScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
          
          {/* Professional Compact Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg, borderColor: currentStatus.border }]}>
                <Ionicons name={currentStatus.icon} size={10} color={currentStatus.text} style={{ marginRight: 2 }} />
                <Text style={[styles.statusText, { color: currentStatus.text }]}>{currentStatus.label}</Text>
              </View>
            </View>

            {project.description ? (
              <Text style={styles.descText} numberOfLines={3}>{project.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <View style={[styles.priorityDot, { backgroundColor: priorityStyle.text }]} />
                <Text style={styles.metaLabel}>Priority: <Text style={{ color: priorityStyle.text, fontWeight: '700' }}>{project.priority?.toUpperCase()}</Text></Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.metaLabel}>Start: <Text style={{ color: "#0f172a", fontWeight: '700' }}>{project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}</Text></Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="alarm-outline" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                <Text style={styles.metaLabel}>End: <Text style={{ color: "#ef4444", fontWeight: '700' }}>{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}</Text></Text>
              </View>
            </View>

            {/* Slim Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Completion ({completedTasks}/{totalTasks})</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>

          {/* Compact Tabs */}
          <View style={styles.subTabsContainer}>
            {[
              { key: "tasks", label: "Tasks", count: totalTasks },
              { key: "notices", label: "Notices", count: project.notices?.length || 0 },
              { key: "members", label: "Team", count: project.members?.length || 0 },
            ].map((tab) => {
              const isActive = activeSubTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                  onPress={() => setActiveSubTab(tab.key)}
                >
                  <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>{tab.label}</Text>
                  {tab.count > 0 && (
                    <View style={[styles.subTabBadge, isActive && styles.subTabBadgeActive]}>
                      <Text style={[styles.subTabBadgeText, isActive && styles.subTabBadgeTextActive]}>{tab.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContentContainer}>

            {/* TASKS TAB */}
            {activeSubTab === "tasks" && (
              <View style={styles.tabPanel}>
                {tasks.length === 0 ? (
                  <Text style={styles.emptyText}>No tasks created for this project yet.</Text>
                ) : (
                  <View style={styles.taskList}>
                    {tasks.map((task, idx) => {
                      const isTaskDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(task.status?.toLowerCase());
                      const taskPriority = PRIORITY_CONFIG[task.priority?.toLowerCase()] || PRIORITY_CONFIG["medium"];
                      
                      let taskStatusLabel = task.status?.replace(/_/g, " ") || "Pending";
                      let taskStatusColor = "#ca8a04";
                      let taskStatusBg = "#fef9c3";
                      if (isTaskDone) {
                        taskStatusColor = "#16a34a";
                        taskStatusBg = "#dcfce7";
                      } else if (task.status === "in_process" || task.status === "in-progress") {
                        taskStatusColor = "#2563eb";
                        taskStatusBg = "#eff6ff";
                      }
                      
                      return (
                        <TouchableOpacity
                          key={task._id}
                          style={styles.taskCard}
                          onPress={() => navigation.navigate("CompanyTaskDetails", { taskId: task._id, initialTask: task })}
                        >
                          <View style={styles.taskCardHeader}>
                            <Text style={styles.taskCardTitle} numberOfLines={1}>{task.title}</Text>
                            <View style={[styles.taskStatusChip, { backgroundColor: taskStatusBg }]}>
                              <Text style={[styles.taskStatusText, { color: taskStatusColor }]}>{taskStatusLabel}</Text>
                            </View>
                          </View>
                          <View style={styles.taskCardMeta}>
                            <View style={[styles.taskPriorityDot, { backgroundColor: taskPriority.text }]} />
                            <Text style={styles.taskMetaText}>
                              {task.assignees?.length > 1 ? `${task.assignees[0]?.firstName || 'User'} +${task.assignees.length - 1}` : (task.assignees?.[0]?.firstName || "Unassigned")}
                            </Text>
                            {task.endDateTime && (
                              <View style={styles.taskDateBox}>
                                <Ionicons name="calendar" size={12} color="#64748b" style={{marginRight: 4}}/>
                                <Text style={styles.taskDateText}>Due: {new Date(task.endDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* NOTICES TAB */}
            {activeSubTab === "notices" && (
              <View style={styles.tabPanel}>
                <View style={styles.noticeInputContainer}>
                  <TextInput
                    style={styles.noticeInput}
                    placeholder="Write a project notice..."
                    placeholderTextColor="#94a3b8"
                    value={newNotice}
                    onChangeText={setNewNotice}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.postNoticeBtn, !newNotice.trim() && { opacity: 0.5 }]}
                    onPress={handleAddNotice}
                    disabled={!newNotice.trim() || submittingNotice}
                  >
                    {submittingNotice ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {(!project.notices || project.notices.length === 0) ? (
                  <Text style={styles.emptyText}>No notices posted yet.</Text>
                ) : (
                  <View style={styles.noticeList}>
                    {[...project.notices].reverse().map((notice, idx) => (
                      <View key={notice._id || idx} style={styles.noticeCard}>
                        <View style={styles.noticeHeader}>
                          <Ionicons name="megaphone" size={12} color="#C2410C" style={{ marginRight: 6 }} />
                          <Text style={styles.noticeDate}>
                            {new Date(notice.date || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </View>
                        <Text style={styles.noticeMessage}>{notice.message}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* MEMBERS TAB */}
            {activeSubTab === "members" && (
              <View style={styles.tabPanel}>
                {(!project.members || project.members.length === 0) ? (
                  <Text style={styles.emptyText}>No team members assigned.</Text>
                ) : (
                  <View style={styles.memberList}>
                    {project.members.map((m, idx) => (
                      <View key={m._id || idx} style={styles.memberChip}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberInitials}>{(m.firstName?.[0] || 'U').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.memberName}>{m.fullName || `${m.firstName} ${m.lastName}`}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          </View>
      </KeyboardAwareScrollView>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 12, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748b", fontFamily: FONTS.bodyMedium },
  
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: "#0f172a",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  descText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  progressContainer: {
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C2410C",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C2410C",
    borderRadius: 3,
  },

  subTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
  },
  subTabBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  subTabTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  subTabBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 4,
    borderRadius: 10,
    marginLeft: 4,
  },
  subTabBadgeActive: {
    backgroundColor: "#ccfbf1",
  },
  subTabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
  },
  subTabBadgeTextActive: {
    color: "#C2410C",
  },

  tabContentContainer: {
    paddingBottom: 20,
  },
  tabPanel: {},
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  
  taskList: { gap: 8 },
  taskCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskCardTitle: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#0f172a",
    marginRight: 8,
  },
  taskStatusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskStatusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  taskCardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  taskMetaText: {
    fontSize: 12,
    color: "#475569",
    marginRight: 12,
  },
  taskDateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  taskDateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },

  noticeInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 8,
    marginBottom: 16,
  },
  noticeInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#0f172a",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  postNoticeBtn: {
    backgroundColor: "#C2410C",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  noticeList: { gap: 10 },
  noticeCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 3,
    borderLeftColor: "#C2410C",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  noticeDate: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
  },
  noticeMessage: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },

  memberList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingRight: 10,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  memberInitials: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  memberName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
});

export default CompanyProjectDetailsScreen;
